import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce.js';
import { formatDuration } from '../utils/timeFormat.js';

/**
 * Search Component — High-performance YouTube Music search powered by Innertube
 *
 * - Input bound to useDebounce (350ms delay)
 * - Container constrained to max-h-[65vh] with smooth scrolling & divide-y divide-neutral-800
 * - Badges for 'Official' and 'Song' releases
 * - onSelectTrack and onArtistClick handlers with stopPropagation
 */
export default function Search({ onSelectTrack, onArtistClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Bind search input state to useDebounce hook with default 350ms delay
  const debouncedQuery = useDebounce(searchTerm, 350);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`, {
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

    return () => {
      abortController.abort();
    };
  }, [debouncedQuery]);

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setError(null);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Search Input Bar */}
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

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center gap-2 px-3 py-2 text-label-sm text-outline animate-pulse">
          <div className="w-4 h-4 border-2 border-brand-violet border-t-transparent rounded-full animate-spin" />
          <span>Searching YouTube Music...</span>
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="p-3 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-body-sm">
          {error}
        </div>
      )}

      {/* Results Container: constrained to max-h-[65vh] with smooth scroll & subtle dividers */}
      {results.length > 0 && (
        <div className="w-full max-h-[65vh] overflow-y-auto pr-2 scroll-smooth rounded-xl bg-white/[0.02] border border-white/5 shadow-xl">
          <div className="divide-y divide-neutral-800">
            {results.map((track) => (
              <div
                key={track.id}
                onClick={() => onSelectTrack?.(track)}
                className="group flex items-center justify-between p-3 hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                {/* Track Left: Thumbnail + Title & Artist */}
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
                      {/* Explicit Badges: Official or Song */}
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
                      {/* Artist Click Handler: Stops event propagation to open artist discography */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArtistClick?.(track.artist, track.artistId);
                        }}
                        className="hover:text-white hover:underline focus:outline-none transition-colors text-left truncate"
                        title={`View ${track.artist}'s discography`}
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

                {/* Track Right: Duration & Quick Actions */}
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  {track.duration > 0 && (
                    <span className="text-label-sm font-mono text-outline tabular-nums">
                      {formatDuration(track.duration)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTrack?.(track);
                    }}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Play track"
                  >
                    <span className="material-symbols-outlined text-[20px]">play_circle</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
