#!/usr/bin/env python3
"""剧读 · 本地工作台（只有这台机器能用）

线上那份是纯静态的：GitHub Pages 只发布 dist/（index.html + assets + js + content + audio），
既没有 studio/ 目录也没有任何写接口。写接口只存在于这个脚本里，而且：

  * 只绑定 127.0.0.1，局域网里的手机也连不上；
  * 每个 /api 请求都要带令牌（启动时打印，存在 dev/.studio_token，可重开）；
  * 每次保存先备份到 dev/_backup/<时间戳>/，写完立刻跑校验，校验不过自动回滚。

用法：
    python3 dev/studio.py                 # 默认 http://127.0.0.1:8770/studio/
    python3 dev/studio.py --port 9000
    python3 dev/studio.py --no-open       # 不自动开浏览器

能改什么：
    时间轴（每句起止）、行译文/注释、词条释义、短语释义与例句、语法说明、
    背景卡的标题/译文/英文正文/生词表/阅读题解析。
"""
import argparse
import hashlib
import hmac
import json
import os
import secrets
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from datetime import datetime
from http.server import ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEV = os.path.join(ROOT, "dev")
BACKUP = os.path.join(DEV, "_backup")
TOKEN_FILE = os.path.join(DEV, ".studio_token")
sys.path.insert(0, DEV)
sys.path.insert(0, ROOT)

import jsonedit  # noqa: E402
import server as site_server  # noqa: E402

MAX_DIFF = 90000
NODE_CANDIDATES = [
    os.environ.get("STUDIO_NODE", ""),
    "/Users/shenjiahao/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node",
]
GH_CANDIDATES = ["/opt/homebrew/bin/gh", "/usr/local/bin/gh"]


# ------------------------------------------------------------------ 小工具

def sha1(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def run(cmd, timeout=240):
    try:
        p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
        return p.returncode, ((p.stdout or "") + (p.stderr or "")).strip()
    except FileNotFoundError:
        return 127, "找不到命令：" + cmd[0]
    except subprocess.TimeoutExpired:
        return 124, "超时：%s（%ds）" % (" ".join(cmd), timeout)


def find_node():
    for cand in NODE_CANDIDATES:
        if cand and os.path.isfile(cand):
            return cand
    return shutil.which("node")


def find_gh():
    found = shutil.which("gh")
    if found:
        return found
    for cand in GH_CANDIDATES:
        if os.path.isfile(cand):
            return cand
    return None


def shows():
    out = []
    base = os.path.join(ROOT, "content")
    for name in sorted(os.listdir(base)):
        manifest = os.path.join(base, name, "show.json")
        if not os.path.isfile(manifest):
            continue
        with open(manifest, encoding="utf-8") as f:
            data = json.load(f)
        out.append({"id": data["id"], "title": data["title"], "subtitle": data.get("subtitle", "")})
    return out


def show_manifest(show_id):
    path = os.path.join(ROOT, "content", show_id, "show.json")
    if not os.path.isfile(path):
        raise ValueError("没有这个剧目：" + show_id)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def rel_path(show_id, name):
    """把 content/<show>/<name> 规范化，挡住 ../ 之类的路径。"""
    base = os.path.join(ROOT, "content", show_id)
    full = os.path.abspath(os.path.join(base, name))
    if not full.startswith(base + os.sep) or not os.path.isfile(full):
        raise ValueError("文件不存在：" + name)
    return full


def pack_ids(show_id):
    manifest = show_manifest(show_id)
    ids = []
    for rel in manifest.get("files", []):
        name = os.path.basename(rel)
        if name in ("tracks.js", "lyrics.js", "times.js", "show.json"):
            continue
        ids.append(name[:-3])
    return ids


def tracks(show_id):
    path = os.path.join(ROOT, "content", show_id, "tracks.js")
    _text, data, _spans, _end = jsonedit.load(path, jsonedit.MARKER_TRACKS)
    return data.get(show_id, {}).get("tracks", [])


def apply_to_data(data, edits):
    for path, value in edits:
        node = data
        for key in path[:-1]:
            node = node[key]
        node[path[-1]] = value
    return data


def backup_files(pairs, note):
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    folder = os.path.join(BACKUP, stamp)
    os.makedirs(folder, exist_ok=True)
    manifest = {"time": stamp, "note": note, "files": []}
    for abs_path in pairs:
        rel = os.path.relpath(abs_path, ROOT)
        dest = os.path.join(folder, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(abs_path, dest)
        manifest["files"].append({"path": rel, "sha1": sha1(abs_path)})
    with open(os.path.join(folder, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    return os.path.relpath(folder, ROOT)


def write_atomic(path, text):
    tmp = path + ".studio-tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def check_syntax(paths):
    """node --check 每个文件；没有 node 就跳过（JSON 结构已由 jsonedit.verify 保证）。"""
    node = find_node()
    if not node:
        return True, "（没找到 node，跳过语法检查）"
    logs = []
    for path in paths:
        code, out = run([node, "--check", path], timeout=60)
        if code != 0:
            return False, "%s 语法检查失败：\n%s" % (os.path.relpath(path, ROOT), out[-1200:])
        logs.append(os.path.relpath(path, ROOT))
    return True, "语法检查通过：" + "、".join(logs)


def check_packs():
    node = find_node()
    if not node:
        return True, "（没找到 node，跳过 validate_packs）"
    code, out = run([node, os.path.join(DEV, "validate_packs.js")], timeout=180)
    if code != 0:
        return False, out[-2000:]
    warns = [ln for ln in out.splitlines() if ln.strip().startswith("- ")]
    return True, ("校验通过" if not warns else "校验通过（%d 条 warning）" % len(warns))


# ------------------------------------------------------------------ HTTP

class Handler(site_server.Handler):
    studio_token = ""
    lock = threading.Lock()

    # ---- 基础
    def client_ok(self):
        return self.client_address[0] in ("127.0.0.1", "::1")

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def require_token(self):
        got = self.headers.get("X-Studio-Token") or ""
        if hmac.compare_digest(got, self.studio_token):
            return True
        self.send_json({"ok": False, "error": "令牌不对：请用启动时打印的地址打开工作台"}, 401)
        return False

    def log_message(self, fmt, *args):
        if len(args) > 1 and str(args[1])[:1] in ("4", "5"):
            sys.stderr.write("studio %s - %s\n" % (self.address_string(), fmt % args))

    # ---- GET
    def do_GET(self):
        if not self.client_ok():
            self.send_json({"ok": False, "error": "只接受本机请求"}, 403)
            return
        url = urlsplit(self.path)
        if url.path.startswith("/api/"):
            try:
                self.api_get(url.path, parse_qs(url.query))
            except ValueError as exc:
                self.send_json({"ok": False, "error": str(exc)}, 400)
            except Exception as exc:  # 兜底，别让工作台静默失败
                self.send_json({"ok": False, "error": "%s: %s" % (type(exc).__name__, exc)}, 500)
            return
        if url.path in ("/studio", "/studio/"):
            self.path = "/studio/index.html"
        return super().do_GET()

    def api_get(self, path, query):
        if not self.require_token():
            return
        if path == "/api/ping":
            return self.send_json({
                "ok": True,
                "root": ROOT,
                "shows": shows(),
                "node": find_node() or "",
                "gh": find_gh() or "",
            })
        if path == "/api/tracks":
            show_id = (query.get("show") or [""])[0]
            return self.send_json({
                "ok": True,
                "show": show_manifest(show_id),
                "tracks": tracks(show_id),
                "packs": pack_ids(show_id),
            })
        if path == "/api/pack":
            show_id = (query.get("show") or [""])[0]
            pid = (query.get("id") or [""])[0]
            if pid not in pack_ids(show_id):
                raise ValueError("这个剧目里没有这首：" + pid)
            full = rel_path(show_id, pid + ".js")
            text, data, _spans, _end = jsonedit.load(full, jsonedit.marker_for_pack(pid))
            return self.send_json({"ok": True, "id": pid, "sha1": sha1(full), "data": data})
        if path == "/api/times":
            show_id = (query.get("show") or [""])[0]
            full = rel_path(show_id, "times.js")
            _text, data, _spans, _end = jsonedit.load(full, jsonedit.MARKER_TIMES)
            return self.send_json({
                "ok": True,
                "sha1": sha1(full),
                "data": data.get(show_id, {}),
                "all": list(data.keys()),
            })
        if path == "/api/diff":
            code, out = run(["git", "diff", "--stat", "--", "content"])
            code2, body = run(["git", "diff", "--", "content"])
            return self.send_json({
                "ok": True,
                "stat": out,
                "diff": body[:MAX_DIFF],
                "truncated": len(body) > MAX_DIFF,
            })
        if path == "/api/backups":
            items = []
            if os.path.isdir(BACKUP):
                for name in sorted(os.listdir(BACKUP), reverse=True)[:20]:
                    folder = os.path.join(BACKUP, name)
                    man = os.path.join(folder, "manifest.json")
                    note = ""
                    count = 0
                    if os.path.isfile(man):
                        with open(man, encoding="utf-8") as f:
                            meta = json.load(f)
                        note = meta.get("note", "")
                        count = len(meta.get("files", []))
                    items.append({"dir": name, "note": note, "files": count})
            return self.send_json({"ok": True, "items": items})
        self.send_json({"ok": False, "error": "未知接口 " + path}, 404)

    # ---- POST
    def do_POST(self):
        if not self.client_ok():
            self.send_json({"ok": False, "error": "只接受本机请求"}, 403)
            return
        url = urlsplit(self.path)
        if not url.path.startswith("/api/"):
            self.send_json({"ok": False, "error": "404"}, 404)
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            if length > 8 * 1024 * 1024:
                raise ValueError("请求太大")
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception as exc:
            self.send_json({"ok": False, "error": "请求体不是合法 JSON：%s" % exc}, 400)
            return
        if not self.require_token():
            return
        try:
            if url.path == "/api/save":
                self.api_save(body)
            elif url.path == "/api/revert":
                self.api_revert(body)
            elif url.path == "/api/publish":
                self.api_publish(body)
            else:
                self.send_json({"ok": False, "error": "未知接口 " + url.path}, 404)
        except ValueError as exc:
            self.send_json({"ok": False, "error": str(exc)}, 400)
        except jsonedit.EditError as exc:
            self.send_json({"ok": False, "error": "改写失败：%s" % exc}, 400)
        except Exception as exc:
            self.send_json({"ok": False, "error": "%s: %s" % (type(exc).__name__, exc)}, 500)

    # ---- 保存
    def api_save(self, body):
        show_id = body.get("show") or ""
        pid = body.get("packId") or ""
        if pid not in pack_ids(show_id):
            raise ValueError("这个剧目里没有这首：" + pid)
        times_abs = rel_path(show_id, "times.js")
        pack_abs = rel_path(show_id, pid + ".js")

        with self.lock:
            if body.get("packSha") and body["packSha"] != sha1(pack_abs):
                raise ValueError("pack 文件在你打开之后被改过（可能是 git pull），请刷新")
            if body.get("timesSha") and body["timesSha"] != sha1(times_abs):
                raise ValueError("times.js 在你打开之后被改过，请刷新")

            t_text, t_data, t_spans, _ = jsonedit.load(times_abs, jsonedit.MARKER_TIMES)
            p_text, p_data, p_spans, _ = jsonedit.load(pack_abs, jsonedit.marker_for_pack(pid))

            raw_t = [(tuple(item[0]), item[1]) for item in (body.get("timesEdits") or [])]
            raw_p = [(tuple(item[0]), item[1]) for item in (body.get("packEdits") or [])]
            if not raw_t and not raw_p:
                return self.send_json({"ok": True, "changed": 0, "message": "没有改动"})

            # times 的路径是相对剧目的（["1", 0, 1]），文件里多一层 showId
            t_edits = [((show_id,) + path, value) for path, value in raw_t]
            t_expect = apply_to_data(json.loads(json.dumps(t_data)), t_edits)
            p_expect = apply_to_data(json.loads(json.dumps(p_data)), raw_p)

            # 断句的硬约束：只检查这次真正改过的句子，别去拦历史数据
            for path, _value in t_edits:
                _show, track, idx, edge = (list(path) + [None, None, None, None])[:4]
                seg = (t_expect.get(_show) or {}).get(track) or []
                if idx is None or idx >= len(seg):
                    continue
                start, end = seg[idx][0], seg[idx][1]
                if start >= end:
                    raise ValueError(
                        "第 %d 句起点 %.2f ≥ 终点 %.2f，先把这一句调好再保存" % (idx + 1, start, end)
                    )

            new_t = jsonedit.apply(t_text, t_spans, t_edits) if t_edits else t_text
            new_p = jsonedit.apply(p_text, p_spans, raw_p) if raw_p else p_text
            if t_edits:
                jsonedit.verify(jsonedit.MARKER_TIMES, new_t, t_expect)
            if raw_p:
                jsonedit.verify(jsonedit.marker_for_pack(pid), new_p, p_expect)

            rel_backup = backup_files([times_abs, pack_abs], "保存 %s/%s（%d 处）" % (show_id, pid, len(raw_t) + len(raw_p)))
            old_t, old_p = t_text, p_text
            if t_edits:
                write_atomic(times_abs, new_t)
            if raw_p:
                write_atomic(pack_abs, new_p)

            ok, msg = check_syntax([times_abs, pack_abs])
            if ok:
                ok, msg = check_packs()
            if not ok:
                write_atomic(times_abs, old_t)
                write_atomic(pack_abs, old_p)
                return self.send_json({
                    "ok": False,
                    "error": "校验没过，已自动回滚",
                    "log": msg,
                    "backup": rel_backup,
                }, 200)

            _code, stat = run(["git", "diff", "--stat", "--", "content"])
            return self.send_json({
                "ok": True,
                "changed": len(raw_t) + len(raw_p),
                "timesSha": sha1(times_abs),
                "packSha": sha1(pack_abs),
                "backup": rel_backup,
                "message": msg,
                "stat": stat,
            })

    # ---- 回滚
    def api_revert(self, body):
        name = body.get("dir") or ""
        if not name or "/" in name or name.startswith("."):
            raise ValueError("备份目录名不合法")
        folder = os.path.join(BACKUP, name)
        man = os.path.join(folder, "manifest.json")
        if not os.path.isfile(man):
            raise ValueError("找不到这份备份：" + name)
        with self.lock, open(man, encoding="utf-8") as f:
            meta = json.load(f)
        with self.lock:
            for item in meta.get("files", []):
                rel = item["path"]
                src = os.path.join(folder, rel)
                dest = os.path.abspath(os.path.join(ROOT, rel))
                if not dest.startswith(ROOT + os.sep) or not os.path.isfile(src):
                    raise ValueError("备份内容不合法：" + rel)
                shutil.copy2(src, dest)
            ok, msg = check_packs()
            return self.send_json({"ok": ok, "log": msg, "restored": len(meta.get("files", []))})

    # ---- 发布
    def api_publish(self, body):
        if not body.get("confirm"):
            raise ValueError("发布需要确认")
        message = (body.get("message") or "").strip() or "内容: 工作台修订"
        skip_smoke = bool(body.get("skipSmoke"))
        log = []

        with self.lock:
            ok, msg = check_packs()
            log.append("[校验] " + msg)
            if not ok:
                return self.send_json({"ok": False, "error": "validate_packs 没过", "log": "\n".join(log)})

            node = find_node()
            if node and not skip_smoke:
                code, out = run([node, os.path.join(DEV, "smoke.js")], timeout=300)
                tail = out.strip().splitlines()[-1] if out.strip() else ""
                log.append("[冒烟] " + ("通过" if code == 0 else "失败：" + tail))
                if code != 0:
                    return self.send_json({"ok": False, "error": "smoke 没过，已停在本地", "log": "\n".join(log)})

            code, out = run(["git", "add", "-A"])
            if code != 0:
                return self.send_json({"ok": False, "error": "git add 失败", "log": "\n".join(log + [out])})

            code, out = run(["git", "diff", "--cached", "--quiet"])
            if code == 0:
                log.append("[提交] 没有改动，跳过提交")
            else:
                code, out = run(["git", "commit", "-m", message], timeout=120)
                log.append("[提交] " + ("成功" if code == 0 else "失败"))
                if code != 0:
                    return self.send_json({"ok": False, "error": "提交失败", "log": "\n".join(log + [out])})

            pushed = False
            for attempt in range(1, 9):
                code, out = run(["git", "push", "origin", "main"], timeout=200)
                if code == 0:
                    pushed = True
                    log.append("[推送] 第 %d 次成功" % attempt)
                    break
                log.append("[推送] 第 %d 次失败：%s" % (attempt, (out.splitlines() or [""])[-1][:160]))
                time.sleep(3)
            if not pushed:
                return self.send_json({
                    "ok": False,
                    "error": "推送失败：本地已提交，网络好的时候再点一次发布",
                    "log": "\n".join(log),
                })

            gh = find_gh()
            if not gh:
                log.append("[部署] 没找到 gh，手动跑：gh workflow run pages.yml")
                return self.send_json({"ok": True, "log": "\n".join(log), "deploy": False})
            code, out = run([gh, "workflow", "run", "pages.yml"], timeout=120)
            log.append("[部署] " + ("已触发 pages.yml" if code == 0 else "触发失败：" + out[-400:]))
            return self.send_json({
                "ok": code == 0,
                "log": "\n".join(log),
                "deploy": code == 0,
                "url": "https://shenziche-afk.github.io/musical-english/",
            })


# ------------------------------------------------------------------ 启动

def load_token(explicit):
    if explicit:
        return explicit
    if os.path.isfile(TOKEN_FILE):
        with open(TOKEN_FILE, encoding="utf-8") as f:
            saved = f.read().strip()
        if saved:
            return saved
    token = secrets.token_urlsafe(18)
    os.makedirs(DEV, exist_ok=True)
    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        f.write(token)
    try:
        os.chmod(TOKEN_FILE, 0o600)
    except OSError:
        pass
    return token


def port_free(port):
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.2)
        return s.connect_ex(("127.0.0.1", port)) != 0


def main():
    parser = argparse.ArgumentParser(description="剧读 · 本地工作台")
    parser.add_argument("--port", type=int, default=8770)
    parser.add_argument("--token", default="", help="固定令牌（默认存在 dev/.studio_token）")
    parser.add_argument("--no-open", action="store_true", help="不自动打开浏览器")
    args = parser.parse_args()

    Handler.studio_token = load_token(args.token)
    os.makedirs(BACKUP, exist_ok=True)

    port = args.port
    for _ in range(20):
        if port_free(port):
            break
        port += 1
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    httpd.daemon_threads = True

    url = "http://127.0.0.1:%d/studio/?t=%s" % (port, Handler.studio_token)
    print("剧读工作台  " + url)
    print("令牌：%s（存在 dev/.studio_token，下次启动沿用）" % Handler.studio_token)
    print("站点预览  http://127.0.0.1:%d/  （工作台和预览共用一个端口）" % port)
    print("线上不受影响：dist/ 里没有 studio，也没有 /api。")
    sys.stdout.flush()

    if not args.no_open:
        try:
            webbrowser.open(url)
        except Exception:
            pass
        if sys.platform == "darwin":
            try:
                subprocess.run(["pbcopy"], input=url, text=True, timeout=3)
                print("（地址已复制到剪贴板）")
            except Exception:
                pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
