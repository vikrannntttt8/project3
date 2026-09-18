import { Innertube, UniversalCache, ClientType, Platform } from 'youtubei.js';

// Setup custom JavaScript function evaluator for signature/nsig deciphering
Platform.shim.eval = (data, env) => {
  const fn = new Function(...Object.keys(env), data.output);
  return fn(...Object.values(env));
};

let innertubeInstance = null;
let initPromise = null;

/**
 * Get or initialize the singleton Innertube client.
 * UniversalCache enabled, session generated locally.
 */
export async function getInnertube() {
  if (innertubeInstance) return innertubeInstance;

  if (!initPromise) {
    initPromise = Innertube.create({
      cache: new UniversalCache(true),
      client_type: ClientType.MUSIC, // WEB_REMIX YouTube Music client
    }).then((yt) => {
      innertubeInstance = yt;
      return yt;
    }).catch((err) => {
      initPromise = null;
      console.error('[Innertube] Init error:', err);
      throw err;
    });
  }

  return initPromise;
}

/**
 * 1. searchMusic(query: string)
 * Queries specifically via YouTube Music (music.search) filtering by song.
 * Maps results into a clean, unified schema.
 */
export async function searchMusic(query) {
  if (!query || !query.trim()) return [];

  const yt = await getInnertube();
  const searchResults = await yt.music.search(query.trim(), { type: 'song' });

  // Handle both search.songs.contents and direct contents arrays
  const contents = searchResults.songs?.contents || searchResults.contents || [];

  return contents.map((item) => {
    const id = item.id || '';
    const title = item.title || 'Unknown Title';
    
    // Extract artist name and artist browseId
    const firstArtist = Array.isArray(item.artists) && item.artists.length > 0 ? item.artists[0] : null;
    const artist = item.artists?.map((a) => a.name).filter(Boolean).join(', ') || item.author?.name || 'Unknown Artist';
    const artistId = firstArtist?.channel_id || firstArtist?.id || undefined;

    // Extract album
    const album = item.album?.name || (typeof item.album === 'string' ? item.album : undefined);

    // Extract duration in seconds
    let duration = 0;
    if (typeof item.duration?.seconds === 'number') {
      duration = item.duration.seconds;
    } else if (item.duration?.text) {
      const parts = item.duration.text.split(':').map(Number);
      if (parts.length === 2) duration = parts[0] * 60 + parts[1];
      else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    // High quality thumbnail
    const thumbnail = item.thumbnails?.slice(-1)[0]?.url
      || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');

    // Check if official release (official artist channel, topic, or verified badge)
    const isOfficial = Boolean(
      item.badges?.some?.((b) => b.label?.toLowerCase().includes('official') || b.style?.includes('OFFICIAL'))
      || item.is_explicit === false
      || (item.album?.name && item.artists?.length)
    );

    return {
      id,
      videoId: id,
      title,
      artist,
      artistId,
      album,
      duration,
      thumbnail,
      cover: thumbnail,
      isOfficial,
      type: 'song',
    };
  }).filter((track) => track.id && track.id.length >= 10);
}

/**
 * 2. resolveAudioStream(videoId: string)
 * Retrieves raw media streams via getBasicInfo/getInfo.
 * Picks optimal audio-only format using chooseFormat({ type: 'audio', quality: 'best' }).
 * Handles player cipher extraction to return a deciphered, direct streaming URL.
 */
export async function resolveAudioStream(videoId) {
  if (!videoId) throw new Error('videoId is required');

  const yt = await getInnertube();
  const info = await yt.getBasicInfo(videoId);

  const bestAudio = info.chooseFormat({ type: 'audio', quality: 'best' });
  if (!bestAudio) {
    throw new Error(`No audio format found for video: ${videoId}`);
  }

  // Handle player cipher extraction to return deciphered direct streaming URL
  let directStreamUrl = bestAudio.url;
  if (!directStreamUrl && (bestAudio.signature_cipher || bestAudio.cipher)) {
    directStreamUrl = await bestAudio.decipher(yt.session.player);
  }

  if (!directStreamUrl) {
    throw new Error('Failed to decipher audio stream URL');
  }

  return {
    streamUrl: directStreamUrl,
    bitrate: bestAudio.bitrate || 160000,
    mimeType: bestAudio.mime_type || 'audio/mp4',
    contentLength: bestAudio.content_length,
    itag: bestAudio.itag,
  };
}

/**
 * 3. getArtistDetails(browseId: string)
 * Fetches the artist's discography, top songs, and albums using yt.music.getArtist(browseId).
 * Maps and returns tracks with valid IDs and album metadata.
 */
export async function getArtistDetails(browseId) {
  if (!browseId) throw new Error('browseId is required');

  const yt = await getInnertube();
  const artist = await yt.music.getArtist(browseId);

  const name = artist.header?.title?.text || artist.name || 'Unknown Artist';
  const description = artist.header?.description?.text || '';
  const thumbnail = artist.header?.thumbnails?.slice(-1)[0]?.url
    || artist.thumbnails?.slice(-1)[0]?.url
    || '';

  // Extract top songs
  const topSongsSection = artist.sections?.find((s) => s.title?.text?.toLowerCase().includes('song') || s.type === 'MusicShelf')
    || artist.sections?.[0];

  const topSongs = (topSongsSection?.contents || []).map((s) => {
    let dur = 0;
    if (typeof s.duration?.seconds === 'number') {
      dur = s.duration.seconds;
    } else if (s.duration?.text) {
      const parts = s.duration.text.split(':').map(Number);
      if (parts.length === 2) dur = parts[0] * 60 + parts[1];
      else if (parts.length === 3) dur = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    const thumb = s.thumbnails?.slice(-1)[0]?.url || (s.id ? `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg` : '');

    return {
      id: s.id || '',
      videoId: s.id || '',
      title: s.title || 'Unknown Title',
      artist: name,
      artistId: browseId,
      album: s.album?.name || (typeof s.album === 'string' ? s.album : undefined),
      duration: dur,
      thumbnail: thumb,
      cover: thumb,
      isOfficial: true,
      type: 'song',
    };
  }).filter((s) => s.id);

  // Extract albums and singles discography
  const albumsSections = artist.sections?.filter((s) => {
    const t = s.title?.text?.toLowerCase() || '';
    return t.includes('album') || t.includes('single') || t.includes('release');
  }) || [];

  const albums = [];
  for (const sec of albumsSections) {
    for (const a of sec.contents || []) {
      const thumb = a.thumbnails?.slice(-1)[0]?.url || '';
      albums.push({
        id: a.id || '',
        title: a.title || 'Unknown Album',
        artist: name,
        artistId: browseId,
        year: a.year || '',
        thumbnail: thumb,
        cover: thumb,
        type: 'album',
      });
    }
  }

  return {
    id: browseId,
    name,
    description,
    thumbnail,
    topSongs,
    albums,
  };
}
