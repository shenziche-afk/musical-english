"""跨平台解码：macOS 用 afconvert，Windows/Linux 用 ffmpeg。"""
import os, shutil, subprocess, tempfile


def to_wav(path, sr=16000, out=None):
    out = out or os.path.join(tempfile.gettempdir(), "_musical_decode.wav")
    if shutil.which("afconvert"):
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@%d" % sr, "-c", "1", path, out],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    elif shutil.which("ffmpeg"):
        subprocess.run(["ffmpeg", "-y", "-i", path, "-ac", "1", "-ar", str(sr), out],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        raise SystemExit("需要 afconvert（macOS）或 ffmpeg（Windows/Linux）来解码音频")
    return out
