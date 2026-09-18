import { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';

export default function SettingsModal({ isOpen, onClose }) {
  const { liked, playlists, customAlbums } = usePlayer();
  const [audioQuality, setAudioQuality] = useState(() => localStorage.getItem('pulse_audio_quality') || 'high');
  const [streamEngine, setStreamEngine] = useState(() => localStorage.getItem('pulse_stream_engine') || 'piped');
  const [normalizeAudio, setNormalizeAudio] = useState(() => localStorage.getItem('pulse_normalize_audio') !== 'false');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleQualityChange = (val) => {
    setAudioQuality(val);
    localStorage.setItem('pulse_audio_quality', val);
  };

  const handleEngineChange = (val) => {
    setStreamEngine(val);
    localStorage.setItem('pulse_stream_engine', val);
  };

  const handleNormalizeToggle = () => {
    const next = !normalizeAudio;
    setNormalizeAudio(next);
    localStorage.setItem('pulse_normalize_audio', String(next));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-page-slide">
      <div
        className="relative w-full max-w-lg rounded-2xl glass-panel border border-white/10 p-6 shadow-2xl overflow-hidden flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[22px]">settings</span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-white tracking-tight">Settings</h2>
              <p className="text-body-sm text-on-surface-variant">Audio preferences & app configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5 overflow-y-auto max-h-[60vh] pr-1">
          {/* Audio Engine */}
          <div className="flex flex-col gap-2">
            <label className="text-label-md uppercase tracking-wider text-outline font-semibold">
              Audio Streaming Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleEngineChange('piped')}
                className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-all ${
                  streamEngine === 'piped'
                    ? 'bg-brand-violet/20 border-brand-violet text-white shadow-lg shadow-brand-violet/10'
                    : 'bg-white/5 border-white/10 text-on-surface-variant hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-label-lg font-semibold">Piped YouTube</span>
                  {streamEngine === 'piped' && (
                    <span className="material-symbols-outlined text-brand-violet text-[18px]">check_circle</span>
                  )}
                </div>
                <span className="text-body-sm text-outline">Direct WebM/MP4 high bitrate stream</span>
              </button>

              <button
                type="button"
                onClick={() => handleEngineChange('saavn')}
                className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-all ${
                  streamEngine === 'saavn'
                    ? 'bg-brand-violet/20 border-brand-violet text-white shadow-lg shadow-brand-violet/10'
                    : 'bg-white/5 border-white/10 text-on-surface-variant hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-label-lg font-semibold">Saavn High-Res</span>
                  {streamEngine === 'saavn' && (
                    <span className="material-symbols-outlined text-brand-violet text-[18px]">check_circle</span>
                  )}
                </div>
                <span className="text-body-sm text-outline">320kbps AAC / MP3 direct stream</span>
              </button>
            </div>
          </div>

          {/* Audio Quality */}
          <div className="flex flex-col gap-2">
            <label className="text-label-md uppercase tracking-wider text-outline font-semibold">
              Playback Quality
            </label>
            <div className="flex items-center gap-2">
              {[
                { id: 'high', label: 'Maximum (320kbps / Opus)' },
                { id: 'medium', label: 'Standard (160kbps)' },
                { id: 'data-saver', label: 'Data Saver (96kbps)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleQualityChange(opt.id)}
                  className={`flex-1 py-2 px-3 rounded-xl text-center text-label-md transition-all ${
                    audioQuality === opt.id
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'bg-white/5 text-on-surface-variant hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {opt.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Normalization Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex flex-col">
              <span className="text-label-lg font-semibold text-white">Audio Normalization</span>
              <span className="text-body-sm text-on-surface-variant">Prevent sudden volume spikes between songs</span>
            </div>
            <button
              onClick={handleNormalizeToggle}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                normalizeAudio ? 'bg-brand-violet' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  normalizeAudio ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Library & Cache Info */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
            <span className="text-label-md uppercase tracking-wider text-outline font-semibold">Storage & Persistence</span>
            <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
              <span>Liked Tracks</span>
              <span className="font-mono text-white">{liked.length} saved</span>
            </div>
            <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
              <span>Playlists & Albums</span>
              <span className="font-mono text-white">{playlists.length + (customAlbums?.length || 0)} collections</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-label-sm text-outline">Pulse Music v2.4</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white text-black font-semibold text-label-md hover:bg-white/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
