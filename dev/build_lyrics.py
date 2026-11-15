"""把《Hamilton 全曲歌词（英中对照）.txt》解析成应用数据。

用法：
    python dev/build_lyrics.py [源 txt 路径]
    LYRICS_SRC=/path/to/lyrics.txt python dev/build_lyrics.py

不传参时按顺序找：环境变量 LYRICS_SRC → 仓库内 sources/Hamilton 全曲歌词（英中对照）.txt。
源文件是外部素材，不随包分发，所以第一次要显式给一个路径。
输出：content/hamilton/lyrics.js

处理：
- 去掉每首歌末尾的制作名单（键盘 / 鼓 / 人声 / 混音师 …）
- 把行首的演唱者标签（HAMILTON: / BURR: …）拆出来，存到行的第三个字段，
  显示时做小字标签，不再混在歌词正文里。
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
DEFAULT_SRC = os.path.join(ROOT, "sources", "Hamilton 全曲歌词（英中对照）.txt")
SRC = os.environ.get("LYRICS_SRC") or (sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC)
OUT = os.path.join(ROOT, "content", "hamilton", "lyrics.js")

if not os.path.isfile(SRC):
    sys.exit(
        "找不到歌词源文件：%s\n"
        "用法：python dev/build_lyrics.py <歌词 txt 路径>\n"
        "  或：LYRICS_SRC=<路径> python dev/build_lyrics.py" % SRC
    )

TITLE_RE = re.compile(r"^(\d{2})\.\s+(.+)$")
SINGER_RE = re.compile(r"^演唱：(.+)$")
SEP_RE = re.compile(r"^[=\-]{10,}$")
SPEAKER_RE = re.compile(r"^([A-Z][A-Z0-9 .'’‘&/-]{0,39}?)\s*[:：]\s*(.*)$")
SPEAKER_BRACKET_RE = re.compile(r"^([A-Z][A-Z0-9 .'’‘&/-]{0,39}?)\]\s*(.*)$")

ROLES = (
    "键盘|鼓|人声|竖琴|大提琴|小提琴|中提琴|编程|合成器|班卓琴|贝斯|母带工程师|鼓编程|混音师|"
    "制作人|作词|作曲|编曲|录音|助理|指挥|吉他|钢琴|和声|口琴|手风琴|打击乐|小号|长号|萨克斯|"
    "长笛|单簧管|低音提琴|音频|工程|混音|母带|配唱|监制|出品|发行|统筹|视觉|设计|摄影|导演"
)
CREDIT_RE = re.compile(r"^(?:%s)\s*[:：]" % ROLES)

songs = []
cur = None
mode = "header"

for raw in open(SRC, encoding="utf-8-sig").read().splitlines():
    line = raw.rstrip()
    stripped = line.strip()
    if SEP_RE.match(stripped):
        continue
    m = TITLE_RE.match(stripped)
    if m and (cur is None or mode in ("body", "title")):
        cur = {"n": int(m.group(1)), "title": m.group(2).strip(), "singer": "", "lines": []}
        songs.append(cur)
        mode = "title"
        continue
    m = SINGER_RE.match(stripped)
    if m and cur is not None and mode == "title":
        cur["singer"] = m.group(1).strip()
        mode = "body"
        continue
    if cur is None or mode != "body" or not stripped:
        continue
    if line.startswith("    "):
        if cur["lines"]:
            cur["lines"][-1][1] = stripped
        else:
            cur["lines"].append(["", stripped])
    else:
        cur["lines"].append([stripped, ""])

data = {}
dropped = 0
for s in songs:
    lines = []
    for en, zh in s["lines"]:
        if CREDIT_RE.match(en.strip()):
            dropped += 1
            continue
        speaker = ""
        m = SPEAKER_RE.match(en) or SPEAKER_BRACKET_RE.match(en)
        if m:
            speaker = m.group(1).strip().strip("'‘’")
            en = m.group(2).strip()
        item = [en, zh]
        if speaker:
            item.append(speaker)
        lines.append(item)
    data[str(s["n"])] = {
        "n": s["n"],
        "title": s["title"],
        "singer": s["singer"],
        "lines": lines,
    }

js = (
    "/* 剧读 · 全曲歌词（由 dev/build_lyrics.py 从《Hamilton 全曲歌词（英中对照）.txt》生成）\n"
    " * lines = [[英文, 中文, 演唱者(可选)], ...]\n"
    " * 已去掉制作名单；行首的 HAMILTON:/BURR: 标签拆到了第三个字段。\n"
    " */\n"
    "window.MUSICAL_LYRICS = "
    + json.dumps({"hamilton": data}, ensure_ascii=False, separators=(",", ":"))
    + ";\n"
)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(js)

print("songs:", len(data), "lines:", sum(len(s["lines"]) for s in data.values()), "credits dropped:", dropped)
print("out:", os.path.abspath(OUT), round(len(js) / 1024, 1), "KB")
for n in ("1", "2", "46"):
    s = data[n]
    print(n, s["title"], len(s["lines"]), "lines")

