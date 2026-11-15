#!/usr/bin/env python3
"""剧读 · JSON 定点改写

content/*.js 的形状是「一行注释 + JS 外壳 + 标准 JSON」：

    /* 剧读 · 逐行时间轴（秒，起止） *\/
    window.MUSICAL_TIMES = { "hamilton": { ... } };

    window.MUSICAL_SONGS["alexander-hamilton"] = { "id": ..., "sections": [ ... ] };

工作台（dev/studio.py）改的只是里面某几个值。如果整份 json.dumps 重写，
3000 行的 pack 会全部变成「已修改」，diff 没法看。所以这里做两件事：

  1. parse() 走一遍 JSON，记下每个值的字节区间（path → (start, end)）；
  2. apply() 只替换这些区间，其余字节原样保留。

数字保留原文件的写法：原来写 14.3 就还是 14.3，原来写 4 就不会变成 4.0。

自测：python3 dev/jsonedit.py --self-test
"""
import json
import sys

WHITESPACE = " \t\r\n"


class EditError(Exception):
    """路径不存在、类型不一致、或者改完不再是合法 JSON。"""


def skip_ws(text, i):
    n = len(text)
    while i < n and text[i] in WHITESPACE:
        i += 1
    return i


def read_string(text, i):
    """text[i] == '"'，返回 (值, 结束位置)。"""
    j = i + 1
    n = len(text)
    while j < n:
        c = text[j]
        if c == "\\":
            j += 2
            continue
        if c == '"':
            return json.loads(text[i : j + 1]), j + 1
        j += 1
    raise EditError("字符串没有闭合（偏移 %d）" % i)


def parse(text, i, path, spans):
    """递归下降，返回 (值, 结束位置)，同时把每个标量/容器的区间写进 spans。"""
    i = skip_ws(text, i)
    if i >= len(text):
        raise EditError("JSON 意外结束")
    c = text[i]

    if c == "{":
        start = i
        i += 1
        node = {}
        while True:
            i = skip_ws(text, i)
            if text[i] == "}":
                i += 1
                break
            key, i = read_string(text, i)
            i = skip_ws(text, i)
            if text[i] != ":":
                raise EditError("对象缺少冒号（偏移 %d）" % i)
            i += 1
            node[key], i = parse(text, i, path + (key,), spans)
            i = skip_ws(text, i)
            ch = text[i]
            i += 1
            if ch == ",":
                continue
            if ch == "}":
                break
            raise EditError("对象里出现意外字符 %r（偏移 %d）" % (ch, i - 1))
        spans[path] = (start, i)
        return node, i

    if c == "[":
        start = i
        i += 1
        items = []
        while True:
            i = skip_ws(text, i)
            if text[i] == "]":
                i += 1
                break
            value, i = parse(text, i, path + (len(items),), spans)
            items.append(value)
            i = skip_ws(text, i)
            ch = text[i]
            i += 1
            if ch == ",":
                continue
            if ch == "]":
                break
            raise EditError("数组里出现意外字符 %r（偏移 %d）" % (ch, i - 1))
        spans[path] = (start, i)
        return items, i

    if c == '"':
        value, j = read_string(text, i)
        spans[path] = (i, j)
        return value, j

    j = i
    while j < len(text) and text[j] not in ",]} \t\r\n":
        j += 1
    raw = text[i:j]
    try:
        value = json.loads(raw)
    except ValueError:
        raise EditError("无法解析的字面量 %r（偏移 %d）" % (raw, i))
    spans[path] = (i, j)
    return value, j


def find_object_start(text, marker):
    """找到 marker 之后那次赋值右侧的 '{' 的位置。"""
    at = text.find(marker)
    if at < 0:
        raise EditError("找不到标记 %r" % marker)
    eq = text.find("=", at + len(marker))
    if eq < 0:
        raise EditError("标记 %r 后面没有赋值" % marker)
    brace = text.find("{", eq)
    if brace < 0:
        raise EditError("标记 %r 的赋值不是对象" % marker)
    return brace


def load(path, marker):
    """读一个 content/*.js，返回 (原文, 数据, 区间表, 对象结束位置)。"""
    with open(path, encoding="utf-8") as f:
        text = f.read()
    start = find_object_start(text, marker)
    spans = {}
    data, end = parse(text, start, (), spans)
    return text, data, spans, end


def marker_for_pack(pack_id):
    return 'window.MUSICAL_SONGS["%s"]' % pack_id


MARKER_TIMES = "window.MUSICAL_TIMES"
MARKER_TRACKS = "window.MUSICAL_TRACKS"


def _looks_numeric(raw):
    return raw[:1] in "-0123456789"


def render_value(raw, value):
    """把新值渲染成 JSON 片段，尽量沿用原文件的写法。"""
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "null"
    if isinstance(value, (int, float)):
        if isinstance(value, str):
            raise EditError("这里需要数字")
        num = float(value)
        if not _looks_numeric(raw):
            raise EditError("原值是文本，不能写数字")
        # 整数值写 8，不写 8.0；其余保留三位小数（时间轴就是秒，够用）
        if abs(num) < 1e9 and num == int(num):
            return str(int(num))
        return json.dumps(round(num, 3))
    if isinstance(value, str):
        if _looks_numeric(raw) or raw in ("true", "false", "null"):
            raise EditError("原值是数字/布尔，不能写文本")
        return json.dumps(value, ensure_ascii=False)
    raise EditError("只支持改写字符串、数字、布尔和 null")


def apply(text, spans, edits):
    """edits: [(path, value)]，路径是列表/元组。返回新文本。"""
    todo = []
    for path, value in edits:
        key = tuple(path)
        if key not in spans:
            raise EditError("字段不存在：%s" % "/".join(str(p) for p in key))
        start, end = spans[key]
        raw = text[start:end]
        todo.append((start, end, render_value(raw, value)))

    todo.sort(key=lambda item: item[0], reverse=True)
    out = text
    last_start = len(text) + 1
    for start, end, piece in todo:
        if end > last_start:
            raise EditError("两次改动落在同一处，请刷新后重试")
        out = out[:start] + piece + out[end:]
        last_start = start
    return out


def verify(marker, text, expected):
    """改完重新解析，确认整体结构和期望一致（防止写坏文件）。"""
    start = find_object_start(text, marker)
    data, _ = parse(text, start, (), {})
    if data != expected:
        raise EditError("改写后重新解析的结果与预期不一致")
    return data


def load_json_file(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------- self test

def _self_test():
    import os
    import shutil
    import tempfile

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    times_path = os.path.join(root, "content", "hamilton", "times.js")
    pack_path = os.path.join(root, "content", "hamilton", "alexander-hamilton.js")
    ok = 0

    # 时间轴：改第 1 句的结束时间，其他字节必须原样
    text, data, spans, end = load(times_path, MARKER_TIMES)
    before = text
    old = data["hamilton"]["1"][0][1]
    edits = [(("hamilton", "1", 0, 1), 8.5)]
    out = apply(text, spans, edits)
    expect = json.loads(json.dumps(data))
    expect["hamilton"]["1"][0][1] = 8.5
    verify(MARKER_TIMES, out, expect)
    changed = [ln for ln in out.splitlines() if ln not in before.splitlines()]
    assert old != 8.5 and "8.5" in out, "没写进去"
    assert len(changed) == 1, "改动行数应为 1，实际 %d" % len(changed)
    assert len(out) - len(before) == len("8.5") - len(str(old)), "字数变化不对"
    ok += 1

    # 原来写成小数（7.93 → 8）时不能变成 8.0，也不能变成字符串
    text2, data2, spans2, _ = load(times_path, MARKER_TIMES)
    out2 = apply(text2, spans2, [(("hamilton", "1", 0, 1), 8)])
    spans2b = {}
    d2, _ = parse(out2, find_object_start(out2, MARKER_TIMES), (), spans2b)
    assert d2["hamilton"]["1"][0][1] == 8, d2["hamilton"]["1"][0]
    s8, e8 = spans2b[("hamilton", "1", 0, 1)]
    assert out2[s8:e8] == "8", "整数值应写成 8，实际 %r" % out2[s8:e8]
    ok += 1

    # pack：改一行译文，diff 只有那一行
    ptext, pdata, pspans, _ = load(pack_path, marker_for_pack("alexander-hamilton"))
    line_path = None
    for si, sec in enumerate(pdata["sections"]):
        for li, line in enumerate(sec["lines"]):
            if line.get("zh"):
                line_path = (si, li)
                break
        if line_path:
            break
    assert line_path, "找不到带译文的行"
    new_zh = "（自测）改过的译文"
    si, li = line_path
    out3 = apply(ptext, pspans, [((("sections", si, "lines", li, "zh"), new_zh))])
    pexpect = json.loads(json.dumps(pdata))
    pexpect["sections"][si]["lines"][li]["zh"] = new_zh
    verify(marker_for_pack("alexander-hamilton"), out3, pexpect)
    assert new_zh in out3
    diff_lines = sum(1 for a, b in zip(ptext.splitlines(), out3.splitlines()) if a != b)
    assert diff_lines <= 1, "pack 改动行数应为 1，实际 %d" % diff_lines
    ok += 1

    # 类型不匹配要报错
    try:
        apply(ptext, pspans, [((("sections", si, "lines", li, "zh"), 123))])
    except EditError:
        ok += 1
    else:
        raise AssertionError("数字写进文本字段居然通过了")

    # 路径不存在要报错
    try:
        apply(ptext, pspans, [((("sections", 999), "x"))])
    except EditError:
        ok += 1
    else:
        raise AssertionError("不存在的路径居然通过了")

    # 写盘 → 重新读 → 再改回去，文件必须逐字节还原（用临时副本）
    tmp = tempfile.mkdtemp()
    try:
        copy = os.path.join(tmp, "times.js")
        shutil.copy2(times_path, copy)
        t3, d3, s3, _ = load(copy, MARKER_TIMES)
        patched = apply(t3, s3, [(("hamilton", "1", 0, 1), 9.99)])
        with open(copy, "w", encoding="utf-8") as f:
            f.write(patched)
        t4, d4, s4, _ = load(copy, MARKER_TIMES)
        reverted = apply(t4, s4, [(("hamilton", "1", 0, 1), d3["hamilton"]["1"][0][1])])
        assert reverted == t3, "改回原值后应当逐字节一致"
        ok += 1
    finally:
        shutil.rmtree(tmp)

    print("jsonedit 自测通过：%d 项" % ok)


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        _self_test()
    else:
        print(__doc__)
