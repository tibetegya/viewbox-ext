// Run: node scan.test.mjs
import assert from 'node:assert/strict';
import { countNew, isDue } from './scan.js';

const now = Date.parse('2026-09-29T12:00:00Z');
const seen = Date.parse('2026-09-20T08:00:00Z');
const eps = [
  { airDate: '2026-09-13' }, // before last seen
  { airDate: '2026-09-20' }, // aired the day it was seen → already seen
  { airDate: '2026-09-27' }, // new
  { airDate: '2026-09-29' }, // new (today)
  { airDate: '2026-10-04' }, // future
  { airDate: null },          // TBA
];
assert.equal(countNew(eps, seen, now), 2);
assert.equal(countNew(eps, now, now), 0, 'opening the show clears the count');

const DAY = 864e5;
assert.equal(isDue({ status: 'Returning Series', lastScannedAt: now - DAY }, now), true);
assert.equal(isDue({ status: 'Ended', lastScannedAt: now - DAY }, now), false, 'ended shows skip until a week passes');
assert.equal(isDue({ status: 'Canceled', lastScannedAt: now - 8 * DAY }, now), true);
assert.equal(isDue({ status: 'Ended' }, now), true, 'never scanned → due');
console.log('scan: ok');
