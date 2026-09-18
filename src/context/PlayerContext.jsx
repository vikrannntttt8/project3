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

  // ── Lyrics state ──────────────────────────────────────────────────
  const [lrcString,    setLrcString]    = useState(DEMO_LRC);
  const [lyricsSource, setLyricsSource] = useState('demo');
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // ── View state ────────────────────────────────────────────────────
  const [view, setView] = useState('home'); // 'home' | 'lyrics' | 'library' | 'liked'

  // ── Library (liked + playlists + custom albums) ───────────────────
  const library = useLibrary();

  // ── Wire Audio element events (once, on mount) ─────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate   = () => setCurrentTime(audio.currentTime);
    const onDuration     = () => setDuration(audio.duration || 0);
    const onEnded        = () => { setIsPlaying(false); playNext(); };
    const onPlay         = () => { setIsPlaying(true);  setIsLoading(false); };
    const onPause        = () => setIsPlaying(false);
    const onWaiting      = () => setIsLoading(true);
    const onCanPlay      = () => setIsLoading(false);
    const onError        = (e) => {
      console.warn('[Audio] error event on stream:', audio.src, e);
      const active = currentSongRef.current;
      if (active?.backupStreamUrl && audio.src !== active.backupStreamUrl) {
        console.log('[Audio] Auto-switching to backup 320kbps direct stream to ensure playback');
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
  }, []);

  // ── Core playback actions ─────────────────────────────────────────

  const play = useCallback(() => {
    audioRef.current?.play().catch(console.error);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.src) return;
    a.paused ? a.play().catch(console.error) : a.pause();
  }, []);

  const seek = useCallback((time) => {
    const a = audioRef.current;
    if (!a) return;
    const clamped = Math.max(0, Math.min(time, a.duration || 0));
    a.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const changeVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted  = false;
    }
    setVolume(clamped);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = !a.muted;
    setIsMuted(a.muted);
  }, []);

  // ── Load a song into the audio engine ─────────────────────────────

  const loadSong = useCallback(async (song, newQueue = null, newIndex = 0) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);

    // TASK 2: PIPED YOUTUBE STREAM INTEGRATION
    // 1. Replace Saavn stream extractor in playback handler to bypass 30-second preview limit
    // 2. Search query: https://pipedapi.kavin.rocks/search?q={songName}&filter=music_songs
    // 3. Details: https://pipedapi.kavin.rocks/streams/{videoId}
    // 4. Extract highest bitrate item (stream.mimeType === "audio/webm" or "audio/mp4")
    // 5. Set direct URL as <audio src={streamUrl}> source
    let directStream = '';

    try {
      const piped = await getPipedAudioStream(song.title, song.artist);
      if (piped?.streamUrl) {
        directStream = piped.streamUrl;
      }
    } catch (err) {
      console.warn('[Piped] Stream extraction fallback:', err);
    }

    // Extract backup 320kbps stream from song metadata to guarantee playback
    let backupStream = '';
    if (Array.isArray(song.downloadUrl) && song.downloadUrl.length) {
      const high320 = song.downloadUrl.find(d => d?.quality === '320kbps' || String(d?.quality).includes('320'));
      backupStream = high320?.url || high320?.link || song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[song.downloadUrl.length - 1]?.link || '';
    } else if (song.streamUrl && !song.streamUrl.includes('_p.')) {
      backupStream = song.streamUrl;
    }

    if (!directStream && song.id && !backupStream) {
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

    if (!directStream) {
      directStream = backupStream;
    }

    const updatedSong = { ...song, streamUrl: directStream, backupStreamUrl: backupStream };
    setCurrentSong(updatedSong);
    currentSongRef.current = updatedSong;
    if (newQueue) { setQueue(newQueue); setQueueIndex(newIndex); }

    // Direct the HTML5 <audio> element to load the stream and verify playback beyond 0:30
    if (directStream) {
      audio.src = directStream;
      audio.load();
      audio.volume = volume;
      audio.play().catch(err => {
        console.warn('[Audio] Initial stream playback failed, trying backup:', err);
        if (backupStream && audio.src !== backupStream) {
          audio.src = backupStream;
          audio.load();
          audio.play().catch(e => {
            console.error('[Audio] Backup playback failed:', e);
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
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
