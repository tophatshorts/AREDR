import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import {
  DemonLevel,
  PlayerProfile,
  PlayerStats,
  PlayerUpgrades,
  RollResult,
} from './game/types';
import {
  calculateDemonRarity,
  executeRoll,
  formatNumber,
  getEffectiveLuck,
  PITY_LEVELS,
  QUICK_ROLL_COST,
  AUTO_ROLL_COST,
} from './game/rng';
import { sound } from './game/sound';
import { DemonDifficultyIcon } from './components/DemonDifficultyIcon';
import { CS2Spinner } from './components/CS2Spinner';
import { CutsceneOverlay } from './components/CutsceneOverlay';
import { UpgradesModal } from './components/UpgradesModal';
import { StatTrackerModal } from './components/StatTrackerModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { SaveProfileModal } from './components/SaveProfileModal';
import { LoginPage } from './components/LoginPage';
import {
  Zap,
  Trophy,
  BarChart2,
  Volume2,
  VolumeX,
  User as UserIcon,
  Sparkles,
  Flame,
  Shield,
  Play,
  Pause,
  LogOut,
  Save,
} from 'lucide-react';

import fallbackDemonsRaw from './data/demons.json';

const STORAGE_KEY = 'GD_EXTREME_DEMON_RNG_SAVE_V2';

const DEFAULT_UPGRADES: PlayerUpgrades = {
  luckLevel: 0,
  hasQuickRoll: false,
  hasAutoRoll: false,
  keysMultiplierLevel: 0,
  pityTierLevel: 0,
  streakChargeLevel: 0,
};

const DEFAULT_STATS: PlayerStats = {
  totalRolls: 0,
  totalKeysEarned: 0,
  currentKeys: 0,
  hardestDemon: null,
  hardestRollNumber: 0,
  hardestTimestamp: null,
  unlockedDemonIds: [],
  recentRolls: [],
  sessionHardest: null,
  streakWithoutTop150: 0,
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [demons, setDemons] = useState<DemonLevel[]>([]);
  const [isLoadingDemons, setIsLoadingDemons] = useState<boolean>(true);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Active Roll State
  const [pendingRollResult, setPendingRollResult] = useState<RollResult | null>(null);
  const [currentResult, setCurrentResult] = useState<RollResult | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [activeCutscene, setActiveCutscene] = useState<RollResult | null>(null);

  // Modals
  const [showUpgrades, setShowUpgrades] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  const [dailyHardest, setDailyHardest] = useState<{
    username: string;
    demonName: string;
    demonPosition: number;
  } | null>(null);

  const autoRollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRollingRef = useRef<boolean>(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Profile Loading
  const loadProfile = useCallback(async () => {
    if (isGuest && !user) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProfile(JSON.parse(saved));
      } else {
        setProfile({
          id: 'guest-' + Math.random().toString(36).slice(2, 9),
          username: 'Guest_' + Math.floor(1000 + Math.random() * 9000),
          createdAt: Date.now(),
          lastActive: Date.now(),
          avatarIcon: 'demon',
          upgrades: DEFAULT_UPGRADES,
          stats: DEFAULT_STATS,
          settings: {
            autoRoll: false,
            quickRoll: false,
            autoRollStopRank: null,
            soundEnabled: true,
            screenShake: true,
          },
        });
      }
      return;
    }

    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setProfile(docSnap.data() as PlayerProfile);
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        let initial: PlayerProfile;
        if (saved) {
          const parsed = JSON.parse(saved);
          initial = { ...parsed, id: user.uid, username: user.displayName || parsed.username || 'Dasher' };
        } else {
          initial = {
            id: user.uid,
            username: user.displayName || 'Dasher_' + Math.floor(1000 + Math.random() * 9000),
            createdAt: Date.now(),
            lastActive: Date.now(),
            avatarIcon: 'demon',
            upgrades: DEFAULT_UPGRADES,
            stats: DEFAULT_STATS,
            settings: {
              autoRoll: false,
              quickRoll: false,
              autoRollStopRank: null,
              soundEnabled: true,
              screenShake: true,
            },
          };
        }
        setProfile(initial);
        await setDoc(docRef, initial);
      }
    } catch (e) {
      console.error('Error syncing profile:', e);
    }
  }, [user, isGuest]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Auth Listener and Logout Cleanup
  async function handleLogout() {
    try {
      await signOut(auth);
      setProfile(null);
      setIsGuest(false);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }


  // Profile Saving (Automatic)
  useEffect(() => {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      if (user) {
        const syncToCloud = async () => {
          try {
            await setDoc(doc(db, 'users', user.uid), profile);
          } catch (e) {}
        };
        syncToCloud();
      }
    }
  }, [profile, user]);



  // Load Demons data with live fetch
  useEffect(() => {
    async function loadDemons() {
      setIsLoadingDemons(true);
      
      let demonList = [...fallbackDemonsRaw] as any[];
      
      try {
        const response = await fetch('https://aredl.pages.dev/api/levels');
        if (response.ok) {
          const liveData = await response.json();
          const liveMap = new Map();
          liveData.forEach((d: any) => liveMap.set(d.name.toLowerCase(), d));
          
          demonList = demonList.map(d => {
            const live = liveMap.get(d.name.toLowerCase());
            if (live) {
              return {
                ...d,
                publisher: live.publisher || d.publisher || 'Unknown',
                verifier: live.verifier || live.publisher || d.verifier || 'Unknown',
              };
            }
            return {
              ...d,
              verifier: d.verifier || d.publisher || 'GD Creator'
            };
          });
        }
      } catch (e) {
        console.warn('Failed to fetch live demons, using fallback:', e);
      }

      const bundled = demonList.map((d) => ({
        ...d,
        baseRarity: calculateDemonRarity(d.position, demonList.length),
      }));
      
      setDemons(bundled);
      setIsLoadingDemons(false);
    }
    loadDemons();
  }, []);

  // Fetch Daily Hardest
  async function fetchDailyHardest() {
    try {
      const q = query(collection(db, 'leaderboard'), orderBy('demonPosition', 'asc'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const top = snap.docs[0].data();
        setDailyHardest({
          username: top.username,
          demonName: top.demonName,
          demonPosition: top.demonPosition
        });
      }
    } catch (e) {}
  }

  useEffect(() => {
    fetchDailyHardest();
  }, [fetchDailyHardest]);

  // Submit to Leaderboard
  async function submitToLeaderboard(res?: RollResult) {
    if (!user || !profile) return;
    
    // If no specific result provided, use the hardest demon from profile
    const targetDemon = res ? res.demon : profile.stats.hardestDemon;
    const targetRarity = res ? res.effectiveRarity : (targetDemon ? targetDemon.baseRarity : 0);
    const rollsCount = res ? res.rollNumber : profile.stats.totalRolls;

    if (!targetDemon) return;

    try {
      await setDoc(doc(db, 'leaderboard', user.uid), {
        userId: user.uid,
        username: profile.username,
        demonName: targetDemon.name,
        demonPosition: targetDemon.position,
        rarity: targetRarity,
        rollsCount: rollsCount,
        timestamp: Date.now()
      });
      fetchDailyHardest();
    } catch (e) {}
  }

  // Manual Save Trigger
  async function handleManualSave() {
    if (!profile) return;
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    
    // Save to Firestore if logged in
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), profile);
        if (profile.stats.hardestDemon) {
          await submitToLeaderboard();
        }
      } catch (e) {
        console.error('Manual save failed:', e);
        throw e;
      }
    }
  }


  // Sync mute state
  useEffect(() => {
    if (profile) sound.setMuted(!profile.settings.soundEnabled);
  }, [profile?.settings.soundEnabled]);

  // Trigger Roll
  function handleRoll() {
    if (!profile || isSpinning || demons.length === 0 || activeCutscene || isRollingRef.current) return;

    // Prevent overlaps
    isRollingRef.current = true;
    
    const nextRollNumber = profile.stats.totalRolls + 1;
    const currentHardestPos = profile.stats.hardestDemon ? profile.stats.hardestDemon.position : null;

    const result = executeRoll(
      demons,
      profile.upgrades,
      nextRollNumber,
      currentHardestPos,
      profile.stats.streakWithoutTop150
    );

    setPendingRollResult(result);
    setIsSpinning(true);
  }

  // Complete Spin
  function handleSpinComplete() {
    isRollingRef.current = false;
    setIsSpinning(false);
    
    if (!pendingRollResult || !profile) {
      setPendingRollResult(null);
      return;
    }

    const result = pendingRollResult;
    setCurrentResult(result);
    setPendingRollResult(null);

    if (result.tier === 'top1' || result.tier === 'top10' || result.tier === 'top150') {
      setActiveCutscene(result);
    } else if (result.demon.position <= 500) {
      sound.playRareChime();
    } else {
      sound.playCommonChime();
    }

    if (result.isNewPersonalBest) {
      // Force immediate submission to cloud if PB
      submitToLeaderboard(result);
    } else if (result.rollNumber % 100 === 0) {
      // Periodic submission even without PB to update rolls count
      submitToLeaderboard();
    }

    setProfile((prev) => {
      if (!prev) return null;
      const isPB = result.isNewPersonalBest;
      const newHardest = isPB ? result.demon : prev.stats.hardestDemon;
      const newHardestRollNum = isPB ? result.rollNumber : prev.stats.hardestRollNumber;
      const newHardestTimestamp = isPB ? Date.now() : prev.stats.hardestTimestamp;

      const isSessionPB = !prev.stats.sessionHardest || result.demon.position < prev.stats.sessionHardest.position;
      const newSessionHardest = isSessionPB ? result.demon : prev.stats.sessionHardest;

      const unlocked = prev.stats.unlockedDemonIds.includes(result.demon.id)
        ? prev.stats.unlockedDemonIds
        : [...prev.stats.unlockedDemonIds, result.demon.id];

      const recent = [result, ...prev.stats.recentRolls.slice(0, 24)];
      const newStreak = result.demon.position <= 150 ? 0 : prev.stats.streakWithoutTop150 + 1;

      let shouldStopAutoRoll = false;
      if (prev.settings.autoRoll && prev.settings.autoRollStopRank !== null) {
        if (result.demon.position <= prev.settings.autoRollStopRank) {
          shouldStopAutoRoll = true;
          sound.playRareChime();
        }
      }

      return {
        ...prev,
        lastActive: Date.now(),
        settings: {
          ...prev.settings,
          autoRoll: shouldStopAutoRoll ? false : prev.settings.autoRoll,
        },
        stats: {
          ...prev.stats,
          totalRolls: result.rollNumber,
          totalKeysEarned: prev.stats.totalKeysEarned + result.keysEarned,
          currentKeys: prev.stats.currentKeys + result.keysEarned,
          hardestDemon: newHardest,
          hardestRollNumber: newHardestRollNum,
          hardestTimestamp: newHardestTimestamp,
          unlockedDemonIds: unlocked,
          recentRolls: recent,
          sessionHardest: newSessionHardest,
          streakWithoutTop150: newStreak,
        },
      };
    });
  }

  // Auto Roll: Fast, responsive loop when both Auto Roll and Quick Roll are active
  useEffect(() => {
    if (!profile?.settings.autoRoll || !profile?.upgrades.hasAutoRoll) {
      if (autoRollTimerRef.current) clearTimeout(autoRollTimerRef.current);
      return;
    }

    // Stop rolling if any blocker is active
    if (isSpinning || pendingRollResult || activeCutscene || showUpgrades || showStats || showProfile || showLeaderboard) {
      if (autoRollTimerRef.current) clearTimeout(autoRollTimerRef.current);
      return;
    }

    const delayMs = profile.settings.quickRoll ? 100 : 600; // Slightly faster for responsiveness
    autoRollTimerRef.current = setTimeout(() => {
      handleRoll();
    }, delayMs);

    return () => {
      if (autoRollTimerRef.current) clearTimeout(autoRollTimerRef.current);
    };
  }, [
    profile?.settings.autoRoll,
    profile?.settings.quickRoll,
    profile?.upgrades.hasAutoRoll,
    isSpinning,
    pendingRollResult,
    activeCutscene,
    showUpgrades,
    showStats,
    showProfile,
    showLeaderboard,
    handleRoll,
  ]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isGuest && !profile) {
    return <LoginPage onLoginSuccess={() => setIsGuest(false)} onContinueAsGuest={() => setIsGuest(true)} topDemons={demons.slice(0, 15).map(d => d.name)} />;
  }

  if (!profile) return null;

  const { totalLuck, streakLuck } = getEffectiveLuck(profile.upgrades, profile.stats.streakWithoutTop150);
  const pityTier = PITY_LEVELS[profile.upgrades.pityTierLevel];
  const pityProgress = pityTier.rollsNeeded > 0 ? profile.stats.totalRolls % pityTier.rollsNeeded : 0;
  const displayDemon = pendingRollResult ? pendingRollResult.demon : currentResult ? currentResult.demon : null;

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Atmospheric Backdrop */}
      {displayDemon && displayDemon.level_id && (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-20 filter blur-md transition-opacity duration-1000">
          <img
            src={`https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${displayDemon.level_id}.webp`}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07080c] via-black/80 to-[#07080c]" />
        </div>
      )}

      {/* Modern High-End Top Navigation */}
      <header className="border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo & Title Lockup */}
          <div className="flex items-center gap-3.5">
            <img
              src="assets/aistudio/IMG_7950_e702d8b3.png"
              alt="AREDR"
              className="h-8 sm:h-9 w-auto object-contain drop-shadow-[0_2px_12px_rgba(245,158,11,0.35)]"
            />
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <div className="hidden sm:flex flex-col">
              <span className="font-display text-xs font-bold tracking-wider text-white uppercase">
                All Rated Extreme Demon RNG
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                Player: <span className="text-zinc-200 font-semibold">{profile.username}</span>
              </span>
            </div>
          </div>

          {/* Right Controls & Currency */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Demon Keys Currency Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <img src="assets/aistudio/IMG_7942_07b1ead5.png" alt="Keys" className="w-4 h-4 object-contain" />
              <span>{formatNumber(profile.stats.currentKeys)}</span>
            </div>

            {/* Feature Action Buttons with Tier-Distinct Color Accents */}
            <button
              onClick={() => setShowUpgrades(true)}
              title="Demon Upgrades Vault"
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 transition-all duration-200 shadow-sm"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowStats(true)}
              title="Extreme Demon Codex & Stats"
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-violet-500/15 border border-white/10 hover:border-violet-500/40 text-violet-400 hover:text-violet-300 transition-all duration-200 shadow-sm"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowLeaderboard(true)}
              title="Verified Global Leaderboard"
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 transition-all duration-200 shadow-sm"
            >
              <Trophy className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowProfile(true)}
              title="Player Profile & Cloud Saves"
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-sky-500/15 border border-white/10 hover:border-sky-500/40 text-sky-400 hover:text-sky-300 transition-all duration-200 shadow-sm"
            >
              <UserIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleManualSave}
              title="Manual Save"
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 transition-all duration-200 shadow-sm"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/40 text-zinc-400 hover:text-rose-300 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Play Arena */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col justify-center items-center z-10">
        {/* World Record / Daily Hardest Banner */}
        {dailyHardest && (
          <div className="mb-5 w-full max-w-xl px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-zinc-900/90 to-purple-500/10 border border-white/10 flex items-center justify-between text-xs backdrop-blur-md shadow-md">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-rose-500/20 text-rose-400">
                <Flame className="w-3.5 h-3.5 animate-pulse" />
              </span>
              <span className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider">
                World Hardest
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold text-amber-400">#{dailyHardest.demonPosition}</span>
              <span className="text-white font-semibold">{dailyHardest.demonName}</span>
              <span className="text-zinc-500 text-[11px]">by</span>
              <span className="text-cyan-300 font-medium">{dailyHardest.username}</span>
            </div>
          </div>
        )}

        {/* Center Game Board / Spinner / Result Container */}
        <div className="w-full max-w-xl relative min-h-[360px] flex flex-col items-center justify-center">
          {/* Active CS2 Spinner Reel */}
          <div className={`w-full transition-all duration-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 ${isSpinning ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <CS2Spinner
              targetDemon={displayDemon}
              allDemons={demons}
              isSpinning={isSpinning}
              isQuickRoll={profile.settings.quickRoll}
              onSpinComplete={handleSpinComplete}
            />
          </div>

          {/* Main Card Container */}
          <div className={`w-full relative transition-all duration-300 z-10 ${isSpinning ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
            <div className="relative rounded-3xl border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl min-h-[360px] flex flex-col items-center justify-center p-6 sm:p-8 bg-zinc-950/85">
              {currentResult && currentResult.demon.level_id ? (
                <>
                  {/* High-Impact Level Screenshot Backdrop */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={`https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${currentResult.demon.level_id}.webp`}
                      alt={currentResult.demon.name}
                      className="w-full h-full object-cover opacity-60 filter brightness-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40" />
                  </div>

                  {/* Pulled Demon Data View */}
                  <div className="relative z-10 w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                    {/* Header Badges */}
                    <div className="flex items-center gap-3">
                      <DemonDifficultyIcon size="md" />
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider border shadow-sm ${
                          currentResult.demon.position === 1
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : currentResult.demon.position <= 10
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                            : currentResult.demon.position <= 150
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-zinc-900/80 text-cyan-300 border-cyan-500/30'
                        }`}>
                          RANK #{currentResult.demon.position}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-zinc-300">
                          1 in {currentResult.effectiveRarity.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Level Title in Modern Display Font */}
                    <h2 className="mt-3.5 font-display text-4xl sm:text-5xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] tracking-tight">
                      {currentResult.demon.name}
                    </h2>

                    {/* Creator Credits */}
                    <p className="mt-2 text-xs sm:text-sm text-zinc-300 font-medium">
                      By <span className="text-white font-semibold">{currentResult.demon.publisher}</span> · Verified by <span className="text-amber-300 font-semibold">{currentResult.demon.verifier}</span>
                    </p>

                    {/* Demon Keys Reward Pill */}
                    <div className="mt-5 flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                      <img src="assets/aistudio/IMG_7942_07b1ead5.png" alt="Keys" className="w-4 h-4 object-contain" />
                      <span>+{currentResult.keysEarned} Demon Keys</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Initial State: Clean, Welcoming Hero with Shuffled Demons */
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center py-6">
                  {profile.stats.totalRolls === 0 && !isSpinning ? (
                    <div className="flex flex-col items-center max-w-sm animate-in fade-in zoom-in-95 duration-500">
                      {/* Logo with Soft Colorful Glow */}
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-cyan-500/20 rounded-full blur-2xl" />
                        <img
                          src="assets/aistudio/IMG_7950_e702d8b3.png"
                          alt="AREDR"
                          className="relative h-16 w-auto object-contain drop-shadow-[0_8px_25px_rgba(245,158,11,0.4)]"
                        />
                      </div>

                      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-8">
                        Ready to roll extreme demons?
                      </p>

                      {/* Initial Large Vibrant Roll Button */}
                      <button
                        onClick={handleRoll}
                        className="group relative px-14 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:via-orange-400 hover:to-rose-500 text-white font-display text-2xl font-black uppercase tracking-wider shadow-[0_0_35px_rgba(249,115,22,0.45)] hover:shadow-[0_0_50px_rgba(249,115,22,0.65)] transition-all duration-200 transform hover:scale-[1.03] active:scale-[0.98]"
                      >
                        Roll
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 font-mono tracking-wider">Ready for next roll</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HUD Multiplier & Status Strip (Color-Coded & Distinct) */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-semibold">
          {/* Luck Multiplier - Mint / Emerald */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Luck: {totalLuck.toFixed(1)}x</span>
          </div>

          {/* Pity Counter - Cosmic Violet / Indigo */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 shadow-sm">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pity: {pityProgress}/{pityTier.rollsNeeded || '—'}</span>
          </div>

          {/* Personal Best - Sunburst Amber */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Best: {profile.stats.hardestDemon ? `#${profile.stats.hardestDemon.position}` : 'None'}</span>
          </div>

          {/* Consecutive Dry Streak - Hellfire Rose (only when charging) */}
          {profile.stats.streakWithoutTop150 > 0 && streakLuck > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 shadow-sm animate-pulse">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Streak: +{streakLuck.toFixed(1)}x</span>
            </div>
          )}
        </div>

        {/* Action Controls: Appears at bottom after initial roll or during gameplay */}
        {(profile.stats.totalRolls > 0 || isSpinning || currentResult) && (
          <div className="mt-5 flex flex-col items-center gap-3.5 w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Primary Roll Button */}
            <button
              onClick={handleRoll}
              disabled={isSpinning}
              className={`w-full py-3.5 px-8 rounded-2xl font-display text-xl font-black tracking-wider uppercase transition-all duration-200 transform active:scale-95 shadow-xl flex items-center justify-center gap-2 ${
                isSpinning
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:via-orange-400 hover:to-rose-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.4)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)]'
              }`}
            >
              {isSpinning ? <span>Spinning...</span> : <span>Roll</span>}
            </button>

            {/* Quick Roll & Auto Roll Controls with Clear Colors */}
            <div className="flex flex-wrap items-center justify-center gap-2 w-full text-xs font-mono font-semibold">
              {/* Quick Roll Toggle (Cyan/Sky) */}
              <button
                onClick={() => {
                  if (!profile.upgrades.hasQuickRoll) setShowUpgrades(true);
                  else setProfile((p) => ({ ...p!, settings: { ...p!.settings, quickRoll: !p!.settings.quickRoll } }));
                }}
                className={`px-3 py-1.5 rounded-xl border transition-all duration-200 ${
                  profile.settings.quickRoll
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                    : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Quick: {profile.settings.quickRoll ? 'ON' : 'OFF'}
              </button>

              {/* Auto Roll Toggle (Vibrant Violet/Fuchsia) */}
              <button
                onClick={() => {
                  if (!profile.upgrades.hasAutoRoll) setShowUpgrades(true);
                  else setProfile((p) => ({ ...p!, settings: { ...p!.settings, autoRoll: !p!.settings.autoRoll } }));
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-200 ${
                  profile.settings.autoRoll
                    ? 'bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.25)]'
                    : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {profile.settings.autoRoll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>Auto: {profile.settings.autoRoll ? 'ON' : 'OFF'}</span>
              </button>

              {/* Stop Rank Input (Clean Amber Pill) */}
              {profile.upgrades.hasAutoRoll && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-white/10 text-xs">
                  <span className="text-zinc-400 text-[11px]">Stop ≤</span>
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    placeholder="Rank"
                    value={profile.settings.autoRollStopRank || ''}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p!,
                        settings: {
                          ...p!.settings,
                          autoRollStopRank: e.target.value === '' ? null : parseInt(e.target.value),
                        },
                      }))
                    }
                    className="w-14 bg-zinc-800/80 border border-white/10 rounded-lg text-amber-300 text-center font-bold text-xs py-0.5 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Colorful Recent Rolls Footer Strip */}
      <footer className="border-t border-white/[0.08] bg-zinc-950/90 py-2.5 px-4 z-10 flex items-center gap-3 overflow-x-auto text-xs font-mono">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">Recent:</span>
        <div className="flex gap-2">
          {profile.stats.recentRolls.length === 0 ? (
            <span className="text-zinc-600 text-xs italic">No rolls yet</span>
          ) : (
            profile.stats.recentRolls.slice(0, 10).map((r, i) => {
              const pos = r.demon.position;
              const borderClass =
                pos === 1
                  ? 'border-amber-500/50 bg-amber-950/30 text-amber-300'
                  : pos <= 10
                  ? 'border-violet-500/50 bg-violet-950/30 text-violet-300'
                  : pos <= 150
                  ? 'border-rose-500/50 bg-rose-950/30 text-rose-300'
                  : 'border-white/10 bg-zinc-900/80 text-zinc-300';

              return (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shrink-0 transition-all ${borderClass}`}
                >
                  <span className="font-bold">#{r.demon.position}</span>
                  <span className="max-w-[85px] truncate font-sans font-medium">{r.demon.name}</span>
                </div>
              );
            })
          )}
        </div>
      </footer>

      {activeCutscene && <CutsceneOverlay demon={activeCutscene.demon} rollNumber={activeCutscene.rollNumber} onClose={() => setActiveCutscene(null)} />}
      {showUpgrades && <UpgradesModal upgrades={profile.upgrades} stats={profile.stats} onClose={() => setShowUpgrades(false)} onUpgradeLuck={(cost) => setProfile(p => ({ ...p!, stats: { ...p!.stats, currentKeys: p!.stats.currentKeys - cost }, upgrades: { ...p!.upgrades, luckLevel: p!.upgrades.luckLevel + 1 } }))} onUpgradeKeysMult={(cost) => setProfile(p => ({ ...p!, stats: { ...p!.stats, currentKeys: p!.stats.currentKeys - cost }, upgrades: { ...p!.upgrades, keysMultiplierLevel: p!.upgrades.keysMultiplierLevel + 1 } }))} onUpgradePity={(cost) => setProfile(p => ({ ...p!, stats: { ...p!.stats, currentKeys: p!.stats.currentKeys - cost }, upgrades: { ...p!.upgrades, pityTierLevel: p!.upgrades.pityTierLevel + 1 } }))} onUpgradeStreak={(cost) => setProfile(p => ({ ...p!, stats: { ...p!.stats, currentKeys: p!.stats.currentKeys - cost }, upgrades: { ...p!.upgrades, streakChargeLevel: p!.upgrades.streakChargeLevel + 1 } }))} onBuyQuickRoll={(cost) => setProfile(p => ({ ...p!, stats: { ...p!.stats, currentKeys: p!.stats.currentKeys - cost }, upgrades: { ...p!.upgrades, hasQuickRoll: true }, settings: { ...p!.settings, quickRoll: true } }))} onBuyAutoRoll={(cost) => setProfile(p => ({ ...p!, stats: { ...p!.stats, currentKeys: p!.stats.currentKeys - cost }, upgrades: { ...p!.upgrades, hasAutoRoll: true }, settings: { ...p!.settings, autoRoll: true } }))} />}
      {showStats && <StatTrackerModal stats={profile.stats} allDemons={demons} dailyHardest={dailyHardest} onClose={() => setShowStats(false)} onReplayCutscene={(demon) => setActiveCutscene({ demon, effectiveRarity: demon.baseRarity, rollNumber: profile.stats.totalRolls, timestamp: Date.now(), keysEarned: 0, isNewPersonalBest: false, tier: 'top150' })} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
      {showProfile && (
        <SaveProfileModal 
          profile={profile} 
          user={user}
          onUpdateProfileName={(n) => {
            setProfile(p => ({ ...p!, username: n }));
            // Trigger leaderboard update if they have a hardest demon
            if (profile.stats.hardestDemon) {
              submitToLeaderboard();
            }
          }} 
          onManualSave={handleManualSave}
          onResetSave={async () => {
            if (user) {
              try {
                // Delete cloud data
                const { deleteDoc } = await import('firebase/firestore');
                await deleteDoc(doc(db, 'users', user.uid));
                await deleteDoc(doc(db, 'leaderboard', user.uid));
              } catch (e) {}
            }
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
          }} 
          onClose={() => setShowProfile(false)} 
        />
      )}
    </div>
  );
}
