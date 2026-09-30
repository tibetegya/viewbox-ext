// Periodic new-episode scan (PRD F2), counts (F1.4), toolbar badge + notifications (F2.5).
import { getAll, getAllKeys, put, putMany, del } from './db.js';
import { tmdb } from './tmdb.js';

const WEEK = 7 * 864e5;
export const day = (ms) => new Date(ms).toISOString().slice(0, 10);

// Episodes that aired after the day the user last opened the show, up to today.
export const countNew = (episodes, lastSeenAt, now = Date.now()) =>
  episodes.filter((e) => e.airDate && e.airDate > day(lastSeenAt) && e.airDate <= day(now)).length;

// Ended/canceled shows are rescanned weekly instead of every run (F2.3).
export const isDue = (s, now = Date.now()) => !/^(Ended|Canceled)$/.test(s.status) || !s.lastScannedAt || now - s.lastScannedAt > WEEK;

export async function counts() {
  const byTmdb = Map.groupBy(await getAll('episodes'), (e) => e.tmdbId);
  const out = {};
  for (const s of await getAll('shows')) if (s.tmdbId) out[s.pid] = countNew(byTmdb.get(s.tmdbId) ?? [], s.lastSeenAt);
  return out;
}

export async function updateBadge(c) {
  c ??= await counts();
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  await chrome.action.setBadgeBackgroundColor({ color: '#d9534f' });
  await chrome.action.setBadgeText({ text: total ? String(total) : '' });
}

// ~1 request per show; the season is fetched only when TMDB's last aired episode changed (F2.2).
async function scanShow(s) {
  const tv = await tmdb(`/tv/${s.tmdbId}`);
  const last = tv.last_episode_to_air;
  const lastEpKey = last ? `${last.season_number}x${last.episode_number}` : null;
  if (last && lastEpKey !== s.lastEpKey) {
    // ponytail: only the latest season is stored; a finale + next premiere inside one scan interval undercounts by the older season.
    const season = await tmdb(`/tv/${s.tmdbId}/season/${last.season_number}`);
    await putMany('episodes', season.episodes.map((e) => ({ tmdbId: s.tmdbId, season: e.season_number, episode: e.episode_number, name: e.name, airDate: e.air_date })));
  }
  Object.assign(s, { status: tv.status, lastEpKey, nextAirDate: tv.next_episode_to_air?.air_date ?? null, lastScannedAt: Date.now() });
  await put('shows', s);
}

// Serialized: a request made during a scan (e.g. a manual TMDB fix) runs after it instead of being dropped.
let queue = Promise.resolve();
export function scanAll(only = () => true) {
  return (queue = queue.catch(() => {}).then(() => runScan(only)));
}

async function runScan(only) {
  const startedAt = Date.now();
  const before = await counts();
  const shows = (await getAll('shows')).filter((s) => s.tmdbId && isDue(s) && only(s));
  const errors = [];
  for (const s of shows) {
    try {
      await scanShow(s);
    } catch (e) {
      errors.push(`${s.title}: ${e.message}`);
      if (/key|401/.test(e.message)) break;
    }
  }
  const after = await counts();
  const newEpisodes = Object.values(after).reduce((a, b) => a + b, 0);
  await put('scans', { startedAt, finishedAt: Date.now(), showsScanned: shows.length, newEpisodes, errors });
  for (const k of (await getAllKeys('scans')).slice(0, -50)) await del('scans', k); // keep last 50
  await chrome.storage.local.set({ lastScanAt: Date.now() });
  await notify(before, after);
  await updateBadge(after);
  return { showsScanned: shows.length, newEpisodes, errors };
}

async function notify(before, after) {
  const { notify } = await chrome.storage.sync.get({ notify: false });
  if (!notify) return;
  const shows = new Map((await getAll('shows')).map((s) => [s.pid, s]));
  for (const [pid, n] of Object.entries(after)) {
    if (n <= (before[pid] ?? 0)) continue;
    await chrome.notifications.create(`show:${pid}`, {
      type: 'basic', iconUrl: 'icons/icon128.png',
      title: shows.get(pid).title, message: `${n} new episode${n > 1 ? 's' : ''}`,
    });
  }
}
