/* 剧读 · 本地工作台前端
 * 只由 dev/studio.py 提供 /api；线上静态站没有这些接口，本文件也不会进 dist。
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  };
  var jsonAttr = function (v) { return esc(JSON.stringify(v)); };
  var clone = function (v) { return JSON.parse(JSON.stringify(v)); };
  var pad2 = function (n) { return String(n).padStart(2, "0"); };
  var round2 = function (n) { return Math.round(n * 100) / 100; };

  function getByPath(root, path) {
    var node = root;
    for (var i = 0; i < path.length; i++) {
      if (node == null) return undefined;
      node = node[path[i]];
    }
    return node;
  }
  function setByPath(root, path, value) {
    var node = root;
    for (var i = 0; i < path.length - 1; i++) node = node[path[i]];
    node[path[path.length - 1]] = value;
  }

  var S = {
    hintTimes: "",
    token: "",
    root: "",
    shows: [],
    showId: "",
    showMeta: null,
    tracks: [],
    packs: [],
    packId: "",
    pack: null,
    packSha: "",
    times: null,
    timesSha: "",
    original: { pack: null, times: null },
    dirty: new Map(),
    tab: "times",
    lines: [],
    trackKey: "",
    audio: null,
    rate: 1,
    loop: false,
    line: 0,
    segTimer: null,
    saving: false
  };

  /* ---------------- 通信 ---------------- */

  function api(path, opts) {
    opts = opts || {};
    var headers = { "X-Studio-Token": S.token };
    if (opts.body) headers["Content-Type"] = "application/json";
    return fetch(path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body
    }).then(function (res) {
      return res.json().then(
        function (data) { return data; },
        function () { throw new Error("服务返回的不是 JSON（HTTP " + res.status + "）"); }
      );
    });
  }

  /* ---------------- 启动 ---------------- */

  function bootError(msg, detail) {
    var box = $("boot");
    box.className = "boot bad";
    box.innerHTML =
      "<p><b>连不上工作台</b></p><p>" + esc(msg || "") + "</p>" +
      (detail ? "<p class='muted'>" + esc(detail) + "</p>" : "") +
      "<p class='muted'>在项目目录跑 <code>python3 dev/studio.py</code>，用它打印的带 ?t= 的地址打开。</p>";
  }

  function start() {
    var q = new URLSearchParams(location.search);
    var fromUrl = q.get("t");
    if (fromUrl) {
      S.token = fromUrl;
      try { localStorage.setItem("studio-token", fromUrl); } catch (e) {}
      history.replaceState(null, "", location.pathname);
    } else {
      try { S.token = localStorage.getItem("studio-token") || ""; } catch (e) {}
    }

    api("/api/ping")
      .then(function (r) {
        if (!r.ok) {
          bootError(r.error || "令牌不对");
          return;
        }
        S.root = r.root;
        S.shows = r.shows || [];
        $("boot").hidden = true;
        $("bar").hidden = false;
        $("main").hidden = false;
        fillShowSel();
        var saved = null;
        try { saved = localStorage.getItem("studio-show"); } catch (e) {}
        var pick = S.shows.filter(function (s) { return s.id === saved; })[0] || S.shows[0];
        if (!pick) {
          bootError("content/ 里没有剧目");
          return;
        }
        loadShow(pick.id);
      })
      .catch(function (err) { bootError(err.message); });
  }

  function fillShowSel() {
    $("showSel").innerHTML = S.shows
      .map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.title) + "</option>"; })
      .join("");
    $("showSel").value = S.showId || (S.shows[0] && S.shows[0].id) || "";
  }

  function loadShow(id) {
    S.showId = id;
    try { localStorage.setItem("studio-show", id); } catch (e) {}
    return api("/api/tracks?show=" + encodeURIComponent(id))
      .then(function (r) {
        S.showMeta = r.show;
        S.tracks = r.tracks || [];
        S.packs = r.packs || [];
        fillPackSel();
        if (!S.packs.length) {
          $("pane-times").innerHTML = '<p class="hint">这个剧目还没有精读 pack。</p>';
          return;
        }
        var savedPack = null;
        try { savedPack = localStorage.getItem("studio-pack:" + id); } catch (e) {}
        var pick = S.packs.indexOf(savedPack) >= 0 ? savedPack : S.packs[0];
        return loadPack(pick);
      })
      .catch(function (e) { toast(e.message, "bad"); });
  }

  function packTitle(pid) {
    var track = S.tracks.filter(function (t) { return t.content === pid; })[0];
    return track ? pad2(track.n) + " · " + track.title : pid;
  }

  function fillPackSel() {
    $("packSel").innerHTML = S.packs
      .map(function (pid) { return '<option value="' + esc(pid) + '">' + esc(packTitle(pid)) + "</option>"; })
      .join("");
    $("packSel").value = S.packId || S.packs[0] || "";
  }

  function loadPack(pid) {
    $("status").textContent = "载入中…";
    return Promise.all([
      api("/api/pack?show=" + encodeURIComponent(S.showId) + "&id=" + encodeURIComponent(pid)),
      api("/api/times?show=" + encodeURIComponent(S.showId))
    ])
      .then(function (res) {
        var pack = res[0], times = res[1];
        if (!pack.ok) throw new Error(pack.error || "读不到 pack");
        if (!times.ok) throw new Error(times.error || "读不到 times");
        S.packId = pid;
        if ($("packSel").options.length) $("packSel").value = pid;
        S.pack = pack.data;
        S.packSha = pack.sha1;
        S.times = times.data;
        S.timesSha = times.sha1;
        S.original.pack = clone(pack.data);
        S.original.times = clone(times.data);
        S.dirty.clear();
        S.trackKey = String(S.pack.n);
        S.line = 0;
        try { localStorage.setItem("studio-pack:" + S.showId, pid); } catch (e) {}
        indexLines();
        setupAudio();
        renderAll();
        setStatus();
      })
      .catch(function (e) { toast(e.message, "bad"); });
  }

  function indexLines() {
    S.lines = [];
    (S.pack.sections || []).forEach(function (sec, si) {
      (sec.lines || []).forEach(function (line, li) {
        S.lines.push({ si: si, li: li, line: line, idx: S.lines.length });
      });
    });
  }

  function lineTimes(i) {
    var arr = (S.times && S.times[S.trackKey]) || [];
    return arr[i] || null;
  }

  /* ---------------- 脏数据 ---------------- */

  function markDirty(kind, path, value) {
    var k = kind + ":" + path.join("\u0001");
    var orig = getByPath(S.original[kind], path);
    if (value === orig) S.dirty.delete(k);
    else S.dirty.set(k, { kind: kind, path: path, value: value });
    setStatus();
  }

  function setStatus() {
    var n = S.dirty.size;
    var st = $("status");
    st.textContent = n ? "未保存 " + n + " 处" : "已同步";
    st.classList.toggle("dirty", n > 0);
    var bar = $("dirtybar");
    bar.hidden = n === 0;
    $("dirtyText").textContent = "未保存 " + n + " 处";
  }

  function discard() {
    if (S.dirty.size && !confirm("放弃未保存的 " + S.dirty.size + " 处改动？")) return;
    return loadPack(S.packId);
  }

  /* ---------------- 渲染 ---------------- */

  var HINTS = {
    text: "<b>这里是完整原文</b>：译文、注释、节奏提示、词条释义、短语例句、语法讲解都能直接改；改完 ⌘S 保存。",
    bg: "背景卡：中英标题、英文正文、生词中文、阅读题题干 / 选项 / 正确答案 / 解析，都能直接改。"
  };

  function setHint(tab) {
    var el = $("hint");
    el.hidden = false;
    el.innerHTML = tab === "times" ? S.hintTimes || "" : HINTS[tab] || "";
  }

  function renderAll() {
    renderTimes();
    renderText();
    renderBg();
    renderPlayerHead();
    setStatus();
  }

  function renderTimes() {
    var arr = (S.times && S.times[S.trackKey]) || [];
    var hint =
      '<b>' + esc(S.pack.title) + "</b> · 共 " + S.lines.length + " 句，时间轴 " + arr.length + " 段。";
    if (arr.length !== S.lines.length) {
      hint += ' <span class="bad">时间轴段数对不上（' + arr.length + " vs " + S.lines.length + "），先去 validate_packs 查。</span>";
    }
    S.hintTimes =
      hint +
      " <b>译文点一下就能改</b>；时间是 ±0.05/±0.1 微调，或「起点=现在 / 终点=现在」。注释和节奏提示在每行下面折叠着。";
    if (S.tab === "times") setHint("times");

    var rows = S.lines.map(function (item, i) {
      var t = arr[i] || [0, 0];
      var prev = arr[i - 1];
      var next = arr[i + 1];
      var issues = [];
      if (!(t[0] < t[1])) issues.push(["bad", "起点 ≥ 终点"]);
      if (prev && t[0] < prev[1] - 0.15) issues.push(["bad", "和前一句重叠 " + (prev[1] - t[0]).toFixed(2) + "s"]);
      else if (prev && t[0] > prev[1] + 0.6) issues.push(["warn", "与前一句空 " + (t[0] - prev[1]).toFixed(2) + "s"]);
      if (next && t[1] > next[0] + 0.001) issues.push(["bad", "压到下一句 " + (t[1] - next[0]).toFixed(2) + "s"]);
      var cls = "trow" + (i === S.line ? " is-now" : "") + (issues.some(function (x) { return x[0] === "bad"; }) ? " is-bad" : "");
      var base = [S.trackKey, i];
      var lineBase = ["sections", item.si, "lines", item.li];
      var ctl =
        '<div class="tctl">' +
        '<div class="timebox"><label>起点</label><input type="number" step="0.01" data-kind="times" data-type="number" data-path=\'' +
        jsonAttr(base.concat([0])) + "' value='" + Number(t[0]).toFixed(2) + "'></div>" +
        '<div class="nudges">' +
        [-0.1, -0.05, 0.05, 0.1].map(function (d) {
          return '<button class="nudge" data-nudge="' + d + '" data-i="' + i + '" data-edge="0">' + (d > 0 ? "+" : "") + d + "</button>";
        }).join("") +
        "</div>" +
        '<div class="timebox"><label>终点</label><input type="number" step="0.01" data-kind="times" data-type="number" data-path=\'' +
        jsonAttr(base.concat([1])) + "' value='" + Number(t[1]).toFixed(2) + "'></div>" +
        '<div class="nudges">' +
        [-0.1, -0.05, 0.05, 0.1].map(function (d) {
          return '<button class="nudge" data-nudge="' + d + '" data-i="' + i + '" data-edge="1">' + (d > 0 ? "+" : "") + d + "</button>";
        }).join("") +
        "</div>" +
        '<button class="nowset" data-now="0" data-i="' + i + '" title="把这一句的起点设成音频当前播放位置">起点=现在</button>' +
        '<button class="nowset" data-now="1" data-i="' + i + '" title="把这一句的终点设成音频当前播放位置">终点=现在</button>' +
        '<span class="tdur">' + (t[1] - t[0]).toFixed(2) + "s</span>" +
        issues.map(function (x) { return '<span class="' + x[0] + '">' + esc(x[1]) + "</span>"; }).join("") +
        "</div>";

      var more =
        '<details class="sub tmore"><summary>注释 / 节奏提示</summary>' +
        '<div class="field"><label>注释</label><textarea rows="2" data-kind="pack" data-path=\'' +
        jsonAttr(lineBase.concat(["note"])) + "'>" + esc(item.line.note || "") + "</textarea></div>" +
        (item.line.sound != null
          ? '<div class="field"><label>节奏 / 发音提示</label><textarea rows="2" data-kind="pack" data-path=\'' +
            jsonAttr(lineBase.concat(["sound"])) + "'>" + esc(item.line.sound) + "</textarea></div>"
          : "") +
        "</details>";

      return (
        '<div class="' + cls + '" data-row="' + i + '">' +
        '<div class="tno">' + pad2(i + 1) + "</div>" +
        '<div class="tmain">' +
        '<div class="thead"><div class="ten">' +
        (item.line.speaker ? '<span class="sp">' + esc(item.line.speaker) + "</span>" : "") + esc(item.line.text) +
        '</div><button class="tplay" data-play="' + i + '" title="试听这一句">▶</button></div>' +
        '<textarea class="tzh-edit" rows="1" data-kind="pack" data-path=\'' +
        jsonAttr(lineBase.concat(["zh"])) + "' placeholder='（没有译文，点这里补）'>" +
        esc(item.line.zh || "") + "</textarea>" +
        ctl +
        more +
        "</div></div>"
      );
    });
    $("pane-times").innerHTML = rows.join("");
    autoGrowAll($("pane-times"));
  }

  /* 译文框像正文，但点进去就是输入框：按内容撑高，别出现内部滚动条 */
  function autoGrow(el) {
    if (!el || el.tagName !== "TEXTAREA" || !el.classList.contains("tzh-edit")) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function autoGrowAll(root) {
    if (!root) return;
    root.querySelectorAll("textarea.tzh-edit").forEach(autoGrow);
  }

  function renderText() {
    var out = [];
    var pack = S.pack;

    out.push(
      '<details class="sub" style="margin-bottom:14px;border:1px solid var(--line);border-radius:12px;padding:12px 16px">' +
      "<summary>本曲信息（标题 / 一句话 / 引言）</summary>" +
      field("中文标题之外的英文题名", "text", ["title"], pack.title) +
      field("一句话概括", "text", ["tagline"], pack.tagline) +
      field("开场引言", "area", ["intro"], pack.intro) +
      "</details>"
    );

    (pack.sections || []).forEach(function (sec, si) {
      out.push(
        '<div class="lcard" style="border-color:rgba(216,178,90,.28)">' +
        '<div class="lcard-head"><span class="lcard-id">' + esc(sec.id) + '</span>' +
        '<span class="lcard-en">' + esc(sec.title) + " <span class='sp'>" + esc(sec.zh || "") + "</span></span></div>" +
        field("分区英文标题", "text", ["sections", si, "title"], sec.title) +
        field("分区中文", "text", ["sections", si, "zh"], sec.zh) +
        field("分区说明", "area", ["sections", si, "note"], sec.note) +
        "</div>"
      );

      (sec.lines || []).forEach(function (line, li) {
        var base = ["sections", si, "lines", li];
        var blocks = [];
        blocks.push(field("中文译文", "area", base.concat(["zh"]), line.zh, 2));
        blocks.push(field("注释", "area", base.concat(["note"]), line.note, 2));
        if (line.sound != null) blocks.push(field("节奏 / 发音提示", "area", base.concat(["sound"]), line.sound, 2));

        if ((line.words || []).length) {
          blocks.push(
            '<details class="sub"><summary>词 ' + line.words.length + "</summary>" +
            line.words.map(function (w, wi) {
              var b = base.concat(["words", wi]);
              return '<div class="wrow"><input data-kind="pack" data-path=\'' + jsonAttr(b.concat(["w"])) + "' value='" + esc(w.w) + "' readonly title='词形要和正文一致，只读'>" +
                "<input data-kind=\"pack\" data-path='" + jsonAttr(b.concat(["ipa"])) + "' value='" + esc(w.ipa || "") + "' placeholder='音标'>" +
                "<input data-kind=\"pack\" data-path='" + jsonAttr(b.concat(["pos"])) + "' value='" + esc(w.pos || "") + "' placeholder='词性'>" +
                "<textarea rows='1' data-kind=\"pack\" data-path='" + jsonAttr(b.concat(["zh"])) + "' placeholder='中文释义'>" + esc(w.zh || "") + "</textarea>" +
                "</div>" +
                '<div class="field" style="margin:0 0 8px"><textarea rows="1" data-kind="pack" data-path=\'' + jsonAttr(b.concat(["d"])) + "' placeholder='用法说明'>" + esc(w.d || "") + "</textarea></div>";
            }).join("") +
            "</details>"
          );
        }

        if ((line.phrases || []).length) {
          blocks.push(
            '<details class="sub"><summary>短语 ' + line.phrases.length + "</summary>" +
            line.phrases.map(function (p, pi) {
              var b = base.concat(["phrases", pi]);
              return '<div class="prow"><input data-kind="pack" data-path=\'' + jsonAttr(b.concat(["p"])) + "' value='" + esc(p.p) + "' readonly title='短语形只读'>" +
                "<input data-kind=\"pack\" data-path='" + jsonAttr(b.concat(["type"])) + "' value='" + esc(p.type || "") + "' placeholder='类型'>" +
                "<textarea rows='1' data-kind=\"pack\" data-path='" + jsonAttr(b.concat(["zh"])) + "' placeholder='中文'>" + esc(p.zh || "") + "</textarea>" +
                "<textarea rows='1' data-kind=\"pack\" data-path='" + jsonAttr(b.concat(["d"])) + "' placeholder='说明'>" + esc(p.d || "") + "</textarea>" +
                "</div>" +
                '<div class="grid2" style="margin-bottom:8px">' +
                "<textarea rows='1' data-kind=\"pack\" data-path='" + jsonAttr(b.concat(["ex"])) + "' placeholder='英文例句'>" + esc(p.ex || "") + "</textarea>" +
                "<textarea rows='1' data-kind=\"pack\" data-path='" + jsonAttr(b.concat(["exZh"])) + "' placeholder='例句译文'>" + esc(p.exZh || "") + "</textarea>" +
                "</div>";
            }).join("") +
            "</details>"
          );
        }

        if ((line.grammar || []).length) {
          blocks.push(
            '<details class="sub"><summary>语法 ' + line.grammar.length + "</summary>" +
            line.grammar.map(function (g, gi) {
              var b = base.concat(["grammar", gi]);
              return '<div class="grow"><input data-kind="pack" data-path=\'' + jsonAttr(b.concat(["t"])) + "' value='" + esc(g.t) + "'>" +
                "<textarea rows='2' data-kind=\"pack\" data-path='" + jsonAttr(b.concat(["d"])) + "'>" + esc(g.d || "") + "</textarea></div>";
            }).join("") +
            "</details>"
          );
        }

        out.push(
          '<article class="lcard" data-line="' + (S.lines.length ? "" : "") + '">' +
          '<div class="lcard-head"><span class="lcard-id">' + pad2(globalIndex(si, li) + 1) + "</span>" +
          '<span class="lcard-en">' + (line.speaker ? '<span class="sp">' + esc(line.speaker) + "</span>" : "") + esc(line.text) + "</span>" +
          '<button class="tplay" data-play="' + globalIndex(si, li) + '">▶</button></div>' +
          blocks.join("") +
          "</article>"
        );
      });
    });
    $("pane-text").innerHTML = out.join("");
  }

  function globalIndex(si, li) {
    for (var i = 0; i < S.lines.length; i++) {
      if (S.lines[i].si === si && S.lines[i].li === li) return i;
    }
    return 0;
  }

  function field(label, kind, path, value, rows) {
    var id = 'data-kind="pack" data-path=\'' + jsonAttr(path) + "'";
    var input =
      kind === "area"
        ? "<textarea rows='" + (rows || 3) + "' " + id + ">" + esc(value || "") + "</textarea>"
        : "<input " + id + " value='" + esc(value || "") + "'>";
    return '<div class="field"><label>' + esc(label) + "</label>" + input + "</div>";
  }

  function renderBg() {
    var cards = S.pack.background || [];
    if (!cards.length) {
      $("pane-bg").innerHTML = '<p class="hint">这首没有背景卡。</p>';
      return;
    }
    $("pane-bg").innerHTML = cards
      .map(function (bg, i) {
        var b = ["background", i];
        var quiz = (bg.quiz || [])
          .map(function (q, qi) {
            var qb = b.concat(["quiz", qi]);
            var opts = (q.options || [])
              .map(function (opt, oi) {
                return (
                  '<div class="qopt"><span class="idx">' + "ABCD"[oi] + "</span>" +
                  "<textarea rows='1' data-kind=\"pack\" data-path='" + jsonAttr(qb.concat(["options", oi])) + "'>" + esc(opt) + "</textarea></div>"
                );
              })
              .join("");
            return (
              '<div class="qblock"><div class="field"><label>题干</label>' +
              "<textarea rows='2' data-kind=\"pack\" data-path='" + jsonAttr(qb.concat(["q"])) + "'>" + esc(q.q) + "</textarea></div>" +
              opts +
              '<div class="grid2"><div class="field"><label>正确答案</label>' +
              "<select data-kind=\"pack\" data-type=\"number\" data-path='" + jsonAttr(qb.concat(["answer"])) + "'>" +
              [0, 1, 2, 3].map(function (k) { return '<option value="' + k + '"' + (q.answer === k ? " selected" : "") + ">" + "ABCD"[k] + "</option>"; }).join("") +
              "</select></div></div>" +
              '<div class="field"><label>解析（中文）</label>' +
              "<textarea rows='2' data-kind=\"pack\" data-path='" + jsonAttr(qb.concat(["explain"])) + "'>" + esc(q.explain || "") + "</textarea></div></div>"
            );
          })
          .join("");

        var gl = (bg.glossary || [])
          .map(function (g, gi) {
            var gb = b.concat(["glossary", gi]);
            return (
              '<div class="wrow"><input data-kind="pack" data-path=\'' + jsonAttr(gb.concat(["w"])) + "' value='" + esc(g.w) + "' readonly>" +
              "<textarea rows='1' data-kind=\"pack\" data-path='" + jsonAttr(gb.concat(["zh"])) + "'>" + esc(g.zh) + "</textarea>" +
              "</div>"
            );
          })
          .join("");

        return (
          '<article class="bgcard"><span class="tag">' + esc(bg.id) + " · " + esc(bg.kind || "story") + "</span>" +
          "<h3>" + esc(bg.title || "") + "</h3>" +
          field("中文标题", "text", b.concat(["title"]), bg.title) +
          field("英文标题", "text", b.concat(["titleEn"]), bg.titleEn) +
          field("中文正文 / 摘要", "area", b.concat(["body"]), bg.body) +
          field("英文记叙文", "area", b.concat(["bodyEn"]), bg.bodyEn) +
          (gl ? '<details class="sub" open><summary>生词 ' + (bg.glossary || []).length + "（词形只读，改中文释义）</summary>" + gl + "</details>" : "") +
          (quiz ? '<details class="sub" open><summary>阅读题 ' + (bg.quiz || []).length + "</summary>" + quiz + "</details>" : "") +
          "</article>"
        );
      })
      .join("");
  }

  /* ---------------- 播放器 ---------------- */

  function setupAudio() {
    if (!S.audio) {
      S.audio = $("au");
      S.audio.addEventListener("timeupdate", renderPlayerHead);
      S.audio.addEventListener("ended", function () { S.audio.pause(); });
    }
    var track = S.tracks.filter(function (t) { return t.n === S.pack.n; })[0];
    /* 页面在 /studio/ 下，音频路径要回到站点根，否则会去 /studio/audio/... 找 */
    if (track) S.audio.src = "/" + String(track.file).replace(/^\//, "");
    S.audio.playbackRate = S.rate;
  }

  function renderPlayerHead() {
    var t = lineTimes(S.line) || [0, 0];
    var cur = S.audio ? S.audio.currentTime : 0;
    $("phLine").textContent = "第 " + (S.line + 1) + " 句 · " + Number(t[0]).toFixed(2) + "–" + Number(t[1]).toFixed(2) + "s";
    $("phTime").textContent = fmt(cur) + " / " + fmt(S.audio && S.audio.duration ? S.audio.duration : 0);
    $("playBtn").textContent = S.audio && !S.audio.paused ? "❚❚" : "▶";
    $("loopBtn").classList.toggle("is-on", S.loop);
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    return Math.floor(sec / 60) + ":" + pad2(Math.floor(sec % 60));
  }

  function clearSegTimer() {
    if (S.segTimer) clearTimeout(S.segTimer);
    S.segTimer = null;
  }

  function armSeg(end) {
    clearSegTimer();
    var au = S.audio;
    var remain = (end - au.currentTime) / (au.playbackRate || 1);
    if (!isFinite(remain)) return;
    S.segTimer = setTimeout(function () {
      S.segTimer = null;
      if (au.paused) return;
      if (au.currentTime < end - 0.12) return armSeg(end);
      if (S.loop) {
        au.currentTime = lineTimes(S.line)[0];
        au.play();
        armSeg(end);
      } else {
        au.pause();
      }
    }, Math.max(60, remain * 1000 + 40));
  }

  function safePlay(au) {
    var p = au.play();
    if (!p || !p.catch) return;
    p.catch(function () {
      /* 常见两种情况：还没缓冲好；或上一次 play 被 pause/seek 打断。等 canplay 再试一次。 */
      var once = function () {
        au.removeEventListener("canplay", once);
        var q = au.play();
        if (q && q.catch) q.catch(function () { toast("再点一次播放", "bad"); });
      };
      au.addEventListener("canplay", once);
      if (au.readyState >= 2) once();
    });
  }

  function playLine(i) {
    if (!S.audio) return;
    var t = lineTimes(i);
    if (!t) return;
    S.line = i;
    var au = S.audio;
    clearSegTimer();
    au.currentTime = t[0];
    au.playbackRate = S.rate;
    safePlay(au);
    armSeg(t[1]);
    renderPlayerHead();
    markRow(i);
  }

  function markRow(i) {
    var pane = $("pane-times");
    if (!pane) return;
    var rows = pane.querySelectorAll(".trow");
    for (var k = 0; k < rows.length; k++) rows[k].classList.toggle("is-now", Number(rows[k].getAttribute("data-row")) === i);
  }

  function togglePlay() {
    if (!S.audio) return;
    if (S.audio.paused) playLine(S.line);
    else {
      S.audio.pause();
      clearSegTimer();
    }
    renderPlayerHead();
  }

  /* ---------------- 保存 / 发布 ---------------- */

  function save() {
    if (!S.dirty.size || S.saving) return;
    var packEdits = [], timesEdits = [];
    S.dirty.forEach(function (rec) {
      (rec.kind === "pack" ? packEdits : timesEdits).push([rec.path, rec.value]);
    });
    S.saving = true;
    $("saveBtn").disabled = true;
    setStatus();
    api("/api/save", {
      method: "POST",
      body: JSON.stringify({
        show: S.showId,
        packId: S.packId,
        packSha: S.packSha,
        timesSha: S.timesSha,
        packEdits: packEdits,
        timesEdits: timesEdits
      })
    })
      .then(function (r) {
        S.saving = false;
        $("saveBtn").disabled = false;
        if (!r.ok) {
          toast(r.error || "保存失败", "bad");
          if (r.log) showModal("保存失败", "<pre>" + esc(r.log) + "</pre>", []);
          return;
        }
        S.packSha = r.packSha || S.packSha;
        S.timesSha = r.timesSha || S.timesSha;
        S.original.pack = clone(S.pack);
        S.original.times = clone(S.times);
        S.dirty.clear();
        setStatus();
        toast("已保存 " + r.changed + " 处 · 备份 " + (r.backup || ""), "ok");
        if (r.stat) $("hint").setAttribute("data-stat", r.stat);
      })
      .catch(function (e) {
        S.saving = false;
        $("saveBtn").disabled = false;
        toast(e.message, "bad");
      });
  }

  function showDiff() {
    api("/api/diff").then(function (r) {
      if (!r.ok) return toast(r.error || "读不到 diff", "bad");
      var body = r.diff
        ? "<pre>" + r.diff.split("\n").map(cline).join("\n") + "</pre>" + (r.truncated ? '<p class="muted">（太长，已截断）</p>' : "")
        : '<p class="muted">还没有改动。</p>';
      showModal("本地改动（content/）", "<pre>" + esc(r.stat || "无") + "</pre>" + body, []);
    });
  }

  function cline(line) {
    var cls = /\+(?!\+\+)/.test(line) ? "add" : /^-(?!--)/.test(line) ? "del" : /^@@/.test(line) ? "at" : "";
    return cls ? '<span class="' + cls + '">' + esc(line) + "</span>" : esc(line);
  }

  function showBackups() {
    api("/api/backups").then(function (r) {
      if (!r.ok) return toast(r.error || "读不到备份", "bad");
      if (!r.items.length) return showModal("备份", '<p class="muted">还没有备份。</p>', []);
      var list = r.items
        .map(function (it) {
          return (
            '<div class="qopt" style="grid-template-columns:1fr auto;align-items:center">' +
            "<span>" + esc(it.dir) + ' <span class="muted">' + esc(it.note) + "</span></span>" +
            '<button class="btn ghost small" data-revert="' + esc(it.dir) + '">恢复</button></div>'
          );
        })
        .join("");
      showModal("备份（dev/_backup/）", "<p class='muted'>恢复会把文件写回那份，然后重跑校验。</p>" + list, []);
    });
  }

  function publishDialog() {
    if (S.dirty.size) return toast("还有 " + S.dirty.size + " 处没保存", "bad");
    showModal(
      "发布上线",
      "<p>会按顺序跑：validate_packs → smoke → git add/commit → push → gh workflow run pages.yml。</p>" +
      '<div class="field"><label>提交信息</label><input id="pubMsg" type="text" value="内容: ' + esc(S.pack.title) + " 修订\"></div>" +
      '<p class="muted">线上约 40 秒后更新；失败时本地已提交的内容不会丢。</p>',
      [
        { label: "取消", ghost: true, onclick: closeModal },
        { label: "发布", primary: true, onclick: doPublish }
      ]
    );
  }

  function doPublish() {
    var msg = ($("pubMsg") && $("pubMsg").value) || "";
    var foot = $("modalFoot");
    foot.innerHTML = '<span class="muted">发布中……（推送可能重试几次）</span>';
    api("/api/publish", { method: "POST", body: JSON.stringify({ confirm: true, message: msg }) })
      .then(function (r) {
        $("modalTitle").textContent = r.ok ? "已发布" : "发布未完成";
        $("modalBody").innerHTML = "<pre>" + esc(r.log || r.error || "") + "</pre>" +
          (r.url ? '<p><a href="' + esc(r.url) + '" target="_blank" rel="noopener">打开线上站点</a></p>' : "");
        foot.innerHTML = "";
      })
      .catch(function (e) {
        $("modalBody").innerHTML = "<pre>" + esc(e.message) + "</pre>";
        foot.innerHTML = "";
      });
  }

  /* ---------------- 弹窗 / toast ---------------- */

  function showModal(title, bodyHtml, buttons) {
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = bodyHtml;
    var foot = $("modalFoot");
    foot.innerHTML = "";
    (buttons || []).forEach(function (b) {
      var el = document.createElement("button");
      el.className = "btn" + (b.primary ? " primary" : b.ghost ? " ghost" : "");
      el.textContent = b.label;
      el.onclick = b.onclick;
      foot.appendChild(el);
    });
    var close = document.createElement("button");
    close.className = "btn ghost";
    close.textContent = "关闭";
    close.onclick = closeModal;
    foot.appendChild(close);
    $("modal").hidden = false;
  }

  function closeModal() {
    $("modal").hidden = true;
  }

  function toast(msg, kind) {
    var el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.textContent = msg;
    var box = $("toasts");
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () { el.remove(); }, kind === "bad" ? 6000 : 3200);
  }

  /* ---------------- 事件 ---------------- */

  function commitInput(el) {
    var kind = el.getAttribute("data-kind");
    var path = JSON.parse(el.getAttribute("data-path"));
    var raw = el.value;
    var value = raw;
    if (el.getAttribute("data-type") === "number") {
      var num = Number(raw);
      if (!isFinite(num)) return;
      value = round2(num);
    }
    setByPath(kind === "pack" ? S.pack : S.times, path, value);
    markDirty(kind, path, value);
  }

  document.addEventListener("input", function (e) {
    var el = e.target;
    if (el.matches("[data-kind][data-path]") && el.tagName !== "SELECT") commitInput(el);
    autoGrow(el);
  });

  document.addEventListener("change", function (e) {
    var el = e.target;
    if (!el.matches("[data-kind][data-path]")) return;
    commitInput(el);
    if (el.getAttribute("data-kind") === "times") {
      renderTimes();
      markRow(S.line);
      renderPlayerHead();
    }
  });

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-tab]");
    if (t) {
      S.tab = t.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("is-active", b === t); });
      $("pane-times").hidden = S.tab !== "times";
      $("pane-text").hidden = S.tab !== "text";
      $("pane-bg").hidden = S.tab !== "bg";
      setHint(S.tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    var play = e.target.closest("[data-play]");
    if (play) {
      playLine(Number(play.getAttribute("data-play")));
      return;
    }

    var nudge = e.target.closest("[data-nudge]");
    if (nudge) {
      var i = Number(nudge.getAttribute("data-i"));
      var edge = Number(nudge.getAttribute("data-edge"));
      var d = Number(nudge.getAttribute("data-nudge"));
      var cur = lineTimes(i);
      if (!cur) return;
      var next = round2(cur[edge] + d);
      if (next < 0) next = 0;
      var path = [S.trackKey, i, edge];
      S.times[S.trackKey][i][edge] = next;
      markDirty("times", path, next);
      renderTimes();
      markRow(i);
      renderPlayerHead();
      return;
    }

    var now = e.target.closest("[data-now]");
    if (now && S.audio) {
      var ni = Number(now.getAttribute("data-i"));
      var ne = Number(now.getAttribute("data-now"));
      var val = round2(S.audio.currentTime);
      S.times[S.trackKey][ni][ne] = val;
      markDirty("times", [S.trackKey, ni, ne], val);
      renderTimes();
      markRow(ni);
      toast("第 " + (ni + 1) + " 句" + (ne ? "终点" : "起点") + " = " + val.toFixed(2) + "s", "ok");
      return;
    }

    var revert = e.target.closest("[data-revert]");
    if (revert) {
      var dir = revert.getAttribute("data-revert");
      if (!confirm("恢复到备份 " + dir + "？当前文件会被覆盖。")) return;
      api("/api/revert", { method: "POST", body: JSON.stringify({ dir: dir }) }).then(function (r) {
        toast(r.ok ? "已恢复 " + r.restored + " 个文件" : r.error || "恢复失败", r.ok ? "ok" : "bad");
        closeModal();
        loadPack(S.packId);
      });
      return;
    }
  });

  $("showSel").addEventListener("change", function () { loadShow(this.value); });
  $("packSel").addEventListener("change", function () {
    if (S.dirty.size && !confirm("切走会丢掉未保存的 " + S.dirty.size + " 处改动，继续？")) {
      this.value = S.packId;
      return;
    }
    loadPack(this.value);
  });
  $("saveBtn").addEventListener("click", save);
  $("dirtySave").addEventListener("click", save);
  $("undoBtn").addEventListener("click", discard);
  $("dirtyUndo").addEventListener("click", discard);
  $("diffBtn").addEventListener("click", showDiff);
  $("backupBtn").addEventListener("click", showBackups);
  $("publishBtn").addEventListener("click", publishDialog);
  $("modalClose").addEventListener("click", closeModal);
  $("playBtn").addEventListener("click", togglePlay);
  $("prevBtn").addEventListener("click", function () { playLine(Math.max(0, S.line - 1)); });
  $("nextBtn").addEventListener("click", function () { playLine(Math.min(S.lines.length - 1, S.line + 1)); });
  $("loopBtn").addEventListener("click", function () {
    S.loop = !S.loop;
    renderPlayerHead();
  });
  $("rateSel").addEventListener("change", function () {
    S.rate = Number(this.value) || 1;
    if (S.audio) S.audio.playbackRate = S.rate;
    if (S.audio && !S.audio.paused) armSeg(lineTimes(S.line)[1]);
  });
  $("modal").addEventListener("click", function (e) {
    if (e.target === $("modal")) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      save();
      return;
    }
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      playLine(Math.max(0, S.line - 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      playLine(Math.min(S.lines.length - 1, S.line + 1));
    }
  });

  window.addEventListener("beforeunload", function (e) {
    if (!S.dirty.size) return;
    e.preventDefault();
    e.returnValue = "";
  });

  start();
})();
