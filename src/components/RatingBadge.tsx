import React, { useState } from 'react';

interface Props {
  rating: 'Mythic' | 'Legendary' | 'Epic' | 'Featured' | 'Rated';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const RatingBadge: React.FC<Props> = ({
  rating,
  size = 'md',
  showText = true,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const tierAsset = rating.toLowerCase();

  const sizeClasses = {
    sm: 'h-5 w-auto text-[10px] px-2 py-0.5',
    md: 'h-7 w-auto text-xs px-2.5 py-1',
    lg: 'h-9 w-auto text-sm px-3.5 py-1.5',
  }[size];

  // Specific rating colors and gradients
  const theme = {
    Mythic: {
      border: 'border-purple-400/80',
      bg: 'bg-gradient-to-r from-purple-950/90 via-indigo-950/80 to-cyan-950/90',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 font-black',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.5)]',
      iconColor: '#c084fc',
    },
    Legendary: {
      border: 'border-amber-400/80',
      bg: 'bg-gradient-to-r from-amber-950/90 via-yellow-950/80 to-amber-950/90',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 font-extrabold',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]',
      iconColor: '#fbbf24',
    },
    Epic: {
      border: 'border-orange-500/80',
      bg: 'bg-gradient-to-r from-orange-950/90 via-red-950/80 to-orange-950/90',
      text: 'text-orange-400 font-bold',
      glow: 'shadow-[0_0_12px_rgba(249,115,22,0.4)]',
      iconColor: '#f97316',
    },
    Featured: {
      border: 'border-yellow-500/50',
      bg: 'bg-yellow-950/60',
      text: 'text-yellow-300 font-semibold',
      glow: 'shadow-sm',
      iconColor: '#eab308',
    },
    Rated: {
      border: 'border-zinc-700',
      bg: 'bg-zinc-900',
      text: 'text-zinc-400 font-medium',
      glow: '',
      iconColor: '#94a3b8',
    },
  }[rating];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border ${theme.border} ${theme.bg} ${theme.glow} ${sizeClasses} ${className} transition`}
    >
      {/* <img> element with id="demon-tier-icon" as requested */}
      {!imgError ? (
        <img
          id="demon-tier-icon"
          src={`https://aredl.net/assets/${tierAsset}.png`}
          alt={`${rating} Rating Badge`}
          className="h-4 w-4 object-contain inline-block"
          onError={() => {
            // If aredl.net doesn't serve the static png directly, switch to SVG icon
            setImgError(true);
          }}
        />
      ) : (
        /* Geometry Dash 2.2 Fire Badge SVG */
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 shrink-0 inline-block drop-shadow"
          fill="none"
        >
          {rating === 'Mythic' ? (
            /* Mythic Flame with Star */
            <>
              <path
                d="M12 2C9 7 6 9 6 14a6 6 0 0 0 12 0c0-5-3-7-6-12z"
                fill="url(#mythic-grad)"
              />
              <polygon
                points="12,8 13.5,12 17.5,12 14.5,14.5 15.5,18.5 12,16 8.5,18.5 9.5,14.5 6.5,12 10.5,12"
                fill="#fde047"
              />
              <defs>
                <linearGradient id="mythic-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </>
          ) : rating === 'Legendary' ? (
            /* Legendary Golden Flame with Wings */
            <>
              <path
                d="M3 13c3-1 5 1 5 3-2 3-5 1-5-3zm18 0c-3-1-5 1-5 3 2 3 5 1 5-3z"
                fill="#f59e0b"
              />
              <path
                d="M12 3C9.5 7.5 7 9 7 14a5 5 0 0 0 10 0c0-5-2.5-6.5-5-11z"
                fill="#fbbf24"
              />
              <circle cx="12" cy="14" r="2.5" fill="#fff" />
            </>
          ) : rating === 'Epic' ? (
            /* Epic Red Flame */
            <>
              <path
                d="M12 3c-3 4-5 6-5 11a5 5 0 0 0 10 0c0-5-2-7-5-11z"
                fill="#f97316"
              />
              <path
                d="M12 8c-1.5 2-2.5 3-2.5 5.5a2.5 2.5 0 0 0 5 0c0-2.5-1-3.5-2.5-5.5z"
                fill="#fef08a"
              />
            </>
          ) : rating === 'Featured' ? (
            /* Featured Star */
            <polygon
              points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9"
              fill="#eab308"
            />
          ) : (
            /* Standard Demon Ring */
            <circle cx="12" cy="12" r="7" stroke="#94a3b8" strokeWidth="2.5" fill="none" />
          )}
        </svg>
      )}

      {showText && (
        <span className={`uppercase tracking-wider ${theme.text}`}>
          {rating}
        </span>
      )}
    </div>
  );
};
