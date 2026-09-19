import { useState, useEffect } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext.jsx';
import HomeView      from './components/HomeView/HomeView.jsx';
import LyricsView    from './components/LyricsView/LyricsView.jsx';
import LibraryView   from './components/LibraryView/LibraryView.jsx';
import PlayerDock    from './components/PlayerDock/PlayerDock.jsx';
import Sidebar       from './components/Sidebar.jsx';
import ArtistView    from './components/ArtistView/ArtistView.jsx';
import AlbumView     from './components/AlbumView/AlbumView.jsx';
import SingleView    from './components/SingleView/SingleView.jsx';
import SettingsModal from './components/shared/SettingsModal.jsx';

function AppShell() {
  const { view, navState, currentSong, isSettingsOpen, setIsSettingsOpen, streamToast } = usePlayer();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on view change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [view]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090B] relative">
      {/* ── Reactive Ambient Background Engine (WCAG Frosted Mask) ────────── */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Dynamic artwork blur */}
        {currentSong?.cover || currentSong?.thumbnail ? (
          <div
            className="absolute inset-[-20%] bg-cover bg-center transition-all duration-1000 ease-out"
            style={{
              backgroundImage: `url(${currentSong.cover || currentSong.thumbnail})`,
              filter: 'blur(80px)',
              transform: 'scale(1.25)',
              opacity: 0.3,
            }}
          />
        ) : (
          <div
            className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#6b21a8] via-[#a21caf] to-[#0e7490] opacity-20 blur-[140px]"
            style={{ animation: 'glow-pulse 8s ease-in-out infinite' }}
          />
        )}
        <div className="absolute bottom-[-15%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[#1e1b4b] opacity-25 blur-[130px]" />
        <div className="absolute top-[30%] left-[40%] w-[30vw] h-[30vw] rounded-full bg-[#0c4a6e] opacity-15 blur-[120px]" />

        {/* Dark frosted readability mask maintaining WCAG contrast */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      {/* ── Mobile Hamburger Toggle (Visible only on mobile when not in lyrics) ── */}
      {view !== 'lyrics' && !isSettingsOpen && (
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-xl glass-panel text-white hover:bg-white/10 flex items-center justify-center shadow-lg border border-white/10"
          aria-label="Toggle Navigation"
        >
          <span className="material-symbols-outlined text-[22px]">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      )}

      {/* ── Mobile Drawer Backdrop ────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────── */}
      {/* On desktop: fixed left bar. On mobile: slide-over drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-40 md:static md:z-20 transition-all duration-300 flex-shrink-0
        ${view === 'lyrics' || isSettingsOpen ? 'hidden md:w-0 md:overflow-hidden md:opacity-0' : ''}
        ${mobileMenuOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0 md:w-60'}
      `}>
        <Sidebar />
      </div>

      {/* ── Main content with smooth transitions ─────────────── */}
      <div className="flex-1 relative z-10 overflow-hidden">
        <div key={`${view}-${navState.currentId || ''}`} className="h-full w-full animate-page-slide">
          {(view === 'home' || view === 'search') && <HomeView />}
          {view === 'artist'  && <ArtistView browseId={navState.currentId} artistName={navState.extra?.name} />}
          {view === 'album'   && <AlbumView browseId={navState.currentId} initialData={navState.extra} />}
          {view === 'single'  && <SingleView videoId={navState.currentId} track={navState.extra} />}
          {view === 'lyrics'  && <LyricsView />}
          {view === 'library' && <LibraryView initialSection="playlists" />}
          {view === 'liked'   && <LibraryView initialSection="liked" />}
        </div>
      </div>

      {/* ── Stream Quality / Bitrate Toast ── */}
      {streamToast && (
        <div className="fixed top-5 right-5 z-[110] p-3.5 rounded-2xl bg-[#18181c]/95 border border-brand-cyan/40 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-fade-in text-white">
          <div className="w-8 h-8 rounded-xl bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan flex-shrink-0">
            <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
          </div>
          <div>
            <p className="text-label-md font-bold text-white">{streamToast.title}</p>
            <p className="text-body-xs font-mono text-outline">{streamToast.detail}</p>
          </div>
        </div>
      )}

      {/* ── Persistent Glass Player Dock (hidden in expanded lyrics view or full-screen settings) ── */}
      {view !== 'lyrics' && !isSettingsOpen && <PlayerDock />}

      {/* ── Full-Screen Settings Overlay ── */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <AppShell />
    </PlayerProvider>
  );
}
