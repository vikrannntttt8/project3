import { usePlayer } from '../../context/PlayerContext.jsx';
import SeekBar      from './SeekBar.jsx';
import VolumeSlider from './VolumeSlider.jsx';

export default function PlayerDock() {
  const {
    currentSong, isPlaying, isLoading,
    currentTime, duration, seek,
    volume, changeVolume,
    view, toggleView,
    togglePlay, playNext, playPrev,
    isLiked, toggleLike,
  } = usePlayer();

  return (
    <div className={`fixed bottom-4 z-50 pointer-events-auto transition-all duration-500 ${
      view === 'lyrics' ? 'left-4 right-4' : 'left-[15.5rem] right-4'
    }`}>
      <div className="glass-dock rounded-2xl px-5 py-3 flex items-center justify-between gap-4 max-w-5xl mx-auto">

        {/* ── Left: Track info ─────────────────────────────── */}
        <div className="flex items-center gap-3 w-[220px] min-w-0 flex-shrink-0">
          <div className={`relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 ${isPlaying ? 'ring-1 ring-brand-violet' : ''}`}>
            {currentSong?.thumbnail ? (
              <img src={currentSong.thumbnail} alt={currentSong.title}
                className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <span className="material-symbols-outlined text-outline text-[20px]">album</span>
              </div>
            )}
            {/* Loading spinner over thumbnail */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          {currentSong && (
            <button
              onClick={() => toggleLike(currentSong)}
              className={`flex-shrink-0 transition-colors ${
                isLiked(currentSong.id) ? 'text-brand-pink' : 'text-on-surface-variant hover:text-brand-pink'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]"
                style={{fontVariationSettings:`'FILL' ${isLiked(currentSong.id) ? 1 : 0}`}}>
                favorite
              </span>
            </button>
          )}
        </div>

        {/* ── Center: Controls + Seekbar ────────────────────── */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 max-w-xl">
          {/* Transport */}
          <div className="flex items-center gap-4">
            <button onClick={() => {}} className="text-on-surface-variant hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">shuffle</span>
            </button>
            <button
              onClick={playPrev}
              className="text-on-surface-variant hover:text-white transition-colors"
              disabled={!currentSong}
            >
              <span className="material-symbols-outlined text-[24px]">skip_previous</span>
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              disabled={!currentSong}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150 shadow-lg shadow-white/10 disabled:opacity-40"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[22px] text-black font-bold"
                  style={{fontVariationSettings:"'FILL' 1"}}>
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              )}
            </button>

            <button
              onClick={playNext}
              className="text-on-surface-variant hover:text-white transition-colors"
              disabled={!currentSong}
            >
              <span className="material-symbols-outlined text-[24px]">skip_next</span>
            </button>
            <button className="text-on-surface-variant hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">repeat</span>
            </button>
          </div>

          {/* Seekbar */}
          <SeekBar currentTime={currentTime} duration={duration} onSeek={seek} />
        </div>

        {/* ── Right: Lyrics + Volume ────────────────────────── */}
        <div className="flex items-center gap-3 w-[200px] justify-end flex-shrink-0">
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

          {/* Volume */}
          <VolumeSlider volume={volume} onChange={changeVolume} />
        </div>
      </div>
    </div>
  );
}
