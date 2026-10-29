import React from 'react';
import { PlayerUpgrades, PlayerStats } from '../game/types';
import {
  LUCK_LEVELS,
  KEYS_MULTIPLIER_LEVELS,
  PITY_LEVELS,
  STREAK_LEVELS,
  QUICK_ROLL_SPEED_LEVELS,
  QUICK_ROLL_COST,
  AUTO_ROLL_COST,
  REBIRTH_TIERS,
  getUpgradeCostMultiplier,
  formatNumber
} from '../game/rng';
import { sound } from '../game/sound';
import { X, Sparkles, Zap, ShieldAlert, Flame, Check, Key, Gauge, RotateCcw, Crown } from 'lucide-react';

interface Props {
  upgrades: PlayerUpgrades;
  stats: PlayerStats;
  onUpgradeLuck: (cost: number) => void;
  onUpgradeKeysMult: (cost: number) => void;
  onUpgradePity: (cost: number) => void;
  onUpgradeStreak: (cost: number) => void;
  onBuyQuickRoll: (cost: number) => void;
  onUpgradeQuickRollSpeed?: (cost: number) => void;
  onBuyAutoRoll: (cost: number) => void;
  onRebirth: () => void;
  onClose: () => void;
}

export const UpgradesModal: React.FC<Props> = ({
  upgrades,
  stats,
  onUpgradeLuck,
  onUpgradeKeysMult,
  onUpgradePity,
  onUpgradeStreak,
  onBuyQuickRoll,
  onUpgradeQuickRollSpeed,
  onBuyAutoRoll,
  onRebirth,
  onClose,
}) => {
  const currentKeys = stats.currentKeys;
  const rebirthCount = upgrades.rebirthCount || 0;
  const costMult = getUpgradeCostMultiplier(rebirthCount);

  // Rebirth Tiers
  const currentRebirthTier = REBIRTH_TIERS[Math.min(3, rebirthCount)] || REBIRTH_TIERS[0];
  const nextRebirthTier = REBIRTH_TIERS[rebirthCount + 1];

  // Next levels (with cost scaling)
  const nextLuck = LUCK_LEVELS[upgrades.luckLevel + 1];
  const currentLuck = LUCK_LEVELS[upgrades.luckLevel];

  const nextKeys = KEYS_MULTIPLIER_LEVELS[upgrades.keysMultiplierLevel + 1];
  const currentKeysMult = KEYS_MULTIPLIER_LEVELS[upgrades.keysMultiplierLevel];

  const nextPity = PITY_LEVELS[upgrades.pityTierLevel + 1];
  const currentPity = PITY_LEVELS[upgrades.pityTierLevel];

  const nextStreak = STREAK_LEVELS[upgrades.streakChargeLevel + 1];
  const currentStreak = STREAK_LEVELS[upgrades.streakChargeLevel];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-950/95 border border-white/10 p-6 sm:p-7 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <img
                src="./assets/aistudio/IMG_7942_07b1ead5.png"
                alt="Demon Key"
                className="w-6 h-6 object-contain drop-shadow"
              />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-tight">Demon Upgrades Vault</h2>
              <p className="text-xs text-zinc-400 font-sans">Spend Demon Keys to boost luck, unlock speed & automation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/50 border border-cyan-400/40 text-cyan-300 font-mono font-bold text-xs shadow-sm">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>{formatNumber(currentKeys)} Keys</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upgrade Cards List */}
        <div className="mt-5 space-y-3">
          {/* SUPREME UPGRADE: REBIRTH (3 TIERS MAX) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/50 via-zinc-900/80 to-amber-950/40 border-2 border-purple-500/40 hover:border-purple-400/60 transition-all duration-200 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)] shrink-0">
                  <RotateCcw className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-black text-base text-white tracking-wide uppercase flex items-center gap-2">
                      <span>Rebirth</span>
                      <Crown className="w-4 h-4 text-amber-400 inline" />
                    </h3>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/30">
                      Tier {rebirthCount}/3
                    </span>
                    {rebirthCount > 0 && (
                      <>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                          {currentRebirthTier.luckMult}x Permanent Luck
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                          ILL Unlocked
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 font-sans">
                    {nextRebirthTier ? (
                      <>
                        Rebirth Tier {nextRebirthTier.level}: Resets upgrades, grants <strong className="text-purple-300">{nextRebirthTier.luckMult}x Luck</strong>, <strong className="text-emerald-300">5x Demon Key Boost</strong>, 2,500 starting keys, and{' '}
                        {nextRebirthTier.level === 1 ? (
                          <strong className="text-amber-300">Unlocks Lower ILL Levels (Ranks 501+)</strong>
                        ) : nextRebirthTier.level === 2 ? (
                          <strong className="text-amber-300">Unlocks Extended ILL Levels (Ranks 51+)</strong>
                        ) : (
                          <strong className="text-amber-300">Unlocks Top 50 & Top 1 ILL Levels (All Ranks)</strong>
                        )}!
                      </>
                    ) : (
                      <>
                        Max Rebirth Tier Reached! You possess <strong className="text-purple-300">50x Luck</strong>, <strong className="text-emerald-300">5x Demon Key Boost</strong>, and <strong className="text-amber-300">All ILL Levels Unlocked (Top 1 "Open Window")</strong>.
                      </>
                    )}
                  </p>
                  <div className="mt-2 text-xs font-mono text-zinc-400 flex flex-wrap items-center gap-3">
                    <span>Rebirth Scale: <span className="text-purple-300 font-bold">Standard Upgrade Costs x{costMult}</span></span>
                    <span>Starting Keys: <span className="text-amber-300 font-bold">2,500 Keys</span></span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-end gap-2 shrink-0">
                {nextRebirthTier ? (
                  <button
                    onClick={() => {
                      if (currentKeys >= nextRebirthTier.cost) {
                        sound.playRareChime();
                        onRebirth();
                      }
                    }}
                    disabled={currentKeys < nextRebirthTier.cost}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wider transition-all uppercase ${
                      currentKeys >= nextRebirthTier.cost
                        ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] transform hover:scale-105 active:scale-95'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    Rebirth T{nextRebirthTier.level} ({formatNumber(nextRebirthTier.cost)})
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 font-mono">
                    <Check className="w-4 h-4" /> MAX REBIRTH
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* UPGRADE 1: DEMON LUCK */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-sm text-white">Demon Luck Multiplier</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 font-mono border border-emerald-500/30">
                      Lvl {upgrades.luckLevel}/{LUCK_LEVELS.length - 1}
                    </span>
                    {costMult > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        Cost x{costMult}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">
                    Multiplies probability of pulling top-ranked extreme demons and impossible levels.
                  </p>
                  <div className="mt-2 text-xs font-mono text-zinc-300">
                    Current: <span className="text-emerald-400 font-bold">{currentLuck.mult.toFixed(1)}x Luck</span>
                    {rebirthCount > 0 ? (
                      <span className="text-purple-300 font-bold"> ({(currentLuck.mult * currentRebirthTier.luckMult).toFixed(0)}x total)</span>
                    ) : null}
                    {nextLuck && (
                      <>
                        {' '}→ Next: <span className="text-cyan-300 font-bold">{nextLuck.mult.toFixed(1)}x Luck</span>
                        {rebirthCount > 0 ? (
                          <span className="text-amber-300 font-bold"> ({(nextLuck.mult * currentRebirthTier.luckMult).toFixed(0)}x total)</span>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {nextLuck ? (
                <button
                  onClick={() => {
                    const scaledCost = nextLuck.cost * costMult;
                    if (currentKeys >= scaledCost) {
                      sound.playRareChime();
                      onUpgradeLuck(scaledCost);
                    }
                  }}
                  disabled={currentKeys < nextLuck.cost * costMult}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition-all shrink-0 ${
                    currentKeys >= nextLuck.cost * costMult
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {formatNumber(nextLuck.cost * costMult)} Keys
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <Check className="w-3.5 h-3.5" /> MAX
                </span>
              )}
            </div>
          </div>

          {/* UPGRADE 2: QUICK ROLL MODE */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-sky-500/20 hover:border-sky-500/40 transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">Quick Roll Mode</h3>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">
                    Unlocks rapid spin mode (bypasses normal 3.2s CS2 roulette).
                  </p>
                  <div className="mt-2 text-xs font-mono text-sky-400 font-bold">
                    {upgrades.hasQuickRoll ? 'Unlocked' : 'Locked'}
                  </div>
                </div>
              </div>

              {!upgrades.hasQuickRoll ? (
                <button
                  onClick={() => {
                    const scaledCost = QUICK_ROLL_COST * costMult;
                    if (currentKeys >= scaledCost) {
                      sound.playRareChime();
                      onBuyQuickRoll(scaledCost);
                    }
                  }}
                  disabled={currentKeys < QUICK_ROLL_COST * costMult}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition-all shrink-0 ${
                    currentKeys >= QUICK_ROLL_COST * costMult
                      ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.35)]'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {formatNumber(QUICK_ROLL_COST * costMult)} Keys
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-sky-400 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30">
                  <Check className="w-3.5 h-3.5" /> UNLOCKED
                </span>
              )}
            </div>
          </div>

          {/* UPGRADE 2B: QUICK ROLL SPEED / VELOCITY */}
          {upgrades.hasQuickRoll && (
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-sm text-white">Quick Roll Velocity</h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 font-mono border border-amber-500/30">
                        Lvl {upgrades.quickRollSpeedLevel || 0}/{QUICK_ROLL_SPEED_LEVELS.length - 1}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 font-sans">
                      Increases rotation speed and reduces delay for Quick & Auto Rolls.
                    </p>
                    <div className="mt-2 text-xs font-mono text-zinc-300">
                      Current: <span className="text-amber-400 font-bold">{QUICK_ROLL_SPEED_LEVELS[upgrades.quickRollSpeedLevel || 0]?.label}</span>
                      {QUICK_ROLL_SPEED_LEVELS[(upgrades.quickRollSpeedLevel || 0) + 1] && (
                        <>
                          {' '}→ Next: <span className="text-cyan-300 font-bold">{QUICK_ROLL_SPEED_LEVELS[(upgrades.quickRollSpeedLevel || 0) + 1].label}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {QUICK_ROLL_SPEED_LEVELS[(upgrades.quickRollSpeedLevel || 0) + 1] ? (
                  <button
                    onClick={() => {
                      const nextCost = QUICK_ROLL_SPEED_LEVELS[(upgrades.quickRollSpeedLevel || 0) + 1].cost * costMult;
                      if (currentKeys >= nextCost && onUpgradeQuickRollSpeed) {
                        sound.playRareChime();
                        onUpgradeQuickRollSpeed(nextCost);
                      }
                    }}
                    disabled={currentKeys < QUICK_ROLL_SPEED_LEVELS[(upgrades.quickRollSpeedLevel || 0) + 1].cost * costMult}
                    className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition-all shrink-0 ${
                      currentKeys >= QUICK_ROLL_SPEED_LEVELS[(upgrades.quickRollSpeedLevel || 0) + 1].cost * costMult
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    {formatNumber(QUICK_ROLL_SPEED_LEVELS[(upgrades.quickRollSpeedLevel || 0) + 1].cost * costMult)} Keys
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <Check className="w-3.5 h-3.5" /> MAX
                  </span>
                )}
              </div>
            </div>
          )}

          {/* UPGRADE 3: AUTO ROLL */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">Auto-Roll Core</h3>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">
                    Unlocks continuous automated rolling with customizable rank stops.
                  </p>
                  <div className="mt-2 text-xs font-mono text-fuchsia-400 font-bold">
                    {upgrades.hasAutoRoll ? 'Unlocked' : 'Locked'}
                  </div>
                </div>
              </div>

              {!upgrades.hasAutoRoll ? (
                <button
                  onClick={() => {
                    const scaledCost = AUTO_ROLL_COST * costMult;
                    if (currentKeys >= scaledCost) {
                      sound.playRareChime();
                      onBuyAutoRoll(scaledCost);
                    }
                  }}
                  disabled={currentKeys < AUTO_ROLL_COST * costMult}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition-all shrink-0 ${
                    currentKeys >= AUTO_ROLL_COST * costMult
                      ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.35)]'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {formatNumber(AUTO_ROLL_COST * costMult)} Keys
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-fuchsia-400 px-3 py-1.5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30">
                  <Check className="w-3.5 h-3.5" /> UNLOCKED
                </span>
              )}
            </div>
          </div>

          {/* UPGRADE 4: KEY EXTRACTOR */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-sm text-white">Demon Key Extractor</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 font-mono border border-cyan-500/30">
                      Lvl {upgrades.keysMultiplierLevel}/{KEYS_MULTIPLIER_LEVELS.length - 1}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">
                    Multiplies Demon Keys harvested whenever you roll an extreme demon.
                  </p>
                  <div className="mt-2 text-xs font-mono text-zinc-300">
                    Current: <span className="text-cyan-400 font-bold">{currentKeysMult.mult.toFixed(1)}x</span>
                    {nextKeys && (
                      <>
                        {' '}→ Next: <span className="text-emerald-400 font-bold">{nextKeys.mult.toFixed(1)}x</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {nextKeys ? (
                <button
                  onClick={() => {
                    const scaledCost = nextKeys.cost * costMult;
                    if (currentKeys >= scaledCost) {
                      sound.playRareChime();
                      onUpgradeKeysMult(scaledCost);
                    }
                  }}
                  disabled={currentKeys < nextKeys.cost * costMult}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition-all shrink-0 ${
                    currentKeys >= nextKeys.cost * costMult
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {formatNumber(nextKeys.cost * costMult)} Keys
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-cyan-400 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <Check className="w-3.5 h-3.5" /> MAX
                </span>
              )}
            </div>
          </div>

          {/* UPGRADE 5: PITY SEAL */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-sm text-white">Demon Gate Pity Seal</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 font-mono border border-indigo-500/30">
                      Lvl {upgrades.pityTierLevel}/{PITY_LEVELS.length - 1}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">
                    Guarantees minimum tier demon pulls every set threshold of rolls.
                  </p>
                  <div className="mt-2 text-xs font-mono text-zinc-300">
                    Current: <span className="text-indigo-400 font-bold">{currentPity.label}</span>
                    {nextPity && (
                      <>
                        {' '}→ Next: <span className="text-cyan-300 font-bold">{nextPity.label}</span>
                        {nextPity.isIll && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 inline-flex items-center gap-1">
                            <span>⚡ ILL PITY</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {nextPity ? (
                (() => {
                  const isIllLocked = nextPity.isIll && rebirthCount === 0;
                  const scaledCost = nextPity.cost * costMult;
                  const canAfford = currentKeys >= scaledCost;
                  
                  if (isIllLocked) {
                    return (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">Requires Rebirth</span>
                        <div className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-500 border border-white/5 flex items-center gap-1.5 opacity-60">
                          <RotateCcw className="w-3 h-3" />
                          <span className="text-[10px] font-mono font-bold">LOCKED</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      onClick={() => {
                        if (canAfford) {
                          sound.playRareChime();
                          onUpgradePity(scaledCost);
                        }
                      }}
                      disabled={!canAfford}
                      className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition-all shrink-0 ${
                        canAfford
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.35)]'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {formatNumber(scaledCost)} Keys
                    </button>
                  );
                })()
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-indigo-400 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                  <Check className="w-3.5 h-3.5" /> MAX
                </span>
              )}
            </div>
          </div>

          {/* UPGRADE 6: SURGE REACTOR */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-rose-500/20 hover:border-rose-500/40 transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-sm text-white">Surge Reactor (Dry Streak)</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-300 font-mono border border-rose-500/30">
                      Lvl {upgrades.streakChargeLevel}/{STREAK_LEVELS.length - 1}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">
                    Adds stacking bonus luck for every consecutive roll without a Main List demon.
                  </p>
                  <div className="mt-2 text-xs font-mono text-zinc-300">
                    Current: <span className="text-rose-400 font-bold">{currentStreak.label}</span>
                    {nextStreak && (
                      <>
                        {' '}→ Next: <span className="text-amber-300 font-bold">{nextStreak.label}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {nextStreak ? (
                <button
                  onClick={() => {
                    const scaledCost = nextStreak.cost * costMult;
                    if (currentKeys >= scaledCost) {
                      sound.playRareChime();
                      onUpgradeStreak(scaledCost);
                    }
                  }}
                  disabled={currentKeys < nextStreak.cost * costMult}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition-all shrink-0 ${
                    currentKeys >= nextStreak.cost * costMult
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {formatNumber(nextStreak.cost * costMult)} Keys
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-rose-400 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <Check className="w-3.5 h-3.5" /> MAX
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
