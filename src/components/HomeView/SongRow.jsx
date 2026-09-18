import { formatTime } from '../../utils/timeFormat.js';
import { usePlayer } from '../../context/PlayerContext.jsx';

export default function SongRow({ song, index, isActive, isPlaying, onPlay, onAddToPlaylist }) {
  const { isLiked, toggleLike } = usePlayer();
  const liked = isLiked(song.id);

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
        isActive ? 'bg-brand-violet/10 border border-brand-violet/20' : 'hover:bg-white/5'
      }`}
      onClick={onPlay}
    >
      {/* Index / Play indicator */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center">
        {isActive && isPlaying ? (
          <div className="flex items-end gap-[2px] h-4 w-4">
            {[...Array(3)].map((_, i) => (
              <span key={i} className={`visualizer-bar w-[3px] bg-brand-violet rounded-full`} />
            ))}
          </div>
        ) : (
          <>
            <span className={`text-label-md font-mono group-hover:hidden ${isActive ? 'text-brand-violet' : 'text-outline'}`}>
              {index + 1}
            </span>
            <span className="material-symbols-outlined text-[18px] text-white hidden group-hover:block"
              style={{fontVariationSettings:"'FILL' 1"}}>play_arrow</span>
          </>
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
        {song.thumbnail
          ? <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
          : <span className="material-symbols-outlined text-white/20 text-[20px] m-auto block mt-2.5">music_note</span>
        }
      </div>

      {/* Title & artist */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className={`text-label-lg font-semibold truncate ${isActive ? 'text-brand-violet' : 'text-white group-hover:text-[#d0bcff]'} transition-colors`}>
          {song.title}
          {song.explicit && (
            <span className="ml-1 text-label-sm bg-white/10 text-on-surface-variant px-1 rounded align-middle">E</span>
          )}
        </span>
        <span className="text-body-sm text-on-surface-variant truncate">{song.artist}</span>
      </div>

      {/* Album (hidden on small) */}
      <span className="hidden lg:block text-body-sm text-on-surface-variant truncate max-w-[160px]">
        {song.album}
      </span>

      {/* Actions */}
      <div className={`flex items-center gap-2 flex-shrink-0 transition-opacity ${
        liked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <button
          onClick={e => { e.stopPropagation(); toggleLike(song); }}
          className={`p-1.5 rounded-full transition-transform active:scale-90 ${
            liked ? 'text-brand-pink' : 'text-on-surface-variant hover:text-brand-pink'
          }`}
          title={liked ? 'Unlike' : 'Like'}
        >
          <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:`'FILL' ${liked ? 1 : 0}`}}>
            favorite
          </span>
        </button>
        <button
          onClick={e => { e.stopPropagation(); onAddToPlaylist?.(); }}
          className="p-1.5 rounded-full text-on-surface-variant hover:text-white transition-colors"
          title="Add to playlist"
        >
          <span className="material-symbols-outlined text-[20px]">playlist_add</span>
        </button>
      </div>

      {/* Duration */}
      <span className="text-label-sm text-outline font-mono w-10 text-right flex-shrink-0">
        {formatTime(song.duration)}
      </span>
    </div>
  );
}
