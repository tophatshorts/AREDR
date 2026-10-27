import { DemonLevel, DemonTier, PlayerUpgrades, RollResult } from './types';

// Rarity calculation: Monotonic mathematical curve from 1 in 100,000 to 1 in 1
export function calculateDemonRarity(position: number, totalDemons: number = 1644): number {
  if (position <= 1) return 100000; // #1 Grief
  if (position <= 2) return 98319;
  if (position <= 3) return 96000;
  if (position <= 10) return Math.round(95000 - (position - 3) * 1500); // Top 10 (~85,000+)
  if (position <= 150) return Math.round(80000 * Math.pow((151 - position) / 140, 1.8) + 1000); // Main List (~1,000 to ~80,000)
  if (position <= 500) return Math.round(1000 * Math.pow((501 - position) / 350, 1.5) + 20); // Extended List (~20 to ~1,000)
  if (position <= 1600) return Math.round(20 * Math.pow((1601 - position) / 1100, 1.2) + 2); // Legacy (~2 to ~20)
  if (position === 1609) return 2; // Rauchkammer baseline 1 in 2
  return 1;
}

export function getDemonTier(position: number): DemonTier {
  if (position <= 1) return 'top1';
  if (position <= 10) return 'top10';
  if (position <= 150) return 'top150';
  if (position <= 500) return 'extended';
  return 'common';
}

// Calculate Demon Keys reward
export function calculateKeys(position: number, keysMultiplierLevel: number): number {
  let baseKeys = 1; // Very common levels (>1600) give minimal keys
  if (position === 1) baseKeys = 100000; // Buffed Top 1 reward
  else if (position <= 10) baseKeys = 25000; // Buffed Top 10 reward
  else if (position <= 150) baseKeys = 5000; // Buffed Main List reward
  else if (position <= 500) baseKeys = 500; // Extended list
  else if (position <= 1000) baseKeys = 50; 
  else if (position <= 1600) baseKeys = 5;

  const mult = KEYS_MULTIPLIER_LEVELS[keysMultiplierLevel]?.mult || 1.0;
  return Math.round(baseKeys * mult);
}

// Luck levels configuration
export const LUCK_LEVELS = [
  { level: 0, mult: 1.0, cost: 0 },
  { level: 1, mult: 1.4, cost: 125 }, // Half of 250
  { level: 2, mult: 2.0, cost: 400 }, // Half of 800
  { level: 3, mult: 3.0, cost: 1500 }, // Half of 3000
  { level: 4, mult: 4.5, cost: 5000 }, // Half of 10000
  { level: 5, mult: 6.5, cost: 20000 }, // Half of 40000
  { level: 6, mult: 9.0, cost: 60000 }, // Half of 120000
  { level: 7, mult: 12.0, cost: 200000 }, // Half of 400000
  { level: 8, mult: 16.0, cost: 600000 }, // Half of 1200000
  { level: 9, mult: 25.0, cost: 2500000 }, // Half of 5000000
];

export const KEYS_MULTIPLIER_LEVELS = [
  { level: 0, mult: 1.0, cost: 0 },
  { level: 1, mult: 1.5, cost: 150 }, // Half of 300
  { level: 2, mult: 2.2, cost: 600 }, // Half of 1200
  { level: 3, mult: 3.5, cost: 2500 }, // Half of 5000
  { level: 4, mult: 5.0, cost: 10000 }, // Half of 20000
  { level: 5, mult: 10.0, cost: 40000 }, // Half of 80000
];

export const QUICK_ROLL_COST = 250; // Half of 500
export const AUTO_ROLL_COST = 500; // Half of 1000

export const PITY_LEVELS = [
  { level: 0, rollsNeeded: 0, guaranteedPos: 1644, label: 'No Pity', cost: 0 },
  { level: 1, rollsNeeded: 60, guaranteedPos: 800, label: 'Gatekeeper I (Top 800)', cost: 500 }, // Half of 1000
  { level: 2, rollsNeeded: 150, guaranteedPos: 300, label: 'Gatekeeper II (Top 300)', cost: 2000 }, // Half of 4000
  { level: 3, rollsNeeded: 300, guaranteedPos: 150, label: 'Main List Seal (Top 150)', cost: 7500 }, // Half of 15000
  { level: 4, rollsNeeded: 800, guaranteedPos: 50, label: 'Legendary Seal (Top 50)', cost: 30000 }, // Half of 60000
];

export const STREAK_LEVELS = [
  { level: 0, bonusPerDryRoll: 0.0, maxSurge: 0.0, label: 'No Surge', cost: 0 },
  { level: 1, bonusPerDryRoll: 0.01, maxSurge: 0.5, label: 'Surge I (+0.5x max)', cost: 1000 }, // Half of 2000
  { level: 2, bonusPerDryRoll: 0.025, maxSurge: 1.5, label: 'Surge II (+1.5x max)', cost: 5000 }, // Half of 10000
  { level: 3, bonusPerDryRoll: 0.05, maxSurge: 4.0, label: 'Surge III (+4.0x max)', cost: 25000 }, // Half of 50000
];

export function getEffectiveLuck(upgrades: PlayerUpgrades, streakCount: number = 0) {
  const baseLuck = LUCK_LEVELS[upgrades.luckLevel]?.mult || 1.0;
  const streakTier = STREAK_LEVELS[upgrades.streakChargeLevel] || STREAK_LEVELS[0];
  const streakLuck = Math.min(streakTier.bonusPerDryRoll * streakCount, streakTier.maxSurge);
  return {
    baseLuck,
    streakLuck,
    totalLuck: baseLuck + streakLuck,
  };
}

/**
 * Execute a weighted roll returning a DemonLevel based on position weights
 */
export function executeRoll(
  allDemons: DemonLevel[],
  upgrades: PlayerUpgrades,
  rollNumber: number,
  currentHardestPos: number | null = null,
  streakCount: number = 0,
  deterministicSeed?: number
): RollResult {
  if (allDemons.length === 0) {
    throw new Error('No demons provided for roll');
  }

  const { totalLuck } = getEffectiveLuck(upgrades, streakCount);

  // Check Pity
  const pityTier = PITY_LEVELS[upgrades.pityTierLevel] || PITY_LEVELS[0];
  let forcedMaxPos = 1644;
  if (pityTier.rollsNeeded > 0 && rollNumber % pityTier.rollsNeeded === 0) {
    forcedMaxPos = pityTier.guaranteedPos;
  }

  // Calculate weighted probabilities for each demon rank
  const weights: number[] = [];
  let totalWeight = 0;

  for (let i = 0; i < allDemons.length; i++) {
    const demon = allDemons[i];
    if (demon.position > forcedMaxPos) {
      weights.push(0);
      continue;
    }

    const baseRarity = demon.baseRarity;
    // Compress the weight gap: rarity^-0.8 makes rare demons more reachable than rarity^-1
    // but still preserves the extreme difference
    let weight = Math.pow(1 / baseRarity, 0.8) * Math.pow(totalLuck, 1.5);

    // Boost top demons slightly when lucky
    if (demon.position <= 10) weight *= (1 + (totalLuck - 1) * 0.3);

    weights.push(weight);
    totalWeight += weight;
  }


  const randomValue = deterministicSeed !== undefined ? deterministicSeed : Math.random();
  let randomTarget = randomValue * totalWeight;

  let selectedIndex = allDemons.length - 1;
  for (let i = 0; i < allDemons.length; i++) {
    randomTarget -= weights[i];
    if (randomTarget <= 0) {
      selectedIndex = i;
      break;
    }
  }

  const selectedDemon = allDemons[selectedIndex];
  const effectiveRarity = Math.max(1, Math.round(selectedDemon.baseRarity / totalLuck));
  const keysEarned = calculateKeys(selectedDemon.position, upgrades.keysMultiplierLevel);
  const isNewPersonalBest =
    currentHardestPos === null || selectedDemon.position < currentHardestPos;
  const tier = getDemonTier(selectedDemon.position);

  return {
    demon: selectedDemon,
    effectiveRarity,
    rollNumber,
    timestamp: Date.now(),
    keysEarned,
    isNewPersonalBest,
    tier,
  };
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}
