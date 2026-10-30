import React from 'react';
import { X, Settings, Volume2, VolumeX, Smartphone, SkipForward, Info, Sparkles, Zap } from 'lucide-react';
import { PlayerSettings, PlayerUpgrades } from '../game/types';
import { LUCK_LEVELS, QUICK_ROLL_SPEED_LEVELS } from '../game/rng';

interface Props {
  settings: PlayerSettings;
  upgrades: PlayerUpgrades;
  onUpdateSettings: (settings: Partial<PlayerSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ settings, upgrades, onUpdateSettings, onClose }) => {
  const currentVolume = settings.volume !== undefined ? settings.volume : 0.8;
  const currentVolumePercent = Math.round(currentVolume * 100);

  const maxLuckLevel = upgrades.luckLevel;
  const activeLuckLevel = settings.activeLuckLevel !== null && settings.activeLuckLevel !== undefined
    ? Math.min(maxLuckLevel, Math.max(0, settings.activeLuckLevel))
    : maxLuckLevel;

  const maxSpeedLevel = upgrades.quickRollSpeedLevel || 0;
  const activeSpeedLevel = settings.activeSpeedLevel !== null && settings.activeSpeedLevel !== undefined
    ? Math.min(maxSpeedLevel, Math.max(0, settings.activeSpeedLevel))
    : maxSpeedLevel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-hidden rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-zinc-900/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-500/15 border border-zinc-500/30 flex items-center justify-center text-zinc-400 shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-tight">Game Settings</h2>
              <p className="text-xs text-zinc-400 font-sans">Customize audio, luck & speed preferences</p>
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

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Master Volume Control */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  {settings.soundEnabled && currentVolume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Audio & Volume</h4>
                  <p className="text-[11px] text-zinc-400">Master audio level ({currentVolumePercent}%)</p>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`w-11 h-6 rounded-full relative transition-colors ${
                  settings.soundEnabled ? 'bg-blue-500' : 'bg-zinc-800'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  settings.soundEnabled ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>

            {settings.soundEnabled && (
              <div className="pt-2 flex items-center gap-3">
                <VolumeX className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentVolumePercent}
                  onChange={(e) => onUpdateSettings({ volume: parseFloat(e.target.value) / 100 })}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <Volume2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              </div>
            )}
          </div>

          {/* Active Luck Level Selector */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Active Luck Level</h4>
                  <p className="text-[11px] text-zinc-400">
                    Set active luck multiplier (Unlocked up to {LUCK_LEVELS[maxLuckLevel]?.label || `Lvl ${maxLuckLevel}`})
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {Array.from({ length: maxLuckLevel + 1 }).map((_, level) => {
                const isSelected = activeLuckLevel === level;
                const luckInfo = LUCK_LEVELS[level];
                return (
                  <button
                    key={level}
                    onClick={() => onUpdateSettings({ activeLuckLevel: level })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                      isSelected
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                    }`}
                  >
                    Lvl {level} ({luckInfo?.mult || 1}x)
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Quick Roll Speed Selector */}
          {upgrades.hasQuickRoll && (
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Quick Roll Speed</h4>
                    <p className="text-[11px] text-zinc-400">
                      Choose spin animation duration (Max: {QUICK_ROLL_SPEED_LEVELS[maxSpeedLevel]?.label})
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {Array.from({ length: maxSpeedLevel + 1 }).map((_, level) => {
                  const isSelected = activeSpeedLevel === level;
                  const speedInfo = QUICK_ROLL_SPEED_LEVELS[level];
                  return (
                    <button
                      key={level}
                      onClick={() => onUpdateSettings({ activeSpeedLevel: level })}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                        isSelected
                          ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                          : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                      }`}
                    >
                      Lvl {level} ({(speedInfo?.durationMs || 700) / 1000}s)
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Screen Shake Toggle */}
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Screen Shake</h4>
                <p className="text-[11px] text-zinc-400">Visual impact on rare pulls</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ screenShake: !settings.screenShake })}
              className={`w-11 h-6 rounded-full relative transition-colors ${
                settings.screenShake ? 'bg-amber-500' : 'bg-zinc-800'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                settings.screenShake ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Granular Cutscene Skip Settings */}
          <div className="space-y-4 pt-2 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 mb-1">
              <SkipForward className="w-4 h-4 text-purple-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-tight">Auto-Skip Cutscenes</h4>
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => onUpdateSettings({
                  cutsceneSkipSettings: {
                    aredlTop150: true,
                    aredlTop10: true,
                    aredlTop1: true,
                    illCommon: true,
                    illTop10: true,
                    illTop1: true,
                  }
                })}
                className="flex-1 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider border border-purple-500/20 transition-all"
              >
                Skip All
              </button>
              <button
                onClick={() => onUpdateSettings({
                  cutsceneSkipSettings: {
                    aredlTop150: false,
                    aredlTop10: false,
                    aredlTop1: false,
                    illCommon: false,
                    illTop10: false,
                    illTop1: false,
                  }
                })}
                className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-bold uppercase tracking-wider border border-white/5 transition-all"
              >
                Watch All
              </button>
            </div>
            
            <div className="space-y-3 pl-2">
              {/* AREDL Tiers */}
              <div className="grid grid-cols-1 gap-3">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AREDL Tiers</p>
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">AREDL Top 150</span>
                  <button
                    onClick={() => onUpdateSettings({ 
                      cutsceneSkipSettings: { ...settings.cutsceneSkipSettings, aredlTop150: !settings.cutsceneSkipSettings.aredlTop150 } 
                    })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      settings.cutsceneSkipSettings.aredlTop150 ? 'bg-purple-500' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.cutsceneSkipSettings.aredlTop150 ? 'left-[22px]' : 'left-[2px]'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">AREDL Top 10</span>
                  <button
                    onClick={() => onUpdateSettings({ 
                      cutsceneSkipSettings: { ...settings.cutsceneSkipSettings, aredlTop10: !settings.cutsceneSkipSettings.aredlTop10 } 
                    })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      settings.cutsceneSkipSettings.aredlTop10 ? 'bg-purple-500' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.cutsceneSkipSettings.aredlTop10 ? 'left-[22px]' : 'left-[2px]'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">AREDL #1 (Grief)</span>
                  <button
                    onClick={() => onUpdateSettings({ 
                      cutsceneSkipSettings: { ...settings.cutsceneSkipSettings, aredlTop1: !settings.cutsceneSkipSettings.aredlTop1 } 
                    })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      settings.cutsceneSkipSettings.aredlTop1 ? 'bg-purple-500' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.cutsceneSkipSettings.aredlTop1 ? 'left-[22px]' : 'left-[2px]'
                    }`} />
                  </button>
                </div>
              </div>

              {/* ILL Tiers */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ILL Tiers</p>
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">ILL (General)</span>
                  <button
                    onClick={() => onUpdateSettings({ 
                      cutsceneSkipSettings: { ...settings.cutsceneSkipSettings, illCommon: !settings.cutsceneSkipSettings.illCommon } 
                    })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      settings.cutsceneSkipSettings.illCommon ? 'bg-purple-500' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.cutsceneSkipSettings.illCommon ? 'left-[22px]' : 'left-[2px]'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">ILL Top 10</span>
                  <button
                    onClick={() => onUpdateSettings({ 
                      cutsceneSkipSettings: { ...settings.cutsceneSkipSettings, illTop10: !settings.cutsceneSkipSettings.illTop10 } 
                    })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      settings.cutsceneSkipSettings.illTop10 ? 'bg-purple-500' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.cutsceneSkipSettings.illTop10 ? 'left-[22px]' : 'left-[2px]'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">ILL #1 (Open Window)</span>
                  <button
                    onClick={() => onUpdateSettings({ 
                      cutsceneSkipSettings: { ...settings.cutsceneSkipSettings, illTop1: !settings.cutsceneSkipSettings.illTop1 } 
                    })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      settings.cutsceneSkipSettings.illTop1 ? 'bg-purple-500' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.cutsceneSkipSettings.illTop1 ? 'left-[22px]' : 'left-[2px]'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
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
        <div className="p-4 border-t border-white/[0.08] bg-zinc-900/30 shrink-0">
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
