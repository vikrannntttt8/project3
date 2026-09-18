import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { fetchLyrics } from '../utils/innertube.js';
import { DEMO_LRC } from '../utils/lrcParser.js';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);

  // ── Playback state ────────────────────────────────────────────────
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [volume,      setVolume]      = useState(0.8);
  const [isMuted,     setIsMuted]     = useState(false);

  // ── Song state ────────────────────────────────────────────────────
  const [currentSong, setCurrentSong] = useState(null);
  // { videoId, title, artist, thumbnail, streamUrl, duration }

  // ── LRC state ─────────────────────────────────────────────────────
  const [lrcString,     setLrcString]     = useState(DEMO_LRC);
  const [lyricsSource,  setLyricsSource]  = useState('demo');

  // ── View state ────────────────────────────────────────────────────
  const [view, setView] = useState('home'); // 'home' | 'lyrics'

  // ── Wire up audio element events ──────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDuration   = () => setDuration(audio.duration);
    const onEnded      = () => setIsPlaying(false);
    const onPlay       = () => setIsPlaying(true);
    const onPause      = () => setIsPlaying(false);

    audio.addEventListener('timeupdate',       onTimeUpdate);
    audio.addEventListener('durationchange',   onDuration);
    audio.addEventListener('ended',            onEnded);
    audio.addEventListener('play',             onPlay);
    audio.addEventListener('pause',            onPause);

    return () => {
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('ended',          onEnded);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────
  const play = useCallback(() => {
    audioRef.current?.play().catch(console.error);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(console.error);
    else audio.pause();
  }, []);

  const seek = useCallback((time) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
  }, []);

  const changeVolume = useCallback((v) => {
    const audio = audioRef.current;
    const clamped = Math.max(0, Math.min(1, v));
    setVolume(clamped);
    if (audio) {
      audio.volume = clamped;
      audio.muted = false;
    }
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  }, []);

  /**
   * Load a song into the player.
   * Accepts a song object with streamUrl, title, artist, thumbnail.
   */
  const loadSong = useCallback(async (song) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Stop current playback
    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);

    setCurrentSong(song);

    if (song.streamUrl) {
      audio.src = song.streamUrl;
      audio.volume = volume;
      audio.load();
      audio.play().catch(console.error);
    }

    // Fetch lyrics asynchronously
    setLrcString(DEMO_LRC);
    setLyricsSource('demo');
    try {
      const { lrc, source } = await fetchLyrics(
        song.title,
        song.artist,
        song.duration
      );
      setLrcString(lrc);
      setLyricsSource(source);
    } catch (_) {
      // demo LRC is already set
    }
  }, [volume]);

  const toggleView = useCallback(() => {
    setView(v => v === 'home' ? 'lyrics' : 'home');
  }, []);

  const value = {
    audioRef,
    isPlaying, currentTime, duration, volume, isMuted,
    currentSong, lrcString, lyricsSource,
    view, setView,
    play, pause, togglePlay, seek, changeVolume, toggleMute,
    loadSong, toggleView,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Hidden audio element — single source of truth */}
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
