// MAIN world on /watch/tv/*: Netflix-style "next episode" countdown on top of the site's own autoplay (PRD F3).
// The site plays the next episode in-page via the global playNext(); we wrap it rather than re-implement it.
(() => {
  // Watch-page selectors (PRD Appendix A). Kept here, not in selectors.js: Chrome injects a file once per frame,
  // and selectors.js already runs in the isolated world. Site globals used: playNext(), autoplay, activeID, key ("pid:s:e").
  const SEL = {
    playerBox: '#player',                              // JW Player container; stays in fullscreen
    siteNextUp: '.nextUp',                             // site's own 90 s countdown box, hidden while we handle autoplay
    episodeRow: (epid) => `tr.eplist[data-epid="${epid}"]`, // data-epid is one sequence across seasons, 1 = latest
    epTitle: '.epTitle',
    epThumb: 'img.watch-episode-thumb',                // data-img = TMDB still path
    thumbBase: 'https://img.xcdn.to/t/p/w300',
  };

  if (window.__fcPlayer) return; // also embedded in the TV interface bundle (options: tvUi): run once
  if (typeof window.playNext !== 'function') return; // site changed: leave its native autoplay alone (PRD R4)
  window.__fcPlayer = true;
  const sitePlayNext = window.playNext;
  let savedAutoplay = null; // the site's own "Autoplay Episodes" switch value while we force it off

  let cfg = null;
  const pid = () => String(window.key ?? location.pathname).match(/\d+/)?.[0];
  const enabled = () => !!cfg && cfg.autoplayEnabled && !cfg.autoplayOff.includes(pid());

  const hideSiteBox = document.head.appendChild(document.createElement('style'));
  hideSiteBox.textContent = `${SEL.siteNextUp} { display: none !important; }`;
  hideSiteBox.disabled = true; // until settings arrive, the site's own countdown stays

  function readCfg() {
    try { cfg = JSON.parse(document.documentElement.dataset.fcSettings); } catch { cfg = null; }
    if (!cfg) return;
    // Off = no autoplay at all (F3.5). Only touch the site's switch when we override it, and restore it afterwards.
    if (!enabled() && savedAutoplay === null) { savedAutoplay = window.autoplay; window.autoplay = false; }
    else if (enabled() && savedAutoplay !== null) { window.autoplay = savedAutoplay; savedAutoplay = null; }
    hideSiteBox.disabled = !enabled();
    if (!enabled()) hide();
  }
  document.addEventListener('fc-settings', readCfg);
  readCfg();

  let epKey = '';
  let epSrc = '';
  let cancelled = false;
  let ui = null;
  let timer = null;
  let manualNext = false;
  let prompt = null;

  // "Are you still watching?" (PRD F4). Per-tab state in sessionStorage: survives in-page episode switches and reloads.
  const SW_KEY = 'fc-still-watching';
  const fresh = () => ({ auto: 0, lastInteraction: Date.now(), pending: false });
  const sw = {
    get: () => { try { return JSON.parse(sessionStorage.getItem(SW_KEY)) ?? fresh(); } catch { return fresh(); } },
    set: (v) => { try { sessionStorage.setItem(SW_KEY, JSON.stringify(v)); } catch {} },
  };

  // Any real key press or pointer press counts as "someone is there": pause/play, seek, volume, fullscreen, picking an episode.
  function interacted(e) {
    if (!e.isTrusted || (prompt && e.composedPath().includes(prompt))) return;
    sw.set(fresh());
    if (prompt) resume();
  }
  document.addEventListener('pointerdown', interacted, true);
  document.addEventListener('keydown', interacted, true);

  // The site also calls this itself when an episode ends; "Not now" must stop that too.
  window.playNext = function (...args) {
    if (cancelled) return;
    hide();
    // Count only advances the site will really make (its guard drops the duplicate end-of-episode call).
    if (!manualNext && cfg?.stillWatching && window.autoplay && !window.playNextGuard) {
      const st = sw.get();
      st.auto += 1;
      st.pending = st.auto >= cfg.swEpisodes || Date.now() - st.lastInteraction >= cfg.swMinutes * 60e3;
      sw.set(st);
    }
    manualNext = false;
    return sitePlayNext.apply(this, args);
  };

  // Media events don't bubble, but capture on document sees every <video>, even after JW rebuilds the player.
  document.addEventListener('timeupdate', (e) => {
    const v = e.target;
    // ponytail: the > 2 min check keeps short pre-roll ads out; a long ad in the same <video> would still trigger it.
    if (!(v instanceof HTMLVideoElement)) return;
    if (prompt) { if (!v.paused) v.pause(); return; } // JW autostart resumes after a single pause(); hold until answered
    if (!enabled() || !(v.duration > 120)) return;
    const key = String(window.key ?? location.pathname);
    if (key !== epKey) {
      // The site switches `key` before the new source loads, so one last event still comes from the old
      // episode's final seconds (same <video>, old blob: src). Acting on it opened a card for the episode after next.
      if (v.currentSrc === epSrc) return;
      epKey = key; epSrc = v.currentSrc; cancelled = false; hide();
      if (cfg.stillWatching && sw.get().pending) return askStillWatching(v);
    }
    if (!window.autoplay) return hide(); // site's own "Autoplay Episodes" switch is off
    if (v.duration - v.currentTime > cfg.creditsOffset + 1) return hide(); // not there yet, or seeked back
    if (!ui && !cancelled) show(v);
  }, true);

  function show(v) {
    const row = document.querySelector(SEL.episodeRow(window.activeID - 1));
    const total = cfg.countdownSecs;
    let left = total;
    ui = mount(row, total);
    if (!row) return; // last episode: "all caught up", no countdown
    timer = setInterval(() => {
      if (v.paused) return; // countdown waits while the viewer pauses
      left = Math.max(0, left - 0.25);
      ui.tick(left);
      if (left === 0) playNow(false);
    }, 250);
  }

  function playNow(manual) { hide(); manualNext = manual === true; window.playNext(); }
  function cancel() { cancelled = true; hide(); }
  function hide() {
    clearInterval(timer);
    ui?.remove();
    ui = null;
  }

  function onKey(e) {
    if (!ui) return;
    if (e.key === 'Escape') cancel();
    else if (e.key === 'Enter' && ui.hasNext && !e.composedPath().includes(ui)) playNow(true); // focus inside the card: its buttons handle it
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
  document.addEventListener('keydown', onKey, true);

  const CSS = `
    .box { font: 14px/1.3 system-ui, sans-serif; color: #fff; background: rgba(20,20,20,.92); border-radius: 8px;
           padding: 12px; width: 300px; box-shadow: 0 4px 24px rgba(0,0,0,.5); display: grid; gap: 10px; }
    .head { display: flex; gap: 10px; align-items: center; }
    img { width: 96px; aspect-ratio: 16/9; object-fit: cover; border-radius: 4px; background: #333; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #aaa; }
    .title { font-weight: 600; }
    .actions { display: flex; gap: 8px; }
    button { font: inherit; border: 0; border-radius: 4px; padding: 7px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    button:focus-visible { outline: 2px solid #18a2b8; outline-offset: 2px; }
    .play { background: #fff; color: #111; font-weight: 600; flex: 1; justify-content: center; }
    .cancel { background: rgba(255,255,255,.15); color: #fff; }
    svg { transform: rotate(-90deg); }
    circle { fill: none; stroke-width: 3; }
    .track { stroke: rgba(0,0,0,.15); }
    .ring { stroke: #111; stroke-linecap: round; }
  `;
  const R = 8;
  const C = 2 * Math.PI * R;

  // Shadow DOM keeps site CSS out; mounted inside the JW container so it shows in fullscreen too.
  function overlay(position) {
    const host = document.createElement('div');
    host.style.cssText = `position:absolute;z-index:2147483647;${position}`;
    const root = host.attachShadow({ mode: 'open' }); // open: the TV module's D-pad navigation reaches these buttons
    root.innerHTML = `<style>${CSS}</style>`;
    (document.querySelector(SEL.playerBox) ?? document.body).append(host);
    const box = el(root, 'div', 'box');
    // The site's document keydown handler cancels Enter/Space (play/pause shortcut), which would swallow button presses.
    box.addEventListener('keydown', (e) => {
      const btn = e.target.closest?.('button');
      if (!btn || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      e.stopPropagation();
      btn.click();
    });
    return { host, box };
  }

  function askStillWatching(v) {
    v.pause();
    prompt?.remove();
    const show = /Episodes of (.+?) \(\d{4}\)/.exec(document.title)?.[1];
    const { host, box } = overlay('left:50%;top:50%;transform:translate(-50%,-50%)');
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-labelledby', 'q');
    box.setAttribute('aria-modal', 'true');
    const q = el(box, 'div', 'title');
    q.id = 'q';
    q.textContent = show ? `Are you still watching ${show}?` : 'Are you still watching?';
    const actions = el(box, 'div', 'actions');
    const go = el(actions, 'button', 'play');
    go.textContent = 'Continue watching';
    go.onclick = resume;
    const back = el(actions, 'button', 'cancel');
    back.textContent = 'Back to browse';
    back.onclick = () => { sw.set(fresh()); location.assign(location.pathname.split('/').slice(0, 5).join('/')); };
    // Modal: keep Tab / Shift+Tab on the two buttons.
    box.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      e.stopPropagation();
      (e.target === go ? back : go).focus();
    });
    prompt = host;
    queueMicrotask(() => go.focus({ preventScroll: true }));
  }

  function resume() {
    sw.set(fresh());
    prompt?.remove();
    prompt = null;
    document.querySelector('video')?.play().catch(() => {});
  }

  function mount(row, total) {
    const { host, box } = overlay('right:24px;bottom:72px');
    box.setAttribute('role', 'dialog');

    if (!row) {
      box.setAttribute('aria-label', 'All caught up');
      el(box, 'div', 'title').textContent = "You're all caught up";
      el(box, 'div', 'label').textContent = 'No more episodes of this show yet.';
      el(el(box, 'div', 'actions'), 'button', 'cancel').textContent = 'Close';
      box.querySelector('button').onclick = cancel;
    } else {
      box.setAttribute('aria-label', 'Next episode');
      const head = el(box, 'div', 'head');
      const thumb = row.querySelector(SEL.epThumb)?.dataset.img;
      if (thumb) Object.assign(el(head, 'img'), { src: SEL.thumbBase + thumb, alt: '' });
      const text = el(head, 'div');
      el(text, 'div', 'label').textContent = `Next · S${row.dataset.pes} E${row.dataset.pep}`;
      el(text, 'div', 'title').textContent = row.querySelector(SEL.epTitle)?.textContent.trim() ?? '';
      const actions = el(box, 'div', 'actions');
      const play = el(actions, 'button', 'play');
      play.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle class="track" cx="10" cy="10" r="${R}"/><circle class="ring" cx="10" cy="10" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><span></span>`;
      const ring = play.querySelector('.ring');
      const label = play.querySelector('span');
      label.textContent = `Next episode in ${total}`;
      play.onclick = () => playNow(true);
      const no = el(actions, 'button', 'cancel');
      no.textContent = 'Not now';
      no.onclick = cancel;
      host.tick = (left) => {
        ring.setAttribute('stroke-dashoffset', String(C * (1 - left / total)));
        label.textContent = `Next episode in ${Math.ceil(left)}`;
      };
      queueMicrotask(() => play.focus({ preventScroll: true }));
    }
    host.hasNext = !!row;
    return host;
  }

  function el(parent, tag, cls) {
    const n = parent.appendChild(document.createElement(tag));
    if (cls) { n.className = cls; n.setAttribute('part', cls); } // ::part() lets the TV module restyle the overlays
    return n;
  }
})();
