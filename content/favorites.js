// Reads the site's own favorites from localStorage and any matching cards on the page, then sends them to the worker.
// Also clears a show's "new" count when its page is opened, and draws "N new" badges on favorite cards.
(() => {
  let last = '';

  function collect() {
    const favorites = Object.keys(localStorage)
      .filter((k) => k.startsWith(SEL.favTvPrefix))
      .map((k) => ({ pid: k.slice(SEL.favTvPrefix.length), addedAt: parseInt(localStorage.getItem(k), 10) * 1000 || Date.now() }));
    const favPids = new Set(favorites.map((f) => f.pid));

    // Any grid on any page can supply metadata for a favorite; My Lists shows them all.
    const cards = [...document.querySelectorAll(SEL.tvCard)].flatMap((el) => {
      const [, , , pid, slug] = el.dataset.href.split('/');
      const img = el.querySelector(SEL.cardPoster);
      if (!favPids.has(pid) || !img) return [];
      return [{ pid, slug, title: img.alt.trim(), year: el.querySelector(SEL.cardYear)?.textContent.trim(), poster: img.src.split('/').pop() }];
    });
    return { favorites, cards };
  }

  // Favorites not on screen (e.g. My Lists page 2) get metadata from their show page, once — the worker keeps it.
  const tried = new Set();
  async function fetchMeta(pid) {
    tried.add(pid);
    const d = new DOMParser().parseFromString(await (await fetch(SEL.showPage(pid))).text(), 'text/html');
    const og = (p) => d.querySelector(`meta[property="og:${p}"]`)?.content ?? '';
    const m = og('title').match(SEL.ogTitle);
    return m && { pid, title: m[1], year: m[2], slug: og('url').split('/').pop(), poster: og('image').split('/').pop() };
  }

  async function sync() {
    const payload = collect();
    const json = JSON.stringify(payload);
    if (json === last) return;
    last = json;
    const res = await chrome.runtime.sendMessage({ type: 'SYNC_MYLIST', ...payload }).catch(() => null);
    const missing = (res?.needMeta ?? []).filter((pid) => !tried.has(pid));
    if (!missing.length) return;
    const cards = [];
    for (const pid of missing) cards.push(await fetchMeta(pid).catch(() => null));
    chrome.runtime.sendMessage({ type: 'SYNC_MYLIST', favorites: payload.favorites, cards: cards.filter(Boolean) }).catch(() => {});
  }

  // Only touches the DOM when a badge actually changes, so it can't retrigger the MutationObserver in a loop.
  async function renderBadges() {
    const counts = await chrome.runtime.sendMessage({ type: 'GET_NEW_COUNTS' }).catch(() => null);
    if (!counts || counts.error) return;
    for (const el of document.querySelectorAll(SEL.tvCard)) {
      const n = counts[el.dataset.href.split('/')[3]] ?? 0;
      const want = n ? `${n} new` : '';
      const badge = el.querySelector(`.${SEL.newBadgeClass}`);
      if ((badge?.textContent ?? '') === want) continue;
      badge?.remove();
      if (!want) continue;
      const b = document.createElement('span');
      b.className = `badge badge-danger ${SEL.newBadgeClass}`;
      b.textContent = want;
      b.setAttribute('aria-label', `${n} new episode${n > 1 ? 's' : ''}`);
      el.querySelector(SEL.cardBadgeRow)?.append(b);
    }
  }

  const showPid = location.pathname.match(SEL.showPath)?.[1];
  if (showPid) chrome.runtime.sendMessage({ type: 'MARK_SEEN', pid: showPid }).catch(() => {});

  // My Lists renders cards via ajax after load, and the site's sync writes bm:* keys late, so re-check on DOM changes.
  let timer;
  const refresh = () => sync().then(renderBadges);
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(refresh, 1000);
  }).observe(document.body, { childList: true, subtree: true });
  refresh();
})();
