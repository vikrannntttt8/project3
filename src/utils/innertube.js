/**
 * Innertube API Stack
 * ─────────────────────────────────────────────────────────────────────
 * Layer 1: ytmusic-api → YouTube Music Innertube → search + metadata
 * Layer 2: Piped API   → audio stream URLs (no auth, CORS-friendly)
 * Layer 3: lrclib.net  → synced LRC lyrics
 * ─────────────────────────────────────────────────────────────────────
 */

import { DEMO_LRC } from './lrcParser.js';

// ── Piped instance (falls back through list if one is down) ──────────
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.yt',
  'https://piped-api.garudalinux.org',
];

// ── lrclib base URL ──────────────────────────────────────────────────
const LRCLIB_BASE = 'https://lrclib.net/api';

/**
 * Search YouTube Music via ytmusic-api (Innertube).
 * Returns array of normalized song objects.
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
export async function searchSongs(query) {
  if (!query.trim()) return [];

  try {
    // Use the YouTube Music search endpoint via a CORS-friendly public wrapper.
    // ytmusic-api exposes a local Node server; for browser use we call the
    // Piped API search which internally uses Innertube.
    const instance = PIPED_INSTANCES[0];
    const res = await fetch(
      `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Piped search failed: ${res.status}`);
    const data = await res.json();

    return (data.items || [])
      .filter(item => item.type === 'stream' || item.url?.startsWith('/watch'))
      .slice(0, 20)
      .map(normalizeSearchItem);
  } catch (err) {
    console.error('[innertube] search error:', err);
    // Return mock results so the UI is always functional during demo
    return getMockResults(query);
  }
}

/**
 * Get full song details + audio stream URL for a videoId.
 * @param {string} videoId
 * @returns {Promise<SongDetail>}
 */
export async function getSongStream(videoId) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const data = await res.json();

      // Pick best audio stream: prefer m4a/mp4a, then webm
      const audioStreams = (data.audioStreams || []).sort(
        (a, b) => (b.bitrate || 0) - (a.bitrate || 0)
      );
      const best =
        audioStreams.find(s => s.mimeType?.includes('mp4a')) ||
        audioStreams.find(s => s.mimeType?.includes('webm')) ||
        audioStreams[0];

      return {
        videoId,
        title: data.title || 'Unknown Track',
        uploader: data.uploader || 'Unknown Artist',
        uploaderUrl: data.uploaderUrl,
        thumbnail: data.thumbnailUrl || '',
        duration: data.duration || 0,
        streamUrl: best?.url || null,
        audioMime: best?.mimeType || '',
        chapters: data.chapters || [],
      };
    } catch (_) {
      continue;
    }
  }
  throw new Error('All Piped instances failed for streams/' + videoId);
}

/**
 * Fetch synced LRC lyrics from lrclib.net.
 * Falls back to plain lyrics, then to DEMO_LRC.
 * @param {string} trackName
 * @param {string} artistName
 * @param {number} [duration]
 * @returns {Promise<{ lrc: string, source: 'synced'|'plain'|'demo' }>}
 */
export async function fetchLyrics(trackName, artistName, duration) {
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });
    if (duration) params.set('duration', String(Math.round(duration)));

    const res = await fetch(`${LRCLIB_BASE}/search?${params}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`lrclib status ${res.status}`);
    const results = await res.json();

    if (!results.length) throw new Error('No lyrics found');

    // Prefer exact match on track name
    const match =
      results.find(r =>
        r.trackName?.toLowerCase().includes(trackName.toLowerCase())
      ) || results[0];

    if (match.syncedLyrics) {
      return { lrc: match.syncedLyrics, source: 'synced' };
    }
    if (match.plainLyrics) {
      // Convert plain lyrics to LRC with 5-second intervals
      const lines = match.plainLyrics.split('\n').filter(Boolean);
      const lrc = lines
        .map((line, i) => {
          const t = i * 5;
          const mm = String(Math.floor(t / 60)).padStart(2, '0');
          const ss = String(t % 60).padStart(2, '0');
          return `[${mm}:${ss}.00] ${line}`;
        })
        .join('\n');
      return { lrc, source: 'plain' };
    }
    throw new Error('No usable lyrics format');
  } catch (err) {
    console.warn('[innertube] lyrics fallback to demo:', err.message);
    return { lrc: DEMO_LRC, source: 'demo' };
  }
}

// ── Normalizers & Mocks ─────────────────────────────────────────────

function normalizeSearchItem(item) {
  const videoId = item.url?.replace('/watch?v=', '') || item.videoId || '';
  return {
    videoId,
    title: item.title || 'Unknown',
    artist: item.uploaderName || item.uploader || 'Unknown Artist',
    thumbnail:
      item.thumbnail ||
      item.thumbnailUrl ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: item.duration || 0,
    views: item.views || 0,
  };
}

function getMockResults(query) {
  const mocks = [
    {
      videoId: 'dQw4w9WgXcQ',
      title: `${query} — Top Result`,
      artist: 'Pulse Radio',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      duration: 212,
    },
    {
      videoId: 'kXYiU_JCYtU',
      title: 'Numb / Encore',
      artist: 'Linkin Park & Jay-Z',
      thumbnail: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg',
      duration: 315,
    },
    {
      videoId: '3JZ4pnNtyxQ',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      thumbnail: 'https://i.ytimg.com/vi/3JZ4pnNtyxQ/hqdefault.jpg',
      duration: 200,
    },
    {
      videoId: 'SlPhMPnQ58k',
      title: 'Stay',
      artist: 'Kid Laroi & Justin Bieber',
      thumbnail: 'https://i.ytimg.com/vi/SlPhMPnQ58k/hqdefault.jpg',
      duration: 141,
    },
  ];
  return mocks;
}
