import { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import SeekBar      from './SeekBar.jsx';
import VolumeSlider from './VolumeSlider.jsx';
import AddToPlaylistMenu from '../shared/AddToPlaylistMenu.jsx';
export default function PlayerDock() {
  const {
    currentSong, isPlaying, isLoading,
    currentTime, duration, seek,
    volume, changeVolume,
    view, toggleView,
    togglePlay, playNext, playPrev,
    isLiked, toggleLike,
    isSettingsOpen,
  } = usePlayer();

  const [addMenuSong, setAddMenuSong] = useState(null);

  // Auto-unmount/hide mini-player dock when full-screen expanded views open (lyrics or settings)
  if (view === 'lyrics' || isSettingsOpen) {
    return null;
  }

  const liked = currentSong ? isLiked(currentSong.id) : false;

  return (
    <>
      <div className="player-dock-wrap fixed z-50 pointer-events-auto transition-all duration-500 left-3 right-3 bottom-3 md:left-[15.5rem] md:right-4 md:bottom-4">
        <div className="glass-dock player-dock-inner rounded-2xl px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 max-w-5xl mx-auto shadow-2xl border border-white/10">

          {/* ── Left: Track info + Actions ────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-3 max-w-[135px] xs:max-w-[170px] sm:max-w-[220px] min-w-0 flex-shrink-1">
            <div className={`player-dock-thumb relative w-9 h-9 sm:w-11 sm:h-11 rounded-lg overflow-hidden flex-shrink-0 ${isPlaying ? 'ring-1 ring-brand-violet' : ''}`}>
              {currentSong?.thumbnail ? (
                <img src={currentSong.thumbnail} alt={currentSong.title}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-outline text-[20px]">album</span>
                </div>
              )}
              {isLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="player-dock-title text-label-md font-semibold text-white truncate text-[13px] sm:text-[14px]">
                {currentSong?.title || 'Nothing playing'}
              </span>
              <span className="player-dock-artist text-body-sm text-on-surface-variant truncate text-[11px] sm:text-[12px]">
                {currentSong?.artist || 'Search for a song'}
              </span>
            </div>

            {currentSong && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Heart / Like button */}
                <button
                  onClick={() => toggleLike(currentSong)}
                  className={`player-dock-btn p-1 rounded-full transition-transform active:scale-90 ${
                    liked ? 'text-brand-pink' : 'text-on-surface-variant hover:text-brand-pink'
                  }`}
                  title={liked ? 'Unlike' : 'Like'}
                >
                  <span className="material-symbols-outlined text-[19px] sm:text-[20px]"
                    style={{fontVariationSettings:`'FILL' ${liked ? 1 : 0}`}}>
                    favorite
                  </span>
                </button>

                {/* TASK 3: Add to Playlist button */}
                <button
                  onClick={() => setAddMenuSong(currentSong)}
                  className="player-dock-btn p-1 rounded-full text-on-surface-variant hover:text-white transition-colors"
                  title="Add to playlist"
                >
                  <span className="material-symbols-outlined text-[19px] sm:text-[20px]">
                    playlist_add
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* ── Center: Transport Controls + Seekbar ────────────── */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0 max-w-xl">
            {/* Transport */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => {}} className="hidden sm:block text-on-surface-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">shuffle</span>
              </button>

              <button
                onClick={playPrev}
                className="player-dock-btn text-on-surface-variant hover:text-white transition-colors disabled:opacity-30 p-1"
                disabled={!currentSong}
              >
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">skip_previous</span>
              </button>

              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                disabled={!currentSong}
                className="player-dock-btn w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150 shadow-lg shadow-white/10 disabled:opacity-40"
              >
                {isLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px] text-black font-bold"
                    style={{fontVariationSettings:"'FILL' 1"}}>
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                )}
              </button>

              <button
                onClick={playNext}
                className="player-dock-btn text-on-surface-variant hover:text-white transition-colors disabled:opacity-30 p-1"
                disabled={!currentSong}
              >
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">skip_next</span>
              </button>

              <button className="hidden sm:block text-on-surface-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">repeat</span>
              </button>
            </div>

            {/* Seekbar */}
            <SeekBar currentTime={currentTime} duration={duration} onSeek={seek} />
          </div>

          {/* ── Right: Lyrics + Volume ────────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-3 w-[70px] sm:w-[190px] justify-end flex-shrink-0">
            {/* Lyrics toggle */}
            <button
              onClick={toggleView}
              className="px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1 text-label-sm font-medium transition-all bg-white/8 text-on-surface-variant hover:text-white hover:bg-white/12"
              title="Open full lyrics & now playing"
            >
              <span className="material-symbols-outlined text-[16px]">lyrics</span>
              <span className="hidden sm:inline">Lyrics</span>
            </button>

            {/* Volume slider (hidden on small mobile viewports) */}
            <div className="hidden md:flex">
              <VolumeSlider volume={volume} onChange={changeVolume} />
            </div>
          </div>
        </div>
      </div>

      {addMenuSong && (
        <AddToPlaylistMenu song={addMenuSong} onClose={() => setAddMenuSong(null)} />
      )}
    </>
  );
}
