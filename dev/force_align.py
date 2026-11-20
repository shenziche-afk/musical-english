#!/usr/bin/env python3
"""用 wav2vec2 + CTC 强制对齐，把歌词每一行对齐到音频（比 whisper 时间戳稳）。

用法：
  .venv-align/bin/python dev/force_align.py --show hamilton --n 13 [--apply]
输出：dev/aligned/<show>/<n>.json（每行 start/end/score）
"""
import argparse, json, os, re, subprocess, sys
import torch, torchaudio

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BUNDLE = torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H
DEVICE = "cpu"


def load(path):
    s = open(path, encoding="utf-8").read()
    i, j = s.index("{"), s.rindex(";")
    return s[:i], json.loads(s[i:j]), s[j:]


def to_wav(path):
    from audio_decode import to_wav as decode
    wav = decode(path, 16000)
    w, sr = torchaudio.load(wav)
    os.remove(wav)
    return w.mean(0, keepdim=True), sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--show", required=True)
    ap.add_argument("--n", type=int, default=0)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    _, lyrics, _ = load(os.path.join(ROOT, "content", args.show, "lyrics.js"))
    _, tracks, _ = load(os.path.join(ROOT, "content", args.show, "tracks.js"))
    labels = BUNDLE.get_labels()
    model = BUNDLE.get_model().to(DEVICE).eval()
    todo = [t["n"] for t in tracks[args.show]["tracks"]] if args.all else [args.n]
    for n in todo:
        try:
            align_one(model, labels, args.show, n, lyrics)
        except Exception as e:
            print("FAIL", args.show, n, type(e).__name__, e)
    return


def align_one(model, labels, show, n, lyrics):
    _, tracks, _ = load(os.path.join(ROOT, "content", show, "tracks.js"))
    track = next(t for t in tracks[show]["tracks"] if t["n"] == n)
    lines = [l[0] for l in lyrics[show][str(n)]["lines"]]

    tok = {c: i for i, c in enumerate(labels)}
    ids, ranges = [], []
    for text in lines:
        s = re.sub(r"[^A-Z' ]", " ", text.upper())
        words = [w for w in s.split() if w]
        start = len(ids)
        for wi, w in enumerate(words):
            for ch in w:
                if ch in tok:
                    ids.append(tok[ch])
            if wi != len(words) - 1:
                ids.append(tok["|"])
        end = len(ids)
        ranges.append((start, end))

    if not ids:
        print("skip (no letters):", show, n)
        return
    wav, sr = to_wav(os.path.join(ROOT, track["file"]))
    with torch.inference_mode():
        emission, _ = model(wav.to(DEVICE))
    logp = torch.log_softmax(emission, dim=-1)
    targets = torch.tensor([ids], dtype=torch.int32)
    aligned, scores = torchaudio.functional.forced_align(logp, targets, blank=0)
    spans = torchaudio.functional.merge_tokens(aligned[0], scores[0])
    # 每个 target token 对应一个 span（blank 被跳过）
    frame_sec = 0.02  # wav2vec2 base conv stride 320 @16k
    out = []
    si = 0
    token_spans = [s for s in spans if s.token != 0]
    for (a, b) in ranges:
        if b <= a or a >= len(token_spans):
            out.append(None); continue
        first = token_spans[a]; last = token_spans[min(b - 1, len(token_spans) - 1)]
        out.append({
            "start": round(first.start * frame_sec, 2),
            "end": round(last.end * frame_sec + 0.05, 2),
        })
    d = os.path.join(ROOT, "dev", "aligned", show)
    os.makedirs(d, exist_ok=True)
    json.dump({"show": show, "n": n, "lines": out},
              open(os.path.join(d, "%02d.json" % n), "w"), ensure_ascii=False, indent=1)
    print("aligned", show, n, len([x for x in out if x]), "of", len(lines))


if __name__ == "__main__":
    main()
