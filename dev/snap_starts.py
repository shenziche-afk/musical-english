#!/usr/bin/env python3
"""把每句起点吸附到「人声起音」：解决点播放时先听到半拍呼吸/伴奏再出声。

做法：16k 单声道 → 20ms 帧 → 300–3000Hz 频带能量（避开鼓点低频）→
从 start-0.05s 起找第一个持续 3 帧的上升沿，若在 +0.8s 内就前移/后移到该点。
"""
import argparse, json, os, shutil, struct, subprocess, time
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def load(path):
    s = open(path, encoding="utf-8").read()
    i, j = s.index("{"), s.rindex(";")
    return s[:i], json.loads(s[i:j]), s[j:]


def band_energy(path, sr=16000, hop=0.02):
    wav = "/tmp/_ss.wav"
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", path, wav],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    d = open(wav, "rb").read(); os.remove(wav)
    pos = 12; pcm = None; rate = None
    while pos + 8 <= len(d):
        cid = d[pos:pos + 4]; size = struct.unpack("<I", d[pos + 4:pos + 8])[0]
        body = d[pos + 8:pos + 8 + size]
        if cid == b"fmt ":
            rate = struct.unpack("<I", body[4:8])[0]
        elif cid == b"data":
            pcm = body
        pos += 8 + size + (size & 1)
    x = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768
    n = len(x)
    win = int(sr * hop)
    frames = n // win
    out = np.zeros(frames, dtype=np.float32)
    freqs = np.fft.rfftfreq(win, 1.0 / sr)
    band = (freqs >= 300) & (freqs <= 3200)
    hann = np.hanning(win).astype(np.float32)
    for i in range(frames):
        seg = x[i * win:(i + 1) * win] * hann
        spec = np.abs(np.fft.rfft(seg))[band]
        out[i] = float(np.sqrt(np.mean(spec ** 2)))
    return out, hop


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("shows", nargs="*", default=["hamilton", "poto"])
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--max-shift", type=float, default=0.7)
    args = ap.parse_args()
    for show in args.shows:
        base = os.path.join(ROOT, "content", show)
        _, tracks, _ = load(os.path.join(base, "tracks.js"))
        head, times, tail = load(os.path.join(base, "times.js"))
        moved = 0
        for t in tracks[show]["tracks"]:
            n = str(t["n"])
            e, hop = band_energy(os.path.join(ROOT, t["file"]))
            floor = max(1e-4, float(np.percentile(e, 25)))
            thr = floor * 2.4
            T = times[show][n]
            for i, seg in enumerate(T):
                if not seg:
                    continue
                s0 = seg[0]
                a = max(0, int((s0 - 0.05) / hop)); b = min(len(e), int((s0 + args.max_shift) / hop))
                idx = None
                for k in range(a, b - 2):
                    if e[k] > thr and e[k + 1] > thr and e[k + 2] > thr:
                        idx = k; break
                if idx is None:
                    continue
                ns = round(idx * hop + 0.02, 2)
                if abs(ns - s0) < 0.04 or abs(ns - s0) > args.max_shift:
                    continue
                if i > 0 and T[i - 1] and ns < T[i - 1][1] - 0.12:
                    continue
                seg[0] = ns
                moved += 1
        print(show, "moved", moved)
        if args.apply:
            bak = os.path.join(base, "times.js.bak-" + time.strftime("%Y%m%d-%H%M%S"))
            shutil.copy2(os.path.join(base, "times.js"), bak)
            indent = 2 if show == "hamilton" else None
            body = json.dumps(times, ensure_ascii=False, indent=indent) if indent else \
                json.dumps(times, ensure_ascii=False, separators=(",", ":"))
            open(os.path.join(base, "times.js"), "w", encoding="utf-8").write(head + body + tail)


if __name__ == "__main__":
    main()
