/**
 * Piped YouTube Audio Stream Engine
 * ─────────────────────────────────────────────────────────────────────
 * Endpoints:
 * - Search: https://pipedapi.kavin.rocks/search?q={songName}&filter=music_songs
 * - Streams: https://pipedapi.kavin.rocks/streams/{videoId}
 * ─────────────────────────────────────────────────────────────────────
 */

const PRIMARY_PIPED_BASE = 'https://pipedapi.kavin.rocks';

// Fallback instances in case primary public instance experiences rate limits or outages
const PIPED_FALLBACK_INSTANCES = [
  'https://piped-api.lunar.icu',
  'https://api.piped.private.coffee',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.tokhmi.xyz',
];

/**
 * Fetch direct audio stream for a song using Piped YouTube Engine.
 * Extracts the highest bitrate stream matching audio/webm or audio/mp4.
 *
 * @param {string} songName
 * @param {string} [artistName]
 * @returns {Promise<{ streamUrl: string, bitrate: number, mimeType: string, videoId: string } | null>}
 */
export async function getPipedAudioStream(songName, artistName = '') {
  if (!songName || !songName.trim()) return null;

  const query = `${songName} ${artistName || ''}`.replace(/\(.*\)|\[.*\]/g, '').trim();

  // Try Vite proxy if available locally, then primary, then fallbacks
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const instanceList = isLocal
    ? ['/api/piped', PRIMARY_PIPED_BASE, ...PIPED_FALLBACK_INSTANCES]
    : [PRIMARY_PIPED_BASE, ...PIPED_FALLBACK_INSTANCES];

  for (const base of instanceList) {
    try {
      // 1. Search query endpoint: https://pipedapi.kavin.rocks/search?q={songName}&filter=music_songs
      const searchUrl = `${base}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
      if (!searchRes.ok) continue;

      const searchData = await searchRes.json();
      const items = searchData.items || [];
      if (!items.length) continue;

      // Find first usable video stream item
      const item = items.find(i => i.url?.startsWith('/watch') || i.videoId) || items[0];
      const videoId = item.url ? item.url.replace('/watch?v=', '') : item.videoId;
      if (!videoId) continue;

      // 2. Fetch video details endpoint: https://pipedapi.kavin.rocks/streams/{videoId}
      const streamUrl = `${base}/streams/${encodeURIComponent(videoId)}`;
      const streamRes = await fetch(streamUrl, { signal: AbortSignal.timeout(7000) });
      if (!streamRes.ok) continue;

      const streamData = await streamRes.json();
      const rawStreams = streamData.audioStreams || [];

      // 3. Extract highest bitrate item from audioStreams (where mimeType === "audio/webm" or "audio/mp4")
      const candidateStreams = rawStreams.filter(s => {
        const mime = (s.mimeType || '').toLowerCase();
        return (
          mime.startsWith('audio/webm') ||
          mime.startsWith('audio/mp4') ||
          mime.includes('webm') ||
          mime.includes('mp4') ||
          mime.includes('m4a')
        );
      });

      const listToEvaluate = candidateStreams.length ? candidateStreams : rawStreams;
      if (!listToEvaluate.length) continue;

      // Sort by bitrate descending to get the highest quality direct stream
      listToEvaluate.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const bestAudio = listToEvaluate[0];

      if (bestAudio?.url) {
        return {
          streamUrl: bestAudio.url,
          bitrate: bestAudio.bitrate || 0,
          mimeType: bestAudio.mimeType || 'audio/webm',
          videoId,
          title: streamData.title || item.title || songName,
          uploader: streamData.uploader || item.uploaderName || artistName,
        };
      }
    } catch (err) {
      console.warn(`[PipedAudio] Instance ${base} error:`, err.message);
      continue;
    }
  }

  return null;
}
