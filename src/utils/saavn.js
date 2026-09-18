/**
 * saavn.js — Saavn.dev API Wrapper (Full)
 * ─────────────────────────────────────────────
 * CORS-friendly, no auth, 320kbps MP3 streams.
 */

import { DEMO_LRC } from './lrcParser.js';

const BASE = 'https://saavn.dev/api';

// ── Internal helpers ─────────────────────────────────────────────────

function bestImage(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return arr[arr.length - 1]?.url || arr[0]?.url || '';
}

function bestStream(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return arr[arr.length - 1]?.url || arr[0]?.url || '';
}

function artistStr(artists) {
  if (!artists) return 'Unknown Artist';
  const primary = artists.primary || artists.all || [];
  return primary.length
    ? primary.map(a => a.name).join(', ')
    : (artists.name || 'Unknown Artist');
}

export function normalizeSong(s) {
  return {
    id:        s.id       || '',
    title:     s.name     || s.title || 'Unknown',
    artist:    artistStr(s.artists),
    album:     s.album?.name || '',
    thumbnail: bestImage(s.image),
    streamUrl: bestStream(s.downloadUrl),
    duration:  Number(s.duration) || 0,
    language:  s.language || '',
    year:      s.year     || '',
    hasLyrics: s.hasLyrics || false,
    explicit:  s.explicitContent || false,
    type:      'song',
  };
}

function normalizeAlbum(a) {
  return {
    id:        a.id   || '',
    title:     a.name || 'Unknown Album',
    artist:    artistStr(a.artists),
    thumbnail: bestImage(a.image),
    year:      a.year      || '',
    songCount: a.songCount || 0,
    type:      'album',
  };
}

function normalizeArtist(a) {
  return {
    id:        a.id   || '',
    title:     a.name || 'Unknown Artist',
    thumbnail: bestImage(a.image),
    followerCount: a.followerCount || 0,
    type:      'artist',
  };
}

function normalizePlaylist(p) {
  return {
    id:        p.id   || '',
    title:     p.name || 'Unknown Playlist',
    thumbnail: bestImage(p.image),
    songCount: p.songCount || 0,
    type:      'playlist',
  };
}

async function apiFetch(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Saavn API ${res.status}: ${url}`);
  return res.json();
}

// ── Search ────────────────────────────────────────────────────────────

export async function searchAll(query) {
  if (!query.trim()) return { songs: [], albums: [], artists: [], playlists: [] };
  const json = await apiFetch(`${BASE}/search/all?query=${encodeURIComponent(query)}`);
  const d = json.data || {};
  return {
    songs:     (d.songs?.results     || []).map(normalizeSong),
    albums:    (d.albums?.results    || []).map(normalizeAlbum),
    artists:   (d.artists?.results   || []).map(normalizeArtist),
    playlists: (d.playlists?.results || []).map(normalizePlaylist),
  };
}

export async function searchSongs(query, limit = 20) {
  if (!query.trim()) return [];
  const json = await apiFetch(`${BASE}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`);
  return (json.data?.results || []).map(normalizeSong);
}

export async function searchAlbums(query, limit = 20) {
  if (!query.trim()) return [];
  const json = await apiFetch(`${BASE}/search/albums?query=${encodeURIComponent(query)}&limit=${limit}`);
  return (json.data?.results || []).map(normalizeAlbum);
}

export async function searchArtists(query, limit = 20) {
  if (!query.trim()) return [];
  const json = await apiFetch(`${BASE}/search/artists?query=${encodeURIComponent(query)}&limit=${limit}`);
  return (json.data?.results || []).map(normalizeArtist);
}

export async function searchPlaylists(query, limit = 20) {
  if (!query.trim()) return [];
  const json = await apiFetch(`${BASE}/search/playlists?query=${encodeURIComponent(query)}&limit=${limit}`);
  return (json.data?.results || []).map(normalizePlaylist);
}

// ── Detail fetchers ───────────────────────────────────────────────────

/** Full song detail by ID — includes downloadUrl */
export async function getSongById(id) {
  const json = await apiFetch(`${BASE}/songs/${id}`);
  const arr  = json.data || [];
  if (!arr.length) throw new Error('No song data');
  return normalizeSong(arr[0]);
}

/** All songs in an album */
export async function getAlbumSongs(albumId) {
  const json = await apiFetch(`${BASE}/albums?id=${albumId}`);
  const d    = json.data || {};
  const songs = (d.songs || []).map(normalizeSong);
  return {
    id:        d.id   || albumId,
    title:     d.name || 'Unknown Album',
    artist:    artistStr(d.artists),
    thumbnail: bestImage(d.image),
    year:      d.year || '',
    songs,
  };
}

/** Top tracks for an artist */
export async function getArtistSongs(artistId) {
  const json = await apiFetch(`${BASE}/artists/${artistId}/songs`);
  const d    = json.data || {};
  const songs = (d.songs?.results || d.results || []).map(normalizeSong);
  return {
    id:        d.id   || artistId,
    title:     d.name || 'Unknown Artist',
    thumbnail: bestImage(d.image),
    songs,
  };
}

/** All songs in a playlist */
export async function getPlaylistSongs(playlistId) {
  const json = await apiFetch(`${BASE}/playlists?id=${playlistId}`);
  const d    = json.data || {};
  const songs = (d.songs || []).map(normalizeSong);
  return {
    id:        d.id   || playlistId,
    title:     d.name || 'Unknown Playlist',
    thumbnail: bestImage(d.image),
    songs,
  };
}

// ── Lyrics ────────────────────────────────────────────────────────────

/**
 * Fetch lyrics for a song.
 * Returns { lrc, source: 'synced'|'plain'|'demo' }
 */
export async function fetchSongLyrics(id, title, artist) {
  // 1. Saavn lyrics endpoint
  try {
    const json = await apiFetch(`${BASE}/songs/${id}/lyrics`);
    const raw  = json.data?.lyrics || '';
    if (raw.trim()) {
      const lines = raw.split('\n').filter(l => l.trim());
      const lrc   = lines.map((line, i) => {
        const t  = i * 5;
        const mm = String(Math.floor(t / 60)).padStart(2, '0');
        const ss = String(t % 60).padStart(2, '0');
        return `[${mm}:${ss}.00] ${line}`;
      }).join('\n');
      return { lrc, source: 'plain' };
    }
  } catch (_) {}

  // 2. lrclib.net (synced LRC)
  try {
    const params = new URLSearchParams({ track_name: title, artist_name: artist });
    const res    = await fetch(`https://lrclib.net/api/search?${params}`,
      { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const results = await res.json();
      if (results.length) {
        const m = results.find(r =>
          r.trackName?.toLowerCase().includes(title.toLowerCase())
        ) || results[0];
        if (m.syncedLyrics) return { lrc: m.syncedLyrics, source: 'synced' };
        if (m.plainLyrics) {
          const lrc = m.plainLyrics.split('\n').filter(Boolean)
            .map((line, i) => {
              const t  = i * 5;
              const mm = String(Math.floor(t / 60)).padStart(2, '0');
              const ss = String(t % 60).padStart(2, '0');
              return `[${mm}:${ss}.00] ${line}`;
            }).join('\n');
          return { lrc, source: 'plain' };
        }
      }
    }
  } catch (_) {}

  return { lrc: DEMO_LRC, source: 'demo' };
}
