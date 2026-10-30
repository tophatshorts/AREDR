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
  isImpossible?: boolean;
  fps?: number;
  videoUrl?: string;
}

export type DemonTier = 'top1' | 'top10' | 'top150' | 'extended' | 'common' | 'impossible';

export interface PlayerUpgrades {
  luckLevel: number; // 0 to 10
  rebirthCount?: number; // Rebirth level, grants 10x luck per rebirth and resets all upgrades
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
  hasSeenFirstILL?: boolean;
}

export interface PlayerSettings {
  autoRoll: boolean; // Toggled by player if unlocked
  quickRoll: boolean; // Toggled by player if unlocked
  autoRollStopRank: number | null; // Legacy single rank
  autoRollStopRankAredl?: number | null; // Stop if AREDL level rank <= this
  autoRollStopRankIll?: number | null; // Stop if ILL level rank <= this
  soundEnabled: boolean;
  volume?: number; // 0.0 to 1.0 (default 0.8)
  activeLuckLevel?: number | null; // Selected luck level (0 to max unlocked)
  activeSpeedLevel?: number | null; // Selected roll speed level (0 to max unlocked)
  screenShake: boolean;
  cutsceneSkipSettings: {
    aredlTop150: boolean;
    aredlTop10: boolean;
    aredlTop1: boolean;
    illCommon: boolean;
    illTop10: boolean;
    illTop1: boolean;
  };
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
