"""扫描 content/ 下的剧目，生成 content/shows.js。

用法：python dev/build_shows.py
新增剧目：在 content/<id>/ 放 show.json（含 id/title/subtitle/files），
再跑一次本脚本；下拉里就会出现这个剧目。
"""
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CONTENT = os.path.join(ROOT, "content")
OUT = os.path.join(CONTENT, "shows.js")

shows = []
for name in sorted(os.listdir(CONTENT)):
    folder = os.path.join(CONTENT, name)
    manifest = os.path.join(folder, "show.json")
    if not os.path.isdir(folder) or not os.path.isfile(manifest):
        continue
    try:
        with open(manifest, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print("skip", name, e)
        continue
    data.setdefault("id", name)
    data.setdefault("title", name)
    data.setdefault("subtitle", "")
    data.setdefault("files", [])
    if not data["files"]:
        print("skip", name, "empty files")
        continue
    shows.append(data)

js = (
    "/* 剧读 · 剧目清单（由 dev/build_shows.py 扫描 content/<id>/show.json 生成） */\n"
    "window.MUSICAL_SHOWS = "
    + json.dumps(shows, ensure_ascii=False, indent=2)
    + ";\n"
)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(js)

print("shows:", len(shows))
for s in shows:
    print(" ", s["id"], s["title"], "files:", len(s["files"]))
