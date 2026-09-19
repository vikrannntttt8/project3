import { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { formatDuration } from '../../utils/timeFormat.js';
import AddToPlaylistMenu from '../shared/AddToPlaylistMenu.jsx';
import ImageWithFallback from '../shared/ImageWithFallback.jsx';

export default function ArtistView({ browseId, artistName }) {
  const { navigateTo, goBack, loadSong, currentSong, isPlaying, togglePlay, isLiked, toggleLike } = usePlayer();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTopSongs, setExpandedTopSongs] = useState(false);
  const [addMenuSong, setAddMenuSong] = useState(null);

  useEffect(() => {
    if (!browseId && !artistName) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    setExpandedTopSongs(false);

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

  const visibleSongs = expandedTopSongs
    ? (data?.topSongs || [])
    : (data?.topSongs || []).slice(0, 5);

  return (
    <div className="h-full w-full overflow-y-auto pb-36 pt-4 px-4 sm:px-8 space-y-8 scroll-smooth">
      {/* ── Top Bar Navigation ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={goBack}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors text-label-md"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>Back</span>
        </button>
        <span className="text-body-sm text-outline">/ Artist Discography</span>
      </div>

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="h-64 rounded-3xl bg-white/5 flex items-center justify-center">
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
            Return to Previous View
          </button>
        </div>
      )}

      {/* ── Artist Profile Content ── */}
      {data && !loading && (
        <>
          {/* Hero Banner */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-brand-violet/25 via-[#121216] to-[#09090B] border border-white/10 p-6 sm:p-10 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
              <ImageWithFallback
                src={data.thumbnail}
                alt={data.name}
                icon="person"
                iconClassName="text-white/30 text-[64px]"
                className="w-36 h-36 sm:w-48 sm:h-48 rounded-full object-cover border-4 border-brand-violet/30 shadow-2xl flex-shrink-0"
              />

              <div className="flex-1 text-center sm:text-left min-w-0 space-y-2.5">
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
                  <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
                    <button
                      onClick={() => handlePlaySong(data.topSongs[0], 0)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-violet hover:bg-brand-violet/90 text-white font-semibold text-label-lg shadow-lg hover:shadow-brand-violet/25 hover:scale-105 active:scale-95 transition-all"
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

          {/* ── 1. Top Songs (Expandable) ── */}
          {data.topSongs && data.topSongs.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-violet text-[22px]">bar_chart</span>
                  Top Songs
                </h2>
                <span className="text-body-sm text-outline">{data.topSongs.length} tracks available</span>
              </div>

              <div className="divide-y divide-neutral-800/80 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
                {visibleSongs.map((track, idx) => {
                  const isCurrent = currentSong?.videoId === track.videoId || currentSong?.id === track.id;
                  const liked = isLiked(track.id);

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

                        <ImageWithFallback
                          src={track.thumbnail || track.cover}
                          alt={track.title}
                          icon="music_note"
                          iconClassName="text-white/30 text-[20px]"
                          className="w-11 h-11 rounded-lg object-cover flex-shrink-0 shadow-sm"
                        />

                        <div className="min-w-0 flex-1">
                          <p className={`text-label-md font-medium truncate transition-colors ${
                            isCurrent ? 'text-brand-violet font-semibold' : 'text-white group-hover:text-brand-violet'
                          }`}>
                            {track.title}
                          </p>
                          <p className="text-label-sm text-outline truncate">
                            {track.artist} {track.album ? `• ${track.album}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons (Like + Add to playlist) */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track);
                          }}
                          className={`p-1.5 rounded-full transition-transform active:scale-90 ${
                            liked ? 'text-brand-pink' : 'text-outline hover:text-brand-pink'
                          }`}
                          title={liked ? 'Unlike' : 'Like'}
                        >
                          <span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: `'FILL' ${liked ? 1 : 0}` }}>
                            favorite
                          </span>
                        </button>

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
                          <span className="text-label-sm font-mono text-outline tabular-nums ml-2 hidden sm:inline">
                            {formatDuration(track.duration)}
                          </span>
                        )}
                        <span className="material-symbols-outlined text-[22px] text-white/50 group-hover:text-white transition-colors ml-1">
                          play_circle
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {data.topSongs.length > 5 && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setExpandedTopSongs(!expandedTopSongs)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-label-md font-medium text-white transition-colors"
                  >
                    <span>{expandedTopSongs ? 'Show Less' : `Show All (${data.topSongs.length} Songs)`}</span>
                    <span className="material-symbols-outlined text-[18px]">
                      {expandedTopSongs ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── 2. Albums ── */}
          {data.albums && data.albums.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-violet text-[22px]">album</span>
                  Albums
                </h2>
                <span className="text-body-sm text-outline">{data.albums.length} releases</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.albums.map((alb, i) => (
                  <div
                    key={alb.id || alb.browseId || i}
                    onClick={() => navigateTo('album', alb.browseId || alb.id, { title: alb.title, artist: data.name, cover: alb.thumbnail })}
                    className="group flex flex-col p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-violet/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-neutral-900">
                      <ImageWithFallback
                        src={alb.thumbnail}
                        alt={alb.title}
                        icon="album"
                        iconClassName="text-white/20 text-[40px]"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
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

          {/* ── 3. Singles & EPs ── */}
          {data.singles && data.singles.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-cyan text-[22px]">disc_full</span>
                  Singles & EPs
                </h2>
                <span className="text-body-sm text-outline">{data.singles.length} releases</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.singles.map((single, i) => (
                  <div
                    key={single.id || single.browseId || i}
                    onClick={() => navigateTo('album', single.browseId || single.id, { title: single.title, artist: data.name, cover: single.thumbnail })}
                    className="group flex flex-col p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-cyan/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-neutral-900">
                      <ImageWithFallback
                        src={single.thumbnail}
                        alt={single.title}
                        icon="album"
                        iconClassName="text-white/20 text-[40px]"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-brand-cyan flex items-center justify-center text-black shadow-lg">
                          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            play_arrow
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-label-md font-bold text-white truncate group-hover:text-brand-cyan transition-colors">
                      {single.title}
                    </p>
                    <p className="text-label-sm text-outline mt-0.5">{single.year || 'Single'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 4. Videos & Live Performances ── */}
          {data.videos && data.videos.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400 text-[22px]">smart_display</span>
                  Videos & Live Performances
                </h2>
                <span className="text-body-sm text-outline">{data.videos.length} videos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.videos.map((vid, i) => (
                  <div
                    key={vid.id || vid.videoId || i}
                    onClick={() => loadSong({
                      id: vid.videoId || vid.id,
                      videoId: vid.videoId || vid.id,
                      title: vid.title,
                      artist: vid.artist || data.name,
                      thumbnail: vid.thumbnail,
                      cover: vid.cover || vid.thumbnail,
                      duration: vid.duration,
                      type: 'song',
                    })}
                    className="group flex flex-col p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-rose-400/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-neutral-900">
                      <ImageWithFallback
                        src={vid.thumbnail}
                        alt={vid.title}
                        icon="smart_display"
                        iconClassName="text-white/20 text-[40px]"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black shadow-lg">
                          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            play_arrow
                          </span>
                        </div>
                      </div>
                      {vid.duration > 0 && (
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                          {formatDuration(vid.duration)}
                        </span>
                      )}
                    </div>

                    <p className="text-label-md font-bold text-white line-clamp-2 group-hover:text-rose-400 transition-colors">
                      {vid.title}
                    </p>
                    {vid.views && <p className="text-label-sm text-outline mt-1">{vid.views}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 5. Playlists by Artist ── */}
          {data.playlists && data.playlists.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[22px]">featured_play_list</span>
                  Playlists by Artist
                </h2>
                <span className="text-body-sm text-outline">{data.playlists.length} playlists</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.playlists.map((pl, i) => (
                  <div
                    key={pl.id || pl.browseId || i}
                    onClick={() => navigateTo('album', pl.browseId || pl.id, { title: pl.title, artist: data.name, cover: pl.thumbnail })}
                    className="group flex flex-col p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-400/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-neutral-900">
                      <ImageWithFallback
                        src={pl.thumbnail}
                        alt={pl.title}
                        icon="queue_music"
                        iconClassName="text-white/20 text-[40px]"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-black shadow-lg">
                          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            play_arrow
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-label-md font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                      {pl.title}
                    </p>
                    {pl.songCount && <p className="text-label-sm text-outline mt-0.5">{pl.songCount}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 6. Fans Might Also Like (Similar Artists) ── */}
          {data.similarArtists && data.similarArtists.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-violet text-[22px]">group</span>
                  Fans Might Also Like
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {data.similarArtists.map((art, i) => (
                  <div
                    key={art.id || art.browseId || i}
                    onClick={() => navigateTo('artist', art.browseId || art.id, { name: art.name })}
                    className="group flex flex-col items-center text-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-violet/40 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
                  >
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-3 border-2 border-white/10 group-hover:border-brand-violet/60 transition-colors shadow-md">
                      <ImageWithFallback
                        src={art.thumbnail}
                        alt={art.name}
                        icon="person"
                        iconClassName="text-white/30 text-[36px]"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <p className="text-label-md font-bold text-white truncate w-full group-hover:text-brand-violet transition-colors">
                      {art.name}
                    </p>
                    <p className="text-label-sm text-outline mt-0.5 truncate w-full">
                      {art.subscribers || 'Artist'}
                    </p>
                  </div>
                ))}
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
