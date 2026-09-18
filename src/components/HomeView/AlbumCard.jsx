export default function AlbumCard({ item, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-2 rounded-xl p-3 bg-white/3 hover:bg-white/8 border border-white/5 hover:border-brand-violet/20 transition-all duration-300 text-left w-full"
    >
      {/* Art */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-white/5">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-white/15 text-[40px]">
              {item.type === 'playlist' ? 'queue_music' : 'album'}
            </span>
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-black text-[22px]" style={{fontVariationSettings:"'FILL' 1"}}>play_arrow</span>
          </div>
        </div>
        {/* Song count badge */}
        {item.songCount > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-label-sm text-white/70">
            {item.songCount} tracks
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-0">
        <span className="text-label-lg font-semibold text-white truncate group-hover:text-[#d0bcff] transition-colors">
          {item.title}
        </span>
        <span className="text-body-sm text-on-surface-variant truncate">
          {item.artist || item.year || ''}
        </span>
      </div>
    </button>
  );
}
