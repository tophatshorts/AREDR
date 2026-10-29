import React from 'react';

interface Props {
  position?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'giant';
  showLabel?: boolean;
  isImpossible?: boolean;
}

export const DemonDifficultyIcon: React.FC<Props> = ({ size = 'md', isImpossible = false }) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    giant: 'w-28 h-28',
  }[size];

  return (
    <div className={`relative ${sizeClasses} shrink-0 flex items-center justify-center`}>
      <div className={`absolute inset-0 rounded-2xl blur-sm opacity-75 ${
        isImpossible
          ? 'bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-300 animate-spin-slow'
          : 'bg-gradient-to-tr from-red-600 via-rose-500 to-amber-400 animate-pulse-glow'
      }`} />
      <div className={`relative w-full h-full rounded-2xl bg-black p-0.5 flex items-center justify-center overflow-hidden border-2 ${
        isImpossible
          ? 'border-purple-400/90 shadow-[0_0_20px_rgba(168,85,247,0.7)]'
          : 'border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
      }`}>
        <img
          src="./assets/aistudio/IMG_7941_97b952fd.webp"
          alt={isImpossible ? "Impossible Demon" : "Extreme Demon"}
          className={`w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
            isImpossible ? 'filter hue-rotate-[260deg] brightness-125' : ''
          }`}
        />
      </div>
    </div>
  );
};
