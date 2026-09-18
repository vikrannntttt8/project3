import { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { formatDuration } from '../../utils/timeFormat.js';

export default function ArtistView({ browseId, artistName }) {
  const { navigateTo, goBack, loadSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!browseId && !artistName) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchArtist = async () => {
      try {
        let targetId = browseId;
        // Fallback: if no browseId provided, search artist to obtain browseId
        if (!targetId && artistName) {
          const searchRes = await fetch(`/api/search?q=${encodeURIComponent(artistName)}&type=artists`);
          if (searchRes.ok) {
            const artists = await searchRes.json();
            const matching = artists.find((a) => a.id || a.browseId);
            if (matching) targetId = matching.id || matching.browseId;
          }
        }

        if (!targetId) {
          throw new Error('Artist ID could not be resolved');
        }

        const res = await fetch(`/api/artist/${targetId}`);
        if (!res.ok) throw new Error(`Failed to load artist details (${res.status})`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        if (mounted) setError(err.message || 'Error fetching artist details');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchArtist();
    return () => { mounted = false; };
  }, [browseId, artistName]);

  const handlePlaySong = (song, idx) => {
    if (currentSong?.videoId === song.videoId || currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    const queue = data?.topSongs || [song];
    loadSong(song, queue, idx);
  };

  return (
    <div className="h-full w-full overflow-y-auto pb-32 pt-4 px-4 sm:px-8 space-y-8 scroll-smooth">
      {/* ── Top Bar Navigation ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={goBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors text-label-md"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>Back</span>
        </button>
        <span className="text-body-sm text-outline">/ Artist Profile</span>
      </div>

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="h-64 rounded-2xl bg-white/5 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-brand-violet border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-3">
            <div className="h-6 w-40 bg-white/10 rounded-md" />
            <div className="h-14 bg-white/5 rounded-xl" />
            <div className="h-14 bg-white/5 rounded-xl" />
            <div className="h-14 bg-white/5 rounded-xl" />
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && !loading && (
        <div className="p-6 rounded-2xl bg-brand-pink/10 border border-brand-pink/20 text-center space-y-3">
          <p className="text-body-lg text-brand-pink font-semibold">{error}</p>
          <button
            onClick={goBack}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-label-md"
          >
            Return to Home
          </button>
        </div>
      )}

      {/* ── Artist Profile Content ── */}
      {data && !loading && (
        <>
          {/* Hero Banner */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-brand-violet/25 via-[#121216] to-[#09090B] border border-white/10 p-6 sm:p-10 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
              {data.thumbnail ? (
                <img
                  src={data.thumbnail}
                  alt={data.name}
                  className="w-36 h-36 sm:w-48 sm:h-48 rounded-full object-cover border-4 border-brand-violet/30 shadow-2xl flex-shrink-0"
                />
              ) : (
                <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-white/10 border-4 border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[64px] text-white/30">person</span>
                </div>
              )}

              <div className="flex-1 text-center sm:text-left min-w-0 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-violet/20 border border-brand-violet/40 text-brand-violet text-[11px] font-semibold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  Verified Artist
                </div>
                <h1 className="text-display-sm sm:text-display-md font-extrabold text-white tracking-tight truncate">
                  {data.name}
                </h1>
                {data.description && (
                  <p className="text-body-sm sm:text-body-md text-outline line-clamp-3 max-w-2xl">
                    {data.description}
                  </p>
                )}

                {data.topSongs && data.topSongs.length > 0 && (
                  <div className="pt-3">
                    <button
                      onClick={() => handlePlaySong(data.topSongs[0], 0)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-violet hover:bg-brand-violet/90 text-white font-semibold text-label-lg shadow-lg hover:shadow-brand-violet/25 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        play_arrow
                      </span>
                      Play Top Songs
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Songs */}
          {data.topSongs && data.topSongs.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-violet text-[22px]">bar_chart</span>
                  Top Songs
                </h2>
                <span className="text-body-sm text-outline">{data.topSongs.length} tracks</span>
              </div>

              <div className="divide-y divide-neutral-800/80 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
                {data.topSongs.map((track, idx) => {
                  const isCurrent = currentSong?.videoId === track.videoId || currentSong?.id === track.id;
                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => handlePlaySong(track, idx)}
                      className={`group flex items-center justify-between p-3.5 hover:bg-white/[0.06] transition-colors cursor-pointer ${
                        isCurrent ? 'bg-brand-violet/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-7 text-center text-label-md font-mono text-outline flex-shrink-0 flex items-center justify-center">
                          {isCurrent && isPlaying ? (
                            <span className="material-symbols-outlined text-brand-violet text-[20px] animate-pulse">
                              volume_up
                            </span>
                          ) : (
                            <>
                              <span className="group-hover:hidden">{idx + 1}</span>
                              <span className="hidden group-hover:inline text-brand-violet material-symbols-outlined text-[20px]">
                                play_arrow
                              </span>
                            </>
                          )}
                        </div>

                        <img
                          src={track.thumbnail || track.cover}
                          alt=""
                          className="w-11 h-11 rounded-lg object-cover flex-shrink-0 shadow-sm"
                        />

                        <div className="min-w-0 flex-1">
                          <p className={`text-label-md font-medium truncate transition-colors ${
                            isCurrent ? 'text-brand-violet font-semibold' : 'text-white group-hover:text-brand-violet'
                          }`}>
                            {track.title}
                          </p>
                          <p className="text-label-sm text-outline truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                        {track.duration > 0 && (
                          <span className="text-label-sm font-mono text-outline tabular-nums">
                            {formatDuration(track.duration)}
                          </span>
                        )}
                        <span className="material-symbols-outlined text-[22px] text-white/50 group-hover:text-white transition-colors">
                          play_circle
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Albums & Singles */}
          {data.albums && data.albums.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-headline-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-violet text-[22px]">album</span>
                Albums & Discography
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.albums.map((alb, i) => (
                  <div
                    key={alb.id || alb.browseId || i}
                    onClick={() => navigateTo('album', alb.browseId || alb.id, { title: alb.title, artist: data.name, cover: alb.thumbnail })}
                    className="group flex flex-col p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-violet/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-neutral-900">
                      {alb.thumbnail ? (
                        <img
                          src={alb.thumbnail}
                          alt={alb.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                          <span className="material-symbols-outlined text-white/20 text-[40px]">album</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-brand-violet flex items-center justify-center text-white shadow-lg">
                          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            play_arrow
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-label-md font-bold text-white truncate group-hover:text-brand-violet transition-colors">
                      {alb.title}
                    </p>
                    <p className="text-label-sm text-outline mt-0.5">{alb.year || 'Album'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
