import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Trophy, Medal, User, Flame, Search } from 'lucide-react';
import { DemonDifficultyIcon } from './DemonDifficultyIcon';
import { LeaderboardEntry } from '../game/types';

interface Props {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<Props> = ({ onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('demonPosition', 'asc'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: LeaderboardEntry[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            userId: String(data.userId || ''),
            username: String(data.username || ''),
            demonName: String(data.demonName || ''),
            demonPosition: Number(data.demonPosition || 0),
            rarity: Number(data.rarity || 0),
            rollsCount: Number(data.rollsCount || 0),
            timestamp: Number(data.timestamp || 0),
            dateStr: String(data.dateStr || ''),
            monthStr: String(data.monthStr || ''),
          } as LeaderboardEntry);
        });
        setEntries(list);
        setLoading(false);
      },
      (error) => {
        console.error('Leaderboard onSnapshot error:', error);
        alert(`Firestore Leaderboard Error:\n${error instanceof Error ? error.message : String(error)}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredEntries = entries.filter(e => 
    e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.demonName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-tight">Verified Global Rankings</h2>
              <p className="text-xs text-zinc-400 font-sans">Real signed-in players only • No fake or simulated records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3.5 bg-zinc-900/40 border-b border-white/[0.08]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search player name or demon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400/50 transition font-sans"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Loading Ranks...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-20">
              <User className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">No rankings found matching your search.</p>
            </div>
          ) : (
            filteredEntries.map((entry, idx) => {
              const borderClass =
                idx === 0 
                  ? 'bg-amber-950/25 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                  : idx === 1 
                  ? 'bg-sky-950/20 border-sky-400/35 shadow-[0_0_15px_rgba(56,189,248,0.1)]'
                  : idx === 2
                  ? 'bg-rose-950/20 border-rose-500/35 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                  : 'bg-zinc-900/50 border-white/5 hover:border-white/10';

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${borderClass}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 text-center shrink-0">
                      {idx < 3 ? (
                        <Medal className={`w-5 h-5 mx-auto ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-sky-300' : 'text-rose-400'}`} />
                      ) : (
                        <span className="text-xs font-bold font-mono text-zinc-500">#{idx + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded-xl bg-zinc-950 border border-white/10">
                        <DemonDifficultyIcon position={entry.demonPosition} size="sm" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm font-sans">{entry.username}</span>
                          {entry.demonPosition <= 10 && (
                            <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          Rank #{entry.demonPosition}{' '}
                          <span className={`font-bold ${
                            entry.demonPosition === 1 ? 'text-amber-300' : entry.demonPosition <= 10 ? 'text-violet-300' : 'text-rose-300'
                          }`}>
                            {entry.demonName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-zinc-100">
                      1 in {entry.rarity.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {entry.rollsCount.toLocaleString()} Rolls
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/[0.08] bg-zinc-900/30 text-center">
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
            Verified Cloud Sync • Live Real-Time Leaderboard
          </p>
        </div>
      </div>
    </div>
  );
};
