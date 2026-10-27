import React, { useState, useEffect } from 'react';

interface Props {
  levelId: number | null | undefined;
  demonName: string;
  className?: string;
  variant?: 'banner' | 'card' | 'compact';
}

export const DemonThumbnail: React.FC<Props> = ({
  levelId,
  demonName,
  className = '',
  variant = 'banner',
}) => {
  // Primary URL candidates:
  // 1. Official AREDL GitHub card thumbnail (works with all 1644 extreme demons)
  // 2. prevter.me level screenshot
  // 3. Fallback to AREDL logo
  const primaryUrl = levelId
    ? `https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${levelId}.webp`
    : 'https://aredl.net/assets/logo.webp';

  const [src, setSrc] = useState<string>(primaryUrl);
  const [attempt, setAttempt] = useState<number>(0);

  useEffect(() => {
    if (levelId) {
      setSrc(`https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${levelId}.webp`);
    } else {
      setSrc('https://aredl.net/assets/logo.webp');
    }
    setAttempt(0);
  }, [levelId]);

  const handleError = () => {
    if (attempt === 0 && levelId) {
      // Try prevter.me route
      setAttempt(1);
      setSrc(`https://prevter.me/${levelId}`);
    } else if (attempt === 1) {
      // Fallback to AREDL logo
      setAttempt(2);
      setSrc('https://aredl.net/assets/logo.webp');
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 ${className}`}>
        <img
          id="demon-thumbnail"
          src={src}
          alt={`${demonName} Thumbnail`}
          onError={handleError}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-inner group ${className}`}
    >
      <img
        id="demon-thumbnail"
        src={src}
        alt={`${demonName} Thumbnail`}
        onError={handleError}
        className="w-full h-44 sm:h-52 object-contain object-center transform group-hover:scale-105 transition duration-700"
      />

      {/* Dark gradient vignette so badges and text overlay pop */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/60 via-transparent to-zinc-950/60 pointer-events-none" />

      {/* Level ID badge in corner */}
      {levelId && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-zinc-700/60 text-[11px] font-mono text-zinc-300">
          ID: {levelId}
        </div>
      )}
    </div>
  );
};
