import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { DemonLevel } from '../game/types';
import { sound } from '../game/sound';
import { DemonDifficultyIcon } from './DemonDifficultyIcon';
import { RatingBadge } from './RatingBadge';
import { DemonThumbnail } from './DemonThumbnail';
import { AlertTriangle, Sparkles, X, Trophy, Activity, Zap, Shield, Flame } from 'lucide-react';

interface Props {
  demon: DemonLevel;
  rollNumber: number;
  onClose: () => void;
  cutsceneType?: 'normal' | 'ill-first' | 'ill-top1' | 'ill-top10' | 'ill-top100';
}

type CutscenePhase = 'intro' | 'breach' | 'shatter' | 'climax';

export const CutsceneOverlay: React.FC<Props> = ({ demon, rollNumber, onClose, cutsceneType }) => {
  const [phase, setPhase] = useState<CutscenePhase>('intro');
  const [pulseCount, setPulseCount] = useState<number>(0);
  const pos = demon.position;
  const isIll = demon.isImpossible || cutsceneType?.startsWith('ill');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Compute resolved cutscene type
  const effectiveCutsceneType = cutsceneType || (
    isIll
      ? pos === 1
        ? 'ill-top1'
        : pos <= 10
        ? 'ill-top10'
        : pos <= 100
        ? 'ill-top100'
        : 'ill-first'
      : 'normal'
  );

  useEffect(() => {
    // Keyboard listener for Space/Escape to skip
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (pos === 1 && !isIll) {
      sound.playGriefCinematic();
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play().catch((err) => {
          console.warn("Mobile autoplay prevented:", err);
          onClose();
        });
      }
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else if (isIll || pos <= 10) {
      sound.playTop10Cinematic();
      
      const pInterval = setInterval(() => {
        setPulseCount((c) => c + 1);
      }, 350);

      const t1 = setTimeout(() => setPhase('breach'), 1500);
      const t2 = setTimeout(() => setPhase('shatter'), 3000);
      const t3 = setTimeout(() => {
        setPhase('climax');
        triggerConfetti(pos === 1);
      }, 4500);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        clearInterval(pInterval);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      sound.playTop150Slam();
      const t1 = setTimeout(() => setPhase('climax'), 300);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        clearTimeout(t1);
      };
    }
  }, [pos, isIll, onClose]);

  const triggerConfetti = (isTop1: boolean) => {
    if (isTop1) {
      const end = Date.now() + 3500;
      const colors = ['#f59e0b', '#fbbf24', '#fb923c', '#ea580c', '#ffffff'];
      const frame = () => {
        confetti({
          particleCount: 6,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
          colors,
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else {
      confetti({
        particleCount: 90,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#8b5cf6', '#ec4899', '#f59e0b', '#ffffff'],
      });
    }
  };

  // 1. TOP 1 GRIEF OR OPEN WINDOW APEX CUTSCENE (MOBILE FIXED)
  if (pos === 1) {
    const videoSrc = isIll 
      ? `/assets/aistudio/ScreenRecording_10-29-2026_14-38-21_1_08bf3413.mov`
      : `${import.meta.env.BASE_URL || ''}assets/videos/grief_cutscene.mp4`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden select-none">
        <button
          onClick={(e) => {
            e.stopPropagation();
            sound.playSFX('shatter');
            onClose();
          }}
          className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold tracking-wide border border-white/10 shadow-lg cursor-pointer"
        >
          <span>Skip</span>
          <X className="w-3.5 h-3.5" />
        </button>

        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          // @ts-ignore
          webkit-playsinline="true"
          preload="auto"
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error("Video failed to load:", e.currentTarget.error);
            onClose();
          }}
          onEnded={() => {
            sound.playSFX('shatter');
            // @ts-ignore
            if (typeof window.setTriggerScreenShake === 'function') {
              // @ts-ignore
              window.setTriggerScreenShake(true);
            }
            onClose();
          }}
        >
          <source src={videoSrc} />
        </video>
      </div>
    );
  }

  // 2. ILL OR TOP 10 CINEMATIC CUTSCENE
  if (isIll || pos <= 10) {
    const isIllTop1 = effectiveCutsceneType === 'ill-top1';
    const isIllTop10 = effectiveCutsceneType === 'ill-top10';
    const isIllTop100 = effectiveCutsceneType === 'ill-top100';
    const isIllFirst = effectiveCutsceneType === 'ill-first';

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl overflow-hidden select-none"
        onClick={onClose}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold tracking-wide border border-white/10 shadow-lg"
        >
          <span>Skip</span>
          <X className="w-3.5 h-3.5" />
        </button>

        <div className={`absolute inset-0 pointer-events-none ${
          isIllTop1
            ? 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,rgba(168,85,247,0.5)_30%,rgba(30,27,75,0.9)_60%,rgba(0,0,0,1)_95%)]'
            : isIll
            ? 'bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.3)_0%,rgba(88,28,135,0.7)_40%,rgba(0,0,0,0.98)_85%)]'
            : 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.22)_0%,rgba(15,23,42,0.6)_45%,rgba(0,0,0,0.98)_80%)]'
        }`} />
        <div className={`absolute inset-0 opacity-15 pointer-events-none ${
          isIll ? 'bg-[radial-gradient(#f472b6_1px,transparent_1px)]' : 'bg-[radial-gradient(#8b5cf6_1px,transparent_1px)]'
        } [background-size:24px_24px]`} />

        {phase === 'intro' && (
          <div className="flex flex-col items-center justify-center text-center px-4 max-w-xl animate-in fade-in slide-in-from-top-8 duration-1000">
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-full border-2 border-purple-500/40 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-purple-400/80 animate-ping" />
              </div>
              <Activity className="w-10 h-10 text-purple-400 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 font-mono text-xs uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isIllTop1
                  ? 'TRANSCENDENTAL SINGULARITY • TOP 1 ILL'
                  : isIllFirst
                  ? 'FIRST IMPOSSIBLE LEVEL DISCOVERED'
                  : isIllTop10
                  ? 'TOP 10 IMPOSSIBLE BREACH'
                  : isIllTop100
                  ? 'TOP 100 IMPOSSIBLE CLASS DETECTED'
                  : 'DIMENSIONAL ANOMALY DETECTED'}
              </span>
            </div>

            <h3 className={`text-4xl md:text-5xl font-display font-black tracking-tight uppercase ${
              isIllTop1 ? 'text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]' : 'text-white'
            }`}>
              {isIllTop1
                ? 'OPEN WINDOW APEX'
                : isIllFirst
                ? 'FIRST ILL AWAKENING'
                : isIllTop10
                ? 'TOP 10 IMPOSSIBLE'
                : isIllTop100
                ? 'TOP 100 ILL RIFT'
                : 'TOP 10 FREQUENCY'}
            </h3>
            
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-zinc-400 font-mono text-xs tracking-wider animate-in fade-in slide-in-from-top-4 duration-700 delay-300">
                {isIll ? 'PHYSICS-BREAKING HARMONICS DETECTED • 1440 FPS' : 'HEARTBEAT FREQUENCY SYNCHRONIZING • BPM 80'}
              </p>
              <p className="text-purple-400 font-mono text-2xl font-bold tracking-[1em] animate-in fade-in slide-in-from-top-6 duration-1000 delay-500">
                ...
              </p>
            </div>
          </div>
        )}

        {phase === 'breach' && (
          <div className="flex flex-col items-center justify-center text-center px-4 max-w-xl animate-in fade-in slide-in-from-top-8 duration-700">
            <div className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-violet-950/90 border border-violet-400 text-violet-200 font-mono text-xs tracking-widest uppercase mb-6 shadow-[0_0_25px_rgba(168,85,247,0.5)]">
              <Activity className="w-4 h-4 text-rose-400 animate-spin" />
              <span>PIERCING THE TOP 10 RIFT</span>
            </div>

            <div className="w-full max-w-md bg-zinc-900/80 rounded-full h-3 border border-violet-500/50 overflow-hidden mb-6 p-0.5 shadow-inner">
              <div className="h-full bg-gradient-to-r from-violet-500 via-rose-500 to-amber-400 rounded-full animate-pulse transition-all duration-700 w-[88%]" />
            </div>

            <h2 className={`text-3xl md:text-5xl font-black font-display tracking-wide uppercase text-transparent bg-clip-text ${
              isIll 
                ? 'bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-300' 
                : 'bg-gradient-to-r from-violet-300 via-rose-300 to-amber-300'
            }`}>
              SEAL COLLAPSING
            </h2>

            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  PULSE: 175 BPM
                </span>
                <span>•</span>
                <span className="text-violet-300 font-medium">RANK #1 - #10 THRESHOLD</span>
              </div>
              <p className="text-amber-400 font-mono text-3xl font-bold tracking-[1.5em] animate-in fade-in slide-in-from-top-10 duration-1000 delay-300">
                ...
              </p>
            </div>
          </div>
        )}

        {phase === 'shatter' && (
          <div className="flex flex-col items-center justify-center text-center px-4 max-w-xl animate-in zoom-in-110 duration-200">
            <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-violet-600 via-rose-500 to-amber-400 blur-3xl opacity-70 animate-pulse pointer-events-none" />
            <h2 className="text-5xl md:text-7xl font-black font-display tracking-tight text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.9)] uppercase animate-pulse">
              CONVERGENCE
            </h2>
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="font-mono text-xs md:text-sm tracking-widest text-violet-300 uppercase">
                THE MATRIX HAS SHATTERED
              </p>
              <p className="text-rose-500 font-mono text-4xl font-bold tracking-[1.2em] animate-in fade-in slide-in-from-top-12 duration-1000 delay-200">
                ...
              </p>
            </div>
          </div>
        )}

        {phase === 'climax' && (
          <div className="flex flex-col items-center justify-center text-center px-4 max-w-3xl animate-in zoom-in-95 duration-400">
            <div className="w-full max-w-md mb-4 rounded-2xl overflow-hidden border-2 border-violet-500/70 shadow-[0_0_35px_rgba(139,92,246,0.45)] group">
              <DemonThumbnail
                levelId={demon.level_id}
                demonName={demon.name}
              />
            </div>

            <div className="flex items-center gap-3">
              <DemonDifficultyIcon position={pos} size="lg" />
              <RatingBadge rating={demon.rating || 'Legendary'} size="md" />
            </div>

            <div className={`mt-3 px-5 py-1.5 rounded-full border text-xs md:text-sm tracking-widest uppercase font-bold shadow-lg ${
              isIllTop1
                ? 'bg-gradient-to-r from-amber-500/30 via-purple-600/40 to-pink-500/30 border-amber-400 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                : isIllFirst
                ? 'bg-gradient-to-r from-purple-900/90 via-pink-900/90 to-purple-900/90 border-pink-400 text-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.4)]'
                : isIll
                ? 'bg-gradient-to-r from-purple-950/90 via-violet-900/90 to-purple-950/90 border-purple-400 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                : 'bg-gradient-to-r from-violet-950/90 via-purple-900/90 to-violet-950/90 border-violet-400/70 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.4)]'
            }`}>
              {isIllTop1
                ? 'TOP 1 IMPOSSIBLE DEMON • APEX SINGULARITY'
                : isIllFirst
                ? 'FIRST IMPOSSIBLE DEMON UNLOCKED'
                : isIllTop10
                ? `TOP 10 IMPOSSIBLE DEMON • RANK #${pos}`
                : isIllTop100
                ? `TOP 100 IMPOSSIBLE DEMON • RANK #${pos}`
                : `TOP 10 EXTREME DEMON • RANK #${pos}`}
            </div>

            <h1 className="mt-3 font-display text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(168,85,247,0.8)]">
              {demon.name}
            </h1>

            {isIllTop1 && (
              <div className="mt-2 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono text-sm font-black flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                <span>👑</span>
                <span>+5,000,000 DEMON KEYS REWARD</span>
              </div>
            )}

            <p className="mt-2 text-zinc-300 text-sm max-w-xl font-sans">
              Published by <span className="text-violet-300 font-semibold">{demon.publisher}</span> • Verified by <span className="text-amber-300 font-semibold">{demon.verifier}</span>
              {demon.fps && <span className="ml-1 text-purple-400 font-mono">({demon.fps} FPS)</span>}
            </p>
            {demon.tags && demon.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {demon.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-md bg-violet-900/50 border border-violet-500/30 text-violet-300 text-[10px] font-medium uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-mono">
              <span className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-violet-700/60 text-violet-300 font-semibold">
                Rarity: 1 in {demon.baseRarity.toLocaleString()}
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-emerald-300 font-semibold">
                Roll #{rollNumber}
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-cyan-300 font-semibold">
                +{demon.points} Points
              </span>
            </div>

            <button
              onClick={onClose}
              className="mt-6 px-8 py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-display font-bold text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(139,92,246,0.6)] transition transform hover:scale-105 active:scale-95"
            >
              Claim Demon
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. TOP 150 MAIN LIST CUTSCENE
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden select-none"
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700"
      >
        <span>Skip</span>
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 animate-pulse" />
      <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 animate-pulse" />

      <div className="flex flex-col items-center justify-center text-center px-4 max-w-2xl animate-in zoom-in-75 duration-200">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-950/80 border border-orange-500 text-orange-400 font-bold text-xs tracking-widest uppercase mb-3 shadow-[0_0_12px_rgba(249,115,22,0.5)]">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span>MAIN LIST EXTREME DEMON!</span>
        </div>

        <div className="w-full max-w-sm mb-3 rounded-2xl overflow-hidden border border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.35)]">
          <DemonThumbnail
            levelId={demon.level_id}
            demonName={demon.name}
          />
        </div>

        <div className="flex items-center gap-3">
          <DemonDifficultyIcon position={pos} size="md" />
          <RatingBadge rating={demon.rating || 'Epic'} size="sm" />
        </div>

        <h2 className="mt-2 text-3xl md:text-5xl font-black text-orange-400 tracking-tight drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]">
          {demon.name}
        </h2>

        <div className="mt-1 text-zinc-300 text-sm">
          Rank <span className="font-extrabold text-amber-400">#{pos}</span> on AREDL • By {demon.publisher}
        </div>
        {demon.tags && demon.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {demon.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-orange-900/40 border border-orange-500/30 text-orange-300 text-[10px] font-semibold uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-3 text-xs font-mono">
          <span className="px-3 py-1 rounded bg-zinc-900 border border-orange-900 text-orange-300">
            Rarity: 1 in {demon.baseRarity.toLocaleString()}
          </span>
          <span className="px-3 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
            Roll #{rollNumber}
          </span>
        </div>

        <button
          onClick={onClose}
          className="mt-6 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs md:text-sm tracking-wider uppercase transition shadow-lg transform hover:scale-105 active:scale-95"
        >
          Collect
        </button>
      </div>
    </div>
  );
};
