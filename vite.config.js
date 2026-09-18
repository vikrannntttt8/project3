import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Backend API Gateway Plugin:
 * Implements lightweight server routes using Vite middleware:
 * - GET /api/search?q=:query
 * - GET /api/stream/:id
 * - GET /api/artist/:id
 */
function innertubeApiPlugin() {
  return {
    name: 'innertube-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const pathname = parsedUrl.pathname;

        // ── 1. GET /api/search?q=:query ───────────────────────────────────
        // ── 1. GET /api/search?q=:query&type=:type ───────────────────────
        if (pathname === '/api/search' && req.method === 'GET') {
          try {
            const query = parsedUrl.searchParams.get('q') || parsedUrl.searchParams.get('query') || '';
            const type = parsedUrl.searchParams.get('type') || 'all';
            const { searchMusic } = await import('./src/services/innertube.js');
            const results = await searchMusic(query, type);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify(results));
            return;
          } catch (err) {
            console.error('[API /api/search] Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        // ── 1b. GET /api/album/:id ────────────────────────────────────────
        if (pathname.startsWith('/api/album/') && req.method === 'GET') {
          const browseId = pathname.replace('/api/album/', '').split('?')[0];
          try {
            const { getAlbumDetails } = await import('./src/services/innertube.js');
            const albumData = await getAlbumDetails(browseId);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify(albumData));
            return;
          } catch (err) {
            console.error('[API /api/album] Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        // ── 2. GET /api/stream/:id ────────────────────────────────────────
        if (pathname.startsWith('/api/stream/') && req.method === 'GET') {
          const videoId = pathname.replace('/api/stream/', '').split('?')[0];
          try {
            const { resolveAudioStream } = await import('./src/services/innertube.js');
            const streamInfo = await resolveAudioStream(videoId);

            // If JSON requested via query param or Accept header
            if (parsedUrl.searchParams.get('format') === 'json' || req.headers.accept?.includes('application/json')) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.statusCode = 200;
              res.end(JSON.stringify(streamInfo));
              return;
            }

            // Pipe audio stream directly with Range support
            const headers = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
              'Referer': 'https://music.youtube.com/',
              'Origin': 'https://music.youtube.com',
            };

            if (req.headers.range) {
              headers['Range'] = req.headers.range;
            }

            const streamRes = await fetch(streamInfo.streamUrl, { headers });

            res.statusCode = streamRes.status;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', streamRes.headers.get('content-type') || 'audio/mp4');
            res.setHeader('Accept-Ranges', 'bytes');

            if (streamRes.headers.has('content-length')) {
              res.setHeader('Content-Length', streamRes.headers.get('content-length'));
            }
            if (streamRes.headers.has('content-range')) {
              res.setHeader('Content-Range', streamRes.headers.get('content-range'));
            }

            if (!streamRes.body) {
              res.end();
              return;
            }

            // Pipe ReadableStream to Node HTTP response
            const reader = streamRes.body.getReader();
            const pump = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  if (!res.write(value)) {
                    await new Promise((resolve) => res.once('drain', resolve));
                  }
                }
                res.end();
              } catch (e) {
                res.destroy(e);
              }
            };
            pump();
            return;
          } catch (err) {
            console.error('[API /api/stream] Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        // ── 3. GET /api/artist/:id ────────────────────────────────────────
        if (pathname.startsWith('/api/artist/') && req.method === 'GET') {
          const browseId = pathname.replace('/api/artist/', '').split('?')[0];
          try {
            const { getArtistDetails } = await import('./src/services/innertube.js');
            const artistData = await getArtistDetails(browseId);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify(artistData));
            return;
          } catch (err) {
            console.error('[API /api/artist] Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), innertubeApiPlugin()],
  server: {
    proxy: {
      '/api/saavn': {
        target: 'https://saavn.dev/api',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/saavn/, ''),
      },
      '/api/jiosaavn': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/jiosaavn/, ''),
      },
      '/api/yt': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/yt/, ''),
      },
    },
  },
});
