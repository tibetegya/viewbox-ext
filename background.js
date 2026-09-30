import { getAll, put, del } from './db.js';
import { matchShow } from './tmdb.js';
import { scanAll, counts, updateBadge } from './scan.js';

const handlers = {
  SYNC_MYLIST: syncMyList,
  MATCH_PENDING: matchPending,
  SCAN_NOW: () => scanAll(),
  GET_NEW_COUNTS: counts,
  MARK_SEEN: markSeen,
  GET_SHOWS: getShows,
  SET_TMDB: setTmdb,
};
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const run = handlers[msg.type];
  if (!run) return;
  run(msg, sender).then(reply, (e) => reply({ error: e.message }));
  return true; // async reply
});

// Alarms survive service-worker sleep (F2.1). Re-created only when missing or when the interval changes.
async function schedule(force) {
  const { scanHours } = await chrome.storage.sync.get({ scanHours: 6 });
  if (force || !(await chrome.alarms.get('scan'))) chrome.alarms.create('scan', { periodInMinutes: scanHours * 60, delayInMinutes: 1 });
}
chrome.runtime.onInstalled.addListener(() => schedule(false));
chrome.runtime.onStartup.addListener(() => schedule(false).then(() => updateBadge()));
chrome.storage.onChanged.addListener((c, area) => area === 'sync' && c.scanHours && schedule(true));
// Content scripts run only on the sites the user granted in Settings (optional host permissions), so they're
// registered at runtime from the granted origins instead of fixed manifest matches.
const siteOrigins = async () => ((await chrome.permissions.getAll()).origins ?? []).filter((o) => !o.includes('themoviedb.org'));
async function syncScripts(reloadTabs) {
  const sites = await siteOrigins();
  const { tvUi } = await chrome.storage.sync.get({ tvUi: false });
  const watch = sites.map((o) => o.replace(/\/\*$/, '/watch/tv/*'));
  const scripts = !sites.length ? [] : [
    { id: 'site', matches: sites, js: ['selectors.js', 'content/favorites.js', 'content/auth.js'], runAt: 'document_idle' },
    { id: 'player-bridge', matches: watch, js: ['content/player-bridge.js'], runAt: 'document_idle' },
    { id: 'player', matches: watch, js: ['content/player.js'], runAt: 'document_idle', world: 'MAIN' },
    // TV interface in the browser (options: tvUi): the Viewbox TV bundle, injected like on the TV (main world, document start).
    ...(tvUi ? [{ id: 'tv-ui', matches: sites, js: ['content/tv-flag.js', 'tv/main.js'], runAt: 'document_start', world: 'MAIN' }] : []),
  ].map((c) => ({ ...c, persistAcrossSessions: true }));
  await chrome.scripting.unregisterContentScripts();
  if (scripts.length) await chrome.scripting.registerContentScripts(scripts);
  if (reloadTabs && sites.length) for (const t of await chrome.tabs.query({ url: sites })) chrome.tabs.reload(t.id);
}
chrome.runtime.onInstalled.addListener(({ reason }) => {
  syncScripts(false);
  if (reason === 'install') chrome.runtime.openOptionsPage(); // pick the sites to run on
});
chrome.runtime.onStartup.addListener(() => syncScripts(false));
chrome.permissions.onAdded.addListener(() => syncScripts(true));
chrome.permissions.onRemoved.addListener(() => syncScripts(true));
chrome.storage.onChanged.addListener((c, area) => area === 'sync' && c.tvUi && syncScripts(true));
chrome.alarms.onAlarm.addListener((a) => a.name === 'scan' && scanAll());

chrome.notifications.onClicked.addListener(async (id) => {
  const show = (await getAll('shows')).find((s) => `show:${s.pid}` === id);
  if (show?.url) chrome.tabs.create({ url: `${show.origin}${show.url}` });
  chrome.notifications.clear(id);
});

async function markSeen({ pid }) {
  const s = (await getAll('shows')).find((s) => s.pid === pid);
  if (!s) return null;
  s.lastSeenAt = Date.now();
  await put('shows', s);
  await updateBadge();
  return { ok: true };
}

async function getShows() {
  const c = await counts();
  const shows = (await getAll('shows')).map((s) => ({ ...s, newCount: c[s.pid] ?? 0 }));
  return { shows, ...(await chrome.storage.local.get('lastScanAt')) };
}

// Manual fix from the popup (F1.2): accepts a TMDB id or URL.
async function setTmdb({ pid, tmdbId }) {
  const s = (await getAll('shows')).find((s) => s.pid === pid);
  Object.assign(s, { tmdbId, noMatch: false, lastEpKey: null, lastScannedAt: null, status: null });
  await put('shows', s);
  return scanAll((x) => x.pid === pid);
}

async function syncMyList({ favorites, cards }, sender) {
  const origin = new URL(sender.url).origin; // which of the user's sites these favorites came from
  const shows = new Map((await getAll('shows')).map((s) => [s.pid, s]));
  const meta = new Map(cards.map((c) => [c.pid, c]));
  const favPids = new Set(favorites.map((f) => f.pid));

  // ponytail: an empty list usually means no sync code in this browser, not "user removed everything" — never mass-untrack on it.
  if (favPids.size) for (const pid of shows.keys()) if (!favPids.has(pid)) await del('shows', pid);

  for (const { pid, addedAt } of favorites) {
    const old = shows.get(pid);
    const c = meta.get(pid);
    const next = {
      pid, tmdbId: null, status: null, addedAt, lastSeenAt: Date.now(),
      ...old, origin,
      ...(c && { title: c.title, year: c.year, slug: c.slug, poster: c.poster, url: `/watch/tv/${pid}/${c.slug}` }),
    };
    if (JSON.stringify(next) !== JSON.stringify(old)) await put('shows', next);
  }
  const counts = await matchPending();
  return { ...counts, needMeta: (await getAll('shows')).filter((s) => !s.title).map((s) => s.pid) };
}

// Serialized so overlapping syncs don't search TMDB twice for the same show.
let matching = Promise.resolve();
function matchPending() {
  matching = matching.catch(() => {}).then(async () => {
    const shows = await getAll('shows');
    for (const s of shows.filter((s) => !s.tmdbId && !s.noMatch && s.title)) {
      try {
        s.tmdbId = await matchShow(s);
        s.noMatch = !s.tmdbId; // fixed by hand from the popup
        await put('shows', s);
      } catch (e) {
        console.warn('TMDB match failed', s.title, e.message);
        if (/key|401/.test(e.message)) break; // no point retrying the rest with a bad key
      }
    }
    const all = await getAll('shows');
    if (all.some((s) => s.tmdbId && !s.lastScannedAt)) scanAll((s) => !s.lastScannedAt); // seed episodes for new matches
    return { tracked: all.length, matched: all.filter((s) => s.tmdbId).length, noMatch: all.filter((s) => s.noMatch).length, awaitingMeta: all.filter((s) => !s.title).length };
  });
  return matching;
}
