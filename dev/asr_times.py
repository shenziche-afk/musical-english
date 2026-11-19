#!/usr/bin/env python3
"""音频识别 → 逐行时间码（默认只出报告，不写数据）。

三步：
  transcribe  用 mlx-whisper 转写一首，词级时间戳存到 dev/asr/<show>/<n>.json
  align       把转写词流对齐到 lyrics.js 的每一行，生成候选时间码 + 报告（默认不写）
  apply       把候选写入 content/<show>/times.js（自动备份；--dry-run 只看 diff）

另有 self-test：不碰模型、不碰音频，用合成词流验证对齐算法。

环境（已装好，见 HANDOFF 5.5）：
  .venv-whisper/bin/python dev/asr_times.py ...
  首次 transcribe 会下模型；国内建议 HF_ENDPOINT=https://hf-mirror.com

例子：
  .venv-whisper/bin/python dev/asr_times.py transcribe --show poto --n 17
  .venv-whisper/bin/python dev/asr_times.py align --show poto --n 17
  .venv-whisper/bin/python dev/asr_times.py align --show poto --n 17 --apply
  .venv-whisper/bin/python dev/asr_times.py self-test
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import wave

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASR_DIR = os.path.join(ROOT, "dev", "asr")
DEFAULT_MODEL = "mlx-community/whisper-large-v3-turbo"

WORD_RE = re.compile(r"[a-z0-9']+")


# ---------- 基础 ----------

def norm_tokens(text):
    s = str(text or "").lower()
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return WORD_RE.findall(s)


def load_js(path):
    s = open(path, encoding="utf-8").read()
    i, j = s.index("{"), s.rindex(";")
    return s[:i], json.loads(s[i:j]), s[j:]


def save_js(path, head, data, tail, indent):
    body = json.dumps(data, ensure_ascii=False, indent=2) if indent else \
        json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    open(path, "w", encoding="utf-8").write(head + body + tail)


def lyrics_and_times(show, n):
    head, lyrics, tail = load_js(os.path.join(ROOT, "content", show, "lyrics.js"))
    _, times, _ = load_js(os.path.join(ROOT, "content", show, "times.js"))
    return lyrics[show][str(n)]["lines"], times[show][str(n)]


def track_for(show, n):
    _, tracks, _ = load_js(os.path.join(ROOT, "content", show, "tracks.js"))
    for t in tracks[show]["tracks"]:
        if t["n"] == int(n):
            return t
    raise SystemExit("找不到曲目 %s:%s" % (show, n))


# ---------- 转写 ----------

def read_wav(path):
    """读 PCM/EXTENSIBLE WAV：afconvert 在 16k 下会写 WAVE_FORMAT_EXTENSIBLE，
    标准库 wave 不认，这里按 RIFF 块自己解析。"""
    import struct
    import numpy as np

    data = open(path, "rb").read()
    if data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise SystemExit("不是 WAV 文件：%s" % path)
    pos = 12
    fmt = None
    pcm = None
    while pos + 8 <= len(data):
        cid = data[pos:pos + 4]
        size = struct.unpack("<I", data[pos + 4:pos + 8])[0]
        body = data[pos + 8:pos + 8 + size]
        if cid == b"fmt ":
            tag, ch, sr, _br, _ba, bits = struct.unpack("<HHIIHH", body[:16])
            if tag == 0xFFFE and len(body) >= 40:
                tag = struct.unpack("<H", body[24:26])[0]
            fmt = (tag, ch, sr, bits)
        elif cid == b"data":
            pcm = body
        pos += 8 + size + (size & 1)
    if not fmt or pcm is None:
        raise SystemExit("WAV 缺少 fmt/data 块：%s" % path)
    tag, ch, sr, bits = fmt
    if tag != 1 or bits != 16:
        raise SystemExit("只支持 16-bit PCM，实际 tag=%s bits=%s" % (tag, bits))
    x = np.frombuffer(pcm, dtype="<i2").astype("float32") / 32768.0
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    return x, sr


def decode_16k(path):
    """用 macOS 自带 afconvert 解码成 16k 单声道 float32，避开 ffmpeg 依赖。"""
    wav = "/tmp/_asr_decode.wav"
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", path, wav],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    x, sr = read_wav(wav)
    os.remove(wav)
    if sr != 16000:
        raise SystemExit("afconvert 输出采样率不是 16k：%s" % sr)
    return x


def cmd_transcribe(args):
    from mlx_whisper import transcribe  # 延迟导入：self-test/align 不需要

    t = track_for(args.show, args.n)
    path = os.path.join(ROOT, t["file"])
    if not os.path.exists(path):
        raise SystemExit("音频不存在：%s" % path)

    print("解码", t["file"])
    audio = decode_16k(path)
    print("转写 %s（模型 %s）…" % (t["title"], args.model))
    t0 = time.time()
    result = transcribe(
        audio,
        path_or_hf_repo=args.model,
        language=args.language,
        word_timestamps=True,
        verbose=False,
    )
    words = []
    for seg in result.get("segments", []):
        for w in seg.get("words", []) or []:
            words.append({
                "word": w.get("word", "").strip(),
                "start": round(float(w.get("start", 0)), 2),
                "end": round(float(w.get("end", 0)), 2),
                "p": round(float(w.get("probability", 0) or 0), 3),
            })
    out = {
        "show": args.show, "n": int(args.n), "title": t["title"],
        "model": args.model, "language": args.language,
        "seconds": round(len(audio) / 16000.0, 2),
        "took": round(time.time() - t0, 1),
        "text": result.get("text", "").strip(),
        "segments": result.get("segments", []),
        "words": words,
    }
    d = os.path.join(ASR_DIR, args.show)
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, "%02d.json" % int(args.n))
    json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("words=%d 用时=%.1fs → %s" % (len(words), out["took"], p))


# ---------- 对齐 ----------

def lev(a, b):
    if a == b:
        return 0
    if not a or not b:
        return max(len(a), len(b))
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def sim(a, b):
    if a == b:
        return 1.0
    if min(len(a), len(b)) >= 7 and lev(a, b) <= 2:
        return 0.8
    if min(len(a), len(b)) >= 4 and lev(a, b) <= 1:
        return 0.9
    return 0.0


def best_match(tokens, words, start_idx, max_look):
    """在 words[start_idx:start_idx+max_look] 里找 tokens 的最佳连续匹配（带插入/缺失惩罚）。"""
    n = len(tokens)
    if not n:
        return None
    best = None
    end_limit = min(len(words), start_idx + max_look)
    for i in range(start_idx, end_limit):
        for span in range(max(1, n - 2), n + 3):
            j = i + span
            if j > len(words):
                break
            got = []
            for w in words[i:j]:
                t = norm_tokens(w["word"])
                if t:
                    got.append(t[0])
            if not got:
                continue
            # token 级编辑距离，额外/缺失的词都会被罚
            m, k = len(tokens), len(got)
            dp = [[0] * (k + 1) for _ in range(m + 1)]
            for x in range(m + 1):
                dp[x][0] = x
            for y in range(k + 1):
                dp[0][y] = y
            for x in range(1, m + 1):
                for y in range(1, k + 1):
                    c = 1 - sim(tokens[x - 1], got[y - 1])
                    dp[x][y] = min(dp[x - 1][y] + 1, dp[x][y - 1] + 1, dp[x - 1][y - 1] + c)
            score = 1 - dp[m][k] / max(m, k)
            if best is None or score > best[0]:
                best = (score, i, j - 1)
        if best and best[0] >= 0.95:
            break
    return best


def build_proposal(words, lines, old_times, max_look=60):
    raw = []
    ptr = 0
    for idx, line in enumerate(lines):
        tokens = norm_tokens(line[0])
        old = old_times[idx] if idx < len(old_times) else None
        cand = best_match(tokens, words, ptr, max_look) if tokens else None
        if not cand or cand[0] < 0.55:
            raw.append({"line": idx + 1, "old": old, "new": old,
                        "score": round(cand[0], 2) if cand else 0.0,
                        "action": "keep", "why": "match_low"})
            continue
        score, i, j = cand
        start = max(0.0, words[i]["start"] - 0.05)
        end = words[j]["end"] + 0.15
        raw.append({"line": idx + 1, "old": old, "new": [round(start, 2), round(end, 2)],
                    "score": round(score, 2), "action": "update", "why": ""})
        ptr = i + 1

    # 单调化：后一句的起点不能早于前一句的终点
    for x in range(1, len(raw)):
        prev, cur = raw[x - 1], raw[x]
        if not prev["new"] or not cur["new"]:
            continue
        if cur["new"][0] < prev["new"][1]:
            prev["new"][1] = max(round(cur["new"][0] - 0.05, 2),
                                 round(prev["new"][0] + 0.3, 2))
        if prev["new"][1] - prev["new"][0] < 0.35:
            prev["new"][1] = round(prev["new"][0] + 0.35, 2)
        if cur["new"][1] - cur["new"][0] < 0.35:
            cur["new"][1] = round(cur["new"][0] + 0.35, 2)

    # 与旧值差太多的不动
    for x in raw:
        if x["action"] != "update" or not x["old"]:
            continue
        if abs(x["new"][0] - x["old"][0]) > 8:
            x["new"] = x["old"]
            x["action"] = "keep"
            x["why"] = "shift_too_large"
        elif abs(x["new"][0] - x["old"][0]) < 0.15 and abs(x["new"][1] - x["old"][1]) < 0.25:
            x["new"] = x["old"]
            x["action"] = "keep"
            x["why"] = "close_enough"
    return raw


def summarize(prop):
    upd = [x for x in prop if x["action"] == "update"]
    high = [x for x in upd if x["score"] >= 0.85]
    return {
        "lines": len(prop),
        "update": len(upd),
        "keep": len(prop) - len(upd),
        "high_conf_updates": len(high),
        "median_shift": round(sorted(abs((x["new"][0] - (x["old"][0] if x["old"] else x["new"][0]))) for x in upd)[len(upd) // 2], 2) if upd else 0,
    }


def synthetic_words(lines, old, shift=0.0):
    """用现有时间码造一份「完美转写」，用来验证对齐流程（不碰模型/音频）。"""
    words = []
    for i, line in enumerate(lines):
        toks = norm_tokens(line[0])
        seg = old[i] if i < len(old) and old[i] else [i * 3.0, i * 3.0 + 2.0]
        start, end = seg[0] + shift, seg[1] + shift
        step = max(0.05, (end - start) / max(1, len(toks)))
        for k, tok in enumerate(toks):
            words.append({"word": tok, "start": round(start + k * step, 2),
                          "end": round(start + (k + 1) * step * 0.85, 2), "p": 1.0})
    return words


def cmd_align(args):
    lines, old = lyrics_and_times(args.show, args.n)
    if args.synthetic:
        words = synthetic_words(lines, old, args.shift)
    else:
        tp = os.path.join(ASR_DIR, args.show, "%02d.json" % int(args.n))
        if not os.path.exists(tp):
            raise SystemExit("还没有转写结果：%s（先跑 transcribe）" % tp)
        data = json.load(open(tp, encoding="utf-8"))
        words = data.get("words") or []
    if not words:
        raise SystemExit("转写里没有词级时间戳（word_timestamps 没开？）")

    prop = build_proposal(words, lines, old, max_look=args.max_look)
    s = summarize(prop)
    out = {"show": args.show, "n": int(args.n), "summary": s, "lines": prop}
    d = os.path.join(ASR_DIR, args.show)
    os.makedirs(d, exist_ok=True)
    rp = os.path.join(d, "%02d.times.json" % int(args.n))
    json.dump(out, open(rp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("对比 %d 行：更新 %d（高置信 %d）、保留 %d，位移中位数 %.2fs → %s"
          % (s["lines"], s["update"], s["high_conf_updates"], s["keep"], s["median_shift"], rp))

    show_n = min(8, len([x for x in prop if x["action"] == "update"]))
    for x in [y for y in prop if y["action"] == "update"][:show_n]:
        print("  l%-3d %s → %s  score=%.2f" % (x["line"], x["old"], x["new"], x["score"]))
    return out


def cmd_apply(args):
    prop_path = os.path.join(ASR_DIR, args.show, "%02d.times.json" % int(args.n))
    if not os.path.exists(prop_path):
        raise SystemExit("没有候选文件：%s" % prop_path)
    prop = json.load(open(prop_path, encoding="utf-8"))
    lines, old = lyrics_and_times(args.show, args.n)
    new_times = [list(t) if t else t for t in old]
    changed = 0
    for x in prop["lines"]:
        if x["action"] == "update" and x["new"]:
            new_times[x["line"] - 1] = x["new"]
            changed += 1
    if args.dry_run:
        print("[dry-run] 将改 %d 行，未写入" % changed)
        return
    if not changed:
        print("没有需要改的行")
        return

    path = os.path.join(ROOT, "content", args.show, "times.js")
    bak = path + ".bak-" + time.strftime("%Y%m%d-%H%M%S")
    shutil.copy2(path, bak)
    head, times, tail = load_js(path)
    times[args.show][str(args.n)] = new_times
    save_js(path, head, times, tail, indent=(args.show == "hamilton"))
    print("已写入 %d 行；备份 %s" % (changed, bak))


# ---------- 自检 ----------

def cmd_self_test(_args):
    lines = [["Hello world", "你好世界"], ["This is a test", "这是测试"], ["One more time", "再来一次"]]
    words = []
    t = 1.0
    for text in ["hello", "world", "this", "is", "a", "test", "one", "more", "time"]:
        words.append({"word": text, "start": round(t, 2), "end": round(t + 0.4, 2), "p": 0.9})
        t += 0.5
    old = [[1.0, 1.9], [2.5, 3.4], [4.0, 5.0]]
    prop = build_proposal(words, lines, old)
    ok = True
    for i, want in enumerate([[0.95, 1.9], [1.95, 3.9], [3.95, 5.55]]):
        got = prop[i]["new"]
        good = abs(got[0] - want[0]) <= 0.2 and abs(got[1] - want[1]) <= 0.35
        print("line %d %s got=%s want≈%s" % (i + 1, "ok" if good else "FAIL", got, want))
        ok = ok and good

    # 漏词 + 转写误差：应降级为 keep 或仍能匹配
    words2 = [{"word": "hello", "start": 1.0, "end": 1.4, "p": 0.9},
              {"word": "wrld", "start": 1.5, "end": 1.9, "p": 0.4},
              {"word": "this", "start": 2.0, "end": 2.4, "p": 0.9}]
    prop2 = build_proposal(words2, [["Hello world", ""], ["This is a test", ""]], [[1, 2], [2, 3]])
    print("fuzzy line1", prop2[0]["score"], prop2[0]["new"])
    ok = ok and prop2[0]["score"] >= 0.8 and prop2[0]["new"][0] <= 1.1

    print("SELF-TEST", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


# ---------- CLI ----------

def main():
    ap = argparse.ArgumentParser(description="音频识别 → 逐行时间码（默认只出报告）")
    sub = ap.add_subparsers(dest="cmd", required=True)

    t = sub.add_parser("transcribe", help="转写一首，生成词级时间戳")
    t.add_argument("--show", required=True)
    t.add_argument("--n", required=True, type=int)
    t.add_argument("--model", default=DEFAULT_MODEL)
    t.add_argument("--language", default="en")
    t.set_defaults(func=cmd_transcribe)

    a = sub.add_parser("align", help="把转写对齐到歌词行，生成候选（默认不写）")
    a.add_argument("--show", required=True)
    a.add_argument("--n", required=True, type=int)
    a.add_argument("--max-look", type=int, default=60)
    a.add_argument("--synthetic", action="store_true", help="用现有时间码造词流自测，不读转写")
    a.add_argument("--shift", type=float, default=0.0, help="配合 --synthetic，把词流整体平移 N 秒")
    a.set_defaults(func=cmd_align)

    p = sub.add_parser("apply", help="把候选写进 times.js（自动备份）")
    p.add_argument("--show", required=True)
    p.add_argument("--n", required=True, type=int)
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_apply)

    s = sub.add_parser("self-test", help="不跑模型的算法自检")
    s.set_defaults(func=cmd_self_test)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
