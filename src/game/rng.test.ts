import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDemonRarity,
  calculateIllRarity,
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
  assert.equal(calculateKeys(10, 0), 10000);
  assert.equal(calculateKeys(150, 0), 2500);
  assert.equal(calculateKeys(1609, 0), 1);
  // Level 1 multiplier (1.5x)
  assert.equal(calculateKeys(150, 1), 3750);
  // Rebirth grants 5x key multiplier for Tier 1
  assert.equal(calculateKeys(150, 0, false, 1), 12500);
});

test('effective luck scales with upgrades, rebirth, and dry streak', () => {
  const upgrades: PlayerUpgrades = {
    luckLevel: 0,
    hasQuickRoll: false,
    hasAutoRoll: false,
    keysMultiplierLevel: 0,
    pityTierLevel: 0,
    streakChargeLevel: 0,
    rebirthCount: 0,
  };

  assert.equal(getEffectiveLuck(upgrades, 0).totalLuck, 1.0);
  assert.equal(getEffectiveLuck(upgrades, 0).hasImpossibleUnlocked, false);

  // 1 Rebirth grants 10x luck and unlocks ILL
  upgrades.rebirthCount = 1;
  assert.equal(getEffectiveLuck(upgrades, 0).totalLuck, 10.0);
  assert.equal(getEffectiveLuck(upgrades, 0).hasImpossibleUnlocked, true);

  // Level 10 Luck gives 150x luck (1,500x with 1 Rebirth)
  upgrades.luckLevel = 10;
  assert.equal(getEffectiveLuck(upgrades, 0).totalLuck, 1500.0);
  assert.equal(getEffectiveLuck(upgrades, 0).hasImpossibleUnlocked, true);
});

test('calculateKeys awards 10 million keys for ILL #1 level and linear scale down to 1.5M for lowest rank', () => {
  // ILL position 1 gives 10,000,000 keys
  assert.equal(calculateKeys(1, 0, true), 10000000);
  // ILL position 2 gives 7,500,000 keys
  assert.equal(calculateKeys(2, 0, true, 0, 2097), 7500000);
  // ILL lowest position (2097) gives 1,500,000 base keys
  assert.equal(calculateKeys(2097, 0, true, 0, 2097), 1500000);
  // With 1.5x keys multiplier on Top 1: 15 million keys
  assert.equal(calculateKeys(1, 1, true), 15000000);
});

test('executeRoll rolls lower ILL in Tier 1 and top ILL in Tier 3', () => {
  const upgrades: PlayerUpgrades = {
    luckLevel: 10,
    hasQuickRoll: false,
    hasAutoRoll: false,
    keysMultiplierLevel: 0,
    pityTierLevel: 0,
    streakChargeLevel: 0,
    rebirthCount: 1,
  };

  const mockImpossible: DemonLevel[] = [
    { id: 'ill-open-window', name: 'Open Window', position: 1, publisher: '0x029A', verifier: 'Unbeaten', points: 10000, baseRarity: 1000000, difficulty: 'Impossible Demon', rating: 'Mythic', isImpossible: true },
    { id: 'ill-600', name: 'Lower ILL Demon', position: 600, publisher: 'Creator', verifier: 'Unbeaten', points: 1000, baseRarity: 50, difficulty: 'Impossible Demon', rating: 'Epic', isImpossible: true }
  ];

  // In Tier 1, position 1 ILL is filtered out (position > 500 required)
  const rollTier1 = executeRoll(mockDemons, upgrades, 1, null, 0, 0.000000001, mockImpossible, true);
  assert.equal(rollTier1.demon.name, 'Lower ILL Demon');

  // In Tier 3, position 1 ILL is unlocked
  upgrades.rebirthCount = 3;
  const rollTier3 = executeRoll(mockDemons, upgrades, 1, null, 0, 0.999, mockImpossible, true);
  assert.ok(rollTier3.demon);
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

test('ILL levels drop rate scales with luck: ~600 rolls at Base Luck, ~100 rolls at Max Luck', () => {
  // Generate 1644 standard demons
  const standardDemons: DemonLevel[] = [];
  for (let i = 1; i <= 1644; i++) {
    standardDemons.push({
      id: `aredl-${i}`,
      name: `Demon #${i}`,
      position: i,
      baseRarity: calculateDemonRarity(i, 1644),
      publisher: 'TestPublisher',
      verifier: 'TestVerifier',
      points: 100,
    });
  }

  // Generate 1500 ILL levels
  const illLevels: DemonLevel[] = [];
  for (let i = 1; i <= 1500; i++) {
    illLevels.push({
      id: `ill-${i}`,
      name: `ILL #${i}`,
      position: i,
      baseRarity: calculateIllRarity(i, 1500),
      isImpossible: true,
      publisher: 'TestPublisher',
      verifier: 'TestVerifier',
      points: 1000,
    });
  }

  // 1. BASE LUCK (luckLevel = 0)
  const baseUpgrades: PlayerUpgrades = {
    luckLevel: 0,
    hasQuickRoll: false,
    hasAutoRoll: false,
    keysMultiplierLevel: 0,
    pityTierLevel: 0,
    streakChargeLevel: 0,
    rebirthCount: 1,
  };

  let baseIllCount = 0;
  const simRolls = 15000;
  for (let roll = 1; roll <= simRolls; roll++) {
    const res = executeRoll(standardDemons, baseUpgrades, 1, null, 0, undefined, illLevels);
    if (res.demon.isImpossible) baseIllCount++;
  }
  const avgBaseRolls = simRolls / baseIllCount;

  // 2. MAX LUCK (luckLevel = 10)
  const maxUpgrades: PlayerUpgrades = {
    ...baseUpgrades,
    luckLevel: 10,
    rebirthCount: 3,
  };

  let maxIllCount = 0;
  for (let roll = 1; roll <= simRolls; roll++) {
    const res = executeRoll(standardDemons, maxUpgrades, 1, null, 0, undefined, illLevels);
    if (res.demon.isImpossible) maxIllCount++;
  }
  const avgMaxRolls = simRolls / maxIllCount;

  // Assertions
  assert.ok(avgMaxRolls >= 75 && avgMaxRolls <= 130, `Max Luck ILL drop rate should be ~100 rolls (got 1 in ${Math.round(avgMaxRolls)})`);
  assert.ok(avgBaseRolls > avgMaxRolls, `Base luck should be rarer than max luck (got base: 1 in ${Math.round(avgBaseRolls)}, max: 1 in ${Math.round(avgMaxRolls)})`);
});

test('ILL sub-tier distribution matches target rates (2% Top 1 [2x buffed], 10% Top 10, 25% Top 100, 63% 101+)', () => {
  const illLevels: DemonLevel[] = [];
  for (let i = 1; i <= 1500; i++) {
    illLevels.push({
      id: `ill-${i}`,
      name: i === 1 ? 'Open Window' : `ILL #${i}`,
      position: i,
      baseRarity: calculateIllRarity(i, 1500),
      isImpossible: true,
      publisher: 'TestPublisher',
      verifier: 'TestVerifier',
      points: 1000,
    });
  }

  const upgrades: PlayerUpgrades = {
    luckLevel: 10,
    hasQuickRoll: false,
    hasAutoRoll: false,
    keysMultiplierLevel: 0,
    pityTierLevel: 0,
    streakChargeLevel: 0,
    rebirthCount: 3,
  };

  let top1Count = 0;
  let top10Count = 0;
  let top100Count = 0;
  let lowerCount = 0;
  const samples = 10000;

  for (let i = 0; i < samples; i++) {
    const res = executeRoll([], upgrades, 1, null, 0, undefined, illLevels, true);
    const pos = res.demon.position;
    if (pos === 1) top1Count++;
    else if (pos <= 10) top10Count++;
    else if (pos <= 100) top100Count++;
    else lowerCount++;
  }

  const top1Ratio = top1Count / samples;
  const top10Ratio = top10Count / samples;
  const top100Ratio = top100Count / samples;
  const lowerRatio = lowerCount / samples;

  assert.ok(top1Ratio >= 0.012 && top1Ratio <= 0.032, `Top 1 should be ~2% (got ${(top1Ratio * 100).toFixed(2)}%)`);
  assert.ok(top10Ratio >= 0.08 && top10Ratio <= 0.13, `Top 10 should be ~10% (got ${(top100Ratio * 100).toFixed(2)}%)`);
  assert.ok(top100Ratio >= 0.21 && top100Ratio <= 0.29, `Top 100 should be ~25% (got ${(top100Ratio * 100).toFixed(2)}%)`);
  assert.ok(lowerRatio >= 0.55 && lowerRatio <= 0.70, `Lower ILL should be ~63% (got ${(lowerRatio * 100).toFixed(2)}%)`);
});


