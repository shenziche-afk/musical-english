#!/usr/bin/env python3
"""用音频能量给时间轴做体检（不改数据，只出报告）。

对每首歌：解码成 16k 单声道 → 20ms 帧 RMS → 找 >=120ms 的静音段，
然后标记四类可疑行：
  A 起点落在静音里（唱的时候没声音）
  B 起点比前一个静音结束晚 >0.6s（起晚了）
  C 句尾拖进间奏（下句开始前有明显静音，本句 end 仍顶到 next start）
  D 时长 <0.4s

用法：
  python3 dev/check_times.py [showId ...]     # 默认两个剧目
输出：dev/times_report.json + 终端摘要
"""
import json, os, subprocess, sys, wave
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "dev", "times_report.json")
HOP = 0.02


def silence_ends(path):
    wav = "/tmp/_ct.wav"
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", path, wav],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    w = wave.open(wav)
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    w.close()
    os.remove(wav)
    n = int(len(x) / (sr * HOP))
    rms = np.array([np.sqrt(np.mean(x[int(i * sr * HOP):int((i + 1) * sr * HOP)] ** 2)) for i in range(n)])
    thr = max(0.004, float(np.percentile(rms, 20)) * 1.3)
    sil = rms < thr
    runs = []
    i = 0
    while i < len(sil):
        if sil[i]:
            j = i
            while j < len(sil) and sil[j]:
                j += 1
            if (j - i) * HOP >= 0.12:
                runs.append((i * HOP, j * HOP))
            i = j
        else:
            i += 1
    return runs


def load_show(show_id):
    base = os.path.join(ROOT, "content", show_id)
    def load(name):
        s = open(os.path.join(base, name), encoding="utf-8").read()
        return json.loads(s[s.index("{"):s.rindex(";")])
    return load("tracks.js")[show_id]["tracks"], load("lyrics.js")[show_id], load("times.js")[show_id]


def main():
    shows = sys.argv[1:] or ["hamilton", "poto"]
    report = []
    for sid in shows:
        tracks, lyrics, times = load_show(sid)
        for t in tracks:
            n = str(t["n"])
            if n not in lyrics or n not in times:
                continue
            path = os.path.join(ROOT, t["file"])
            if not os.path.exists(path):
                print("skip missing", t["file"])
                continue
            runs = silence_ends(path)
            T = times[n]
            flags = []
            for i, seg in enumerate(T):
                if not seg:
                    continue
                start, end = seg
                inside = any(a + 0.05 < start < b - 0.05 for a, b in runs)
                prev = [b for a, b in runs if b <= start + 0.02]
                late = (start - prev[-1]) if prev else 0
                nxt = T[i + 1][0] if i + 1 < len(T) and T[i + 1] else None
                gap = None
                if nxt is not None:
                    for a, b in runs:
                        if end - 0.01 <= a < nxt and b <= nxt + 0.01:
                            gap = (a, b)
                            break
                if inside:
                    flags.append({"line": i + 1, "type": "A_start_in_silence", "start": start})
                if late and late > 0.6 and not inside:
                    flags.append({"line": i + 1, "type": "B_late_start", "late": round(late, 2)})
                if gap and gap[0] < end - 0.15:
                    flags.append({"line": i + 1, "type": "C_end_in_gap", "gap": [round(gap[0], 2), round(gap[1], 2)], "end": end})
                if end - start < 0.4:
                    flags.append({"line": i + 1, "type": "D_short", "dur": round(end - start, 2)})
            report.append({"show": sid, "n": t["n"], "title": t["title"], "lines": len(T), "flags": flags})
            print("%s %02d %-46s flags=%d" % (sid, t["n"], t["title"][:46], len(flags)))
    json.dump(report, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    total = sum(len(r["flags"]) for r in report)
    kinds = {}
    for r in report:
        for f in r["flags"]:
            kinds[f["type"]] = kinds.get(f["type"], 0) + 1
    print("\ntracks", len(report), "flags", total, kinds)
    print("report:", OUT)


if __name__ == "__main__":
    main()
