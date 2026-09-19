import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import SettingsModal from './shared/SettingsModal.jsx';

const NAV_ITEMS = [
  { icon: 'home',          label: 'Home',     view: 'home'    },
  { icon: 'local_library', label: 'Library',  view: 'library' },
  { icon: 'favorite',      label: 'Liked',    view: 'liked'   },
];

export default function Sidebar() {
  const { view, setView, playlists, liked, playCollection, customAlbums = [], setIsSettingsOpen } = usePlayer();

  return (
    <aside className="h-full w-60 glass-panel flex flex-col justify-between py-4 px-3 border-r border-white/5 select-none overflow-hidden">
      <div className="flex flex-col gap-4 min-h-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-1 py-1 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-violet to-brand-pink flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-headline-sm font-semibold text-white tracking-tight">Pulse</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-shrink-0">
          {NAV_ITEMS.map(item => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 w-full text-left ${
                view === item.view
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${item.view === 'liked' && view === 'liked' ? 'text-brand-pink' : ''}`}
                style={{ fontVariationSettings: item.view === 'liked' && liked.length > 0 ? "'FILL' 1" : undefined }}>
                {item.icon}
              </span>
              <span className="text-body-md font-medium">{item.label}</span>
              {item.view === 'liked' && liked.length > 0 && (
                <span className="ml-auto text-label-sm text-brand-pink bg-brand-pink/10 font-bold px-2 py-0.5 rounded-full">
                  {liked.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="h-px bg-white/8 flex-shrink-0" />

        {/* Playlists & Custom Albums */}
        <div className="flex flex-col gap-0.5 min-h-0 flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-1 mb-1 flex-shrink-0">
            <span className="text-label-sm uppercase tracking-widest text-outline">Playlists & Albums</span>
            <button
              onClick={() => setView('library')}
              className="text-outline hover:text-white transition-colors"
              title="Manage playlists & albums"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
          <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
            {playlists.length === 0 && customAlbums.length === 0 && (
              <p className="text-body-sm text-outline px-1 py-2">No playlists yet</p>
            )}
            {playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => {
                  if (pl.songs.length) playCollection(pl.songs, 0);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-white transition-colors text-left w-full group"
              >
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-violet/40 to-brand-pink/30 flex-shrink-0 overflow-hidden">
                  {pl.thumbnail
                    ? <img src={pl.thumbnail} className="w-full h-full object-cover" alt="" />
                    : <span className="material-symbols-outlined text-[14px] text-white/40 m-auto block mt-1">queue_music</span>
                  }
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-body-sm font-medium truncate group-hover:text-white transition-colors">
                    {pl.title}
                  </span>
                  <span className="text-label-sm text-outline">{pl.songs.length} tracks</span>
                </div>
              </button>
            ))}

            {customAlbums.map(album => (
              <button
                key={album.id}
                onClick={() => {
                  if (album.songs.length) playCollection(album.songs, 0);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-white transition-colors text-left w-full group"
              >
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-cyan/40 to-brand-violet/30 flex-shrink-0 overflow-hidden">
                  {album.thumbnail
                    ? <img src={album.thumbnail} className="w-full h-full object-cover" alt="" />
                    : <span className="material-symbols-outlined text-[14px] text-brand-cyan m-auto block mt-1">album</span>
                  }
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-body-sm font-medium truncate group-hover:text-white transition-colors">
                    {album.title}
                  </span>
                  <span className="text-label-sm text-outline">{album.songs.length} tracks · Album</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings button anchored to bottom left */}
      <div className="flex-shrink-0 pt-2 border-t border-white/5 mt-auto">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="sidebar-settings-btn flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/5 transition-all duration-200 w-full text-left group min-h-[44px]"
          title="Settings"
        >
          <span className="material-symbols-outlined text-[20px] text-outline group-hover:text-white group-hover:rotate-45 transition-transform duration-300">
            settings
          </span>
          <span className="text-body-md font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
}
