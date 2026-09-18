/**
 * YouTube Embed Audio Engine
 * ─────────────────────────────────────────────────────────────────────
 * TASK 1: Direct YouTube IFrame Player Engine
 * - Removed all REST API direct audio stream fetching to prevent CORS & 403 errors.
 * - Resolves videoId for native playback via window.YT.Player.
 * - Supports loadVideoById and native loadPlaylist({ listType: 'search' }).
 * ─────────────────────────────────────────────────────────────────────
 */

const SEARCH_PROXIES = [
  'https://corsproxy.io/?https://pipedapi.kavin.rocks/search?filter=music_songs&q=',
  'https://api.piped.privacydev.net/search?filter=music_songs&q=',
  'https://api.allorigins.win/raw?url=',
];

/**
 * Fast resolution of YouTube video ID for a song query.
 * Does NOT fetch audio streams, only resolves the 11-char videoId.
 *
 * @param {string} title
 * @param {string} [artist='']
 * @returns {Promise<string | null>}
 */
export async function resolveYouTubeVideoId(title, artist = '') {
  if (!title) return null;
  const cleanTitle = title.replace(/\(.*\)|\[.*\]/g, '').trim();
  const cleanArtist = (artist || '').split(/[,&]/)[0].trim();
  const query = `${cleanTitle} ${cleanArtist}`.trim();

  // Tier 1: Piped / Invidious Metadata Search (Lightweight JSON, no stream extraction)
  for (const endpoint of SEARCH_PROXIES) {
    try {
      let targetUrl = '';
      if (endpoint.includes('allorigins.win')) {
        const pipedSearch = `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=music_songs`;
        targetUrl = `${endpoint}${encodeURIComponent(pipedSearch)}`;
      } else {
        targetUrl = `${endpoint}${encodeURIComponent(query)}`;
      }

      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;

      const text = await res.text();
      if (!text || text.trim().startsWith('<')) continue;

      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : data.items || [];
      if (items.length) {
        const first = items.find(i => i.url?.startsWith('/watch') || i.videoId) || items[0];
        const vid = first.url ? first.url.replace('/watch?v=', '') : first.videoId;
        if (vid && vid.length === 11) {
          return vid;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}
