import { DemonLevel, DemonTier, PlayerUpgrades, RollResult } from './types';

export const ILL_LEADERBOARD_OFFSET = -10000;

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

export const REBIRTH_TIERS = [
  { level: 0, cost: 0, luckMult: 1.0, unlocksIll: false, label: 'No Rebirth' },
  { level: 1, cost: 1000000, luckMult: 10.0, unlocksIll: true, label: 'Rebirth Tier 1' },
  { level: 2, cost: 10000000, luckMult: 25.0, unlocksIll: true, label: 'Rebirth Tier 2' },
  { level: 3, cost: 100000000, luckMult: 50.0, unlocksIll: true, label: 'Rebirth Tier 3 (MAX)' },
];

export function getUpgradeCostMultiplier(rebirthCount: number = 0): number {
  return Math.pow(3, Math.min(3, rebirthCount || 0));
}

export const REBIRTH_COST = 1000000; // 1m keys base for Tier 1

export function getDemonTier(position: number, isImpossible?: boolean): DemonTier {
  if (isImpossible) return 'impossible';
  if (position <= 1) return 'top1';
  if (position <= 10) return 'top10';
  if (position <= 150) return 'top150';
  if (position <= 500) return 'extended';
  return 'common';
}

// Calculate Demon Keys reward
export function calculateKeys(
  position: number,
  keysMultiplierLevel: number,
  isImpossible: boolean = false,
  rebirthCount: number = 0,
  totalIllLevels: number = 2097
): number {
  let baseKeys = 1; // Base keys reward
  if (isImpossible) {
    if (position <= 1) {
      baseKeys = 10000000; // Top 1 ILL gives exactly 10 million keys!
    } else {
      // Linear scale from Top 2 (7.5M keys) down to lowest ILL rank (1.5M keys)
      const maxKeys = 7500000; // Top 2 ILL
      const minKeys = 1500000; // Lowest ILL level
      const total = Math.max(2, totalIllLevels || 2097);
      const fraction = (position - 2) / Math.max(1, total - 2);
      baseKeys = Math.round(maxKeys - Math.min(1, Math.max(0, fraction)) * (maxKeys - minKeys));
    }
  } else {
    if (position === 1) baseKeys = 100000; // Top 1 AREDL (Grief)
    else if (position <= 10) baseKeys = 10000; // Top 10 AREDL
    else if (position <= 150) baseKeys = 2500; // Main List
    else if (position <= 500) baseKeys = 250; // Extended List
    else if (position <= 1000) baseKeys = 25; // Legacy
    else if (position <= 1600) baseKeys = 5;
    else baseKeys = 1;
  }

  const mult = KEYS_MULTIPLIER_LEVELS[keysMultiplierLevel]?.mult || 1.0;
  let finalKeys = Math.round(baseKeys * mult);

  // Rebirth Bonus: 5x Demon Key boost
  if (rebirthCount > 0) {
    finalKeys *= 5;
  }

  return finalKeys;
}

// Luck levels configuration (10th luck upgrade costs 10M keys)
export const LUCK_LEVELS = [
  { level: 0, mult: 1.0, cost: 0, label: 'Base Luck (1x)' },
  { level: 1, mult: 1.4, cost: 125, label: 'Luck I (1.4x)' },
  { level: 2, mult: 2.0, cost: 400, label: 'Luck II (2.0x)' },
  { level: 3, mult: 3.0, cost: 1500, label: 'Luck III (3.0x)' },
  { level: 4, mult: 4.5, cost: 5000, label: 'Luck IV (4.5x)' },
  { level: 5, mult: 6.5, cost: 20000, label: 'Luck V (6.5x)' },
  { level: 6, mult: 9.0, cost: 60000, label: 'Luck VI (9.0x)' },
  { level: 7, mult: 18.0, cost: 180000, label: 'Luck VII (18.0x)' },
  { level: 8, mult: 36.0, cost: 500000, label: 'Luck VIII (36.0x)' },
  { level: 9, mult: 75.0, cost: 1500000, label: 'Luck IX (75.0x)' },
  { level: 10, mult: 150.0, cost: 10000000, label: 'Supreme Luck X (150x)' },
];

export const KEYS_MULTIPLIER_LEVELS = [
  { level: 0, mult: 1.0, cost: 0 },
  { level: 1, mult: 1.5, cost: 150 },
  { level: 2, mult: 2.0, cost: 600 },
  { level: 3, mult: 3.0, cost: 25000 },
  { level: 4, mult: 4.0, cost: 125000 },
  { level: 5, mult: 5.0, cost: 750000 },
];

export const QUICK_ROLL_COST = 250;
export const AUTO_ROLL_COST = 500;

export const QUICK_ROLL_SPEED_LEVELS = [
  { level: 0, durationMs: 700, autoDelayMs: 650, label: 'Base Speed (0.70s)', cost: 0 },
  { level: 1, durationMs: 550, autoDelayMs: 500, label: 'Velocity I (0.55s)', cost: 300 },
  { level: 2, durationMs: 420, autoDelayMs: 380, label: 'Velocity II (0.42s)', cost: 1200 },
  { level: 3, durationMs: 320, autoDelayMs: 280, label: 'Velocity III (0.32s)', cost: 4000 },
  { level: 4, durationMs: 240, autoDelayMs: 200, label: 'Overclocked (0.24s)', cost: 15000 },
  { level: 5, durationMs: 180, autoDelayMs: 140, label: 'Hyperspeed (0.18s)', cost: 50000 },
];

export const PITY_LEVELS: {
  level: number;
  rollsNeeded: number;
  guaranteedPos: number;
  label: string;
  cost: number;
  isIll?: boolean;
  illMaxPos?: number;
}[] = [
  { level: 0, rollsNeeded: 0, guaranteedPos: 1644, label: 'No Pity', cost: 0 },
  { level: 1, rollsNeeded: 60, guaranteedPos: 800, label: 'Gatekeeper I (Top 800)', cost: 500 },
  { level: 2, rollsNeeded: 150, guaranteedPos: 300, label: 'Gatekeeper II (Top 300)', cost: 2000 },
  { level: 3, rollsNeeded: 300, guaranteedPos: 150, label: 'Main List Seal (Top 150)', cost: 7500 },
  { level: 4, rollsNeeded: 800, guaranteedPos: 50, label: 'Legendary Seal (Top 50)', cost: 30000 },
  // High tier ILL Pity levels (rollsNeeded: 1000, 1500, 2500)
  { level: 5, rollsNeeded: 1000, guaranteedPos: 10000, isIll: true, illMaxPos: 2500, label: 'ILL Level', cost: 1000000 },
  { level: 6, rollsNeeded: 1500, guaranteedPos: 10000, isIll: true, illMaxPos: 1000, label: 'Top 1,000 ILL', cost: 3000000 },
  { level: 7, rollsNeeded: 2500, guaranteedPos: 10000, isIll: true, illMaxPos: 100, label: 'Top 100 ILL', cost: 7500000 },
];

export const STREAK_LEVELS = [
  { level: 0, bonusPerDryRoll: 0.0, maxSurge: 0.0, label: 'No Surge', cost: 0 },
  { level: 1, bonusPerDryRoll: 0.01, maxSurge: 0.5, label: 'Surge I (+0.5x)', cost: 1000 },
  { level: 2, bonusPerDryRoll: 0.02, maxSurge: 2.0, label: 'Surge II (+2x)', cost: 5000 },
  { level: 3, bonusPerDryRoll: 0.04, maxSurge: 5.0, label: 'Surge III (+5x)', cost: 25000 },
  { level: 4, bonusPerDryRoll: 0.06, maxSurge: 8.5, label: 'Surge IV (+8.5x)', cost: 100000 },
  { level: 5, bonusPerDryRoll: 0.08, maxSurge: 12.0, label: 'Surge V (+12x)', cost: 400000 },
  { level: 6, bonusPerDryRoll: 0.1, maxSurge: 15.0, label: 'Surge VI (+15x)', cost: 1500000 },
];

export function getEffectiveLuck(upgrades: PlayerUpgrades, streakCount: number = 0) {
  const luckTier = LUCK_LEVELS[upgrades.luckLevel] || LUCK_LEVELS[0];
  const baseLuck = luckTier.mult;
  const currentRebirthTier = REBIRTH_TIERS[Math.min(3, upgrades.rebirthCount || 0)] || REBIRTH_TIERS[0];
  const rebirthMult = currentRebirthTier.luckMult;
  const streakTier = STREAK_LEVELS[upgrades.streakChargeLevel] || STREAK_LEVELS[0];
  const streakLuck = Math.min(streakTier.bonusPerDryRoll * streakCount, streakTier.maxSurge);

  // Total luck combines base luck multiplied by rebirth, plus streak surge
  const totalLuck = (baseLuck * rebirthMult) + streakLuck;
  return {
    baseLuck,
    rebirthMult,
    streakLuck,
    totalLuck,
    hasImpossibleUnlocked: Boolean(upgrades.rebirthCount && upgrades.rebirthCount >= 1),
  };
}

// Rarity calculation for Impossible Levels
export function calculateIllRarity(position: number, total: number = 2097): number {
  if (position <= 1) return 1000000; // Top 1 Open Window (1 in 1,000,000)
  if (position <= 10) return Math.round(950000 - (position - 2) * 50000); // Top 10 ILL (500k to 950k)
  if (position <= 50) return Math.round(500000 - (position - 10) * 10000); // Top 50 ILL (100k to 500k)
  if (position <= 150) return Math.round(100000 - (position - 50) * 800); // Top 150 ILL (20k to 100k)
  if (position <= 500) return Math.round(20000 - (position - 150) * 50); // Top 500 ILL (2.5k to 20k)
  if (position <= 1000) return Math.round(2500 - (position - 500) * 3); // Top 1,000 ILL (1k to 2.5k)
  return Math.max(10, Math.round(1000 - ((position - 1000) / (total - 1000)) * 980)); // Lower ILL (10 to 1,000)
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
  deterministicSeed?: number,
  impossibleLevels: DemonLevel[] = [],
  testIllOnly: boolean = false
): RollResult {
  if (allDemons.length === 0 && impossibleLevels.length === 0) {
    throw new Error('No demons provided for roll');
  }

  const { totalLuck, hasImpossibleUnlocked } = getEffectiveLuck(upgrades, streakCount);

  // Filter ILL level pool based on Rebirth Tier progression
  let allowedIllLevels: DemonLevel[] = [];
  if (impossibleLevels.length > 0) {
    const formattedIll = impossibleLevels.map((d) => ({
      ...d,
      baseRarity: calculateIllRarity(d.position, impossibleLevels.length),
    }));

    const rebirth = upgrades.rebirthCount || 0;
    if (rebirth === 1) {
      // Rebirth Tier 1: Unlocks lower ILL levels (ranks > 500)
      allowedIllLevels = formattedIll.filter((d) => d.position > 500);
    } else if (rebirth === 2) {
      // Rebirth Tier 2: Unlocks extended & main list ILL levels (ranks > 50)
      allowedIllLevels = formattedIll.filter((d) => d.position > 50);
    } else if (rebirth >= 3 || testIllOnly) {
      // Rebirth Tier 3 or Admin Test: Unlocks top 50, top 10, and top 1 ILL levels
      allowedIllLevels = formattedIll;
    }
  }

  // Build active roll pool
  let pool: DemonLevel[];
  if (testIllOnly && allowedIllLevels.length > 0) {
    pool = allowedIllLevels;
  } else if (hasImpossibleUnlocked && allowedIllLevels.length > 0) {
    pool = [...allDemons, ...allowedIllLevels];
  } else {
    pool = allDemons;
  }

  // Check Pity
  const pityTier = PITY_LEVELS[upgrades.pityTierLevel] || PITY_LEVELS[0];
  const isPityTriggered = pityTier.rollsNeeded > 0 && rollNumber % pityTier.rollsNeeded === 0;

  // Calculate weighted probabilities for each demon rank
  const weights: number[] = [];
  let totalWeight = 0;

  for (let i = 0; i < pool.length; i++) {
    const demon = pool[i];

    // Check Pity constraints
    if (isPityTriggered) {
      if (pityTier.isIll) {
        if (!demon.isImpossible || demon.position > (pityTier.illMaxPos || 1000)) {
          weights.push(0);
          continue;
        }
      } else {
        if (demon.isImpossible || demon.position > pityTier.guaranteedPos) {
          weights.push(0);
          continue;
        }
      }
    }

    const baseRarity = demon.baseRarity;
    // Compress the weight gap: rarity^-0.8 makes rare demons reachable with luck upgrades
    let weight = Math.pow(1 / baseRarity, 0.8) * Math.pow(totalLuck, 1.5);

    // Boost top standard AREDL demons slightly when lucky (do NOT apply to top ILL levels)
    if (!demon.isImpossible && demon.position <= 10) weight *= (1 + (totalLuck - 1) * 0.3);

    weights.push(weight);
    totalWeight += weight;
  }

  // Fallback in case of all-0 weights (e.g. edge pity filtering)
  if (totalWeight <= 0) {
    for (let i = 0; i < pool.length; i++) {
      weights[i] = 1;
      totalWeight += 1;
    }
  }

  const randomValue = deterministicSeed !== undefined ? deterministicSeed : Math.random();
  let randomTarget = randomValue * totalWeight;

  let selectedIndex = pool.length - 1;
  for (let i = 0; i < pool.length; i++) {
    randomTarget -= weights[i];
    if (randomTarget <= 0) {
      selectedIndex = i;
      break;
    }
  }

  const selectedDemon = pool[selectedIndex];
  const effectiveRarity = Math.max(1, Math.round(selectedDemon.baseRarity / totalLuck));
  const keysEarned = calculateKeys(
    selectedDemon.position,
    upgrades.keysMultiplierLevel,
    selectedDemon.isImpossible,
    upgrades.rebirthCount || 0
  );
  
  // A demon is a personal best if its base rarity exceeds the current hardest demon's rarity
  const currentHardestDemon = currentHardestPos !== null ? allDemons.find(d => d.position === currentHardestPos) : null;
  const isNewPersonalBest =
    currentHardestDemon === null ||
    selectedDemon.baseRarity > (currentHardestDemon?.baseRarity || 0);

  const tier = getDemonTier(selectedDemon.position, selectedDemon.isImpossible);

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
