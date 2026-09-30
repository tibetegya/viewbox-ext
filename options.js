import { tmdb } from './tmdb.js';

const $ = (id) => document.getElementById(id);
const status = (text) => ($('status').textContent = text);

async function load() {
  const s = await chrome.storage.local.get(['tmdbKey', 'vipEmail', 'vipPassword', 'syncCode']);
  $('tmdbKey').value = s.tmdbKey ?? '';
  $('vipEmail').value = s.vipEmail ?? '';
  $('syncCode').value = s.syncCode ?? '';
  // Password is write-only: never put the stored value back into the page (PRD F5.2).
  $('vipPassword').value = '';
  $('vipPassword').placeholder = s.vipPassword ? 'Saved — type to replace' : '';
  const prefs = await chrome.storage.sync.get({ scanHours: 6, notify: false, autoplayEnabled: true, creditsOffset: 20, countdownSecs: 10, stillWatching: true, swEpisodes: 3, swMinutes: 90 });
  $('scanHours').value = prefs.scanHours;
  $('notify').checked = prefs.notify;
  $('autoplayEnabled').checked = prefs.autoplayEnabled;
  $('creditsOffset').value = prefs.creditsOffset;
  $('countdownSecs').value = prefs.countdownSecs;
  $('stillWatching').checked = prefs.stillWatching;
  $('swEpisodes').value = prefs.swEpisodes;
  $('swMinutes').value = prefs.swMinutes;
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    tmdbKey: $('tmdbKey').value.trim(),
    vipEmail: $('vipEmail').value.trim(),
    syncCode: $('syncCode').value.trim().toUpperCase(),
  };
  if ($('vipPassword').value) data.vipPassword = $('vipPassword').value;
  await chrome.storage.local.set({ ...data, loginError: null, lastLoginAttempt: 0 }); // new credentials get a fresh auto-login try
  const num = (id, min, max, def) => Math.min(max, Math.max(min, parseInt($(id).value, 10) || def));
  await chrome.storage.sync.set({
    scanHours: num('scanHours', 1, 24, 6),
    notify: $('notify').checked,
    autoplayEnabled: $('autoplayEnabled').checked,
    creditsOffset: num('creditsOffset', 5, 120, 20),
    countdownSecs: num('countdownSecs', 3, 30, 10),
    stillWatching: $('stillWatching').checked,
    swEpisodes: num('swEpisodes', 2, 5, 3),
    swMinutes: num('swMinutes', 60, 180, 90),
  });
  await // Each site is one optional host permission ("https://*.example.com/*" also covers example.com); background.js registers the scripts.
async function loadSites() {
  const origins = ((await chrome.permissions.getAll()).origins ?? []).filter((o) => !o.includes('themoviedb.org'));
  $('sites').replaceChildren(...origins.map((o) => {
    const li = document.createElement('li');
    li.textContent = `${o.replace(/^https:\/\/(\*\.)?|\/\*$/g, '')} `;
    const rm = li.appendChild(Object.assign(document.createElement('button'), { type: 'button', textContent: 'Remove' }));
    rm.addEventListener('click', async () => { await chrome.permissions.remove({ origins: [o] }); loadSites(); });
    return li;
  }));
}
$('addSite').addEventListener('submit', async (e) => {
  e.preventDefault();
  let host;
  try { host = new URL(/^[a-z]+:\/\//i.test($('site').value.trim()) ? $('site').value.trim() : `https://${$('site').value.trim()}`).hostname.replace(/^www\./, ''); } catch {}
  if (!host?.includes('.')) return status('Enter a site address like example.com.');
  if (!(await chrome.permissions.request({ origins: [`https://*.${host}/*`] }))) return status('Permission not granted.');
  $('site').value = '';
  loadSites();
  status(`Added ${host}. Open it to load your favorites.`);
});

load();
loadSites();
  status('Saved.');
  if (data.tmdbKey) chrome.runtime.sendMessage({ type: 'MATCH_PENDING' }).then((r) => r && !r.error && status(`Saved. ${r.matched}/${r.tracked} shows matched on TMDB.`));
});

$('test').addEventListener('click', async () => {
  status('Testing…');
  try {
    await tmdb('/configuration', {}, $('tmdbKey').value.trim());
    status('TMDB key works.');
  } catch (e) {
    status(`TMDB key failed: ${e.message}`);
  }
});

(async () => { $('tvUi').checked = (await chrome.storage.sync.get({ tvUi: false })).tvUi; })();
$('tvUi').addEventListener('change', async () => {
  await chrome.storage.sync.set({ tvUi: $('tvUi').checked }); // background.js (un)registers the script and reloads site tabs
  status($('tvUi').checked ? 'TV interface on — site tabs reloaded.' : 'TV interface off — site tabs reloaded.');
});

$('reveal').addEventListener('click', () => {
  const show = $('vipPassword').type === 'password';
  $('vipPassword').type = show ? 'text' : 'password';
  $('reveal').textContent = show ? 'Hide' : 'Show';
  $('reveal').setAttribute('aria-pressed', show);
});

$('clear').addEventListener('click', async () => {
  await chrome.storage.local.remove(['vipEmail', 'vipPassword', 'syncCode', 'loginError', 'manualLogout']);
  await // Each site is one optional host permission ("https://*.example.com/*" also covers example.com); background.js registers the scripts.
async function loadSites() {
  const origins = ((await chrome.permissions.getAll()).origins ?? []).filter((o) => !o.includes('themoviedb.org'));
  $('sites').replaceChildren(...origins.map((o) => {
    const li = document.createElement('li');
    li.textContent = `${o.replace(/^https:\/\/(\*\.)?|\/\*$/g, '')} `;
    const rm = li.appendChild(Object.assign(document.createElement('button'), { type: 'button', textContent: 'Remove' }));
    rm.addEventListener('click', async () => { await chrome.permissions.remove({ origins: [o] }); loadSites(); });
    return li;
  }));
}
$('addSite').addEventListener('submit', async (e) => {
  e.preventDefault();
  let host;
  try { host = new URL(/^[a-z]+:\/\//i.test($('site').value.trim()) ? $('site').value.trim() : `https://${$('site').value.trim()}`).hostname.replace(/^www\./, ''); } catch {}
  if (!host?.includes('.')) return status('Enter a site address like example.com.');
  if (!(await chrome.permissions.request({ origins: [`https://*.${host}/*`] }))) return status('Permission not granted.');
  $('site').value = '';
  loadSites();
  status(`Added ${host}. Open it to load your favorites.`);
});

load();
loadSites();
  status('Credentials cleared.');
});

// Each site is one optional host permission ("https://*.example.com/*" also covers example.com); background.js registers the scripts.
async function loadSites() {
  const origins = ((await chrome.permissions.getAll()).origins ?? []).filter((o) => !o.includes('themoviedb.org'));
  $('sites').replaceChildren(...origins.map((o) => {
    const li = document.createElement('li');
    li.textContent = `${o.replace(/^https:\/\/(\*\.)?|\/\*$/g, '')} `;
    const rm = li.appendChild(Object.assign(document.createElement('button'), { type: 'button', textContent: 'Remove' }));
    rm.addEventListener('click', async () => { await chrome.permissions.remove({ origins: [o] }); loadSites(); });
    return li;
  }));
}
$('addSite').addEventListener('submit', async (e) => {
  e.preventDefault();
  let host;
  try { host = new URL(/^[a-z]+:\/\//i.test($('site').value.trim()) ? $('site').value.trim() : `https://${$('site').value.trim()}`).hostname.replace(/^www\./, ''); } catch {}
  if (!host?.includes('.')) return status('Enter a site address like example.com.');
  if (!(await chrome.permissions.request({ origins: [`https://*.${host}/*`] }))) return status('Permission not granted.');
  $('site').value = '';
  loadSites();
  status(`Added ${host}. Open it to load your favorites.`);
});

load();
loadSites();
