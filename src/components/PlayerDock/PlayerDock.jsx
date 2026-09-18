import { usePlayer } from '../../context/PlayerContext.jsx';
import SeekBar from './SeekBar.jsx';
import VolumeSlider from './VolumeSlider.jsx';

export default function PlayerDock() {
  const {
    currentSong, isPlaying, togglePlay,
    currentTime, duration, seek,
    volume, changeVolume,
    view, toggleView,
  } = usePlayer();

  return (
    /**
     * Stitch Level 3 Elevation:
     * - background: rgba(18,18,21,0.65)
     * - backdrop-filter: blur(40px)
     * - border: 1px solid rgba(255,255,255,0.12)
     * - shadow: 0 12px 32px rgba(0,0,0,0.6), violet subsurface glow
     */
    <div className="fixed bottom-5 left-[15rem] right-5 z-50 pointer-events-auto">
      <div className="glass-dock rounded-2xl px-space-lg py-3 flex items-center justify-between gap-space-lg max-w-5xl mx-auto">

        {/* ── Left: Track info ────────────────────────────────── */}
        <div className="flex items-center gap-space-md min-w-0 w-[220px] flex-shrink-0">
          <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
            {currentSong?.thumbnail ? (
              <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-outline text-[22px]">album</span>
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-label-md font-semibold text-white truncate">
              {currentSong?.title || 'Nothing playing'}
            </span>
            <span className="text-body-sm text-on-surface-variant truncate">
              {currentSong?.artist || 'Search for a song'}
            </span>
          </div>
          <button className="text-on-surface-variant hover:text-brand-pink transition-colors ml-1 flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">favorite_border</span>
          </button>
        </div>

        {/* ── Center: Controls + Seekbar ───────────────────────── */}
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl">
          {/* Transport buttons */}
          <div className="flex items-center gap-space-md">
            <button className="text-on-surface-variant hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">shuffle</span>
            </button>
            <button className="text-on-surface-variant hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[22px]">skip_previous</span>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-white/10"
            >
              <span
                className="material-symbols-outlined text-[22px] text-black font-bold"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <button className="text-on-surface-variant hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[22px]">skip_next</span>
            </button>
            <button className="text-on-surface-variant hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">repeat</span>
            </button>
          </div>

          {/* Seekbar */}
          <SeekBar currentTime={currentTime} duration={duration} onSeek={seek} />
        </div>

        {/* ── Right: Lyrics toggle + Volume ───────────────────── */}
        <div className="flex items-center gap-space-md w-[200px] justify-end flex-shrink-0">
          {/* Lyrics toggle */}
          <button
            onClick={toggleView}
            className={`px-2.5 py-1 rounded-full flex items-center gap-1 text-label-sm font-medium transition-all ${
              view === 'lyrics'
                ? 'bg-[#a078ff] text-[#340080]'
                : 'bg-white/8 text-on-surface-variant hover:text-white hover:bg-white/12'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">lyrics</span>
            <span>Lyrics</span>
          </button>

          {/* Airplay */}
          <button className="text-on-surface-variant hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">airplay</span>
          </button>

          {/* Volume */}
          <VolumeSlider volume={volume} onChange={changeVolume} />
        </div>
      </div>
    </div>
  );
}
