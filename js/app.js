/* 剧读 · 应用逻辑 */
(function () {
  "use strict";

  var ME = window.ME;
  var SHOWS = window.MUSICAL_SHOWS || [];
  var SHOW_ID = window.MUSICAL_CURRENT_SHOW || (SHOWS[0] && SHOWS[0].id) || "hamilton";
  var SHOW = null;
  for (var si = 0; si < SHOWS.length; si++) {
    if (SHOWS[si].id === SHOW_ID) SHOW = SHOWS[si];
  }

  /* 剧目主题：把 show.theme 的键写成 CSS 变量（--gold 等） */
  (function applyTheme() {
    var t = SHOW && SHOW.theme;
    if (!t) return;
    var st = document.documentElement && document.documentElement.style;
    if (!st) return;
    Object.keys(t).forEach(function (k) {
      st.setProperty("--" + k, t[k]);
    });
  })();

  var SONGS = window.MUSICAL_SONGS || {};
  var ACTIVE_ID = null;
  var song = null;

  var TRACK_DATA = (window.MUSICAL_TRACKS || {})[SHOW_ID] || null;
  var TRACKS = (TRACK_DATA && TRACK_DATA.tracks) || [];
  var LYRICS = (window.MUSICAL_LYRICS || {})[SHOW_ID] || {};
  var TIMES = (window.MUSICAL_TIMES || {})[SHOW_ID] || {};

  /* 曲目号 → pack id（tracks.js 的 content 字段）。有 id 就代表这首有精读，
   * 但 pack 脚本可能还没加载——首屏只预载第一首，其余按需注入。 */
  var PACK_IDS = {};
  TRACKS.forEach(function (t) {
    if (t.content) PACK_IDS[t.n] = t.content;
  });

  /* ---------------- 数据准备 ---------------- */

  var ANNOTATED = [];
  var LINE_BY_ID = {};
  var LINE_NO = {};
  var BG_BY_ID = {};
  var CARDS = [];
  var CARD_BY_KEY = {};

  /* 有精读的曲目清单（轻量描述符；不要求对应 pack 已经加载） */
  function packs() {
    return TRACKS.filter(function (t) {
      return !!PACK_IDS[t.n];
    })
      .map(function (t) {
        return { id: PACK_IDS[t.n], n: t.n, title: t.title };
      })
      .sort(function (a, b) {
        return a.n - b.n;
      });
  }

  function hasPack(n) {
    return !!PACK_IDS[n];
  }

  function packIdFor(n) {
    return PACK_IDS[n] || null;
  }

  /* 按需注入某一首的 pack 脚本；同一个 id 的并发请求合并成一次 */
  var loading = {};
  function loadPack(id, done) {
    if (SONGS[id]) {
      done();
      return;
    }
    if (loading[id]) {
      loading[id].push(done);
      return;
    }
    loading[id] = [done];
    var s = document.createElement("script");
    s.src = "content/" + SHOW_ID + "/" + id + ".js";
    s.async = true;
    s.onload = function () {
      var ok = !!SONGS[id];
      var cbs = loading[id] || [];
      delete loading[id];
      if (!ok) {
        toast("曲目内容加载失败：" + id);
        return;
      }
      cbs.forEach(function (cb) {
        cb();
      });
    };
    s.onerror = function () {
      delete loading[id];
      toast("曲目内容加载失败：" + id);
    };
    document.head.appendChild(s);
  }

  function nextPack() {
    if (!song) return null;
    var list = packs();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === song.id) return i < list.length - 1 ? list[i + 1] : null;
    }
    return null;
  }

  function trackByN(n) {
    for (var i = 0; i < TRACKS.length; i++) {
      if (TRACKS[i].n === n) return TRACKS[i];
    }
    return null;
  }

  function lineTime(n, i) {
    var arr = TIMES[String(n)];
    return arr && arr[i] ? arr[i] : null;
  }

  function rebuildDerived() {
    ANNOTATED = [];
    LINE_BY_ID = {};
    LINE_NO = {};
    BG_BY_ID = {};
    CARDS = [];
    CARD_BY_KEY = {};
    if (!song) return;
    song.sections.forEach(function (sec) {
      sec.lines.forEach(function (line) {
        ANNOTATED.push({ line: line, section: sec });
      });
    });
    LINE_BY_ID = {};
    LINE_NO = {};
    ANNOTATED.forEach(function (e, i) {
      LINE_BY_ID[e.line.id] = e.line;
      LINE_NO[e.line.id] = i + 1;
    });
    BG_BY_ID = {};
    (song.background || []).forEach(function (b) {
      BG_BY_ID[b.id] = b;
    });
    CARDS = buildCards();
    CARD_BY_KEY = {};
    CARDS.forEach(function (c) {
      CARD_BY_KEY[c.key] = c;
    });
  }

  var state = ME.loadState();
  /* 启动时的地址栏参数要先存下来：后面 switchView 会把地址栏改写成当前视图 */
  var BOOT_QUERY = (typeof location !== "undefined" && location.search) || "";

  var ui = {
    view: "study",
    open: {},
    q: "",
    type: "全部",
    lyricsN: 1,
    playingIdx: -1,
    /* 当前这一句：{ n, i, start, end, mode }，mode = line（播完停）| loop（单句循环） */
    segment: null,
    /* 上次播过的句子，dock 上的 🔁 / 🎤 用它做默认目标 */
    lastSeg: null,
    loopCount: 0,
    /* 隐藏中文时，单独点开过的行：{ l12: true } */
    zh: {},
    /* 上次保存播放位置的时间，避免 timeupdate 写太勤 */
    posSavedAt: 0,
    /* 整曲连播时是否自动滚动跟随当前句 */
    follow: true,
    lastFollowIdx: -1,
    /* 曲库筛选 / 排序 */
    libFilter: "all",
    libSort: "act"
  };
  var audio = { el: null, ready: false, name: "", track: null };

  function buildCards() {
    var out = [];
    var seen = {};
    ANNOTATED.forEach(function (e) {
      var line = e.line;
      (line.words || []).forEach(function (w) {
        var key = "w:" + w.w.toLowerCase();
        if (seen[key]) return;
        seen[key] = 1;
        out.push({
          key: key,
          type: "word",
          front: w.w,
          ipa: w.ipa,
          tag: w.pos,
          back: w.zh,
          detail: w.d,
          lineId: line.id,
          lineText: line.text
        });
      });
      (line.phrases || []).forEach(function (p) {
        var key = "p:" + p.p.toLowerCase();
        if (seen[key]) return;
        seen[key] = 1;
        out.push({
          key: key,
          type: "phrase",
          front: p.p,
          tag: p.type || "短语",
          back: p.zh,
          detail: [p.ex, p.exZh, p.d].filter(Boolean).join("  "),
          lineId: line.id,
          lineText: line.text
        });
      });
      (line.grammar || []).forEach(function (g) {
        if (!g.card) return;
        var key = "g:" + (g.card.front || g.t).toLowerCase();
        if (seen[key]) return;
        seen[key] = 1;
        out.push({
          key: key,
          type: "grammar",
          front: g.card.front || g.t,
          tag: "语法",
          back: g.card.back || g.d,
          detail: "",
          lineId: line.id,
          lineText: line.text
        });
      });
    });
    return out;
  }

  /* 首屏只预载一首；挑第一首已经就绪的 pack */
  (function () {
    var list = packs();
    for (var i = 0; i < list.length; i++) {
      if (SONGS[list[i].id]) {
        song = SONGS[list[i].id];
        return;
      }
    }
  })();
  ACTIVE_ID = song ? song.id : null;
  rebuildDerived();

  var TYPE_LABEL = { word: "词汇", phrase: "短语", grammar: "语法" };
  var SONG_VIEWS = ["study", "story", "phrases", "review"];

  function masterKey(id) {
    return song.id + ":" + id;
  }

  /* ---------------- 文本工具 ---------------- */

  function hl(text, words) {
    if (!words || !words.length) return ME.esc(text);
    var map = {};
    words.forEach(function (w) {
      map[w.w.toLowerCase()] = w;
    });
    return String(text)
      .split(/([A-Za-z][A-Za-z'’\-]*)/)
      .map(function (part) {
        var k = part.toLowerCase().replace(/[’']/g, "'");
        var w = map[k];
        if (w) {
          var tip = [w.ipa, w.zh].filter(Boolean).join(" · ");
          return '<span class="w" tabindex="0" data-tip="' + ME.esc(tip) + '">' + ME.esc(part) + "</span>";
        }
        return ME.esc(part);
      })
      .join("");
  }

  function matchedCount() {
    var ov = song ? state.lyrics[song.id] : null;
    return ov && typeof ov.matched === "number" ? ov.matched : 0;
  }

  function currentLyrics() {
    var ov = song ? state.lyrics[song.id] : null;
    return ov && ov.lines && ov.lines.length ? ov.lines : null;
  }

  function getRows() {
    var ov = currentLyrics();
    if (!ov) {
      var rows = [];
      song.sections.forEach(function (sec) {
        rows.push({ kind: "section", section: sec });
        sec.lines.forEach(function (line) {
          rows.push({ kind: "line", line: line });
        });
      });
      return rows;
    }
    var rows2 = [
      {
        kind: "banner",
        text:
          "正在显示你导入的歌词（" +
          ov.length +
          " 行，其中 " +
          matchedCount() +
          " 行挂上了注释）。可以在设置里恢复样板歌词。"
      }
    ];
    ov.forEach(function (r) {
      var base = LINE_BY_ID[r.id];
      var line;
      if (base) {
        line = Object.assign({}, base, { text: r.text });
      } else {
        line = {
          id: r.id,
          text: r.text,
          zh: "",
          grammar: [],
          words: [],
          phrases: [],
          sound: "",
          note: "",
          bg: [],
          plain: true
        };
      }
      rows2.push({ kind: "line", line: line });
    });
    return rows2;
  }

  function isMastered(id) {
    var rec = state.lines[masterKey(id)];
    return !!(rec && rec.mastered);
  }

  function masteredCount() {
    return ANNOTATED.filter(function (e) {
      return isMastered(e.line.id);
    }).length;
  }

  /* ---------------- 精读 ---------------- */

  function lineHtml(line, n) {
    var open = !!ui.open[line.id];
    var mastered = isMastered(line.id);
    var hasDetail =
      !line.plain &&
      ((line.grammar && line.grammar.length) ||
        (line.words && line.words.length) ||
        (line.phrases && line.phrases.length) ||
        line.sound ||
        line.note ||
        (line.bg && line.bg.length));

    var chips = [];
    if (line.words && line.words.length) chips.push('<span class="chip chip-word">' + line.words.length + " 词</span>");
    if (line.phrases && line.phrases.length) chips.push('<span class="chip chip-phrase">' + line.phrases.length + " 短语</span>");
    if (line.grammar && line.grammar.length) chips.push('<span class="chip chip-grammar">' + line.grammar.length + " 语法</span>");
    if (line.plain) chips.push('<span class="chip chip-plain">未注释</span>');

    return (
      '<article class="line' +
      (open ? " is-open" : "") +
      (mastered ? " is-mastered" : "") +
      '" data-line="' +
      ME.esc(line.id) +
      '">' +
      '<div class="line-row" data-action="toggle-line" data-id="' +
      ME.esc(line.id) +
      '" role="button" tabindex="0">' +
      '<span class="lnum">' +
      String(n).padStart(2, "0") +
      "</span>" +
      '<div class="line-main">' +
      '<p class="en">' +
      (line.speaker ? '<span class="speaker">' + ME.esc(line.speaker) + "</span>" : "") +
      hl(line.text, line.words) +
      "</p>" +
      (line.zh
        ? '<p class="zh' + (ui.zh[line.id] ? " is-revealed" : "") + '">' + ME.esc(line.zh) + "</p>"
        : "") +
      '<div class="chips">' +
      chips.join("") +
      "</div>" +
      "</div>" +
      (function () {
        var mm = /^l(\d+)$/.exec(String(line.id));
        var li = mm ? Number(mm[1]) - 1 : -1;
        var lt = li >= 0 ? lineTime(song.n, li) : null;
        var onLoop =
          !!(ui.segment && ui.segment.mode === "loop" && ui.segment.n === song.n && ui.segment.i === li) &&
          lt;
        return (
          '<span class="line-ctl">' +
          '<button class="line-play" data-action="play-line" data-n="' +
          song.n +
          '" data-i="' +
          li +
          '"' +
          (lt ? "" : " disabled") +
          ' aria-label="播放这一句">▶</button>' +
          '<button class="line-loop' +
          (onLoop ? " is-on" : "") +
          '" data-action="loop-line" data-n="' +
          song.n +
          '" data-i="' +
          li +
          '"' +
          (lt ? "" : " disabled") +
          ' aria-label="循环这一句" aria-pressed="false" title="循环这一句（R）">环</button>' +
          "</span>"
        );
      })() +
      '<span class="line-ctl line-ctl-end">' +
      (!state.settings.showZh
        ? '<button class="zh-peek' + (ui.zh[line.id] ? " is-on" : "") +
          '" data-action="peek-zh" data-id="' + ME.esc(line.id) +
          '" title="显示这一行的中文">中</button>'
        : "") +
      '<button class="master" data-action="master" data-id="' +
      ME.esc(line.id) +
      '" aria-pressed="' +
      mastered +
      '" title="标记为已掌握">✓</button>' +
      "</span>" +
      "</div>" +
      (open && hasDetail ? '<div class="line-detail">' + detailHtml(line) + "</div>" : "") +
      "</article>"
    );
  }

  function detailHtml(line) {
    var left = "";
    var right = "";

    if (line.note) left += '<p class="line-note">' + ME.esc(line.note) + "</p>";

    if (line.grammar && line.grammar.length) {
      left +=
        '<div class="dblock"><h4>语法</h4><ul class="grammar">' +
        line.grammar
          .map(function (g) {
            return '<li><p class="g-title">' + ME.esc(g.t) + '</p><p class="g-body">' + ME.esc(g.d) + "</p></li>";
          })
          .join("") +
        "</ul></div>";
    }

    if (line.phrases && line.phrases.length) {
      left +=
        '<div class="dblock"><h4>短语</h4><ul class="plist">' +
        line.phrases
          .map(function (p) {
            return (
              '<li><span class="p-tag">' +
              ME.esc(p.type || "短语") +
              '</span><b>' +
              ME.esc(p.p) +
              "</b><span class=\"p-zh\">" +
              ME.esc(p.zh) +
              "</span>" +
              (p.ex ? '<p class="p-ex">' + ME.esc(p.ex) + "</p>" : "") +
              (p.exZh ? '<p class="p-ex-zh">' + ME.esc(p.exZh) + "</p>" : "") +
              (p.d ? '<p class="p-d">' + ME.esc(p.d) + "</p>" : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul></div>";
    }

    if (line.words && line.words.length) {
      right +=
        '<div class="dblock"><h4>词汇</h4><ul class="wlist">' +
        line.words
          .map(function (w) {
            return (
              '<li data-word="' +
              ME.esc(w.w.toLowerCase()) +
              '"><div class="w-head"><b>' +
              ME.esc(w.w) +
              '</b><span class="ipa">' +
              ME.esc(w.ipa || "") +
              '</span><span class="pos">' +
              ME.esc(w.pos || "") +
              "</span></div>" +
              '<p class="w-zh">' +
              ME.esc(w.zh) +
              '</p><p class="w-d">' +
              ME.esc(w.d || "") +
              "</p></li>"
            );
          })
          .join("") +
        "</ul></div>";
    }

    if (line.sound) {
      right +=
        '<div class="sound"><span class="sound-icon">♪</span><p>' + ME.esc(line.sound) + "</p></div>";
    }

    if (line.bg && line.bg.length) {
      right +=
        '<div class="bg-links"><h4>相关背景</h4>' +
        line.bg
          .map(function (id) {
            var b = BG_BY_ID[id];
            if (!b) return "";
            return (
              '<button class="bg-link" data-action="open-bg" data-id="' +
              ME.esc(id) +
              '">' +
              ME.esc(b.title) +
              "</button>"
            );
          })
          .join("") +
        "</div>";
    }

    return (
      '<div class="detail-grid"><div class="detail-col">' +
      left +
      '</div><div class="detail-col side">' +
      right +
      "</div></div>"
    );
  }

  function renderStudy() {
    if (!song) {
      document.getElementById("view-study").innerHTML =
        '<p class="empty">这个剧目还没有精读内容，先去「歌词」里读吧。</p>';
      return;
    }
    var rows = getRows();
    var n = 0;
    var body = rows
      .map(function (r) {
        if (r.kind === "section") {
          return (
            '<header class="section-head">' +
            '<span class="sec-no">' +
            ME.esc(r.section.id.toUpperCase()) +
            "</span>" +
            '<h2 class="serif">' +
            ME.esc(r.section.title) +
            " <em>" +
            ME.esc(r.section.zh) +
            "</em></h2>" +
            "<p>" +
            ME.esc(r.section.note) +
            "</p></header>"
          );
        }
        if (r.kind === "banner") return '<p class="banner">' + ME.esc(r.text) + "</p>";
        n += 1;
        return lineHtml(r.line, n);
      })
      .join("");

    var html =
      '<div class="song-head">' +
      '<p class="kicker">' +
      ME.esc(song.show) +
      " · " +
      ME.esc(song.writer) +
      " · " +
      ME.esc(song.year) +
      " · " +
      ME.esc(song.runtime) +
      "</p>" +
      '<h1 class="serif">' +
      ME.esc(song.title) +
      "</h1>" +
      '<p class="tagline">' +
      ME.esc(song.tagline) +
      "</p>" +
      '<p class="intro">' +
      ME.esc(song.intro) +
      "</p>" +
      '<div class="head-stats">' +
      "<span><b>" +
      masteredCount() +
      "</b> / " +
      ANNOTATED.length +
      " 行已掌握</span>" +
      "<span><b>" +
      CARDS.length +
      "</b> 张复习卡</span>" +
      '<button class="link-btn" data-action="go-phrases">浏览短语库 →</button>' +
      "</div>" +
      "</div>" +
      '<div class="hint-strip">点任意一行都有讲解 · 带「词 / 短语 / 语法」的行展开更细 · 中文默认隐藏，点右侧「中」只看这一句 · 虚线词悬停看释义</div>' +
      body;

    /* 行内「相关背景」只有作者手工挂的几处；这里给整首歌一个完整入口，
     * 免得没被行内引用的背景卡只能靠人自己想到去点「背景」页。 */
    if ((song.background || []).length) {
      html +=
        '<div class="bg-entry">' +
        '<h3 class="block-title serif">本曲背景阅读 <em>' +
        song.background.length +
        " 篇</em></h3>" +
        '<div class="bg-entry-list">' +
        song.background
          .map(function (b) {
            return (
              '<button class="bg-entry-btn" data-action="open-bg" data-id="' +
              ME.esc(b.id) +
              '"><span>' +
              (b.kind === "craft" ? "创作手记" : "历史故事") +
              '</span><span class="bg-entry-main"><b>' +
              ME.esc(b.title) +
              "</b>" +
              (b.titleEn && b.titleEn !== b.title
                ? '<i class="bg-en-sub">' + ME.esc(b.titleEn) + "</i>"
                : "") +
              "</span></button>"
            );
          })
          .join("") +
        "</div></div>";
    }

    var np = nextPack();
    if (np) {
      html +=
        '<div class="next-song"><span>这一首学完了？</span>' +
        '<button class="primary small" data-action="next-song">下一首 · ' +
        ME.esc(np.title) +
        " →</button></div>";
    }

    html += saveCardHtml();

    document.getElementById("view-study").innerHTML = html;
  }

  /* ---------------- 曲库 ---------------- */

  /* 曲库顶部的学习概览：掌握行数 / 今日到期 / 连续天数 */
  function libStats() {
    var total = 0;
    Object.keys(LYRICS).forEach(function (n) {
      total += ((LYRICS[n] && LYRICS[n].lines) || []).length;
    });
    var packIds = {};
    TRACKS.forEach(function (t) {
      var pid = packIdFor(t.n);
      if (pid) packIds[pid + ":"] = true;
    });
    var learned = 0;
    Object.keys(state.lines).forEach(function (k) {
      var rec = state.lines[k];
      if (!rec || !rec.mastered) return;
      for (var pre in packIds) {
        if (k.indexOf(pre) === 0) {
          learned++;
          return;
        }
      }
    });
    var now = Date.now();
    var due = 0;
    Object.keys(state.srs).forEach(function (k) {
      var r = state.srs[k];
      if (r && r.due && r.due <= now) due++;
    });
    var streak = 0;
    var d = new Date();
    while (streak < 400) {
      var day = state.daily[ME.dateKey(d)];
      if (day && ((day.new || 0) + (day.reviews || 0)) > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return { total: total, learned: learned, due: due, streak: streak };
  }

  function renderLibrary() {
    var box = document.getElementById("view-library");
    if (!TRACKS.length) {
      box.innerHTML = '<p class="empty">没有找到曲目清单。</p>';
      return;
    }
    var filter = ui.libFilter || "all";
    var sort = ui.libSort || "act";
    var rows = TRACKS.filter(function (t) {
      var pr = trackProgress(t);
      if (filter === "done") return pr.total > 0 && pr.pct >= 100;
      if (filter === "todo") return pr.pct < 100;
      if (filter === "pack") return hasPack(t.n);
      return true;
    });
    if (sort === "length") rows.sort(function (a, b) { return b.seconds - a.seconds; });
    else if (sort === "progress") rows.sort(function (a, b) { return trackProgress(b).pct - trackProgress(a).pct; });
    else if (sort === "title") rows.sort(function (a, b) { return a.title.localeCompare(b.title); });

    var body;
    if (sort === "act") {
      body = [1, 2]
        .filter(function (act) {
          return rows.some(function (t) { return t.act === act; });
        })
        .map(function (act) {
          var list = rows.filter(function (t) { return t.act === act; });
          return (
            '<section class="act">' +
            '<h3 class="act-title serif">' +
            (act === 1 ? "第一幕" : "第二幕") +
            " <em>Act " + act + "</em>" +
            '<span class="act-meta">' + list.length + " 首</span></h3>" +
            '<ol class="track-list">' + list.map(trackRow).join("") + "</ol>" +
            "</section>"
          );
        })
        .join("");
    } else {
      body = rows.length
        ? '<ol class="track-list">' + rows.map(trackRow).join("") + "</ol>"
        : '<p class="empty">这个筛选下没有曲目。</p>';
    }

    var tools =
      '<div class="lib-tools">' +
      '<div class="lib-filters">' +
      [["all", "全部"], ["todo", "未学完"], ["done", "已学完"], ["pack", "有精读"]]
        .map(function (f) {
          return (
            '<button class="type-chip' + (filter === f[0] ? " is-on" : "") +
            '" data-action="lib-filter" data-filter="' + f[0] + '">' + f[1] + "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<select class="study-select lib-sort" id="libSort" aria-label="排序">' +
      [["act", "按幕次"], ["progress", "按掌握度"], ["length", "按时长"], ["title", "按标题"]]
        .map(function (o) {
          return '<option value="' + o[0] + '"' + (sort === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
        })
        .join("") +
      "</select></div>";

    var withContent = TRACKS.filter(function (t) {
      return hasPack(t.n);
    }).length;

    box.innerHTML =
      '<div class="page-head">' +
      '<p class="kicker">曲库</p>' +
      '<h2 class="serif">' +
      ME.esc(SHOW ? SHOW.title : "曲库") +
      " · 全剧 " +
      TRACKS.length +
      " 首</h2>" +
      '<p class="lede">总时长 ' +
      ME.formatHours(TRACK_DATA.totalSeconds) +
      "。已有逐行精读 <b>" +
      withContent +
      "</b> 首；点任意一行看歌词，点左侧 ▷ 播放。</p>" +
      (function () {
        var st = libStats();
        return (
          '<div class="lib-stats">' +
          "<span>已掌握 <b>" + st.learned + "</b> / " + st.total + " 行</span>" +
          "<span>今日到期 <b>" + st.due + "</b> 张</span>" +
          "<span>连续 <b>" + st.streak + "</b> 天</span>" +
          '<button class="link-btn lib-stats-go" data-action="tab" data-view="review">去复习 →</button>' +
          "</div>"
        );
      })() +
      "</div>" +
      tools +
      body;
  }

  function trackProgress(t) {
    var pid = packIdFor(t.n);
    var total = ((LYRICS[String(t.n)] && LYRICS[String(t.n)].lines) || []).length;
    var done = 0;
    if (pid) {
      var pre = pid + ":";
      Object.keys(state.lines).forEach(function (k) {
        if (k.indexOf(pre) === 0 && state.lines[k] && state.lines[k].mastered) done++;
      });
    }
    if (done > total) done = total;
    return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function trackRow(t) {
    var current = !!(audio.track && audio.track.n === t.n);
    var playing = current && audio.el && !audio.el.paused;
    var rowAction = hasPack(t.n) ? "open-song" : "open-lyrics";
    return (
      '<li class="track' +
      (current ? " is-current" : "") +
      '" data-action="' +
      rowAction +
      '" data-n="' +
      t.n +
      '">' +
      '<button class="track-play" data-action="play-track" data-n="' +
      t.n +
      '" aria-label="播放">' +
      (playing ? "❚❚" : "▶") +
      "</button>" +
      '<span class="track-no">' +
      String(t.n).padStart(2, "0") +
      "</span>" +
      '<span class="track-title">' +
      ME.esc(t.title) +
      "</span>" +
      (function () {
        var pr = trackProgress(t);
        return hasPack(t.n) && pr.total
          ? '<span class="track-pct" title="已掌握 ' + pr.done + " / " + pr.total + ' 行">' + pr.pct + "%</span>"
          : "";
      })() +
      '<span class="track-len">' +
      ME.formatClock(t.seconds) +
      "</span>" +
      (hasPack(t.n)
        ? '<button class="track-badge is-content" data-action="open-song" data-n="' +
          t.n +
          '">精读</button>'
        : '<span class="track-badge">未收录</span>') +
      "</li>"
    );
  }

  /* ---------------- 单句循环 ---------------- */

  var segTimer = null;

  function clearSegmentTimer() {
    if (segTimer) clearTimeout(segTimer);
    segTimer = null;
  }

  /* 排一个精确的收尾定时器（按播放速度换算）；timeupdate 里还有一道兜底。
   * 音频钟和墙钟会有几十毫秒漂移，所以到点后如果还差一点就再排一次，不提前收尾。 */
  function armSegment() {
    clearSegmentTimer();
    var el = audio.el;
    var seg = ui.segment;
    if (!el || !seg) return;
    var rate = el.playbackRate || 1;
    var remain = (seg.end - el.currentTime) / rate;
    if (!isFinite(remain)) return;
    segTimer = setTimeout(function () {
      segTimer = null;
      if (!ui.segment || !audio.el || audio.el.paused) return;
      if (audio.el.currentTime < ui.segment.end - 0.12) {
        armSegment();
        return;
      }
      finishSegment();
    }, Math.max(60, remain * 1000 + 40));
    if (segTimer && segTimer.unref) segTimer.unref();
  }

  /* 一句播完：循环就回头，普通模式就停 */
  function finishSegment() {
    var el = audio.el;
    var seg = ui.segment;
    clearSegmentTimer();
    if (!el || !seg) return;
    if (seg.mode === "loop") {
      ui.loopCount += 1;
      el.currentTime = seg.start;
      safePlay(el);
      armSegment();
      updateSegChip();
      return;
    }
    el.pause();
    ui.segment = null;
    renderDock();
    markPlayingLine();
  }

  function stopSegment(silent) {
    clearSegmentTimer();
    if (audio.el && !audio.el.paused) audio.el.pause();
    ui.segment = null;
    renderDock();
    markPlayingLine();
    if (!silent) toast("已停止");
  }

  function segTarget() {
    if (ui.segment) return { n: ui.segment.n, i: ui.segment.i };
    return ui.lastSeg;
  }

  function toggleLoop() {
    var t = segTarget();
    if (!t) {
      toast("先点某一句左边的 ▶");
      return;
    }
    if (ui.segment && ui.segment.mode === "loop" && ui.segment.n === t.n && ui.segment.i === t.i) {
      stopSegment();
      return;
    }
    playSegment(t.n, t.i, "loop");
  }

  function segChipParts() {
    var seg = ui.segment;
    if (!seg) return null;
    if (seg.mode === "loop") {
      return { label: "单句循环", val: ui.loopCount ? "×" + ui.loopCount : "第 " + (seg.i + 1) + " 句" };
    }
    return null;
  }

  /* 行内「环」键的点亮状态：精读和歌词共用一套 data-n / data-i */
  function syncLineLoop() {
    var seg = ui.segment;
    var lit = seg && seg.mode === "loop" ? seg.n + ":" + seg.i : "";
    document.querySelectorAll(".line-loop").forEach(function (b) {
      var key = b.getAttribute("data-n") + ":" + b.getAttribute("data-i");
      var on = !!lit && key === lit;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* 只改 dock 上的模式按钮和状态条，不重绘整个 dock（否则拖动进度条会断） */
  function updateSegChip() {
    var box = document.getElementById("segChip");
    if (box) {
      var p = segChipParts();
      box.innerHTML = p
        ? '<span class="seg-label">' +
          ME.esc(p.label) +
          '</span><span class="seg-val">' +
          ME.esc(p.val) +
          "</span>" +
          '<button class="seg-x" data-action="stop-seg" aria-label="停止">×</button>'
        : "";
    }
    var seg = ui.segment;
    var lbtn = document.querySelector('.mode-btn[data-action="toggle-loop"]');
    if (lbtn) {
      var loopOn = !!(seg && seg.mode === "loop");
      lbtn.classList.toggle("is-on", loopOn);
      lbtn.setAttribute("aria-pressed", loopOn ? "true" : "false");
    }
    syncLineLoop();
  }

  /* 精读页高亮正在播的那一行（歌词页由 updateLyricHighlight 处理） */
  function currentLineIdx(n, t) {
    var arr = TIMES[String(n)] || [];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && t >= arr[i][0] && t < arr[i][1]) return i;
    }
    return -1;
  }

  function markPlayingLine() {
    if (ui.view !== "study" || !song) return;
    var prev = document.querySelector(".line.is-playing");
    if (prev) prev.classList.remove("is-playing");
    var seg = ui.segment;
    var idx = -1;
    if (seg && seg.n === song.n) idx = seg.i;
    else if (audio.track && audio.track.n === song.n && audio.el && !audio.el.paused) {
      idx = currentLineIdx(song.n, audio.el.currentTime);
    }
    if (idx < 0) return;
    var el = document.querySelector('.line[data-line="l' + (idx + 1) + '"]');
    if (!el) return;
    el.classList.add("is-playing");
    if (ui.follow && audio.el && !audio.el.paused && idx !== ui.lastFollowIdx) {
      ui.lastFollowIdx = idx;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  /* 播放一句：mode = "line"（播完停）| "loop"（单句循环） */
  function playSegment(n, i, mode) {
    var t = lineTime(n, i);
    var track = trackByN(n);
    if (!t || !track || !audio.el) return;
    var start = t[0];
    var end = t[1];
    clearSegmentTimer();
    ui.segment = { n: n, i: i, start: start, end: end, mode: mode || "line" };
    ui.lastSeg = { n: n, i: i };
    ui.loopCount = 0;

    function seekAndPlay() {
      audio.el.currentTime = start;
      safePlay(audio.el);
      armSegment();
      updateSegChip();
      markPlayingLine();
    }

    if (audio.track && audio.track.n === n) {
      seekAndPlay();
      return;
    }

    audio.track = track;
    audio.name = "";
    audio.el.src = track.file;
    audio.el.__recovered = false;
    audio.ready = true;
    renderDock();

    // iOS 只在用户手势里放行播放：先启动，再等元数据就绪跳到这一句
    var ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
    var isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);
    if (isIOS) safePlay(audio.el);

    audio.el.addEventListener("loadedmetadata", function onMeta() {
      audio.el.removeEventListener("loadedmetadata", onMeta);
      seekAndPlay();
    });
  }

  /* 上次听到哪儿了：整首播放/继续播时接着放 */
  function restorePos(t) {
    var saved = Number((ME.readPos() || {})[String(t.n)] || 0);
    if (!(saved > 5)) return;
    var once = function () {
      audio.el.removeEventListener("loadedmetadata", once);
      var dur = audio.el.duration;
      if (!isFinite(dur) || saved > dur - 8) return;
      try {
        audio.el.currentTime = saved;
        toast("从 " + ME.formatClock(saved) + " 继续");
      } catch (e) {}
    };
    audio.el.addEventListener("loadedmetadata", once);
  }

  function savePosNow() {
    if (audio.track && audio.el && audio.el.currentTime > 0.5) {
      ME.savePos(audio.track.n, audio.el.currentTime);
    }
  }

  function playTrack(n) {
    var t = TRACKS.filter(function (x) {
      return x.n === n;
    })[0];
    if (!t || !audio.el) return;
    /* 整首播放：退出单句循环 */
    clearSegmentTimer();
    ui.segment = null;
    updateSegChip();
    markPlayingLine();
    var same = audio.track && audio.track.n === n;

    if (same) {
      if (audio.el.paused) {
        safePlay(audio.el);
        watchStall();
      } else {
        audio.el.pause();
      }
      return;
    }

    audio.track = t;
    audio.name = "";
    audio.el.src = t.file;
    audio.el.__recovered = false;
    audio.ready = true;
    ui.follow = true;
    ui.lastFollowIdx = -1;
    restorePos(t);
    renderDock();
    safePlay(audio.el);
    watchStall();
  }

  /* ---------------- 歌词对照 ---------------- */

  function renderLyrics() {
    var box = document.getElementById("view-lyrics");
    var n = ui.lyricsN || 1;
    var data = LYRICS[String(n)];
    if (!data) {
      box.innerHTML = '<p class="empty">这一首还没有歌词数据。</p>';
      return;
    }
    ui.playingIdx = -1;
    var track = TRACKS.filter(function (t) {
      return t.n === n;
    })[0];

    var groups = [1, 2]
      .map(function (act) {
        var opts = TRACKS.filter(function (t) {
          return t.act === act;
        })
          .map(function (t) {
            return (
              '<option value="' + t.n + '"' + (t.n === n ? " selected" : "") + ">" +
              String(t.n).padStart(2, "0") + ". " + ME.esc(t.title) + "</option>"
            );
          })
          .join("");
        return '<optgroup label="第' + (act === 1 ? "一" : "二") + '幕">' + opts + "</optgroup>";
      })
      .join("");

    var lines = data.lines
      .map(function (pair, i) {
        var lt = lineTime(n, i);
        return (
          '<div class="lyric-line" data-idx="' + i + '">' +
          '<span class="lyric-no">' + String(i + 1).padStart(2, "0") + "</span>" +
          '<div class="lyric-body">' +
          '<p class="lyric-en">' +
          (pair[2] ? '<span class="speaker">' + ME.esc(pair[2]) + "</span>" : "") +
          ME.esc(pair[0]) +
          "</p>" +
          (pair[1] ? '<p class="lyric-zh">' + ME.esc(pair[1]) + "</p>" : "") +
          "</div>" +
          '<span class="line-ctl">' +
          '<button class="line-play" data-action="play-line" data-n="' +
          n +
          '" data-i="' +
          i +
          '"' +
          (lt ? "" : " disabled") +
          ' aria-label="播放这一句">▶</button>' +
          '<button class="line-loop' +
          (ui.segment && ui.segment.mode === "loop" && ui.segment.n === n && ui.segment.i === i ? " is-on" : "") +
          '" data-action="loop-line" data-n="' +
          n +
          '" data-i="' +
          i +
          '"' +
          (lt ? "" : " disabled") +
          ' aria-label="循环这一句" aria-pressed="false" title="循环这一句（R）">环</button>' +
          "</span>" +
          "</div>"
        );
      })
      .join("");

    box.innerHTML =
      '<div class="page-head">' +
      '<p class="kicker">歌词 · 第 ' + n + " 首</p>" +
      '<h2 class="serif">' + ME.esc(data.title) + "</h2>" +
      '<p class="lede">' +
      (data.singer ? "演唱：" + ME.esc(shortNames(data.singer, 2)) + " · " : "") +
      (track ? ME.formatClock(track.seconds) + " · " : "") +
      data.lines.length + " 行" +
      (hasPack(n) ? " · 已录入精读注释" : " · 暂无精读注释") +
      "</p></div>" +
      '<div class="lyric-toolbar">' +
      '<select id="lyricsSong" class="lyric-select" aria-label="选择曲目">' + groups + "</select>" +
      '<button class="primary small" data-action="play-track" data-n="' + n + '">▶ 播放这首</button>' +
      (hasPack(n)
        ? '<button class="ghost-btn" data-action="open-song" data-n="' + n + '">去精读 →</button>'
        : "") +
      "</div>" +
      '<div class="lyric-list">' + lines + "</div>";
  }

  /* ---------------- 短语库 ---------------- */

  function allPhrases() {
    var out = [];
    ANNOTATED.forEach(function (e) {
      (e.line.phrases || []).forEach(function (p) {
        out.push({
          p: p.p,
          zh: p.zh,
          ex: p.ex || "",
          exZh: p.exZh || "",
          d: p.d || "",
          type: p.type || "其他",
          lineId: e.line.id
        });
      });
    });
    return out;
  }

  function phraseTypes() {
    var set = {};
    allPhrases().forEach(function (ph) {
      set[ph.type] = 1;
    });
    return ["全部"].concat(Object.keys(set));
  }

  function renderPhrases() {
    var types = phraseTypes();
    var chips = types
      .map(function (t) {
        return (
          '<button class="type-chip' +
          (t === ui.type ? " is-on" : "") +
          '" data-action="filter-type" data-type="' +
          ME.esc(t) +
          '">' +
          ME.esc(t) +
          "</button>"
        );
      })
      .join("");

    document.getElementById("view-phrases").innerHTML =
      '<div class="page-head">' +
      '<p class="kicker">短语库</p>' +
      '<h2 class="serif">把句子拆成能带走的块</h2>' +
      '<p class="lede">共 <b>' +
      allPhrases().length +
      "</b> 条。短语比单词更值得背——它是可以直接搬进你下一句话的单位。</p>" +
      "</div>" +
      '<div class="toolbar">' +
      '<input id="phraseSearch" class="search" type="search" placeholder="搜索英文或中文…" value="' +
      ME.esc(ui.q) +
      '">' +
      '<div class="type-chips" id="typeChips">' +
      chips +
      "</div></div>" +
      '<div class="phrase-grid" id="phraseList"></div>';

    renderPhraseList();
  }

  function renderPhraseList() {
    var list = allPhrases().filter(function (ph) {
      if (ui.type !== "全部" && ph.type !== ui.type) return false;
      if (!ui.q.trim()) return true;
      var q = ui.q.trim().toLowerCase();
      return (ph.p + " " + ph.zh + " " + ph.type).toLowerCase().indexOf(q) >= 0;
    });

    var html = list.length
      ? list
          .map(function (ph) {
            return (
              '<article class="phrase-card">' +
              '<div class="pc-top"><span class="tag">' +
              ME.esc(ph.type) +
              "</span></div>" +
              '<h3 class="serif">' +
              ME.esc(ph.p) +
              "</h3>" +
              '<p class="pc-zh">' +
              ME.esc(ph.zh) +
              "</p>" +
              (ph.ex ? '<p class="pc-ex">' + ME.esc(ph.ex) + "</p>" : "") +
              (ph.exZh ? '<p class="pc-ex-zh">' + ME.esc(ph.exZh) + "</p>" : "") +
              (ph.d ? '<p class="pc-d">' + ME.esc(ph.d) + "</p>" : "") +
              '<button class="pc-src" data-action="jump-line" data-id="' +
              ME.esc(ph.lineId) +
              '">出自第 ' +
              (LINE_NO[ph.lineId] || "?") +
              " 行 · " +
              ME.esc(truncate(LINE_BY_ID[ph.lineId] ? LINE_BY_ID[ph.lineId].text : "", 34)) +
              "</button>" +
              "</article>"
            );
          })
          .join("")
      : '<p class="empty">没有匹配的短语，换个关键词试试。</p>';

    var box = document.getElementById("phraseList");
    if (box) box.innerHTML = html;
  }

  function truncate(s, n) {
    s = String(s || "");
    return s.length > n ? s.slice(0, n) + "…" : s;
  }

  function shortNames(s, max) {
    var parts = String(s || "")
      .split(/[,，/]/)
      .map(function (x) {
        return x.trim();
      })
      .filter(Boolean);
    if (parts.length <= max) return parts.join("、");
    return parts.slice(0, max).join("、") + " 等 " + parts.length + " 人";
  }

  /* ---------------- 背景 ---------------- */

  /* ---- 阅读题选项顺序：按「曲目+卡片+题号」定种子洗牌 ----
   * 存储的始终是原始选项下标（data-o），所以刷新/重渲染不会串答案。 */
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function permutation(count, seed) {
    var order = [];
    var i;
    for (i = 0; i < count; i++) order.push(i);
    var s = seed >>> 0;
    function rnd() {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    for (i = count - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    return order;
  }

  function bgKey(b, qi) {
    return (song ? song.id : "?") + ":" + b.id + ":" + qi;
  }

  function bgQuizHtml(b) {
    if (!b.quiz || !b.quiz.length) return "";
    var answeredCount = 0;
    var correctCount = 0;
    b.quiz.forEach(function (q, qi) {
      var p = state.bg[bgKey(b, qi)];
      if (p !== undefined) {
        answeredCount++;
        if (p === q.answer) correctCount++;
      }
    });
    var score = answeredCount
      ? ' <span class="bq-score">' + correctCount + " / " + answeredCount + "</span>"
      : "";
    var items = b.quiz
      .map(function (q, qi) {
        var key = bgKey(b, qi);
        var picked = state.bg[key];
        var answered = picked !== undefined;
        var order = permutation(q.options.length, hashSeed(key));
        var correctPos = order.indexOf(q.answer);
        var correctLetter = correctPos >= 0 ? "ABCD"[correctPos] : "?";
        var opts = order
          .map(function (oi, di) {
            var cls = "bq-opt";
            if (answered) {
              if (oi === q.answer) cls += " is-correct";
              else if (oi === picked) cls += " is-wrong";
            }
            return (
              '<button class="' +
              cls +
              '" data-action="bg-answer" data-card="' +
              ME.esc(b.id) +
              '" data-q="' +
              qi +
              '" data-o="' +
              oi +
              '"' +
              (answered ? " disabled" : "") +
              ">" +
              '<span class="bq-key">' +
              "ABCD"[di] +
              "</span>" +
              ME.esc(q.options[oi]) +
              "</button>"
            );
          })
          .join("");
        var exp = answered
          ? '<p class="bq-exp ' +
            (picked === q.answer ? "is-ok" : "is-no") +
            '">' +
            (picked === q.answer ? "✓ 正确。" : "✗ 正确答案 " + correctLetter + "。") +
            ME.esc(q.explain) +
            "</p>"
          : "";
        return (
          '<div class="bq"><p class="bq-q">' +
          (qi + 1) +
          ". " +
          ME.esc(q.q) +
          '</p><div class="bq-opts">' +
          opts +
          "</div>" +
          exp +
          "</div>"
        );
      })
      .join("");
    return '<div class="bg-quiz"><h4>读后自测 · Reading Check' + score + "</h4>" + items + "</div>";
  }

  /* 生词变形：preserve→preserving、turn down→turned down、leave out→left out
   * 只做常见的规则变化 + 一张不规则表，够覆盖正文里的时态/复数。 */
  var IRREGULAR = {
    be: ["was", "were", "been", "being"],
    begin: ["began", "begun"],
    break: ["broke", "broken"],
    bring: ["brought"],
    buy: ["bought"],
    catch: ["caught"],
    choose: ["chose", "chosen"],
    come: ["came"],
    do: ["did", "done"],
    drive: ["drove", "driven"],
    eat: ["ate", "eaten"],
    fall: ["fell", "fallen"],
    feel: ["felt"],
    fight: ["fought"],
    find: ["found"],
    get: ["got", "gotten"],
    give: ["gave", "given"],
    go: ["went", "gone"],
    have: ["had"],
    hold: ["held"],
    keep: ["kept"],
    leave: ["left"],
    lose: ["lost"],
    make: ["made"],
    meet: ["met"],
    pay: ["paid"],
    rise: ["rose", "risen"],
    run: ["ran"],
    say: ["said"],
    see: ["saw", "seen"],
    sell: ["sold"],
    send: ["sent"],
    sit: ["sat"],
    speak: ["spoke", "spoken"],
    stand: ["stood"],
    take: ["took", "taken"],
    teach: ["taught"],
    tell: ["told"],
    think: ["thought"],
    wear: ["wore", "worn"],
    win: ["won"],
    write: ["wrote", "written"]
  };

  function inflectWord(w) {
    var out = [w].concat(IRREGULAR[w] || []);
    if (/[^aeiou]y$/.test(w)) out.push(w.slice(0, -1) + "ies");
    else if (/(s|x|z|ch|sh)$/.test(w)) out.push(w + "es");
    else out.push(w + "s");
    if (/e$/.test(w)) {
      out.push(w + "d", w.slice(0, -1) + "ing");
    } else {
      out.push(w + "ed", w + "ing");
      if (/[^aeiou][aeiou][^aeiouwxy]$/.test(w)) out.push(w + w.slice(-1) + "ed", w + w.slice(-1) + "ing");
    }
    return out;
  }

  function wordForms(w) {
    var parts = w.split(/\s+/);
    if (parts.length === 1) return inflectWord(w);
    var tail = parts.slice(1).join(" ");
    var out = [w];
    inflectWord(parts[0]).forEach(function (h) {
      out.push(h + " " + tail);
    });
    return out;
  }

  function linkGlossary(text, glossary) {
    if (!glossary || !glossary.length) return ME.esc(text);
    var map = {};
    var keys = [];
    glossary.forEach(function (g) {
      if (!g.w || g.w.indexOf("/") >= 0 || g.w.length < 2) return;
      var base = String(g.w).toLowerCase();
      wordForms(base).forEach(function (f) {
        if (map[f] === undefined) {
          map[f] = g.zh;
          keys.push(f);
        }
      });
    });
    if (!keys.length) return ME.esc(text);
    keys.sort(function (a, b) {
      return b.length - a.length;
    });
    /* 边界不用 \b：\b 只认 ASCII 单词字符，cliché 这种带重音的词会匹配失败。
     * 这里用「前一个字符不是字母数字」+「后面不是字母数字」代替。 */
    var re = new RegExp(
      "(^|[^A-Za-z0-9])(" +
        keys
          .map(function (k) {
            return k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          })
          .join("|") +
        ")(?![A-Za-z0-9])",
      "gi"
    );
    return ME.esc(text).replace(re, function (all, pre, m) {
      var zh = map[m.toLowerCase()];
      if (!zh) return all;
      return pre + '<span class="w" tabindex="0" data-tip="' + ME.esc(zh) + '">' + m + "</span>";
    });
  }

  function renderStory() {
    var bgs = song.background || [];
    var cards = bgs
      .map(function (b) {
        var kindText = b.kind === "craft" ? "创作手记" : "历史故事";
        var sources =
          b.sources && b.sources.length
            ? '<div class="bg-sources"><span>参考</span>' +
              b.sources
                .map(function (s) {
                  return (
                    '<a href="' + ME.esc(s.url) + '" target="_blank" rel="noopener">' +
                    ME.esc(s.title) + "</a>"
                  );
                })
                .join("") +
              "</div>"
            : "";
        return (
          '<article class="bg-card" id="bg-' +
          ME.esc(b.id) +
          '"><p class="bg-kind">' +
          kindText +
          '</p><h3 class="serif">' +
          ME.esc(b.titleEn || b.title) +
          "</h3>" +
          (b.title && b.title !== b.titleEn && /[\u4e00-\u9fff]/.test(b.title)
            ? '<p class="bg-zh">' + ME.esc(b.title) + "</p>"
            : "") +
          '<p class="bg-en">' +
          linkGlossary(b.bodyEn || b.body, b.glossary) +
          "</p>" +
          bgQuizHtml(b) +
          sources +
          "</article>"
        );
      })
      .join("");

    var html =
      '<div class="page-head">' +
      '<p class="kicker">背景阅读</p>' +
      '<h2 class="serif">历史事件，用故事讲清楚</h2>' +
      '<p class="lede">场景、人物、冲突、转折、结局。划线词点一下就能查中文，读完做两道题。</p>' +
      "</div>" +
      '<div class="bg-grid">' +
      cards +
      "</div>" +
      '<h3 class="block-title serif">时间线</h3>' +
      '<ol class="timeline">' +
      (song.timeline || [])
        .map(function (t) {
          return '<li><span class="year">' + ME.esc(t.year) + "</span><span>" + ME.esc(t.event) + "</span></li>";
        })
        .join("") +
      "</ol>";

    document.getElementById("view-story").innerHTML = html;
  }

  /* ---------------- 复习 ---------------- */

  function reviewQueue() {
    var now = Date.now();
    var due = CARDS.filter(function (c) {
      return ME.isDue(state.srs[c.key], now);
    }).sort(function (a, b) {
      return state.srs[a.key].due - state.srs[b.key].due;
    });
    var fresh = CARDS.filter(function (c) {
      return ME.isNew(state.srs[c.key]);
    });
    var day = state.daily[ME.todayKey()] || { new: 0 };
    var allow = Math.max(0, (state.settings.newPerDay || 0) - (day.new || 0));
    return due
      .concat(fresh.slice(0, allow))
      .map(function (c) {
        return c.key;
      });
  }

  function renderReview() {
    var box = document.getElementById("view-review");
    if (ui.session) {
      renderSession(box);
      return;
    }

    var now = Date.now();
    var due = CARDS.filter(function (c) {
      return ME.isDue(state.srs[c.key], now);
    }).length;
    var fresh = CARDS.filter(function (c) {
      return ME.isNew(state.srs[c.key]);
    }).length;
    var learned = CARDS.filter(function (c) {
      var st = state.srs[c.key];
      return st && st.last && st.interval >= 21;
    }).length;
    var queue = reviewQueue();
    var day = state.daily[ME.todayKey()] || { new: 0, reviews: 0 };

    box.innerHTML =
      '<div class="page-head">' +
      '<p class="kicker">复习</p>' +
      '<h2 class="serif">' +
      (queue.length ? "今天要复习 " + queue.length + " 张" : "今天的复习清空了") +
      "</h2>" +
      '<p class="lede">间隔重复：忘掉的当天再见，记住的隔几天再见。只背你在这首歌里真正遇到过的词。</p>' +
      "</div>" +
      '<div class="stat-grid">' +
      stat("待复习", due, "今天到期") +
      stat("新卡", fresh, "尚未学") +
      stat("已掌握", learned, "间隔 ≥ 21 天") +
      stat("总卡片", CARDS.length, "覆盖 " + ANNOTATED.length + " 行") +
      "</div>" +
      '<div class="today-line">今日：新学 ' +
      (day.new || 0) +
      " · 复习 " +
      (day.reviews || 0) +
      " 次</div>" +
      '<div class="review-cta">' +
      '<button class="primary" data-action="start-review"' +
      (queue.length ? "" : " disabled") +
      ">" +
      (queue.length ? "开始复习（" + queue.length + " 张）" : "今天没有待复习的卡片") +
      "</button>" +
      '<p class="hint">词汇/短语：按 1–4 选答案；语法：空格翻面，1–4 评分。</p>' +
      "</div>";
  }

  function stat(label, value, sub) {
    return (
      '<div class="stat"><span class="stat-label">' +
      label +
      '</span><b class="stat-value">' +
      value +
      '</b><span class="stat-sub">' +
      sub +
      "</span></div>"
    );
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /* 干扰项：同类型优先，不够 3 个再用本曲的词/短语意思补，保证四选一。
   * （语法卡的 back 是长段解释，不拿来当干扰项，避免长度暴露答案） */
  function buildOptions(card) {
    var pool = [];
    function collect(sameTypeOnly) {
      CARDS.forEach(function (x) {
        if (x.key === card.key) return;
        if (x.type === "grammar") return;
        if (sameTypeOnly && x.type !== card.type) return;
        if (!x.back || x.back === card.back) return;
        if (pool.indexOf(x.back) === -1) pool.push(x.back);
      });
    }
    collect(true);
    if (pool.length < 3) collect(false);
    var picked = shuffle(pool)
      .slice(0, 3)
      .map(function (t) {
        return { text: t, correct: false };
      });
    picked.push({ text: card.back, correct: true });
    return shuffle(picked);
  }

  function quizBody(c, s) {
    var answered = s.answer !== null;
    var opts = (s.opts || [])
      .map(function (o, i) {
        var cls = "quiz-opt";
        if (answered) {
          if (o.correct) cls += " is-correct";
          else if (i === s.answer) cls += " is-wrong";
        }
        return (
          '<button class="' +
          cls +
          '" data-action="answer" data-o="' +
          i +
          '"' +
          (answered ? " disabled" : "") +
          ">" +
          '<span class="opt-key">' +
          "ABCD"[i] +
          "</span>" +
          '<span class="opt-text">' +
          ME.esc(o.text) +
          "</span></button>"
        );
      })
      .join("");

    var ok = answered && s.opts[s.answer] && s.opts[s.answer].correct;

    var tail = answered
      ? '<div class="quiz-feedback ' +
        (ok ? "is-ok" : "is-no") +
        '">' +
        '<p class="qf-title">' +
        (ok ? "✓ 答对了" : s.answer === -1 ? "没关系，先认识它" : "✗ 再记一次") +
        "</p>" +
        '<p class="rc-back">' +
        ME.esc(c.back) +
        "</p>" +
        (c.detail ? '<p class="rc-detail">' + ME.esc(c.detail) + "</p>" : "") +
        '<p class="rc-src">“' +
        ME.esc(truncate(c.lineText, 90)) +
        "”</p></div>" +
        '<div class="quiz-actions">' +
        '<button class="primary" data-action="quiz-next">继续 <span class="kbd">空格</span></button>' +
        (ok ? '<button class="ghost-btn" data-action="quiz-easy">太简单</button>' : "") +
        "</div>"
      : '<button class="ghost-btn quiz-skip" data-action="answer" data-o="-1">没印象，直接看答案</button>';

    return (
      '<p class="quiz-prompt">' +
      (answered ? "正确答案" : "哪个是它的中文意思？") +
      "</p>" +
      '<div class="quiz-options">' +
      opts +
      "</div>" +
      tail
    );
  }

  function grammarBody(c, s, st) {
    if (!s.revealed) {
      return '<button class="primary reveal" data-action="reveal">显示答案 <span class="kbd">空格</span></button>';
    }
    return (
      '<div class="rc-answer">' +
      '<p class="rc-back">' +
      ME.esc(c.back) +
      "</p>" +
      (c.detail ? '<p class="rc-detail">' + ME.esc(c.detail) + "</p>" : "") +
      '<p class="rc-src">“' +
      ME.esc(truncate(c.lineText, 90)) +
      "”</p>" +
      "</div>" +
      '<div class="ratings">' +
      [0, 1, 2, 3]
        .map(function (r) {
          var labels = ["忘记", "模糊", "记住", "太简单"];
          return (
            '<button class="rate r' +
            r +
            '" data-action="grade" data-r="' +
            r +
            '"><span class="rl">' +
            labels[r] +
            '</span><span class="ri">' +
            ME.dueLabel(st, r) +
            "</span></button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderSession(box) {
    var s = ui.session;
    if (s.idx >= s.queue.length) {
      box.innerHTML =
        '<div class="review-done">' +
        '<p class="kicker">本轮完成</p>' +
        '<h2 class="serif">' +
        s.done +
        " 张</h2>" +
        '<div class="sum-grid">' +
        '<div><b>' + (s.stats[0] || 0) + "</b><span>忘记</span></div>" +
        '<div><b>' + (s.stats[1] || 0) + "</b><span>模糊</span></div>" +
        '<div><b>' + (s.stats[2] || 0) + "</b><span>记住</span></div>" +
        '<div><b>' + (s.stats[3] || 0) + "</b><span>太简单</span></div>" +
        "</div>" +
        saveCardHtml() +
        '<div class="cta-row"><button class="primary" data-action="start-review">再来一轮</button>' +
        '<button class="ghost-btn" data-action="end-review">回到概览</button></div>' +
        "</div>";
      return;
    }

    var key = s.queue[s.idx];
    var c = CARD_BY_KEY[key];
    var st = state.srs[key];
    var remaining = s.queue.length - s.idx;
    var isQuiz = c.type !== "grammar";

    if (isQuiz && s.cardKey !== c.key) {
      s.cardKey = c.key;
      s.opts = buildOptions(c);
      s.answer = null;
      s.revealed = false;
    }

    var head =
      '<div class="rc-front-row">' +
      '<p class="rc-front serif">' +
      ME.esc(c.front) +
      "</p>" +
      (isQuiz
        ? '<button class="speak-btn" data-action="speak" data-text="' + ME.esc(c.front) + '" title="朗读">🔊</button>'
        : "") +
      "</div>" +
      (c.ipa ? '<p class="rc-ipa">' + ME.esc(c.ipa) + "</p>" : "") +
      (c.tag && c.type !== "grammar" ? '<p class="rc-tag">' + ME.esc(c.tag) + "</p>" : "");

    box.innerHTML =
      '<div class="review-shell">' +
      '<div class="review-top"><span class="tag tag-' +
      c.type +
      '">' +
      TYPE_LABEL[c.type] +
      "</span>" +
      '<span class="review-count">剩余 ' +
      remaining +
      ' 张</span></div>' +
      '<div class="review-card">' +
      head +
      (isQuiz ? quizBody(c, s) : grammarBody(c, s, st)) +
      "</div></div>";
  }

  function startReview() {
    var q = reviewQueue();
    if (!q.length) {
      toast("今天没有待复习的卡片");
      return;
    }
    ui.session = {
      queue: q,
      idx: 0,
      revealed: false,
      done: 0,
      stats: {},
      answer: null,
      opts: [],
      cardKey: null
    };
    if (ui.view !== "review") switchView("review");
    else renderReview();
  }

  function reveal() {
    if (!ui.session) return;
    ui.session.revealed = true;
    renderReview();
  }

  function answer(o) {
    var s = ui.session;
    if (!s || s.answer !== null) return;
    s.answer = o;
    s.revealed = true;
    renderReview();
  }

  function grade(r) {
    var s = ui.session;
    if (!s || !s.revealed) return;
    var key = s.queue[s.idx];
    var wasNew = ME.isNew(state.srs[key]);
    state.srs[key] = ME.rate(state.srs[key], r);
    var dk = ME.todayKey();
    var day = state.daily[dk] || (state.daily[dk] = { new: 0, reviews: 0 });
    if (wasNew) day.new += 1;
    else day.reviews += 1;
    ME.saveState(state);
    s.stats[r] = (s.stats[r] || 0) + 1;
    s.done += 1;
    s.idx += 1;
    s.revealed = false;
    s.answer = null;
    s.opts = [];
    s.cardKey = null;
    if (r === 0) s.queue.push(key);
    renderReview();
    renderProgress();
  }

  /* ---------------- 设置 ---------------- */

  /* 导出进度 JSON：文件名带日期，方便一天一份 */
  function exportState() {
    var name = "musical-english-" + ME.todayKey() + ".json";
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1500);
  }

  function clockNow() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /* 「保存」卡片：学完一首 / 复习完一轮时出现，手动再存一份当天存档 */
  function saveCardHtml() {
    return (
      '<div class="save-card">' +
      '<div class="save-text"><b>保存进度</b>' +
      '<span class="save-time">最近保存：' +
      clockNow() +
      "</span></div>" +
      '<button class="primary small" data-action="save-now">保存</button>' +
      "</div>"
    );
  }

  function snapshotHtml() {
    var days = ME.listSnapshots ? ME.listSnapshots() : [];
    if (!days.length) {
      return '<p class="hint">今天还没有快照——答一道题、标记一次「已掌握」就会自动生成。</p>';
    }
    return (
      '<div class="snap-list">' +
      days
        .map(function (d) {
          return (
            '<button class="ghost-btn snap-btn" data-action="restore-snap" data-day="' +
            ME.esc(d) +
            '">' +
            ME.esc(d) +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderSettings() {
    var ov = currentLyrics();
    var text = ov ? ov.map(function (r) { return r.text; }).join("\n") : "";

    document.getElementById("view-settings").innerHTML =
      '<div class="page-head">' +
      '<p class="kicker">设置</p>' +
      '<h2 class="serif">歌词与数据</h2>' +
      "</div>" +
      '<div class="panel">' +
      "<h3>导入你自己的歌词</h3>" +
      "<p>每行一句贴进来。注释会按句子锚点自动挂上去；没匹配上的行会保留为「未注释」，方便先通读全曲。</p>" +
      '<textarea id="lyricsInput" rows="9" placeholder="把歌词按行粘在这里…">' +
      ME.esc(text) +
      "</textarea>" +
      '<div class="row"><button class="primary" data-action="apply-lyrics">应用歌词</button>' +
      '<button class="ghost-btn" data-action="restore-lyrics">恢复样板歌词</button></div>' +
      (ov
        ? '<p class="hint">当前：' + ov.length + " 行，已匹配注释 " + matchedCount() + " 行。</p>"
        : '<p class="hint">当前使用内置的 8 行样板歌词。</p>') +
      "</div>" +
      '<div class="panel">' +
      "<h3>每日新卡上限</h3>" +
      '<p>每天最多引入多少张新卡。复习卡不受限制。</p>' +
      '<input id="newPerDay" type="number" min="0" max="60" step="1" value="' +
      (state.settings.newPerDay || 0) +
      '">' +
      "</div>" +
      '<div class="panel">' +
      "<h3>学习数据</h3>" +
      "<p>进度存在这台电脑的浏览器里。换设备或清浏览器数据前，先导出一份。</p>" +
      '<div class="row"><button class="primary" data-action="export">导出进度 JSON</button>' +
      '<button class="ghost-btn" data-action="import-state">导入进度</button>' +
      '<button class="ghost-btn danger" data-action="reset">清空全部进度</button></div>' +
      "</div>" +
      '<div class="panel">' +
      "<h3>保存进度</h3>" +
      "<p>每答一题都会自动保存；每天另存一份，保留最近 7 天。点下面的「保存」会同时导出一份 JSON（文件名带日期），误点「清空」或导入错文件时，可以从这里退回。</p>" +
      snapshotHtml() +
      "</div>" +
      '<div class="panel">' +
      "<h3>版权与使用</h3>" +
      "<p>本工具仅用于个人英语学习，请勿商用、请勿再分发。歌词、录音、剧照的版权归 Lin-Manuel Miranda、Atlantic Records 及相关权利人所有，本站不主张任何相关权利。</p>" +
      '<p>如有侵权，请邮件 <a href="mailto:' +
      ME.CONTACT +
      '">' +
      ME.CONTACT +
      '</a>，核实后 48 小时内下架。完整声明见 <a href="NOTICE.md" target="_blank" rel="noopener">NOTICE.md</a>。</p>' +
      "</div>";
  }

  /* ---------------- 朗读 ---------------- */

  function speak(text) {
    if (!text || !window.speechSynthesis) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* 没有语音引擎就安静跳过 */
    }
  }

  /* ---------------- 音频 ---------------- */

  /* 手机（尤其 iOS）上 play() 可能因为元数据没就绪被拒；等 canplay 再试一次 */
  function safePlay(el, retried) {
    var p = el.play();
    if (!p || !p.catch) return;
    p.catch(function () {
      if (retried) {
        toast("再点一次播放键");
        return;
      }
      var once = function () {
        el.removeEventListener("canplay", once);
        safePlay(el, true);
      };
      el.addEventListener("canplay", once);
      if (el.readyState >= 2) once();
    });
  }

  /* iOS 上偶发：paused=false、currentTime 却卡在 0（有元数据、不走进度）。
   * 等 1.6s 仍为 0 且已经有元数据时，重载一次再播；同一首歌只补一次，避免打架。 */
  var stallTimer = null;
  function watchStall() {
    clearTimeout(stallTimer);
    var el = audio.el;
    if (!el) return;
    stallTimer = setTimeout(function () {
      if (!el || el.paused || el.currentTime > 0.2) return;
      if (el.readyState < 1) return;
      if (el.__recovered) {
        toast("声音没起来，再点一次播放键");
        return;
      }
      el.__recovered = true;
      try {
        el.load();
      } catch (e) {}
      safePlay(el, true);
    }, 1600);
  }

  function setupAudio() {
    var a = new Audio();
    a.preload = "metadata";
    a.setAttribute("playsinline", "");
    a.setAttribute("webkit-playsinline", "");
    /* iOS 对 display:none 的媒体元素可能不播，改成移出屏幕但仍参与布局 */
    a.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(a);
    a.addEventListener("loadedmetadata", function () {
      audio.ready = true;
      renderDock();
    });
    a.addEventListener("canplay", function () {
      if (!audio.ready) {
        audio.ready = true;
        renderDock();
      }
    });
    a.addEventListener("error", function () {
      /* 加载失败也保留播放器 UI，只提示错误码，避免整条 dock 消失 */
      audio.failed = a.error ? a.error.code : -1;
      renderDock();
    });
    a.addEventListener("timeupdate", updateAudioUI);
    a.addEventListener("play", function () {
      updateAudioUI();
      if (ui.view === "library") renderLibrary();
    });
    a.addEventListener("pause", function () {
      savePosNow();
      updateAudioUI();
      if (ui.view === "library") renderLibrary();
    });
    a.addEventListener("ended", function () {
      if (audio.track) ME.clearPos(audio.track.n);
      updateAudioUI();
    });
    window.addEventListener("pagehide", savePosNow);
    var first = TRACKS[0];
    if (first) {
      a.src = first.file;
      audio.track = first;
    } else if (song && song.audioSrc) {
      a.src = song.audioSrc;
    }
    a.playbackRate = state.settings.rate || 1;
    audio.el = a;
    /* ready 表示「有音源」，不再依赖 metadata 事件；否则 iOS 上 dock 会停在空状态 */
    audio.ready = !!a.src;
    if (a.readyState >= 1) audio.ready = true;
  }

  function renderDock() {
    var d = document.getElementById("dock");
    if (!audio.ready) {
      var err = audio.el && audio.el.error ? audio.el.error.code : 0;
      var isFile = location.protocol === "file:";
      var note = isFile
        ? "♪ 浏览器在 file:// 下会拦截音频。双击项目里的 <code>start.bat</code> 用本地服务打开，音频才可用；也可以先用"
        : "♪ 还没有音频" +
          (err ? "（加载失败，错误码 " + err + "）" : "") +
          "：把文件放到 <code>" +
          ME.esc((song && song.audioSrc) || "audio/" + SHOW_ID + "/") +
          "</code>，或";
      d.innerHTML =
        '<div class="dock-inner dock-empty">' +
        '<span class="dock-note">' +
        note +
        "</span>" +
        '<button class="ghost-btn" data-action="pick-audio">选择本地文件</button>' +
        "</div>";
      return;
    }
    d.innerHTML =
      '<div class="dock-inner">' +
      '<button class="play-btn" data-action="audio-toggle" aria-label="播放/暂停">' +
      (audio.el.paused ? "▶" : "❚❚") +
      "</button>" +
      '<div class="dock-track">' +
      '<div class="dock-meta"><span>' +
      ME.esc(audio.track ? audio.track.title : audio.name || (song && song.title) || "") +
      '</span><span id="audioTime">0:00 / 0:00</span></div>' +
      '<input id="seek" type="range" min="0" max="1000" value="0" aria-label="播放进度">' +
      "</div>" +
      '<div class="dock-modes">' +
      '<button class="mode-btn" data-action="toggle-loop" title="单句循环（R）" aria-label="单句循环" aria-pressed="false">环</button>' +
      '<span class="seg-chip" id="segChip"></span>' +
      "</div>" +
      '<select id="rateSel" aria-label="播放速度">' +
      [0.5, 0.75, 1, 1.25, 1.5]
        .map(function (r) {
          return '<option value="' + r + '"' + (Number(state.settings.rate) === r ? " selected" : "") + ">" + r + "×</option>";
        })
        .join("") +
      "</select>" +
      '<button class="ghost-btn small" data-action="pick-audio">换音频</button>' +
      "</div>";
    updateSegChip();
    updateAudioUI();
  }

  function updateLyricHighlight() {
    if (ui.view !== "lyrics") return;
    var n = ui.lyricsN;
    var arr = TIMES[String(n)] || [];
    var active = -1;
    if (audio.el && audio.track && audio.track.n === n) {
      var t = audio.el.currentTime;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && t >= arr[i][0] && t < arr[i][1]) {
          active = i;
          break;
        }
      }
    }
    var prev = document.querySelector(".lyric-line.is-playing");
    if (prev) prev.classList.remove("is-playing");
    if (active < 0 && ui.segment && ui.segment.n === n) active = ui.segment.i;
    if (active >= 0) {
      var el = document.querySelector('.lyric-line[data-idx="' + active + '"]');
      if (el) {
        el.classList.add("is-playing");
        if (active !== ui.playingIdx) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }
    }
    ui.playingIdx = active;
  }

  function updateAudioUI() {
    var el = audio.el;
    var seg = ui.segment;
    /* timeupdate 兜底：定时器被系统节流时也能收住句尾 */
    if (seg && el && !el.paused && el.currentTime >= seg.end - 0.03) finishSegment();
    if (el) {
      var btn = document.querySelector(".play-btn");
      if (btn) btn.textContent = el.paused ? "▶" : "❚❚";
      var t = document.getElementById("audioTime");
      if (t) t.textContent = ME.formatClock(el.currentTime) + " / " + ME.formatClock(el.duration || 0);
      var seek = document.getElementById("seek");
      if (seek && el.duration) {
        if (document.activeElement !== seek) seek.value = String(Math.round((el.currentTime / el.duration) * 1000));
      }
    }
    if (audio.track && el && !el.paused) {
      var now = Date.now();
      if (now - (ui.posSavedAt || 0) > 3000) {
        ui.posSavedAt = now;
        ME.savePos(audio.track.n, el.currentTime);
      }
    }
    updateLyricHighlight();
    markPlayingLine();
  }

  function pickAudio() {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      if (!f) return;
      audio.el.src = URL.createObjectURL(f);
      audio.el.load();
      audio.ready = true;
      audio.track = null;
      audio.name = f.name;
      renderDock();
      toast("已载入 " + f.name);
    });
    input.click();
  }

  function toggleAudio() {
    if (!audio.el) return;
    if (!audio.el.src && audio.track) {
      audio.el.src = audio.track.file;
      audio.ready = true;
      audio.el.load();
      renderDock();
    }
    if (audio.el.paused) {
      /* 循环中按下播放键：从这一句的开头接着来，而不是播整首 */
      if (ui.segment && audio.el.currentTime >= ui.segment.end - 0.1) {
        audio.el.currentTime = ui.segment.start;
      }
      safePlay(audio.el);
      if (ui.segment) armSegment();
    } else {
      audio.el.pause();
      clearSegmentTimer();
    }
  }

  /* ---------------- 导入歌词 ---------------- */

  function importLyrics(text) {
    var raw = String(text)
      .split(/\r?\n/)
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s.length > 0;
      });
    var rows = raw.map(function (t, i) {
      return { id: "i" + (i + 1), text: t };
    });
    var used = {};
    var matched = 0;

    ANNOTATED.forEach(function (e) {
      var anchor = ME.norm(e.line.anchor || e.line.text);
      if (anchor.length < 8) return;
      for (var i = 0; i < rows.length; i++) {
        if (used[i]) continue;
        var n = ME.norm(rows[i].text);
        if (n.length < 8) continue;
        if (n.indexOf(anchor) >= 0 || (anchor.indexOf(n) >= 0 && n.length >= anchor.length * 0.6)) {
          rows[i].id = e.line.id;
          used[i] = 1;
          matched += 1;
          break;
        }
      }
    });

    state.lyrics[song.id] = { lines: rows, matched: matched, at: Date.now() };
    ME.saveState(state);
    return { total: rows.length, matched: matched };
  }

  /* ---------------- 进度条 / 提示 ---------------- */

  function renderProgress() {
    var total = ANNOTATED.length || 1;
    var done = masteredCount();
    var fill = document.getElementById("progressFill");
    if (fill) fill.style.width = Math.round((done / total) * 100) + "%";

    var now = Date.now();
    var due = CARDS.filter(function (c) {
      return ME.isDue(state.srs[c.key], now);
    }).length;
    var badge = document.getElementById("dueBadge");
    if (badge) {
      badge.hidden = due === 0;
      badge.textContent = String(due);
    }
  }

  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("is-show");
    }, 1900);
  }

  /* ---------------- 视图切换 ---------------- */

  function setActiveSong(id) {
    if (!SONGS[id] || (song && id === song.id)) return;
    song = SONGS[id];
    ACTIVE_ID = id;
    ui.open = {};
    ui.session = null;
    rebuildDerived();
  }

  /* 切曲：pack 没加载过就先注入脚本，加载完再切 */
  function switchStudy(id, done) {
    if (!id) return;
    ui.routePush = true;
    if (SONGS[id]) {
      setActiveSong(id);
      switchView("study");
      if (done) done();
      return;
    }
    toast("正在载入曲目内容…");
    loadPack(id, function () {
      setActiveSong(id);
      switchView("study");
      if (done) done();
    });
  }

  function updateBrand() {
    var t = document.getElementById("songTitle");
    var sub = document.getElementById("songSub");
    if (!t || !sub) return;
    if (SONG_VIEWS.indexOf(ui.view) >= 0 && song) {
      t.textContent = song.title;
      sub.textContent =
        song.show.replace(": An American Musical", "") + " · " + song.writer + " · " + song.year;
    } else if (ui.view === "library") {
      t.textContent = "曲库";
      sub.textContent = (SHOW ? SHOW.title : "") + " · " + TRACKS.length + " 首";
    } else if (ui.view === "lyrics") {
      var d = LYRICS[String(ui.lyricsN)];
      t.textContent = d ? d.title : "歌词";
      sub.textContent = "英中逐行对照";
    } else {
      var names = { phrases: "短语库", review: "复习", settings: "设置", story: "背景阅读" };
      t.textContent = names[ui.view] || "剧读";
      sub.textContent = (SHOW ? SHOW.title : "Musical English") + (song ? " · 第 " + song.n + " 首" : "");
    }
  }

  function updateSongbar() {
    if (!song) return;
    var meta = document.getElementById("songbarMeta");
    if (meta) {
      meta.innerHTML =
        '<button class="sb-show" data-action="tab" data-view="library">' +
        ME.esc(SHOW ? SHOW.title : "曲库") +
        "</button>" +
        '<span class="sb-sep">›</span>' +
        '<span class="sb-title">第 ' + song.n + " 首 · " + ME.esc(song.title) + "</span>" +
        '<span class="sb-stat">' + masteredCount() + " / " + ANNOTATED.length + " 行</span>";
    }
    var sel = document.getElementById("songSelect");
    if (sel) sel.value = String(song.n);
    document.querySelectorAll(".subtab").forEach(function (t) {
      t.classList.toggle("is-active", t.getAttribute("data-sub") === ui.view);
    });
    var list = packs();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === song.id) idx = i;
    }
    var prev = document.getElementById("prevSong");
    var next = document.getElementById("nextSong");
    if (prev) prev.disabled = idx <= 0;
    if (next) next.disabled = idx < 0 || idx >= list.length - 1;
  }

  var routing = false;

  /* 把当前视图写回地址栏：?show=poto&n=7&view=study&line=l12 */
  function writeRoute(kind) {
    if (!SHOW || routing) return;
    var q;
    try {
      q = new URLSearchParams(location.search);
    } catch (e) {
      return;
    }
    q.set("show", SHOW.id);
    if (ui.view === "lyrics") {
      q.set("n", String(ui.lyricsN || 1));
      q.delete("view");
    } else if (SONG_VIEWS.indexOf(ui.view) >= 0 && song) {
      q.set("n", String(song.n));
      q.set("view", ui.view);
    } else if (ui.view !== "library") {
      q.delete("n");
      q.set("view", ui.view);
    } else {
      q.delete("n");
      q.delete("view");
    }
    if (ui.focusLine) q.set("line", ui.focusLine);
    else q.delete("line");
    var url = location.pathname + "?" + q.toString();
    try {
      history[kind === "push" ? "pushState" : "replaceState"]({ route: 1 }, "", url);
    } catch (e) {}
  }

  /* 浏览器前进/后退：同一剧目就地切，不同剧目整页重载 */
  function applyRoute() {
    var q;
    try {
      q = new URLSearchParams(location.search);
    } catch (e) {
      return;
    }
    if ((q.get("show") || "") !== (SHOW ? SHOW.id : "")) {
      location.reload();
      return;
    }
    var n = Number(q.get("n")) || 0;
    var view = q.get("view") || "";
    routing = true;
    if (n && packIdFor(n)) {
      var pid = packIdFor(n);
      var go = function () {
        setActiveSong(pid);
        switchView(view && SONG_VIEWS.indexOf(view) >= 0 ? view : "study");
        routing = false;
      };
      if (SONGS[pid]) go();
      else loadPack(pid, go);
      return;
    }
    switchView(view && view !== "library" ? view : "library");
    routing = false;
  }

  function switchView(name) {
    ui.view = name;
    ["study", "library", "lyrics", "phrases", "story", "review", "settings"].forEach(function (v) {
      var el = document.getElementById("view-" + v);
      if (el) el.classList.toggle("is-active", v === name);
    });
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("is-active", t.getAttribute("data-view") === name);
    });

    var inSong = SONG_VIEWS.indexOf(name) >= 0;
    var bar = document.getElementById("songbar");
    if (bar) bar.hidden = !inSong;
    if (inSong) updateSongbar();

    if (name === "study") renderStudy();
    else if (name === "library") renderLibrary();
    else if (name === "lyrics") renderLyrics();
    else if (name === "phrases") renderPhrases();
    else if (name === "story") renderStory();
    else if (name === "review") renderReview();
    else if (name === "settings") renderSettings();
    updateBrand();
    renderProgress();
    document.body.classList.remove("nav-hidden");
    lastScrollY = 0;
    window.scrollTo({ top: 0, behavior: "smooth" });
    var push = !!ui.routePush;
    ui.routePush = false;
    writeRoute(push ? "push" : "replace");
  }

  function jumpToLine(id) {
    ui.focusLine = id;
    ui.open[id] = true;
    if (ui.view !== "study") switchView("study");
    else renderStudy();
    var el = document.querySelector('[data-line="' + id + '"]');
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("is-flash");
      setTimeout(function () {
        el.classList.remove("is-flash");
      }, 1400);
    }
    writeRoute("replace");
  }

  function openBg(id) {
    switchView("story");
    var el = document.getElementById("bg-" + id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("is-flash");
      setTimeout(function () {
        el.classList.remove("is-flash");
      }, 1400);
    }
  }

  /* ---------------- 事件 ---------------- */

  document.addEventListener("click", function (e) {
    var target = e.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");

    if (action === "lib-filter") {
      ui.libFilter = target.getAttribute("data-filter") || "all";
      renderLibrary();
    } else if (action === "peek-zh") {
      var zid = target.getAttribute("data-id");
      ui.zh[zid] = !ui.zh[zid];
      renderStudy();
    } else if (action === "toggle-line") {
      var id = target.getAttribute("data-id");
      ui.open[id] = !ui.open[id];
      renderStudy();
    } else if (action === "master") {
      var mid = target.getAttribute("data-id");
      var key = masterKey(mid);
      var rec = state.lines[key] || {};
      rec.mastered = !rec.mastered;
      state.lines[key] = rec;
      ME.saveState(state);
      renderStudy();
      renderProgress();
      toast(rec.mastered ? "已标记「已掌握」" : "已取消标记");
    } else if (action === "jump-line") {
      jumpToLine(target.getAttribute("data-id"));
    } else if (action === "open-lyrics") {
      ui.lyricsN = Number(target.getAttribute("data-n"));
      switchView("lyrics");
    } else if (action === "play-line") {
      playSegment(Number(target.getAttribute("data-n")), Number(target.getAttribute("data-i")), "line");
    } else if (action === "loop-line") {
      var lN = Number(target.getAttribute("data-n"));
      var lI = Number(target.getAttribute("data-i"));
      if (ui.segment && ui.segment.mode === "loop" && ui.segment.n === lN && ui.segment.i === lI) stopSegment();
      else playSegment(lN, lI, "loop");
    } else if (action === "toggle-loop") {
      toggleLoop();
    } else if (action === "stop-seg") {
      stopSegment();
    } else if (action === "play-track") {
      playTrack(Number(target.getAttribute("data-n")));
    } else if (action === "open-song") {
      var songN = Number(target.getAttribute("data-n"));
      var packId = songN ? packIdFor(songN) : null;
      if (packId) switchStudy(packId);
      else switchView("study");
    } else if (action === "open-bg") {
      openBg(target.getAttribute("data-id"));
    } else if (action === "bg-answer") {
      var bcard = target.getAttribute("data-card");
      var bqi = Number(target.getAttribute("data-q"));
      var bkey = (song ? song.id : "?") + ":" + bcard + ":" + bqi;
      if (state.bg[bkey] === undefined) {
        state.bg[bkey] = Number(target.getAttribute("data-o"));
        ME.saveState(state);
        renderStory();
      }
    } else if (action === "tab") {
      switchView(target.getAttribute("data-view"));
    } else if (action === "prev-song" || action === "next-song") {
      var list = packs();
      var ci = -1;
      for (var pi = 0; pi < list.length; pi++) {
        if (list[pi].id === song.id) ci = pi;
      }
      var ni = action === "next-song" ? ci + 1 : ci - 1;
      if (ni >= 0 && ni < list.length) switchStudy(list[ni].id);
      else toast(action === "next-song" ? "已经是最后一首精读曲目" : "已经是第一首");
    } else if (action === "go-phrases") {
      switchView("phrases");
    } else if (action === "filter-type") {
      ui.type = target.getAttribute("data-type");
      document.querySelectorAll(".type-chip").forEach(function (c) {
        c.classList.toggle("is-on", c.getAttribute("data-type") === ui.type);
      });
      renderPhraseList();
    } else if (action === "start-review") {
      startReview();
    } else if (action === "reveal") {
      reveal();
    } else if (action === "answer") {
      answer(Number(target.getAttribute("data-o")));
    } else if (action === "quiz-next") {
      var qs = ui.session;
      var qok = qs && qs.answer !== null && qs.opts[qs.answer] && qs.opts[qs.answer].correct;
      grade(qok ? 2 : 0);
    } else if (action === "quiz-easy") {
      grade(3);
    } else if (action === "speak") {
      speak(target.getAttribute("data-text"));
    } else if (action === "grade") {
      grade(Number(target.getAttribute("data-r")));
    } else if (action === "end-review") {
      ui.session = null;
      renderReview();
    } else if (action === "apply-lyrics") {
      var ta = document.getElementById("lyricsInput");
      if (!ta || !ta.value.trim()) {
        toast("先粘贴歌词再应用");
        return;
      }
      var res = importLyrics(ta.value);
      renderSettings();
      renderProgress();
      toast("已导入 " + res.total + " 行，挂上注释 " + res.matched + " 行");
    } else if (action === "restore-lyrics") {
      delete state.lyrics[song.id];
      ME.saveState(state);
      renderSettings();
      toast("已恢复样板歌词");
    } else if (action === "export") {
      exportState();
      toast("进度已导出");
    } else if (action === "import-state") {
      var fi = document.createElement("input");
      fi.type = "file";
      fi.accept = "application/json,.json";
      fi.addEventListener("change", function () {
        var f = fi.files && fi.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var data = JSON.parse(String(reader.result));
            if (!data || typeof data !== "object" || !data.srs) throw new Error("格式不对");
            state = Object.assign(ME.defaultState(), data);
            state.settings = Object.assign(ME.defaultState().settings, data.settings || {});
            ME.saveState(state);
            renderSettings();
            renderProgress();
            toast("进度已导入");
          } catch (err) {
            toast("导入失败：不是有效的进度文件");
          }
        };
        reader.readAsText(f);
      });
      fi.click();
    } else if (action === "save-now") {
      ME.saveState(state);
      exportState();
      var label = "最近保存：" + clockNow();
      [].forEach.call(document.querySelectorAll(".save-time"), function (el) {
        el.textContent = label;
      });
      if (ui.view === "settings") renderSettings();
      toast("已保存并导出 · " + ME.todayKey());
    } else if (action === "restore-snap") {
      var snapDay = target.getAttribute("data-day");
      var snap = ME.readSnapshot(snapDay);
      if (!snap) {
        toast("这一天的快照不在了");
        return;
      }
      if (!window.confirm("恢复到 " + snapDay + " 的进度？当前进度会被覆盖。")) return;
      state = Object.assign(ME.defaultState(), snap);
      state.settings = Object.assign(ME.defaultState().settings, snap.settings || {});
      ME.saveState(state);
      renderSettings();
      renderProgress();
      toast("已恢复到 " + snapDay);
    } else if (action === "reset") {
      if (!window.confirm("清空所有学习进度？这个操作不能撤销。")) return;
      state = ME.defaultState();
      ME.saveState(state);
      renderSettings();
      renderProgress();
      toast("进度已清空");
    } else if (action === "pick-audio") {
      pickAudio();
    } else if (action === "audio-toggle") {
      toggleAudio();
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.id === "phraseSearch") {
      ui.q = e.target.value;
      renderPhraseList();
    } else if (e.target.id === "seek" && audio.el && audio.el.duration) {
      /* 手动拖进度条就退出单句控制，交还给整首播放 */
      clearSegmentTimer();
      ui.segment = null;
      audio.el.currentTime = (Number(e.target.value) / 1000) * audio.el.duration;
      updateSegChip();
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target.id === "songSelect") {
      var pickN = Number(e.target.value);
      var pickId = packIdFor(pickN);
      if (pickId) {
        switchStudy(pickId);
      } else {
        ui.lyricsN = pickN;
        switchView("lyrics");
        toast("这首的精读还在制作，先看歌词");
      }
    } else if (e.target.id === "libSort") {
      ui.libSort = e.target.value || "act";
      renderLibrary();
    } else if (e.target.id === "lyricsSong") {
      ui.lyricsN = Number(e.target.value);
      renderLyrics();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (e.target.id === "rateSel" && audio.el) {
      var r = Number(e.target.value);
      audio.el.playbackRate = r;
      state.settings.rate = r;
      ME.saveState(state);
    } else if (e.target.id === "newPerDay") {
      state.settings.newPerDay = Math.max(0, Math.min(60, Number(e.target.value) || 0));
      ME.saveState(state);
      toast("每日新卡上限：" + state.settings.newPerDay);
    }
  });

  document.getElementById("tabs").addEventListener("click", function (e) {
    var tab = e.target.closest(".tab");
    if (!tab) return;
    switchView(tab.getAttribute("data-view"));
  });

  document.getElementById("subtabs").addEventListener("click", function (e) {
    var sub = e.target.closest(".subtab");
    if (!sub) return;
    switchView(sub.getAttribute("data-sub"));
  });

  document.getElementById("settingsBtn").addEventListener("click", function () {
    switchView("settings");
  });

  document.getElementById("zhToggle").addEventListener("click", function () {
    state.settings.showZh = !state.settings.showZh;
    ME.saveState(state);
    document.body.classList.toggle("hide-zh", !state.settings.showZh);
    this.classList.toggle("is-on", state.settings.showZh);
  });

  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (ui.view === "review" && ui.session) {
      var s = ui.session;
      var card = CARD_BY_KEY[s.queue[s.idx]];
      if (!card) return;

      if (card.type !== "grammar") {
        if (s.answer === null) {
          if (/^[1-4]$/.test(e.key)) {
            e.preventDefault();
            answer(Number(e.key) - 1);
          } else if (e.code === "Space") {
            e.preventDefault();
            answer(-1);
          }
        } else if (e.code === "Space" || e.key === "Enter") {
          e.preventDefault();
          var ok = s.opts[s.answer] && s.opts[s.answer].correct;
          grade(ok ? 2 : 0);
        }
      } else if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (!s.revealed) reveal();
        else grade(2);
      } else if (/^[1-4]$/.test(e.key) && s.revealed) {
        grade(Number(e.key) - 1);
      }
      return;
    }

    /* 单句循环：R 循环、Esc 停 */
    if (e.key === "Escape") {
      if (ui.segment) {
        stopSegment();
        return;
      }
    }
    if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      toggleLoop();
      return;
    }

    if ((e.key === "Enter" || e.key === " ") && e.target.matches('.line-row[data-action="toggle-line"]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  /* ---------------- 赞赏码（图片存在才显示） ---------------- */
  (function initSupport() {
    var box = document.getElementById("support");
    if (!box) return;
    var img = box.querySelector("img");
    if (!img) return;
    var probe = new Image();
    probe.onload = function () {
      box.hidden = false;
    };
    probe.src = img.getAttribute("src");
  })();

  /* ---------------- 微信内置浏览器提示 ---------------- */
  (function wechatHint() {
    var ua = navigator.userAgent || "";
    if (!/MicroMessenger/i.test(ua)) return;
    var bar = document.getElementById("wxHint");
    if (!bar) return;
    bar.hidden = false;
    var close = document.getElementById("wxHintClose");
    if (close) {
      close.addEventListener("click", function () {
        bar.hidden = true;
      });
    }
  })();

  /* ---------------- 顶栏自动收起 ---------------- */
  var lastScrollY = 0;
  if (window.addEventListener) {
    window.addEventListener(
      "scroll",
      function () {
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        if (y < 48 || y < lastScrollY - 4) document.body.classList.remove("nav-hidden");
        else if (y > lastScrollY + 4) document.body.classList.add("nav-hidden");
        lastScrollY = y;
      },
      { passive: true }
    );
  }

  /* ---------------- 启动 ---------------- */

  function initShowSelect() {
    var sel = document.getElementById("showSelect");
    if (!sel) return;
    sel.innerHTML = SHOWS.map(function (s) {
      return (
        '<option value="' + ME.esc(s.id) + '"' + (s.id === SHOW_ID ? " selected" : "") + ">" +
        ME.esc(s.title) + "</option>"
      );
    }).join("");
    sel.addEventListener("change", function () {
      var id = sel.value;
      try {
        localStorage.setItem("musical-show", id);
      } catch (e) {}
      location.href = location.pathname + "?show=" + encodeURIComponent(id);
    });
  }

  function initSongSelect() {
    var sel = document.getElementById("songSelect");
    if (!sel) return;
    sel.innerHTML = [1, 2]
      .map(function (act) {
        var opts = TRACKS.filter(function (t) {
          return t.act === act;
        })
          .map(function (t) {
            return (
              '<option value="' + t.n + '">' +
              String(t.n).padStart(2, "0") + ". " + ME.esc(t.title) +
              (hasPack(t.n) ? " · 精读" : "") +
              "</option>"
            );
          })
          .join("");
        return '<optgroup label="第' + (act === 1 ? "一" : "二") + '幕">' + opts + "</optgroup>";
      })
      .join("");
  }

  document.body.classList.toggle("hide-zh", !state.settings.showZh);
  document.getElementById("zhToggle").classList.toggle("is-on", !!state.settings.showZh);
  document.getElementById("songTitle").textContent = song ? song.title : SHOW ? SHOW.title : "剧读";
  document.getElementById("songSub").textContent = song
    ? song.show.replace(": An American Musical", "") + " · " + song.writer + " · " + song.year
    : SHOW
      ? SHOW.subtitle
      : "";

  initShowSelect();
  initSongSelect();
  setupAudio();
  renderDock();
  switchView("library");

  /* 地址栏里的位置：?show=poto&n=7&view=study&line=l12 */
  (function initRoute() {
    window.addEventListener("popstate", applyRoute);
    var q;
    try {
      q = new URLSearchParams(BOOT_QUERY);
    } catch (e) {
      return;
    }
    var n = Number(q.get("n")) || 0;
    var view = q.get("view") || "";
    var line = q.get("line") || "";
    if (n) {
      var pid = packIdFor(n);
      if (pid) {
        switchStudy(pid, function () {
          if (view && SONG_VIEWS.indexOf(view) >= 0 && view !== "study") switchView(view);
          if (line) setTimeout(function () { jumpToLine(line); }, 150);
        });
      } else {
        ui.lyricsN = n;
        switchView("lyrics");
      }
    } else if (view && view !== "library") {
      switchView(view);
    }
  })();
})();
