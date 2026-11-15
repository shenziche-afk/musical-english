/* 剧读 · 核心工具：存储、间隔重复、文本处理 */
(function () {
  "use strict";

  var LS_KEY = "musical-en.v1";
  var DAY = 86400000;
  /* 每日快照：同一天只留一份，最多保留 7 天 */
  var SNAP_PREFIX = "musical-en.snap.";
  var SNAP_INDEX = "musical-en.snap.index";
  var SNAP_KEEP = 7;
  /* 版权/下架联系邮箱：要换就直接改这里，页面和设置页共用 */
  var CONTACT = "shenziche@gmail.com";

  function defaultState() {
    return {
      v: 1,
      srs: {},
      lines: {},
      settings: { newPerDay: 12, showZh: true, rate: 1, shadowGap: 2500 },
      lyrics: {},
      bg: {},
      daily: {}
    };
  }

  function loadState() {
    var base = defaultState();
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return base;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return base;
      base.srs = saved.srs || {};
      base.lines = saved.lines || {};
      base.lyrics = saved.lyrics || {};
      base.bg = saved.bg || {};
      base.daily = saved.daily || {};
      base.settings = Object.assign(base.settings, saved.settings || {});
      base.v = saved.v || 1;
      /* 旧版行 id 没有曲目前缀，迁移到 Alexander Hamilton 名下 */
      Object.keys(base.lines).forEach(function (k) {
        if (k.indexOf(":") === -1) {
          base.lines["alexander-hamilton:" + k] = base.lines[k];
          delete base.lines[k];
        }
      });
      return base;
    } catch (e) {
      console.warn("读取学习进度失败，已使用空白进度。", e);
      return base;
    }
  }

  function saveState(s) {
    var json;
    try {
      json = JSON.stringify(s);
      localStorage.setItem(LS_KEY, json);
    } catch (e) {
      console.warn("保存学习进度失败。", e);
      return false;
    }
    saveSnapshot(json);
    return true;
  }

  /* 每天第一次保存时落一份当日快照；同一天后续保存覆盖当天那份 */
  function saveSnapshot(json) {
    try {
      var day = todayKey();
      localStorage.setItem(SNAP_PREFIX + day, json);
      var idx = [];
      try {
        idx = JSON.parse(localStorage.getItem(SNAP_INDEX) || "[]");
        if (!Array.isArray(idx)) idx = [];
      } catch (e) {
        idx = [];
      }
      if (idx.indexOf(day) < 0) idx.push(day);
      idx.sort();
      while (idx.length > SNAP_KEEP) {
        var old = idx.shift();
        try {
          localStorage.removeItem(SNAP_PREFIX + old);
        } catch (e) {}
      }
      localStorage.setItem(SNAP_INDEX, JSON.stringify(idx));
    } catch (e) {
      /* 快照失败不影响主存储 */
    }
  }

  function listSnapshots() {
    try {
      var idx = JSON.parse(localStorage.getItem(SNAP_INDEX) || "[]");
      return Array.isArray(idx) ? idx.slice().sort().reverse() : [];
    } catch (e) {
      return [];
    }
  }

  function readSnapshot(day) {
    try {
      return JSON.parse(localStorage.getItem(SNAP_PREFIX + day) || "null");
    } catch (e) {
      return null;
    }
  }

  function todayKey(d) {
    var x = d ? new Date(d) : new Date();
    return (
      x.getFullYear() +
      "-" +
      String(x.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(x.getDate()).padStart(2, "0")
    );
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  /* 归一化：小写、弯引号转直、去标点、压缩空格。用于歌词锚点匹配。 */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^a-z0-9' ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function freshCard() {
    return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0, last: 0 };
  }

  /* 简易 SM-2：rating 0=忘记 1=模糊 2=记住 3=太简单 */
  function rate(st, rating, now) {
    now = now || Date.now();
    var c = Object.assign(freshCard(), st || {});
    if (rating <= 0) {
      c.lapses += 1;
      c.reps = 0;
      c.ease = Math.max(1.3, c.ease - 0.2);
      c.interval = 0;
      c.due = now + 10 * 60 * 1000;
    } else {
      c.reps += 1;
      if (rating === 1) {
        c.ease = Math.max(1.3, c.ease - 0.15);
        c.interval = c.interval === 0 ? 0.5 : c.interval * 1.2;
      } else if (rating === 2) {
        c.interval = c.interval === 0 ? 1 : c.interval * c.ease;
      } else {
        c.ease = Math.min(3.0, c.ease + 0.15);
        c.interval = c.interval === 0 ? 2 : c.interval * c.ease * 1.3;
      }
      c.interval = Math.min(365, Math.max(0.5, c.interval));
      c.due = now + c.interval * DAY;
    }
    c.last = now;
    c.lastRating = rating;
    return c;
  }

  function fmtGap(ms) {
    if (ms < 60000) return "现在";
    var m = Math.round(ms / 60000);
    if (m < 60) return m + " 分钟";
    var h = Math.round(m / 60);
    if (h < 24) return h + " 小时";
    var d = Math.round(h / 24);
    if (d < 31) return d + " 天";
    var mo = Math.round(d / 30);
    if (mo < 12) return mo + " 个月";
    return Math.round(mo / 12) + " 年";
  }

  function dueLabel(st, rating, now) {
    if (!st || !st.last) {
      if (rating === 0) return "10 分钟";
      return rating === 3 ? "2 天" : "1 天";
    }
    var next = rate(st, rating, now);
    return fmtGap(next.due - (now || Date.now()));
  }

  function isNew(st) {
    return !st || !st.last;
  }

  function isDue(st, now) {
    return !!st && !!st.last && st.due <= (now || Date.now());
  }

  function formatClock(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function formatHours(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var h = Math.floor(sec / 3600);
    var m = Math.round((sec % 3600) / 60);
    if (h > 0) return h + " 小时 " + m + " 分";
    return m + " 分钟";
  }

  window.ME = {
    LS_KEY: LS_KEY,
    CONTACT: CONTACT,
    defaultState: defaultState,
    loadState: loadState,
    saveState: saveState,
    listSnapshots: listSnapshots,
    readSnapshot: readSnapshot,
    todayKey: todayKey,
    esc: esc,
    norm: norm,
    rate: rate,
    dueLabel: dueLabel,
    fmtGap: fmtGap,
    isNew: isNew,
    isDue: isDue,
    formatClock: formatClock,
    formatHours: formatHours
  };
})();
