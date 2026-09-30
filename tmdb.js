// TMDB client. Accepts a v3 API key (query param) or a v4 read token (Bearer header).
export async function tmdb(path, params = {}, key) {
  key ??= (await chrome.storage.local.get('tmdbKey')).tmdbKey;
  if (!key) throw new Error('No TMDB API key set');
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  const bearer = key.length > 40; // v3 keys are 32 hex chars; v4 tokens are long JWTs
  if (!bearer) url.searchParams.set('api_key', key);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  for (let attempt = 0; ; attempt++) {
    await slot();
    const r = await fetch(url, bearer ? { headers: { Authorization: `Bearer ${key}` } } : {});
    if (r.ok) return r.json();
    if ((r.status === 429 || r.status >= 500) && attempt < 3) await sleep(1000 * 2 ** attempt); // 1 s, 2 s, 4 s
    else throw new Error(`TMDB ${r.status} on ${path}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Spaces all TMDB calls ≥ 50 ms apart (≤ 20 req/s; TMDB's soft limit is ~40) — PRD F2.4.
let nextAt = 0;
function slot() {
  const wait = Math.max(0, nextAt - Date.now());
  nextAt = Date.now() + wait + 50;
  return sleep(wait);
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// The site serves TMDB's own poster files, so a poster match is exact; title+year is the fallback (PRD F1.2).
export function pickMatch(results, { title, year, poster }) {
  return (
    results.find((r) => poster && r.poster_path === `/${poster}`) ??
    results.find((r) => norm(r.name) === norm(title) && (!year || r.first_air_date?.startsWith(year))) ??
    null
  );
}

export async function matchShow(show) {
  for (const first_air_date_year of [show.year, undefined]) {
    const { results } = await tmdb('/search/tv', { query: show.title, first_air_date_year });
    const hit = pickMatch(results, show);
    if (hit) return hit.id;
  }
  return null;
}
