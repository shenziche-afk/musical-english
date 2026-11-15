#!/usr/bin/env python3
"""从本地专辑目录生成 content/poto/ 的 lyrics.js / times.js / tracks.js。

素材布局（默认值，可用参数覆盖）：
  --album  "…/The Phantom of the Opera - Original London Cast (1986)"  （m4a + lrc）
  --lyrics "…/The Phantom of the Opera 歌词（单独）/分曲 txt"          （英中对照 txt）

用法：
  python3 dev/build_poto.py
  python3 dev/build_poto.py --album <dir> --lyrics <dir>
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOW = "poto"
OUT_DIR = os.path.join(ROOT, "content", SHOW)
AUDIO_DIR = os.path.join(ROOT, "audio", SHOW)

DEFAULT_ALBUM = os.path.expanduser("~/Desktop/The Phantom of the Opera - Original London Cast (1986)")
DEFAULT_LYRICS = os.path.expanduser("~/Desktop/The Phantom of the Opera 歌词（单独）/分曲 txt")

CREDITS = re.compile(r"^(制作|作词|作曲|编曲|演唱|录音|混音|母带|出品|监制|统筹)\s*[:：]")
HEADER = re.compile(r"^(\d{2})\.\s+(.+)$")
SPEAKER_ONLY = re.compile(r"^([A-Z][A-Z0-9 .'&/-]{1,30}):\s*$")
SPEAKER_INLINE = re.compile(r"^([A-Z][A-Z0-9 .'&/-]{1,30}):\s*(.+)$")
TIME_RE = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)")


def slug(title):
    s = unicodedata.normalize("NFKD", title)
    s = s.replace("&", " and ")
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return re.sub(r"-{2,}", "-", s)


def norm(s):
    s = (s or "").lower().replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"[^a-z0-9' ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def parse_lyrics(path):
    raw = open(path, encoding="utf-8-sig").read().splitlines()
    n = title = singer = ""
    lines = []
    pending_speaker = None
    skip_next_indent = False
    for line in raw:
        s = line.rstrip()
        stripped = s.strip()
        if not stripped:
            continue
        m = HEADER.match(stripped)
        if m and not title:
            n, title = m.group(1), m.group(2).strip()
            continue
        if stripped.startswith("演唱："):
            singer = stripped[3:].strip()
            continue
        if CREDITS.match(stripped):
            continue
        if s.startswith("    ") or s.startswith("\t"):
            zh = stripped
            if skip_next_indent:
                skip_next_indent = False
                continue
            if lines:
                lines[-1][1] = zh
            else:
                lines.append(["", zh])
            continue
        m2 = SPEAKER_ONLY.match(stripped)
        if m2:
            pending_speaker = m2.group(1).strip()
            skip_next_indent = True
            continue
        m3 = SPEAKER_INLINE.match(stripped)
        speaker = ""
        en = stripped
        if m3:
            speaker = m3.group(1).strip()
            en = m3.group(2).strip()
        item = [en, ""]
        if speaker:
            item.append(speaker)
        elif pending_speaker:
            item.append(pending_speaker)
        lines.append(item)
    return n, title, singer, lines


def parse_lrc(path):
    rows = []
    for line in open(path, encoding="utf-8-sig").read().splitlines():
        m = TIME_RE.match(line.strip())
        if not m:
            continue
        t = int(m.group(1)) * 60 + float(m.group(2))
        text = m.group(3).strip()
        if not text:
            continue
        rows.append((round(t, 2), text))
    return rows


def align(lines, rows, window=10):
    normed = [(t, norm(c)) for t, c in rows]
    times = []
    ptr = 0
    for item in lines:
        target = norm(item[0])
        found = None
        if target:
            for j in range(ptr, min(ptr + window, len(normed))):
                t, nt = normed[j]
                if not nt:
                    continue
                if nt == target or (target in nt or nt in target) and abs(len(nt) - len(target)) <= 12:
                    found = j
                    break
        if found is None:
            times.append(None)
            continue
        ptr = found
        start = normed[found][0]
        end = normed[found + 1][0] if found + 1 < len(normed) else start + 5
        times.append([start, round(end, 2)])
    return times


def fill(times, duration):
    n = len(times)
    for i in range(n):
        if times[i]:
            continue
        prev_end = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), None)
        nxt = next((times[j][0] for j in range(i + 1, n) if times[j]), None)
        start = prev_end if prev_end is not None else (nxt if nxt is not None else 0)
        end = nxt if nxt is not None else (start + 3 if duration is None else min(start + 3, duration))
        if end <= start:
            end = start + 1
        times[i] = [round(start, 2), round(end, 2)]
    return times


def duration_of(path):
    try:
        out = subprocess.check_output(["afinfo", path], stderr=subprocess.DEVNULL).decode("utf-8", "ignore")
    except Exception:
        return None
    m = re.search(r"estimated duration:\s*([\d.]+)", out)
    return float(m.group(1)) if m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--album", default=DEFAULT_ALBUM)
    ap.add_argument("--lyrics", default=DEFAULT_LYRICS)
    args = ap.parse_args()

    txt_files = sorted(f for f in os.listdir(args.lyrics) if f.lower().endswith(".txt"))
    if not txt_files:
        sys.exit("没有找到 txt：%s" % args.lyrics)

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(AUDIO_DIR, exist_ok=True)

    lyrics = {}
    times = {}
    tracks = []
    total = 0
    report = []

    for f in txt_files:
        n = int(f[:2])
        _, title, singer, lines = parse_lyrics(os.path.join(args.lyrics, f))
        if not title:
            sys.exit("解析失败：%s" % f)
        sid = slug(title)

        src_audio = None
        for cand in os.listdir(args.album):
            if cand.startswith("%02d " % n) and cand.lower().endswith(".m4a"):
                src_audio = os.path.join(args.album, cand)
                break
        if not src_audio:
            sys.exit("缺少音频：%02d %s" % (n, title))

        dest_name = "%02d-%s.m4a" % (n, sid)
        dest = os.path.join(AUDIO_DIR, dest_name)
        if not os.path.exists(dest) or os.path.getsize(dest) != os.path.getsize(src_audio):
            shutil.copy2(src_audio, dest)

        dur = duration_of(dest) or 0
        total += dur

        src_lrc = None
        lrc_dir = os.path.join(os.path.dirname(args.lyrics), "分曲 lrc")
        for cand in os.listdir(lrc_dir):
            if cand.startswith("%02d " % n) and cand.lower().endswith(".lrc"):
                src_lrc = os.path.join(lrc_dir, cand)
                break
        rows = parse_lrc(src_lrc) if src_lrc else []
        t = fill(align(lines, rows), dur)
        # 纯音乐（Entr'acte）只有一行占位词：整首一段
        if len(lines) == 1 and "纯音乐" in lines[0][0]:
            t = [[0, round(dur, 2)]]

        lyrics[str(n)] = {"n": n, "title": title, "singer": singer, "lines": lines}
        times[str(n)] = t
        tracks.append(
            {
                "n": n,
                "act": 1 if n <= 14 else 2,
                "title": title,
                "file": "audio/%s/%s" % (SHOW, dest_name),
                "seconds": int(round(dur)),
            }
        )
        report.append((n, title, len(lines), sum(1 for x in t if x), sid))

    tracks_data = {
        SHOW: {
            "id": SHOW,
            "show": "The Phantom of the Opera",
            "totalSeconds": int(round(total)),
            "tracks": tracks,
        }
    }

    def write_js(path, header, var, payload):
        js = header + "window." + var + " = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
        open(path, "w", encoding="utf-8").write(js)

    write_js(
        os.path.join(OUT_DIR, "lyrics.js"),
        "/* 剧读 · The Phantom of the Opera 歌词 + 中文对照（1986 原伦敦卡司版）\n * lines = [[英文, 中文, 演唱者(可选)], ...]\n */\n",
        "MUSICAL_LYRICS",
        {SHOW: lyrics},
    )
    write_js(
        os.path.join(OUT_DIR, "times.js"),
        "/* 剧读 · The Phantom of the Opera 逐行时间轴（秒，起止），与 lyrics.js 一行对应 */\n",
        "MUSICAL_TIMES",
        {SHOW: times},
    )
    write_js(
        os.path.join(OUT_DIR, "tracks.js"),
        "/* 剧读 · The Phantom of the Opera 21 首曲目（1986 原伦敦卡司版，时长来自音频） */\n",
        "MUSICAL_TRACKS",
        tracks_data,
    )

    manifest = {
        "id": SHOW,
        "title": "The Phantom of the Opera",
        "subtitle": "Original London Cast · 1986",
        "files": [
            "content/%s/tracks.js" % SHOW,
            "content/%s/lyrics.js" % SHOW,
            "content/%s/times.js" % SHOW,
        ],
    }
    with open(os.path.join(OUT_DIR, "show.json"), "w", encoding="utf-8") as f:
        f.write(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    print("saved:", OUT_DIR)
    print("tracks: %d, total: %d min" % (len(tracks), round(total / 60)))
    for n, title, lines_n, matched, sid in report:
        flag = "" if matched == lines_n else "  <-- %d/%d" % (matched, lines_n)
        print("%02d %-48s lines=%-3d matched=%-3d %s%s" % (n, title[:48], lines_n, matched, sid, flag))


if __name__ == "__main__":
    main()
