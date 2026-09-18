/**
 * Bulletproof YouTube Stream Engine with Multi-Fallback Routing
 * ─────────────────────────────────────────────────────────────────────
 * TASK 1: RELIABLE FULL-LENGTH AUDIO ENGINE
 * - Primary: Route search & stream calls through https://corsproxy.io/?https://pipedapi.kavin.rocks
 *   and https://api.piped.privacydev.net
 * - Fallback: Invidious API instance (https://inv.tux.pizza/api/v1) and YouTube IFrame Player
 * - Complete decoupling from preview URLs to ensure continuous playback beyond 0:30
 * ─────────────────────────────────────────────────────────────────────
 */

const PRIMARY_PROXIED_PIPED = 'https://corsproxy.io/?https://pipedapi.kavin.rocks';
const OPEN_PIPED_INSTANCE  = 'https://api.piped.privacydev.net';

const ALL_PIPED_INSTANCES = [
  PRIMARY_PROXIED_PIPED,
  OPEN_PIPED_INSTANCE,
  'https://piped-api.garudalinux.org',
  'https://piped-api.lunar.icu',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.tokhmi.xyz',
];

const INVIDIOUS_INSTANCES = [
  'https://inv.tux.pizza/api/v1',
  'https://invidious.nerdvpn.de/api/v1',
  'https://invidious.protokolla.fi/api/v1',
];

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

/**
 * Fetch JSON with CORS proxy and multi-instance fallback.
 */
async function fetchJsonSafely(targetUrl, timeoutMs = 5500) {
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const urls = [];

  // Local Vite proxy mapping if applicable
  if (isLocal && targetUrl.includes('pipedapi.kavin.rocks')) {
    urls.push(targetUrl.replace(/https:\/\/(corsproxy\.io\/\?)?https:\/\/pipedapi\.kavin\.rocks/, '/api/piped'));
  }

  urls.push(targetUrl);
  if (!targetUrl.includes('corsproxy.io') && !targetUrl.includes('allorigins.win')) {
    urls.push(`${CORS_PROXIES[0]}${encodeURIComponent(targetUrl)}`);
    urls.push(`${CORS_PROXIES[1]}${encodeURIComponent(targetUrl)}`);
  }

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) continue;

      const text = await res.text();
      if (!text || text.trim().startsWith('<')) continue; // Skip HTML error pages

      const data = JSON.parse(text);
      if (data && typeof data === 'object') return data;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Resolve YouTube audio stream and metadata with multi-tier fallback.
 *
 * @param {string} songName
 * @param {string} [artistName='']
 * @returns {Promise<{ streamUrl: string, videoId: string, title: string, bitrate: number, mimeType: string, source: string } | null>}
 */
export async function getPipedAudioStream(songName, artistName = '') {
  if (!songName || !songName.trim()) return null;

  const query = `${songName} ${artistName || ''}`.replace(/\(.*\)|\[.*\]/g, '').trim();

  // ── Tier 1: Primary Piped Instances (Direct & CORS Proxied) ──────────
  for (const base of ALL_PIPED_INSTANCES) {
    try {
      const searchUrl = `${base}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
      const searchData = await fetchJsonSafely(searchUrl, 5000);
      if (!searchData) continue;

      const items = searchData.items || [];
      if (!items.length) continue;

      const item = items.find(i => i.url?.startsWith('/watch') || i.videoId) || items[0];
      const videoId = item.url ? item.url.replace('/watch?v=', '') : item.videoId;
      if (!videoId) continue;

      const streamUrl = `${base}/streams/${encodeURIComponent(videoId)}`;
      const streamData = await fetchJsonSafely(streamUrl, 6000);

      if (streamData?.audioStreams && streamData.audioStreams.length) {
        const candidateStreams = streamData.audioStreams.filter(s => {
          const mime = (s.mimeType || '').toLowerCase();
          return mime.includes('audio') || mime.includes('webm') || mime.includes('mp4') || mime.includes('m4a');
        });

        const list = candidateStreams.length ? candidateStreams : streamData.audioStreams;
        list.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        if (list[0]?.url) {
          return {
            streamUrl: list[0].url,
            videoId,
            title: streamData.title || item.title || songName,
            bitrate: list[0].bitrate || 0,
            mimeType: list[0].mimeType || 'audio/webm',
            source: 'piped',
          };
        }
      }

      // If videoId was discovered but direct audio stream was restricted, return videoId for YouTube IFrame fallback
      return {
        streamUrl: '',
        videoId,
        title: item.title || songName,
        bitrate: 0,
        mimeType: '',
        source: 'piped-id',
      };
    } catch {
      continue;
    }
  }

  // ── Tier 2: Invidious API Instance Fallback ──────────────────────────
  for (const inv of INVIDIOUS_INSTANCES) {
    try {
      const invSearchUrl = `${inv}/search?q=${encodeURIComponent(query)}&type=video`;
      const searchRes = await fetchJsonSafely(invSearchUrl, 5000);
      if (!Array.isArray(searchRes) || !searchRes.length) continue;

      const first = searchRes[0];
      const videoId = first.videoId;
      if (!videoId) continue;

      const detailsUrl = `${inv}/videos/${encodeURIComponent(videoId)}`;
      const details = await fetchJsonSafely(detailsUrl, 5000);

      if (details?.adaptiveFormats && details.adaptiveFormats.length) {
        const audioFormats = details.adaptiveFormats.filter(f => (f.type || '').includes('audio'));
        if (audioFormats.length) {
          audioFormats.sort((a, b) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));
          if (audioFormats[0]?.url) {
            return {
              streamUrl: audioFormats[0].url,
              videoId,
              title: details.title || first.title || songName,
              bitrate: parseInt(audioFormats[0].bitrate) || 160000,
              mimeType: audioFormats[0].type || 'audio/webm',
              source: 'invidious',
            };
          }
        }
      }

      return {
        streamUrl: '',
        videoId,
        title: details?.title || first.title || songName,
        bitrate: 0,
        mimeType: '',
        source: 'invidious-id',
      };
    } catch {
      continue;
    }
  }

  return null;
}
