import { useState, useCallback, useRef } from 'react';
import { searchSongs, getSongStream } from '../utils/innertube.js';

/**
 * useMusicSearch — Innertube-powered search hook
 *
 * Provides debounced search against YouTube Music via Piped API.
 * Returns results, loading state, and an action to load a full song
 * (stream URL + metadata) into the player.
 */
export function useMusicSearch() {
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);

  const debounceRef = useRef(null);

  /**
   * Debounced search — triggers 350ms after last keystroke.
   * @param {string} query
   */
  const search = useCallback((query) => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchSongs(query);
        setResults(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  /**
   * Resolve full stream URL + metadata for a videoId.
   * @param {string} videoId
   * @returns {Promise<SongDetail>}
   */
  const getStreamDetails = useCallback(async (videoId) => {
    setStreamLoading(true);
    try {
      const detail = await getSongStream(videoId);
      return detail;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setStreamLoading(false);
    }
  }, []);

  return { results, loading, error, streamLoading, search, getStreamDetails };
}
