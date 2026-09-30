// Run: node --env-file=.env tmdb.test.mjs   (live part is skipped when TMDB_API_KEY is unset)
import assert from 'node:assert/strict';
import { pickMatch, tmdb } from './tmdb.js';

const results = [
  { id: 1, name: 'Lanterns', first_air_date: '1999-01-01', poster_path: '/old.jpg' },
  { id: 2, name: 'Lanterns', first_air_date: '2026-08-01', poster_path: '/rb94.jpg' },
];
assert.equal(pickMatch(results, { title: 'Lanterns', year: '1999', poster: 'rb94.jpg' }).id, 2, 'poster beats title+year');
assert.equal(pickMatch(results, { title: 'lanterns!', year: '1999', poster: 'nope.jpg' }).id, 1, 'normalized title+year fallback');
assert.equal(pickMatch(results, { title: 'Other', year: '2026' }), null, 'no confident match → null');
console.log('pickMatch: ok');

const key = process.env.TMDB_API_KEY;
if (key) {
  // Real site cards from the site mapping (PRD Appendix A).
  const cases = [
    { title: 'Lanterns', year: '2026', poster: 'rb94rKVIzLyfWufIN7WqLvadBDH.jpg' },
    { title: 'Modern Family', year: '2009' },
  ];
  for (const show of cases) {
    const { results } = await tmdb('/search/tv', { query: show.title, first_air_date_year: show.year }, key);
    const hit = pickMatch(results, show);
    assert.ok(hit, `no TMDB match for ${show.title}`);
    console.log(`live: ${show.title} → TMDB ${hit.id} (${hit.name}, ${hit.first_air_date}) via ${hit.poster_path === `/${show.poster}` ? 'poster' : 'title+year'}`);
  }
} else console.log('live: skipped (no TMDB_API_KEY)');
