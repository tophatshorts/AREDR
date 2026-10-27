import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { PlayerProfile } from '../game/types';
import { X, User, Save, Check, RotateCcw, Cloud, ShieldCheck, Trash2 } from 'lucide-react';

interface Props {
  profile: PlayerProfile;
  user: FirebaseUser | null;
  onUpdateProfileName: (newName: string) => void;
  onManualSave: () => Promise<void>;
  onResetSave: () => void;
  onClose: () => void;
}

export const SaveProfileModal: React.FC<Props> = ({
  profile,
  user,
  onUpdateProfileName,
  onManualSave,
  onResetSave,
  onClose,
}) => {
  const [usernameInput, setUsernameInput] = useState(profile.username);
  const [nameSaved, setNameSaved] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      onUpdateProfileName(usernameInput.trim());
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  };

  const handleManualSave = async () => {
    setManualSaving(true);
    try {
      await onManualSave();
      setManualSaved(true);
      setTimeout(() => setManualSaved(false), 2500);
    } catch (e) {
      alert('Failed to save. Please check your internet connection.');
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-zinc-950/95 border border-white/10 p-6 sm:p-7 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-tight">Player Profile</h2>
              <p className="text-xs text-zinc-400 font-sans">Manage display handle & cloud sync</p>
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

        {/* Change Username Form */}
        <form onSubmit={handleSaveName} className="mt-5 space-y-3">
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider font-sans">
            Player Display Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={20}
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-400/60 font-sans"
              placeholder="e.g. Zoink, Trick, Player1..."
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-sans font-bold text-xs transition shadow-[0_0_12px_rgba(14,165,233,0.3)]"
            >
              {nameSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{nameSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            This name appears on the global AREDL leaderboard when you roll a new personal best.
          </p>
        </form>

        {/* Cloud Sync Status (Replaces manual .json backup) */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] space-y-3">
          <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-sans flex items-center justify-between">
            <span>Cloud Synchronization</span>
            <span className={`flex items-center gap-1.5 text-[11px] font-medium ${user ? 'text-emerald-400' : 'text-zinc-500'}`}>
              <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              {user ? 'Active' : 'Guest Mode'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 flex items-start gap-3.5">
            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${user ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800 border-white/5 text-zinc-500'}`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div className="text-xs text-zinc-300 leading-relaxed font-sans">
              <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                <span>{user ? 'Cloud Sync (Manual)' : 'Local Storage Only'}</span>
                {user && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
              </p>
              {user 
                ? 'Your rolls, keys, and upgrades save continuously to local storage. Click "Save Progress Now" below to save your latest state to the cloud.'
                : 'You are playing as a guest. Your progress is saved in this browser but will be lost if you clear your data or switch devices.'}
            </div>
          </div>

          <button
            onClick={handleManualSave}
            disabled={manualSaving}
            className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2.5 font-display font-bold text-sm uppercase tracking-wider transition-all duration-200 transform active:scale-95 border ${
              manualSaved 
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-white shadow-lg'
            }`}
          >
            {manualSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : manualSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Progress Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Progress Now</span>
              </>
            )}
          </button>
        </div>

        {/* Reset Warning */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 font-mono">
              {user ? `UID: ${user.uid.slice(0, 8)}...` : `Guest ID: ${profile.id.slice(0, 8)}...`}
            </span>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to reset your RNG progress? All keys and discovered demons will be wiped.')) {
                  onResetSave();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Local Save</span>
            </button>
          </div>

          {user && (
            <button
              onClick={() => {
                if (window.confirm('CRITICAL: This will PERMANENTLY delete your cloud progress AND leaderboard rank. This cannot be undone. Proceed?')) {
                  onResetSave();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition text-xs font-bold uppercase tracking-wider"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Cloud Account & Data</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

