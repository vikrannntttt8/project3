import { usePlayer } from '../../context/PlayerContext.jsx';
import { formatTime, formatRemaining } from '../../utils/timeFormat.js';

export default function AlbumArtPanel() {
  const {
    currentSong, isPlaying, togglePlay,
    currentTime, duration, seek, volume, changeVolume,
    isLiked, toggleLike, playPrev, playNext,
  } = usePlayer();

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const liked = currentSong ? isLiked(currentSong.id) : false;

  return (
    <section className="lg:col-span-6 flex flex-col justify-center items-center lg:items-start w-full max-w-[430px] mx-auto lg:mx-0">
      {/* Album Artwork */}
      <div className="relative group w-full aspect-square max-w-[380px] mb-8">
        {/* Ambient glow */}
        <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-r from-brand-violet via-brand-pink to-brand-cyan opacity-25 blur-2xl group-hover:opacity-40 transition-all duration-700" />
        {/* Art */}
        {currentSong?.thumbnail ? (
          <img
            src={currentSong.thumbnail}
            alt={currentSong?.title || 'Album Art'}
            className="relative w-full h-full object-cover rounded-[24px] shadow-2xl ring-1 ring-white/10"
          />
        ) : (
          <div className="relative w-full h-full rounded-[24px] bg-gradient-to-br from-brand-violet/20 to-brand-cyan/10 ring-1 ring-white/10 flex items-center justify-center shadow-2xl">
            <span className="material-symbols-outlined text-white/10 text-[100px]">album</span>
          </div>
        )}
      </div>

      {/* Track metadata */}
      <div className="w-full flex items-center justify-between mb-6">
        <div className="flex flex-col pr-4 min-w-0">
          <h1 className="text-[28px] font-bold tracking-tight text-white leading-tight truncate">
            {currentSong?.title || 'No Track Loaded'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-medium text-on-surface-variant hover:text-white transition-colors cursor-pointer">
              {currentSong?.artist || '—'}
            </span>
          </div>
        </div>
        {currentSong && (
          <button
            onClick={() => toggleLike(currentSong)}
            className={`p-2 rounded-full transition-transform active:scale-90 hover:bg-white/5 ${
              liked ? 'text-brand-pink' : 'text-on-surface-variant hover:text-brand-pink'
            }`}
            title={liked ? 'Unlike' : 'Like'}
          >
            <span className="material-symbols-outlined text-[28px]"
              style={{fontVariationSettings:`'FILL' ${liked ? 1 : 0}`}}>
              favorite
            </span>
          </button>
        )}
      </div>

      {/* Seek bar */}
      <div className="w-full mb-6">
        <div className="relative w-full flex items-center group cursor-pointer">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full seek-fill transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={e => seek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          />
        </div>
        <div className="flex justify-between text-label-sm text-on-surface-variant mt-2 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatRemaining(currentTime, duration)}</span>
        </div>
      </div>

      {/* Playback controls */}
      <div className="w-full flex items-center justify-between px-2 mb-6">
        <button className="text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[22px]">shuffle</span>
        </button>
        <button
          onClick={playPrev}
          disabled={!currentSong}
          className="text-on-surface-variant hover:text-white transition-colors disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[28px]">skip_previous</span>
        </button>

        {/* Main play/pause */}
        <button
          onClick={togglePlay}
          disabled={!currentSong}
          className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 shadow-xl shadow-white/10 disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <button
          onClick={playNext}
          disabled={!currentSong}
          className="text-on-surface-variant hover:text-white transition-colors disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[28px]">skip_next</span>
        </button>
        <button className="text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[22px]">repeat</span>
        </button>
      </div>

      {/* Volume slider */}
      <div className="w-full flex items-center gap-3 px-1">
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">volume_down</span>
        <div className="relative flex-1">
          <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div className="bg-on-surface-variant h-full rounded-full" style={{ width: `${volume * 100}%` }} />
          </div>
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={volume}
            onChange={e => changeVolume(parseFloat(e.target.value))}
            className="volume-slider absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          />
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">volume_up</span>
      </div>
    </section>
  );
}
