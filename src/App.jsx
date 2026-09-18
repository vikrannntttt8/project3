import { PlayerProvider, usePlayer } from './context/PlayerContext.jsx';
import HomeView from './components/HomeView/HomeView.jsx';
import LyricsView from './components/LyricsView/LyricsView.jsx';
import PlayerDock from './components/PlayerDock/PlayerDock.jsx';
import Sidebar from './components/Sidebar.jsx';

function AppShell() {
  const { view } = usePlayer();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090B] relative">
      {/* ── Ambient atmospheric glow layer (fixed, below everything) ── */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#6b21a8] via-[#a21caf] to-[#0e7490] opacity-20 blur-[140px] ambient-glow" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[#1e1b4b] opacity-25 blur-[130px]" />
        <div className="absolute top-[30%] left-[40%] w-[30vw] h-[30vw] rounded-full bg-[#0c4a6e] opacity-15 blur-[120px]" />
      </div>

      {/* ── Sidebar (hidden in lyrics fullscreen view) ─────────────── */}
      <div
        className={`relative z-20 transition-all duration-500 flex-shrink-0 ${
          view === 'lyrics' ? 'w-0 overflow-hidden opacity-0' : 'w-60 opacity-100'
        }`}
      >
        <Sidebar />
      </div>

      {/* ── Main content area ───────────────────────────────────────── */}
      <div className="flex-1 relative z-10 overflow-hidden">
        <div
          key={view}
          className="h-full w-full animate-fade-in"
        >
          {view === 'home'   && <HomeView />}
          {view === 'lyrics' && <LyricsView />}
        </div>
      </div>

      {/* ── Persistent Glass Player Dock ────────────────────────────── */}
      <PlayerDock />
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
