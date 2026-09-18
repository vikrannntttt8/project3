import { useState, useRef, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { useMusicSearch } from '../../hooks/useMusicSearch.js';
import { formatTime } from '../../utils/timeFormat.js';
import SearchBar from './SearchBar.jsx';
import RecommendationCard from './RecommendationCard.jsx';
import QuickReplayRow from './QuickReplayRow.jsx';

// Curated editorial recommendations shown on home
const FEATURED_MIXES = [
  {
    id: 'mix1',
    title: 'Ambient Waves Daily',
    subtitle: 'Updated Today • 42 Tracks',
    badge: 'Lossless',
    badgeColor: 'text-[#4cd7f6]',
    gradient: 'from-[#0c4a6e] to-[#1e3a5f]',
    videoId: 'hHW1oY26kxQ',
  },
  {
    id: 'mix2',
    title: 'Midnight Neon Drive',
    subtitle: 'Synthwave & Chill Drift',
    badge: 'Spatial',
    badgeColor: 'text-[#EC4899]',
    gradient: 'from-[#4c1d95] to-[#7c3aed]',
    videoId: 'f02mOEt11OQ',
  },
  {
    id: 'mix3',
    title: 'Spatial Immersion',
    subtitle: 'Apple Music Curators',
    badge: 'Master 96k',
    badgeColor: 'text-[#d0bcff]',
    gradient: 'from-[#1e1b4b] to-[#312e81]',
    videoId: '3JZ4pnNtyxQ',
  },
];

const QUEUE_TRACKS = [
  { title: 'Prism Shiver',     artist: 'Kaelen Brooks',   duration: '3:42', badge: 'Next', videoId: 'dQw4w9WgXcQ' },
  { title: 'Velvet Horizon',   artist: 'Sólveig',         duration: '4:18', badge: null,   videoId: 'kXYiU_JCYtU' },
  { title: 'Subliminal Void',  artist: 'Arca Nox',        duration: '5:05', badge: null,   videoId: 'SlPhMPnQ58k' },
  { title: 'Echoes of Dawn',   artist: 'Mira Thorne',     duration: '3:14', badge: null,   videoId: '3JZ4pnNtyxQ' },
  { title: 'Liquid Frequency', artist: 'Neural Resonance', duration: '4:49', badge: null,  videoId: 'hHW1oY26kxQ' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeView() {
  const { loadSong, currentSong, setView } = usePlayer();
  const { results, loading, search, getStreamDetails } = useMusicSearch();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (q) => {
    setQuery(q);
    search(q);
    setShowResults(!!q.trim());
  };

  const handleResultClick = async (result) => {
    setShowResults(false);
    setQuery('');
    try {
      const detail = await getStreamDetails(result.videoId);
      await loadSong({
        videoId: result.videoId,
        title: detail.title || result.title,
        artist: detail.uploader || result.artist,
        thumbnail: detail.thumbnail || result.thumbnail,
        streamUrl: detail.streamUrl,
        duration: detail.duration || result.duration,
      });
    } catch (err) {
      console.error('Failed to load song:', err);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* ── Top header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-space-xl py-4 bg-[#09090B]/60 backdrop-blur-xl border-b border-white/5">
        <div className="flex flex-col gap-0.5">
          <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
            Now Playing · <span className="text-[#4cd7f6]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4cd7f6] animate-ping mr-1" />
              Live Stream
            </span>
          </p>
          <h1 className="text-headline-lg font-bold text-white tracking-tight">
            {getGreeting()}, Vikrant
          </h1>
        </div>

        <div className="flex items-center gap-space-md relative">
          <SearchBar
            query={query}
            onChange={handleSearch}
            onFocus={() => query && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
          {/* Audio quality badge */}
          <div className="hidden lg:flex items-center gap-2 px-space-md py-1.5 rounded-full bg-white/5 border border-white/8">
            <span className="material-symbols-outlined text-[#4cd7f6] text-[16px]">graphic_eq</span>
            <span className="text-label-sm font-semibold text-white tracking-wide uppercase">Hi-Res</span>
            <span className="w-1 h-1 rounded-full bg-outline" />
            <span className="text-label-sm text-on-surface-variant font-mono">24-bit / 192kHz</span>
          </div>

          {/* Search results dropdown */}
          {showResults && results.length > 0 && (
            <div className="absolute top-full right-0 mt-2 w-96 glass-panel rounded-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {loading && (
                <div className="px-4 py-3 text-on-surface-variant text-body-sm">Searching…</div>
              )}
              {results.map(r => (
                <button
                  key={r.videoId}
                  onMouseDown={() => handleResultClick(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <img
                    src={r.thumbnail}
                    alt={r.title}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-white/10"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-label-lg font-semibold text-white truncate">{r.title}</span>
                    <span className="text-body-sm text-on-surface-variant truncate">{r.artist}</span>
                  </div>
                  <span className="text-label-sm text-outline font-mono flex-shrink-0 ml-auto">
                    {formatTime(r.duration)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-space-xl py-space-xl pb-36">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl">

          {/* ── LEFT: Now Playing / Album art ──────────────────────── */}
          <div className="xl:col-span-5 flex flex-col gap-space-xl">
            {/* Album art */}
            <div className="relative group mx-auto w-full max-w-[380px]">
              {/* Chromatic ambient glow */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-brand-violet/30 via-brand-pink/20 to-brand-cyan/25 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition-all duration-700 pointer-events-none" />
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white/5 shadow-2xl">
                {currentSong?.thumbnail ? (
                  <img
                    src={currentSong.thumbnail}
                    alt={currentSong.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-violet/20 to-brand-cyan/10">
                    <span className="material-symbols-outlined text-white/20 text-[120px]">album</span>
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/5 pointer-events-none" />
                {/* Floating Spatial badge */}
                <div className="absolute top-4 right-4 backdrop-blur-md bg-black/60 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#4cd7f6] text-[14px]">spatial_audio</span>
                  <span className="text-label-sm font-semibold uppercase text-white">Spatial</span>
                </div>
                {/* Hover overlay controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-label-sm font-mono bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-white">
                    Master Audio
                  </span>
                </div>
              </div>
            </div>

            {/* Track info */}
            {currentSong && (
              <div className="flex flex-col gap-2 text-center xl:text-left">
                <div className="flex items-center justify-center xl:justify-start gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-brand-violet/10 text-[#d0bcff] text-label-sm tracking-wide">DOLBY ATMOS</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#4cd7f6]/10 text-[#4cd7f6] text-label-sm tracking-wide">HI-RES</span>
                </div>
                <h2 className="text-headline-xl font-bold text-white tracking-tight truncate">
                  {currentSong.title}
                </h2>
                <p className="text-headline-sm text-[#d0bcff]">{currentSong.artist}</p>
              </div>
            )}
            {!currentSong && (
              <div className="text-center xl:text-left">
                <h2 className="text-headline-md font-semibold text-on-surface-variant">
                  Search for a song to begin
                </h2>
                <p className="text-body-md text-outline mt-1">Powered by YouTube Music · Innertube</p>
              </div>
            )}

            {/* Quick Replay Row */}
            <QuickReplayRow onPlay={handleResultClick} />
          </div>

          {/* ── RIGHT: Recommendations + Queue ─────────────────────── */}
          <div className="xl:col-span-7 flex flex-col gap-space-xl">
            {/* Featured Mixes */}
            <section className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-headline-sm font-semibold text-white">Curated Frequency Radios</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/8 text-on-surface-variant text-label-sm">Editor's Choice</span>
                </div>
                <button className="text-label-sm text-[#d0bcff] hover:underline flex items-center gap-0.5">
                  See all <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                {FEATURED_MIXES.map(mix => (
                  <RecommendationCard
                    key={mix.id}
                    mix={mix}
                    onPlay={() => handleResultClick({ videoId: mix.videoId, title: mix.title, artist: 'Pulse Radio', thumbnail: '' })}
                  />
                ))}
              </div>
            </section>

            {/* Queue */}
            <section className="glass-panel rounded-2xl p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="text-headline-sm font-semibold text-white">Playing Next</span>
                  <span className="text-body-sm text-on-surface-variant">from "Ethereal Drift Radio"</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="bg-white/5 p-1 rounded-full flex items-center gap-1 text-label-sm">
                    <button className="px-3 py-1 rounded-full bg-white/10 text-white font-semibold">Queue (14)</button>
                    <button className="px-3 py-1 rounded-full text-on-surface-variant hover:text-white transition-colors">History</button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {QUEUE_TRACKS.map((track, i) => (
                  <button
                    key={i}
                    onClick={() => handleResultClick({ videoId: track.videoId, title: track.title, artist: track.artist, thumbnail: '' })}
                    className="group flex items-center justify-between px-space-md py-space-sm rounded-xl hover:bg-white/5 transition-all cursor-pointer w-full text-left"
                  >
                    <div className="flex items-center gap-space-md min-w-0">
                      <span className="material-symbols-outlined text-outline group-hover:text-white transition-colors text-[18px]">drag_indicator</span>
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-violet/30 to-brand-cyan/20 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-white/40 text-[18px]">music_note</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-label-lg font-semibold text-white truncate group-hover:text-[#d0bcff] transition-colors">
                            {track.title}
                          </span>
                          {track.badge && (
                            <span className="text-label-sm text-[#4cd7f6] bg-[#4cd7f6]/10 px-1.5 rounded uppercase">
                              {track.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-body-sm text-on-surface-variant truncate">{track.artist}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-md flex-shrink-0">
                      <span className="text-label-sm text-outline font-mono">{track.duration}</span>
                      <button className="text-on-surface-variant hover:text-[#EC4899] transition-colors">
                        <span className="material-symbols-outlined text-[18px]">favorite_border</span>
                      </button>
                    </div>
                  </button>
                ))}
              </div>

              <button className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/8 text-on-surface-variant hover:text-white text-label-md transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">playlist_add</span>
                Add More to Current Session
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
