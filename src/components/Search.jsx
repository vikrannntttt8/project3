import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce.js';
import { usePlayer } from '../context/PlayerContext.jsx';
import { formatDuration } from '../utils/timeFormat.js';
import AddToPlaylistMenu from './shared/AddToPlaylistMenu.jsx';

const TABS = [
  { id: 'all',     label: 'All',     icon: 'explore' },
  { id: 'songs',   label: 'Songs',   icon: 'music_note' },
  { id: 'albums',  label: 'Albums',  icon: 'album' },
  { id: 'artists', label: 'Artists', icon: 'person' },
];

/**
 * Search Component — High-performance YouTube Music search powered by Innertube
 *
 * - Synchronous input state (0ms UI typing lag)
 * - 200ms debounced network requests via useDebounce
 * - Category tabs: All, Songs, Albums, Artists
 * - Official track sorting & fan-edit filtering on backend
 * - Container constrained to max-h-[72vh] with smooth scrolling & subtle dividers
 * - Integrated navigation to Artist and Album views
 */
export default function Search({ onSelectTrack, onArtistClick }) {
  const { navigateTo, loadSong, isLiked, toggleLike } = usePlayer();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addMenuSong, setAddMenuSong] = useState(null);

  // Synchronous input typing + 200ms debounced network dispatch
  const debouncedQuery = useDebounce(searchTerm, 200);
  const abortControllerRef = useRef(null);

  const fetchResults = useCallback((query, tab) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel any in-flight fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(trimmed)}&type=${tab}`, {
      signal: abortController.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setResults(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('[Search] Fetch error:', err);
        setError(err.message || 'Failed to fetch results');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchResults(debouncedQuery, activeTab);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery, activeTab, fetchResults]);

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setError(null);
  };

  const handleTrackClick = (track) => {
    if (onSelectTrack) {
      onSelectTrack(track);
    } else {
      loadSong(track, [track], 0);
    }
  };

  const handleArtistNavigation = (artistName, artistId) => {
    if (onArtistClick) {
      onArtistClick(artistName, artistId);
    }
    navigateTo('artist', artistId, { name: artistName });
  };

  const handleAlbumNavigation = (album) => {
    navigateTo('album', album.browseId || album.id, {
      title: album.title,
      artist: album.artist,
      cover: album.thumbnail || album.cover,
    });
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Search Input Bar (0-latency synchronous typing) */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
          <span className="material-symbols-outlined text-[20px]">search</span>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search songs, artists, or albums via YouTube Music..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-outline text-body-md focus:outline-none focus:border-brand-violet/60 focus:ring-1 focus:ring-brand-violet/60 transition-all"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Category Tabs: All, Songs, Albums, Artists */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-label-sm font-medium transition-all duration-200 flex-shrink-0 ${
                isActive
                  ? 'bg-brand-violet text-white shadow-md shadow-brand-violet/20 font-semibold'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center gap-2 px-3 py-2 text-label-sm text-outline animate-pulse">
          <div className="w-4 h-4 border-2 border-brand-violet border-t-transparent rounded-full animate-spin" />
          <span>Searching YouTube Music ({activeTab})...</span>
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="p-3 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-body-sm">
          {error}
        </div>
      )}

      {/* Results Container: Constrained to max-h-[72vh] with smooth scroll & subtle dividers */}
      {results.length > 0 && (
        <div className="w-full max-h-[72vh] overflow-y-auto pr-2 scroll-smooth rounded-xl bg-white/[0.02] border border-white/5 shadow-xl">
          <div className="divide-y divide-neutral-800">
            {results.map((item, idx) => {
              const itemType = item.type || (activeTab === 'albums' ? 'album' : activeTab === 'artists' ? 'artist' : 'song');

              // ── Artist Row / Card ───────────────────────────────────────
              if (itemType === 'artist') {
                return (
                  <div
                    key={item.id || item.browseId || idx}
                    onClick={() => handleArtistNavigation(item.name, item.browseId || item.id)}
                    className="group flex items-center justify-between p-3 hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-white/10 group-hover:border-brand-violet/50 transition-colors"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/10">
                          <span className="material-symbols-outlined text-white/50 text-[24px]">person</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-label-md font-semibold text-white truncate group-hover:text-brand-violet transition-colors">
                            {item.name}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 flex-shrink-0">
                            Artist
                          </span>
                        </div>
                        <p className="text-body-sm text-outline truncate mt-0.5">
                          View profile & discography
                        </p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[20px] text-white/40 group-hover:text-white transition-colors">
                      chevron_right
                    </span>
                  </div>
                );
              }

              // ── Album Row / Card ────────────────────────────────────────
              if (itemType === 'album') {
                return (
                  <div
                    key={item.id || item.browseId || idx}
                    onClick={() => handleAlbumNavigation(item)}
                    className="group flex items-center justify-between p-3 hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {item.thumbnail || item.cover ? (
                        <img
                          src={item.thumbnail || item.cover}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-white/40 text-[24px]">album</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-label-md font-semibold text-white truncate group-hover:text-brand-violet transition-colors">
                            {item.title}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-violet/20 text-brand-violet border border-brand-violet/30 flex-shrink-0">
                            Album
                          </span>
                        </div>
                        <p className="text-body-sm text-outline truncate mt-0.5">
                          {item.artist} {item.year ? `• ${item.year}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/50 group-hover:text-white transition-colors">
                      <span className="text-label-sm font-medium hidden sm:inline">Play Album</span>
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </div>
                  </div>
                );
              }

              // ── Track Row ───────────────────────────────────────────────
              const track = item;
              return (
                <div
                  key={track.id || track.videoId || idx}
                  onClick={() => handleTrackClick(track)}
                  className="group flex items-center justify-between p-3 hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900">
                      <img
                        src={track.thumbnail || track.cover}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          play_arrow
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-label-md font-semibold text-white truncate group-hover:text-brand-violet transition-colors">
                          {track.title}
                        </span>
                        {track.isOfficial ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-violet/20 text-brand-violet border border-brand-violet/30 flex-shrink-0">
                            Official
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/70 flex-shrink-0">
                            Song
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-body-sm text-outline truncate mt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArtistNavigation(track.artist, track.artistId);
                          }}
                          className="hover:text-white hover:underline focus:outline-none transition-colors text-left truncate"
                          title={`View ${track.artist}'s profile`}
                        >
                          {track.artist}
                        </button>
                        {track.album && (
                          <>
                            <span>•</span>
                            <span className="truncate">{track.album}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-3">
                    {/* Like button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(track);
                      }}
                      className={`p-1.5 rounded-full transition-transform active:scale-90 ${
                        isLiked(track.id) ? 'text-brand-pink' : 'text-outline hover:text-brand-pink'
                      }`}
                      title={isLiked(track.id) ? 'Unlike' : 'Like'}
                    >
                      <span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: `'FILL' ${isLiked(track.id) ? 1 : 0}` }}>
                        favorite
                      </span>
                    </button>

                    {/* Add to playlist button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddMenuSong(track);
                      }}
                      className="p-1.5 rounded-full text-outline hover:text-white transition-colors"
                      title="Add to playlist"
                    >
                      <span className="material-symbols-outlined text-[19px]">playlist_add</span>
                    </button>

                    {track.duration > 0 && (
                      <span className="text-label-sm font-mono text-outline tabular-nums ml-1 hidden sm:inline">
                        {formatDuration(track.duration)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackClick(track);
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors ml-1"
                      title="Play track"
                    >
                      <span className="material-symbols-outlined text-[20px]">play_circle</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {addMenuSong && (
        <AddToPlaylistMenu song={addMenuSong} onClose={() => setAddMenuSong(null)} />
      )}
    </div>
  );
}
