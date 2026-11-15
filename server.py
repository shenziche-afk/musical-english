#!/usr/bin/env python3
"""剧读 · 本地静态服务器

直接用 file:// 打开时，Chrome / Edge 会拦截音频；这个脚本起一个本地 HTTP 服务，
音频、拖动进度条、localStorage 都会正常。

用法：双击 start.bat，或在本目录运行 python server.py
启动后在浏览器打开终端里显示的地址。
"""
import argparse
import http.server
import mimetypes
import os
import re
import socket
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

mimetypes.add_type("audio/mp4", ".m4a")
mimetypes.add_type("audio/mp4", ".m4b")
mimetypes.add_type("audio/mpeg", ".mp3")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        # 只在出错时打一行日志，正常请求保持安静
        if len(args) > 1 and str(args[1])[:1] in ("4", "5"):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_GET(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            index = os.path.join(path, "index.html")
            if os.path.isfile(index):
                path = index
            else:
                return super().do_GET()
        if not os.path.isfile(path):
            self.send_error(404, "File not found")
            return

        size = os.path.getsize(path)
        ctype = self.guess_type(path)
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        start, end = 0, size - 1
        status = 200

        rng = self.headers.get("Range")
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)$", rng.strip())
            if m and (m.group(1) or m.group(2)):
                if m.group(1):
                    start = int(m.group(1))
                    end = int(m.group(2)) if m.group(2) else size - 1
                else:
                    start = max(0, size - int(m.group(2)))
                end = min(end, size - 1)
                if start > end or start >= size:
                    self.send_response(416)
                    self.send_header("Content-Range", "bytes */%d" % size)
                    self.end_headers()
                    return
                status = 206

        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if status == 206:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()

        with open(path, "rb") as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = f.read(min(65536, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)

    def do_HEAD(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            index = os.path.join(path, "index.html")
            if os.path.isfile(index):
                path = index
            else:
                # 没有 index.html 的目录：和 GET 一样交给父类（目录列表）
                return super().do_HEAD()
        if not os.path.isfile(path):
            self.send_error(404)
            return
        size = os.path.getsize(path)
        ctype = self.guess_type(path)
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(size))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()


def port_in_use(port):
    """Windows 上 SO_REUSEADDR 允许重复绑定，所以先探一下端口是否真的有人监听。"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.2)
        return s.connect_ex(("127.0.0.1", port)) == 0


def lan_ip():
    """取本机在局域网里的地址（不会真的发包）。"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return None


def main():
    parser = argparse.ArgumentParser(description="剧读 · 本地静态服务器")
    parser.add_argument("--local", action="store_true", help="只允许本机访问（127.0.0.1）")
    parser.add_argument("--port", type=int, default=0, help="固定端口（默认 8765-8784 自动选择）")
    args = parser.parse_args()

    host = "127.0.0.1" if args.local else "0.0.0.0"
    ports = [args.port] if args.port else range(8765, 8785)

    httpd = None
    port = 0
    for candidate in ports:
        if port_in_use(candidate):
            continue
        try:
            httpd = http.server.ThreadingHTTPServer((host, candidate), Handler)
            port = candidate
            break
        except OSError:
            continue
    if httpd is None:
        print("没有找到可用端口（8765-8784）。")
        return

    print("剧读 running at http://127.0.0.1:%d/" % port, flush=True)
    if not args.local:
        ip = lan_ip()
        if ip:
            print("手机/平板（同一 Wi-Fi）: http://%s:%d/" % (ip, port), flush=True)
        print("如果只想本机用：python3 server.py --local", flush=True)
    print("按 Ctrl+C 停止。", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
