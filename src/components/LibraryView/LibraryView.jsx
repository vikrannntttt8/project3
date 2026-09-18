import { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import SongRow from '../HomeView/SongRow.jsx';
import AddToPlaylistMenu from '../shared/AddToPlaylistMenu.jsx';

export default function LibraryView() {
  const {
    playlists, liked,
    createPlaylist, deletePlaylist, renamePlaylist,
    removeFromPlaylist, addToPlaylist,
    loadSong, playCollection, currentSong, isPlaying, togglePlay,
    isLiked, toggleLike,
  } = usePlayer();

  const [activeSection, setActiveSection] = useState('playlists'); // 'playlists' | 'liked'
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [creating, setCreating]   = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [addMenuSong, setAddMenuSong] = useState(null);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createPlaylist(newTitle.trim());
    setNewTitle('');
    setCreating(false);
  };

  const pl = activePlaylist
    ? playlists.find(p => p.id === activePlaylist)
    : null;

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 px-8 py-4 bg-[#09090B]/70 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4">
          {activePlaylist && (
            <button onClick={() => setActivePlaylist(null)}
              className="text-on-surface-variant hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          )}
          <h1 className="text-headline-lg font-bold text-white tracking-tight">
            {activePlaylist && pl ? pl.title : 'My Library'}
          </h1>
        </div>

        {!activePlaylist && (
          <div className="flex items-center gap-2 mt-3">
            {['playlists', 'liked'].map(sec => (
              <button key={sec} onClick={() => setActiveSection(sec)}
                className={`px-4 py-1.5 rounded-full text-label-md font-medium transition-all ${
                  activeSection === sec ? 'bg-white text-black' : 'bg-white/8 text-on-surface-variant hover:bg-white/12 hover:text-white'
                }`}>
                {sec === 'playlists' ? 'Playlists' : `Liked (${liked.length})`}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 px-8 py-6 pb-36">
        {/* ── Playlist detail view ──────────────────────────── */}
        {activePlaylist && pl && (
          <PlaylistDetail
            playlist={pl}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlaySong={(song, idx) => loadSong(song, pl.songs, idx)}
            onRemoveSong={(songId) => removeFromPlaylist(pl.id, songId)}
            onDelete={() => { deletePlaylist(pl.id); setActivePlaylist(null); }}
            onRename={(title) => renamePlaylist(pl.id, title)}
            onPlayAll={() => playCollection(pl.songs, 0)}
            onAddToPlaylist={setAddMenuSong}
          />
        )}

        {/* ── Playlists grid ────────────────────────────────── */}
        {!activePlaylist && activeSection === 'playlists' && (
          <div className="flex flex-col gap-6">
            {/* Create button */}
            {creating ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl glass-card border border-white/8">
                <span className="material-symbols-outlined text-brand-violet text-[22px]">queue_music</span>
                <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Playlist name…"
                  className="flex-1 bg-transparent border-none outline-none text-white text-body-lg placeholder:text-outline" />
                <button onClick={handleCreate}
                  className="px-4 py-1.5 rounded-full bg-brand-violet text-white text-label-md font-semibold hover:bg-brand-violet/80 transition-colors">
                  Create
                </button>
                <button onClick={() => setCreating(false)} className="text-on-surface-variant hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            ) : (
              <button onClick={() => setCreating(true)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-card border border-dashed border-white/15 hover:border-brand-violet/40 transition-all group">
                <span className="material-symbols-outlined text-[22px] text-brand-violet">add_circle</span>
                <span className="text-body-lg text-on-surface-variant group-hover:text-white transition-colors">Create New Playlist</span>
              </button>
            )}

            {playlists.length === 0 && !creating && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="material-symbols-outlined text-[56px] text-white/10">library_music</span>
                <p className="text-headline-sm text-on-surface-variant">No playlists yet</p>
                <p className="text-body-md text-outline">Create one above or save songs using the + button</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {playlists.map(pl => (
                <button key={pl.id} onClick={() => setActivePlaylist(pl.id)}
                  className="group flex flex-col gap-2 rounded-xl p-3 glass-card border border-white/5 hover:border-brand-violet/20 transition-all text-left">
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-white/5">
                    {pl.thumbnail
                      ? <img src={pl.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-white/15 text-[40px]">queue_music</span>
                        </div>
                    }
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-black text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>play_arrow</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-label-lg font-semibold text-white truncate group-hover:text-[#d0bcff] transition-colors">{pl.title}</p>
                    <p className="text-body-sm text-on-surface-variant">{pl.songs.length} tracks</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Liked songs ───────────────────────────────────── */}
        {!activePlaylist && activeSection === 'liked' && (
          <div className="flex flex-col gap-1">
            {liked.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="material-symbols-outlined text-[56px] text-white/10">favorite_border</span>
                <p className="text-headline-sm text-on-surface-variant">No liked songs yet</p>
                <p className="text-body-md text-outline">Hit the heart icon on any song to save it here</p>
              </div>
            )}
            {liked.map((song, i) => (
              <SongRow key={song.id} song={song} index={i}
                isActive={currentSong?.id === song.id}
                isPlaying={currentSong?.id === song.id && isPlaying}
                onPlay={() => loadSong(song, liked, i)}
                onAddToPlaylist={() => setAddMenuSong(song)} />
            ))}
          </div>
        )}
      </main>

      {addMenuSong && (
        <AddToPlaylistMenu song={addMenuSong} onClose={() => setAddMenuSong(null)} />
      )}
    </div>
  );
}

function PlaylistDetail({ playlist, currentSong, isPlaying, onPlaySong, onRemoveSong, onDelete, onRename, onPlayAll, onAddToPlaylist }) {
  const [editing, setEditing] = useState(false);
  const [title,   setTitle]   = useState(playlist.title);

  const handleRename = () => {
    if (title.trim()) onRename(title.trim());
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Playlist header */}
      <div className="flex items-end gap-6">
        <div className="w-36 h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-violet/30 to-brand-pink/20 flex-shrink-0 shadow-2xl">
          {playlist.thumbnail
            ? <img src={playlist.thumbnail} className="w-full h-full object-cover" alt="" />
            : <span className="material-symbols-outlined text-white/15 text-[60px] block mx-auto mt-10">queue_music</span>
          }
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                className="bg-white/5 border border-brand-violet/40 rounded-lg px-3 py-1 text-white text-headline-md outline-none" />
              <button onClick={handleRename} className="text-brand-violet hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[22px]">check</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="text-left group">
              <h2 className="text-headline-xl font-bold text-white tracking-tight group-hover:text-[#d0bcff] transition-colors">{playlist.title}</h2>
            </button>
          )}
          <p className="text-body-md text-on-surface-variant">{playlist.songs.length} songs</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={onPlayAll}
              disabled={!playlist.songs.length}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-label-lg hover:scale-105 transition-transform disabled:opacity-50">
              <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>play_arrow</span>
              Play All
            </button>
            <button onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/8 text-on-surface-variant hover:bg-red-500/20 hover:text-red-400 transition-all text-label-lg">
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Track list */}
      {playlist.songs.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-white/10">music_off</span>
          <p className="text-headline-sm text-on-surface-variant">Playlist is empty</p>
          <p className="text-body-md text-outline">Add songs using the + button on any track</p>
        </div>
      )}
      {playlist.songs.map((song, i) => (
        <div key={song.id} className="group flex items-center">
          <div className="flex-1 min-w-0">
            <SongRow song={song} index={i}
              isActive={currentSong?.id === song.id}
              isPlaying={currentSong?.id === song.id && isPlaying}
              onPlay={() => onPlaySong(song, i)}
              onAddToPlaylist={() => onAddToPlaylist(song)} />
          </div>
          <button onClick={() => onRemoveSong(song.id)}
            className="flex-shrink-0 ml-2 p-1.5 rounded-lg text-outline hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
            title="Remove from playlist">
            <span className="material-symbols-outlined text-[18px]">remove_circle_outline</span>
          </button>
        </div>
      ))}
    </div>
  );
}
