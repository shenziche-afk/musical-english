"""抓取 46 首的 LRC 时间轴，对齐到 lyrics.js 的行，生成 times.js。

用法：python dev/build_lrc.py
输出：content/hamilton/times.js
"""
import json
import os
import re
import time
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
META = r"C:\Users\ASUS\Documents\xwechat_files\wxid_j48q6py4gajn12_b219\msg\file\2026-11\netease_album_metadata.json"
LYRICS = os.path.join(ROOT, "content", "hamilton", "lyrics.js")
OUT = os.path.join(ROOT, "content", "hamilton", "times.js")

ROLES = (
    "键盘|鼓|人声|竖琴|大提琴|小提琴|中提琴|编程|合成器|班卓琴|贝斯|母带工程师|鼓编程|混音师|"
    "制作人|作词|作曲|编曲|录音|助理|指挥|吉他|钢琴|和声|口琴|手风琴|打击乐|小号|长号|萨克斯|"
    "长笛|单簧管|低音提琴|音频|工程|混音|母带|配唱|监制|出品|发行|统筹|视觉|设计|摄影|导演"
)
CREDIT_RE = re.compile(r"^(?:%s)\s*[:：]" % ROLES)
TIME_RE = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)")


def norm(s):
    s = s.lower().replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"[^a-z0-9' ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def fetch(song_id):
    url = "https://music.163.com/api/song/lyric?id=%s&lv=1&kv=1&tv=-1" % song_id
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    raw = urllib.request.urlopen(req, timeout=15).read()
    obj = json.loads(raw)
    return obj.get("lrc", {}).get("lyric", "")


def parse_lrc(text):
    rows = []
    for line in text.splitlines():
        m = TIME_RE.match(line.strip())
        if not m:
            continue
        t = int(m.group(1)) * 60 + float(m.group(2))
        content = m.group(3).strip()
        if not content:
            continue
        if CREDIT_RE.match(content):
            continue
        rows.append((t, content))
    return rows


def align(our_lines, lrc_rows):
    """按顺序做文本匹配；返回与 our_lines 等长的 (start, end) 列表。"""
    normed = [(t, norm(c)) for t, c in lrc_rows]
    times = []
    ptr = 0
    for en, zh, *rest in our_lines:
        target = norm(en)
        found = None
        if target:
            for j in range(ptr, min(ptr + 8, len(normed))):
                t, nt = normed[j]
                if nt == target:
                    found = j
                    break
                if target and (target in nt or nt in target) and abs(len(nt) - len(target)) <= 12:
                    found = j
                    break
        if found is None:
            times.append(None)
            continue
        ptr = found
        start = normed[found][0]
        end = normed[found + 1][0] if found + 1 < len(normed) else start + 5
        times.append([round(start, 2), round(end, 2)])
    return times


def fill(times):
    """把没匹配上的行用相邻时间补上，保证每行都能播。"""
    n = len(times)
    for i in range(n):
        if times[i]:
            continue
        prev_end = None
        next_start = None
        for j in range(i - 1, -1, -1):
            if times[j]:
                prev_end = times[j][1]
                break
        for j in range(i + 1, n):
            if times[j]:
                next_start = times[j][0]
                break
        start = prev_end if prev_end is not None else (next_start if next_start is not None else 0)
        end = next_start if next_start is not None else start + 3
        if end <= start:
            end = start + 1
        times[i] = [round(start, 2), round(end, 2)]
    return times


def main():
    meta = json.load(open(META, encoding="utf-8"))
    songs = sorted(meta["songs"], key=lambda x: (str(x.get("cd") or "1"), x.get("no") or 0))

    src = open(LYRICS, encoding="utf-8").read()
    data = json.loads(src[src.index("{"):src.rindex(";")])["hamilton"]

    result = {"hamilton": {}}
    report = []
    for seq, s in enumerate(songs, 1):
        n = seq
        sid = s["id"]
        ours = data[str(n)]["lines"]
        try:
            lrc = fetch(sid)
        except Exception as e:
            report.append((n, len(ours), 0, "ERR " + str(e)[:40]))
            continue
        rows = parse_lrc(lrc)
        times = fill(align(ours, rows))
        matched = sum(1 for t in times if t)
        result["hamilton"][str(n)] = times
        report.append((n, len(ours), matched, ""))
        time.sleep(0.15)

    js = (
        "/* 剧读 · 逐行时间轴（由 dev/build_lrc.py 从网易云 LRC 生成）\n"
        " * 结构：{ 曲目号: [[start, end], ...] }，与 lyrics.js 的行一一对应。\n"
        " */\n"
        "window.MUSICAL_TIMES = "
        + json.dumps(result, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)

    print("saved:", os.path.abspath(OUT), round(len(js) / 1024, 1), "KB")
    for n, total, matched, err in report:
        flag = "" if matched == total else "  <-- check"
        print("%02d lines=%d matched=%d %s%s" % (n, total, matched, err, flag))


if __name__ == "__main__":
    main()
