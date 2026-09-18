import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { fetchSongLyrics, getSongById } from '../utils/saavn.js';
import { getPipedAudioStream } from '../utils/pipedAudio.js';
import { DEMO_LRC } from '../utils/lrcParser.js';
import { useLibrary } from '../hooks/useLibrary.js';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  // ── Single persistent Audio instance (no re-renders on src change) ──
  const audioRef = useRef(null);
  if (!audioRef.current && typeof window !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
    // crossOrigin omitted to allow HTML5 <audio> to stream cross-origin media without CORS header restrictions
    audioRef.current.volume = 0.8;
  }

  // ── Playback state ────────────────────────────────────────────────
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [volume,      setVolume]      = useState(0.8);
  const [isMuted,     setIsMuted]     = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);

  // ── Song & queue state ────────────────────────────────────────────
  const [currentSong, setCurrentSong] = useState(null);
  const currentSongRef = useRef(null);
  const [queue,       setQueue]       = useState([]);
  const [queueIndex,  setQueueIndex]  = useState(0);

  // ── Playback Engine State ('audio' | 'youtube') ───────────────────
  const [playbackEngine, setPlaybackEngine] = useState('audio');
  const ytPlayerRef = useRef(null);
  const ytReadyRef  = useRef(false);

  // ── Lyrics state ──────────────────────────────────────────────────
  const [lrcString,    setLrcString]    = useState(DEMO_LRC);
  const [lyricsSource, setLyricsSource] = useState('demo');
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // ── View state ────────────────────────────────────────────────────
  const [view, setView] = useState('home'); // 'home' | 'lyrics' | 'library' | 'liked'

  // ── Library (liked + playlists + custom albums) ───────────────────
  const library = useLibrary();

  // ── Initialize YouTube IFrame Player API (Fallback Engine) ────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Inject YouTube IFrame API if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const initYT = () => {
      if (window.YT && window.YT.Player && !ytPlayerRef.current) {
        try {
          ytPlayerRef.current = new window.YT.Player('pulse-yt-player', {
            height: '1',
            width: '1',
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              rel: 0,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                ytReadyRef.current = true;
              },
              onStateChange: (event) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                  setIsLoading(false);
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  setIsPlaying(false);
                } else if (event.data === window.YT.PlayerState.ENDED) {
                  setIsPlaying(false);
                  playNext();
                } else if (event.data === window.YT.PlayerState.BUFFERING) {
                  setIsLoading(true);
                }
              },
              onError: (err) => {
                console.warn('[YT Player] Fallback triggered on error:', err?.data);
                const active = currentSongRef.current;
                if (active?.backupStreamUrl) {
                  setPlaybackEngine('audio');
                  const a = audioRef.current;
                  if (a) {
                    a.src = active.backupStreamUrl;
                    a.load();
                    a.play().catch(console.error);
                  }
                }
              },
            },
          });
        } catch (e) {
          console.warn('[YT Player] Initialization error:', e);
        }
      }
    };

    window.onYouTubeIframeAPIReady = initYT;
    const interval = setInterval(() => {
      if (window.YT?.Player && !ytPlayerRef.current) initYT();
      else if (ytPlayerRef.current) clearInterval(interval);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // ── Sync YouTube IFrame playback position ─────────────────────────
  useEffect(() => {
    let timer = null;
    if (playbackEngine === 'youtube' && isPlaying) {
      timer = setInterval(() => {
        const p = ytPlayerRef.current;
        if (p && typeof p.getCurrentTime === 'function') {
          const t = p.getCurrentTime();
          const d = p.getDuration();
          if (typeof t === 'number') setCurrentTime(t);
          if (typeof d === 'number' && d > 0) setDuration(d);
        }
      }, 250);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [playbackEngine, isPlaying]);

  // ── Wire Audio element events (once, on mount) ─────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate   = () => {
      if (playbackEngine === 'audio') setCurrentTime(audio.currentTime);
    };
    const onDuration     = () => {
      if (playbackEngine === 'audio') setDuration(audio.duration || 0);
    };
    const onEnded        = () => { setIsPlaying(false); playNext(); };
    const onPlay         = () => { setIsPlaying(true);  setIsLoading(false); };
    const onPause        = () => setIsPlaying(false);
    const onWaiting      = () => setIsLoading(true);
    const onCanPlay      = () => setIsLoading(false);
    const onError        = (e) => {
      console.warn('[Audio] error event on stream:', audio.src, e);
      const active = currentSongRef.current;

      // Fallback 1: If YouTube videoId is available, switch to YouTube IFrame player
      if (active?.videoId && ytPlayerRef.current) {
        console.log('[Audio] Fallback: Switching to YouTube IFrame player for video:', active.videoId);
        setPlaybackEngine('youtube');
        ytPlayerRef.current.loadVideoById(active.videoId);
        ytPlayerRef.current.playVideo();
        return;
      }

      // Fallback 2: Direct 320kbps backup stream
      if (active?.backupStreamUrl && audio.src !== active.backupStreamUrl) {
        console.log('[Audio] Fallback: Switching to backup 320kbps direct stream');
        audio.src = active.backupStreamUrl;
        audio.load();
        audio.play().catch(console.error);
        return;
      }

      setIsPlaying(false);
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('ended',          onEnded);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('waiting',        onWaiting);
    audio.addEventListener('canplay',        onCanPlay);
    audio.addEventListener('error',          onError);

    return () => {
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('ended',          onEnded);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('waiting',        onWaiting);
      audio.removeEventListener('canplay',        onCanPlay);
      audio.removeEventListener('error',          onError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackEngine]);

  // ── Core playback actions (Unified Audio + YouTube) ───────────────

  const play = useCallback(() => {
    if (playbackEngine === 'youtube') {
      ytPlayerRef.current?.playVideo();
    } else {
      audioRef.current?.play().catch(console.error);
    }
  }, [playbackEngine]);

  const pause = useCallback(() => {
    if (playbackEngine === 'youtube') {
      ytPlayerRef.current?.pauseVideo();
    } else {
      audioRef.current?.pause();
    }
  }, [playbackEngine]);

  const togglePlay = useCallback(() => {
    if (playbackEngine === 'youtube') {
      const p = ytPlayerRef.current;
      if (!p) return;
      isPlaying ? p.pauseVideo() : p.playVideo();
    } else {
      const a = audioRef.current;
      if (!a || !a.src) return;
      a.paused ? a.play().catch(console.error) : a.pause();
    }
  }, [playbackEngine, isPlaying]);

  const seek = useCallback((time) => {
    if (playbackEngine === 'youtube') {
      const p = ytPlayerRef.current;
      if (p && typeof p.seekTo === 'function') {
        p.seekTo(time, true);
        setCurrentTime(time);
      }
    } else {
      const a = audioRef.current;
      if (!a) return;
      const clamped = Math.max(0, Math.min(time, a.duration || 0));
      a.currentTime = clamped;
      setCurrentTime(clamped);
    }
  }, [playbackEngine]);

  const changeVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted  = false;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      ytPlayerRef.current.setVolume(clamped * 100);
      ytPlayerRef.current.unMute();
    }
    setVolume(clamped);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.muted = !a.muted;
      setIsMuted(a.muted);
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.isMuted === 'function') {
      if (ytPlayerRef.current.isMuted()) ytPlayerRef.current.unMute();
      else ytPlayerRef.current.mute();
    }
  }, []);

  // ── Load a song into the audio engine ─────────────────────────────

  const loadSong = useCallback(async (song, newQueue = null, newIndex = 0) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Stop current audio and YouTube player before loading next
    audio.pause();
    if (ytPlayerRef.current && typeof ytPlayerRef.current.stopVideo === 'function') {
      try { ytPlayerRef.current.stopVideo(); } catch (_) {}
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);

    // Extract backup 320kbps stream from song metadata to guarantee playback
    let backupStream = '';
    if (Array.isArray(song.downloadUrl) && song.downloadUrl.length) {
      const high320 = song.downloadUrl.find(d => d?.quality === '320kbps' || String(d?.quality).includes('320'));
      backupStream = high320?.url || high320?.link || song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[song.downloadUrl.length - 1]?.link || '';
    } else if (song.streamUrl && !song.streamUrl.includes('_p.')) {
      backupStream = song.streamUrl;
    }

    if (!backupStream && song.id) {
      try {
        const fullDetail = await getSongById(song.id);
        if (fullDetail?.downloadUrl?.length) {
          const high320 = fullDetail.downloadUrl.find(d => d?.quality === '320kbps' || String(d?.quality).includes('320'));
          backupStream = high320?.url || fullDetail.downloadUrl[fullDetail.downloadUrl.length - 1]?.url || fullDetail.streamUrl;
        } else {
          backupStream = fullDetail?.streamUrl || '';
        }
      } catch (err) {
        console.warn('Could not fetch backup song details for 320kbps link:', err);
      }
    }

    // TASK 1: MULTI-FALLBACK YOUTUBE STREAM PARSER
    // Primary: Route search & stream through Piped (corsproxy.io / api.piped.privacydev.net)
    // Fallback: Invidious API instance & YouTube IFrame background player
    let directStream = '';
    let ytVideoId = song.videoId || '';

    try {
      const ytData = await getPipedAudioStream(song.title, song.artist);
      if (ytData?.streamUrl) {
        directStream = ytData.streamUrl;
      }
      if (ytData?.videoId) {
        ytVideoId = ytData.videoId;
      }
    } catch (err) {
      console.warn('[YouTube Parser] Fallback:', err);
    }

    const updatedSong = {
      ...song,
      streamUrl: directStream || backupStream,
      backupStreamUrl: backupStream,
      videoId: ytVideoId,
    };
    setCurrentSong(updatedSong);
    currentSongRef.current = updatedSong;
    if (newQueue) { setQueue(newQueue); setQueueIndex(newIndex); }

    // Start playback:
    if (directStream) {
      setPlaybackEngine('audio');
      audio.src = directStream;
      audio.load();
      audio.volume = volume;
      audio.play().catch(err => {
        console.warn('[Audio] Direct stream play failed, switching to YouTube IFrame / backup:', err);
        if (ytVideoId && ytPlayerRef.current) {
          setPlaybackEngine('youtube');
          ytPlayerRef.current.loadVideoById(ytVideoId);
          ytPlayerRef.current.playVideo();
        } else if (backupStream) {
          audio.src = backupStream;
          audio.load();
          audio.play().catch(console.error);
        }
      });
    } else if (ytVideoId && ytPlayerRef.current) {
      setPlaybackEngine('youtube');
      ytPlayerRef.current.loadVideoById(ytVideoId);
      ytPlayerRef.current.playVideo();
    } else if (backupStream) {
      setPlaybackEngine('audio');
      audio.src = backupStream;
      audio.load();
      audio.volume = volume;
      audio.play().catch(console.error);
    } else {
      setIsLoading(false);
    }

    // Fetch lyrics async (non-blocking)
    setLrcString(DEMO_LRC);
    setLyricsSource('demo');
    setLyricsLoading(true);
    fetchSongLyrics(song.id, song.title, song.artist)
      .then(({ lrc, source }) => {
        setLrcString(lrc);
        setLyricsSource(source);
      })
      .catch(() => {})
      .finally(() => setLyricsLoading(false));
  }, [volume]);

  // ── Queue navigation ──────────────────────────────────────────────

  const playNext = useCallback(() => {
    if (!queue.length) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIndex);
    loadSong(queue[nextIndex], null, nextIndex);
  }, [queue, queueIndex, loadSong]);

  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    // If > 3s in, restart current song; else go to previous
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (!queue.length) return;
    const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIndex);
    loadSong(queue[prevIndex], null, prevIndex);
  }, [queue, queueIndex, loadSong]);

  /**
   * Play a list of songs (album, artist, playlist).
   * Sets them as the queue and starts the first one.
   */
  const playCollection = useCallback((songs, startIndex = 0) => {
    if (!songs.length) return;
    loadSong(songs[startIndex], songs, startIndex);
  }, [loadSong]);

  const toggleView = useCallback(() => {
    setView(v => v === 'lyrics' ? 'home' : 'lyrics');
  }, []);

  const value = {
    audioRef,
    isPlaying, currentTime, duration, volume, isMuted, isLoading,
    currentSong, queue, queueIndex,
    lrcString, lyricsSource, lyricsLoading,
    view, setView,
    // Actions
    play, pause, togglePlay, seek, changeVolume, toggleMute,
    loadSong, playNext, playPrev, playCollection, toggleView,
    // Library
    ...library,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Hidden YouTube IFrame Background Player for seamless continuous playback */}
      <div
        id="pulse-yt-wrapper"
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          visibility: 'hidden',
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        <div id="pulse-yt-player" />
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
