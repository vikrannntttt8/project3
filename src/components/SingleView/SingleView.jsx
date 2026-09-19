import { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { formatDuration } from '../../utils/timeFormat.js';
import BackButton from '../shared/BackButton.jsx';
import ImageWithFallback from '../shared/ImageWithFallback.jsx';
import AddToPlaylistMenu from '../shared/AddToPlaylistMenu.jsx';

/**
 * SingleView — Dedicated view for Standalone Singles, Music Videos, and Remixes
 * Route: /single/[videoId]
 */
export default function SingleView({ videoId, track: initialTrack }) {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    loadSong,
    navigateTo,
    isLiked,
    toggleLike,
    handleEntityClick,
  } = usePlayer();

  const [track, setTrack] = useState(initialTrack || null);
  const [loading, setLoading] = useState(!initialTrack);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(() => {
    if (initialTrack) {
      setTrack(initialTrack);
      setLoading(false);
      return;
    }

    if (!videoId) return;

    // If no initial track, resolve via search or info
    let mounted = true;
    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(videoId)}&type=song`)
      .then((res) => (res.ok ? res.json() : []))
      .then((results) => {
        if (!mounted) return;
        const match = results.find((r) => r.id === videoId || r.videoId === videoId) || results[0];
        if (match) {
          setTrack(match);
        } else {
          setTrack({
            id: videoId,
            videoId,
            title: 'Single / Video',
            artist: 'Unknown Artist',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            cover: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            type: 'video',
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setTrack({
            id: videoId,
            videoId,
            title: 'Single / Video',
            artist: 'Unknown Artist',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            cover: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            type: 'video',
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [videoId, initialTrack]);

  const targetId = track?.videoId || track?.id || videoId;
  const isCurrentPlaying = (currentSong?.videoId === targetId || currentSong?.id === targetId) && isPlaying;
  const liked = track ? isLiked(track.id || track.videoId) : false;

  const handlePlay = () => {
    if (!track) return;
    if (currentSong?.videoId === targetId || currentSong?.id === targetId) {
      togglePlay();
    } else {
      loadSong({
        ...track,
        id: targetId,
        videoId: targetId,
      });
    }
  };

  const isVideo = track?.type === 'video' || track?.isMusicVideo || track?.views;

  return (
    <div className="h-full w-full overflow-y-auto pb-36 pt-4 px-4 sm:px-8 space-y-8 scroll-smooth">
      {/* ── Top Bar Navigation ── */}
      <div className="flex items-center gap-4">
        <BackButton label="Back" />
        <span className="text-body-sm text-outline">
          / {isVideo ? 'Music Video' : 'Single Release'}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-pulse">
          <div className="w-12 h-12 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
          <p className="text-body-md text-outline">Loading single details...</p>
        </div>
      ) : track ? (
        <div className="space-y-8">
          {/* Hero Media Card */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#181822] via-[#101014] to-[#09090B] border border-white/10 p-6 sm:p-10 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-10">
              {/* Media Art with Play Action */}
              <div
                onClick={handlePlay}
                className="relative group cursor-pointer w-48 sm:w-64 aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex-shrink-0 bg-neutral-900"
              >
                <ImageWithFallback
                  src={track.thumbnail || track.cover}
                  alt={track.title}
                  icon={isVideo ? 'smart_display' : 'music_note'}
                  iconClassName="text-white/30 text-[64px]"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-brand-cyan flex items-center justify-center text-black shadow-xl transform group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {isCurrentPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </div>
                </div>

                {isVideo && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-rose-400 border border-rose-400/30 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">smart_display</span>
                    Video
                  </span>
                )}
              </div>

              {/* Media Metadata & Controls */}
              <div className="flex-1 text-center md:text-left min-w-0 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/90 text-[11px] font-semibold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px] text-brand-cyan">
                    {isVideo ? 'videocam' : 'album'}
                  </span>
                  <span>{isVideo ? 'Official Music Video' : 'Standalone Single'}</span>
                </div>

                <h1 className="text-display-sm sm:text-display-md font-extrabold text-white tracking-tight break-words">
                  {track.title}
                </h1>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-body-md text-outline">
                  <button
                    type="button"
                    onClick={() => handleEntityClick({
                      type: 'artist',
                      id: track.artistId,
                      browseId: track.artistId,
                      name: track.artist,
                    })}
                    className="font-semibold text-white hover:text-brand-cyan hover:underline transition-colors"
                  >
                    {track.artist}
                  </button>

                  {track.year && <span>• {track.year}</span>}
                  {track.duration > 0 && <span>• {formatDuration(track.duration)}</span>}
                  {track.views && <span>• {track.views}</span>}
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <button
                    type="button"
                    onClick={handlePlay}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-cyan hover:bg-brand-cyan/90 text-black font-bold text-label-lg shadow-xl shadow-brand-cyan/25 hover:scale-105 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {isCurrentPlaying ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{isCurrentPlaying ? 'Pause Playback' : 'Play Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLike(track)}
                    className={`p-3 rounded-full border transition-all active:scale-90 ${
                      liked
                        ? 'bg-brand-pink/20 border-brand-pink text-brand-pink'
                        : 'bg-white/5 border-white/10 text-white/70 hover:text-brand-pink hover:border-brand-pink/40'
                    }`}
                    title={liked ? 'Unlike' : 'Like'}
                  >
                    <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: `'FILL' ${liked ? 1 : 0}` }}>
                      favorite
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddMenuOpen(true)}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                    title="Add to playlist"
                  >
                    <span className="material-symbols-outlined text-[22px]">playlist_add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
          <p className="text-body-lg text-outline">Could not load this single.</p>
          <BackButton label="Go Back" />
        </div>
      )}

      {addMenuOpen && track && (
        <AddToPlaylistMenu song={track} onClose={() => setAddMenuOpen(false)} />
      )}
    </div>
  );
}
