(() => {
  // src/tv.css
  var tv_default = '/* 10-foot UI for the site on a 1920\xD71080 TV. Selectors: PRD Appendix A. */\nhtml.fc-tv { font-size: 20px; }\nhtml.fc-tv body { cursor: none; }\nhtml.fc-tv footer, html.fc-tv .back-to-top { display: none !important; }\n\n/* Focus is the only pointer on a TV: make it unmistakable. */\nhtml.fc-tv :focus { outline: 4px solid #18a2b8 !important; outline-offset: 3px; }\nhtml.fc-tv .cflip, html.fc-tv .fc-card { transition: transform .15s ease; }\nhtml.fc-tv .cflip:focus, html.fc-tv .fc-card:focus { transform: scale(1.08); z-index: 5; position: relative; }\nhtml.fc-tv tr.eplist:focus { background: rgba(24, 162, 184, .35) !important; outline-offset: -4px; }\nhtml.fc-tv tr.eplist td, html.fc-tv tr.eplist th { padding: .6rem .5rem; }\n\n/* Player fills the screen while open. */\nhtml.fc-tv .player:not(.hide) { position: fixed !important; inset: 0; z-index: 10000; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; background: #000; }\nhtml.fc-tv .player:not(.hide) #player { width: 100vw !important; height: 100vh !important; }\n\n#fc-new-row { margin: 1rem 2rem 2rem; }\n#fc-new-row h2 { font-size: 1.6rem; margin: 0 0 .5rem; color: inherit; } /* site has light and dark themes */\n#fc-new-row .fc-row { display: flex; gap: 1.25rem; overflow-x: auto; padding: 1.25rem 1rem; } /* room for the focus zoom + ring, which the scroller clips */\n.fc-card { flex: 0 0 180px; display: grid; gap: .35rem; color: inherit; text-decoration: none; position: relative; }\n.fc-card img { width: 180px; aspect-ratio: 2 / 3; object-fit: cover; border-radius: 6px; background: #333; }\n.fc-card .fc-count { position: absolute; top: .4rem; right: .4rem; background: #d9534f; color: #fff; border-radius: 10px; padding: 2px 8px; font-size: .75rem; }\n.fc-card .fc-title { font-size: .9rem; line-height: 1.2; }\n\n.fc-toast { position: fixed; left: 50%; bottom: 3rem; transform: translateX(-50%); z-index: 2147483647; background: rgba(20, 20, 20, .92); color: #fff; padding: .75rem 1.5rem; border-radius: 8px; font: 600 1.1rem system-ui, sans-serif; }\n\n/* Our overlays (content/player.js): bigger for the sofa; the button inside shows focus, not the whole card. */\nhtml.fc-tv #player > div[style*="2147483647"] { zoom: 1.5; }\nhtml.fc-tv #player > div[style*="2147483647"]:focus { outline: none !important; }\n\n/* Launcher (docs/index.html): choose the site address. */\nhtml.fc-launcher, html.fc-launcher body { margin: 0; height: 100%; background: #111; color: #eee; }\n.fc-launch { height: 100%; display: grid; place-content: center; gap: 1.5rem; text-align: center; font: 1.4rem/1.4 system-ui, sans-serif; }\n.fc-launch h1 { font-size: 3rem; margin: 0; }\n.fc-launch .fc-opening { font-size: 2rem; margin: 0; }\n.fc-launch .fc-hint { color: #aaa; margin: 0; }\n.fc-launch .fc-red { color: #fff; background: #d9534f; border-radius: 6px; padding: 0 .4em; }\n.fc-form { display: grid; gap: .75rem; width: 36rem; margin: 0 auto; text-align: left; }\n.fc-form label { font-weight: 600; }\n.fc-form input { font: inherit; font-size: 1.6rem; padding: .6rem .8rem; border-radius: 8px; border: 2px solid #555; background: #222; color: #fff; }\n.fc-form button { font: inherit; font-weight: 600; padding: .7rem; border-radius: 8px; border: 0; background: #18a2b8; color: #fff; }\n.fc-form .fc-error { color: #ff8a80; min-height: 1.4em; margin: 0; }\n';

  // src/nav.js
  var DIRS = {
    left: { axis: "x", sign: -1 },
    right: { axis: "x", sign: 1 },
    up: { axis: "y", sign: -1 },
    down: { axis: "y", sign: 1 }
  };
  var center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  function pickNext(from, candidates2, dir) {
    const { axis, sign } = DIRS[dir];
    const other = axis === "x" ? "y" : "x";
    const lo = other === "x" ? "left" : "top";
    const size = other === "x" ? "width" : "height";
    const a = center(from);
    const scored = [];
    for (const c of candidates2) {
      const b = center(c.rect);
      const along = (b[axis] - a[axis]) * sign;
      if (along <= 1) continue;
      const gap = Math.max(0, c.rect[lo] - (from[lo] + from[size]), from[lo] - (c.rect[lo] + c.rect[size]));
      scored.push({ c, along, gap, off: Math.abs(b[other] - a[other]) });
    }
    const inLine = scored.filter((s) => s.gap === 0);
    const pool = inLine.length ? inLine : scored;
    let best = null;
    let bestScore = Infinity;
    for (const s of pool) {
      const score = s.along + s.gap * 2 + s.off * 0.1;
      if (score < bestScore) {
        bestScore = score;
        best = s.c;
      }
    }
    return best;
  }
  var FOCUSABLE = 'a[href], button, input, select, textarea, [role="button"], .cflip, tr.eplist, .watch-season';
  var NEVER = ".resetwatchedep, .resetwatchedall";
  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && !el.closest(".hide, [hidden]");
  }
  function overlayRoots() {
    return [...document.querySelectorAll("#player > div")].map((h2) => h2.shadowRoot).filter(Boolean);
  }
  function candidates() {
    const roots = overlayRoots();
    const modal = roots.find((r) => r.querySelector('[aria-modal="true"]'));
    const inside = roots.find((r) => {
      var _a;
      return r === ((_a = activeEl()) == null ? void 0 : _a.getRootNode());
    });
    const scope = modal ? [modal] : inside ? [inside] : [document, ...roots];
    const els = scope.flatMap((root) => [...root.querySelectorAll(FOCUSABLE)]).filter((el) => !el.matches(NEVER) && visible(el));
    const set = new Set(els);
    const nested = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return true;
      return false;
    };
    return els.filter((el) => !nested(el)).map((el) => ({ el, rect: el.getBoundingClientRect() }));
  }
  function focusEl(el) {
    if (!el.matches("a[href], button, input, select, textarea") && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }
  function activeEl() {
    var _a;
    let el = document.activeElement;
    while ((_a = el == null ? void 0 : el.shadowRoot) == null ? void 0 : _a.activeElement) el = el.shadowRoot.activeElement;
    return el && el !== document.body ? el : null;
  }
  var lastContent = null;
  var sidebarEl = () => document.querySelector(".nv-sidebar");
  var inSidebar = () => {
    const s = sidebarEl();
    const cur = activeEl();
    return !!(s && cur && s.contains(cur));
  };
  function enterSidebar() {
    const s = sidebarEl();
    const item = s && (s.querySelector(".nv-side__item--active") || s.querySelector(".nv-side__item"));
    if (!item) return false;
    lastContent = activeEl();
    focusEl(item);
    return true;
  }
  function leaveSidebar() {
    const back = lastContent && lastContent.isConnected ? lastContent : document.querySelector('#fc-app main [tabindex="0"], #fc-app main .jf-card, #fc-app main button, #fc-app main a');
    if (back) focusEl(back);
    return !!back;
  }
  function move(dir) {
    var _a;
    let list = candidates();
    if (!list.length) return false;
    const cur = activeEl();
    const side = sidebarEl();
    if (side) {
      if (cur && side.contains(cur)) {
        if (dir === "left") return true;
        if (dir === "right") return leaveSidebar();
        list = list.filter((c) => side.contains(c.el));
      } else if (dir !== "left") {
        list = list.filter((c) => !side.contains(c.el));
      }
    }
    const from = cur && list.some((c) => c.el === cur) ? cur.getBoundingClientRect() : { left: 0, top: -1, width: 0, height: 0 };
    let next = (_a = pickNext(from, list, cur ? dir : "down")) != null ? _a : cur ? null : list[0];
    const row = (dir === "up" || dir === "down") && (next == null ? void 0 : next.el.closest(".jf-row"));
    if (row && row !== (cur == null ? void 0 : cur.closest(".jf-row"))) {
      const edge = row.getBoundingClientRect().left;
      next = list.find((c) => c.el.closest(".jf-row") === row && c.rect.left >= edge - 1) || next;
    }
    const hero = dir === "up" && (next == null ? void 0 : next.el.closest(".ah-hero"));
    if (hero && !(cur == null ? void 0 : cur.closest(".ah-hero"))) next = { el: hero.querySelector('.ah-media[tabindex="0"]') || next.el };
    if (side && dir === "left" && next && side.contains(next.el) && !(cur && side.contains(cur))) {
      lastContent = cur;
      next = { el: side.querySelector(".nv-side__item--active") || next.el };
    }
    if (next) focusEl(next.el);
    return !!next;
  }

  // src/shell/cache.js
  var KEY = "fc-tv-swr";
  var MAX_ITEMS = 40;
  var MAX_CHARS = 1e6;
  function createCache(storage) {
    const st = () => storage || globalThis.localStorage;
    const read = () => {
      try {
        return JSON.parse(st().getItem(KEY)) || {};
      } catch {
        return {};
      }
    };
    return {
      get(key2) {
        const e = read()[key2];
        return e ? e.v : void 0;
      },
      set(key2, v) {
        const all = read();
        all[key2] = { t: Date.now(), v };
        const byAge = () => Object.keys(all).sort((a, b) => all[a].t - all[b].t);
        for (const k of byAge().slice(0, Math.max(0, Object.keys(all).length - MAX_ITEMS))) delete all[k];
        let json = JSON.stringify(all);
        while (json.length > MAX_CHARS && Object.keys(all).length > 1) {
          delete all[byAge()[0]];
          json = JSON.stringify(all);
        }
        try {
          st().setItem(KEY, json);
        } catch {
          try {
            st().removeItem(KEY);
          } catch {
          }
        }
      }
    };
  }
  var cache = createCache();
  var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function swr(key2, load2, onFresh, store = cache) {
    const stale = store.get(key2);
    const fresh = load2().then((v) => {
      store.set(key2, v);
      if (stale !== void 0 && onFresh && !same(v, stale)) onFresh(v);
      return v;
    });
    if (stale === void 0) return fresh;
    fresh.catch(() => {
    });
    return Promise.resolve(stale);
  }

  // src/shell/data.js
  var IMG = "https://img.xcdn.to/t/p";
  var unescape = (s) => String(s || "").replace(/\\(['"])/g, "$1");
  var img = (file, size = "w342") => file ? `${IMG}/${size}/${String(file).replace(/^\//, "")}` : "";
  function parsePos(key2, value) {
    const k = key2.split(":");
    const v = String(value || "").split(":").map(Number);
    if (k[0] !== "pos" || !k[1] || v.length < 3 || !(v[1] > 0)) return null;
    const e = { pid: k[1], pos: v[0], dur: v[1], ts: v[2] * 1e3, pct: v[0] / v[1] };
    if (k.length >= 4) Object.assign(e, { type: "tv", season: +k[2], episode: +k[3] });
    else e.type = "movie";
    return e;
  }
  var STARTED = 0.05;
  var FINISHED = 0.9;
  function continueWatching(entries) {
    const seen = /* @__PURE__ */ new Set();
    return entries.filter((e) => e.pct > STARTED && e.pct < FINISHED).sort((a, b) => b.ts - a.ts).filter((e) => seen.has(e.pid) ? false : seen.add(e.pid));
  }
  function nextUp(entries, epsByPid) {
    const latest = /* @__PURE__ */ new Map();
    for (const e of entries.filter((x) => x.type === "tv").sort((a, b) => b.ts - a.ts)) if (!latest.has(e.pid)) latest.set(e.pid, e);
    const out = [];
    for (const e of latest.values()) {
      if (e.pct < FINISHED) continue;
      const eps = (epsByPid[e.pid] || []).filter((x) => x.season > 0).sort((a, b) => a.season - b.season || a.episode - b.episode);
      const i = eps.findIndex((x) => x.season === e.season && x.episode === e.episode);
      if (i >= 0 && eps[i + 1]) out.push({ ...eps[i + 1], pid: e.pid, ts: e.ts });
    }
    return out;
  }
  function progressIndex(entries) {
    const idx = { movie: {}, show: {}, episode: {} };
    const inProgress = (pct) => pct > STARTED && pct < FINISHED;
    const latest = {};
    for (const e of entries) {
      if (e.type === "movie") {
        if (inProgress(e.pct)) idx.movie[e.pid] = e.pct;
        continue;
      }
      if (inProgress(e.pct)) idx.episode[`${e.pid}:${e.season}:${e.episode}`] = e.pct;
      if (!latest[e.pid] || e.ts > latest[e.pid].ts) latest[e.pid] = e;
    }
    for (const [pid, e] of Object.entries(latest)) if (inProgress(e.pct)) idx.show[pid] = e.pct;
    return idx;
  }
  var progressOf = (idx, c) => (c.type === "movie" ? idx.movie[c.pid] : c.season ? idx.episode[`${c.pid}:${c.season}:${c.episode}`] : idx.show[c.pid]) || 0;
  var backdropFromHtml = (html) => (/url\("?https:\/\/img\.xcdn\.to\/t\/p\/w1280\/([A-Za-z0-9_-]+\.jpg)/.exec(html) || [])[1] || null;
  function parseCards(root) {
    return [...root.querySelectorAll(".cflip[data-href]")].map((c) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const href = c.dataset.href;
      const [, , type, pid, slug, , season, , episode] = href.split("/");
      const poster = (((_a = c.querySelector("img.card-img-top")) == null ? void 0 : _a.getAttribute("src")) || ((_b = c.querySelector("img[data-src]")) == null ? void 0 : _b.dataset.src) || "").split("/").pop();
      const badge = ((_c = c.querySelector(".card-badge.top .badge")) == null ? void 0 : _c.textContent.trim()) || "";
      return {
        href,
        pid,
        slug,
        type: type === "movie" ? "movie" : "tv",
        title: unescape(((_e = (_d = c.querySelector("img")) == null ? void 0 : _d.alt) == null ? void 0 : _e.trim()) || ((_f = c.querySelector(".card-footer")) == null ? void 0 : _f.textContent.trim()) || ""),
        year: /^\d{4}$/.test(badge) ? badge : ((_g = c.querySelector(".card-text.t12")) == null ? void 0 : _g.textContent.trim()) || "",
        poster,
        season: season ? +season : null,
        episode: episode ? +episode : null,
        rating: ((_h = c.querySelector(".card-badge.bottom .badge")) == null ? void 0 : _h.textContent.trim()) || ""
      };
    });
  }
  function parseHero(root) {
    return [...root.querySelectorAll(".carousel-item")].map((s) => {
      var _a, _b, _c, _d;
      const cap = s.querySelector(".carousel-caption-container[data-href]");
      const bg = /\/t\/p\/original\/([A-Za-z0-9_-]+\.jpg)/.exec(s.getAttribute("style") || "");
      if (!cap) return null;
      const href = cap.dataset.href;
      const [, type, pid] = /^\/watch\/(tv|movie)\/(\d+)/.exec(href) || [];
      const facts = ((_a = cap.querySelector(".t14 div")) == null ? void 0 : _a.textContent.replace(/\s+/g, " ").trim()) || "";
      return {
        href,
        pid,
        type: type === "movie" ? "movie" : "tv",
        title: ((_b = cap.querySelector(".font-weight-normal")) == null ? void 0 : _b.textContent.trim()) || "",
        overview: ((_c = cap.querySelector(".t16")) == null ? void 0 : _c.textContent.trim()) || "",
        backdrop: bg ? bg[1] : null,
        year: (/\b(\d{4})\b/.exec(facts) || [])[1] || "",
        contentRating: facts.replace(/\b\d{4}\b/, "").trim(),
        rating: (/Rated:\s*([\d.]+)/.exec(((_d = cap.querySelector(".t14")) == null ? void 0 : _d.textContent) || "") || [])[1] || ""
      };
    }).filter(Boolean);
  }
  function parseHome(root) {
    const row = (k) => parseCards(root.querySelector(`.contentList${k}`) || root.createElement("div"));
    return { hero: parseHero(root), popular: row("R"), latest: row("E"), tv: row("T"), movies: row("M") };
  }
  var lastPage = (root) => Math.max(1, ...[...root.querySelectorAll(".searchnav[data-p]")].map((a) => +a.dataset.p || 1));
  function parseDetails(doc, html) {
    var _a, _b, _c, _d, _e, _f;
    const ov = doc.querySelector(".section-watch-overview");
    const badge = (title) => {
      var _a2;
      return ((_a2 = [...(ov == null ? void 0 : ov.querySelectorAll(".badge[title]")) || []].find((b) => b.title === title)) == null ? void 0 : _a2.textContent.trim()) || "";
    };
    const header2 = ov == null ? void 0 : ov.querySelector(".watch-header");
    const links = (type) => [...(ov == null ? void 0 : ov.querySelectorAll(`.show.link[data-type="${type}"]`)) || []].map((a) => a.textContent.trim());
    const seasons = [...doc.querySelectorAll(".section-watch-season")].map((sec) => {
      var _a2, _b2, _c2;
      const rows = [...sec.querySelectorAll("tr.eplist")].map((r) => {
        var _a3, _b3, _c3;
        return {
          season: +r.dataset.pes,
          episode: +r.dataset.pep,
          epid: +r.dataset.epid,
          title: ((_a3 = r.querySelector(".epTitle")) == null ? void 0 : _a3.textContent.trim()) || "",
          thumb: (((_b3 = r.querySelector("img.watch-episode-thumb")) == null ? void 0 : _b3.dataset.img) || "").replace(/^\//, ""),
          airDate: ((_c3 = r.querySelector(".hidden-md-up")) == null ? void 0 : _c3.textContent.trim()) || ""
        };
      }).sort((a, b) => a.episode - b.episode);
      const poster = (((_a2 = sec.querySelector("img.watch-season-thumb")) == null ? void 0 : _a2.dataset.img) || "").replace(/^\//, "");
      return { season: (_c2 = (_b2 = rows[0]) == null ? void 0 : _b2.season) != null ? _c2 : null, poster, episodes: rows };
    }).filter((s) => s.season !== null).sort((a, b) => a.season - b.season);
    return {
      slug: (((_a = doc.querySelector('meta[property="og:url"]')) == null ? void 0 : _a.content) || "").split("/").pop(),
      title: ((_b = header2 == null ? void 0 : header2.childNodes[0]) == null ? void 0 : _b.textContent.trim()) || "",
      year: (/\((\d{4})\)/.exec((header2 == null ? void 0 : header2.textContent) || "") || [])[1] || "",
      poster: (((_c = ov == null ? void 0 : ov.querySelector("img[data-img]")) == null ? void 0 : _c.dataset.img) || "").replace(/^\//, ""),
      backdrop: backdropFromHtml(html),
      overview: ((_d = ov == null ? void 0 : ov.querySelector(".moreless-content")) == null ? void 0 : _d.textContent.trim()) || "",
      rating: ((_e = ov == null ? void 0 : ov.querySelector('.badge[title^="Rated"]')) == null ? void 0 : _e.textContent.trim()) || "",
      contentRating: badge("US Content Rating"),
      genres: links("genre"),
      network: links("network")[0] || "",
      seasons,
      similar: parseCards(doc.querySelector(".section-watch-recomm") || doc.createElement("div")),
      trailer: ((_f = (ov == null ? void 0 : ov.querySelector("[data-ytlink]")) || doc.querySelector("[data-ytlink]")) == null ? void 0 : _f.dataset.ytlink) || null
    };
  }
  var toDoc = (html) => new DOMParser().parseFromString(html, "text/html");
  async function get(url) {
    const r = await fetch(url, { credentials: "same-origin" });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.text();
  }
  function library(kind, page = 1, sort = "latest", onFresh) {
    return swr(`lib:${kind}:${sort}:${page}`, async () => {
      const doc = toDoc(await get(`/show/${kind === "movies" ? "movies" : "tvshows"}?page=${page}&sort=${sort}&ajax=1`));
      return { cards: parseCards(doc), lastPage: lastPage(doc) };
    }, onFresh);
  }
  function search(query, page = 1, onFresh) {
    return swr(`search:${query.toLowerCase()}:${page}`, async () => {
      const doc = toDoc(await get(`/search/${encodeURIComponent(query)}?ajax=1&tab=movies,tvshows${page > 1 ? `&page=${page}` : ""}`));
      return { cards: parseCards(doc), lastPage: lastPage(doc) };
    }, onFresh);
  }
  var parseLibraryPage = (root, kind) => ({
    cards: parseCards(root.querySelector("#content") || root).filter((c) => c.type === (kind === "movies" ? "movie" : "tv")),
    lastPage: lastPage(root)
  });
  async function details(type, pid) {
    const html = await get(`/watch/${type === "movie" ? "movie" : "tv"}/${pid}`);
    return parseDetails(toDoc(html), html);
  }
  function watchEntries(storage = localStorage) {
    const out = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith("pos:")) {
        const e = parsePos(k, storage.getItem(k));
        if (e) out.push(e);
      }
    }
    return out;
  }
  var META_KEY = "fc-tv-meta";
  var metaCache = {
    all() {
      try {
        return JSON.parse(localStorage.getItem(META_KEY)) || {};
      } catch {
        return {};
      }
    },
    put(pid, m) {
      const all = this.all();
      all[pid] = { ...all[pid], ...m, ts: Date.now() };
      try {
        localStorage.setItem(META_KEY, JSON.stringify(all));
      } catch {
      }
    }
  };

  // src/shell/profiles.js
  var KEY2 = "fc-tv-profiles";
  var MAX_PROFILES = 6;
  var PALETTE = ["#1E88E5", "#E53935", "#43A047", "#FB8C00", "#8E24AA", "#00ACC1", "#F4511E", "#6D4C41"];
  var CHOSEN_KEY = "fc-tv-profile-chosen";
  var formatCode = (raw) => {
    const c = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
    return c.length > 8 ? `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}` : c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
  };
  var validCode = (code) => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]$/.test(code);
  var sameCode = (a, b) => !!a && !!b && formatCode(a) === formatCode(b);
  var initialOf = (name) => (String(name || "").trim()[0] || "?").toUpperCase();
  var activeProfile = (list, hqsCode) => list.find((p) => sameCode(p.code, hqsCode)) || null;
  function addProfile(list, { name, color, code, pinHash }, id = String(Date.now())) {
    if (list.length >= MAX_PROFILES) throw new Error(`Up to ${MAX_PROFILES} profiles.`);
    if (list.some((p) => sameCode(p.code, code))) throw new Error("Another profile already uses that sync code.");
    return [...list, { id, name: String(name).trim().slice(0, 20), color: color || PALETTE[list.length % PALETTE.length], code: formatCode(code), ...pinHash ? { pinHash } : {} }];
  }
  function updateProfile(list, id, changes) {
    if (changes.code && list.some((p) => p.id !== id && sameCode(p.code, changes.code))) throw new Error("Another profile already uses that sync code.");
    return list.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...changes };
      if (changes.code) next.code = formatCode(changes.code);
      if (changes.name != null) next.name = String(changes.name).trim().slice(0, 20);
      if (!next.pinHash) delete next.pinHash;
      return next;
    });
  }
  var removeProfile = (list, id) => list.filter((p) => p.id !== id);
  function migrate(list, hqsCode) {
    if (list.length || !hqsCode) return list;
    return addProfile(list, { name: "Profile 1", color: PALETTE[0], code: hqsCode }, "1");
  }
  async function hashPin(id, pin) {
    const bytes = new TextEncoder().encode(`viewbox:${id}:${pin}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  var checkPin = async (profile, pin) => !profile.pinHash || await hashPin(profile.id, pin) === profile.pinHash;
  var currentCode = () => {
    try {
      return localStorage.getItem("hqs.code") || "";
    } catch {
      return "";
    }
  };
  function loadProfiles() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(KEY2)) || [];
    } catch {
    }
    const migrated = migrate(list, currentCode());
    if (migrated !== list) {
      saveProfiles(migrated);
      try {
        const old = localStorage.getItem("fc-tv-shows");
        if (old) {
          localStorage.setItem(`fc-tv-shows:${currentCode()}`, old);
          localStorage.removeItem("fc-tv-shows");
        }
      } catch {
      }
    }
    return migrated;
  }
  var saveProfiles = (list) => {
    try {
      localStorage.setItem(KEY2, JSON.stringify(list));
    } catch {
    }
  };
  var currentProfile = () => activeProfile(loadProfiles(), currentCode());
  var markChosen = () => {
    try {
      sessionStorage.setItem(CHOSEN_KEY, "1");
    } catch {
    }
  };
  var wasChosen = () => {
    try {
      return sessionStorage.getItem(CHOSEN_KEY) === "1";
    } catch {
      return false;
    }
  };
  var api = () => window.hqsSync && window.hqsSync.api || "";
  var rawCode = (code) => formatCode(code).replace(/-/g, "");
  function codeExists(code) {
    return new Promise((resolve, reject) => {
      if (!api() || typeof $ === "undefined") return reject(new Error("Sync isn't available on this page."));
      $.ajax({
        url: `${api()}/api/code/exists/${rawCode(code)}`,
        type: "GET",
        dataType: "json",
        timeout: 1e4,
        beforeSend: (x) => x.setRequestHeader("X-Sync-Code", currentCode()),
        success: () => resolve(true),
        // 404: no such code; 400 "invalid code": fails the server's check (the last character is a check character)
        error: (x) => x.status === 404 || x.status === 400 ? resolve(false) : reject(new Error("Couldn't reach the sync server."))
      });
    });
  }
  function createCode() {
    return new Promise((resolve, reject) => {
      if (!api() || typeof $ === "undefined") return reject(new Error("Sync isn't available on this page."));
      $.ajax({
        url: `${api()}/api/code/create`,
        type: "POST",
        data: "{}",
        contentType: "application/json",
        dataType: "json",
        timeout: 1e4,
        success: (r) => r && r.code && validCode(formatCode(r.code)) ? resolve(formatCode(r.code)) : reject(new Error("The sync server didn't return a code.")),
        error: () => reject(new Error("Couldn't reach the sync server."))
      });
    });
  }
  var waitFor = (test, ms) => new Promise((resolve) => {
    const t0 = Date.now();
    const tick = () => test() ? resolve(true) : Date.now() - t0 > ms ? resolve(false) : setTimeout(tick, 250);
    tick();
  });
  async function switchTo(profile) {
    if (sameCode(currentCode(), profile.code)) return;
    if (typeof window.hqsSyncJoin !== "function") throw new Error("Sync isn't available on this page.");
    const before = currentCode();
    window.hqsSyncJoin(formatCode(profile.code));
    const switched = await waitFor(() => sameCode(currentCode(), profile.code), 15e3);
    if (!switched) {
      const cur = activeProfile(loadProfiles(), before);
      throw new Error(`Couldn't reach the sync server \u2014 still on ${cur ? cur.name : "the current profile"}.`);
    }
    await new Promise((resolve) => {
      const done = setTimeout(resolve, 15e3);
      try {
        window.hqsSyncNow(() => {
          clearTimeout(done);
          resolve();
        }, true);
      } catch {
        clearTimeout(done);
        resolve();
      }
    });
  }

  // src/shell/ui.js
  var keyHook = { fn: null };
  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }
  var ICONS = {
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    trailer: "M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z",
    rewind: "M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z",
    forward: "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z",
    back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
    home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
    search: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
    next: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
    prev: "M6 6h2v12H6zm3.5 6l8.5 6V6z",
    volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
    mute: "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z",
    cc: "M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z",
    hd: "M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm2-6h4c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1h-4V9zm1.5 4.5h2v-3h-2v3z",
    backspace: "M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15a2 2 0 002-2V5a2 2 0 00-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z",
    sort: "M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z",
    tv: "M21 3H3a2 2 0 00-2 2v12a2 2 0 002 2h5v2h8v-2h5a2 2 0 001.99-2L23 5a2 2 0 00-2-2zm0 14H3V5h18v12z",
    movie: "M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4a2 2 0 00-1.99 2L2 18a2 2 0 002 2h16a2 2 0 002-2V4h-4z",
    person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
    lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
    settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
  };
  function icon(name, cls = "") {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", `jf-icon ${cls}`);
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", ICONS[name] || "");
    svg.appendChild(p);
    return svg;
  }
  var iconButton = (name, label, onclick, extra = {}) => h("button", { class: `jf-iconbtn ${extra.class || ""}`, "aria-label": label, title: label, onclick, ...extra.attrs }, icon(name));
  var clock = () => {
    const el = h("span", { class: "jf-clock" });
    const tick = () => {
      const d = /* @__PURE__ */ new Date();
      el.textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    tick();
    setInterval(tick, 15e3);
    return el;
  };
  var fmtTime = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    const hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    return hh ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${mm}:${String(ss).padStart(2, "0")}`;
  };
  var endsAt = (secondsLeft) => {
    const d = new Date(Date.now() + secondsLeft * 1e3);
    return `Ends at ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  var epLabel = (s, e, title) => `S${s}:E${e}${title ? ` - ${title}` : ""}`;
  function card({ href, onclick, image, imageSize = "w342", title, sub, progress: progress2, badge, shape = "portrait", label }) {
    const bg = image ? { backgroundImage: `url("${image.startsWith("http") ? image : img(image, imageSize)}")` } : null;
    const inner = h(
      "div",
      { class: "jf-card__box" },
      h(
        "div",
        { class: "jf-card__img", style: bg },
        !image && h("div", { class: "jf-card__fallback" }, title),
        progress2 > 0 && h("div", { class: "jf-progress" }, h("div", { class: "jf-progress__fill", style: { width: `${Math.round(progress2 * 100)}%` } })),
        badge && h("div", { class: "jf-badge" }, badge)
      ),
      h("div", { class: "jf-card__title" }, title),
      sub && h("div", { class: "jf-card__sub" }, sub)
    );
    const attrs = { class: `jf-card jf-card--${shape}`, "aria-label": label || [title, sub].filter(Boolean).join(", ") };
    return href ? h("a", { ...attrs, href }, inner) : h("button", { ...attrs, onclick }, inner);
  }
  var section = (title, kids, cls = "jf-row") => h("section", { class: "jf-section" }, h("h2", { class: "jf-section__title" }, title), h("div", { class: cls }, kids));
  function header({ tabs, active, title } = {}) {
    const left = !title ? h("div", { class: "jf-header__left" }, h("span", { class: "jf-logo", "aria-label": "Viewbox" }, "Viewbox")) : h(
      "div",
      { class: "jf-header__left" },
      iconButton("back", "Back", () => history.back()),
      h("a", { class: "jf-iconbtn", href: "/home", "aria-label": "Home" }, icon("home")),
      title && h("span", { class: "jf-header__title" }, title)
    );
    const mid = h("nav", { class: "jf-tabs" }, (tabs || []).map((t) => h("a", { class: `jf-tab${t.id === active ? " jf-tab--active" : ""}`, href: t.href }, t.label)));
    const signedIn = isSignedIn();
    const right = h(
      "div",
      { class: "jf-header__right" },
      !signedIn && h("a", { class: "jf-signin", href: "/home#settings" }, "Sign in"),
      h("a", { class: "jf-iconbtn", href: "/search/", "aria-label": "Search" }, icon("search")),
      h("a", { class: "jf-iconbtn", href: "/home#settings", "aria-label": "Settings" }, icon("settings")),
      profileButton(),
      clock()
    );
    return h("header", { class: "jf-header" }, left, mid, right);
  }
  function profileButton() {
    const p = currentProfile();
    return h(
      "a",
      { class: "jf-iconbtn jf-profilebtn", href: "/home#profiles", "aria-label": p ? `Profile: ${p.name}. Switch profile` : "Profiles" },
      p ? h("span", { class: "jf-profilebtn__avatar", style: { background: p.color } }, initialOf(p.name)) : icon("person")
    );
  }
  var SIGNED_KEY = "fc-tv-signed-in";
  var isSignedIn = () => {
    if (document.readyState === "loading") {
      try {
        return localStorage.getItem(SIGNED_KEY) === "1";
      } catch {
        return false;
      }
    }
    const on = !!document.querySelector('a[href="/account"]');
    try {
      localStorage.setItem(SIGNED_KEY, on ? "1" : "0");
    } catch {
    }
    return on;
  };
  var toast = (text, ms = 2e3) => {
    const t = (document.body || document.documentElement).appendChild(h("div", { class: "fc-toast", role: "status" }, text));
    setTimeout(() => t.remove(), ms);
  };

  // ../ext/scan.js
  var WEEK = 7 * 864e5;
  var day = (ms) => new Date(ms).toISOString().slice(0, 10);
  var countNew = (episodes, lastSeenAt, now = Date.now()) => episodes.filter((e) => e.airDate && e.airDate > day(lastSeenAt) && e.airDate <= day(now)).length;
  var queue = Promise.resolve();

  // src/episodes.js
  function parseAirDate(text) {
    const m = /(\d{2})\/(\d{2})\/(\d{2})\b/.exec(text || "");
    return m ? `20${m[3]}-${m[1]}-${m[2]}` : null;
  }
  function parseShowPage(doc) {
    var _a, _b;
    const og = (p) => {
      var _a2, _b2;
      return (_b2 = (_a2 = doc.querySelector(`meta[property="og:${p}"]`)) == null ? void 0 : _a2.content) != null ? _b2 : "";
    };
    const m = /^Watch all Episodes of (.+) \((\d{4})\)/.exec(og("title"));
    const eps = [...doc.querySelectorAll("tr.eplist")].map((r) => {
      var _a2;
      return {
        season: +r.dataset.pes,
        episode: +r.dataset.pep,
        airDate: parseAirDate((_a2 = r.querySelector(".hidden-md-up")) == null ? void 0 : _a2.textContent)
      };
    });
    return { title: (_a = m == null ? void 0 : m[1]) != null ? _a : null, year: (_b = m == null ? void 0 : m[2]) != null ? _b : null, slug: og("url").split("/").pop(), poster: og("image").split("/").pop(), eps };
  }
  var key = () => {
    let c = "";
    try {
      c = localStorage.getItem("hqs.code") || "";
    } catch {
    }
    return c ? `fc-tv-shows:${c}` : "fc-tv-shows";
  };
  var load = () => {
    var _a;
    try {
      return (_a = JSON.parse(localStorage.getItem(key()))) != null ? _a : {};
    } catch {
      return {};
    }
  };
  var save = (shows) => {
    try {
      localStorage.setItem(key(), JSON.stringify(shows));
    } catch {
    }
  };
  var favoritePids = () => Object.keys(localStorage).filter((k) => k.startsWith("bm:t:")).map((k) => k.slice(5));
  var SCAN_EVERY = 6 * 36e5;
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function scan(force) {
    var _a;
    const pids = favoritePids();
    const shows = load();
    if (pids.length) {
      for (const pid of Object.keys(shows)) if (!pids.includes(pid)) delete shows[pid];
    }
    for (const pid of pids) {
      const s = (_a = shows[pid]) != null ? _a : shows[pid] = { lastSeenAt: Date.now() };
      if (!force && s.scannedAt && Date.now() - s.scannedAt < SCAN_EVERY) continue;
      try {
        const html = await (await fetch(`/watch/tv/${pid}`)).text();
        Object.assign(s, parseShowPage(new DOMParser().parseFromString(html, "text/html")), { scannedAt: Date.now() });
        save(shows);
      } catch (e) {
        console.warn("[viewbox-tv] scan failed", pid, e);
      }
      await sleep(300);
    }
    save(shows);
    return counts(shows);
  }
  function counts(shows = load()) {
    const out = {};
    for (const [pid, s] of Object.entries(shows)) out[pid] = s.eps ? countNew(s.eps, s.lastSeenAt) : 0;
    return out;
  }
  function markSeen(pid) {
    const shows = load();
    if (!shows[pid]) return;
    shows[pid].lastSeenAt = Date.now();
    save(shows);
  }

  // src/launcher.js
  var SITE_KEY = "fc-site";
  var RED = 403;
  var SPLASH_MS = 3e3;
  var isLauncher = () => !!document.querySelector('meta[name="fc-launcher"]');
  function normalizeSite(input) {
    const raw = (input || "").trim();
    if (!raw) return null;
    try {
      const u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
      return `${u.origin}/home`;
    } catch {
      return null;
    }
  }
  var saved = () => {
    try {
      return localStorage.getItem(SITE_KEY);
    } catch {
      return null;
    }
  };
  function runLauncher() {
    document.documentElement.classList.add("fc-tv", "fc-launcher");
    document.body.innerHTML = '<main class="fc-launch" aria-live="polite"></main>';
    const main = document.querySelector(".fc-launch");
    const site = saved();
    if (site) splash(main, site);
    else form(main);
  }
  function splash(main, site) {
    main.innerHTML = '<h1>Viewbox TV</h1><p class="fc-opening"></p><p class="fc-hint">Press the <span class="fc-red">Red</span> button to change the address</p>';
    main.querySelector(".fc-opening").textContent = `Opening ${new URL(site).host}\u2026`;
    const go = setTimeout(() => location.replace(site), SPLASH_MS);
    const onKey = (e) => {
      if (e.keyCode !== RED && e.key !== "r") return;
      e.preventDefault();
      clearTimeout(go);
      window.removeEventListener("keydown", onKey, true);
      form(main);
    };
    window.addEventListener("keydown", onKey, true);
  }
  function form(main) {
    main.innerHTML = `
    <h1>Viewbox TV</h1>
    <form class="fc-form" novalidate>
      <label for="fc-site">Site address</label>
      <input id="fc-site" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="example.com">
      <p class="fc-error" role="alert"></p>
      <button type="submit">Open</button>
    </form>
    <p class="fc-hint">Select the box and press Enter to type. You can change this later with the <span class="fc-red">Red</span> button on the start screen.</p>`;
    const input = main.querySelector("input");
    const button = main.querySelector("button");
    const error = main.querySelector(".fc-error");
    input.value = saved() ? new URL(saved()).host : "";
    input.focus();
    main.addEventListener("keydown", (e) => {
      if (e.keyCode === 40 && document.activeElement === input) {
        e.preventDefault();
        button.focus();
      } else if (e.keyCode === 38 && document.activeElement === button) {
        e.preventDefault();
        input.focus();
      }
    });
    main.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const site = normalizeSite(input.value);
      if (!site) {
        error.textContent = "That doesn't look like a web address. Try something like example.com.";
        input.focus();
        return;
      }
      try {
        localStorage.setItem(SITE_KEY, site);
      } catch {
      }
      location.replace(site);
    });
  }

  // src/shell/desktop.js
  var isDesktop = () => !!window.__vbExtension;
  var FOCUSABLE2 = '#fc-app a[href], #fc-app button, #fc-app [role="button"][tabindex]';
  function startDesktop() {
    document.addEventListener("mouseover", (e) => {
      const el = e.target.closest && e.target.closest(FOCUSABLE2);
      if (el && el !== document.activeElement && !el.disabled) el.focus({ preventScroll: true });
    });
    document.addEventListener("mouseout", (e) => {
      const side = e.target.closest && e.target.closest(".nv-sidebar");
      if (side && !side.contains(e.relatedTarget) && side.contains(document.activeElement)) document.activeElement.blur();
    });
    const arrow = (dir, label) => {
      const b = document.createElement("button");
      b.className = `vb-rowarrow vb-rowarrow--${dir}`;
      b.setAttribute("aria-label", label);
      b.tabIndex = -1;
      b.textContent = dir === "prev" ? "\u2039" : "\u203A";
      b.addEventListener("click", () => {
        if (row) row.scrollBy({ left: (dir === "prev" ? -0.8 : 0.8) * row.clientWidth, behavior: "smooth" });
      });
      return b;
    };
    const prev = arrow("prev", "Scroll left");
    const next = arrow("next", "Scroll right");
    let row = null;
    const place = () => {
      if (!row || !row.isConnected) {
        prev.hidden = next.hidden = true;
        return;
      }
      const r = row.getBoundingClientRect();
      for (const b of [prev, next]) {
        b.style.top = `${r.top}px`;
        b.style.height = `${r.height}px`;
      }
      prev.style.left = `${r.left}px`;
      next.style.left = `${r.right - 56}px`;
      prev.hidden = row.scrollLeft <= 2;
      next.hidden = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2;
    };
    document.addEventListener("mousemove", (e) => {
      const over = e.target.closest && (e.target.closest(".jf-row") || e.target.closest(".vb-rowarrow") && row);
      if (!over) {
        if (row) {
          row = null;
          place();
        }
        return;
      }
      if (over !== row) {
        row = over;
        if (!prev.isConnected) document.body.append(prev, next);
      }
      place();
    });
    document.addEventListener("scroll", () => place(), true);
  }

  // src/shell/jellyfin.css
  var jellyfin_default = `/* Jellyfin TV-layout look, written from measurements in tv/JELLYFIN_STYLE.md (no jellyfin-web code copied). */
:root {
  --jf-bg: #101010;
  --jf-header: #202020;
  --jf-accent: #00a4dc;
  --jf-focus: #7fdcd4; /* light teal ring on the focused card (user request; not in Jellyfin) */
  --jf-text: rgba(255, 255, 255, .8);
  --jf-text-2: rgba(255, 255, 255, .5);
  --jf-font: "Noto Sans", "SamsungOne", "Samsung Sans", Roboto, "Segoe UI", sans-serif;
  --jf-pad: 63px;
}

/* The site's page stays in the DOM (data + player) but is invisible; only our app, OSD and toasts show. */
html.fc-shell, html.fc-shell body { background: var(--jf-bg) !important; overflow: hidden !important; }
html.fc-shell body > *:not(#fc-app):not(#fc-osd):not(.fc-toast):not(.vb-rowarrow) { visibility: hidden !important; }
html.fc-shell body { background-image: none !important; }
#fc-app { position: fixed; inset: 0; z-index: 9000; overflow-y: auto; overflow-x: hidden; background: var(--jf-bg); color: var(--jf-text); font: 400 20px/27px var(--jf-font); scrollbar-width: none; }
#fc-app::-webkit-scrollbar { display: none; }
#fc-app *, #fc-osd * { box-sizing: border-box; }
#fc-app a { color: inherit; text-decoration: none; }
#fc-app button, #fc-osd button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
#fc-app :focus, #fc-osd :focus { outline: none !important; }

/* Player on top while something plays. */
html.fc-playing #fc-app { visibility: hidden; }
html.fc-shell .player { visibility: hidden !important; }
html.fc-playing .player:not(.hide) { visibility: visible !important; position: fixed !important; inset: 0; z-index: 10000; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; background: #000; }
html.fc-playing .player:not(.hide) #player { width: 100vw !important; height: 100vh !important; }

/* Header */
.jf-header { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; height: 87px; padding: 0 32px; background: var(--jf-header); }
.jf-header__left, .jf-header__right { flex: 1; display: flex; align-items: center; gap: 8px; }
.jf-header__right { justify-content: flex-end; gap: 12px; }
.jf-logo { font-weight: 700; font-size: 26px; color: #fff; letter-spacing: .02em; background: linear-gradient(135deg, #aa5cc3, #00a4dc); -webkit-background-clip: text; background-clip: text; color: transparent; padding-left: 8px; }
.jf-header__title { font-size: 22px; color: var(--jf-text); margin-left: 16px; }
.jf-tabs { display: flex; }
.jf-tab { font-weight: 600; font-size: 20px; line-height: 25px; padding: 30px; color: #999; }
.jf-tab--active { color: #fff; }
.jf-tab:focus { color: #fff; background: var(--jf-accent); }
.jf-clock { font-size: 20px; color: var(--jf-text); margin-left: 12px; }
.jf-iconbtn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 56px; height: 56px; padding: 0 14px !important; border-radius: 4.3px; color: #fff !important; }
.jf-iconbtn:focus { background: var(--jf-accent) !important; }
.jf-icon { width: 30px; height: 30px; fill: currentColor; flex: none; }

/* Sections, rows, grids */
.jf-main { padding-bottom: 60px; }
.jf-section { margin: 0; }
.jf-section__title { font: 400 30px/40.5px var(--jf-font); color: var(--jf-text); margin: 0; padding: 15px 0 6px var(--jf-pad); }
.jf-center { text-align: center; padding-left: 0; }
.jf-row { display: flex; overflow-x: auto; overflow-y: visible; padding: 24px var(--jf-pad) 40px; margin-top: -12px; /* room for the 1.07 zoom + focus ring: a scroller clips vertically too */ scrollbar-width: none; scroll-padding: 0 var(--jf-pad); }
.jf-row::-webkit-scrollbar { display: none; }
.jf-grid { display: flex; flex-wrap: wrap; padding: 12px var(--jf-pad) 24px; }
.jf-empty { padding: 24px var(--jf-pad); color: var(--jf-text-2); }

/* Cards: focus = the box zooms 1.07, no outline (Jellyfin TV). */
.jf-card { flex: none; display: block; margin: 0 24px 0 0; text-align: center; scroll-margin: 140px 0 60px; } /* keep focused items clear of the sticky header */
.jf-card__box { transition: transform .2s ease-out; }
.jf-card:focus { position: relative; z-index: 10; }
.jf-card:focus .jf-card__box { transform: scale(1.07); }
.jf-card:focus .jf-card__img { box-shadow: 0 0 0 4px var(--jf-focus); }
.jf-card__img { position: relative; border-radius: 4px; background: #242424 center / cover no-repeat; overflow: hidden; }
.jf-card--portrait { width: 262px; }
.jf-card--portrait .jf-card__img { height: 393px; }
.jf-card--landscape { width: 427px; }
.jf-card--landscape .jf-card__img { height: 240px; }
.jf-grid .jf-card { margin-bottom: 36px; }
.jf-card__fallback { position: absolute; inset: 0; display: grid; place-items: center; padding: 12px; font-size: 28px; font-weight: 600; color: #fff; }
.jf-card__title { font-size: 20px; padding: 4.8px 10px 1.2px; color: var(--jf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.jf-card__sub { font-size: 17.2px; color: var(--jf-text-2); padding: 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.jf-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 5.6px; background: rgba(51, 51, 51, .8); }
.jf-progress__fill { height: 100%; background: var(--jf-accent); }
.jf-badge { position: absolute; top: 8px; right: 8px; min-width: 34px; height: 34px; padding: 0 6px; border-radius: 17px; background: var(--jf-accent); color: #fff; font-size: 18px; line-height: 34px; text-align: center; }
.jf-badge--check { display: grid; place-items: center; padding: 0; }
.jf-badge--check .jf-icon { width: 24px; height: 24px; }

/* Details */
.jf-details { display: flex; gap: 47px; padding: 0 60px 0 96px; }
.jf-details__poster { flex: none; width: 480px; height: 720px; margin-top: -3px; border-radius: 4px; background: #242424 center / cover no-repeat; position: sticky; top: 0; }
.jf-details__body { flex: 1; min-width: 0; padding-top: 0; }
.jf-details__title { font: 600 36px/48.6px var(--jf-font); color: var(--jf-text); margin: 0; }
.jf-details__subtitle { font-size: 22px; font-weight: 600; margin-top: 4px; }
.jf-details__meta { display: flex; align-items: center; gap: 20px; font-size: 20px; margin: 4px 0 14px; }
.jf-rating { font-size: 18.4px; color: #ddd; background: rgba(170, 170, 190, .2); border-radius: 4.6px; padding: 4px 9px; }
.jf-star { display: inline-flex; align-items: center; gap: 4px; }
.jf-star .jf-icon { width: 24px; height: 24px; fill: #f2b01e; }
.jf-details__buttons { display: flex; gap: 0; margin: 0 0 40px -8px; }
.jf-detailbtn { width: 71px; height: 65px; padding: 0 !important; }
.jf-iconbtn--on .jf-icon { fill: #e53935; }
.jf-details__overview { margin: 60px 0 30px; max-width: 1240px; font-size: 20px; line-height: 27px; }
.jf-details__info { border-collapse: collapse; margin-bottom: 20px; }
.jf-details__info th { text-align: left; font-weight: 400; padding: 5px 80px 5px 0; }
.jf-details__info td { font-weight: 600; padding: 5px 0; }
.jf-details .jf-section__title { padding-left: 0; }
/* Rows scroll, so they clip: keep room on the left for the focused card's zoom + ring, without moving the cards. */
.jf-details .jf-row { padding-left: 24px; margin-left: -24px; scroll-padding-left: 24px; }
.jf-episodes { display: grid; gap: 10px; }
.jf-episode { scroll-margin: 140px 0 60px; display: flex; gap: 30px; align-items: center; text-align: left; padding: 0; border-radius: 4px; }
.jf-episode:focus { background: rgba(255, 255, 255, .08); }
.jf-episode:focus .jf-episode__thumb { box-shadow: 0 0 0 4px var(--jf-focus); }
.jf-episode__thumb { position: relative; flex: none; width: 576px; height: 324px; border-radius: 4px; background: #242424 center / cover no-repeat; overflow: hidden; }
.jf-episode__title { font-size: 30px; color: var(--jf-text); }
.jf-episode__meta { font-size: 20px; color: rgba(255, 255, 255, .6); margin-top: 6px; }

/* Library toolbar */
.jf-toolbar { display: flex; justify-content: center; align-items: center; gap: 24px; padding: 60px 0 12px; font-size: 20px; }
.jf-toolbar__sort span { font-size: 18px; }

/* Search */
.jf-search__bar { display: flex; align-items: center; gap: 12px; width: 1150px; margin: 80px auto 8px; }
.jf-search__icon { width: 36px; height: 36px; fill: var(--jf-text); }
.jf-search__input { flex: 1; height: 52px; font: 400 22px var(--jf-font); color: #fff; background: #1c1c1c; border: 3px solid #333; border-radius: 4px; padding: 0 8px; }
.jf-search__input:focus { border-color: var(--jf-accent); outline: none; }
.jf-keys { display: grid; justify-content: center; gap: 2px; margin-bottom: 30px; }
.jf-keys__row { display: flex; justify-content: center; gap: 4px; }
.jf-key { min-width: 28px; height: 32px; padding: 0 5px !important; font-size: 20px; color: rgba(255, 255, 255, .6) !important; border-radius: 3px; }
.jf-key .jf-icon { width: 22px; height: 22px; }
.jf-key:focus { background: var(--jf-accent) !important; color: #fff !important; }
.jf-suggestions { display: grid; justify-items: center; gap: 4px; }
.jf-suggestion { color: var(--jf-accent) !important; font-weight: 600; font-size: 20px; padding: 10px 12px; border-radius: 4px; }
.jf-suggestion:focus { background: var(--jf-accent); color: #fff !important; }

/* Player OSD */
#fc-osd { position: fixed; inset: 0; z-index: 10001; pointer-events: none; color: #fff; font: 400 20px var(--jf-font); opacity: 0; transition: opacity .2s; }
#fc-osd.jf-osd--on { opacity: 1; }
#fc-osd:not(.jf-osd--on) * { visibility: hidden; }
.jf-osd__top { position: absolute; top: 0; left: 0; right: 0; height: 150px; display: flex; align-items: flex-start; gap: 16px; padding: 22px 32px; background: linear-gradient(rgba(15, 15, 15, .75), rgba(15, 15, 15, 0)); pointer-events: auto; }
.jf-osd__title { font-size: 23.4px; line-height: 56px; }
.jf-osd__top .jf-clock { line-height: 56px; }
.jf-osd__spacer { flex: 1; }
.jf-osd__bottom { position: absolute; left: 0; right: 0; bottom: 0; padding: 60px 16px 24px; background: linear-gradient(rgba(10, 10, 10, 0), rgba(10, 10, 10, .85)); pointer-events: auto; }
.jf-osd__timeline { display: flex; align-items: center; gap: 12px; padding: 0 10px; }
.jf-osd__time { font-size: 20px; min-width: 60px; }
.jf-slider { flex: 1; height: 38px; display: flex; align-items: center; padding: 0 10px !important; border-radius: 19px; }
.jf-slider__track { position: relative; flex: 1; height: 4px; background: rgba(255, 255, 255, .25); }
.jf-slider__fill { height: 100%; background: var(--jf-accent); }
.jf-slider__thumb { position: absolute; top: 50%; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; background: var(--jf-accent); }
.jf-slider:focus .jf-slider__thumb { transform: scale(1.4); box-shadow: 0 0 0 4px rgba(0, 164, 220, .35); }
.jf-osd__buttons { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.jf-osd__ends { margin-left: 50px; }

/* Up Next card + "Are you still watching?" (content/player.js shadow parts) in the Jellyfin look. */
html.fc-shell #player > div::part(box) { background: rgba(16, 16, 16, .95); border-radius: 4px; font-family: var(--jf-font); box-shadow: none; }
html.fc-shell #player > div::part(play) { background: var(--jf-accent); color: #fff; border-radius: 4.3px; }
html.fc-shell #player > div::part(cancel) { background: rgba(255, 255, 255, .12); border-radius: 4.3px; }
html.fc-shell #player > div::part(title) { font-weight: 600; }

.fc-toast { position: fixed; left: 50%; bottom: 3rem; transform: translateX(-50%); z-index: 2147483647; background: rgba(20, 20, 20, .92); color: #fff; padding: .75rem 1.5rem; border-radius: 8px; font: 600 1.1rem system-ui, sans-serif; }

/* Header sign-in link (shown when signed out) */
.jf-signin { font-weight: 600; font-size: 20px; color: #fff !important; background: var(--jf-accent); border-radius: 4.3px; padding: 8px 18px; margin-right: 8px; }
.jf-signin:focus { box-shadow: 0 0 0 4px var(--jf-focus); }

/* Settings */
.jf-settings { max-width: 1100px; margin: 0 auto; padding-top: 30px; }
.jf-settings__section { padding: 10px 0 30px; border-bottom: 1px solid rgba(255, 255, 255, .08); }
.jf-settings .jf-section__title { padding-left: 0; }
.jf-settings__status { margin: 6px 0 16px; }
.jf-settings__form { display: grid; gap: 14px; max-width: 640px; }
.jf-settings__msg { min-height: 27px; margin: 0; color: var(--jf-accent); }
.jf-settings__about { color: var(--jf-text-2); font-size: 17px; margin: 4px 0; word-break: break-all; }
.jf-field { display: grid; gap: 6px; }
.jf-field__label { font-size: 18px; color: var(--jf-text-2); }
.jf-input { height: 56px; font: 400 22px var(--jf-font); color: #fff; background: #1c1c1c; border: 3px solid #333; border-radius: 4px; padding: 0 12px; }
.jf-input:focus { border-color: var(--jf-accent); outline: none; }
.jf-input--code { letter-spacing: .12em; text-transform: uppercase; max-width: 320px; }
.jf-button { justify-self: start; min-width: 160px; height: 56px; padding: 0 28px !important; border-radius: 4.3px; background: rgba(255, 255, 255, .12) !important; color: #fff !important; font-weight: 600 !important; display: inline-flex; align-items: center; justify-content: center; }
.jf-button:focus { background: var(--jf-accent) !important; }
.jf-button--inline { margin-left: 12px; height: 48px; }
.jf-toggle { display: inline-flex; align-items: center; gap: 16px; padding: 10px 12px !important; border-radius: 4.3px; font-size: 20px; }
.jf-toggle::before { content: ''; width: 52px; height: 28px; border-radius: 14px; background: #444; box-shadow: inset 0 0 0 2px #555; transition: background .15s; }
.jf-toggle--on::before { background: var(--jf-accent); }
.jf-toggle:focus { background: rgba(255, 255, 255, .1) !important; box-shadow: 0 0 0 3px var(--jf-focus); }

/* ---- Skeletons (first visit, while the site's page loads) ---- */
.jf-skel { background: #242424; border-radius: 4px; animation: jf-pulse 1.4s ease-in-out infinite; }
.jf-skel--text { height: 18px; margin: 12px auto 0; }
.jf-section__title .jf-skel--text { height: 26px; margin: 8px 0 4px; }
.jf-skel-body .jf-skel--text { margin: 0 0 22px; height: 24px; }
.jf-skel-body .jf-skel--text:first-child { height: 40px; }
.jf-row--skel { overflow: hidden; }
.jf-skel-card .jf-card__img { background: #242424; }
@keyframes jf-pulse { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }

/* ---- Loading screen before playback ---- */
#fc-loading { position: fixed; inset: 0; z-index: 9500; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: #000 center / cover no-repeat; color: #fff; font: 400 24px/1.4 var(--jf-font); text-align: center; }
#fc-loading::before { content: ''; position: absolute; inset: 0; background: rgba(0, 0, 0, .75); }
#fc-loading > * { position: relative; }
.jf-spinner { width: 76px; height: 76px; margin-bottom: 12px; border: 6px solid rgba(255, 255, 255, .18); border-top-color: var(--jf-accent); border-radius: 50%; animation: jf-spin .9s linear infinite; }
.jf-loading__title { font-size: 40px; font-weight: 600; line-height: 1.2; }
.jf-loading__sub { font-size: 24px; color: rgba(255, 255, 255, .8); }
@keyframes jf-spin { to { transform: rotate(360deg); } }
html.fc-playing #fc-loading { display: none; }

/* ---- Profiles: "Who's watching?" (Nuvio TV look: NuvioTVSmart profile screen, measured) ---- */
.nv-profiles { position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 72px 96px 56px; background: #0d0d0d; color: #fff; text-align: center; box-sizing: border-box; }
.nv-profiles__brand { font: 700 44px/88px var(--jf-font); letter-spacing: .5px; background: linear-gradient(90deg, #aa5cc3, #00a4dc); -webkit-background-clip: text; color: transparent; }
.nv-profiles__title { margin: 8px 0 0; font: 500 88px/1.05 var(--jf-font); letter-spacing: -1px; }
.nv-profiles__subtitle { margin: 24px 0 0; font: 500 36px/1.3 var(--jf-font); color: #b3b3b3; }
.nv-profiles__grid { display: flex; justify-content: center; align-items: flex-start; gap: 56px; min-height: 476px; margin-top: auto; flex-wrap: wrap; }
.nv-profiles__status { min-height: 40px; margin: 12px 0 0; font-size: 26px; color: #b3b3b3; display: flex; align-items: center; gap: 16px; }
.nv-profiles__hint { margin: auto 0 0; font: 500 28px/1.35 var(--jf-font); color: rgba(128, 128, 128, .9); }
.nv-profile { width: 304px; padding: 16px 20px; display: flex; flex-direction: column; align-items: center; transition: transform 210ms cubic-bezier(.22, 1, .36, 1); }
.nv-profile:focus { transform: scale(1.04); }
.nv-profile__ring { position: relative; width: 244px; height: 244px; display: flex; align-items: center; justify-content: center; }
.nv-profile__ring::before { content: ''; position: absolute; width: 228px; height: 228px; border-radius: 50%; border: 2px solid rgba(51, 51, 51, .75); box-sizing: border-box; transition: all 210ms cubic-bezier(.22, 1, .36, 1); }
.nv-profile:focus .nv-profile__ring::before { width: 244px; height: 244px; border: 6px solid #fff; }
.nv-avatar { position: relative; width: 192px; height: 192px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font: 600 76px/1 var(--jf-font); color: #fff; transition: all 210ms cubic-bezier(.22, 1, .36, 1); }
.nv-profile:focus .nv-avatar { width: 204px; height: 204px; font-size: 82px; }
.nv-avatar--add { background: transparent; color: #808080; }
.nv-avatar--add::before, .nv-avatar--add::after { content: ''; position: absolute; left: 50%; top: 50%; border-radius: 999px; background: currentColor; transform: translate(-50%, -50%); }
.nv-avatar--add::before { width: 52px; height: 6px; }
.nv-avatar--add::after { width: 6px; height: 52px; }
.nv-profile--add:focus .nv-avatar--add { color: #fff; background: rgba(255, 255, 255, .12); }
.nv-profile__name { margin-top: 24px; font: 500 34px/1.2 var(--jf-font); color: #b3b3b3; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nv-profile:focus .nv-profile__name { color: #fff; font-weight: 600; }
.nv-profile__badge { margin-top: 16px; min-height: 32px; font: 600 22px/1.1 var(--jf-font); letter-spacing: 1.6px; color: #ffb300; display: flex; align-items: center; gap: 8px; }
.nv-lock { width: 24px; height: 24px; fill: #b3b3b3; }
.nv-profiles--compact .nv-profiles__grid { gap: 24px; min-height: 382px; flex-wrap: nowrap; }
.nv-profiles--compact .nv-profile { width: 248px; padding: 14px; }
.nv-profiles--compact .nv-profile__ring, .nv-profiles--compact .nv-profile:focus .nv-profile__ring::before { width: 186px; height: 186px; }
.nv-profiles--compact .nv-profile__ring::before { width: 174px; height: 174px; }
.nv-profiles--compact .nv-avatar { width: 146px; height: 146px; font-size: 58px; }
.nv-profiles--compact .nv-profile:focus .nv-avatar { width: 156px; height: 156px; font-size: 62px; }
.nv-profiles--compact .nv-profile__name { margin-top: 18px; font-size: 26px; }
.nv-spinner { width: 32px; height: 32px; margin: 0; border-width: 4px; }

/* editor + PIN overlays */
.nv-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, .78); }
.nv-panel { background: #1a1a1a; border-radius: 16px; padding: 40px 56px; color: #fff; text-align: left; box-shadow: 0 24px 80px rgba(0, 0, 0, .6); }
.nv-panel__title { margin: 0 0 24px; font: 600 40px/1.2 var(--jf-font); }
.nv-editor { width: 1280px; }
.nv-editor__body { display: flex; gap: 56px; }
.nv-editor__preview { flex: none; padding-top: 12px; }
.nv-avatar--preview { width: 220px; height: 220px; font-size: 88px; }
.nv-editor__fields { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.nv-editor__label { margin-top: 12px; font-size: 22px; color: #b3b3b3; }
.nv-editor__note { margin: 4px 0; font-size: 20px; color: #808080; }
.nv-editor__msg { min-height: 28px; margin: 8px 0 0; font-size: 22px; color: #ffb4a9; }
.nv-editor__actions { margin-top: 8px; }
.nv-input { width: 100%; max-width: 640px; }
.nv-row { display: flex; gap: 16px; flex-wrap: wrap; }
.nv-btn { border-radius: 999px !important; }
.nv-btn--on, .nv-btn--primary { background: #fff !important; color: #111 !important; }
.nv-btn--danger { color: #ff8a80 !important; }
.nv-swatches { display: flex; gap: 14px; }
.nv-swatch { width: 52px; height: 52px; border-radius: 50%; border: 3px solid transparent !important; }
.nv-swatch--on { border-color: #fff !important; }
.nv-swatch:focus { transform: scale(1.15); box-shadow: 0 0 0 4px var(--jf-focus); }
.nv-pin { width: 620px; text-align: center; }
.nv-pin__dots { display: flex; justify-content: center; gap: 28px; margin: 8px 0 12px; }
.nv-pin__dot { width: 28px; height: 28px; border-radius: 50%; border: 3px solid #b3b3b3; }
.nv-pin__dot--on { background: #fff; border-color: #fff; }
.nv-pin__dots--shake { animation: nv-shake .4s; }
.nv-pin__msg { min-height: 30px; margin: 0 0 12px; color: #ffb4a9; font-size: 22px; }
.nv-pin__pad { display: grid; grid-template-columns: repeat(3, 120px); gap: 16px; justify-content: center; }
.nv-key { height: 88px; border-radius: 16px !important; background: #2a2a2a !important; font-size: 36px !important; display: flex; align-items: center; justify-content: center; }
.nv-key:last-child { grid-column: 2; }
.nv-key:focus { background: #fff !important; color: #111 !important; }
.nv-key .jf-icon { width: 36px; height: 36px; fill: currentColor; }
@keyframes nv-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-14px); } 75% { transform: translateX(14px); } }

/* header avatar + settings */
.jf-profilebtn__avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font: 600 20px/1 var(--jf-font); color: #fff; }
.jf-settings__avatar { width: 48px; height: 48px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; color: #fff; margin-left: 16px; }

/* ---- Left sidebar (Nuvio-style rail; expands while focused) ---- */
.jf-main--rail { padding-left: 96px; }
.nv-sidebar { position: fixed; left: 0; top: 0; bottom: 0; z-index: 30; width: 96px; display: flex; flex-direction: column; padding: 28px 16px; box-sizing: border-box; overflow: hidden;
  background: #1a1a1a; transition: width .22s cubic-bezier(.22, 1, .36, 1); } /* solid, a bit lighter than --jf-bg */
.nv-sidebar:focus-within { width: 352px; }
.nv-side__items { margin: auto 0; display: flex; flex-direction: column; gap: 12px; }
#fc-app .nv-side__item { display: flex; align-items: center; gap: 22px; width: 64px; height: 64px; border-radius: 18px; color: #8f8f8f; white-space: nowrap; transition: width .22s cubic-bezier(.22, 1, .36, 1); }
#fc-app .nv-sidebar:focus-within .nv-side__item { width: 320px; }
.nv-side__icon { flex: none; width: 64px; height: 64px; border-radius: 18px; display: flex; align-items: center; justify-content: center; }
.nv-side__icon .jf-icon { width: 34px; height: 34px; fill: currentColor; }
#fc-app .nv-side__item--active { color: #fff; } /* #fc-app: beats \`#fc-app a { color: inherit }\` */
.nv-side__item--active .nv-side__icon { background: #fff; color: #111; }
.nv-side__label { font: 600 26px/1 var(--jf-font); opacity: 0; transition: opacity .18s; }
.nv-sidebar:focus-within .nv-side__label { opacity: 1; }
#fc-app .nv-side__item:focus { color: #111; background: #fff; } /* focused: a white pill, dark icon + label */
.nv-side__item:focus .nv-side__icon { background: transparent; color: #111; }
/* focus on another link: the current section's link is a faint pill (only the focused one is solid) */
#fc-app .nv-sidebar:focus-within .nv-side__item--active:not(:focus) { background: rgba(255, 255, 255, .14); }
.nv-sidebar:focus-within .nv-side__item--active:not(:focus) .nv-side__icon { background: transparent; color: #fff; }
.nv-side__avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font: 600 24px/1 var(--jf-font); color: #fff; }
.jf-corner { position: fixed; top: 22px; right: 40px; z-index: 25; display: flex; align-items: center; gap: 18px; text-shadow: 0 1px 6px rgba(0, 0, 0, .8); }
.jf-corner .jf-clock { font-size: 24px; margin: 0; }
.jf-pagetitle--rail { margin-left: 96px !important; }
.jf-pagetitle { margin: 0; padding: 36px 0 8px var(--jf-pad); font: 600 40px/1.2 var(--jf-font); color: var(--jf-text); }

/* ---- Home hero (Apple TV\u2013style): active 16:9, others 4:3, half the screen tall ---- */
.ah-hero { position: relative; overflow: hidden; padding: 64px 0 40px var(--jf-pad); --ah-h: 50vh; --ah-gap: 32px; }
.ah-hero + .jf-personal .jf-section:first-child .jf-section__title, .ah-hero + .jf-personal:empty + .jf-section .jf-section__title { padding-top: 8px; }
.ah-track { display: flex; gap: var(--ah-gap); height: var(--ah-h); transform: translateX(calc(var(--i, 0) * -1 * (var(--ah-h) * 4 / 3 + var(--ah-gap)))); transition: transform .45s cubic-bezier(.22, 1, .36, 1); }
.ah-item { position: relative; flex: none; height: 100%; width: calc(var(--ah-h) * 4 / 3); }
.ah-item--active { width: calc(var(--ah-h) * 16 / 9); }
.ah-media { position: absolute; inset: 0; border-radius: 16px; overflow: hidden; background: #1a1a1a center / cover no-repeat; }
/* Rounded corners without clipping the iframe (clip-path hid the trailer on the TV): paint the page colour over its corners */
.ah-media::before { content: ''; position: absolute; inset: 0; z-index: 2; border-radius: 16px; pointer-events: none; box-shadow: 0 0 0 16px var(--jf-bg); }
.ah-item:not(.ah-item--active) .ah-media { filter: brightness(.55); }
.ah-media::after { content: ''; position: absolute; inset: 0; pointer-events: none; transition: opacity .6s;
  background: linear-gradient(0deg, rgba(0, 0, 0, .88) 0, rgba(0, 0, 0, .45) 38%, rgba(0, 0, 0, 0) 68%), linear-gradient(90deg, rgba(0, 0, 0, .55) 0, rgba(0, 0, 0, 0) 55%); }
.ah-item:not(.ah-item--active) .ah-media::after { background: linear-gradient(0deg, rgba(0, 0, 0, .8) 0, rgba(0, 0, 0, 0) 45%); }
.ah-item--playing .ah-media::after { opacity: 0; }
/* focus ring on the item (clip-path on .ah-media would cut it off); :has() isn't in the TV's Chrome 94 \u2192 class from hero.js */
.ah-item::after { content: ''; position: absolute; inset: 0; border-radius: 16px; pointer-events: none; box-shadow: 0 0 0 4px var(--jf-focus), 0 18px 50px rgba(0, 0, 0, .6); opacity: 0; }
.ah-item--focus::after { opacity: 1; }
.ah-video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; pointer-events: none; opacity: 0; transform: scale(1.2); transition: opacity .2s; } /* out fast: YouTube's pause overlay mustn't show */
.ah-item--video .ah-video { opacity: 1; transition: opacity .8s; }
.ah-info { position: absolute; left: 40px; right: 40px; bottom: 32px; transition: opacity .5s; }
.ah-item--active .ah-info { left: 56px; right: 56px; bottom: 48px; }
.ah-item:not(.ah-item--active) .ah-title { font-size: 34px; max-width: 100%; }
.ah-item:not(.ah-item--active) .ah-meta { font-size: 19px; margin-top: 8px; }
.ah-item:not(.ah-item--active) .ah-overview { font-size: 19px; max-width: 100%; margin-top: 8px; }
.ah-buttons { max-height: 0; opacity: 0; visibility: hidden; overflow: hidden; transition: max-height .3s ease, opacity .3s ease, margin .3s ease; }
.ah-item--active .ah-buttons { max-height: 90px; opacity: 1; visibility: visible; overflow: visible; }
.ah-item--playing .ah-info { opacity: 0; }
.ah-item--playing .ah-info:focus-within { opacity: 1; }
.ah-title { font: 700 58px/1.08 var(--jf-font); color: #fff; letter-spacing: -.5px; text-shadow: 0 2px 16px rgba(0, 0, 0, .5); max-width: 80%; }
.ah-meta { margin-top: 12px; font: 600 22px/1.3 var(--jf-font); color: rgba(255, 255, 255, .85); }
.ah-overview { margin-top: 12px; max-width: 62%; font: 400 22px/1.4 var(--jf-font); color: rgba(255, 255, 255, .85); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ah-buttons { display: flex; gap: 16px; margin-top: 0; }
.ah-item--active .ah-buttons { margin-top: 28px; }
.ah-btn { height: 60px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px !important; transition: transform .15s, background .15s; }
.ah-btn .jf-icon { width: 30px; height: 30px; fill: currentColor; }
.ah-watch { gap: 10px; padding: 0 34px !important; background: rgba(255, 255, 255, .92) !important; color: #111 !important; font: 700 24px/1 var(--jf-font) !important; }
.ah-pause { width: 60px; background: rgba(255, 255, 255, .22) !important; color: #fff !important; }
.ah-btn:focus, .ah-mute:focus { transform: scale(1.08); background: #fff !important; color: #111 !important; box-shadow: 0 0 0 4px var(--jf-focus); }
.ah-dots { display: flex; gap: 10px; margin: 24px 0 0; }
.ah-mute { position: absolute; right: 28px; bottom: 28px; width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, .45) !important; color: #fff; z-index: 3; transition: transform .15s, background .15s; }
.ah-mute[hidden] { display: none; }
.ah-mute .jf-icon { width: 28px; height: 28px; fill: currentColor; }
.ah-dot { width: 10px; height: 10px; border-radius: 5px; background: rgba(255, 255, 255, .3); transition: width .3s, background .3s; }
.ah-dot--on { width: 30px; background: #fff; }

/* ---- In-app update bar (top of Home) ---- */
.vb-update { display: flex; align-items: center; gap: 20px; margin: 40px var(--jf-pad) -24px; padding: 16px 20px 16px 28px; border-radius: 16px; background: #1f2a33; border: 1px solid rgba(0, 164, 220, .45); font-size: 22px; }
.vb-update__text { flex: 1; }
.vb-update__btn { height: 52px !important; }
.vb-update__btn--primary { background: #fff !important; color: #111 !important; }
.vb-update__btn:focus { background: var(--jf-accent) !important; color: #fff !important; }

/* ---- Desktop (extension "TV interface" option, desktop.js): the 10-foot UI scaled for a monitor, mouse-friendly ---- */
html.fc-desktop { --vb-zoom: .68; }
html.fc-desktop #fc-app, html.fc-desktop #fc-osd, html.fc-desktop #fc-loading { zoom: var(--vb-zoom); }
/* vh inside a zoomed box shrinks with it: undo for full-height screens; the hero keeps ~42% of the window */
html.fc-desktop .nv-profiles { min-height: calc(100vh / var(--vb-zoom)); }
html.fc-desktop .ah-hero { --ah-h: calc(42vh / var(--vb-zoom)); }
html.fc-desktop .jf-row { scrollbar-width: none; }
html.fc-desktop #fc-app a, html.fc-desktop #fc-app [role="button"] { cursor: pointer; }
.vb-rowarrow { position: fixed; z-index: 9001; /* above #fc-app */ width: 56px; border: 0; padding: 0; background: linear-gradient(90deg, rgba(16, 16, 16, .85), rgba(16, 16, 16, 0)); color: #fff; font: 300 48px/1 var(--jf-font); cursor: pointer; opacity: .75; transition: opacity .15s; }
.vb-rowarrow--next { background: linear-gradient(270deg, rgba(16, 16, 16, .85), rgba(16, 16, 16, 0)); }
.vb-rowarrow:hover { opacity: 1; }
.vb-rowarrow[hidden] { display: none; }
`;

  // src/shell/sidebar.js
  var ITEMS = [
    { id: "home", label: "Home", icon: "home", href: "/home" },
    { id: "tv", label: "Shows", icon: "tv", href: "/show/tvshows" },
    { id: "movies", label: "Movies", icon: "movie", href: "/show/movies" },
    { id: "favourites", label: "Favourites", icon: "heart", href: "/mylists/favorites" },
    { id: "search", label: "Search", icon: "search", href: "/search/" },
    { id: "settings", label: "Settings", icon: "settings", href: "/home#settings" }
  ];
  function sidebar(active) {
    const p = currentProfile();
    const profile = h(
      "a",
      { class: "nv-side__item nv-side__profile", href: "/home#profiles", "aria-label": p ? `${p.name} \u2014 switch profile` : "Profiles" },
      h("span", { class: "nv-side__icon" }, p ? h("span", { class: "nv-side__avatar", style: { background: p.color } }, initialOf(p.name)) : icon("person")),
      h("span", { class: "nv-side__label" }, p ? p.name : "Profiles")
    );
    const items = ITEMS.map((it) => h(
      "a",
      { class: `nv-side__item${it.id === active ? " nv-side__item--active" : ""}`, href: it.href, "aria-label": it.label, "data-side": it.id },
      h("span", { class: "nv-side__icon" }, icon(it.icon)),
      h("span", { class: "nv-side__label" }, it.label)
    ));
    return h("nav", { class: "nv-sidebar", "aria-label": "Menu" }, profile, h("div", { class: "nv-side__items" }, items));
  }
  function railLayout(app2, active, main, title) {
    main.classList.add("jf-main--rail");
    app2.append(
      sidebar(active),
      h("div", { class: "jf-corner" }, !isSignedIn() && h("a", { class: "jf-signin", href: "/home#settings" }, "Sign in"), clock()),
      title ? h("h1", { class: "jf-pagetitle jf-pagetitle--rail" }, title) : "",
      main
    );
  }

  // src/shell/meta.js
  var TTL = 24 * 36e5;
  var queue2 = Promise.resolve();
  function ensureMeta(items, max = 12, onEach) {
    queue2 = queue2.catch(() => {
    }).then(async () => {
      const cache2 = metaCache.all();
      const todo = items.filter((it) => !cache2[it.pid] || !("trailer" in cache2[it.pid]) || Date.now() - (cache2[it.pid].ts || 0) > TTL).slice(0, max);
      for (const it of todo) {
        try {
          const d = await details(it.type, it.pid);
          metaCache.put(it.pid, {
            type: it.type,
            title: d.title,
            year: d.year,
            slug: d.slug,
            poster: d.poster,
            backdrop: d.backdrop,
            trailer: d.trailer,
            eps: d.seasons.flatMap((s) => s.episodes.map((e) => [e.season, e.episode, e.title, e.thumb]))
          });
          if (onEach) onEach();
        } catch (e) {
          console.warn("[viewbox-tv] meta failed", it.pid, e);
        }
      }
      return metaCache.all();
    });
    return queue2;
  }
  var epsOf = (m) => ((m == null ? void 0 : m.eps) || []).map(([season, episode, title, thumb]) => ({ season, episode, title, thumb }));
  var findEp = (m, s, e) => epsOf(m).find((x) => x.season === s && x.episode === e);
  var hrefOf = (type, pid, m, s, e) => `/watch/${type === "movie" ? "movie" : "tv"}/${pid}/${(m == null ? void 0 : m.slug) || "x"}${s ? `/season/${s}/episode/${e}` : ""}`;

  // src/shell/hero.js
  var DWELL_MS = 1200;
  var REVEAL_MS = 3e3;
  var SOUND_CHECK_MS = 3500;
  var trailerOf = (it) => {
    const m = metaCache.all()[it.pid];
    return m && "trailer" in m ? m.trailer || null : void 0;
  };
  var post = (frame, func, args = []) => {
    try {
      frame.contentWindow.postMessage(JSON.stringify({ event: "command", func, args, id: 1, channel: "widget" }), "*");
    } catch (e) {
    }
  };
  function heroView(all) {
    const items = all.filter((it) => it.pid);
    let idx = 0;
    let player = null;
    let dwell = null;
    const els = items.map((it) => {
      const media = h("div", { class: "ah-media", "aria-label": `${it.title}. OK to play or pause the trailer`, style: it.backdrop ? { backgroundImage: `url("${img(it.backdrop, "w1280")}")` } : null });
      const pauseBtn = h("button", { class: "ah-btn ah-pause", "aria-label": "Pause trailer", onclick: () => toggle() }, icon("pause"));
      const watch = h("button", { class: "ah-btn ah-watch", onclick: () => watchItem(it) }, icon("play"), h("span", {}, "Watch"));
      const meta = [it.year, it.rating && `\u2605 ${it.rating}`, it.contentRating !== "NR" && it.contentRating].filter(Boolean).join("  \xB7  ");
      const info = h(
        "div",
        { class: "ah-info" },
        h("div", { class: "ah-title" }, it.title),
        meta && h("div", { class: "ah-meta" }, meta),
        it.overview && h("div", { class: "ah-overview" }, it.overview),
        h("div", { class: "ah-buttons" }, watch, pauseBtn)
      );
      media.addEventListener("focus", () => item.classList.add("ah-item--focus"));
      media.addEventListener("blur", () => item.classList.remove("ah-item--focus"));
      const mute = h("button", { class: "ah-mute", "aria-label": "Unmute trailer", hidden: true, onclick: () => toggleMute() }, icon("mute"));
      const item = h("div", { class: "ah-item" }, media, info, mute);
      media.addEventListener("click", () => {
        const j = els.findIndex((x) => x.media === media);
        if (j === idx) toggle();
        else select(j);
      });
      return { it, item, media, info, watch, pauseBtn, mute };
    });
    const track = h("div", { class: "ah-track" }, els.map((e) => e.item));
    const dots = h("div", { class: "ah-dots" }, items.map(() => h("span", { class: "ah-dot" })));
    const root = h("section", { class: "ah-hero", "aria-label": "Featured" }, track, dots);
    const cur = () => els[idx];
    function watchItem(it) {
      stop();
      location.assign(it.type === "movie" ? `${it.href}#play` : it.href);
    }
    function stop() {
      clearTimeout(dwell);
      if (!player) return;
      clearTimeout(player.soundTimer);
      clearTimeout(player.revealTimer);
      player.frame.remove();
      player = null;
    }
    function paint() {
      const e = cur();
      const playing = !!player && player.state === 1 && !player.userPaused;
      const shown = playing && !!player.revealed;
      e.item.classList.toggle("ah-item--video", shown);
      e.item.classList.toggle("ah-item--playing", shown);
      e.pauseBtn.replaceChildren(icon(playing ? "pause" : "trailer"));
      e.pauseBtn.setAttribute("aria-label", playing ? "Pause trailer" : "Play trailer");
      e.mute.hidden = !(player && player.started);
      e.mute.replaceChildren(icon(player && player.muted ? "mute" : "volume"));
      e.mute.setAttribute("aria-label", player && player.muted ? "Unmute trailer" : "Mute trailer");
    }
    function load2() {
      stop();
      const e = cur();
      const id = trailerOf(e.it);
      e.pauseBtn.hidden = id === null;
      paint();
      if (id === void 0) {
        ensureMeta([{ pid: e.it.pid, type: e.it.type }], 1).then(() => {
          if (cur() === e && !player) load2();
        });
        return;
      }
      if (!id) return;
      dwell = setTimeout(() => {
        dwell = null;
        if (root.contains(document.activeElement)) start(e, id);
      }, DWELL_MS);
    }
    function start(e, id, muted = false) {
      const src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&cc_load_policy=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
      const frame = h("iframe", { class: "ah-video", src, allow: "autoplay; encrypted-media", frameborder: "0", tabindex: "-1", title: `${e.it.title} trailer` });
      frame.addEventListener("load", () => post(frame, "addEventListener", ["onStateChange"]));
      frame.addEventListener("load", () => {
        try {
          frame.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
        } catch (err) {
        }
      });
      e.media.append(frame);
      player = { frame, state: -1, userPaused: false, muted, id };
      if (!muted) player.soundTimer = setTimeout(() => {
        if (player && player.frame === frame && player.state !== 1) {
          post(frame, "mute");
          post(frame, "playVideo");
          player.muted = true;
          paint();
        }
      }, SOUND_CHECK_MS);
    }
    const onMessage = (ev) => {
      if (!player || ev.source !== player.frame.contentWindow) return;
      let d;
      try {
        d = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
      } catch (err) {
        return;
      }
      if (!d) return;
      const state = d.event === "onStateChange" ? d.info : d.event === "infoDelivery" && d.info && typeof d.info.playerState === "number" ? d.info.playerState : null;
      if (d.event === "onError") {
        cur().pauseBtn.hidden = true;
        stop();
        paint();
        return;
      }
      if (state === null || state === player.state) return;
      player.state = state;
      if (state === 1 && !player.started) {
        player.started = true;
        post(player.frame, "unloadModule", ["captions"]);
        post(player.frame, "unloadModule", ["cc"]);
        const pl = player;
        pl.revealTimer = setTimeout(() => {
          pl.revealed = true;
          if (player === pl) paint();
        }, REVEAL_MS);
      }
      if (state === 1 && player.userPaused) post(player.frame, "pauseVideo");
      if (state === 0) {
        post(player.frame, "seekTo", [0, true]);
        post(player.frame, "playVideo");
      }
      paint();
    };
    window.addEventListener("message", onMessage);
    function toggle() {
      if (!player) {
        const id = trailerOf(cur().it);
        if (id) {
          clearTimeout(dwell);
          start(cur(), id);
        }
        return;
      }
      player.userPaused = !player.userPaused;
      post(player.frame, player.userPaused ? "pauseVideo" : "playVideo");
      paint();
    }
    function toggleMute() {
      if (!player) return;
      player.muted = !player.muted;
      player.userMuted = player.muted;
      post(player.frame, player.muted ? "mute" : "unMute");
      paint();
    }
    function select(i, focus = "card") {
      idx = Math.max(0, Math.min(els.length - 1, i));
      els.forEach((e2, j) => {
        const on = j === idx;
        e2.item.classList.toggle("ah-item--active", on);
        e2.item.classList.remove("ah-item--playing", "ah-item--video");
        if (on) {
          e2.media.setAttribute("role", "button");
          e2.media.setAttribute("tabindex", "0");
        } else {
          e2.media.removeAttribute("role");
          e2.media.removeAttribute("tabindex");
        }
        dots.children[j].classList.toggle("ah-dot--on", on);
      });
      track.style.setProperty("--i", idx);
      load2();
      const e = cur();
      const target = focus === "card" ? e.media : focus === "watch" ? e.watch : focus === "last" ? lastBtn(e) : null;
      if (target) target.focus({ preventScroll: true });
    }
    const rowBtns = (e) => [e.watch, e.pauseBtn, e.mute].filter((b) => !b.hidden);
    const lastBtn = (e) => rowBtns(e).pop();
    keyHook.fn = (e) => {
      if (!root.isConnected) {
        keyHook.fn = null;
        window.removeEventListener("message", onMessage);
        stop();
        return false;
      }
      if (player && player.muted && !player.userMuted && player.state === 1) {
        post(player.frame, "unMute");
        player.muted = false;
        paint();
      }
      const k = e.keyCode;
      const c = cur();
      const a = document.activeElement;
      const row = rowBtns(c);
      const at = row.indexOf(a);
      if (at >= 0) {
        if (k === 37) {
          if (at > 0) row[at - 1].focus({ preventScroll: true });
          else if (idx > 0) select(idx - 1, "last");
          else enterSidebar();
          return true;
        }
        if (k === 39) {
          if (at < row.length - 1) row[at + 1].focus({ preventScroll: true });
          else if (idx < els.length - 1) select(idx + 1, "watch");
          return true;
        }
        return false;
      }
      if (a !== c.media) return false;
      if (k === 37) {
        if (idx > 0) select(idx - 1);
        else enterSidebar();
        return true;
      }
      if (k === 39) {
        if (idx < els.length - 1) select(idx + 1);
        return true;
      }
      if (k === 13) {
        toggle();
        return true;
      }
      if (k === 40) {
        cur().watch.focus({ preventScroll: true });
        return true;
      }
      return false;
    };
    root.addEventListener("focusout", () => setTimeout(() => {
      if (player && !root.contains(document.activeElement)) post(player.frame, "pauseVideo");
    }));
    root.addEventListener("focusin", (ev) => {
      if (ev.relatedTarget && root.contains(ev.relatedTarget)) return;
      if (player) {
        if (!player.userPaused) post(player.frame, "playVideo");
      } else if (!dwell) load2();
    });
    select(0, false);
    ensureMeta(items.map((it) => ({ pid: it.pid, type: it.type })), items.length);
    return root;
  }

  // src/shell/views.js
  var favoritePids2 = (t) => Object.keys(localStorage).filter((k) => k.startsWith(`bm:${t}:`)).map((k) => k.split(":")[2]);
  var progress = null;
  var prog = () => progress || (progress = progressIndex(watchEntries()));
  var posterCard = (c) => card({ href: c.href, image: c.poster, title: c.title, sub: c.season ? epLabel(c.season, c.episode) : c.year, progress: progressOf(prog(), c) });
  var focusFirst = (root) => setTimeout(() => {
    var _a;
    if (!document.activeElement || document.activeElement === document.body) (_a = root.querySelector('.ah-media[tabindex="0"]') || root.querySelector(".jf-card, button, a")) == null ? void 0 : _a.focus({ preventScroll: true });
  }, 0);
  function homeView(app2, site) {
    const main = h("main", { class: "jf-main" });
    railLayout(app2, "home", main);
    const personal = h("div", { class: "jf-personal" });
    main.append(
      site.hero.some((x) => x.pid) ? heroView(site.hero) : "",
      personal,
      site.latest.length ? section("Latest Episodes & Movies", site.latest.map(posterCard)) : "",
      site.popular.length ? section("Popular", site.popular.map(posterCard)) : "",
      site.tv.length ? section("Shows", site.tv.map(posterCard)) : "",
      site.movies.length ? section("Movies", site.movies.map(posterCard)) : ""
    );
    focusFirst(main);
    const history2 = watchEntries();
    const cw = continueWatching(history2).slice(0, 12);
    const scanned = load();
    const epsByPid = Object.fromEntries(Object.entries(metaCache.all()).map(([pid, m]) => [pid, epsOf(m)]));
    for (const [pid, s] of Object.entries(scanned)) if (!epsByPid[pid] && s.eps) epsByPid[pid] = s.eps;
    const drawPersonal = () => {
      var _a;
      const meta = metaCache.all();
      const cwCards = cw.filter((e) => meta[e.pid]).map((e) => {
        const m = meta[e.pid];
        const ep = e.type === "tv" && findEp(m, e.season, e.episode);
        return card({
          href: hrefOf(e.type, e.pid, m, e.season, e.episode),
          shape: "landscape",
          image: ep && ep.thumb || m.backdrop,
          imageSize: ep && ep.thumb ? "w300" : "w780",
          title: m.title,
          sub: e.type === "tv" ? epLabel(e.season, e.episode, ep && ep.title) : m.year,
          progress: e.pct
        });
      });
      const eps = { ...epsByPid };
      for (const [pid, m] of Object.entries(meta)) if (m.eps) eps[pid] = epsOf(m);
      const up = nextUp(history2, eps).slice(0, 12);
      const upCards = up.filter((x) => meta[x.pid]).map((x) => {
        const m = meta[x.pid];
        const ep = findEp(m, x.season, x.episode);
        return card({ href: hrefOf("tv", x.pid, m, x.season, x.episode), shape: "landscape", image: ep && ep.thumb || m.backdrop, imageSize: ep && ep.thumb ? "w300" : "w780", title: m.title, sub: epLabel(x.season, x.episode, ep && ep.title) });
      });
      const nc = counts(scanned);
      const newCards = Object.entries(nc).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([pid, n]) => {
        const s = scanned[pid];
        return card({ href: `/watch/tv/${pid}/${s.slug}`, image: s.poster, title: s.title, sub: `${n} new episode${n > 1 ? "s" : ""}`, badge: n });
      });
      const hadFocus = personal.contains(document.activeElement);
      personal.replaceChildren(
        cwCards.length ? section("Continue Watching", cwCards) : "",
        upCards.length ? section("Next Up", upCards) : "",
        newCards.length ? section("New Episodes", newCards) : ""
      );
      if (hadFocus) (_a = personal.querySelector(".jf-card")) == null ? void 0 : _a.focus({ preventScroll: true });
    };
    drawPersonal();
    document.addEventListener("fc-scanned", drawPersonal);
    const need = [...cw.map((e) => ({ pid: e.pid, type: e.type })), ...history2.filter((e) => e.type === "tv" && e.pct >= 0.9).sort((a, b) => b.ts - a.ts).map((e) => ({ pid: e.pid, type: "tv" }))];
    const uniq = [...new Map(need.map((x) => [x.pid, x])).values()].slice(0, 16);
    ensureMeta(uniq).then(drawPersonal);
  }
  function favouritesView(app2) {
    const main = h("main", { class: "jf-main" });
    railLayout(app2, "favourites", main, "Favourites");
    const settingsLink = (text) => h("p", { class: "jf-empty" }, text, " ", h("a", { class: "jf-button jf-button--inline", href: "/home#settings" }, "Open Settings"));
    let loading2 = true;
    const itemsNow = () => [...favoritePids2("t").map((pid) => ({ pid, type: "tv" })), ...favoritePids2("m").map((pid) => ({ pid, type: "movie" }))];
    const draw2 = () => {
      const items = itemsNow();
      const meta = metaCache.all();
      const scanned = load();
      const cardFor = (it) => {
        const m = meta[it.pid] || scanned[it.pid];
        return m && m.title ? card({ href: hrefOf(it.type, it.pid, m), image: m.poster, title: m.title, sub: m.year, progress: progressOf(prog(), it) }) : null;
      };
      const shows = items.filter((i) => i.type === "tv").map(cardFor).filter(Boolean);
      const movies = items.filter((i) => i.type === "movie").map(cardFor).filter(Boolean);
      let empty = "";
      if (!shows.length && !movies.length) {
        if (!isSignedIn()) empty = settingsLink("Sign in to your VIP account to see your favourites.");
        else if (!items.length && !localStorage.getItem("hqs.code")) empty = h("p", { class: "jf-empty" }, "No profile yet \u2014 your favourites come with a profile (tied to a sync code).", " ", h("a", { class: "jf-button jf-button--inline", href: "/home#profiles-manage" }, "Add a profile"));
        else if (!items.length) empty = h("p", { class: "jf-empty" }, "No favourites in this list yet.");
        else empty = h("p", { class: "jf-empty" }, loading2 ? "Loading favourites\u2026" : "Couldn't load your favourites. Try again later.");
      }
      const had = main.contains(document.activeElement);
      main.replaceChildren(shows.length ? section("Shows", shows, "jf-grid") : "", movies.length ? section("Movies", movies, "jf-grid") : "", empty);
      if (!had) focusFirst(main);
    };
    const load2 = () => {
      loading2 = true;
      const scanned = load();
      ensureMeta(itemsNow().filter((i) => {
        var _a;
        return !((_a = scanned[i.pid]) == null ? void 0 : _a.title);
      }), 60, draw2).then(() => {
        loading2 = false;
        draw2();
      });
    };
    draw2();
    load2();
  }
  var SORTS = [["latest", "Latest"], ["best", "Best Rated"], ["name", "Name"]];
  function libraryView(app2, kind, first) {
    const params = new URLSearchParams(location.search);
    let sort = params.get("sort") || "latest";
    let page = 1;
    let lastPage2 = first ? first.lastPage : 1;
    let loading2 = false;
    const grid = h("div", { class: "jf-grid" });
    const count = h("span", { class: "jf-toolbar__count" });
    const sortBtn = h("button", { class: "jf-iconbtn jf-toolbar__sort", "aria-label": "Sort", onclick: () => {
      const i = SORTS.findIndex(([k]) => k === sort);
      sort = SORTS[(i + 1) % SORTS.length][0];
      history.replaceState(null, "", `?sort=${sort}`);
      reload();
    } }, icon("sort"), h("span", {}, ""));
    const main = h("main", { class: "jf-main" }, h("div", { class: "jf-toolbar" }, count, sortBtn), grid);
    railLayout(app2, kind, main, kind === "movies" ? "Movies" : "Shows");
    const add = (cards) => grid.append(...cards.map(posterCard));
    const label = () => {
      count.textContent = `1-${grid.children.length} of ${lastPage2 > page ? `${lastPage2 * 24}+` : grid.children.length}`;
      sortBtn.lastChild.textContent = SORTS.find(([k]) => k === sort)[1];
    };
    async function more() {
      if (loading2 || page >= lastPage2) return;
      loading2 = true;
      try {
        const r = await library(kind, page + 1, sort);
        page += 1;
        lastPage2 = r.lastPage;
        add(r.cards);
        label();
      } finally {
        loading2 = false;
      }
    }
    async function reload() {
      var _a;
      loading2 = true;
      try {
        const r = await library(kind, 1, sort);
        page = 1;
        lastPage2 = r.lastPage;
        grid.replaceChildren();
        add(r.cards);
        label();
        (_a = grid.querySelector(".jf-card")) == null ? void 0 : _a.focus();
      } finally {
        loading2 = false;
      }
    }
    if (first) {
      add(first.cards);
      label();
      focusFirst(grid);
    } else reload();
    grid.addEventListener("focusin", (e) => {
      const i = [...grid.children].indexOf(e.target.closest(".jf-card"));
      if (i >= grid.children.length - 14) more();
    });
  }
  var LETTERS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  function searchView(app2) {
    const initial = decodeURIComponent(location.pathname.replace(/^\/search\/?/, "")).replace(/^\*$/, "");
    const input = h("input", { class: "jf-search__input", type: "text", placeholder: "Search", value: initial, "aria-label": "Search", autocomplete: "off", spellcheck: "false" });
    const results = h("div", { class: "jf-search__results" });
    const keys = h(
      "div",
      { class: "jf-keys" },
      h(
        "div",
        { class: "jf-keys__row" },
        LETTERS.map((l) => h("button", { class: "jf-key", "aria-label": l === " " ? "Space" : l, onclick: () => type(l) }, l === " " ? "\u2423" : l)),
        h("button", { class: "jf-key", "aria-label": "Delete", onclick: () => {
          input.value = input.value.slice(0, -1);
          changed();
        } }, icon("backspace"))
      ),
      h("div", { class: "jf-keys__row" }, "0123456789".split("").map((d) => h("button", { class: "jf-key", onclick: () => type(d) }, d)))
    );
    const main = h("main", { class: "jf-main jf-search" }, h("div", { class: "jf-search__bar" }, icon("search", "jf-search__icon"), input), keys, results);
    railLayout(app2, "search", main);
    function type(ch) {
      input.value += ch.toLowerCase();
      changed();
    }
    let timer;
    let token = 0;
    function changed() {
      clearTimeout(timer);
      timer = setTimeout(run, 450);
    }
    async function run() {
      const q = input.value.trim();
      history.replaceState(null, "", `/search/${encodeURIComponent(q)}`);
      const my = ++token;
      if (!q) return suggestions();
      results.replaceChildren(h("p", { class: "jf-empty" }, "Searching\u2026"));
      const show = (r) => {
        var _a;
        if (my !== token) return;
        const shows = r.cards.filter((c) => c.type === "tv").map(posterCard);
        const movies = r.cards.filter((c) => c.type === "movie").map(posterCard);
        const had = results.contains(document.activeElement);
        results.replaceChildren(
          shows.length ? section("Shows", shows) : "",
          movies.length ? section("Movies", movies) : "",
          !shows.length && !movies.length ? h("p", { class: "jf-empty" }, "No results.") : ""
        );
        if (had) (_a = results.querySelector(".jf-card")) == null ? void 0 : _a.focus({ preventScroll: true });
      };
      try {
        show(await search(q, 1, show));
      } catch (e) {
        if (my === token) results.replaceChildren(h("p", { class: "jf-empty" }, "Search failed. Try again."));
      }
    }
    function suggestions() {
      const meta = metaCache.all();
      const picks = Object.entries(meta).filter(([, m]) => m.title).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0)).slice(0, 14);
      results.replaceChildren(
        h("h2", { class: "jf-section__title jf-center" }, "Suggestions"),
        h("div", { class: "jf-suggestions" }, picks.map(([pid, m]) => h("a", { class: "jf-suggestion", href: hrefOf(m.type, pid, m) }, m.title)))
      );
    }
    input.addEventListener("input", changed);
    if (initial) run();
    else suggestions();
    setTimeout(() => input.focus(), 0);
  }

  // src/shell/details.js
  function detailsView(app2, type, pid, d) {
    metaCache.put(pid, {
      type,
      title: d.title,
      year: d.year,
      slug: d.slug,
      poster: d.poster,
      backdrop: d.backdrop,
      trailer: d.trailer,
      eps: d.seasons.flatMap((s) => s.episodes.map((e) => [e.season, e.episode, e.title, e.thumb]))
    });
    const hist = () => watchEntries().filter((e) => e.pid === pid);
    const pctOf = (s, e) => (hist().find((x) => x.season === s && x.episode === e) || {}).pct || 0;
    const allEps = d.seasons.filter((s) => s.season > 0).flatMap((s) => s.episodes);
    function playTarget() {
      const h2 = hist().filter((x) => x.type === "tv").sort((a, b) => b.ts - a.ts);
      const last = h2[0];
      if (last && last.pct < 0.9) return last;
      if (last) {
        const i = allEps.findIndex((x) => x.season === last.season && x.episode === last.episode);
        if (allEps[i + 1]) return allEps[i + 1];
      }
      return allEps[0];
    }
    function playEpisode(s, e) {
      if (document.readyState !== "loading" && !document.querySelector(`tr.eplist[data-pes="${s}"][data-pep="${e}"]`)) return toast("Episode not available");
      location.assign(`/watch/tv/${pid}/${d.slug || "x"}/season/${s}/episode/${e}`);
    }
    function playMovie() {
      location.hash = "play";
      location.reload();
    }
    const favEl = () => document.querySelector(`.favorite[data-pid="${pid}"]`);
    const isFav = () => !!favEl() && !favEl().classList.contains("fa-heart-o");
    const main = h("main", { class: "jf-main" });
    app2.append(header({ title: d.title }), main);
    function overview() {
      const favBtn = iconButton("heart", "Add to favourites", () => {
        var _a;
        (_a = favEl()) == null ? void 0 : _a.click();
        setTimeout(syncFav, 600);
      }, { class: "jf-detailbtn" });
      const syncFav = () => favBtn.classList.toggle("jf-iconbtn--on", isFav());
      syncFav();
      const target = type === "tv" && playTarget();
      const play = iconButton(
        "play",
        type === "tv" && target && pctOf(target.season, target.episode) > 0.05 ? "Resume" : "Play",
        () => type === "tv" ? target && playEpisode(target.season, target.episode) : playMovie(),
        { class: "jf-detailbtn jf-detailbtn--play" }
      );
      const body = h(
        "div",
        { class: "jf-details__body" },
        h("h1", { class: "jf-details__title" }, d.title),
        h(
          "div",
          { class: "jf-details__meta" },
          d.year && h("span", {}, d.year),
          d.contentRating && d.contentRating !== "NR" && h("span", { class: "jf-rating" }, d.contentRating),
          d.rating && h("span", { class: "jf-star" }, icon("star"), d.rating)
        ),
        h("div", { class: "jf-details__buttons" }, play, favBtn),
        d.overview && h("p", { class: "jf-details__overview" }, d.overview),
        h(
          "table",
          { class: "jf-details__info" },
          d.genres.length && h("tr", {}, h("th", {}, d.genres.length > 1 ? "Genres" : "Genre"), h("td", {}, d.genres.join(", "))),
          d.network && h("tr", {}, h("th", {}, "Studio"), h("td", {}, d.network))
        )
      );
      if (type === "tv") {
        if (target) {
          const ep = allEps.find((x) => x.season === target.season && x.episode === target.episode) || target;
          body.append(section("Next Up", [card({ onclick: () => playEpisode(target.season, target.episode), shape: "landscape", image: ep.thumb || d.backdrop, imageSize: ep.thumb ? "w300" : "w780", title: epLabel(target.season, target.episode, ep.title), progress: pctOf(target.season, target.episode) })]));
        }
        body.append(section("Seasons", d.seasons.map((s) => card({
          onclick: () => {
            location.hash = `season-${s.season}`;
          },
          image: s.poster || d.poster,
          title: s.season === 0 ? "Specials" : `Season ${s.season}`,
          badge: unwatched(s) || null
        }))));
      }
      main.replaceChildren(h("div", { class: "jf-details" }, h("div", { class: "jf-details__poster", style: d.poster ? { backgroundImage: `url("${img(d.poster, "w500")}")` } : null }), body));
      setTimeout(() => play.focus({ preventScroll: true }), 0);
    }
    const unwatched = (s) => s.episodes.filter((e) => pctOf(e.season, e.episode) < 0.9).length;
    function season(n) {
      const s = d.seasons.find((x) => x.season === n);
      if (!s) return overview();
      const first = s.episodes.find((e) => pctOf(e.season, e.episode) < 0.9) || s.episodes[0];
      const play = iconButton("play", "Play", () => playEpisode(first.season, first.episode), { class: "jf-detailbtn jf-detailbtn--play" });
      const list = s.episodes.map((e) => {
        const pct = pctOf(e.season, e.episode);
        return h(
          "button",
          { class: "jf-episode", onclick: () => playEpisode(e.season, e.episode), "aria-label": `${e.episode}. ${e.title}` },
          h(
            "div",
            { class: "jf-episode__thumb", style: e.thumb ? { backgroundImage: `url("${img(e.thumb, "w300")}")` } : null },
            pct >= 0.9 && h("div", { class: "jf-badge jf-badge--check" }, icon("check")),
            pct > 0.05 && pct < 0.9 && h("div", { class: "jf-progress" }, h("div", { class: "jf-progress__fill", style: { width: `${Math.round(pct * 100)}%` } }))
          ),
          h(
            "div",
            { class: "jf-episode__text" },
            h("div", { class: "jf-episode__title" }, `${e.episode}. ${e.title}`),
            e.airDate && h("div", { class: "jf-episode__meta" }, e.airDate)
          )
        );
      });
      main.replaceChildren(h(
        "div",
        { class: "jf-details" },
        h("div", { class: "jf-details__poster", style: { backgroundImage: `url("${img(s.poster || d.poster, "w500")}")` } }),
        h(
          "div",
          { class: "jf-details__body" },
          h("h1", { class: "jf-details__title" }, d.title),
          h("div", { class: "jf-details__subtitle" }, n === 0 ? "Specials" : `Season ${n}`),
          h("div", { class: "jf-details__buttons" }, play),
          h("div", { class: "jf-episodes" }, list)
        )
      ));
      setTimeout(() => play.focus({ preventScroll: true }), 0);
    }
    const render = () => {
      if (!main.isConnected) return window.removeEventListener("hashchange", render);
      app2.scrollTop = 0;
      const m = /^#season-(\d+)$/.exec(location.hash);
      if (m) season(+m[1]);
      else overview();
    };
    window.addEventListener("hashchange", render);
    render();
  }

  // src/shell/updates.js
  var CHECK_KEY = "fc-tv-update-check";
  var DISMISS_KEY = "fc-tv-update-dismissed";
  var seq = 0;
  var hostAvailable = () => typeof window.__vbHost === "function";
  function request(cmd, timeout = 3e4) {
    return new Promise((resolve, reject) => {
      if (!hostAvailable()) return reject(new Error("Updates come from TizenBrew for this install."));
      const id = ++seq;
      const done = () => {
        window.removeEventListener("vb-host", on);
        clearTimeout(t);
      };
      const on = (e) => {
        const d = e.detail || {};
        if (d.id !== id) return;
        done();
        if (d.ok) resolve(d);
        else reject(new Error(d.error || "Update failed."));
      };
      const t = setTimeout(() => {
        done();
        reject(new Error("The app didn't answer \u2014 try again."));
      }, timeout);
      window.addEventListener("vb-host", on);
      window.__vbHost(JSON.stringify({ id, cmd, version: true ? "0.7.2" : "" }));
    });
  }
  var session = { get: (k) => {
    try {
      return JSON.parse(sessionStorage.getItem(k));
    } catch {
      return null;
    }
  }, set: (k, v) => {
    try {
      sessionStorage.setItem(k, JSON.stringify(v));
    } catch {
    }
  } };
  async function checkOnce() {
    const cached = session.get(CHECK_KEY);
    if (cached) return cached;
    const r = await request("check");
    session.set(CHECK_KEY, r);
    return r;
  }
  async function checkNow() {
    const r = await request("check");
    session.set(CHECK_KEY, r);
    return r;
  }
  async function updateNow(onStatus) {
    onStatus && onStatus("Downloading the update\u2026");
    const r = await request("update", 9e4);
    onStatus && onStatus(`Installing v${r.updating}\u2026`);
    session.set(CHECK_KEY, null);
    return r;
  }
  function banner(r) {
    const msg = h("span", { class: "vb-update__text" });
    const setText = (t) => {
      msg.textContent = t;
    };
    const reinstall = r.needsReinstall;
    setText(reinstall ? `Viewbox TV v${r.latest} is out \u2014 it needs a reinstall (download ViewboxTV.wgt from the GitHub release).` : `Update available: Viewbox TV v${r.latest} (you have v${r.current}).`);
    const bar = h("div", { class: "vb-update", role: "status" }, msg);
    const later = h("button", { class: "jf-button vb-update__btn", onclick: () => {
      session.set(DISMISS_KEY, r.latest);
      bar.remove();
    } }, reinstall ? "OK" : "Not now");
    if (!reinstall) {
      const go = h("button", { class: "jf-button vb-update__btn vb-update__btn--primary", onclick: async () => {
        go.disabled = true;
        later.disabled = true;
        try {
          await updateNow(setText);
        } catch (e) {
          setText(e.message);
          go.disabled = false;
          later.disabled = false;
        }
      } }, "Update");
      bar.append(go);
    }
    bar.append(later);
    return bar;
  }
  async function startUpdates() {
    if (!hostAvailable()) return;
    try {
      const b = await request("booted", 1e4);
      if (b.notice) {
        toast(b.notice, 7e3);
        session.set(CHECK_KEY, null);
      }
    } catch (e) {
    }
    let r;
    try {
      r = await checkOnce();
    } catch (e) {
      return;
    }
    if (!r.available || session.get(DISMISS_KEY) === r.latest) return;
    const main = document.querySelector("#fc-app main.jf-main--rail");
    if (!main || !/^\/(home)?$/.test(location.pathname) || location.hash) return;
    main.prepend(banner(r));
  }

  // src/shell/settings.js
  var SETTINGS_KEY = "fc-tv-settings";
  async function signIn(email, password) {
    var _a;
    const r = await fetch("/ajax/viplogin", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": ((_a = document.querySelector('meta[name="csrf-token"]')) == null ? void 0 : _a.content) || ""
      },
      body: JSON.stringify({ uname: email, passw: password })
    });
    const body = await r.text();
    if (r.status === 401) throw new Error(body.slice(0, 120) || "Wrong email or password.");
    if (!r.ok) throw new Error(`Sign-in failed (HTTP ${r.status}).`);
    if (/"status"\s*:\s*"expired"/.test(body)) throw new Error("Your VIP membership has expired.");
  }
  var field = (label, input) => h("label", { class: "jf-field" }, h("span", { class: "jf-field__label" }, label), input);
  function settingsView(app2) {
    const main = h("main", { class: "jf-main jf-settings" });
    railLayout(app2, "settings", main, "Settings");
    const signedIn = isSignedIn();
    const email = h("input", { class: "jf-input", type: "email", autocomplete: "username", placeholder: "VIP email" });
    const password = h("input", { class: "jf-input", type: "password", autocomplete: "current-password", placeholder: "Password" });
    const accountMsg = h("p", { class: "jf-settings__msg", role: "status" });
    const signInBtn = h("button", { class: "jf-button", onclick: async () => {
      if (!email.value.trim() || !password.value) {
        accountMsg.textContent = "Enter your VIP email and password.";
        return;
      }
      accountMsg.textContent = "Signing in\u2026";
      try {
        await signIn(email.value.trim(), password.value);
        accountMsg.textContent = "Signed in.";
        setTimeout(() => location.reload(), 600);
      } catch (e) {
        accountMsg.textContent = e.message;
      }
    } }, "Sign in");
    const account = h(
      "section",
      { class: "jf-settings__section" },
      h("h2", { class: "jf-section__title" }, "Account"),
      signedIn ? h("p", { class: "jf-settings__status" }, "\u2713 Signed in to your VIP account.") : h("div", { class: "jf-settings__form" }, h("p", { class: "jf-settings__status" }, "Not signed in. Your lists need a VIP sign-in."), field("Email", email), field("Password", password), signInBtn, accountMsg)
    );
    const profiles = loadProfiles();
    const cur = currentProfile();
    const sync = h(
      "section",
      { class: "jf-settings__section" },
      h("h2", { class: "jf-section__title" }, "Profiles"),
      h("p", { class: "jf-settings__status" }, profiles.length ? `${profiles.map((p) => p.name).join(", ")}${cur ? ` \u2014 watching as ${cur.name}` : ""}` : "No profiles yet. Add one to keep your favourites and watch history (it's tied to a sync code)."),
      h(
        "div",
        { class: "jf-settings__form" },
        h("a", { class: "jf-button", href: "/home#profiles-manage" }, profiles.length ? "Manage profiles" : "Add a profile"),
        cur && h("span", { class: "jf-settings__avatar", style: { background: cur.color } }, initialOf(cur.name))
      )
    );
    const prefs = (() => {
      try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
      } catch (e) {
        return {};
      }
    })();
    const autoplayOn = prefs.autoplayEnabled !== false;
    const autoplayBtn = h("button", { class: `jf-toggle${autoplayOn ? " jf-toggle--on" : ""}`, role: "switch", "aria-checked": String(autoplayOn), onclick: () => {
      const p = (() => {
        try {
          return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        } catch (e) {
          return {};
        }
      })();
      p.autoplayEnabled = p.autoplayEnabled === false;
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(p));
      } catch (e) {
      }
      autoplayBtn.classList.toggle("jf-toggle--on", p.autoplayEnabled);
      autoplayBtn.setAttribute("aria-checked", String(p.autoplayEnabled));
      toast(`Autoplay ${p.autoplayEnabled ? "on" : "off"}`);
    } }, "Play the next episode automatically");
    const playback = h("section", { class: "jf-settings__section" }, h("h2", { class: "jf-section__title" }, "Playback"), autoplayBtn);
    const about = h(
      "section",
      { class: "jf-settings__section" },
      h("h2", { class: "jf-section__title" }, "About"),
      h("p", { class: "jf-settings__about" }, `Viewbox TV ${true ? "0.7.2" : ""} \xB7 screen ${innerWidth}\xD7${innerHeight} @${devicePixelRatio}x \xB7 ${location.host}`),
      h("p", { class: "jf-settings__about" }, navigator.userAgent)
    );
    const upMsg = h("p", { class: "jf-settings__status", role: "status" });
    const upBtn = h("button", { class: "jf-button" }, "Check for updates");
    let latest = null;
    upBtn.addEventListener("click", async () => {
      upBtn.disabled = true;
      try {
        if (latest && latest.available && !latest.needsReinstall) {
          await updateNow((t) => {
            upMsg.textContent = t;
          });
          return;
        }
        upMsg.textContent = "Checking\u2026";
        latest = await checkNow();
        if (latest.failed) upMsg.textContent = `v${latest.latest} didn't start on this TV, so you're staying on v${latest.current}.`;
        else if (!latest.available) upMsg.textContent = `You're up to date (v${latest.current}).`;
        else if (latest.needsReinstall) upMsg.textContent = `v${latest.latest} is out, but it needs a reinstall \u2014 download ViewboxTV.wgt from the GitHub release.`;
        else {
          upMsg.textContent = `v${latest.latest} is available (you have v${latest.current}).`;
          upBtn.textContent = `Update to v${latest.latest}`;
        }
      } catch (e) {
        upMsg.textContent = e.message;
      }
      upBtn.disabled = false;
    });
    const updates = h(
      "section",
      { class: "jf-settings__section" },
      h("h2", { class: "jf-section__title" }, "Updates"),
      hostAvailable() ? h("div", { class: "jf-settings__form" }, upBtn, upMsg) : h("p", { class: "jf-settings__status" }, window.__vbExtension ? "This install updates with the browser extension." : "This install updates through TizenBrew (the module version you added there).")
    );
    main.append(account, sync, playback, updates, about);
    setTimeout(() => (signedIn ? sync.querySelector(".jf-button") : email).focus({ preventScroll: true }), 0);
  }

  // src/shell/profileScreen.js
  var BACK = [10009, 27, 8];
  var HOLD_MS = 600;
  var digitOf = (code) => code >= 48 && code <= 57 ? code - 48 : code >= 96 && code <= 105 ? code - 96 : -1;
  function profilesView(app2, { manage = false, onDone } = {}) {
    let list = loadProfiles();
    let overlay = null;
    const status = h("p", { class: "nv-profiles__status", role: "status" });
    const root = h("div", { class: "nv-profiles" });
    app2.replaceChildren(root);
    const avatar = (p, cls = "nv-avatar") => h("div", { class: cls, style: { background: p.color } }, initialOf(p.name));
    const setStatus = (text, busy) => {
      status.replaceChildren(busy ? h("span", { class: "jf-spinner nv-spinner" }) : "", text || "");
    };
    function render(focusId) {
      list = loadProfiles();
      const active = currentProfile();
      const cards = list.map((p) => h(
        "button",
        { class: "nv-profile", "data-id": p.id, "aria-label": p.name },
        h("div", { class: "nv-profile__ring" }, avatar(p)),
        h("div", { class: "nv-profile__name" }, p.name),
        h("div", { class: "nv-profile__badge" }, p.pinHash ? icon("lock", "nv-lock") : "", active && active.id === p.id ? "CURRENT" : "")
      ));
      if (list.length < MAX_PROFILES) {
        cards.push(h(
          "button",
          { class: "nv-profile nv-profile--add", "data-id": "add", "aria-label": "Add Profile" },
          h("div", { class: "nv-profile__ring" }, h("div", { class: "nv-avatar nv-avatar--add" })),
          h("div", { class: "nv-profile__name" }, "Add Profile"),
          h("div", { class: "nv-profile__badge" })
        ));
      }
      root.className = `nv-profiles${cards.length >= 5 ? " nv-profiles--compact" : ""}`;
      root.replaceChildren(
        h("div", { class: "nv-profiles__brand" }, "Viewbox"),
        h("h1", { class: "nv-profiles__title" }, manage ? "Manage Profiles" : "Who's watching?"),
        h("p", { class: "nv-profiles__subtitle" }, manage ? "Select a profile to edit, or add a new one" : "Select a profile to continue"),
        h("div", { class: "nv-profiles__grid" }, cards),
        status,
        h("p", { class: "nv-profiles__hint" }, manage ? "Press Back when you're done" : "Hold OK to edit a profile")
      );
      const target = root.querySelector(`.nv-profile[data-id="${focusId || active && active.id || list[0] && list[0].id || "add"}"]`) || root.querySelector(".nv-profile");
      setTimeout(() => target && target.focus({ preventScroll: true }), 0);
    }
    async function choose(p) {
      if (p.pinHash && !await askPin(`Enter PIN for ${p.name}`, (pin) => checkPin(p, pin))) return;
      const active = currentProfile();
      markChosen();
      if (active && active.id === p.id) return finish();
      setStatus(`Switching to ${p.name}\u2026`, true);
      try {
        await switchTo(p);
        location.assign("/home");
      } catch (e) {
        setStatus(e.message);
      }
    }
    const finish = () => onDone ? onDone() : location.hash = "";
    function activate(id, held2) {
      if (id === "add") return openEditor(null);
      const p = list.find((x) => x.id === id);
      if (!p) return;
      if (manage || held2) openEditor(p);
      else choose(p);
    }
    function openOverlay(panel, onBack) {
      const el = h("div", { class: "nv-overlay" }, panel);
      root.append(el);
      overlay = { el, back: onBack };
      return el;
    }
    function closeOverlay(focusId) {
      if (!overlay) return;
      overlay.el.remove();
      overlay = null;
      render(focusId);
    }
    function askPin(title, verify) {
      return new Promise((resolve) => {
        const prev = overlay;
        let pin = "";
        const dots = h("div", { class: "nv-pin__dots" }, [0, 1, 2, 3].map(() => h("span", { class: "nv-pin__dot" })));
        const msg = h("p", { class: "nv-pin__msg", role: "status" });
        const show = () => [...dots.children].forEach((d, i) => d.classList.toggle("nv-pin__dot--on", i < pin.length));
        const done = (v) => {
          el.remove();
          overlay = prev;
          resolve(v);
        };
        async function press(d) {
          if (d === "del") {
            pin = pin.slice(0, -1);
            show();
            return;
          }
          if (pin.length >= 4) return;
          pin += d;
          show();
          if (pin.length < 4) return;
          const ok = verify ? await verify(pin) : true;
          if (ok) return done(verify ? true : pin);
          msg.textContent = "Wrong PIN";
          dots.classList.add("nv-pin__dots--shake");
          setTimeout(() => {
            dots.classList.remove("nv-pin__dots--shake");
            pin = "";
            show();
          }, 450);
        }
        const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, "del", 0].map((d) => h("button", { class: "nv-key", "aria-label": d === "del" ? "Delete" : String(d), onclick: () => press(d === "del" ? "del" : String(d)) }, d === "del" ? icon("backspace") : String(d)));
        const panel = h("div", { class: "nv-panel nv-pin" }, h("h2", { class: "nv-panel__title" }, title), dots, msg, h("div", { class: "nv-pin__pad" }, keys));
        const el = h("div", { class: "nv-overlay" }, panel);
        root.append(el);
        overlay = { el, back: () => done(false), key: (e) => {
          const d = digitOf(e.keyCode);
          if (d < 0) return false;
          press(String(d));
          return true;
        } };
        setTimeout(() => keys[4].focus({ preventScroll: true }), 0);
      });
    }
    function openEditor(p) {
      const isNew = !p;
      const id = p ? p.id : String(Date.now());
      const active = currentProfile();
      const isActive = !!(p && active && active.id === p.id);
      let color = p ? p.color : PALETTE[list.length % PALETTE.length];
      let pinHash = p ? p.pinHash || null : null;
      let codeMode = isNew ? "fresh" : "keep";
      let deleteArmed = false;
      const name = h("input", { class: "jf-input nv-input", type: "text", maxlength: "20", placeholder: "Profile name", value: p ? p.name : "", autocomplete: "off", spellcheck: "false" });
      const preview = h("div", { class: "nv-avatar nv-avatar--preview", style: { background: color } }, initialOf(name.value || "?"));
      name.addEventListener("input", () => {
        preview.textContent = initialOf(name.value || "?");
      });
      const swatches = h("div", { class: "nv-swatches" }, PALETTE.map((c) => h("button", {
        class: `nv-swatch${c === color ? " nv-swatch--on" : ""}`,
        style: { background: c },
        "aria-label": `Colour ${c}`,
        onclick: (ev) => {
          color = c;
          preview.style.background = c;
          swatches.querySelectorAll(".nv-swatch").forEach((s) => s.classList.toggle("nv-swatch--on", s === ev.currentTarget));
        }
      })));
      const code = h("input", { class: "jf-input jf-input--code nv-input", type: "text", maxlength: "11", placeholder: "XXXX-XXXX-X", autocomplete: "off", spellcheck: "false" });
      code.addEventListener("input", () => {
        const v = formatCode(code.value);
        if (v !== code.value) code.value = v;
      });
      const codeBox = h("div", { class: "nv-editor__code" });
      const msg = h("p", { class: "nv-editor__msg", role: "status" });
      const pinBtn = h("button", { class: "jf-button nv-btn", onclick: async () => {
        if (pinHash) {
          pinHash = null;
          drawPin();
          return;
        }
        const first = await askPin("Choose a 4-digit PIN");
        if (!first) return;
        const again = await askPin("Enter the PIN again", async (x) => x === first);
        if (again) {
          pinHash = await hashPin(id, first);
          drawPin();
        }
      } });
      const drawPin = () => {
        pinBtn.textContent = pinHash ? "Remove PIN" : "Set a PIN";
      };
      drawPin();
      function drawCode() {
        const choice = (mode, label) => h("button", { class: `jf-button nv-btn${codeMode === mode ? " nv-btn--on" : ""}`, onclick: () => {
          codeMode = mode;
          drawCode();
          if (mode === "existing") code.focus();
        } }, label);
        if (isNew) {
          codeBox.replaceChildren(
            h("div", { class: "nv-editor__label" }, "Watch history"),
            h("div", { class: "nv-row" }, choice("fresh", "Start fresh"), choice("existing", "Use existing sync code")),
            codeMode === "existing" ? code : ""
          );
        } else {
          codeBox.replaceChildren(
            h("div", { class: "nv-editor__label" }, `Sync code \u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022-${formatCode(p.code).slice(-1)}`),
            isActive ? h("p", { class: "nv-editor__note" }, "This profile is in use. Switch to another profile to change its sync code.") : h("div", { class: "nv-row" }, choice("keep", "Keep"), choice("existing", "Change sync code")),
            codeMode === "existing" ? code : ""
          );
        }
      }
      drawCode();
      const del2 = !isNew && !isActive && h("button", { class: "jf-button nv-btn nv-btn--danger", onclick: () => {
        if (!deleteArmed) {
          deleteArmed = true;
          del2.textContent = "Press again to delete";
          return;
        }
        saveProfiles(removeProfile(loadProfiles(), p.id));
        closeOverlay();
      } }, "Delete profile");
      const save2 = h("button", { class: "jf-button nv-btn nv-btn--primary", onclick: async () => {
        const nm = name.value.trim();
        if (!nm) {
          msg.textContent = "Give the profile a name.";
          return name.focus();
        }
        try {
          let newCode = null;
          if (codeMode === "fresh" || codeMode === "existing") {
            if (!isSignedIn()) throw new Error("Sign in to your VIP account first (Settings) \u2014 lists only sync for a signed-in account.");
            if (codeMode === "fresh") {
              msg.textContent = "Creating a new sync code\u2026";
              newCode = await createCode();
            } else {
              newCode = formatCode(code.value);
              if (!validCode(newCode)) throw new Error("A sync code looks like ABCD-1234-X (9 letters/digits).");
              msg.textContent = "Checking the sync code\u2026";
              if (!await codeExists(newCode)) throw new Error("No sync code found with that code \u2014 check it and try again.");
            }
          }
          let all = loadProfiles();
          if (isNew) all = updateProfile(addProfile(all, { name: nm, color, code: newCode }, id), id, { pinHash });
          else all = updateProfile(all, id, { name: nm, color, pinHash, ...newCode ? { code: newCode } : {} });
          saveProfiles(all);
          closeOverlay(id);
        } catch (e) {
          msg.textContent = e.message;
        }
      } }, isNew ? "Create profile" : "Save");
      const panel = h(
        "div",
        { class: "nv-panel nv-editor" },
        h("div", { class: "nv-editor__head" }, h("h2", { class: "nv-panel__title" }, isNew ? "Add Profile" : "Edit Profile")),
        h(
          "div",
          { class: "nv-editor__body" },
          h("div", { class: "nv-editor__preview" }, preview),
          h(
            "div",
            { class: "nv-editor__fields" },
            h("label", { class: "nv-editor__label" }, "Name"),
            name,
            h("div", { class: "nv-editor__label" }, "Colour"),
            swatches,
            codeBox,
            h("div", { class: "nv-editor__label" }, "PIN"),
            h("div", { class: "nv-row" }, pinBtn),
            msg,
            h("div", { class: "nv-row nv-editor__actions" }, save2, del2 || "")
          )
        )
      );
      openOverlay(panel, () => closeOverlay(p && p.id));
      setTimeout(() => name.focus({ preventScroll: true }), 0);
    }
    let holdTimer = null;
    let held = false;
    keyHook.fn = (e) => {
      if (!root.isConnected) {
        keyHook.fn = null;
        return false;
      }
      const k = e.keyCode;
      if (overlay) {
        if (BACK.includes(k) && !(k === 8 && e.target.matches && e.target.matches("input"))) {
          overlay.back();
          return true;
        }
        return overlay.key ? overlay.key(e) : false;
      }
      if (BACK.includes(k)) {
        if (!onDone) history.back();
        return true;
      }
      const card2 = document.activeElement && document.activeElement.closest && document.activeElement.closest(".nv-profile");
      if (k === 13 && card2) {
        if (!e.repeat && !holdTimer) {
          held = false;
          holdTimer = setTimeout(() => {
            held = true;
            holdTimer = null;
            activate(card2.dataset.id, true);
          }, HOLD_MS);
        }
        return true;
      }
      return false;
    };
    const onUp = (e) => {
      if (!root.isConnected) return window.removeEventListener("keyup", onUp, true);
      if (e.keyCode !== 13 || overlay) return;
      const card2 = document.activeElement && document.activeElement.closest && document.activeElement.closest(".nv-profile");
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
        if (card2 && !held) activate(card2.dataset.id, false);
      }
    };
    window.addEventListener("keyup", onUp, true);
    root.addEventListener("click", (e) => {
      const card2 = e.target.closest(".nv-profile");
      if (card2 && e.detail > 0 && !overlay) activate(card2.dataset.id, false);
    });
    render();
  }

  // src/shell/osd.js
  var HIDE_AFTER = 4e3;
  var jw = () => {
    try {
      return window.jwplayer("player");
    } catch (e) {
      return null;
    }
  };
  function currentTitle() {
    var _a, _b, _c;
    const show = (((_b = (_a = document.querySelector(".section-watch-overview .watch-header")) == null ? void 0 : _a.childNodes[0]) == null ? void 0 : _b.textContent) || document.title).trim();
    const key2 = String(window.key || "");
    const [, s, e] = key2.split(":");
    if (!s) {
      const y = (/\((\d{4})\)/.exec(document.title) || [])[1];
      return y ? `${show} (${y})` : show;
    }
    const row = document.querySelector(`tr.eplist[data-pes="${s}"][data-pep="${e}"]`);
    return `${show} \u2014 ${epLabel(s, e, (_c = row == null ? void 0 : row.querySelector(".epTitle")) == null ? void 0 : _c.textContent.trim())}`;
  }
  function createOsd() {
    let root = null;
    let timer = null;
    let loop = null;
    let els = {};
    function build() {
      const title = h("div", { class: "jf-osd__title" });
      const cur = h("span", { class: "jf-osd__time" });
      const left = h("span", { class: "jf-osd__time" });
      const fill = h("div", { class: "jf-slider__fill" });
      const thumb = h("div", { class: "jf-slider__thumb" });
      const slider = h("button", { class: "jf-slider", role: "slider", "aria-label": "Position", "aria-valuemin": "0" }, h("div", { class: "jf-slider__track" }, fill, thumb));
      const playBtn = iconButton("pause", "Pause", () => {
        const p = jw();
        if (!p) return;
        p.getState() === "playing" ? p.pause() : p.play();
        refresh();
      });
      const muteBtn = iconButton("volume", "Mute", () => {
        const p = jw();
        if (p) {
          p.setMute(!p.getMute());
          refresh();
        }
      });
      const ends = h("span", { class: "jf-osd__ends" });
      const isTv = /^\/watch\/tv\//.test(location.pathname);
      root = h(
        "div",
        { id: "fc-osd" },
        h(
          "div",
          { class: "jf-osd__top" },
          iconButton("back", "Back", () => document.dispatchEvent(new Event("fc-close-player"))),
          // leaves playback, like Jellyfin
          title,
          h("span", { class: "jf-osd__spacer" }),
          clock()
        ),
        h(
          "div",
          { class: "jf-osd__bottom" },
          h("div", { class: "jf-osd__timeline" }, cur, slider, left),
          h(
            "div",
            { class: "jf-osd__buttons" },
            iconButton("rewind", "Rewind", () => seekBy(-10)),
            playBtn,
            iconButton("forward", "Fast-forward", () => seekBy(30)),
            isTv && iconButton("next", "Next episode", () => {
              if (typeof window.playNext === "function") window.playNext();
            }),
            ends,
            h("span", { class: "jf-osd__spacer" }),
            iconButton("cc", "Subtitles", cycleCaptions),
            iconButton("hd", "Quality", cycleQuality),
            muteBtn
          )
        )
      );
      els = { title, cur, left, fill, thumb, slider, playBtn, muteBtn, ends };
      document.body.appendChild(root);
      if (isDesktop()) {
        slider.addEventListener("click", (e) => {
          const p = jw();
          const r = slider.getBoundingClientRect();
          if (p && r.width) {
            p.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * p.getDuration());
            refresh();
          }
        });
        const outside = (e) => root && !e.target.closest(".jf-osd__top, .jf-osd__bottom, .fc-toast") && !e.target.shadowRoot;
        mouse = {
          move: () => show(false),
          click: (e) => {
            if (outside(e)) {
              const p = jw();
              if (p) {
                p.getState() === "playing" ? p.pause() : p.play();
                show(false);
              }
            }
          },
          dbl: (e) => {
            if (outside(e)) document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {
            });
          }
        };
        document.addEventListener("mousemove", mouse.move);
        document.addEventListener("click", mouse.click, true);
        document.addEventListener("dblclick", mouse.dbl, true);
      }
    }
    let mouse = null;
    function seekBy(s) {
      const p = jw();
      if (p) {
        p.seek(Math.max(0, Math.min(p.getDuration() - 1, p.getPosition() + s)));
        refresh();
      }
    }
    function cycleCaptions() {
      const p = jw();
      if (!p) return;
      const list = p.getCaptionsList() || [];
      if (list.length < 2) return toast("No subtitles");
      const next = (p.getCurrentCaptions() + 1) % list.length;
      p.setCurrentCaptions(next);
      toast(`Subtitles: ${list[next].label || "Off"}`);
    }
    function cycleQuality() {
      const p = jw();
      if (!p) return;
      const list = p.getQualityLevels() || [];
      if (list.length < 2) return toast("Only one quality");
      const next = (p.getCurrentQuality() + 1) % list.length;
      p.setCurrentQuality(next);
      toast(`Quality: ${list[next].label}`);
    }
    function refresh() {
      const p = jw();
      const v = document.querySelector("video");
      const pos = p ? p.getPosition() : (v == null ? void 0 : v.currentTime) || 0;
      const dur = p ? p.getDuration() : (v == null ? void 0 : v.duration) || 0;
      const pct = dur > 0 ? Math.min(1, pos / dur) : 0;
      els.title.textContent = currentTitle();
      els.cur.textContent = fmtTime(pos);
      els.left.textContent = `-${fmtTime(dur - pos)}`;
      els.fill.style.width = `${pct * 100}%`;
      els.thumb.style.left = `${pct * 100}%`;
      els.slider.setAttribute("aria-valuenow", String(Math.round(pos)));
      els.slider.setAttribute("aria-valuemax", String(Math.round(dur)));
      els.ends.textContent = dur > 0 ? endsAt(dur - pos) : "";
      const playing = p ? p.getState() === "playing" : v && !v.paused;
      els.playBtn.replaceChildren(icon(playing ? "pause" : "play"));
      els.playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
      const muted = p ? p.getMute() : v == null ? void 0 : v.muted;
      els.muteBtn.replaceChildren(icon(muted ? "mute" : "volume"));
      try {
        if (p && p.getControls()) p.setControls(false);
      } catch (e) {
      }
    }
    const visible2 = () => !!root && root.classList.contains("jf-osd--on");
    function show(focusPlay) {
      if (!root) return;
      root.classList.add("jf-osd--on");
      refresh();
      if (focusPlay || !root.contains(document.activeElement)) els.playBtn.focus({ preventScroll: true });
      clearTimeout(timer);
      timer = setTimeout(() => {
        const p = jw();
        if (!p || p.getState() === "playing") hide();
      }, HIDE_AFTER);
    }
    function hide() {
      if (root) {
        root.classList.remove("jf-osd--on");
        if (root.contains(document.activeElement)) document.activeElement.blur();
      }
    }
    function handleKey(e) {
      if (!root) return false;
      const k = e.keyCode;
      if (!visible2()) {
        if ([13, 37, 38, 39, 40].includes(k)) {
          show(true);
          return true;
        }
        return false;
      }
      show(false);
      if ((k === 37 || k === 39) && document.activeElement === els.slider) {
        seekBy(k === 39 ? 10 : -10);
        return true;
      }
      return false;
    }
    return {
      attach() {
        if (!root) build();
        loop = loop || setInterval(() => visible2() && refresh(), 500);
        show(true);
      },
      detach() {
        hide();
        clearInterval(loop);
        loop = null;
        root == null ? void 0 : root.remove();
        root = null;
        if (mouse) {
          document.removeEventListener("mousemove", mouse.move);
          document.removeEventListener("click", mouse.click, true);
          document.removeEventListener("dblclick", mouse.dbl, true);
          mouse = null;
        }
      },
      visible: visible2,
      hide,
      show,
      handleKey
    };
  }

  // src/shell/shell.js
  function route(path) {
    if (path === "/" || path === "/home") {
      if (location.hash === "#settings") return { render: (app2) => settingsView(app2), skeleton: "plain", side: "settings" };
      if (location.hash === "#profiles" || location.hash === "#profiles-manage") return { id: "profiles", render: (app2) => profilesView(app2, { manage: location.hash === "#profiles-manage" }) };
      if (!location.hash && !wasChosen()) {
        if (loadProfiles().length >= 2) return { id: "picker", render: (app2) => profilesView(app2, { onDone: () => redraw() }) };
        markChosen();
      }
      return { key: "home", fresh: () => parseHome(document), render: homeView, skeleton: "home", side: "home", same: (a, b) => same({ ...a, hero: null }, { ...b, hero: null }) };
    }
    if (/^\/mylists\//.test(path)) return { render: (app2) => favouritesView(app2), skeleton: "grid", side: "favourites" };
    const lib = /^\/show\/(tvshows|movies)/.exec(path);
    if (lib) {
      const kind = lib[1] === "movies" ? "movies" : "tv";
      const params = new URLSearchParams(location.search);
      if ((params.get("sort") || "latest") !== "latest" || params.get("page")) return { render: (app2) => libraryView(app2, kind, null), skeleton: "grid", side: kind };
      return { key: `page:${kind}`, fresh: () => parseLibraryPage(document, kind), render: (app2, data) => libraryView(app2, kind, data), skeleton: "grid", side: kind };
    }
    const det = /^\/watch\/(tv|movie)\/(\d+)/.exec(path);
    if (det) return { key: `details:${det[2]}`, fresh: () => parseDetails(document, document.head.innerHTML), render: (app2, d) => detailsView(app2, det[1], det[2], d), skeleton: "details" };
    if (/^\/search/.test(path)) return { render: (app2) => searchView(app2), skeleton: "plain", side: "search" };
    return null;
  }
  var isShellPath = (path) => !!route(path);
  function skeleton(kind, side) {
    const bar = (width) => h("div", { class: "jf-skel jf-skel--text", style: { width } });
    const skelCard = (shape) => h("div", { class: `jf-card jf-card--${shape} jf-skel-card` }, h("div", { class: "jf-card__img jf-skel" }), bar("60%"));
    const row = (n, shape) => h(
      "section",
      { class: "jf-section" },
      h("div", { class: "jf-section__title" }, bar("240px")),
      h("div", { class: "jf-row jf-row--skel" }, Array.from({ length: n }, () => skelCard(shape)))
    );
    const rail = (...kids) => [sidebar(side), h("main", { class: "jf-main jf-main--rail" }, ...kids)];
    if (kind === "home") {
      const hero = h("section", { class: "ah-hero" }, h(
        "div",
        { class: "ah-track" },
        h("div", { class: "ah-item ah-item--active" }, h("div", { class: "ah-media jf-skel" })),
        h("div", { class: "ah-item" }, h("div", { class: "ah-media jf-skel" })),
        h("div", { class: "ah-item" }, h("div", { class: "ah-media jf-skel" }))
      ));
      return rail(hero, row(4, "landscape"), row(8, "portrait"));
    }
    if (kind === "grid") return rail(h("div", { class: "jf-pagetitle" }, bar("220px")), h("div", { class: "jf-grid" }, Array.from({ length: 14 }, () => skelCard("portrait"))));
    if (kind === "details") {
      return [header({ title: " " }), h("main", { class: "jf-main" }, h(
        "div",
        { class: "jf-details" },
        h("div", { class: "jf-details__poster jf-skel" }),
        h("div", { class: "jf-details__body jf-skel-body" }, bar("40%"), bar("25%"), bar("180px"), bar("90%"), bar("85%"), bar("60%"))
      ))];
    }
    return side ? rail() : [];
  }
  var playbackExpected = () => /^\/watch\/tv\/\d+\/[^/]+\/season\/\d+\/episode\/\d+/.test(location.pathname) || /^\/watch\/movie\/\d+/.test(location.pathname) && location.hash === "#play";
  var loading = null;
  function showLoading() {
    if (loading) return;
    const [, type, pid, s, e] = /^\/watch\/(tv|movie)\/(\d+)(?:\/[^/]+\/season\/(\d+)\/episode\/(\d+))?/.exec(location.pathname) || [];
    const m = metaCache.all()[pid] || {};
    const ep = type === "tv" && s ? findEp(m, +s, +e) : null;
    const sub = type === "tv" && s ? epLabel(+s, +e, ep && ep.title) : m.year;
    loading = h(
      "div",
      { id: "fc-loading", role: "status", "aria-label": "Loading", style: m.backdrop ? { backgroundImage: `url("${img(m.backdrop, "w1280")}")` } : null },
      h("div", { class: "jf-spinner" }),
      m.title && h("div", { class: "jf-loading__title" }, m.title),
      sub && h("div", { class: "jf-loading__sub" }, sub)
    );
    document.documentElement.appendChild(loading);
    loading.timer = setTimeout(() => {
      hideLoading();
      toast("Couldn\u2019t start playback");
    }, 45e3);
  }
  function hideLoading() {
    if (!loading) return;
    clearTimeout(loading.timer);
    loading.remove();
    loading = null;
  }
  var isLoadingPlayback = () => !!loading;
  var app = null;
  var drawn = null;
  function mount(parent) {
    document.documentElement.classList.add("fc-shell");
    if (isDesktop()) document.documentElement.classList.add("fc-desktop");
    (document.head || document.documentElement).appendChild(document.createElement("style")).textContent = jellyfin_default;
    app = parent.appendChild(h("div", { id: "fc-app" }));
  }
  function bootShell() {
    const r = route(location.pathname);
    if (!r || app) return;
    mount(document.documentElement);
    draw(r);
    if (playbackExpected()) showLoading();
  }
  function draw(r) {
    const stale = r.key ? cache.get(r.key) : void 0;
    app.replaceChildren();
    try {
      if (stale !== void 0) {
        r.render(app, stale);
        drawn = { id: r.id, data: stale, signedIn: localStorage.getItem("fc-tv-signed-in") };
        return;
      }
      if (r.id) {
        r.render(app);
        drawn = { id: r.id };
        return;
      }
    } catch (e) {
      app.replaceChildren();
    }
    drawn = null;
    app.append(...skeleton(r.skeleton, r.side));
  }
  function redraw() {
    const r = route(location.pathname);
    if (document.readyState === "loading") return draw(r);
    app.replaceChildren();
    app.scrollTop = 0;
    r.render(app, r.key ? r.fresh() : void 0);
  }
  function unmountShell() {
    hideLoading();
    app == null ? void 0 : app.remove();
    app = null;
    document.documentElement.classList.remove("fc-shell");
  }
  var focusPath = () => {
    const el = document.activeElement;
    const sec = el && app.contains(el) && el.closest(".jf-section");
    return sec ? [[...app.querySelectorAll(".jf-section")].indexOf(sec), [...sec.querySelectorAll(".jf-card")].indexOf(el.closest(".jf-card"))] : null;
  };
  var restoreFocus = (p) => {
    const sec = p && app.querySelectorAll(".jf-section")[p[0]];
    const target = sec && (sec.querySelectorAll(".jf-card")[p[1]] || sec.querySelector(".jf-card"));
    if (target) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };
  function startShell() {
    const r = route(location.pathname);
    if (!r) return null;
    if (!app) mount(document.body);
    const fresh = r.key ? r.fresh() : void 0;
    if (r.key) cache.set(r.key, fresh);
    const signedIn = document.querySelector('a[href="/account"]') ? "1" : "0";
    const upToDate = drawn && drawn.id === r.id && (r.key ? (r.same || same)(drawn.data, fresh) && drawn.signedIn === signedIn : true);
    if (!upToDate) {
      const where = focusPath();
      const top = app.scrollTop;
      app.replaceChildren();
      r.render(app, fresh);
      if (where) {
        app.scrollTop = top;
        restoreFocus(where);
      }
    }
    if (playbackExpected()) showLoading();
    if (location.pathname === "/" || location.pathname === "/home") {
      window.addEventListener("hashchange", () => {
        const r2 = route(location.pathname);
        app.replaceChildren();
        app.scrollTop = 0;
        r2.render(app, r2.key ? r2.fresh() : void 0);
      });
    }
    const osd = createOsd();
    const setPlaying = (on) => {
      document.documentElement.classList.toggle("fc-playing", on);
      if (on) {
        hideLoading();
        osd.attach();
      } else osd.detach();
    };
    const onPlay = (e) => {
      const v = e.target;
      if (!(v instanceof HTMLVideoElement) || v.paused || document.documentElement.classList.contains("fc-playing")) return;
      if (document.querySelector(".player.hide") || v.duration <= 120) return;
      if (/^\/watch\/movie\//.test(location.pathname) && !window.__fcAllowAutostart) return;
      setPlaying(true);
    };
    document.addEventListener("playing", onPlay, true);
    document.addEventListener("timeupdate", onPlay, true);
    const player = document.querySelector(".player");
    if (player) new MutationObserver(() => {
      if (player.classList.contains("hide")) setPlaying(false);
    }).observe(player, { attributes: true, attributeFilter: ["class"] });
    return { osd, stop: () => {
      hideLoading();
      setPlaying(false);
    }, playing: () => document.documentElement.classList.contains("fc-playing") };
  }

  // src/shell/autostart.js
  function holdMovieAutostart() {
    if (!/^\/watch\/movie\//.test(location.pathname)) return;
    if (location.hash === "#play") {
      window.__fcAllowAutostart = true;
      return;
    }
    let jw2;
    const wrap = (fn) => typeof fn !== "function" ? fn : new Proxy(fn, {
      apply(t, self, args) {
        const inst = Reflect.apply(t, self, args);
        if (inst && inst.setup && !inst.__fcHeld) {
          inst.__fcHeld = true;
          const setup = inst.setup;
          inst.setup = function(cfg) {
            return setup.call(this, !window.__fcAllowAutostart && cfg ? Object.assign({}, cfg, { autostart: false }) : cfg);
          };
        }
        return inst;
      }
    });
    try {
      Object.defineProperty(window, "jwplayer", { configurable: true, get: () => jw2, set: (v) => {
        jw2 = wrap(v);
      } });
    } catch (e) {
    }
    document.addEventListener("play", (e) => {
      if (window.__fcAllowAutostart || !(e.target instanceof HTMLVideoElement)) return;
      e.target.pause();
      try {
        window.jwplayer("player").pause();
      } catch (err) {
      }
    }, true);
  }

  // src/main.js
  (() => {
    window.__fcTvInjected = Date.now();
    if (window.__fcTv) return;
    window.__fcTv = true;
    holdMovieAutostart();
    const booting = window.top === window && isShellPath(location.pathname);
    const unboot = () => document.documentElement && document.documentElement.classList.remove("fc-boot");
    const boot = () => {
      document.documentElement.classList.add("fc-boot");
      const s = document.createElement("style");
      s.textContent = "html.fc-boot,html.fc-boot body{background:#101010!important}html.fc-boot body{visibility:hidden!important}";
      (document.head || document.documentElement).appendChild(s);
      setTimeout(unboot, 8e3);
      try {
        bootShell();
      } catch (e) {
        console.warn("[viewbox-tv] early draw failed", e);
      }
    };
    if (booting) {
      if (document.documentElement) boot();
      else new MutationObserver((_, mo) => {
        if (document.documentElement) {
          mo.disconnect();
          boot();
        }
      }).observe(document, { childList: true });
    }
    const DEFAULTS = { autoplayEnabled: true, creditsOffset: 20, countdownSecs: 10, autoplayOff: [], stillWatching: true, swEpisodes: 3, swMinutes: 90 };
    const SETTINGS_KEY2 = "fc-tv-settings";
    const settings = () => {
      try {
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY2)) };
      } catch {
        return { ...DEFAULTS };
      }
    };
    function pushSettings() {
      document.documentElement.dataset.fcSettings = JSON.stringify(settings());
      document.dispatchEvent(new Event("fc-settings"));
    }
    const KEYS = { 37: "left", 38: "up", 39: "right", 40: "down" };
    const BACK2 = [10009, 27, 8];
    const PLAY_PAUSE = [10252, 415, 19];
    const RED2 = 403;
    try {
      ["MediaPlayPause", "MediaPlay", "MediaPause", "MediaFastForward", "MediaRewind", "ColorF0Red"].forEach((k) => tizen.tvinputdevice.registerKey(k));
    } catch {
    }
    const onReady = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();
    const looksLikeSite = () => !!document.querySelector('a[href="/mylists/favorites"]') && !!document.querySelector('meta[name="csrf-token"]');
    let siteActive = false;
    let shell = null;
    onReady(() => {
      var _a;
      if (isLauncher()) {
        try {
          document.head.appendChild(document.createElement("style")).textContent = tv_default;
          return runLauncher();
        } catch (e) {
          window.__fcTvError = String(e && e.stack || e);
          throw e;
        }
      }
      if (!looksLikeSite()) {
        unmountShell();
        return unboot();
      }
      siteActive = true;
      document.documentElement.classList.add("fc-tv");
      document.head.appendChild(document.createElement("style")).textContent = tv_default;
      pushSettings();
      const pid = (_a = location.pathname.match(/^\/watch\/tv\/(\d+)/)) == null ? void 0 : _a[1];
      if (pid) markSeen(pid);
      if (/^\/watch\/tv\//.test(location.pathname)) loadPlayer();
      shell = startShell();
      if (isDesktop()) startDesktop();
      if (window.top === window) startUpdates();
      unboot();
      scan(false).then(() => document.dispatchEvent(new Event("fc-scanned")));
      setTimeout(() => activeEl() || move("down"), 800);
    });
    function loadPlayer() {
      let tries = 0;
      const t = setInterval(() => {
        if (typeof window.playNext !== "function" && ++tries < 40) return;
        clearInterval(t);
        const s = document.createElement("script");
        s.textContent = '(()=>{const x={playerBox:"#player",siteNextUp:".nextUp",episodeRow:t=>`tr.eplist[data-epid="${t}"]`,epTitle:".epTitle",epThumb:"img.watch-episode-thumb",thumbBase:"https://img.xcdn.to/t/p/w300"};if(window.__fcPlayer||typeof window.playNext!="function")return;window.__fcPlayer=!0;const W=window.playNext;let h=null,a=null;const H=()=>{var t,e;return(e=String((t=window.key)!=null?t:location.pathname).match(/\\d+/))==null?void 0:e[0]},b=()=>!!a&&a.autoplayEnabled&&!a.autoplayOff.includes(H()),k=document.head.appendChild(document.createElement("style"));k.textContent=`${x.siteNextUp} { display: none !important; }`,k.disabled=!0;function q(){try{a=JSON.parse(document.documentElement.dataset.fcSettings)}catch{a=null}a&&(!b()&&h===null?(h=window.autoplay,window.autoplay=!1):b()&&h!==null&&(window.autoplay=h,h=null),k.disabled=!b(),b()||f())}document.addEventListener("fc-settings",q),q();let A="",T="",v=!1,c=null,$=null,S=!1,r=null;const L="fc-still-watching",m=()=>({auto:0,lastInteraction:Date.now(),pending:!1}),g={get:()=>{var t;try{return(t=JSON.parse(sessionStorage.getItem(L)))!=null?t:m()}catch{return m()}},set:t=>{try{sessionStorage.setItem(L,JSON.stringify(t))}catch{}}};function M(t){!t.isTrusted||r&&t.composedPath().includes(r)||(g.set(m()),r&&B())}document.addEventListener("pointerdown",M,!0),document.addEventListener("keydown",M,!0),window.playNext=function(...t){if(!v){if(f(),!S&&(a!=null&&a.stillWatching)&&window.autoplay&&!window.playNextGuard){const e=g.get();e.auto+=1,e.pending=e.auto>=a.swEpisodes||Date.now()-e.lastInteraction>=a.swMinutes*6e4,g.set(e)}return S=!1,W.apply(this,t)}},document.addEventListener("timeupdate",t=>{var n;const e=t.target;if(!(e instanceof HTMLVideoElement))return;if(r){e.paused||e.pause();return}if(!b()||!(e.duration>120))return;const o=String((n=window.key)!=null?n:location.pathname);if(o!==A){if(e.currentSrc===T)return;if(A=o,T=e.currentSrc,v=!1,f(),a.stillWatching&&g.get().pending)return U(e)}if(!window.autoplay||e.duration-e.currentTime>a.creditsOffset+1)return f();!c&&!v&&J(e)},!0);function J(t){const e=document.querySelector(x.episodeRow(window.activeID-1)),o=a.countdownSecs;let n=o;c=z(e,o),e&&($=setInterval(()=>{t.paused||(n=Math.max(0,n-.25),c.tick(n),n===0&&N(!1))},250))}function N(t){f(),S=t===!0,window.playNext()}function E(){v=!0,f()}function f(){clearInterval($),c==null||c.remove(),c=null}function K(t){if(c){if(t.key==="Escape")E();else if(t.key==="Enter"&&c.hasNext&&!t.composedPath().includes(c))N(!0);else return;t.preventDefault(),t.stopPropagation()}}document.addEventListener("keydown",K,!0);const R=`\n    .box { font: 14px/1.3 system-ui, sans-serif; color: #fff; background: rgba(20,20,20,.92); border-radius: 8px;\n           padding: 12px; width: 300px; box-shadow: 0 4px 24px rgba(0,0,0,.5); display: grid; gap: 10px; }\n    .head { display: flex; gap: 10px; align-items: center; }\n    img { width: 96px; aspect-ratio: 16/9; object-fit: cover; border-radius: 4px; background: #333; }\n    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #aaa; }\n    .title { font-weight: 600; }\n    .actions { display: flex; gap: 8px; }\n    button { font: inherit; border: 0; border-radius: 4px; padding: 7px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; }\n    button:focus-visible { outline: 2px solid #18a2b8; outline-offset: 2px; }\n    .play { background: #fff; color: #111; font-weight: 600; flex: 1; justify-content: center; }\n    .cancel { background: rgba(255,255,255,.15); color: #fff; }\n    svg { transform: rotate(-90deg); }\n    circle { fill: none; stroke-width: 3; }\n    .track { stroke: rgba(0,0,0,.15); }\n    .ring { stroke: #111; stroke-linecap: round; }\n  `,C=8,P=2*Math.PI*C;function I(t){var d;const e=document.createElement("div");e.style.cssText=`position:absolute;z-index:2147483647;${t}`;const o=e.attachShadow({mode:"open"});o.innerHTML=`<style>${R}</style>`,((d=document.querySelector(x.playerBox))!=null?d:document.body).append(e);const n=i(o,"div","box");return n.addEventListener("keydown",s=>{var u,p;const l=(p=(u=s.target).closest)==null?void 0:p.call(u,"button");!l||s.key!=="Enter"&&s.key!==" "||(s.preventDefault(),s.stopPropagation(),l.click())}),{host:e,box:n}}function U(t){var p;t.pause(),r==null||r.remove();const e=(p=/Episodes of (.+?) \\(\\d{4}\\)/.exec(document.title))==null?void 0:p[1],{host:o,box:n}=I("left:50%;top:50%;transform:translate(-50%,-50%)");n.setAttribute("role","alertdialog"),n.setAttribute("aria-labelledby","q"),n.setAttribute("aria-modal","true");const d=i(n,"div","title");d.id="q",d.textContent=e?`Are you still watching ${e}?`:"Are you still watching?";const s=i(n,"div","actions"),l=i(s,"button","play");l.textContent="Continue watching",l.onclick=B;const u=i(s,"button","cancel");u.textContent="Back to browse",u.onclick=()=>{g.set(m()),location.assign(location.pathname.split("/").slice(0,5).join("/"))},n.addEventListener("keydown",y=>{y.key==="Tab"&&(y.preventDefault(),y.stopPropagation(),(y.target===l?u:l).focus())}),r=o,queueMicrotask(()=>l.focus({preventScroll:!0}))}function B(){var t;g.set(m()),r==null||r.remove(),r=null,(t=document.querySelector("video"))==null||t.play().catch(()=>{})}function z(t,e){var d,s,l;const{host:o,box:n}=I("right:24px;bottom:72px");if(n.setAttribute("role","dialog"),!t)n.setAttribute("aria-label","All caught up"),i(n,"div","title").textContent="You\'re all caught up",i(n,"div","label").textContent="No more episodes of this show yet.",i(i(n,"div","actions"),"button","cancel").textContent="Close",n.querySelector("button").onclick=E;else{n.setAttribute("aria-label","Next episode");const u=i(n,"div","head"),p=(d=t.querySelector(x.epThumb))==null?void 0:d.dataset.img;p&&Object.assign(i(u,"img"),{src:x.thumbBase+p,alt:""});const y=i(u,"div");i(y,"div","label").textContent=`Next \\xB7 S${t.dataset.pes} E${t.dataset.pep}`,i(y,"div","title").textContent=(l=(s=t.querySelector(x.epTitle))==null?void 0:s.textContent.trim())!=null?l:"";const D=i(n,"div","actions"),w=i(D,"button","play");w.innerHTML=`<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle class="track" cx="10" cy="10" r="${C}"/><circle class="ring" cx="10" cy="10" r="${C}" stroke-dasharray="${P}" stroke-dashoffset="0"/></svg><span></span>`;const Y=w.querySelector(".ring"),O=w.querySelector("span");O.textContent=`Next episode in ${e}`,w.onclick=()=>N(!0);const _=i(D,"button","cancel");_.textContent="Not now",_.onclick=E,o.tick=j=>{Y.setAttribute("stroke-dashoffset",String(P*(1-j/e))),O.textContent=`Next episode in ${Math.ceil(j)}`},queueMicrotask(()=>w.focus({preventScroll:!0}))}return o.hasNext=!!t,o}function i(t,e,o){const n=t.appendChild(document.createElement(e));return o&&(n.className=o,n.setAttribute("part",o)),n}})();\n';
        document.documentElement.appendChild(s);
      }, 250);
    }
    const playerOpen = () => shell ? shell.playing() : !!document.querySelector(".player:not(.hide) video");
    const overlayRoot = () => {
      var _a, _b;
      const r = (_b = (_a = activeEl()) == null ? void 0 : _a.getRootNode) == null ? void 0 : _b.call(_a);
      return r && r.host ? r : null;
    };
    const inOverlay = () => !!overlayRoot();
    const handled = /* @__PURE__ */ new Set();
    window.addEventListener("keyup", (e) => {
      if (siteActive && handled.delete(e.keyCode)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    window.addEventListener("keydown", (e) => {
      var _a, _b, _c;
      if (!siteActive && !document.getElementById("fc-app")) return;
      const code = e.keyCode;
      if (keyHook.fn && keyHook.fn(e)) {
        e.preventDefault();
        e.stopPropagation();
        handled.add(code);
        return;
      }
      if (isLoadingPlayback() && (KEYS[code] || code === 13)) {
        e.preventDefault();
        e.stopPropagation();
        handled.add(code);
        return;
      }
      if (playerOpen() && !inOverlay() && (KEYS[code] || code === 13)) {
        if (!shell) return;
        if (shell.osd.handleKey(e)) {
          e.preventDefault();
          e.stopPropagation();
          handled.add(code);
          return;
        }
      }
      if (KEYS[code]) {
        if (move(KEYS[code])) e.preventDefault();
        e.stopPropagation();
        handled.add(code);
      } else if (code === 13) {
        const el = activeEl();
        if (!el || el.matches("input, select, textarea")) return;
        if (el.closest("#fc-app, #fc-osd") || !el.matches("a[href], button")) {
          e.preventDefault();
          e.stopPropagation();
          el.click();
        }
      } else if (BACK2.includes(code)) {
        if (((_b = (_a = e.target).matches) == null ? void 0 : _b.call(_a, "input, textarea")) && code === 8) return;
        e.preventDefault();
        e.stopPropagation();
        if (inOverlay()) {
          (_c = overlayRoot().querySelector(".cancel")) == null ? void 0 : _c.click();
          return;
        }
        if (inSidebar()) leaveSidebar();
        else if (shell && shell.osd.visible()) shell.osd.hide();
        else if (playerOpen()) closePlayer();
        else history.back();
      } else if (PLAY_PAUSE.includes(code)) {
        e.preventDefault();
        try {
          const p = jwplayer("player");
          p.getState() === "playing" ? p.pause() : p.play();
        } catch {
        }
      } else if (code === 417 || code === 412) {
        e.preventDefault();
        try {
          const p = jwplayer("player");
          p.seek(Math.max(0, p.getPosition() + (code === 417 ? 10 : -10)));
        } catch {
        }
      } else if (code === RED2) {
        const s = settings();
        s.autoplayEnabled = !s.autoplayEnabled;
        localStorage.setItem(SETTINGS_KEY2, JSON.stringify(s));
        pushSettings();
        toast2(`Autoplay ${s.autoplayEnabled ? "on" : "off"}`);
      }
    }, true);
    function closePlayer() {
      var _a;
      try {
        jwplayer("player").pause();
      } catch {
      }
      (_a = document.querySelector(".player")) == null ? void 0 : _a.classList.add("hide");
      history.replaceState(null, "", location.pathname.split("/").slice(0, 5).join("/") + (location.hash.startsWith("#season-") ? location.hash : ""));
      window.__fcAllowAutostart = false;
      shell == null ? void 0 : shell.stop();
      setTimeout(() => {
        var _a2;
        return (_a2 = [".jf-detailbtn--play", ".jf-main .jf-card", ".jf-main button"].map((s) => document.querySelector(`#fc-app ${s}`)).find(Boolean)) == null ? void 0 : _a2.focus({ preventScroll: true });
      }, 0);
    }
    document.addEventListener("fc-close-player", closePlayer);
    function toast2(text) {
      const t = document.body.appendChild(document.createElement("div"));
      t.className = "fc-toast";
      t.setAttribute("role", "status");
      t.textContent = text;
      setTimeout(() => t.remove(), 2e3);
    }
  })();
})();
