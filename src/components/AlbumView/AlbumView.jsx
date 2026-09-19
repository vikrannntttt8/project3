import { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { formatDuration } from '../../utils/timeFormat.js';
import AddToPlaylistMenu from '../shared/AddToPlaylistMenu.jsx';
import ImageWithFallback from '../shared/ImageWithFallback.jsx';
import BackButton from '../shared/BackButton.jsx';

export default function AlbumView({ browseId, initialData }) {
  const {
    navigateTo,
    goBack,
    playAlbum,
    currentSong,
    isPlaying,
    togglePlay,
    isLiked,
    toggleLike,
    handleEntityClick,
  } = usePlayer();
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData?.tracks);
  const [error, setError] = useState(null);
  const [addMenuSong, setAddMenuSong] = useState(null);

  useEffect(() => {
    if (!browseId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchAlbum = async () => {
      try {
        const res = await fetch(`/api/album/${browseId}`);
        if (!res.ok) throw new Error(`Failed to load album details (${res.status})`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        if (mounted) setError(err.message || 'Error fetching album details');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAlbum();
    return () => { mounted = false; };
  }, [browseId]);

  const handlePlayAlbum = (startIndex = 0) => {
    if (!data?.tracks?.length) return;
    playAlbum(data.tracks, startIndex);
  };

  const handleTrackClick = (track, idx) => {
    if (currentSong?.videoId === track.videoId || currentSong?.id === track.id) {
      togglePlay();
      return;
    }
    handlePlayAlbum(idx);
  };

  return (
    <div className="h-full w-full overflow-y-auto pb-32 pt-4 px-4 sm:px-8 space-y-8 scroll-smooth">
      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center gap-4">
        <BackButton label="Back" />
        <span className="text-body-sm text-outline">/ Album Release</span>
      </div>

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end">
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-white/10 flex-shrink-0" />
            <div className="space-y-3 w-full max-w-md">
              <div className="h-4 w-20 bg-white/10 rounded" />
              <div className="h-8 w-64 bg-white/10 rounded-lg" />
              <div className="h-5 w-40 bg-white/10 rounded" />
              <div className="h-10 w-36 bg-white/10 rounded-full mt-4" />
            </div>
          </div>
          <div className="space-y-2 pt-6">
            <div className="h-12 bg-white/5 rounded-xl" />
            <div className="h-12 bg-white/5 rounded-xl" />
            <div className="h-12 bg-white/5 rounded-xl" />
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && !loading && (
        <div className="p-6 rounded-2xl bg-brand-pink/10 border border-brand-pink/20 text-center space-y-3">
          <p className="text-body-lg text-brand-pink font-semibold">{error}</p>
          <BackButton label="Return to Previous View" className="px-4 py-2 bg-white/10 hover:bg-white/20" />
        </div>
      )}

      {/* ── Album Profile Content ── */}
      {data && !loading && (
        <>
          {/* Header Banner */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-brand-violet/20 via-[#141419] to-[#09090B] border border-white/10 p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
              <ImageWithFallback
                src={data.thumbnail || data.cover}
                alt={data.title}
                icon="album"
                iconClassName="text-white/30 text-[64px]"
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover border-2 border-white/10 shadow-2xl flex-shrink-0"
              />

              <div className="flex-1 text-center sm:text-left min-w-0 space-y-2.5">
                <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-brand-violet px-2.5 py-0.5 rounded-full bg-brand-violet/20 border border-brand-violet/30">
                  Album Release
                </span>
                <h1 className="text-headline-lg sm:text-display-sm font-extrabold text-white tracking-tight leading-tight">
                  {data.title}
                </h1>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-body-md text-white/80">
                  {data.artist && (
                    <button
                      type="button"
                      onClick={() => handleEntityClick({ type: 'artist', id: data.artistId, browseId: data.artistId, name: data.artist })}
                      className="font-semibold text-white hover:text-brand-violet hover:underline transition-colors"
                    >
                      {data.artist}
                    </button>
                  )}
                  {data.year && (
                    <>
                      <span className="text-outline">•</span>
                      <span className="text-outline">{data.year}</span>
                    </>
                  )}
                  {data.tracks && (
                    <>
                      <span className="text-outline">•</span>
                      <span className="text-outline">{data.tracks.length} songs</span>
                    </>
                  )}
                </div>

                {data.description && (
                  <p className="text-body-sm text-outline line-clamp-2 max-w-xl">
                    {data.description}
                  </p>
                )}

                {/* Primary Play Album Action */}
                {data.tracks && data.tracks.length > 0 && (
                  <div className="pt-3">
                    <button
                      onClick={() => handlePlayAlbum(0)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-violet hover:bg-brand-violet/90 text-white font-semibold text-label-lg shadow-xl hover:shadow-brand-violet/25 hover:scale-105 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        play_arrow
                      </span>
                      Play Album
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tracklist Table */}
          {data.tracks && data.tracks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-label-lg font-bold text-white uppercase tracking-wider text-outline">
                  Tracklist
                </h2>
                <span className="text-label-sm text-outline">Duration</span>
              </div>

              <div className="divide-y divide-neutral-800/80 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden shadow-lg">
                {data.tracks.map((track, idx) => {
                  const isCurrent = currentSong?.videoId === track.videoId || currentSong?.id === track.id;
                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => handleTrackClick(track, idx)}
                      className={`group flex items-center justify-between p-3.5 hover:bg-white/[0.06] transition-colors cursor-pointer ${
                        isCurrent ? 'bg-brand-violet/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-8 text-center text-label-md font-mono text-outline flex-shrink-0 flex items-center justify-center">
                          {isCurrent && isPlaying ? (
                            <span className="material-symbols-outlined text-brand-violet text-[20px] animate-pulse">
                              volume_up
                            </span>
                          ) : (
                            <>
                              <span className="group-hover:hidden">{track.trackNumber || idx + 1}</span>
                              <span className="hidden group-hover:inline text-brand-violet material-symbols-outlined text-[20px]">
                                play_arrow
                              </span>
                            </>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-label-md font-medium truncate transition-colors ${
                            isCurrent ? 'text-brand-violet font-semibold' : 'text-white group-hover:text-brand-violet'
                          }`}>
                            {track.title}
                          </p>
                          <p className="text-label-sm text-outline truncate">{track.artist || data.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-3">
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
                        <span className="material-symbols-outlined text-[20px] text-white/40 group-hover:text-white transition-colors ml-1">
                          play_circle
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {addMenuSong && (
        <AddToPlaylistMenu song={addMenuSong} onClose={() => setAddMenuSong(null)} />
      )}
    </div>
  );
}
