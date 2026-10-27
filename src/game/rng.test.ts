import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDemonRarity,
  getDemonTier,
  calculateKeys,
  getEffectiveLuck,
  executeRoll,
} from './rng';
import { DemonLevel, PlayerUpgrades } from './types';

// Mock demon list
const mockDemons: DemonLevel[] = [
  { id: '1', name: 'GRIEF', position: 1, publisher: 'icedcave', verifier: 'Doggie', points: 5000, baseRarity: 100000 },
  { id: '2', name: 'Artemis 13', position: 2, publisher: 'Wulzy', verifier: 'Trick', points: 4900, baseRarity: 98319 },
  { id: '10', name: 'Antarctic Lights', position: 10, publisher: 'Player', verifier: 'Verifier', points: 4500, baseRarity: 85851 },
  { id: '150', name: 'Mainlist Demon', position: 150, publisher: 'Player', verifier: 'Verifier', points: 2000, baseRarity: 8000 },
  { id: '500', name: 'Bloodbath', position: 500, publisher: 'Riot', verifier: 'Riot', points: 1000, baseRarity: 500 },
  { id: '1604', name: 'Acu', position: 1604, publisher: 'Neigendeu', verifier: 'Neigendeu', points: 100, baseRarity: 4 },
  { id: '1609', name: 'rauchkammer', position: 1609, publisher: 'Creator', verifier: 'Creator', points: 10, baseRarity: 2 },
  { id: '1644', name: 'TAURINE', position: 1644, publisher: 'Creator', verifier: 'Creator', points: 0, baseRarity: 1 },
];

test('calculateDemonRarity assigns expected values', () => {
  assert.equal(calculateDemonRarity(1), 100000);
  assert.equal(calculateDemonRarity(1609), 2);
  assert.equal(calculateDemonRarity(1644), 1);
  assert.ok(calculateDemonRarity(10) > 80000);
  assert.ok(calculateDemonRarity(150) >= 1000);
});

test('getDemonTier correctly classifies tiers', () => {
  assert.equal(getDemonTier(1), 'top1');
  assert.equal(getDemonTier(2), 'top10');
  assert.equal(getDemonTier(10), 'top10');
  assert.equal(getDemonTier(11), 'top150');
  assert.equal(getDemonTier(150), 'top150');
  assert.equal(getDemonTier(300), 'extended');
});

test('calculateKeys gives scale appropriate rewards', () => {
  assert.equal(calculateKeys(1, 0), 100000);
  assert.equal(calculateKeys(10, 0), 25000);
  assert.equal(calculateKeys(150, 0), 5000);
  assert.equal(calculateKeys(1609, 0), 1);
  // Level 1 multiplier (1.5x)
  assert.equal(calculateKeys(150, 1), 7500);
});

test('effective luck scales with upgrades and dry streak', () => {
  const upgrades: PlayerUpgrades = {
    luckLevel: 0,
    hasQuickRoll: false,
    hasAutoRoll: false,
    keysMultiplierLevel: 0,
    pityTierLevel: 0,
    streakChargeLevel: 0,
  };

  assert.equal(getEffectiveLuck(upgrades, 0).totalLuck, 1.0);

  upgrades.luckLevel = 9; // 25.0x
  assert.equal(getEffectiveLuck(upgrades, 0).totalLuck, 25.0);
});

test('executeRoll deterministically rolls Grief when seed targets Grief', () => {
  const upgrades: PlayerUpgrades = {
    luckLevel: 0,
    hasQuickRoll: false,
    hasAutoRoll: false,
    keysMultiplierLevel: 0,
    pityTierLevel: 0,
    streakChargeLevel: 0,
  };

  const roll = executeRoll(mockDemons, upgrades, 1, null, 0, 0.000001);
  assert.equal(roll.demon.name, 'GRIEF');
  assert.equal(roll.tier, 'top1');
  assert.equal(roll.isNewPersonalBest, true);
  assert.equal(roll.demon.publisher, 'icedcave');
  assert.equal(roll.demon.verifier, 'Doggie');
});

test('demon levels support level_id, difficulty, verifier, and rating properties', () => {
  const griefLevel: DemonLevel = {
    id: '1',
    name: 'GRIEF',
    position: 1,
    publisher: 'icedcave',
    verifier: 'Doggie',
    points: 5000,
    level_id: 149992717,
    difficulty: 'Extreme Demon',
    rating: 'Mythic',
    gddl_tier: 39,
    edel_enjoyment: 85,
    baseRarity: 100000,
  };

  assert.equal(griefLevel.level_id, 149992717);
  assert.equal(griefLevel.difficulty, 'Extreme Demon');
  assert.equal(griefLevel.rating, 'Mythic');
  assert.equal(griefLevel.publisher, 'icedcave');
  assert.equal(griefLevel.verifier, 'Doggie');
});
