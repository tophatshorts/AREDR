import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, pickLevel, readSave, freshSave, cost, reward } from '../src/game.js';

const easy = { id: '1', name: 'Easy', author: 'Tester', difficulty: 'Easy', stars: 2 };
const extreme = { id: '2', name: 'Extreme', author: 'Tester', difficulty: 'Extreme Demon', stars: 10 };
test('API levels are rated and have numeric IDs; platformers keep their moons', () => {
  assert.equal(normalize({ ...easy, stars: 0 }), null);
  assert.equal(normalize({ ...easy, id: '../private' }), null);
  assert.equal(normalize({ ...easy, platformer: true }).platformer, true);
});
test('luck increases actual extreme selection probability', () => {
  const pool = [easy, extreme];
  const count = luck => Array.from({ length: 10000 }, (_, i) => pickLevel(pool, luck, () => i / 10000)).filter(l => l.id === '2').length;
  assert.ok(count(10) > count(0) * 5);
  assert.equal(pickLevel(pool, 0, () => 0).id, '1');
  assert.equal(pickLevel(pool, 0, () => .999999).id, '2');
});
test('invalid and partial saves recover without breaking progression', () => {
  assert.deepEqual(readSave('{oops'), freshSave());
  const save = readSave(JSON.stringify({ version: 1, orbs: -9, upgrades: { luck: 100 }, collection: { '1': { ...easy, count: 3 } }, recent: 'bad' }));
  assert.equal(save.orbs, 0); assert.equal(save.upgrades.luck, 10); assert.equal(save.upgrades.speed, 0);
  assert.equal(save.collection['1'].count, 3); assert.deepEqual(save.recent, []);
});
test('upgrade prices grow and income rewards scale', () => {
  assert.ok(cost('luck', 2) > cost('luck', 1));
  assert.equal(reward(easy, 4), reward(easy, 0) * 2);
  assert.ok(reward(extreme, 0) > reward(easy, 0));
});

test('Reborn settings and daily best round-trip while old saves remain compatible', () => {
  const original = freshSave();
  Object.assign(original, { quick: true, reducedMotion: true, autoStop: '8', updatedAt: 12345, daily: { date: '2026-11-11', level: extreme } });
  const restored = readSave(JSON.stringify(original));
  assert.equal(restored.quick, true);
  assert.equal(restored.reducedMotion, true);
  assert.equal(restored.autoStop, '8');
  assert.equal(restored.updatedAt, 12345);
  assert.equal(restored.daily.level.id, '2');
  const legacy = readSave(JSON.stringify({ version: 1, orbs: 340, rolls: 12 }));
  assert.equal(legacy.orbs, 340);
  assert.equal(legacy.quick, false);
  assert.equal(legacy.daily, null);
});

test('malformed daily records and settings cannot poison account restoration', () => {
  const restored = readSave(JSON.stringify({ ...freshSave(), quick: 'yes', autoStop: '-1', updatedAt: -1, daily: { date: 'yesterday', level: extreme } }));
  assert.equal(restored.quick, false);
  assert.equal(restored.autoStop, '');
  assert.equal(restored.updatedAt, 0);
  assert.equal(restored.daily, null);
});
