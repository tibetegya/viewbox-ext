const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

// Popup-only view preference (PRD §5: localStorage for trivial UI state).
const pref = {
  get: () => { try { return localStorage.getItem('onlyNew') === '1'; } catch { return false; } },
  set: (v) => { try { localStorage.setItem('onlyNew', v ? '1' : '0'); } catch {} },
};

const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

function row(s, autoplayOff) {
  const li = document.createElement('li');
  const r = li.appendChild(document.createElement('div'));
  r.className = 'row';
  const a = r.appendChild(document.createElement('a'));
  a.className = 'title';
  a.textContent = `${s.title ?? `#${s.pid}`}${s.year ? ` (${s.year})` : ''}`;
  a.href = `${s.origin}${s.url ?? `/watch/tv/${s.pid}`}`;
  a.target = '_blank';
  if (s.newCount) r.appendChild(Object.assign(document.createElement('span'), { className: 'new', textContent: `${s.newCount} new` }));

  const sub = li.appendChild(document.createElement('div'));
  sub.className = 'sub';
  if (s.noMatch) sub.innerHTML = '<span class="warn">No TMDB match — fix below</span>';
  else if (s.tmdbId) sub.textContent = [s.status, s.nextAirDate && `next ${s.nextAirDate}`].filter(Boolean).join(' · ') || 'Not scanned yet';
  else sub.textContent = 'Matching…';

  const ap = li.appendChild(document.createElement('label'));
  ap.className = 'sub';
  ap.innerHTML = '<input type="checkbox"> Autoplay';
  const box = ap.querySelector('input');
  box.checked = !autoplayOff.includes(s.pid);
  box.addEventListener('change', async () => {
    const { autoplayOff: off } = await chrome.storage.sync.get({ autoplayOff: [] });
    await chrome.storage.sync.set({ autoplayOff: box.checked ? off.filter((p) => p !== s.pid) : [...new Set([...off, s.pid])] });
  });

  const d = li.appendChild(document.createElement('details'));
  if (s.noMatch) d.open = true;
  d.innerHTML = '<summary>Wrong show?</summary><form><input aria-label="TMDB ID or URL" placeholder="TMDB ID or themoviedb.org URL"><button>Set</button></form>';
  if (s.tmdbId) d.querySelector('summary').textContent = `TMDB ${s.tmdbId} — wrong show?`;
  d.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(d.querySelector('input').value.match(/(\d+)/)?.[1], 10);
    if (!id) return;
    $('status').textContent = 'Rescanning…';
    await send({ type: 'SET_TMDB', pid: s.pid, tmdbId: id });
    render();
  });
  return li;
}

async function render() {
  const { loginError } = await chrome.storage.local.get('loginError');
  $('loginError').hidden = !loginError;
  $('loginError').textContent = loginError ? `${loginError} — check Settings.` : '';
  const res = await send({ type: 'GET_SHOWS' });
  if (res?.error) return ($('status').textContent = res.error);
  const shows = res.shows
    .filter((s) => !$('onlyNew').checked || s.newCount)
    .sort((a, b) => b.newCount - a.newCount || Number(b.noMatch) - Number(a.noMatch) || (a.title ?? '').localeCompare(b.title ?? ''));
  const { autoplayOff } = await chrome.storage.sync.get({ autoplayOff: [] });
  $('list').replaceChildren(...shows.map((s) => row(s, autoplayOff)));
  const total = res.shows.reduce((n, s) => n + s.newCount, 0);
  $('status').textContent = res.shows.length
    ? `${res.shows.length} shows · ${total} new · scanned ${res.lastScanAt ? ago(res.lastScanAt) : 'never'}`
    : 'Add your site in Settings, then open it to load your favorites.';
}

$('scan').addEventListener('click', async () => {
  $('scan').disabled = true;
  $('status').textContent = 'Scanning…';
  const r = await send({ type: 'SCAN_NOW' });
  $('scan').disabled = false;
  await render();
  if (r?.errors?.length) $('status').textContent += ` · ${r.errors.length} error(s)`;
});

$('onlyNew').checked = pref.get();
$('onlyNew').addEventListener('change', () => { pref.set($('onlyNew').checked); render(); });
render();
