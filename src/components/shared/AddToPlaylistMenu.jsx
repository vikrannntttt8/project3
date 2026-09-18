import { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';

/**
 * Full-screen overlay that lets the user pick or create a playlist
 * to add a song to.
 */
export default function AddToPlaylistMenu({ song, onClose }) {
  const { playlists, addToPlaylist, createPlaylist } = usePlayer();
  const [newTitle,   setNewTitle]   = useState('');
  const [creating,   setCreating]   = useState(false);
  const [addedIds,   setAddedIds]   = useState([]);

  const handleAdd = (playlistId) => {
    addToPlaylist(playlistId, song);
    setAddedIds(prev => [...prev, playlistId]);
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const id = createPlaylist(newTitle.trim());
    addToPlaylist(id, song);
    setAddedIds(prev => [...prev, id]);
    setNewTitle('');
    setCreating(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl p-6 w-full max-w-sm mx-4 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <h3 className="text-headline-sm font-semibold text-white">Add to Playlist</h3>
            <p className="text-body-sm text-on-surface-variant truncate">{song.title}</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-white transition-colors p-1">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Create new playlist */}
        {creating ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Playlist name…"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-body-md outline-none focus:border-brand-violet/60"
            />
            <button onClick={handleCreate}
              className="px-3 py-2 rounded-lg bg-brand-violet text-white text-label-md font-semibold hover:bg-brand-violet/80 transition-colors">
              Create
            </button>
            <button onClick={() => setCreating(false)} className="text-on-surface-variant hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 border border-dashed border-white/15 hover:border-brand-violet/40 transition-all"
          >
            <span className="material-symbols-outlined text-[20px] text-brand-violet">add</span>
            <span className="text-label-lg text-on-surface-variant hover:text-white">New Playlist</span>
          </button>
        )}

        {/* Playlist list */}
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {playlists.length === 0 && (
            <p className="text-body-sm text-outline text-center py-4">No playlists yet — create one above</p>
          )}
          {playlists.map(pl => {
            const added = addedIds.includes(pl.id);
            return (
              <button
                key={pl.id}
                onClick={() => !added && handleAdd(pl.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  added
                    ? 'bg-brand-violet/10 border border-brand-violet/20 cursor-default'
                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-white/5 flex-shrink-0 overflow-hidden">
                  {pl.thumbnail
                    ? <img src={pl.thumbnail} className="w-full h-full object-cover" alt="" />
                    : <span className="material-symbols-outlined text-white/20 text-[18px] block mx-auto mt-1.5">queue_music</span>
                  }
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className={`text-label-lg font-semibold truncate ${added ? 'text-brand-violet' : 'text-white'}`}>
                    {pl.title}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">{pl.songs.length} tracks</span>
                </div>
                {added && (
                  <span className="material-symbols-outlined text-brand-violet text-[20px] ml-auto flex-shrink-0">check_circle</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
