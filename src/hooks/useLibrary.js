/**
 * useLibrary.js — Local playlist & liked-tracks engine
 *
 * Persists to localStorage. Provides CRUD for:
 *   - Liked tracks
 *   - User-created playlists (with songs)
 *   - Queue (current session)
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEYS = {
  liked:     'pulse_liked_songs',
  playlists: 'pulse_playlists',
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function useLibrary() {
  const [liked,     setLiked]     = useState(() => load(STORAGE_KEYS.liked,     []));
  const [playlists, setPlaylists] = useState(() => load(STORAGE_KEYS.playlists, []));

  // Sync to localStorage on change
  useEffect(() => { save(STORAGE_KEYS.liked,     liked);     }, [liked]);
  useEffect(() => { save(STORAGE_KEYS.playlists, playlists); }, [playlists]);

  // ── Liked tracks ──────────────────────────────────────────────────

  const isLiked = useCallback((id) =>
    liked.some(s => s.id === id), [liked]);

  const toggleLike = useCallback((song) => {
    setLiked(prev =>
      prev.some(s => s.id === song.id)
        ? prev.filter(s => s.id !== song.id)
        : [song, ...prev]
    );
  }, []);

  // ── Playlists ─────────────────────────────────────────────────────

  /** Create a new empty playlist */
  const createPlaylist = useCallback((title, description = '') => {
    const playlist = {
      id:          `pl_${Date.now()}`,
      title:       title.trim() || 'My Playlist',
      description: description.trim(),
      createdAt:   Date.now(),
      songs:       [],
      thumbnail:   '',
    };
    setPlaylists(prev => [playlist, ...prev]);
    return playlist.id;
  }, []);

  /** Delete a playlist by id */
  const deletePlaylist = useCallback((playlistId) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
  }, []);

  /** Rename a playlist */
  const renamePlaylist = useCallback((playlistId, newTitle) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId ? { ...p, title: newTitle } : p
    ));
  }, []);

  /** Add a song to a playlist (dedup by song id) */
  const addToPlaylist = useCallback((playlistId, song) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      if (p.songs.some(s => s.id === song.id)) return p; // already in
      const thumbnail = p.thumbnail || song.thumbnail;
      return { ...p, songs: [...p.songs, song], thumbnail };
    }));
  }, []);

  /** Remove a song from a playlist */
  const removeFromPlaylist = useCallback((playlistId, songId) => {
    setPlaylists(prev => prev.map(p =>
      p.id !== playlistId ? p : {
        ...p,
        songs: p.songs.filter(s => s.id !== songId),
        thumbnail: p.songs.filter(s => s.id !== songId)[0]?.thumbnail || p.thumbnail,
      }
    ));
  }, []);

  /** Get a single playlist by id */
  const getPlaylist = useCallback((id) =>
    playlists.find(p => p.id === id) || null, [playlists]);

  return {
    liked, playlists,
    isLiked, toggleLike,
    createPlaylist, deletePlaylist, renamePlaylist,
    addToPlaylist, removeFromPlaylist, getPlaylist,
  };
}
