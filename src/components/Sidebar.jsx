import { usePlayer } from '../context/PlayerContext.jsx';

const NAV_ITEMS = [
  { icon: 'home',          label: 'Home',      path: 'home'      },
  { icon: 'search',        label: 'Search',    path: 'search'    },
  { icon: 'local_library', label: 'Library',   path: 'library'   },
  { icon: 'favorite',      label: 'Favorites', path: 'favorites' },
  { icon: 'queue_music',   label: 'Queue',     path: 'queue'     },
];

const PLAYLISTS = [
  'Deep Focus',
  'Late Night Ambient',
  'Synthwave Drift',
  'Acoustic Sanctuary',
  'Spatial Audio Essentials',
];

export default function Sidebar() {
  const { view, setView } = usePlayer();

  return (
    <aside className="h-full w-60 glass-panel flex flex-col justify-between py-space-md px-space-md select-none border-r border-white/5">
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-space-lg">
        <div className="flex items-center gap-space-sm px-space-xs py-space-xs">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-violet to-brand-pink flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-headline-sm font-semibold text-white tracking-tight">Pulse</span>
        </div>

        {/* ── Navigation ─────────────────────────────────────────── */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              onClick={() => item.path === 'home' && setView('home')}
              className={`flex items-center gap-space-sm px-space-sm py-2 rounded-lg transition-all duration-200 text-left w-full ${
                view === 'home' && item.path === 'home'
                  ? 'bg-white/10 text-white'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-body-md font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Playlists ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <span className="text-label-sm uppercase tracking-widest text-outline px-space-sm mb-1">
            Playlists
          </span>
          {PLAYLISTS.map(name => (
            <button
              key={name}
              className="px-space-sm py-1.5 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-white text-body-sm truncate transition-colors text-left"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* ── User profile ────────────────────────────────────────── */}
      <div className="p-space-xs bg-white/5 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-violet to-brand-pink flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-white text-[16px]">person</span>
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-label-md font-semibold text-white truncate">Vikrant</span>
            <span className="text-label-sm text-[#4cd7f6] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4cd7f6] inline-block animate-pulse" />
              Hi-Fi Active
            </span>
          </div>
        </div>
        <button className="p-1.5 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>
      </div>
    </aside>
  );
}
