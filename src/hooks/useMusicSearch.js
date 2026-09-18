import { useState, useCallback, useRef } from 'react';
import {
  searchAll,
  searchSongs,
  searchAlbums,
  searchArtists,
  searchPlaylists,
} from '../utils/saavn.js';

export const SEARCH_TABS = ['all', 'songs', 'albums', 'artists', 'playlists'];

const SEARCH_FNS = {
  all:       searchAll,
  songs:     searchSongs,
  albums:    searchAlbums,
  artists:   searchArtists,
  playlists: searchPlaylists,
};

/**
 * useMusicSearch — Saavn.dev powered search hook
 *
 * Manages debounced search across 5 tabs: All | Songs | Albums | Artists | Playlists.
 * `results` shape depends on active tab:
 *   - 'all'       → { songs[], albums[], artists[], playlists[] }
 *   - 'songs'     → Song[]
 *   - 'albums'    → Album[]
 *   - 'artists'   → Artist[]
 *   - 'playlists' → Playlist[]
 */
export function useMusicSearch() {
  const [results,      setResults]      = useState(null); // null = not searched yet
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [activeTab,    setActiveTab]    = useState('all');
  const [query,        setQuery]        = useState('');

  const debounceRef = useRef(null);

  /** Execute a search for the current query and given tab */
  const executeSearch = useCallback(async (q, tab) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    setError(null);
    try {
      // Primary: Innertube backend search gateway
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const songs = await res.json();
        if (Array.isArray(songs) && songs.length > 0) {
          if (tab === 'songs') {
            setResults(songs);
            return;
          }
          if (tab === 'all') {
            setResults({
              songs: songs,
              albums: [],
              artists: [],
              playlists: [],
            });
            return;
          }
        }
      }

      // Fallback: standard SEARCH_FNS
      const fn = SEARCH_FNS[tab] || searchAll;
      const data = await fn(q);
      setResults(data);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Debounced query update — triggers after 350ms idle */
  const search = useCallback((q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults(null); return; }
    debounceRef.current = setTimeout(() => {
      executeSearch(q, activeTab);
    }, 350);
  }, [activeTab, executeSearch]);

  /** Switch tab and re-run search for current query */
  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
    if (query.trim()) {
      executeSearch(query, tab);
    }
  }, [query, executeSearch]);

  /** Clear everything */
  const clear = useCallback(() => {
    clearTimeout(debounceRef.current);
    setQuery('');
    setResults(null);
    setError(null);
  }, []);

  return {
    query, results, loading, error, activeTab,
    search, switchTab, clear,
  };
}
