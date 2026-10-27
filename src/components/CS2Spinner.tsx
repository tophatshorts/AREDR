import React, { useEffect, useRef, useState } from 'react';
import { DemonLevel } from '../game/types';
import { sound } from '../game/sound';

import { QUICK_ROLL_SPEED_LEVELS } from '../game/rng';

interface Props {
  targetDemon: DemonLevel | null;
  allDemons: DemonLevel[];
  isSpinning: boolean;
  isQuickRoll: boolean;
  quickRollSpeedLevel?: number;
  onSpinComplete: () => void;
}

interface ReelCard {
  id: string;
  rank: number;
  demon: DemonLevel;
  isTarget?: boolean;
}

export const CS2Spinner: React.FC<Props> = ({
  targetDemon,
  allDemons,
  isSpinning,
  isQuickRoll,
  quickRollSpeedLevel = 0,
  onSpinComplete,
}) => {
  const [cards, setCards] = useState<ReelCard[]>([]);
  const [translateX, setTranslateX] = useState<number>(0);
  const [activeTransition, setActiveTransition] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetIndex = 36;
  const isSpinningRef = useRef<boolean>(false);
  const timersRef = useRef<{
    tick?: NodeJS.Timeout;
    start?: NodeJS.Timeout;
    finish?: NodeJS.Timeout;
  }>({});

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timersRef.current.tick) clearInterval(timersRef.current.tick);
      if (timersRef.current.start) clearTimeout(timersRef.current.start);
      if (timersRef.current.finish) clearTimeout(timersRef.current.finish);
      isSpinningRef.current = false;
    };
  }, []);

  // Trigger spin whenever isSpinning transitions to true
  useEffect(() => {
    if (isSpinning && !isSpinningRef.current) {
      if (!targetDemon || allDemons.length === 0) {
        onSpinComplete();
        return;
      }
      
      isSpinningRef.current = true;

      // 1. Build new reel list ending on targetDemon at targetIndex
      const list: ReelCard[] = [];
      const totalCards = 50;

      for (let i = 0; i < totalCards; i++) {
        if (i === targetIndex) {
          list.push({
            id: `target-${i}-${Date.now()}`,
            rank: targetDemon.position,
            demon: targetDemon,
            isTarget: true,
          });
        } else {
          const randIndex = Math.floor(Math.random() * allDemons.length);
          const randDemon = allDemons[randIndex];
          list.push({
            id: `filler-${i}-${Math.random()}`,
            rank: randDemon.position,
            demon: randDemon,
          });
        }
      }

      setCards(list);
      setTranslateX(0);
      setActiveTransition(false);

      // 2. Calculate pixel offset to target index center
      const cardWidth = 120;
      const gap = 8;
      const cardTotal = cardWidth + gap;
      const containerWidth = containerRef.current?.offsetWidth || 800;
      const targetOffset = targetIndex * cardTotal + cardTotal / 2 - containerWidth / 2;
      const jitter = (Math.random() - 0.5) * 40;
      const finalTranslate = -(targetOffset + jitter);

      const speedTier = QUICK_ROLL_SPEED_LEVELS[quickRollSpeedLevel || 0] || QUICK_ROLL_SPEED_LEVELS[0];
      const durationMs = isQuickRoll ? speedTier.durationMs : targetDemon.position <= 150 ? 4500 : 3200;

      // Play start sound
      sound.playRollWhoosh();

      // Audio ticker interval
      if (timersRef.current.tick) clearInterval(timersRef.current.tick);
      if (isQuickRoll) {
        sound.playTickerTick();
        const step = Math.max(50, Math.floor(durationMs / 3));
        setTimeout(() => sound.playTickerTick(), step);
        setTimeout(() => sound.playTickerTick(), step * 2);
      } else {
        let ticksCount = 0;
        const maxTicks = targetIndex;
        timersRef.current.tick = setInterval(() => {
          if (ticksCount < maxTicks) {
            sound.playTickerTick();
            ticksCount++;
          } else {
            if (timersRef.current.tick) clearInterval(timersRef.current.tick);
          }
        }, durationMs / (maxTicks * 1.2));
      }

      // 3. Start smooth CSS translation after frame paint
      if (timersRef.current.start) clearTimeout(timersRef.current.start);
      timersRef.current.start = setTimeout(() => {
        setActiveTransition(true);
        setTranslateX(finalTranslate);
      }, isQuickRoll ? 20 : 50);

      // 4. Complete spin callback
      if (timersRef.current.finish) clearTimeout(timersRef.current.finish);
      timersRef.current.finish = setTimeout(() => {
        if (timersRef.current.tick) clearInterval(timersRef.current.tick);
        isSpinningRef.current = false;
        onSpinComplete();
      }, durationMs + (isQuickRoll ? 30 : 100));
    } else if (!isSpinning) {
      isSpinningRef.current = false;
    }
  }, [isSpinning, targetDemon, allDemons, isQuickRoll, quickRollSpeedLevel, onSpinComplete]);

  const speedTier = QUICK_ROLL_SPEED_LEVELS[quickRollSpeedLevel || 0] || QUICK_ROLL_SPEED_LEVELS[0];
  const currentDurationMs = isQuickRoll ? speedTier.durationMs : targetDemon && targetDemon.position <= 150 ? 4500 : 3200;
  const spinDurationSec = `${(currentDurationMs / 1000).toFixed(2)}s`;
  const spinTimingFunc = isQuickRoll
    ? 'cubic-bezier(0.15, 0.85, 0.35, 1.0)'
    : targetDemon && targetDemon.position <= 150
    ? 'cubic-bezier(0.05, 0.95, 0.1, 1.0)' // Extra slow dramatic deceleration for Top 150
    : 'cubic-bezier(0.12, 0.85, 0.25, 1.0)';

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl bg-black/90 border border-zinc-800/90 py-4 shadow-2xl backdrop-blur-md select-none"
    >
      {/* Center Needle / Indicator Line */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-red-500 via-amber-400 to-red-500 z-30 shadow-[0_0_15px_rgba(239,68,68,0.9)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-amber-400 z-30 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-amber-400 z-30 pointer-events-none" />

      {/* Horizontal Cards Strip */}
      <div
        className="flex gap-2 px-4 transition-transform"
        style={{
          transform: `translate3d(${translateX}px, 0, 0)`,
          willChange: 'transform',
          transitionDuration: activeTransition ? spinDurationSec : '0s',
          transitionTimingFunction: spinTimingFunc,
        }}
      >
        {cards.map((c) => {
          const pos = c.rank;
          let cardStyle = 'bg-zinc-900/90 border-white/10 text-zinc-300';
          if (pos === 1) cardStyle = 'bg-gradient-to-b from-amber-950/90 via-zinc-950 to-zinc-950 border-amber-400 text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.5)]';
          else if (pos <= 10) cardStyle = 'bg-gradient-to-b from-violet-950/90 via-zinc-950 to-zinc-950 border-violet-400 text-violet-300 shadow-[0_0_14px_rgba(168,85,247,0.4)]';
          else if (pos <= 150) cardStyle = 'bg-gradient-to-b from-rose-950/90 via-zinc-950 to-zinc-950 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.35)]';
          else if (pos <= 350) cardStyle = 'bg-zinc-900/90 border-emerald-500/50 text-emerald-300';
          else cardStyle = 'bg-zinc-900/90 border-cyan-500/40 text-cyan-300';

          return (
            <div
              key={c.id}
              className={`w-[120px] h-[90px] shrink-0 rounded-xl border-2 flex flex-col items-center justify-center p-2 text-center transition ${cardStyle}`}
            >
              <span className="text-2xl font-black font-mono tracking-tight">
                #{c.rank}
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
