import React from 'react';
import { X, Settings, Volume2, VolumeX, Smartphone, Monitor, SkipForward, Info } from 'lucide-react';
import { PlayerSettings } from '../game/types';

interface Props {
  settings: PlayerSettings;
  onUpdateSettings: (settings: Partial<PlayerSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ settings, onUpdateSettings, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-500/15 border border-zinc-500/30 flex items-center justify-center text-zinc-400 shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-tight">Game Settings</h2>
              <p className="text-xs text-zinc-400 font-sans">Personalize your RNG experience</p>
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

        <div className="p-6 space-y-6">
          {/* Audio Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Sound Effects</h4>
                <p className="text-[11px] text-zinc-400">Enable or disable game audio</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                settings.soundEnabled ? 'bg-blue-500' : 'bg-zinc-800'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                settings.soundEnabled ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Screen Shake Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Screen Shake</h4>
                <p className="text-[11px] text-zinc-400">Visual impact on rare pulls</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ screenShake: !settings.screenShake })}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                settings.screenShake ? 'bg-amber-500' : 'bg-zinc-800'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                settings.screenShake ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Auto-Skip Cutscenes Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <SkipForward className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Auto-Skip Cutscenes</h4>
                <p className="text-[11px] text-zinc-400">Skip animations for rare demons</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoSkipCutscenes: !settings.autoSkipCutscenes })}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                settings.autoSkipCutscenes ? 'bg-purple-500' : 'bg-zinc-800'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                settings.autoSkipCutscenes ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Info Section */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex gap-3 items-start">
            <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Settings are saved automatically to your profile. If you are signed in, they will sync across all your devices.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-zinc-900/30">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold font-sans transition border border-white/5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
