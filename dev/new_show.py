#!/usr/bin/env python3
"""新建剧目脚手架。

用法：python3 dev/new_show.py <id> "<Title>" "<Subtitle>"
例：  python3 dev/new_show.py hamilton2 "Show Name" "A Musical"
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

if len(sys.argv) < 3:
    print('usage: python3 dev/new_show.py <id> "<Title>" "<Subtitle>"')
    sys.exit(1)

show_id = sys.argv[1].strip()
title = sys.argv[2].strip()
subtitle = sys.argv[3].strip() if len(sys.argv) > 3 else ""

if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", show_id):
    print("id 只能用小写字母、数字、连字符")
    sys.exit(1)

folder = ROOT / "content" / show_id
if folder.exists():
    print("already exists:", folder)
    sys.exit(1)

folder.mkdir(parents=True)
(ROOT / "audio" / show_id).mkdir(parents=True, exist_ok=True)

manifest = {"id": show_id, "title": title, "subtitle": subtitle, "files": []}
(folder / "show.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

print("created:", folder)
print("created:", ROOT / "audio" / show_id)
print("")
print("下一步：")
print("1. 放 tracks.js / lyrics.js / times.js（结构照 hamilton）")
print("2. 写 pack（结构见 content/hamilton/PACK_SPEC.md，带 showId: %r）" % show_id)
print("3. 放音频到 audio/%s/" % show_id)
print("4. node dev/integrate_packs.js %s" % show_id)
print("5. python3 dev/build_shows.py")
print("6. node dev/validate_packs.js")
