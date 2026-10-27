import React from 'react';
import { LogOut, X } from 'lucide-react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutConfirmModal: React.FC<Props> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-950/95 border border-white/10 p-6 shadow-2xl flex flex-col items-center text-center">
        <button
          onClick={onCancel}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-white/5"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
          <LogOut className="w-6 h-6" />
        </div>

        <h2 className="font-display text-xl font-bold text-white tracking-tight">Confirm Sign Out</h2>
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          Are you sure you want to sign out? Your progress will be saved.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 w-full font-sans font-bold text-xs uppercase tracking-wider">
          <button
            onClick={onCancel}
            className="py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.35)] transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
