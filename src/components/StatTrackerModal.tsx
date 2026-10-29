import React, { useState } from 'react';
import { PlayerStats, DemonLevel } from '../game/types';
import { DemonDifficultyIcon } from './DemonDifficultyIcon';
import { RatingBadge } from './RatingBadge';
import { DemonThumbnail } from './DemonThumbnail';
import { ILL_LEADERBOARD_OFFSET, formatNumber, calculateDemonRarity, calculateIllRarity } from '../game/rng';
import { X, Trophy, Search, Flame, BarChart2, BookOpen, Clock, Calendar, CheckCircle, Key } from 'lucide-react';

interface Props {
  stats: PlayerStats;
  allDemons: DemonLevel[];
  impossibleLevels?: DemonLevel[];
  dailyHardest: { username: string; demonName: string; demonPosition: number } | null;
  onClose: () => void;
  onReplayCutscene?: (demon: DemonLevel) => void;
}

export const StatTrackerModal: React.FC<Props> = ({
  stats,
  allDemons,
  impossibleLevels = [],
  dailyHardest,
  onClose,
  onReplayCutscene,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'codex' | 'history'>('overview');
  const [codexListType, setCodexListType] = useState<'aredl' | 'ill'>('aredl');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'unlocked' | 'top150' | 'top10'>('all');

  const unlockedSet = new Set(stats.unlockedDemonIds);
  const hardest = stats.hardestDemon;

  // Active target pool for codex
  const activePool = codexListType === 'ill' ? impossibleLevels : allDemons;

  // Filter demons for the codex
  const filteredDemons = activePool.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.verifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(d.position).includes(searchQuery) ||
      (d.tags && d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    if (filterTier === 'unlocked') return unlockedSet.has(d.id);
    if (filterTier === 'top10') return d.position <= 10;
    if (filterTier === 'top150') return d.position <= 150;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-3xl bg-zinc-950/95 border border-white/10 p-6 sm:p-7 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-400/30 flex items-center justify-center text-violet-400 shadow-sm">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-tight">Extreme Demon Codex & Stats</h2>
              <p className="text-xs text-zinc-400 font-sans">Monitor personal hardest, demon collection & daily records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons (Color-Coded & Distinct) */}
        <div className="flex items-center gap-2 mt-4 border-b border-white/[0.08] pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all ${
              activeTab === 'overview'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Overview & Hardest</span>
          </button>
          <button
            onClick={() => setActiveTab('codex')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all ${
              activeTab === 'codex'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Demon Codex ({stats.unlockedDemonIds.length}/{allDemons.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all ${
              activeTab === 'history'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.2)]'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            <span>Roll History ({stats.recentRolls.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* HARDEST DEMON HERO CARD */}
              <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900/80 border border-white/10 shadow-lg">
                {hardest && hardest.level_id && (
                  <div className="mb-4 w-full h-44 rounded-xl overflow-hidden border border-white/10 shadow-md relative">
                    <DemonThumbnail
                      levelId={hardest.level_id}
                      demonName={hardest.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  </div>
                )}
                <div className="flex flex-col md:flex-row items-center gap-5">
                  {hardest ? (
                    <DemonDifficultyIcon position={hardest.position} isImpossible={hardest.isImpossible} size="xl" showLabel />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-600">
                      <Trophy className="w-8 h-8" />
                    </div>
                  )}

                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-mono uppercase tracking-widest text-amber-400">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>Personal All-Time Hardest</span>
                    </div>

                    {hardest ? (
                      <>
                        <h3 className="font-display text-2xl md:text-3xl font-black text-white mt-1">
                          #{hardest.position} {hardest.name}
                        </h3>
                        <p className="text-xs text-zinc-300 mt-0.5">
                          By <span className="text-white font-semibold">{hardest.publisher}</span> • Verified by <span className="text-amber-300 font-semibold">{hardest.verifier}</span>
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                          {hardest.points} AREDL Points • Base Rarity: 1 in {(hardest.isImpossible ? calculateIllRarity(hardest.position) : calculateDemonRarity(hardest.position)).toLocaleString()}
                        </p>
                        {hardest.tags && hardest.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {hardest.tags.map(t => (
                              <span key={t} className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] text-zinc-400 border border-white/5">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="font-display text-xl font-bold text-white mt-1">No Demons Rolled Yet</h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          Roll to discover extreme demons and claim your hardest completion.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* DAILY HARDEST COMPARISON CARD */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-zinc-100">Today&apos;s Global Hardest</h4>
                    <p className="text-xs text-zinc-400 font-sans">Hardest demon rolled worldwide in the last 24 hours</p>
                  </div>
                </div>
                {dailyHardest ? (
                  <div className="text-center md:text-right font-mono">
                    <div className="text-sm font-bold text-amber-400">
                      {dailyHardest.demonPosition < 0 ? `ILL #${Math.abs(dailyHardest.demonPosition - ILL_LEADERBOARD_OFFSET)}` : `#${dailyHardest.demonPosition}`} {dailyHardest.demonName}
                    </div>
                    <div className="text-xs text-zinc-400">
                      Held by <span className="text-zinc-100 font-semibold">{dailyHardest.username}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 font-mono">No rolls recorded today yet</div>
                )}
              </div>

              {/* 4 STAT BOXES (Chromatic Multi-Color) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total Rolls - Electric Sky */}
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-sky-500/20 text-center">
                  <div className="text-xs text-zinc-400 font-medium font-sans">Total Rolls</div>
                  <div className="mt-1 text-xl font-bold font-mono text-sky-300">
                    {stats.totalRolls.toLocaleString()}
                  </div>
                </div>

                {/* Demons Collected - Violet */}
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-violet-500/20 text-center">
                  <div className="text-xs text-zinc-400 font-medium font-sans">Demons Collected</div>
                  <div className="mt-1 text-xl font-bold font-mono text-violet-300">
                    {stats.unlockedDemonIds.length} <span className="text-xs text-zinc-500">/ {allDemons.length}</span>
                  </div>
                </div>

                {/* Total Keys - Cyan */}
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 text-center">
                  <div className="text-xs text-zinc-400 font-medium font-sans">Keys Harvested</div>
                  <div className="mt-1 text-xl font-bold font-mono text-cyan-300 flex items-center justify-center gap-1">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{formatNumber(stats.totalKeysEarned)}</span>
                  </div>
                </div>

                {/* Session Hardest - Emerald */}
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 text-center">
                  <div className="text-xs text-zinc-400 font-medium font-sans">Session Hardest</div>
                  <div className="mt-1 text-xl font-bold font-mono text-emerald-300 truncate">
                    {stats.sessionHardest ? `#${stats.sessionHardest.position} ${stats.sessionHardest.name}` : 'None'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'codex' && (
            <div className="space-y-3">
              {/* Codex List Selector (AREDL vs ILL) */}
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/90 border border-white/10">
                <button
                  onClick={() => {
                    setCodexListType('aredl');
                    setFilterTier('all');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
                    codexListType === 'aredl'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>AREDL List ({allDemons.length})</span>
                </button>
                <button
                  onClick={() => {
                    setCodexListType('ill');
                    setFilterTier('all');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
                    codexListType === 'ill'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-purple-400" />
                  <span>ILL List ({impossibleLevels.length} Impossible)</span>
                </button>
              </div>

              {/* Prominent Note: All ILL levels are harder than AREDL */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-zinc-900/60 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200 shadow-sm">
                <div className="w-5 h-5 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Flame className="w-3 h-3" />
                </div>
                <div className="leading-relaxed">
                  <strong className="font-black text-amber-300 uppercase tracking-wide">Important Notice:</strong>{' '}
                  <span className="text-zinc-200">
                    All ILL (Impossible Levels List) levels are officially classified as harder than all AREDL levels. They feature superhuman precision, micro-clicks, and physics-breaking frame-perfect inputs.
                  </span>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={codexListType === 'ill' ? "Search ILL level, creator, verifier, tag..." : "Search name, creator, verifier, tag (2.1, flow, learny)..."}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
                  <button
                    onClick={() => setFilterTier('all')}
                    className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                      filterTier === 'all'
                        ? 'bg-zinc-800 text-white border border-white/15'
                        : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    All ({activePool.length})
                  </button>
                  <button
                    onClick={() => setFilterTier('unlocked')}
                    className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                      filterTier === 'unlocked'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    Unlocked ({activePool.filter(d => unlockedSet.has(d.id)).length})
                  </button>
                  <button
                    onClick={() => setFilterTier('top150')}
                    className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                      filterTier === 'top150'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {codexListType === 'ill' ? 'Top 100' : 'Top 150'}
                  </button>
                  <button
                    onClick={() => setFilterTier('top10')}
                    className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                      filterTier === 'top10'
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                        : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    Top 10
                  </button>
                </div>
              </div>

              {/* Demons List */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {filteredDemons.slice(0, 100).map((demon) => {
                  const isUnlocked = unlockedSet.has(demon.id);
                  const isIll = demon.isImpossible;
                  const borderClass =
                    !isUnlocked
                      ? 'border-white/5 bg-zinc-950/60 opacity-50'
                      : isIll
                      ? demon.position === 1
                        ? 'border-purple-400/70 bg-purple-950/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                        : 'border-purple-500/40 bg-purple-950/20'
                      : demon.position === 1
                      ? 'border-amber-500/40 bg-amber-950/20'
                      : demon.position <= 10
                      ? 'border-violet-500/40 bg-violet-950/20'
                      : demon.position <= 150
                      ? 'border-rose-500/40 bg-rose-950/20'
                      : 'border-white/10 bg-zinc-900/60';

                  return (
                    <div
                      key={demon.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${borderClass}`}
                    >
                      <div className="flex items-center gap-3">
                        {demon.level_id ? (
                          <div className="w-12 h-10 shrink-0 rounded-xl overflow-hidden border border-white/10">
                            <DemonThumbnail
                              levelId={demon.level_id}
                              demonName={demon.name}
                              variant="compact"
                              className="w-full h-full"
                            />
                          </div>
                        ) : (
                          <DemonDifficultyIcon position={demon.position} isImpossible={demon.isImpossible} size="sm" />
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`font-mono text-xs font-bold ${
                              isIll
                                ? 'text-purple-300'
                                : demon.position === 1
                                ? 'text-amber-400'
                                : demon.position <= 10
                                ? 'text-violet-400'
                                : demon.position <= 150
                                ? 'text-rose-400'
                                : 'text-cyan-400'
                            }`}>
                              {isIll ? `ILL #${demon.position}` : `#${demon.position}`}
                            </span>
                            <span className="font-bold text-sm text-zinc-100">
                              {demon.name}
                            </span>
                            {isIll && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/30 border border-purple-400/50 text-purple-200 font-mono font-bold">
                                IMPOSSIBLE
                              </span>
                            )}
                            {isUnlocked && (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            {demon.tags && demon.tags.length > 0 && (
                              <div className="hidden sm:flex gap-1 ml-1">
                                {demon.tags.slice(0, 2).map((t) => (
                                  <span key={t} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] text-zinc-500 border border-white/5">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 font-sans">
                            By <span className="text-zinc-200 font-medium">{demon.publisher}</span> • Ver. by <span className="text-amber-300 font-medium">{demon.verifier}</span>
                            {demon.fps && <span className="ml-1 text-purple-400 font-mono">({demon.fps} FPS)</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-xs">
                        <div className="text-right">
                          <div className="text-zinc-400">
                            1 in {(demon.isImpossible ? calculateIllRarity(demon.position) : calculateDemonRarity(demon.position)).toLocaleString()}
                          </div>
                          <div className={isUnlocked ? 'text-emerald-400 font-semibold' : 'text-zinc-600'}>
                            {isUnlocked ? 'Discovered' : 'Locked'}
                          </div>
                        </div>

                        {onReplayCutscene && (
                          <button
                            onClick={() => onReplayCutscene(demon)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                            title="Replay Cutscene"
                          >
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredDemons.length === 0 && (
                  <div className="text-center py-10 text-zinc-500 text-sm">
                    No demons match your search query.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {stats.recentRolls.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  No rolls in history yet. Start rolling!
                </div>
              ) : (
                stats.recentRolls.map((r, i) => {
                  const borderClass =
                    r.demon.position === 1
                      ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                      : r.demon.position <= 10
                      ? 'border-violet-500/40 bg-violet-950/20 text-violet-300'
                      : r.demon.position <= 150
                      ? 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                      : 'border-white/10 bg-zinc-900/60 text-zinc-300';

                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-mono transition-all ${borderClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">#{r.demon.position}</span>
                        <div>
                          <span className="text-white font-sans font-bold text-sm">{r.demon.name}</span>
                          <div className="text-[11px] text-zinc-400 font-sans">
                            Rolled on spin #{r.rollNumber}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-zinc-300 font-bold">1 in {(r.demon.isImpossible ? calculateIllRarity(r.demon.position) : calculateDemonRarity(r.demon.position)).toLocaleString()} (Base)</div>
                        <div className="text-cyan-400 font-bold">+{r.keysEarned} Keys</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
