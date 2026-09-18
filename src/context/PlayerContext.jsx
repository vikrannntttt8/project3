import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { fetchSongLyrics } from '../utils/saavn.js';
import { DEMO_LRC } from '../utils/lrcParser.js';
import { useLibrary } from '../hooks/useLibrary.js';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  // ── Single persistent Audio instance (no re-renders on src change) ──
  const audioRef = useRef(null);
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
    audioRef.current.crossOrigin = 'anonymous';
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
  const [queue,       setQueue]       = useState([]);
  const [queueIndex,  setQueueIndex]  = useState(0);

  // ── Lyrics state ──────────────────────────────────────────────────
  const [lrcString,    setLrcString]    = useState(DEMO_LRC);
  const [lyricsSource, setLyricsSource] = useState('demo');
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // ── View state ────────────────────────────────────────────────────
  const [view, setView] = useState('home'); // 'home' | 'lyrics' | 'library'

  // ── Library (liked + playlists) ───────────────────────────────────
  const library = useLibrary();

  // ── Wire Audio element events (once, on mount) ─────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate   = () => setCurrentTime(audio.currentTime);
    const onDuration     = () => setDuration(audio.duration || 0);
    const onEnded        = () => { setIsPlaying(false); playNext(); };
    const onPlay         = () => { setIsPlaying(true);  setIsLoading(false); };
    const onPause        = () => setIsPlaying(false);
    const onWaiting      = () => setIsLoading(true);
    const onCanPlay      = () => setIsLoading(false);
    const onError        = (e) => {
      console.error('[Audio] error:', e);
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
  }, []);

  // ── Core playback actions ─────────────────────────────────────────

  const play = useCallback(() => {
    audioRef.current.play().catch(console.error);
  }, []);

  const pause = useCallback(() => {
    audioRef.current.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a.src) return;
    a.paused ? a.play().catch(console.error) : a.pause();
  }, []);

  const seek = useCallback((time) => {
    const a = audioRef.current;
    const clamped = Math.max(0, Math.min(time, a.duration || 0));
    a.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const changeVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    audioRef.current.volume = clamped;
    audioRef.current.muted  = false;
    setVolume(clamped);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const a     = audioRef.current;
    a.muted     = !a.muted;
    setIsMuted(a.muted);
  }, []);

  // ── Load a song into the audio engine ─────────────────────────────

  const loadSong = useCallback(async (song, newQueue = null, newIndex = 0) => {
    const audio = audioRef.current;

    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);

    setCurrentSong(song);
    if (newQueue) { setQueue(newQueue); setQueueIndex(newIndex); }

    // Set stream URL and play
    if (song.streamUrl) {
      audio.src = song.streamUrl;
      audio.load();
      audio.volume = volume;
      audio.play().catch(err => {
        console.error('[Audio] play failed:', err);
        setIsLoading(false);
      });
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
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
