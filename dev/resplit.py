#!/usr/bin/env python3
"""重新断句：把一行结尾的功能词挪到下一行，并同步时间码 / 译文 / 注释 / pack 文本。

输入一份 JSON 编辑单（见 dev/resplit_edits.json）：
  [{ "show":"hamilton","n":1,"line":10,
     "split_before":"of",            # 在本行第几个词之前切开（0 基），切点之后的内容移到下一行
     "next_en":"of a trading charter","next_zh":"一份贸易特许状",
     "en":"By fourteen, they placed him in charge","zh":"十四岁时，众人就让他掌管",
     "note":"...","next_note":"..." }]

时间码用「字符占比」估一个切点，再吸附到附近的能量低谷（气口/辅音间隙）。
默认 --dry-run；--apply 才写，写前自动备份 lyrics/times/pack。
"""
import argparse, json, os, re, shutil, subprocess, sys, time, wave

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WORD = re.compile(r"[A-Za-z0-9'’\-]+")

def load_js(path):
    s = open(path, encoding="utf-8").read()
    i, j = s.index("{"), s.rindex(";")
    return s[:i], json.loads(s[i:j]), s[j:]


def load_pack(path):
    """pack 文件前面有 window.MUSICAL_SONGS = window.MUSICAL_SONGS || {}; 的守卫，不能按第一个 { 切。"""
    s = open(path, encoding="utf-8").read()
    m = re.search(r"window\.MUSICAL_SONGS\[[^\]]+\]\s*=\s*", s)
    i, j = m.end(), s.rindex(";")
    return s[:i], json.loads(s[i:j]), s[j:]

def save_js(path, head, data, tail, indent):
    body = json.dumps(data, ensure_ascii=False, indent=2) if indent else json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    open(path, "w", encoding="utf-8").write(head + body + tail)

def rms_curve(path):
    import numpy as np
    wav = "/tmp/_rs.wav"
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", path, wav],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    w = wave.open(wav); sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype("float32") / 32768
    w.close(); os.remove(wav)
    hop = 0.01; n = int(len(x) / (sr * hop))
    rms = np.array([float(np.sqrt(np.mean(x[int(i*sr*hop):int((i+1)*sr*hop)]**2))) for i in range(n)])
    return rms, hop

def snap(rms, hop, t, window=0.45):
    i0 = max(0, int((t - window) / hop)); i1 = min(len(rms) - 1, int((t + window) / hop))
    if i1 <= i0: return t
    seg = rms[i0:i1]
    # 取窗口内最低点（气口/辅音间隙），再往后 20ms 作为人声起点
    k = int(seg.argmin())
    return round((i0 + k) * hop + 0.03, 2)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("edits", nargs="?", default=os.path.join(ROOT, "dev", "resplit_edits.json"))
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    edits = json.load(open(args.edits, encoding="utf-8"))

    cache = {}
    for e in edits:
        show, n, line = e["show"], int(e["n"]), int(e["line"])
        if show not in cache:
            cache[show] = {}
        if n not in cache[show]:
            base = os.path.join(ROOT, "content", show)
            lh, ly, lt = load_js(os.path.join(base, "lyrics.js"))
            th, tm, tt = load_js(os.path.join(base, "times.js"))
            tracks_head, tracks, tracks_tail = load_js(os.path.join(base, "tracks.js"))
            cache[show][n] = dict(base=base, lh=lh, ly=ly, lt=lt, th=th, tm=tm, tt=tt, tracks=tracks)

        c = cache[show][n]
        L = c["ly"][show][str(n)]["lines"]; T = c["tm"][show][str(n)]
        i = line - 1
        if i + 1 >= len(L):
            print("skip last line", show, n, line); continue
        if e.get("pull_until"):
            # 反向：把下一行的开头并进本行，切点在下一行里找
            src_text = L[i + 1][0]
            words = WORD.findall(src_text)
            try:
                k = words.index(e["pull_until"])
            except ValueError:
                sys.exit("pull word not found: %s in %r" % (e["pull_until"], src_text))
            m = re.search(r"\b%s\b" % re.escape(words[k]), src_text)
            ratio = (m.start() / max(1, len(src_text))) if m else 0.5
            t0, t1 = T[i + 1]
            est = t0 + ratio * (t1 - t0)
        else:
            old_text = L[i][0]
            words = WORD.findall(old_text)
            try:
                k = words.index(e["split_before"]) if isinstance(e["split_before"], str) else int(e["split_before"])
            except ValueError:
                sys.exit("split word not found: %s in %r" % (e["split_before"], old_text))
            m = re.search(r"\b%s\b" % re.escape(words[k]), old_text)
            ratio = (m.start() / max(1, len(old_text))) if m else 0.5
            t0, t1 = T[i]
            est = t0 + ratio * (t1 - t0)
        path = os.path.join(ROOT, e["track"])
        rms, hop = rms_curve(path)
        if e.get("boundary") is not None:
            est = float(e["boundary"])
        b = snap(rms, hop, est) if e.get("snap") else est
        b = max(t0 + 0.15, min(b, t1 + 2.0 - 0.05))
        label = e.get("split_before") or ("pull:" + e.get("pull_until", ""))
        print("%s #%s l%d  %r → 切点 %.2f（估计 %.2f）" % (show, n, line, label, b, est))
        e["_b"] = round(b, 2)

    if not args.apply:
        print("dry-run：未写入（加 --apply 才写）")
        return

    stamp = time.strftime("%Y%m%d-%H%M%S")
    # 按剧目分组：lyrics/times 一次载入、一次写回，避免每个 n 都写一遍旧副本
    for show in sorted({e["show"] for e in edits}):
        base = os.path.join(ROOT, "content", show)
        lh, ly, lt = load_js(os.path.join(base, "lyrics.js"))
        th, tm, tt = load_js(os.path.join(base, "times.js"))
        tracks_head, tracks, tracks_tail = load_js(os.path.join(base, "tracks.js"))
        packs = {}
        for e in [x for x in edits if x["show"] == show]:
            n = int(e["n"]); i = int(e["line"]) - 1
            L = ly[show][str(n)]["lines"]; T = tm[show][str(n)]
            b = e["_b"]
            L[i][0], L[i][1] = e["en"], e["zh"]
            L[i + 1][0] = e["next_en"]; L[i + 1][1] = e.get("next_zh", L[i + 1][1])
            T[i][1] = b; T[i + 1][0] = b
            if n not in packs:
                content = next((t.get("content") for t in tracks[show]["tracks"] if t["n"] == n), None)
                if content:
                    pp = os.path.join(base, content + ".js")
                    if os.path.exists(pp):
                        packs[n] = (pp,) + load_pack(pp)
        for f in ("lyrics.js", "times.js"):
            shutil.copy2(os.path.join(base, f), os.path.join(base, f + ".bak-" + stamp))
        save_js(os.path.join(base, "lyrics.js"), lh, ly, lt, indent=(show == "hamilton"))
        save_js(os.path.join(base, "times.js"), th, tm, tt, indent=(show == "hamilton"))
        for n, (pp, ph, pack, pt) in packs.items():
            rows = [l for sec in pack["sections"] for l in sec["lines"]]
            for e in [x for x in edits if x["show"] == show and int(x["n"]) == n]:
                i = int(e["line"]) - 1
                rows[i]["text"], rows[i]["zh"] = e["en"], e["zh"]
                rows[i + 1]["text"], rows[i + 1]["zh"] = e["next_en"], e.get("next_zh", rows[i + 1]["zh"])
                if e.get("note"): rows[i]["note"] = e["note"]
                if e.get("next_note"): rows[i + 1]["note"] = e["next_note"]
            shutil.copy2(pp, pp + ".bak-" + stamp)
            save_js(pp, ph, pack, pt, indent=True)
        print("写入", show, "行数", len([x for x in edits if x["show"] == show]), "备份", stamp)

if __name__ == "__main__":
    main()
