import React, { useState, useEffect } from 'react';
import { DemonDifficultyIcon } from './DemonDifficultyIcon';

interface Props {
  levelId?: number | string | null;
  demonName: string;
  className?: string;
  variant?: 'banner' | 'card' | 'compact';
  isImpossible?: boolean;
  videoUrl?: string;
}

export function extractYoutubeId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

export function getDemonThumbnailUrl(demon?: { level_id?: number | string | null; videoUrl?: string; levelId?: number | string | null } | null): string | null {
  if (!demon) return null;
  const ytId = extractYoutubeId(demon.videoUrl);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  const id = demon.level_id || demon.levelId;
  if (id) {
    return `https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${id}.webp`;
  }
  return null;
}

export const DemonThumbnail: React.FC<Props> = ({
  levelId,
  demonName,
  className = '',
  variant = 'banner',
  isImpossible = false,
  videoUrl,
}) => {
  const ytId = extractYoutubeId(videoUrl);
  const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

  const buildCandidates = (): string[] => {
    const list: string[] = [];
    if (ytThumb) list.push(ytThumb);
    if (levelId) {
      list.push(`https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${levelId}.webp`);
      list.push(`https://raw.githubusercontent.com/Prevter/GDLevelThumbs/main/thumbs/${levelId}.png`);
    }
    list.push('https://aredl.net/assets/logo.webp');
    return list;
  };

  const [candidates, setCandidates] = useState<string[]>(buildCandidates);
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [hasFailed, setHasFailed] = useState<boolean>(false);

  useEffect(() => {
    const freshCandidates = buildCandidates();
    setCandidates(freshCandidates);
    setCandidateIndex(0);
    setHasFailed(false);
  }, [levelId, videoUrl]);

  const handleError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setHasFailed(true);
    }
  };

  const currentSrc = candidates[candidateIndex];

  if (hasFailed || !currentSrc) {
    return (
      <div
        className={`relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden border flex flex-col items-center justify-center p-4 text-center ${
          isImpossible
            ? 'bg-gradient-to-br from-purple-950 via-zinc-950 to-pink-950 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
            : 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-slate-900 border-zinc-800'
        } ${className}`}
      >
        <div className="p-3 rounded-2xl bg-black/60 border border-white/10 mb-2 shadow-lg">
          <DemonDifficultyIcon size="md" isImpossible={isImpossible} />
        </div>
        <h4 className="font-display font-black text-lg text-white tracking-tight drop-shadow-md">
          {demonName}
        </h4>
        <span className="mt-1 text-[11px] font-mono font-bold text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30">
          {isImpossible ? 'IMPOSSIBLE DEMON' : 'EXTREME DEMON'}
        </span>
        {levelId && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/80 border border-zinc-700 text-[10px] font-mono text-zinc-400">
            ID: {levelId}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-inner group ${className}`}>
      <img
        src={currentSrc}
        alt={`${demonName} Thumbnail`}
        onError={handleError}
        className="w-full h-44 sm:h-52 object-cover object-center transform group-hover:scale-105 transition duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent pointer-events-none" />
      {levelId && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-zinc-700/60 text-[11px] font-mono text-zinc-300">
          ID: {levelId}
        </div>
      )}
    </div>
  );
};
