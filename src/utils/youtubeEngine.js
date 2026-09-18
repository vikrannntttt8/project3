/**
 * YouTube Video ID Resolver (No Audio Stream Fetching)
 * ─────────────────────────────────────────────────────────────────────
 * Resolves 11-character YouTube videoId strings for window.YT.Player.
 * Completely free of audio stream REST API fetching.
 * ─────────────────────────────────────────────────────────────────────
 */

// Curated dictionary for instant resolution of popular demo tracks & artists
const POPULAR_VIDEO_IDS = {
  'starboy': '34Na4j8AVgA',
  'blinding lights': '4NRXx6U8ABQ',
  'numb': 'kXYiU_JCYtU',
  'stay': 'SlPhMPnQ58k',
  'arijit singh': 'Umqb9KENgmk',
  'kesariya': 'BddP6PYo2gs',
  'apna bana le': 'ElZfdU54Cp8',
  'channa mereya': 'bzSTpdcs-EI',
  'lofi chill': 'jfKfPfyJRdk',
  'punjabi': 'vX2cDW8LUWk',
};

/**
 * Resolve YouTube videoId for a song title & artist.
 *
 * @param {string} title
 * @param {string} [artist='']
 * @returns {Promise<string>}
 */
export async function resolveYouTubeVideoId(title, artist = '') {
  if (!title) return '34Na4j8AVgA'; // Default to Starboy

  const cleanTitle = title.replace(/\(.*\)|\[.*\]/g, '').trim().toLowerCase();
  const cleanArtist = (artist || '').split(/[,&]/)[0].trim().toLowerCase();
  const fullQuery = `${cleanTitle} ${cleanArtist}`.trim();

  // Check instant dictionary
  for (const [key, vid] of Object.entries(POPULAR_VIDEO_IDS)) {
    if (cleanTitle.includes(key) || fullQuery.includes(key)) {
      return vid;
    }
  }

  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  // Strategy 1: Local Vite proxy to YouTube search results (instant, no CORS)
  if (isLocal) {
    try {
      const res = await fetch(`/api/yt/results?search_query=${encodeURIComponent(fullQuery)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch (_) {}
  }

  // Strategy 2: CORS proxy to YouTube search results
  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(fullQuery)}`;
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(ytUrl)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (_) {}

  // Reliable default music video ID
  return '34Na4j8AVgA';
}
