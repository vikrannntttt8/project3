import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { fetchSongLyrics } from '../utils/saavn.js';
import { resolveYouTubeVideoId } from '../utils/youtubeEngine.js';
import { DEMO_LRC } from '../utils/lrcParser.js';
import { useLibrary } from '../hooks/useLibrary.js';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  // ── YouTube IFrame Player Instance & Refs ──────────────────────────
  const ytPlayerRef    = useRef(null);
  const ytReadyRef     = useRef(false);
  const currentSongRef = useRef(null);
  const pendingSongRef = useRef(null);

  // ── Playback state ────────────────────────────────────────────────
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [volume,      setVolume]      = useState(0.8);
  const [isMuted,     setIsMuted]     = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);

  // ── Song & queue state ────────────────────────────────────────────
  const [currentSong, setCurrentSong] = useState(null);
  const [queue,       setQueue]       = useState([]);
  const [queueIndex,  setQueueIndex]  = useState(0);

  // ── Lyrics state ──────────────────────────────────────────────────
  const [lrcString,    setLrcString]    = useState(DEMO_LRC);
  const [lyricsSource, setLyricsSource] = useState('demo');
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // ── View & Navigation state ───────────────────────────────────────
  // State: { view: 'home' | 'search' | 'artist' | 'album' | 'lyrics' | 'library' | 'liked', currentId: string | null, extra: any }
  const [navState, setNavState] = useState({ view: 'home', currentId: null, extra: null });
  const [navHistory, setNavHistory] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const view = navState.view;
  const setView = useCallback((newView) => {
    setNavState((prev) => {
      setNavHistory((h) => [...h, prev]);
      return { view: newView, currentId: null, extra: null };
    });
  }, []);

  const navigateTo = useCallback((newView, currentId = null, extra = null) => {
    setNavState((prev) => {
      setNavHistory((h) => [...h, prev]);
      return { view: newView, currentId, extra };
    });
  }, []);

  const goBack = useCallback(() => {
    setNavHistory((h) => {
      if (h.length === 0) {
        setNavState({ view: 'home', currentId: null, extra: null });
        return [];
      }
      const nextH = [...h];
      const prev = nextH.pop();
      setNavState(prev || { view: 'home', currentId: null, extra: null });
      return nextH;
    });
  }, []);

  // ── Library (liked + playlists + custom albums) ───────────────────
  const library = useLibrary();

  // ── Forward-declare playNext so it can be called inside events ─────
  const playNextRef = useRef(null);

  // ── Initialize YouTube IFrame Player API (Direct Embedded Audio) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load YouTube IFrame API script dynamically on app mount if not present
    if (!window.YT && !document.getElementById('youtube-iframe-api-script')) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api-script';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }

    const setupPlayer = () => {
      if (window.YT && window.YT.Player && !ytPlayerRef.current) {
        try {
          ytPlayerRef.current = new window.YT.Player('youtube-player-container', {
            height: '200',
            width: '200',
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              rel: 0,
              origin: window.location.origin,
              enablejsapi: 1,
              playsinline: 1,
            },
            events: {
              onReady: () => {
                ytReadyRef.current = true;
                if (ytPlayerRef.current?.setVolume) {
                  ytPlayerRef.current.setVolume(volume * 100);
                }
                if (pendingSongRef.current) {
                  const song = pendingSongRef.current;
                  pendingSongRef.current = null;
                  executeLoadSong(song);
                }
              },
              onStateChange: (event) => {
                // YT.PlayerState.PLAYING = 1
                if (event.data === 1) {
                  setIsPlaying(true);
                  setIsLoading(false);
                  if (ytPlayerRef.current?.getDuration) {
                    const d = ytPlayerRef.current.getDuration();
                    if (d && d > 0) setDuration(d);
                  }
                }
                // YT.PlayerState.PAUSED = 2
                else if (event.data === 2) {
                  setIsPlaying(false);
                  setIsLoading(false);
                }
                // YT.PlayerState.BUFFERING = 3
                else if (event.data === 3) {
                  setIsLoading(true);
                }
                // YT.PlayerState.ENDED = 0
                else if (event.data === 0) {
                  setIsPlaying(false);
                  setIsLoading(false);
                  if (playNextRef.current) {
                    playNextRef.current();
                  }
                }
              },
              onError: (err) => {
                console.warn('[YouTube Player] Playback error code:', err?.data);
                setIsLoading(false);
              },
            },
          });
        } catch (err) {
          console.warn('[YouTube Player] Init error:', err);
        }
      }
    };

    if (window.YT && window.YT.Player) {
      setupPlayer();
    } else {
      window.onYouTubeIframeAPIReady = setupPlayer;
      const interval = setInterval(() => {
        if (window.YT?.Player && !ytPlayerRef.current) {
          setupPlayer();
        } else if (ytPlayerRef.current) {
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Track progress polling (1000ms interval loop) ───────────────────
  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      timer = setInterval(() => {
        const p = ytPlayerRef.current;
        if (p && typeof p.getCurrentTime === 'function') {
          const t = p.getCurrentTime();
          const d = p.getDuration();
          if (typeof t === 'number' && !isNaN(t)) {
            setCurrentTime(t);
          }
          if (typeof d === 'number' && !isNaN(d) && d > 0) {
            setDuration(d);
          }
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  // ── Unified YouTube Control Bindings ──────────────────────────────

  const play = useCallback(() => {
    if (ytPlayerRef.current?.playVideo) {
      ytPlayerRef.current.playVideo();
    }
  }, []);

  const pause = useCallback(() => {
    if (ytPlayerRef.current?.pauseVideo) {
      ytPlayerRef.current.pauseVideo();
    }
  }, []);

  const togglePlay = useCallback(() => {
    const p = ytPlayerRef.current;
    if (!p) return;
    if (isPlaying) {
      p.pauseVideo();
    } else {
      p.playVideo();
    }
  }, [isPlaying]);

  const seek = useCallback((time) => {
    const p = ytPlayerRef.current;
    if (p && typeof p.seekTo === 'function') {
      p.seekTo(time, true);
      setCurrentTime(time);
    }
  }, []);

  const changeVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    const p = ytPlayerRef.current;
    if (p && typeof p.setVolume === 'function') {
      p.setVolume(clamped * 100);
      p.unMute();
    }
    setVolume(clamped);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const p = ytPlayerRef.current;
    if (!p) return;
    if (typeof p.isMuted === 'function' && p.isMuted()) {
      p.unMute();
      setIsMuted(false);
    } else if (typeof p.mute === 'function') {
      p.mute();
      setIsMuted(true);
    }
  }, []);

  // ── Helper to execute load on the YouTube Player ──────────────────
  const executeLoadSong = useCallback(async (song) => {
    const p = ytPlayerRef.current;
    if (!p) return;

    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);

    // Completely decoupled from Saavn preview URLs (preventing 30s limits)
    const cleanSong = { ...song };
    delete cleanSong.media_preview_url;

    // Dynamically retrieve pre-mapped videoId or resolve dynamically
    let targetVideoId = cleanSong.videoId || cleanSong.youtubeId;
    if (!targetVideoId) {
      targetVideoId = await resolveYouTubeVideoId(cleanSong.title, cleanSong.artist);
    }

    if (targetVideoId) {
      cleanSong.videoId = targetVideoId;
      cleanSong.youtubeId = targetVideoId;
      if (typeof p.loadVideoById === 'function') {
        p.loadVideoById(targetVideoId);
      }
    } else {
      // Direct YouTube search playlist loading fallback
      const searchQuery = `${cleanSong.title} ${cleanSong.artist || ''}`.trim();
      if (typeof p.loadPlaylist === 'function') {
        p.loadPlaylist({ listType: 'search', list: searchQuery, index: 0, startSeconds: 0 });
      }
    }

    if (typeof p.setVolume === 'function') {
      p.setVolume(volume * 100);
      if (isMuted && typeof p.mute === 'function') p.mute();
      else if (typeof p.unMute === 'function') p.unMute();
    }

    if (typeof p.playVideo === 'function') {
      p.playVideo();
    }
  }, [volume, isMuted]);

  // ── Load a song into the embedded YouTube engine ───────────────────
  const loadSong = useCallback(async (song, newQueue = null, newIndex = 0) => {
    if (!song) return;

    // Completely decouple from preview URLs
    const cleanSong = { ...song };
    delete cleanSong.media_preview_url;

    setCurrentSong(cleanSong);
    currentSongRef.current = cleanSong;
    if (newQueue) {
      setQueue(newQueue);
      setQueueIndex(newIndex);
    }

    if (!ytReadyRef.current || !ytPlayerRef.current) {
      pendingSongRef.current = cleanSong;
      setIsLoading(true);
    } else {
      executeLoadSong(cleanSong);
    }

    // Fetch lyrics async (non-blocking)
    setLrcString(DEMO_LRC);
    setLyricsSource('demo');
    setLyricsLoading(true);
    fetchSongLyrics(cleanSong.id, cleanSong.title, cleanSong.artist)
      .then(({ lrc, source }) => {
        setLrcString(lrc);
        setLyricsSource(source);
      })
      .catch(() => {})
      .finally(() => setLyricsLoading(false));
  }, [executeLoadSong]);

  // ── Queue navigation ──────────────────────────────────────────────
  const playNext = useCallback(() => {
    if (!queue.length) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIndex);
    loadSong(queue[nextIndex], null, nextIndex);
  }, [queue, queueIndex, loadSong]);

  playNextRef.current = playNext;

  const playPrev = useCallback(() => {
    const p = ytPlayerRef.current;
    if (p && typeof p.getCurrentTime === 'function' && p.getCurrentTime() > 3) {
      p.seekTo(0, true);
      setCurrentTime(0);
      return;
    }
    if (!queue.length) return;
    const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIndex);
    loadSong(queue[prevIndex], null, prevIndex);
  }, [queue, queueIndex, loadSong]);

  const playCollection = useCallback((songs, startIndex = 0) => {
    if (!songs || !songs.length) return;
    loadSong(songs[startIndex], songs, startIndex);
  }, [loadSong]);

  const playAlbum = useCallback((tracks, startIndex = 0) => {
    if (!tracks || !tracks.length) return;
    loadSong(tracks[startIndex], tracks, startIndex);
  }, [loadSong]);

  const toggleView = useCallback(() => {
    setNavState((prev) => {
      if (prev.view === 'lyrics') {
        return { view: 'home', currentId: null, extra: null };
      }
      return { view: 'lyrics', currentId: null, extra: null };
    });
  }, []);

  const value = {
    ytPlayerRef,
    isPlaying, currentTime, duration, volume, isMuted, isLoading,
    currentSong, queue, queueIndex,
    lrcString, lyricsSource, lyricsLoading,
    view, setView,
    navState, setNavState, navigateTo, goBack, playAlbum,
    isSettingsOpen, setIsSettingsOpen,
    // Actions
    play, pause, togglePlay, seek, changeVolume, toggleMute,
    loadSong, playNext, playPrev, playCollection, toggleView,
    // Library
    ...library,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* ── Native YouTube IFrame Audio Engine (Zero CORS / Full Length) ── */}
      <div
        id="youtube-player-container"
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: '200px',
          height: '200px',
          left: '0px',
          top: '0px',
          zIndex: -50,
        }}
        aria-hidden="true"
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
