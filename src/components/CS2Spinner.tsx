import React, { useEffect, useRef, useState } from 'react';
import { DemonLevel } from '../game/types';
import { sound } from '../game/sound';
import { QUICK_ROLL_SPEED_LEVELS } from '../game/rng';

interface Props {
  targetDemon: DemonLevel | null;
  allDemons: DemonLevel[];
  impossibleLevels?: DemonLevel[];
  isSpinning: boolean;
  isQuickRoll: boolean;
  quickRollSpeedLevel?: number;
  activeSpeedLevel?: number | null;
  onSpinComplete: () => void;
}

interface ReelCard {
  id: string;
  rank: number;
  demon: DemonLevel;
  isTarget?: boolean;
  isIllSpot?: boolean;
}

export const CS2Spinner: React.FC<Props> = ({
  targetDemon,
  allDemons,
  impossibleLevels = [],
  isSpinning,
  isQuickRoll,
  quickRollSpeedLevel = 0,
  activeSpeedLevel = null,
  onSpinComplete,
}) => {
  const [currentStage, setCurrentStage] = useState<'idle' | 'stage1' | 'stage2'>('idle');
  const [cards1, setCards1] = useState<ReelCard[]>([]);
  const [cards2, setCards2] = useState<ReelCard[]>([]);
  const [translateX1, setTranslateX1] = useState<number>(0);
  const [translateX2, setTranslateX2] = useState<number>(0);
  const [activeTransition1, setActiveTransition1] = useState<boolean>(false);
  const [activeTransition2, setActiveTransition2] = useState<boolean>(false);
  const [showIllBanner, setShowIllBanner] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const targetIndex = 36;
  const isSpinningRef = useRef<boolean>(false);

  const timersRef = useRef<{
    tick1?: NodeJS.Timeout;
    tick2Timers?: NodeJS.Timeout[];
    start1?: NodeJS.Timeout;
    finish1?: NodeJS.Timeout;
    pause?: NodeJS.Timeout;
    start2?: NodeJS.Timeout;
    finish2?: NodeJS.Timeout;
  }>({ tick2Timers: [] });

  const clearAllTimers = () => {
    if (timersRef.current.tick1) clearInterval(timersRef.current.tick1);
    if (timersRef.current.tick2Timers) {
      timersRef.current.tick2Timers.forEach((t) => clearTimeout(t));
      timersRef.current.tick2Timers = [];
    }
    if (timersRef.current.start1) clearTimeout(timersRef.current.start1);
    if (timersRef.current.finish1) clearTimeout(timersRef.current.finish1);
    if (timersRef.current.pause) clearTimeout(timersRef.current.pause);
    if (timersRef.current.start2) clearTimeout(timersRef.current.start2);
    if (timersRef.current.finish2) clearTimeout(timersRef.current.finish2);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
      isSpinningRef.current = false;
    };
  }, []);

  const effectiveSpeedLevel =
    activeSpeedLevel !== null && activeSpeedLevel !== undefined
      ? Math.min(quickRollSpeedLevel, Math.max(0, activeSpeedLevel))
      : quickRollSpeedLevel;

  // Trigger spin logic on isSpinning transition
  useEffect(() => {
    if (isSpinning && !isSpinningRef.current) {
      if (!targetDemon || allDemons.length === 0) {
        onSpinComplete();
        return;
      }

      isSpinningRef.current = true;
      clearAllTimers();

      const isIll = Boolean(targetDemon.isImpossible);
      const cardWidth = 120;
      const gap = 8;
      const cardTotal = cardWidth + gap;
      const containerWidth = containerRef.current?.offsetWidth || 800;

      const speedTier = QUICK_ROLL_SPEED_LEVELS[effectiveSpeedLevel] || QUICK_ROLL_SPEED_LEVELS[0];

      if (isIll) {
        // ==========================================
        // TWO-STAGE ROULETTE FOR IMPOSSIBLE LEVEL
        // ==========================================
        setCurrentStage('stage1');
        setShowIllBanner(true);

        const illDummyDemon: DemonLevel = {
          id: 'ill-dummy',
          name: '⚡ ANOMALY DETECTED ⚡',
          position: 0,
          baseRarity: 10000000,
          isImpossible: true,
          publisher: 'ANOMALY',
          verifier: 'SYSTEM',
          points: 99999,
        };

        // 1. Build Stage 1 Reel (AREDL fillers + ILL slot at targetIndex)
        const list1: ReelCard[] = [];
        for (let i = 0; i < 50; i++) {
          if (i === targetIndex) {
            list1.push({
              id: `ill-target-1-${Date.now()}`,
              rank: 0,
              demon: illDummyDemon,
              isTarget: true,
              isIllSpot: true,
            });
          } else {
            const isFillerIll = i > 0 && i % 14 === 0;
            const randIndex = Math.floor(Math.random() * allDemons.length);
            const randDemon = isFillerIll ? illDummyDemon : allDemons[randIndex];
            list1.push({
              id: `filler1-${i}-${Math.random()}`,
              rank: randDemon.position,
              demon: randDemon,
              isIllSpot: isFillerIll,
            });
          }
        }

        setCards1(list1);
        setTranslateX1(0);
        setActiveTransition1(false);

        const targetOffset1 = targetIndex * cardTotal + cardTotal / 2 - containerWidth / 2;
        const finalTranslate1 = -(targetOffset1 + (Math.random() - 0.5) * 30);
        const durationStage1 = isQuickRoll ? Math.max(120, speedTier.durationMs * 0.45) : 2000;

        sound.playRollWhoosh();

        // Ticker for Stage 1
        if (!isQuickRoll) {
          let ticks1 = 0;
          timersRef.current.tick1 = setInterval(() => {
            if (ticks1 < targetIndex) {
              sound.playTickerTick();
              ticks1++;
            }
          }, durationStage1 / (targetIndex * 1.1));
        }

        timersRef.current.start1 = setTimeout(() => {
          setActiveTransition1(true);
          setTranslateX1(finalTranslate1);
        }, isQuickRoll ? 15 : 40);

        // Stage 1 landed on ILL spot -> Transition to Stage 2
        timersRef.current.finish1 = setTimeout(() => {
          if (timersRef.current.tick1) clearInterval(timersRef.current.tick1);
          sound.playCutscene(); // Dramatic ILL chime

          const pauseDuration = isQuickRoll ? 80 : 400;

          timersRef.current.pause = setTimeout(() => {
            setCurrentStage('stage2');

            // 2. Build Stage 2 Reel (ILL levels slowing down dramatically to targetDemon)
            const illPool = impossibleLevels.length > 0 ? impossibleLevels : [targetDemon];
            const list2: ReelCard[] = [];

            for (let i = 0; i < 50; i++) {
              if (i === targetIndex) {
                list2.push({
                  id: `target-ill-2-${Date.now()}`,
                  rank: targetDemon.position,
                  demon: targetDemon,
                  isTarget: true,
                });
              } else {
                const randIndex = Math.floor(Math.random() * illPool.length);
                const randDemon = illPool[randIndex];
                list2.push({
                  id: `filler2-${i}-${Math.random()}`,
                  rank: randDemon.position,
                  demon: randDemon,
                });
              }
            }

            setCards2(list2);
            setTranslateX2(0);
            setActiveTransition2(false);

            const targetOffset2 = targetIndex * cardTotal + cardTotal / 2 - containerWidth / 2;
            const finalTranslate2 = -(targetOffset2 + (Math.random() - 0.5) * 15);

            // Stage 2 duration: 2,200ms on Quick Roll, 5,500ms on Normal Roll for maximum dramatic deceleration!
            const durationStage2 = isQuickRoll ? 2200 : 5500;

            sound.playRollWhoosh();

            // Decelerating Ticker Ticks for Stage 2
            const totalStage2Ticks = 28;
            let accumTime = 0;
            const newTick2Timers: NodeJS.Timeout[] = [];

            for (let t = 0; t < totalStage2Ticks; t++) {
              const progress = t / totalStage2Ticks;
              const stepDelay = 20 + Math.pow(progress, 2.8) * 380;
              accumTime += stepDelay;

              if (accumTime < durationStage2 - 100) {
                const timerId = setTimeout(() => {
                  sound.playTickerTick();
                }, accumTime);
                newTick2Timers.push(timerId);
              }
            }
            timersRef.current.tick2Timers = newTick2Timers;

            timersRef.current.start2 = setTimeout(() => {
              setActiveTransition2(true);
              setTranslateX2(finalTranslate2);
            }, isQuickRoll ? 15 : 40);

            // Stage 2 finished landing on target ILL level
            timersRef.current.finish2 = setTimeout(() => {
              isSpinningRef.current = false;
              setShowIllBanner(false);
              setCurrentStage('idle');
              onSpinComplete();
            }, durationStage2 + 80);

          }, pauseDuration);

        }, durationStage1 + 50);

      } else {
        // ==========================================
        // STANDARD 1-STAGE ROULETTE FOR AREDL DEMON
        // ==========================================
        setCurrentStage('stage1');
        setShowIllBanner(false);

        const list1: ReelCard[] = [];
        for (let i = 0; i < 50; i++) {
          if (i === targetIndex) {
            list1.push({
              id: `target-${i}-${Date.now()}`,
              rank: targetDemon.position,
              demon: targetDemon,
              isTarget: true,
            });
          } else {
            const isFillerIll = i > 0 && i % 18 === 0;
            const randIndex = Math.floor(Math.random() * allDemons.length);
            const randDemon = allDemons[randIndex];
            list1.push({
              id: `filler-${i}-${Math.random()}`,
              rank: isFillerIll ? 0 : randDemon.position,
              demon: isFillerIll
                ? {
                    id: 'filler-ill',
                    name: '⚡ ANOMALY ⚡',
                    position: 0,
                    baseRarity: 100000,
                    isImpossible: true,
                    publisher: 'ANOMALY',
                    verifier: 'SYSTEM',
                    points: 0,
                  }
                : randDemon,
              isIllSpot: isFillerIll,
            });
          }
        }

        setCards1(list1);
        setTranslateX1(0);
        setActiveTransition1(false);

        const targetOffset1 = targetIndex * cardTotal + cardTotal / 2 - containerWidth / 2;
        const finalTranslate1 = -(targetOffset1 + (Math.random() - 0.5) * 40);
        const durationStage1 = isQuickRoll
          ? speedTier.durationMs
          : targetDemon.position <= 150
          ? 4500
          : 3200;

        sound.playRollWhoosh();

        if (!isQuickRoll) {
          let ticks1 = 0;
          timersRef.current.tick1 = setInterval(() => {
            if (ticks1 < targetIndex) {
              sound.playTickerTick();
              ticks1++;
            }
          }, durationStage1 / (targetIndex * 1.2));
        }

        timersRef.current.start1 = setTimeout(() => {
          setActiveTransition1(true);
          setTranslateX1(finalTranslate1);
        }, isQuickRoll ? 20 : 50);

        timersRef.current.finish1 = setTimeout(() => {
          if (timersRef.current.tick1) clearInterval(timersRef.current.tick1);
          isSpinningRef.current = false;
          setCurrentStage('idle');
          onSpinComplete();
        }, durationStage1 + (isQuickRoll ? 30 : 100));
      }
    } else if (!isSpinning) {
      isSpinningRef.current = false;
    }
  }, [
    isSpinning,
    targetDemon,
    allDemons,
    impossibleLevels,
    isQuickRoll,
    effectiveSpeedLevel,
    onSpinComplete,
  ]);

  const speedTier = QUICK_ROLL_SPEED_LEVELS[effectiveSpeedLevel] || QUICK_ROLL_SPEED_LEVELS[0];
  const isIllRoll = Boolean(targetDemon?.isImpossible);

  const durationSecStage1 = `${(
    (isIllRoll
      ? isQuickRoll
        ? Math.max(120, speedTier.durationMs * 0.45)
        : 2000
      : isQuickRoll
      ? speedTier.durationMs
      : targetDemon && targetDemon.position <= 150
      ? 4500
      : 3200) / 1000
  ).toFixed(2)}s`;

  const durationSecStage2 = `${((isQuickRoll ? 2200 : 5500) / 1000).toFixed(2)}s`;

  const easingStage1 = isQuickRoll
    ? 'cubic-bezier(0.15, 0.85, 0.35, 1.0)'
    : 'cubic-bezier(0.12, 0.85, 0.25, 1.0)';

  // Dramatic deceleration curve for Stage 2
  const easingStage2 = 'cubic-bezier(0.01, 0.98, 0.05, 1.0)';

  const activeCards = currentStage === 'stage2' ? cards2 : cards1;
  const activeTranslateX = currentStage === 'stage2' ? translateX2 : translateX1;
  const activeTransition = currentStage === 'stage2' ? activeTransition2 : activeTransition1;
  const activeDuration = currentStage === 'stage2' ? durationSecStage2 : durationSecStage1;
  const activeEasing = currentStage === 'stage2' ? easingStage2 : easingStage1;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-2xl bg-black/90 border py-4 shadow-2xl backdrop-blur-md select-none transition-colors duration-500 ${
        currentStage === 'stage2' || showIllBanner
          ? 'border-fuchsia-500/80 shadow-[0_0_35px_rgba(217,70,239,0.5)]'
          : 'border-zinc-800/90'
      }`}
    >
      {/* Banner indicator when an ILL spin occurs */}
      {showIllBanner && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-fuchsia-950/95 border border-fuchsia-400/80 text-fuchsia-200 text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-[0_0_20px_rgba(217,70,239,0.8)] animate-pulse flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping shrink-0" />
          {currentStage === 'stage1'
            ? '⚡ ANOMALY DETECTED - LANDING ILL SPOT ⚡'
            : '⚡ IMPOSSIBLE ROULETTE - DECELERATING... ⚡'}
        </div>
      )}

      {/* Center Needle / Indicator Line */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-red-500 via-amber-400 to-red-500 z-30 shadow-[0_0_15px_rgba(239,68,68,0.9)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-amber-400 z-30 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-amber-400 z-30 pointer-events-none" />

      {/* Horizontal Cards Strip */}
      <div
        className="flex gap-2 px-4 transition-transform"
        style={{
          transform: `translate3d(${activeTranslateX}px, 0, 0)`,
          willChange: 'transform',
          transitionDuration: activeTransition ? activeDuration : '0s',
          transitionTimingFunction: activeEasing,
        }}
      >
        {activeCards.map((c) => {
          const pos = c.rank;
          const isIll = c.demon.isImpossible || c.isIllSpot;

          let cardStyle = 'bg-zinc-900/90 border-white/10 text-zinc-300';

          if (c.isIllSpot) {
            cardStyle =
              'bg-gradient-to-br from-purple-950 via-fuchsia-950 to-purple-950 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_22px_rgba(217,70,239,0.8)] animate-pulse';
          } else if (isIll) {
            if (pos === 1) {
              cardStyle =
                'bg-gradient-to-b from-amber-900 via-yellow-950 to-zinc-950 border-amber-300 text-amber-200 shadow-[0_0_28px_rgba(252,211,77,0.85)]';
            } else if (pos <= 10) {
              cardStyle =
                'bg-gradient-to-b from-violet-900 via-purple-950 to-zinc-950 border-violet-400 text-violet-200 shadow-[0_0_20px_rgba(168,85,247,0.7)]';
            } else if (pos <= 100) {
              cardStyle =
                'bg-gradient-to-b from-fuchsia-950 via-purple-950 to-zinc-950 border-fuchsia-400 text-fuchsia-300 shadow-[0_0_16px_rgba(217,70,239,0.55)]';
            } else {
              cardStyle =
                'bg-gradient-to-b from-purple-950/90 via-zinc-950 to-zinc-950 border-purple-500/60 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.35)]';
            }
          } else {
            if (pos === 1)
              cardStyle =
                'bg-gradient-to-b from-amber-950/90 via-zinc-950 to-zinc-950 border-amber-400 text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.5)]';
            else if (pos <= 10)
              cardStyle =
                'bg-gradient-to-b from-violet-950/90 via-zinc-950 to-zinc-950 border-violet-400 text-violet-300 shadow-[0_0_14px_rgba(168,85,247,0.4)]';
            else if (pos <= 150)
              cardStyle =
                'bg-gradient-to-b from-rose-950/90 via-zinc-950 to-zinc-950 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.35)]';
            else if (pos <= 350)
              cardStyle = 'bg-zinc-900/90 border-emerald-500/50 text-emerald-300';
            else cardStyle = 'bg-zinc-900/90 border-cyan-500/40 text-cyan-300';
          }

          return (
            <div
              key={c.id}
              className={`w-[120px] h-[90px] shrink-0 rounded-xl border-2 flex flex-col items-center justify-center p-2 text-center transition ${cardStyle}`}
            >
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                {c.isIllSpot ? '⚡ ILL ⚡' : `#${c.rank}`}
              </span>
              <span className="text-[10px] font-bold tracking-wider max-w-[105px] truncate mt-1">
                {c.demon.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
