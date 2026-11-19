#!/usr/bin/env python3
"""给每个断句的结尾加一点旷量，避免最后一个词被吞掉。

- 默认 --pad 0.18s，--overlap 0.12s（允许压到下一句开头最多 0.12s）
- 末尾一句按音轨总时长封顶
- 写回前自动备份 times.js
"""
import argparse, json, os, shutil, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def load(path):
    s = open(path, encoding="utf-8").read()
    i, j = s.index("{"), s.rindex(";")
    return s[:i], json.loads(s[i:j]), s[j:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pad", type=float, default=0.18)
    ap.add_argument("--overlap", type=float, default=0.12)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("shows", nargs="*", default=["hamilton", "poto"])
    args = ap.parse_args()

    for show in args.shows:
        tpath = os.path.join(ROOT, "content", show, "times.js")
        tracks = json.loads(open(os.path.join(ROOT, "content", show, "tracks.js"), encoding="utf-8").read()
                            .split("=", 1)[1].rstrip(";\n"))[show]["tracks"]
        dur = {t["n"]: t["seconds"] for t in tracks}
        head, data, tail = load(tpath)
        padded = capped = 0
        for n, T in data[show].items():
            total = dur.get(int(n), 0)
            for i, seg in enumerate(T):
                if not seg:
                    continue
                start, end = seg
                want = end + args.pad
                if i + 1 < len(T) and T[i + 1]:
                    want = min(want, T[i + 1][0] + args.overlap)
                if total:
                    want = min(want, total - 0.05)
                if want > end + 0.001:
                    if want < end + args.pad - 0.001:
                        capped += 1
                    seg[1] = round(want, 2)
                    padded += 1
        print(show, "padded", padded, "capped_by_next", capped)
        if not args.dry_run:
            bak = tpath + ".bak-" + time.strftime("%Y%m%d-%H%M%S")
            shutil.copy2(tpath, bak)
            indent = 2 if show == "hamilton" else None
            body = json.dumps(data, ensure_ascii=False, indent=indent) if indent else \
                json.dumps(data, ensure_ascii=False, separators=(",", ":"))
            open(tpath, "w", encoding="utf-8").write(head + body + tail)


if __name__ == "__main__":
    main()
