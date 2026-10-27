import React from 'react';

interface Props {
  position?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'giant';
  showLabel?: boolean;
}

export const DemonDifficultyIcon: React.FC<Props> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    giant: 'w-28 h-28',
  }[size];

  return (
    <div className={`relative ${sizeClasses} shrink-0 flex items-center justify-center`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-400 blur-sm opacity-60 animate-pulse-glow" />
      <div className="relative w-full h-full rounded-2xl bg-black border-2 border-red-500/80 p-0.5 shadow-[0_0_15px_rgba(239,68,68,0.6)] flex items-center justify-center overflow-hidden">
        <img
          src="/assets/aistudio/IMG_7941_97b952fd.webp"
          alt="Extreme Demon"
          className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
        />
      </div>
    </div>
  );
};
