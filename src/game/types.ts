export interface DemonLevel {
  id: string;
  name: string;
  position: number; // 1 = Grief, 1604 = Acu, 1609 = Rauchkammer, etc.
  publisher: string; // Level creator / publisher
  verifier: string; // Level verifier
  publisher_id?: string;
  points: number;
  level_id?: number | null;
  difficulty?: string; // 'Extreme Demon'
  rating?: 'Mythic' | 'Legendary' | 'Epic' | 'Featured' | 'Rated';
  gddl_tier?: number | null;
  edel_enjoyment?: number | null;
  status?: string; // 'MainList' | 'Extended' | 'Legacy'
  tags?: string[];
  description?: string | null;
  baseRarity: number; // 1 in X
}

export type DemonTier = 'top1' | 'top10' | 'top150' | 'extended' | 'common';

export interface PlayerUpgrades {
  luckLevel: number; // 0 to 9
  hasQuickRoll: boolean; // Buyable upgrade for quick spins
  quickRollSpeedLevel?: number; // 0 to 5 (Upgrades speed of quick rolls)
  hasAutoRoll: boolean; // Buyable upgrade for continuous auto-rolling
  keysMultiplierLevel: number; // 0 to 5
  pityTierLevel: number; // 0 to 4
  streakChargeLevel: number; // 0 to 3
}

export interface RollResult {
  demon: DemonLevel;
  effectiveRarity: number;
  rollNumber: number;
  timestamp: number;
  keysEarned: number;
  isNewPersonalBest: boolean;
  tier: DemonTier;
}

export interface PlayerStats {
  totalRolls: number;
  totalKeysEarned: number;
  currentKeys: number;
  hardestDemon: DemonLevel | null;
  hardestRollNumber: number;
  hardestTimestamp: number | null;
  unlockedDemonIds: string[];
  recentRolls: RollResult[];
  sessionHardest: DemonLevel | null;
  streakWithoutTop150: number;
}

export interface PlayerSettings {
  autoRoll: boolean; // Toggled by player if unlocked
  quickRoll: boolean; // Toggled by player if unlocked
  autoRollStopRank: number | null; // Rank to stop at (e.g. stop if roll <= this rank)
  soundEnabled: boolean;
  screenShake: boolean;
}

export interface PlayerProfile {
  id: string;
  username: string;
  createdAt: number;
  lastActive: number;
  avatarIcon: string;
  upgrades: PlayerUpgrades;
  stats: PlayerStats;
  settings: PlayerSettings;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  demonName: string;
  demonPosition: number;
  rarity: number;
  rollsCount: number;
  timestamp: number;
  dateStr: string;
  monthStr: string;
}
