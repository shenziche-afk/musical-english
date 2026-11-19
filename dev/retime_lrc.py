#!/usr/bin/env python3
"""用人工 LRC 校正逐行起点：LRC 为主，落在静音里的行保留原值。

- 逐行按文本匹配（单调指针，允许跳过 LRC 里多出来的行）
- 起点取 LRC 时间；如果那一刻是静音（明显没人声），视为 LRC 标错，保留原起点
- 终点先统一成下一句起点，随后由 dev/pad_times.py 统一加旷量
"""
import argparse, glob, json, os, re, shutil, struct, subprocess, time
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LRC_DIRS = {
    "hamilton": "/Users/shenjiahao/Desktop/Hamilton 歌词（单独）/分曲 lrc",
    "poto": "/Users/shenjiahao/Desktop/The Phantom of the Opera - Original London Cast (1986)",
}


def norm(s):
    return re.sub(r"[^a-z0-9 ]", "", str(s).lower()).strip()


def parse_lrc(path):
    out = []
    for line in open(path, encoding="utf-8", errors="ignore"):
        m = re.match(r"\[(\d+):(\d+\.\d+)\](.*)", line)
        if m:
            out.append((int(m.group(1)) * 60 + float(m.group(2)), m.group(3).strip()))
    return out


def load_js(path):
    s = open(path, encoding="utf-8").read()
    i, j = s.index("{"), s.rindex(";")
    return s[:i], json.loads(s[i:j]), s[j:]


def rms_curve(path):
    wav = "/tmp/_rl.wav"
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", path, wav],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    d = open(wav, "rb").read(); os.remove(wav)
    pos = 12; pcm = None; sr = None
    while pos + 8 <= len(d):
        cid = d[pos:pos + 4]; size = struct.unpack("<I", d[pos + 4:pos + 8])[0]
        body = d[pos + 8:pos + 8 + size]
        if cid == b"fmt ":
            sr = struct.unpack("<I", body[4:8])[0]
        elif cid == b"data":
            pcm = body
        pos += 8 + size + (size & 1)
    x = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768
    hop = 0.02
    n = int(len(x) / (sr * hop))
    return np.array([float(np.sqrt(np.mean(x[int(i*sr*hop):int((i+1)*sr*hop)]**2))) for i in range(n)]), hop


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("shows", nargs="*", default=["hamilton", "poto"])
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    report = []
    for show in args.shows:
        base = os.path.join(ROOT, "content", show)
        _, tracks, _ = load_js(os.path.join(base, "tracks.js"))
        _, lyrics, _ = load_js(os.path.join(base, "lyrics.js"))
        head, times, tail = load_js(os.path.join(base, "times.js"))
        changed_total = 0
        for t in tracks[show]["tracks"]:
            n = t["n"]
            cands = glob.glob(os.path.join(LRC_DIRS[show], "%02d *.lrc" % n)) or \
                    glob.glob(os.path.join(LRC_DIRS[show], "%02d*.lrc" % n))
            if not cands:
                continue
            lrc = parse_lrc(cands[0])
            lines = lyrics[show][str(n)]["lines"]
            T = times[show][str(n)]
            rms, hop = rms_curve(os.path.join(ROOT, t["file"]))
            thr = max(0.004, float(np.percentile(rms, 20)) * 1.3)
            ptr = 0; matched = 0; changed = 0
            for i, ln in enumerate(lines):
                key = norm(ln[0])
                found = None
                for k in range(ptr, min(len(lrc), ptr + 15)):
                    if norm(lrc[k][1]) == key:
                        found = k; break
                if found is None:
                    continue
                matched += 1
                tt = round(lrc[found][0], 2)
                ptr = found + 1
                a, b = int(tt / hop), int((tt + 0.25) / hop)
                loud = float(rms[a:b].max()) if b > a else 0
                if loud < thr * 1.6:
                    continue
                if T[i] and abs(T[i][0] - tt) > 0.05:
                    T[i][0] = tt; changed += 1
            # 收尾：每句 end 先贴到下一句起点
            for i in range(len(T) - 1):
                if T[i] and T[i + 1]:
                    T[i][1] = round(min(T[i][1], T[i + 1][0]), 2)
                    if T[i][1] <= T[i][0]:
                        T[i][1] = round(T[i][0] + 0.3, 2)
            report.append((show, n, t["title"], matched, changed))
            changed_total += changed
        print(show, "changed", changed_total)
        if args.apply:
            bak = os.path.join(base, "times.js.bak-" + time.strftime("%Y%m%d-%H%M%S"))
            shutil.copy2(os.path.join(base, "times.js"), bak)
            indent = 2 if show == "hamilton" else None
            body = json.dumps(times, ensure_ascii=False, indent=indent) if indent else \
                json.dumps(times, ensure_ascii=False, separators=(",", ":"))
            open(os.path.join(base, "times.js"), "w", encoding="utf-8").write(head + body + tail)
    for r in sorted(report, key=lambda x: -x[4])[:10]:
        print("  %s#%s %-40s matched=%d changed=%d" % (r[0], r[1], r[2][:40], r[3], r[4]))


if __name__ == "__main__":
    main()
