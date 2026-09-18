import { useState, useEffect } from 'react';
import { formatDuration } from '../../utils/timeFormat.js';

/**
 * ArtistModal — Dedicated artist view with discography, top songs, and albums
 */
export default function ArtistModal({ artistId, artistName, onClose, onSelectTrack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!artistId && !artistName) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchArtist = async () => {
      try {
        let browseId = artistId;
        // If no browseId provided, search for the artist to get their browseId
        if (!browseId && artistName) {
          const searchRes = await fetch(`/api/search?q=${encodeURIComponent(artistName)}`);
          if (searchRes.ok) {
            const tracks = await searchRes.json();
            const matching = tracks.find((t) => t.artistId);
            if (matching) browseId = matching.artistId;
          }
        }

        if (!browseId) {
          throw new Error('Artist ID not found');
        }

        const res = await fetch(`/api/artist/${browseId}`);
        if (!res.ok) throw new Error(`Failed to load artist (${res.status})`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchArtist();
    return () => { mounted = false; };
  }, [artistId, artistName]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#121214] border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative h-44 sm:h-52 bg-gradient-to-b from-brand-violet/30 to-[#121214] p-6 flex flex-col justify-end">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          <div className="flex items-end gap-4">
            {data?.thumbnail ? (
              <img
                src={data.thumbnail}
                alt=""
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-brand-violet/40 shadow-lg flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/10 flex-shrink-0">
                <span className="material-symbols-outlined text-[36px] text-white/40">person</span>
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-violet">Artist Discography</span>
              <h2 className="text-headline-md font-bold text-white truncate">
                {data?.name || artistName || 'Loading Artist...'}
              </h2>
              {data?.description && (
                <p className="text-body-sm text-outline line-clamp-2 mt-1">{data.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full animate-spin" />
              <p className="text-body-md text-outline">Loading discography...</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8">
              <p className="text-body-md text-brand-pink">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Top Songs */}
              {data.topSongs && data.topSongs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-label-lg font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-brand-violet text-[18px]">music_note</span>
                      Top Releases & Songs
                    </h3>
                  </div>
                  <div className="divide-y divide-neutral-800 rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
                    {data.topSongs.map((track, idx) => (
                      <div
                        key={track.id || idx}
                        onClick={() => onSelectTrack?.(track)}
                        className="group flex items-center gap-3 p-3 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <span className="w-5 text-center text-label-sm font-mono text-outline group-hover:hidden">
                          {idx + 1}
                        </span>
                        <span className="w-5 text-center hidden group-hover:inline text-brand-violet material-symbols-outlined text-[18px]">
                          play_arrow
                        </span>
                        <img
                          src={track.thumbnail || track.cover}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-label-md font-medium text-white truncate group-hover:text-brand-violet transition-colors">
                            {track.title}
                          </p>
                          <p className="text-label-sm text-outline truncate">{track.artist}</p>
                        </div>
                        {track.duration > 0 && (
                          <span className="text-label-sm font-mono text-outline tabular-nums">
                            {formatDuration(track.duration)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Albums & Singles */}
              {data.albums && data.albums.length > 0 && (
                <div>
                  <h3 className="text-label-lg font-bold text-white flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-brand-violet text-[18px]">album</span>
                    Albums & Releases
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {data.albums.map((alb, i) => (
                      <div
                        key={alb.id || i}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors"
                      >
                        {alb.thumbnail ? (
                          <img
                            src={alb.thumbnail}
                            alt=""
                            className="w-full aspect-square rounded-lg object-cover mb-2"
                          />
                        ) : (
                          <div className="w-full aspect-square rounded-lg bg-white/5 flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-white/20">album</span>
                          </div>
                        )}
                        <p className="text-label-md font-semibold text-white truncate">{alb.title}</p>
                        <p className="text-label-sm text-outline">{alb.year || 'Album'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
