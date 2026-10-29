import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut, getRedirectResult, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
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
  LUCK_LEVELS,
  KEYS_MULTIPLIER_LEVELS,
  PITY_LEVELS,
  STREAK_LEVELS,
  QUICK_ROLL_COST,
  AUTO_ROLL_COST,
  QUICK_ROLL_SPEED_LEVELS,
  REBIRTH_COST,
  REBIRTH_TIERS,
  ILL_LEADERBOARD_OFFSET,
  isHarder,
} from './game/rng';
import { sound } from './game/sound';
import { DemonDifficultyIcon } from './components/DemonDifficultyIcon';
import { DemonThumbnail, getDemonThumbnailUrl } from './components/DemonThumbnail';
import { CS2Spinner } from './components/CS2Spinner';
import { CutsceneOverlay } from './components/CutsceneOverlay';
import { UpgradesModal } from './components/UpgradesModal';
import { StatTrackerModal } from './components/StatTrackerModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { SaveProfileModal } from './components/SaveProfileModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { LoginPage } from './components/LoginPage';
import {
  Zap,
  Trophy,
  BarChart2,
  User as UserIcon,
  Sparkles,
  Flame,
  Shield,
  Play,
  Pause,
  LogOut,
  Save,
  Check,
  Cloud,
  AlertTriangle,
  RotateCcw,
  Crown,
} from 'lucide-react';

import fallbackDemonsRaw from './data/demons.json';
import fallbackImpossibleRaw from './data/impossible_levels.json';

function sanitizeUsername(name?: string | null): string {
  if (!name) return 'Dasher_' + Math.floor(1000 + Math.random() * 9000);
  let cleaned = name.trim();
  if (cleaned.length < 3) {
    cleaned = (cleaned + 'Dasher').slice(0, 8);
  }
  if (cleaned.length < 3) {
    cleaned = 'Dasher_' + Math.floor(1000 + Math.random() * 9000);
  }
  return cleaned.slice(0, 32);
}

function normalizeProfile(raw: any): PlayerProfile {
  if (!raw || typeof raw !== 'object') raw = {};
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : 'guest-' + Math.random().toString(36).slice(2, 9),
    username: sanitizeUsername(raw.username),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    lastActive: Date.now(),
    avatarIcon: typeof raw.avatarIcon === 'string' ? raw.avatarIcon : 'demon',
    upgrades: {
      luckLevel: typeof raw?.upgrades?.luckLevel === 'number' ? Math.min(Math.max(0, raw.upgrades.luckLevel), LUCK_LEVELS.length - 1) : 0,
      rebirthCount: typeof raw?.upgrades?.rebirthCount === 'number' ? Math.max(0, raw.upgrades.rebirthCount) : 0,
      hasQuickRoll: Boolean(raw?.upgrades?.hasQuickRoll),
      quickRollSpeedLevel: typeof raw?.upgrades?.quickRollSpeedLevel === 'number' ? Math.min(Math.max(0, raw.upgrades.quickRollSpeedLevel), QUICK_ROLL_SPEED_LEVELS.length - 1) : 0,
      hasAutoRoll: Boolean(raw?.upgrades?.hasAutoRoll),
      keysMultiplierLevel: typeof raw?.upgrades?.keysMultiplierLevel === 'number' ? Math.min(Math.max(0, raw.upgrades.keysMultiplierLevel), KEYS_MULTIPLIER_LEVELS.length - 1) : 0,
      pityTierLevel: typeof raw?.upgrades?.pityTierLevel === 'number' ? Math.min(Math.max(0, raw.upgrades.pityTierLevel), PITY_LEVELS.length - 1) : 0,
      streakChargeLevel: typeof raw?.upgrades?.streakChargeLevel === 'number' ? Math.min(Math.max(0, raw.upgrades.streakChargeLevel), STREAK_LEVELS.length - 1) : 0,
    },
    stats: {
      totalRolls: typeof raw?.stats?.totalRolls === 'number' ? raw.stats.totalRolls : 0,
      totalKeysEarned: typeof raw?.stats?.totalKeysEarned === 'number' ? raw.stats.totalKeysEarned : 0,
      currentKeys: typeof raw?.stats?.currentKeys === 'number' ? raw.stats.currentKeys : 0,
      hardestDemon: raw?.stats?.hardestDemon || null,
      hardestRollNumber: typeof raw?.stats?.hardestRollNumber === 'number' ? raw.stats.hardestRollNumber : 0,
      hardestTimestamp: raw?.stats?.hardestTimestamp || null,
      unlockedDemonIds: Array.isArray(raw?.stats?.unlockedDemonIds) ? raw.stats.unlockedDemonIds : [],
      recentRolls: Array.isArray(raw?.stats?.recentRolls) ? raw.stats.recentRolls : [],
      sessionHardest: raw?.stats?.sessionHardest || null,
      streakWithoutTop150: typeof raw?.stats?.streakWithoutTop150 === 'number' ? raw.stats.streakWithoutTop150 : 0,
    },
    settings: {
      autoRoll: Boolean(raw?.settings?.autoRoll),
      quickRoll: Boolean(raw?.settings?.quickRoll),
      autoRollStopRank: typeof raw?.settings?.autoRollStopRank === 'number' ? raw.settings.autoRollStopRank : null,
      autoRollStopRankAredl:
        typeof raw?.settings?.autoRollStopRankAredl === 'number'
          ? raw.settings.autoRollStopRankAredl
          : typeof raw?.settings?.autoRollStopRank === 'number'
          ? raw.settings.autoRollStopRank
          : null,
      autoRollStopRankIll: typeof raw?.settings?.autoRollStopRankIll === 'number' ? raw.settings.autoRollStopRankIll : null,
      soundEnabled: raw?.settings?.soundEnabled !== undefined ? Boolean(raw.settings.soundEnabled) : true,
      screenShake: raw?.settings?.screenShake !== undefined ? Boolean(raw.settings.screenShake) : true,
    },
  };
}

const STORAGE_KEY = 'GD_EXTREME_DEMON_RNG_SAVE_V2';

const DEFAULT_UPGRADES: PlayerUpgrades = {
  luckLevel: 0,
  rebirthCount: 0,
  hasQuickRoll: false,
  quickRollSpeedLevel: 0,
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
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id?.startsWith('guest-')) return true;
      } catch (e) {}
    }
    return false;
  });

  // Pre-populate demons from bundled data instantly so there is zero load lag
  const [demons, setDemons] = useState<DemonLevel[]>(() => {
    return (fallbackDemonsRaw as any[]).map((d) => ({
      ...d,
      baseRarity: calculateDemonRarity(d.position, fallbackDemonsRaw.length),
    }));
  });

  // Pre-populate impossible levels from bundled ILL data
  const [impossibleLevels, setImpossibleLevels] = useState<DemonLevel[]>(() => {
    return (fallbackImpossibleRaw as any[]).map((d) => ({
      ...d,
      baseRarity: d.baseRarity || 500000,
    }));
  });

  const [isLoadingDemons, setIsLoadingDemons] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Active Roll State
  const [pendingRollResult, setPendingRollResult] = useState<RollResult | null>(null);
  const [currentResult, setCurrentResult] = useState<RollResult | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [activeCutscene, setActiveCutscene] = useState<(RollResult & { cutsceneType?: 'normal' | 'ill-first' | 'ill-top1' | 'ill-top10' | 'ill-top100' }) | null>(null);


  // Save Indicator & Confirmation States
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedCloud, setLastSavedCloud] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // Modals
  const [showUpgrades, setShowUpgrades] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showAutosaveNotice, setShowAutosaveNotice] = useState<boolean>(false);
  const [dismissNoticeChecked, setDismissNoticeChecked] = useState<boolean>(false);
  const [triggerScreenShake, setTriggerScreenShake] = useState<boolean>(false);

  const [dailyHardest, setDailyHardest] = useState<{
    username: string;
    demonName: string;
    demonPosition: number;
  } | null>(null);

  const autoRollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRollingRef = useRef<boolean>(false);
  const profileRef = useRef<PlayerProfile | null>(profile);
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleRollRef = useRef<() => void>(() => {});

  const isSpinningRef = useRef<boolean>(isSpinning);
  const pendingRollResultRef = useRef<RollResult | null>(pendingRollResult);
  const activeCutsceneRef = useRef<any>(activeCutscene);
  const showLogoutConfirmRef = useRef<boolean>(showLogoutConfirm);
  const showAutosaveNoticeRef = useRef<boolean>(showAutosaveNotice);
  const lastAutoRollTimestampRef = useRef<number>(0);

  // Keep state refs in sync
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => { isSpinningRef.current = isSpinning; }, [isSpinning]);
  useEffect(() => { pendingRollResultRef.current = pendingRollResult; }, [pendingRollResult]);
  useEffect(() => { activeCutsceneRef.current = activeCutscene; }, [activeCutscene]);
  useEffect(() => { showLogoutConfirmRef.current = showLogoutConfirm; }, [showLogoutConfirm]);
  useEffect(() => { showAutosaveNoticeRef.current = showAutosaveNotice; }, [showAutosaveNotice]);

  useEffect(() => {
    handleRollRef.current = handleRoll;
  });

  // Screen shake handler
  useEffect(() => {
    // @ts-ignore
    window.setTriggerScreenShake = setTriggerScreenShake;

    if (triggerScreenShake) {
      const shakeTimer = setTimeout(() => {
        setTriggerScreenShake(false);
      }, 1000);
      return () => clearTimeout(shakeTimer);
    }
  }, [triggerScreenShake]);

  // Auth Listener
  useEffect(() => {
    let unsubscribe = () => {};
    // Non-blocking timeout: ensure isAuthLoading never hangs indefinitely on slow network or mobile
    const safetyTimeout = setTimeout(() => {
      setIsAuthLoading(false);
    }, 1200);

    try {
      if (auth && typeof auth === 'object' && 'name' in auth) {
        // Handle redirect login response on mount (mobile/tablet safe)
        getRedirectResult(auth)
          .then((cred) => {
            if (cred?.user) {
              setUser(cred.user);
              setIsAuthLoading(false);
            }
          })
          .catch((err) => {
            console.warn('Redirect result check error:', err);
          });

        unsubscribe = onAuthStateChanged(
          auth,
          (firebaseUser) => {
            setUser(firebaseUser);
            setIsAuthLoading(false);
            clearTimeout(safetyTimeout);
          },
          (err) => {
            console.warn('Auth listener error:', err);
            setIsAuthLoading(false);
            clearTimeout(safetyTimeout);
          }
        );
      } else {
        setIsAuthLoading(false);
        clearTimeout(safetyTimeout);
      }
    } catch (e) {
      console.warn('Firebase Auth failed to attach:', e);
      setIsAuthLoading(false);
      clearTimeout(safetyTimeout);
    }
    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  // Save Profile Helper (Updates localStorage continuously; Cloud sync on manual action only)
  const saveProfileToStorage = useCallback(
    async (targetProfile: PlayerProfile, syncCloudNow: boolean = false) => {
      if (!targetProfile) return;

      const sanitized = normalizeProfile(targetProfile);

      // 1. Immediate Local Storage Update
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));

      // 2. Visual Save Status Feedback
      setSaveStatus('saving');
      setLastSavedCloud(syncCloudNow);
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);

      saveStatusTimerRef.current = setTimeout(() => {
        setSaveStatus('saved');
        saveStatusTimerRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 1800);
      }, 200);

      // 3. Cloud Sync if user is signed in AND explicit manual save requested
      if (user && syncCloudNow) {
        try {
          // Prune data for Firestore to avoid bloat (remove large arrays)
          const cloudData = {
            ...sanitized,
            stats: {
              ...sanitized.stats,
              unlockedDemonIds: [], // Kept only in local storage
              recentRolls: [],      // Kept only in local storage
              sessionHardest: null, // Reset on cloud
            }
          };
          await setDoc(doc(db, 'users', user.uid), cloudData);
        } catch (e) {
          console.warn('Cloud sync error:', e);
          throw e; // Re-throw to handle in UI if needed
        }
      }
    },
    [user]
  );

  // Profile Loading Logic
  const loadProfile = useCallback(async () => {
    const savedLocalStr = localStorage.getItem(STORAGE_KEY);
    let localProfile: PlayerProfile | null = null;
    if (savedLocalStr) {
      try {
        localProfile = normalizeProfile(JSON.parse(savedLocalStr));
      } catch (e) {
        console.warn('Failed to parse local profile save:', e);
      }
    }

    // Hydrate local save immediately so app is interactive with zero delay
    if (localProfile) {
      setProfile(localProfile);
    }

    try {
      if (isGuest && !user) {
        const activeProfile = localProfile || normalizeProfile({ username: 'Guest_' + Math.floor(1000 + Math.random() * 9000) });
        setProfile(activeProfile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeProfile));
        return;
      }

      if (!user) {
        if (!isGuest) setProfile(null);
        return;
      }

      const docRef = doc(db, 'users', user.uid);
      const docPromise = getDoc(docRef);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore load timeout')), 2500)
      );

      const docSnap = await Promise.race([docPromise, timeoutPromise]);

      if (docSnap.exists()) {
        const cloudProfile = normalizeProfile(docSnap.data());
        let finalProfile = cloudProfile;

        // Compare local save and cloud save: keep whichever has more progress!
        if (localProfile) {
          const localRolls = localProfile.stats.totalRolls;
          const cloudRolls = cloudProfile.stats.totalRolls;
          const localKeys = localProfile.stats.totalKeysEarned;
          const cloudKeys = cloudProfile.stats.totalKeysEarned;
          
          // Use position comparison for hardest demon as a fallback/secondary check
          const localHardestPos = localProfile.stats.hardestDemon?.position || 9999;
          const cloudHardestPos = cloudProfile.stats.hardestDemon?.position || 9999;

          if (localHardestPos < cloudHardestPos || localRolls > cloudRolls || (localRolls === cloudRolls && localKeys > cloudKeys)) {
            finalProfile = normalizeProfile({
              ...localProfile,
              id: user.uid,
              username: user.displayName || localProfile.username,
            });
          } else {
            // Cloud is better or equal, but preserve local-only data (unlocked IDs, recent rolls)
            finalProfile = normalizeProfile({
              ...cloudProfile,
              stats: {
                ...cloudProfile.stats,
                unlockedDemonIds: localProfile.stats.unlockedDemonIds,
                recentRolls: localProfile.stats.recentRolls,
              }
            });
          }
        }

        finalProfile.id = user.uid;
        finalProfile.username = sanitizeUsername(finalProfile.username || user.displayName);
        setProfile(finalProfile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalProfile));
      } else {
        const initial = normalizeProfile(
          localProfile
            ? { ...localProfile, id: user.uid, username: user.displayName || localProfile.username }
            : { id: user.uid, username: user.displayName }
        );
        setProfile(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch (e) {
      console.warn('Profile cloud sync bypassed (quota limit / timeout / offline):', e);
      const fallback = localProfile || normalizeProfile({ id: user ? user.uid : 'guest-1', username: sanitizeUsername(user?.displayName) });
      setProfile(fallback);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    } finally {
      if (localStorage.getItem('AREDL_RNG_DISMISS_AUTOSAVE_NOTICE') !== 'true') {
        setShowAutosaveNotice(true);
      }
    }
  }, [user, isGuest]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Periodic Local Storage Persistence (Every 3s while active - No cloud quota hits)
  useEffect(() => {
    if (!profile) return;

    const interval = setInterval(() => {
      const current = profileRef.current;
      if (current) {
        const sanitized: PlayerProfile = {
          ...current,
          username: sanitizeUsername(current.username),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [profile?.id]);

  // Auth Listener and Logout Cleanup
  async function handleLogout() {
    try {
      if (user && profileRef.current) {
        // Prune data for Firestore to avoid bloat (remove large arrays)
        const sanitized = normalizeProfile(profileRef.current);
        const cloudData = {
          ...sanitized,
          stats: {
            ...sanitized.stats,
            unlockedDemonIds: [],
            recentRolls: [],
            sessionHardest: null,
          }
        };
        await setDoc(doc(db, 'users', user.uid), cloudData).catch(() => {});
      }
      await signOut(auth);
      setProfile(null);
      setIsGuest(false);
      setShowLogoutConfirm(false);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Logout error:', e);
    }
  }

  // Load Demons data with live fetch (Fast 2s AbortController timeout for instant mobile/iPad load)
  useEffect(() => {
    async function loadDemons() {
      setIsLoadingDemons(true);

      try {
        const response = await fetch('/api/demons');
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.demons)) {
            const mapped = data.demons.map((d: any) => ({
              ...d,
              baseRarity: calculateDemonRarity(d.position, data.demons.length),
            }));
            setDemons(mapped);
            setIsLoadingDemons(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Local demons API fetch failed, falling back to bundled data:', e);
      }

      // Fallback to bundled data if API fails
      const bundled = (fallbackDemonsRaw as any[]).map((d) => ({
        ...d,
        baseRarity: calculateDemonRarity(d.position, fallbackDemonsRaw.length),
      }));

      setDemons(bundled);
      setIsLoadingDemons(false);
    }
    loadDemons();

    async function loadImpossibleLevels() {
      try {
        const res = await fetch('/api/impossible-levels');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.levels) && data.levels.length > 0) {
            setImpossibleLevels(data.levels);
          }
        }
      } catch (e) {
        console.warn('Impossible levels API fetch notice:', e);
      }
    }
    loadImpossibleLevels();
  }, []);

  // Fetch Daily Hardest with real-time listener (onSnapshot)
  useEffect(() => {
    try {
      const q = query(collection(db, 'leaderboard'), orderBy('demonPosition', 'asc'), limit(1));
      const unsubscribe = onSnapshot(
        q,
        (snap: any) => {
          if (!snap.empty) {
            const top = snap.docs[0].data();
            setDailyHardest({
              username: String(top.username || ''),
              demonName: String(top.demonName || ''),
              demonPosition: Number(top.demonPosition || 0),
            });
          }
        },
        (error: any) => {
          console.warn('Daily Hardest onSnapshot notice:', error);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Daily Hardest setup notice:', e);
    }
  }, []);

  // Submit to Leaderboard with number conversions and high-score check
  async function submitToLeaderboard(res?: RollResult) {
    if (!user || !profileRef.current) return;

    const currentProf = profileRef.current;
    const targetDemon = res ? res.demon : currentProf.stats.hardestDemon;
    if (!targetDemon) return;

    const isIll = Boolean(targetDemon.isImpossible);
    const newPosition = isIll ? Number(targetDemon.position) + ILL_LEADERBOARD_OFFSET : Number(targetDemon.position);
    const newRarity = Number(targetDemon.baseRarity || 0);
    const newRolls = Number(res ? res.rollNumber : currentProf.stats.totalRolls);
    const newTimestamp = Number(Date.now());

    try {
      const docRef = doc(db, 'leaderboard', user.uid);
      const docSnap = await getDoc(docRef);

      let shouldUpdate = true;
      if (docSnap.exists()) {
        const existing = docSnap.data();
        const existingPosition = Number(existing.demonPosition || 9999);
        const existingRolls = Number(existing.rollsCount || 0);

        // Lower position is harder/better (e.g. #1 is harder than #150).
        if (newPosition > existingPosition) {
          shouldUpdate = false;
        } else if (newPosition === existingPosition && newRolls >= existingRolls) {
          shouldUpdate = false;
        }
      }

      if (shouldUpdate) {
        await setDoc(docRef, {
          userId: String(user.uid),
          username: String(currentProf.username),
          demonName: String(targetDemon.name),
          demonPosition: newPosition,
          rarity: newRarity,
          rollsCount: newRolls,
          timestamp: newTimestamp,
        });
      }
    } catch (e) {
      console.warn('Leaderboard submission notice:', e);
    }
  }

  // Manual Save Trigger (Forces immediate save and indicator)
  async function handleManualSave() {
    const current = profileRef.current;
    if (!current) return;

    await saveProfileToStorage(current, true);
    if (user && current.stats.hardestDemon) {
      await submitToLeaderboard();
    }
  }

  // Perform Rebirth: Resets upgrades, gives permanent luck/keys multipliers, unlocks ILL at Tier 1
  function handleRebirth() {
    const current = profileRef.current;
    if (!current) return;
    const currentRebirth = current.upgrades.rebirthCount || 0;
    if (currentRebirth >= 3) return; // Max Tier

    const nextTier = REBIRTH_TIERS[currentRebirth + 1];
    if (!nextTier || current.stats.currentKeys < nextTier.cost) return;

    const newRebirthCount = currentRebirth + 1;
    const startingKeys = 2500; // 5x starting keys bonus
    const updated: PlayerProfile = {
      ...current,
      upgrades: {
        luckLevel: 0,
        hasQuickRoll: false,
        quickRollSpeedLevel: 0,
        hasAutoRoll: false,
        keysMultiplierLevel: 0,
        pityTierLevel: 0,
        streakChargeLevel: 0,
        rebirthCount: newRebirthCount,
      },
      stats: {
        ...current.stats,
        currentKeys: startingKeys,
        streakWithoutTop150: 0,
      },
      settings: {
        ...current.settings,
        autoRoll: false,
        quickRoll: false,
      },
    };

    setProfile(updated);
    profileRef.current = updated;
    saveProfileToStorage(updated, true);
    setTriggerScreenShake(true);
    sound.playGriefCinematic();
  }

  // Sync mute state
  useEffect(() => {
    if (profile) sound.setMuted(!profile.settings.soundEnabled);
  }, [profile?.settings.soundEnabled]);

  // Trigger Roll
  function handleRoll() {
    const currentProf = profileRef.current;
    if (!currentProf || isSpinningRef.current || (demons.length === 0 && impossibleLevels.length === 0) || activeCutsceneRef.current || isRollingRef.current) return;

    isRollingRef.current = true;
    isSpinningRef.current = true;

    const nextRollNumber = currentProf.stats.totalRolls + 1;
    const hardestDemon = currentProf.stats.hardestDemon;

    const result = executeRoll(
      demons,
      currentProf.upgrades,
      nextRollNumber,
      hardestDemon,
      currentProf.stats.streakWithoutTop150,
      undefined,
      impossibleLevels,
      false
    );

    setPendingRollResult(result);
    pendingRollResultRef.current = result;
    setIsSpinning(true);
  }

  // Complete Spin
  function handleSpinComplete() {
    isRollingRef.current = false;
    isSpinningRef.current = false;
    setIsSpinning(false);

    if (!pendingRollResultRef.current || !profileRef.current) {
      setPendingRollResult(null);
      pendingRollResultRef.current = null;
      return;
    }

    const currentProf = profileRef.current;
    const result = pendingRollResultRef.current;
    setCurrentResult(result);
    setPendingRollResult(null);
    pendingRollResultRef.current = null;

    let cutsceneTypeToTrigger: 'normal' | 'ill-first' | 'ill-top1' | 'ill-top10' | 'ill-top100' | undefined = undefined;
    let markFirstIllSeen = false;

    if (result.demon.isImpossible || result.tier === 'impossible') {
      if (!currentProf.stats.hasSeenFirstILL) {
        cutsceneTypeToTrigger = 'ill-first';
        markFirstIllSeen = true;
      } else if (result.demon.position === 1) {
        cutsceneTypeToTrigger = 'ill-top1';
      } else if (result.demon.position <= 10) {
        cutsceneTypeToTrigger = 'ill-top10';
      } else if (result.demon.position <= 100) {
        cutsceneTypeToTrigger = 'ill-top100';
      }
      setActiveCutscene({ ...result, cutsceneType: cutsceneTypeToTrigger });
      activeCutsceneRef.current = { ...result, cutsceneType: cutsceneTypeToTrigger };
    } else if (result.tier === 'top1' || result.tier === 'top10' || result.tier === 'top150') {
      setActiveCutscene({ ...result, cutsceneType: 'normal' });
      activeCutsceneRef.current = { ...result, cutsceneType: 'normal' };
    } else if (result.demon.position <= 500) {
      sound.playRareChime();
    } else {
      sound.playCommonChime();
    }

    const isPB = result.isNewPersonalBest;
    const newHardest = isPB ? result.demon : currentProf.stats.hardestDemon;
    const newHardestRollNum = isPB ? result.rollNumber : currentProf.stats.hardestRollNumber;
    const newHardestTimestamp = isPB ? Date.now() : currentProf.stats.hardestTimestamp;

    const isSessionPB = isHarder(result.demon, currentProf.stats.sessionHardest);
    const newSessionHardest = isSessionPB ? result.demon : currentProf.stats.sessionHardest;

    const unlocked = currentProf.stats.unlockedDemonIds.includes(result.demon.id)
      ? currentProf.stats.unlockedDemonIds
      : [...currentProf.stats.unlockedDemonIds, result.demon.id];

    const lightweightResult: RollResult = {
      ...result,
      demon: {
        id: result.demon.id,
        name: result.demon.name,
        position: result.demon.position,
        publisher: result.demon.publisher || 'Unknown',
        verifier: result.demon.verifier || 'Unknown',
        points: result.demon.points || 0,
        baseRarity: result.demon.baseRarity || 1,
        level_id: result.demon.level_id || null,
        tags: result.demon.tags || [],
      },
    };
    const recent = [lightweightResult, ...currentProf.stats.recentRolls.slice(0, 19)];
    const newStreak = result.demon.position <= 150 ? 0 : currentProf.stats.streakWithoutTop150 + 1;

    let shouldStopAutoRoll = false;
    if (currentProf.settings.autoRoll) {
      if (result.demon.isImpossible) {
        const stopIll = currentProf.settings.autoRollStopRankIll;
        if (stopIll !== null && stopIll !== undefined && result.demon.position <= stopIll) {
          shouldStopAutoRoll = true;
          sound.playRareChime();
        }
      } else {
        const stopAredl = currentProf.settings.autoRollStopRankAredl ?? currentProf.settings.autoRollStopRank;
        if (stopAredl !== null && stopAredl !== undefined && result.demon.position <= stopAredl) {
          shouldStopAutoRoll = true;
          sound.playRareChime();
        }
      }
    }

    const nextProfile: PlayerProfile = {
      ...currentProf,
      lastActive: Date.now(),
      settings: {
        ...currentProf.settings,
        autoRoll: shouldStopAutoRoll ? false : currentProf.settings.autoRoll,
      },
      stats: {
        ...currentProf.stats,
        totalRolls: result.rollNumber,
        totalKeysEarned: currentProf.stats.totalKeysEarned + result.keysEarned,
        currentKeys: currentProf.stats.currentKeys + result.keysEarned,
        hardestDemon: newHardest,
        hardestRollNumber: newHardestRollNum,
        hardestTimestamp: newHardestTimestamp,
        unlockedDemonIds: unlocked,
        recentRolls: recent,
        sessionHardest: newSessionHardest,
        streakWithoutTop150: newStreak,
        hasSeenFirstILL: currentProf.stats.hasSeenFirstILL || markFirstIllSeen,
      },
    };

    setProfile(nextProfile);
    saveProfileToStorage(nextProfile, false);

    if (isPB) {
      submitToLeaderboard(result);
    }

    // Trigger next Auto Roll immediately if active
    lastAutoRollTimestampRef.current = 0;
  }

  // High-reliability Auto Roll Ticker Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const currentProf = profileRef.current;
      if (!currentProf?.settings.autoRoll || !currentProf?.upgrades.hasAutoRoll) {
        return;
      }

      if (
        isSpinningRef.current ||
        isRollingRef.current ||
        pendingRollResultRef.current ||
        activeCutsceneRef.current ||
        showLogoutConfirmRef.current
      ) {
        return;
      }

      const speedLevel = currentProf.upgrades.quickRollSpeedLevel || 0;
      const speedTier = QUICK_ROLL_SPEED_LEVELS[speedLevel] || QUICK_ROLL_SPEED_LEVELS[0];
      const delayMs = currentProf.settings.quickRoll ? speedTier.autoDelayMs : 1200;

      const now = Date.now();
      if (now - lastAutoRollTimestampRef.current >= delayMs) {
        lastAutoRollTimestampRef.current = now;
        handleRollRef.current();
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isGuest && !profile) {
    return (
      <LoginPage
        onLoginSuccess={() => setIsGuest(false)}
        onContinueAsGuest={() => setIsGuest(true)}
        topDemons={demons.slice(0, 15).map((d) => d.name)}
      />
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#08090d] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-mono text-xs">Loading Profile...</p>
      </div>
    );
  }

  const { totalLuck, streakLuck } = getEffectiveLuck(profile.upgrades, profile.stats?.streakWithoutTop150 || 0);
  const pityTierIndex = Math.min(Math.max(0, profile.upgrades?.pityTierLevel || 0), PITY_LEVELS.length - 1);
  const pityTier = PITY_LEVELS[pityTierIndex] || PITY_LEVELS[0];
  const pityProgress = pityTier.rollsNeeded > 0 ? (profile.stats?.totalRolls || 0) % pityTier.rollsNeeded : 0;
  const displayDemon = pendingRollResult ? pendingRollResult.demon : currentResult ? currentResult.demon : null;

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Atmospheric Backdrop */}
      {displayDemon && (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-20 filter blur-md transition-opacity duration-1000">
          <img
            src={getDemonThumbnailUrl(displayDemon) || 'https://aredl.net/assets/logo.webp'}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://aredl.net/assets/logo.webp';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07080c] via-black/80 to-[#07080c]" />
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
        {user && !user.emailVerified && !user.email?.endsWith('@aredl.game') && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 py-1.5 px-4 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs font-medium text-amber-300 uppercase tracking-widest">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Email Not Verified: Please check your inbox to secure your profile</span>
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="./assets/aistudio/IMG_7950_e702d8b3.png"
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

          <div className="flex items-center gap-2 sm:gap-2.5">
            {profile.upgrades.rebirthCount && profile.upgrades.rebirthCount > 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono font-bold text-xs shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Rebirth {profile.upgrades.rebirthCount} (x{profile.upgrades.rebirthCount * 10})</span>
              </div>
            ) : null}


            {profile.upgrades.luckLevel >= 10 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-400/50 text-purple-200 font-mono text-xs font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>ILL UNLOCKED</span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <img src="./assets/aistudio/IMG_7942_07b1ead5.png" alt="Keys" className="w-4 h-4 object-contain" />
              <span>{formatNumber(profile.stats.currentKeys)}</span>
            </div>

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
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign Out"
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/40 text-zinc-400 hover:text-rose-300 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Play Arena */}
      <main className={`flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col justify-center items-center z-10 transition-transform ${triggerScreenShake ? 'animate-shake' : ''}`}>
        {/* World Record / Daily Hardest Banner */}
        {dailyHardest && (
          <div className="mb-5 w-full max-w-xl px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-zinc-900/90 to-purple-500/10 border border-white/10 flex items-center justify-between text-xs backdrop-blur-md shadow-md">
            <div className="flex items-center gap-2">
              <span className={`p-1 rounded-md ${dailyHardest.demonPosition < 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-rose-500/20 text-rose-400'}`}>
                <Flame className="w-3.5 h-3.5 animate-pulse" />
              </span>
              <span className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider">
                {dailyHardest.demonPosition < 0 ? 'World Impossible' : 'World Hardest'}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold text-amber-400">
                {dailyHardest.demonPosition < 0 ? `ILL #${Math.abs(dailyHardest.demonPosition - ILL_LEADERBOARD_OFFSET)}` : `#${dailyHardest.demonPosition}`}
              </span>
              <span className="text-white font-semibold">{dailyHardest.demonName}</span>
              <span className="text-zinc-500 text-[11px]">by</span>
              <span className="text-cyan-300 font-medium">{dailyHardest.username}</span>
            </div>
          </div>
        )}

        {/* Center Game Board / Spinner / Result Container */}
        <div className="w-full max-w-xl relative min-h-[360px] flex flex-col items-center justify-center">
          <div
            className={`w-full transition-all duration-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 ${
              isSpinning ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <CS2Spinner
              targetDemon={displayDemon}
              allDemons={profile.upgrades.luckLevel >= 10 ? [...demons, ...impossibleLevels] : demons}
              isSpinning={isSpinning}
              isQuickRoll={profile.settings.quickRoll}
              quickRollSpeedLevel={profile.upgrades.quickRollSpeedLevel || 0}
              onSpinComplete={handleSpinComplete}
            />
          </div>

          <div
            className={`w-full relative transition-all duration-300 z-10 ${
              isSpinning ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
            }`}
          >
            <div className={`relative rounded-3xl border overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl min-h-[360px] flex flex-col items-center justify-center p-6 sm:p-8 ${
              currentResult?.demon.isImpossible
                ? 'bg-zinc-950/90 border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.3)]'
                : 'bg-zinc-950/85 border-white/10'
            }`}>
              {currentResult ? (
                <>
                  <div className="absolute inset-0 z-0">
                    <img
                      src={getDemonThumbnailUrl(currentResult.demon) || 'https://aredl.net/assets/logo.webp'}
                      alt={currentResult.demon.name}
                      className="w-full h-full object-cover opacity-60 filter brightness-90"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://aredl.net/assets/logo.webp';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40" />
                  </div>

                  <div className="relative z-10 w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3">
                      <DemonDifficultyIcon size="md" isImpossible={currentResult.demon.isImpossible} />
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span
                          className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider border shadow-sm ${
                            currentResult.demon.isImpossible
                              ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                              : currentResult.demon.position === 1
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : currentResult.demon.position <= 10
                              ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                              : currentResult.demon.position <= 150
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-zinc-900/80 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {currentResult.demon.isImpossible
                            ? `ILL #${currentResult.demon.position} IMPOSSIBLE`
                            : `RANK #${currentResult.demon.position}`}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-zinc-300">
                          1 in {currentResult.effectiveRarity.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <h2 className={`mt-3.5 font-display text-4xl sm:text-5xl font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] tracking-tight ${
                      currentResult.demon.isImpossible
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-300 to-amber-200 animate-pulse'
                        : 'text-white'
                    }`}>
                      {currentResult.demon.name}
                    </h2>

                    {currentResult.demon.tags && currentResult.demon.tags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 max-w-md">
                        {currentResult.demon.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                              currentResult.demon.isImpossible
                                ? 'bg-purple-950/70 border-purple-400/40 text-purple-200'
                                : 'bg-black/60 border-white/15 text-zinc-200'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-2 text-xs sm:text-sm text-zinc-300 font-medium">
                      {currentResult.demon.publisher && currentResult.demon.publisher !== 'Unknown' ? (
                        <>
                          By <span className="text-white font-semibold">{currentResult.demon.publisher}</span>
                          {currentResult.demon.verifier && currentResult.demon.verifier !== 'Unknown' && (
                            <>
                              {' '}· Verified by{' '}
                              <span className="text-amber-300 font-semibold">{currentResult.demon.verifier}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-400 font-mono text-xs">
                          {currentResult.demon.isImpossible
                            ? 'Impossible Levels List (ILL)'
                            : `${currentResult.demon.rating || 'Rated'} Extreme Demon · AREDL #${currentResult.demon.position}`}
                        </span>
                      )}
                    </p>

                    {currentResult.demon.description && (
                      <p className="mt-2 text-[11px] sm:text-xs text-zinc-400 max-w-md line-clamp-2 italic px-3 font-sans">
                        "{currentResult.demon.description}"
                      </p>
                    )}

                    <div className="mt-5 flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                      <img src="./assets/aistudio/IMG_7942_07b1ead5.png" alt="Keys" className="w-4 h-4 object-contain" />
                      <span>+{formatNumber(currentResult.keysEarned)} Demon Keys</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center py-6">
                  {profile.stats.totalRolls === 0 && !isSpinning ? (
                    <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center py-6">
                      <p className="text-xs text-zinc-500 font-mono tracking-wider">Ready to roll</p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 font-mono tracking-wider">Ready for next roll</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HUD Multipliers */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Luck: {totalLuck.toFixed(1)}x</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 shadow-sm">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Pity: {pityProgress}/{pityTier.rollsNeeded || '—'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Best: {profile.stats.hardestDemon ? `#${profile.stats.hardestDemon.position}` : 'None'}</span>
          </div>

          {profile.stats.streakWithoutTop150 > 0 && streakLuck > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 shadow-sm animate-pulse">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Streak: +{streakLuck.toFixed(1)}x</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-5 flex flex-col items-center gap-3.5 w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
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

            <div className="flex flex-wrap items-center justify-center gap-2 w-full text-xs font-mono font-semibold">
              <button
                onClick={() => {
                  if (!profile.upgrades.hasQuickRoll) setShowUpgrades(true);
                  else
                    setProfile((p) => {
                      const updated = { ...p!, settings: { ...p!.settings, quickRoll: !p!.settings.quickRoll } };
                      saveProfileToStorage(updated);
                      return updated;
                    });
                }}
                className={`px-3 py-1.5 rounded-xl border transition-all duration-200 ${
                  profile.settings.quickRoll
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                    : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Quick: {profile.settings.quickRoll ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={() => {
                  if (!profile.upgrades.hasAutoRoll) setShowUpgrades(true);
                  else
                    setProfile((p) => {
                      const updated = { ...p!, settings: { ...p!.settings, autoRoll: !p!.settings.autoRoll } };
                      saveProfileToStorage(updated);
                      return updated;
                    });
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

              {profile.upgrades.hasAutoRoll && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* AREDL Stop Rank */}
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-cyan-500/30 text-xs"
                    title="Stop Auto Roll if an AREDL level rank is <= this number"
                  >
                    <span className="text-cyan-300 font-bold text-[11px] font-mono">AREDL ≤</span>
                    <input
                      type="number"
                      min="1"
                      max="1644"
                      placeholder="Rank"
                      value={profile.settings.autoRollStopRankAredl ?? profile.settings.autoRollStopRank ?? ''}
                      onChange={(e) =>
                        setProfile((p) => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value);
                          const updated = {
                            ...p!,
                            settings: {
                              ...p!.settings,
                              autoRollStopRankAredl: val,
                              autoRollStopRank: val,
                            },
                          };
                          saveProfileToStorage(updated);
                          return updated;
                        })
                      }
                      className="w-14 bg-zinc-800/80 border border-cyan-500/30 rounded-lg text-cyan-200 text-center font-bold text-xs py-0.5 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  {/* ILL Stop Rank */}
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-purple-500/30 text-xs"
                    title="Stop Auto Roll if an Impossible Level (ILL) rank is <= this number"
                  >
                    <span className="text-purple-300 font-bold text-[11px] font-mono">ILL ≤</span>
                    <input
                      type="number"
                      min="1"
                      max="2097"
                      placeholder="Rank"
                      value={profile.settings.autoRollStopRankIll ?? ''}
                      onChange={(e) =>
                        setProfile((p) => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value);
                          const updated = {
                            ...p!,
                            settings: {
                              ...p!.settings,
                              autoRollStopRankIll: val,
                            },
                          };
                          saveProfileToStorage(updated);
                          return updated;
                        })
                      }
                      className="w-14 bg-zinc-800/80 border border-purple-500/30 rounded-lg text-purple-200 text-center font-bold text-xs py-0.5 focus:outline-none focus:border-purple-400 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

      {/* Recent Rolls Footer Strip */}
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




      {/* Modals & Overlays */}
      {activeCutscene && (
        <CutsceneOverlay
          demon={activeCutscene.demon}
          rollNumber={activeCutscene.rollNumber}
          cutsceneType={activeCutscene.cutsceneType}
          onClose={() => {
            setActiveCutscene(null);
            activeCutsceneRef.current = null;
          }}
        />
      )}

      {showLogoutConfirm && (
        <LogoutConfirmModal
          onConfirm={handleLogout}
          onCancel={() => {
            setShowLogoutConfirm(false);
            showLogoutConfirmRef.current = false;
          }}
        />
      )}

      {showUpgrades && (
        <UpgradesModal
          upgrades={profile.upgrades}
          stats={profile.stats}
          onClose={() => setShowUpgrades(false)}
          onRebirth={handleRebirth}
          onUpgradeLuck={(cost) => {
            const current = profileRef.current;
            if (!current) return;
            const updated = {
              ...current,
              stats: { ...current.stats, currentKeys: current.stats.currentKeys - cost },
              upgrades: { ...current.upgrades, luckLevel: current.upgrades.luckLevel + 1 },
            };
            setProfile(updated);
            saveProfileToStorage(updated, false);
          }}
          onUpgradeKeysMult={(cost) => {
            const current = profileRef.current;
            if (!current) return;
            const updated = {
              ...current,
              stats: { ...current.stats, currentKeys: current.stats.currentKeys - cost },
              upgrades: { ...current.upgrades, keysMultiplierLevel: current.upgrades.keysMultiplierLevel + 1 },
            };
            setProfile(updated);
            saveProfileToStorage(updated, false);
          }}
          onUpgradePity={(cost) => {
            const current = profileRef.current;
            if (!current) return;
            const updated = {
              ...current,
              stats: { ...current.stats, currentKeys: current.stats.currentKeys - cost },
              upgrades: { ...current.upgrades, pityTierLevel: current.upgrades.pityTierLevel + 1 },
            };
            setProfile(updated);
            saveProfileToStorage(updated, false);
          }}
          onUpgradeStreak={(cost) => {
            const current = profileRef.current;
            if (!current) return;
            const updated = {
              ...current,
              stats: { ...current.stats, currentKeys: current.stats.currentKeys - cost },
              upgrades: { ...current.upgrades, streakChargeLevel: current.upgrades.streakChargeLevel + 1 },
            };
            setProfile(updated);
            saveProfileToStorage(updated, false);
          }}
          onBuyQuickRoll={(cost) => {
            const current = profileRef.current;
            if (!current) return;
            const updated = {
              ...current,
              stats: { ...current.stats, currentKeys: current.stats.currentKeys - cost },
              upgrades: { ...current.upgrades, hasQuickRoll: true },
              settings: { ...current.settings, quickRoll: true },
            };
            setProfile(updated);
            saveProfileToStorage(updated, false);
          }}
          onUpgradeQuickRollSpeed={(cost) => {
            const current = profileRef.current;
            if (!current) return;
            const updated = {
              ...current,
              stats: { ...current.stats, currentKeys: current.stats.currentKeys - cost },
              upgrades: {
                ...current.upgrades,
                quickRollSpeedLevel: (current.upgrades.quickRollSpeedLevel || 0) + 1,
              },
            };
            setProfile(updated);
            saveProfileToStorage(updated, false);
          }}
          onBuyAutoRoll={(cost) => {
            const current = profileRef.current;
            if (!current) return;
            const updated = {
              ...current,
              stats: { ...current.stats, currentKeys: current.stats.currentKeys - cost },
              upgrades: { ...current.upgrades, hasAutoRoll: true },
              settings: { ...current.settings, autoRoll: true },
            };
            setProfile(updated);
            saveProfileToStorage(updated, false);
          }}
        />
      )}

      {showStats && (
        <StatTrackerModal
          stats={profile.stats}
          allDemons={demons}
          impossibleLevels={impossibleLevels}
          dailyHardest={dailyHardest}
          onClose={() => setShowStats(false)}
          onReplayCutscene={(demon) =>
            setActiveCutscene({
              demon,
              effectiveRarity: demon.baseRarity,
              rollNumber: profile.stats.totalRolls,
              timestamp: Date.now(),
              keysEarned: 0,
              isNewPersonalBest: false,
              tier: demon.isImpossible ? 'impossible' : demon.position === 1 ? 'top1' : demon.position <= 10 ? 'top10' : 'top150',
              cutsceneType: demon.isImpossible
                ? demon.position === 1
                  ? 'ill-top1'
                  : demon.position <= 10
                  ? 'ill-top10'
                  : 'ill-top100'
                : 'normal',
            })
          }
        />
      )}

      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

      {showProfile && (
        <SaveProfileModal
          profile={profile}
          user={user}
          onUpdateProfileName={(n) => {
            const current = profileRef.current;
            if (!current) return;
            const updated = { ...current, username: sanitizeUsername(n) };
            setProfile(updated);
            saveProfileToStorage(updated, true);
            if (current.stats.hardestDemon) {
              submitToLeaderboard();
            }
          }}
          onManualSave={handleManualSave}
          onResetSave={async () => {
            if (user) {
              try {
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
      {showAutosaveNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border-2 border-amber-500/50 p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-black text-white tracking-tight uppercase">New Update!</h2>
                <p className="text-xs text-amber-400/80 font-mono font-bold tracking-widest uppercase">Version 2.0 • Rebalance & Visuals</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Crown className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Open Window Apex</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">Top 1 ILL has been renamed to Open Window with a brand new cinematic experience.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Scaling Key Boost & Rebalance</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">Rebirthing now grants a Demon Key multiplier that scales per tier (T1: 5x, T2: 7.5x, T3: 10x). ILL levels give 80% fewer keys (1/5).</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded-md bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">ILL Visual Overhaul</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">Unique gradients and matrix effects added for all Impossible Level pulls and cutscenes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded-md bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Shop progression</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">ILL Pities are now locked behind Rebirth. Admin panel removed for a fairer experience.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={dismissNoticeChecked}
                    onChange={(e) => setDismissNoticeChecked(e.target.checked)}
                  />
                  <div className="w-5 h-5 border-2 border-white/20 rounded-md bg-zinc-900 peer-checked:bg-amber-500 peer-checked:border-amber-400 transition-all" />
                  <Check className="absolute w-3.5 h-3.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors font-sans">Don't show this update notice again</span>
              </label>

              <button
                onClick={() => {
                  if (dismissNoticeChecked) {
                    localStorage.setItem('AREDL_RNG_DISMISS_AUTOSAVE_NOTICE', 'true');
                  }
                  setShowAutosaveNotice(false);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-display font-bold text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(249,115,22,0.3)] transition transform active:scale-95"
              >
                Let's Roll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
