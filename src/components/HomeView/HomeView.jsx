import { useState, useCallback } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { useMusicSearch, SEARCH_TABS } from '../../hooks/useMusicSearch.js';
import { getAlbumSongs, getArtistSongs, getPlaylistSongs, searchSongs as saavnSearchSongs } from '../../utils/saavn.js';
import SearchBar      from './SearchBar.jsx';
import SongRow        from './SongRow.jsx';
import AlbumCard      from './AlbumCard.jsx';
import ArtistCard     from './ArtistCard.jsx';
import AddToPlaylistMenu from '../shared/AddToPlaylistMenu.jsx';
import Search         from '../Search.jsx';
import ArtistModal    from '../ArtistView/ArtistModal.jsx';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const TAB_LABELS = {
  all: 'All', songs: 'Songs', albums: 'Albums', artists: 'Artists', playlists: 'Playlists',
};

export default function HomeView() {
  const { loadSong, playCollection, currentSong, isPlaying, togglePlay } = usePlayer();
  const { query, results, loading, error, activeTab, search, switchTab, clear } = useMusicSearch();

  const [addMenuSong, setAddMenuSong]   = useState(null); // song to add to playlist
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null); // { artistName, artistId }

  // ── Play handlers ─────────────────────────────────────────────────

  const handlePlaySong = useCallback((song, songList = null) => {
    if (currentSong?.id === song.id) { togglePlay(); return; }
    const queue = songList || (results && activeTab === 'songs' ? results : null) || [song];
    const idx   = queue.findIndex(s => s.id === song.id);
    loadSong(song, queue, idx >= 0 ? idx : 0);
  }, [currentSong, togglePlay, loadSong, results, activeTab]);

  const handleAlbumClick = useCallback(async (album) => {
    setDetailLoading(true);
    try {
      const data = await getAlbumSongs(album.id);
      if (data.songs.length) playCollection(data.songs, 0);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  }, [playCollection]);

  const handleArtistClick = useCallback((artist) => {
    setSelectedArtist({
      artistName: artist.title || artist.name,
      artistId: artist.id || artist.browseId,
    });
  }, []);

  const handlePlaylistClick = useCallback(async (playlist) => {
    setDetailLoading(true);
    try {
      const data = await getPlaylistSongs(playlist.id);
      if (data.songs.length) playCollection(data.songs, 0);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  }, [playCollection]);

  // ── Render results by tab ─────────────────────────────────────────

  const renderResults = () => {
    if (!results) return null;
    if (loading) return <SearchSkeleton />;
    if (error)   return <ErrorMsg msg={error} onRetry={() => search(query)} />;

    if (activeTab === 'all') {
      const { songs = [], albums = [], artists = [], playlists = [] } = results;
      return (
        <div className="flex flex-col gap-8">
          {songs.length > 0 && (
            <ResultSection title="Songs" icon="music_note">
              {songs.slice(0, 5).map((s, i) => (
                <SongRow key={s.id} song={s} index={i}
                  isActive={currentSong?.id === s.id}
                  isPlaying={currentSong?.id === s.id && isPlaying}
                  onPlay={() => handlePlaySong(s, songs)}
                  onAddToPlaylist={() => setAddMenuSong(s)} />
              ))}
            </ResultSection>
          )}
          {albums.length > 0 && (
            <ResultSection title="Albums" icon="album">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {albums.slice(0, 5).map(a => (
                  <AlbumCard key={a.id} item={a} onClick={() => handleAlbumClick(a)} />
                ))}
              </div>
            </ResultSection>
          )}
          {artists.length > 0 && (
            <ResultSection title="Artists" icon="person">
              <div className="flex flex-wrap gap-4">
                {artists.slice(0, 6).map(a => (
                  <ArtistCard key={a.id} artist={a} onClick={() => handleArtistClick(a)} />
                ))}
              </div>
            </ResultSection>
          )}
          {playlists.length > 0 && (
            <ResultSection title="Playlists" icon="queue_music">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {playlists.slice(0, 5).map(p => (
                  <AlbumCard key={p.id} item={p} onClick={() => handlePlaylistClick(p)} />
                ))}
              </div>
            </ResultSection>
          )}
          {!songs.length && !albums.length && !artists.length && !playlists.length && (
            <NoResults query={query} />
          )}
        </div>
      );
    }

    if (activeTab === 'songs') {
      const songs = Array.isArray(results) ? results : [];
      if (!songs.length) return <NoResults query={query} />;
      return (
        <div className="flex flex-col gap-1">
          {songs.map((s, i) => (
            <SongRow key={s.id} song={s} index={i}
              isActive={currentSong?.id === s.id}
              isPlaying={currentSong?.id === s.id && isPlaying}
              onPlay={() => handlePlaySong(s, songs)}
              onAddToPlaylist={() => setAddMenuSong(s)} />
          ))}
        </div>
      );
    }

    if (activeTab === 'albums') {
      const items = Array.isArray(results) ? results : [];
      if (!items.length) return <NoResults query={query} />;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map(a => (
            <AlbumCard key={a.id} item={a} onClick={() => handleAlbumClick(a)} />
          ))}
        </div>
      );
    }

    if (activeTab === 'artists') {
      const items = Array.isArray(results) ? results : [];
      if (!items.length) return <NoResults query={query} />;
      return (
        <div className="flex flex-wrap gap-5">
          {items.map(a => (
            <ArtistCard key={a.id} artist={a} onClick={() => handleArtistClick(a)} />
          ))}
        </div>
      );
    }

    if (activeTab === 'playlists') {
      const items = Array.isArray(results) ? results : [];
      if (!items.length) return <NoResults query={query} />;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map(p => (
            <AlbumCard key={p.id} item={p} onClick={() => handlePlaylistClick(p)} />
          ))}
        </div>
      );
    }

    return null;
  };

  const showSearch = query.trim().length > 0;

  return (
    <div className="h-full flex flex-col overflow-y-auto relative">
      {/* Detail loading overlay */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl p-6 flex items-center gap-4">
            <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin" />
            <span className="text-body-lg text-white">Loading tracks…</span>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 px-4 sm:px-6 md:px-8 py-4 bg-[#09090B]/80 backdrop-blur-xl border-b border-white/5 pl-14 md:pl-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-col">
            <p className="text-label-sm uppercase tracking-widest text-on-surface-variant text-[11px] sm:text-[12px]">
              {showSearch ? `Results for "${query}"` : 'Pulse · Spatial Studio'}
            </p>
            <h1 className="text-headline-md sm:text-headline-lg font-bold text-white tracking-tight">
              {showSearch ? 'Search Results' : `${getGreeting()}, Vikrant`}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-initial justify-end">
            <SearchBar
              query={query}
              onChange={search}
              onClear={clear}
            />
          </div>
        </div>

        {/* ── Search Tabs ─────────────────────────────────────── */}
        {showSearch && (
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
            {SEARCH_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-label-md font-medium whitespace-nowrap transition-all text-[13px] sm:text-[14px] ${
                  activeTab === tab
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/8 text-on-surface-variant hover:bg-white/12 hover:text-white'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-5 sm:py-6 pb-36">
        {showSearch
          ? renderResults()
          : (
            <HomeDefault
              onPlaySong={handlePlaySong}
              onArtistClick={(artistName, artistId) => setSelectedArtist({ artistName, artistId })}
            />
          )
        }
      </main>

      {/* ── Dedicated Artist Discography Modal ──────────────── */}
      {selectedArtist && (
        <ArtistModal
          artistId={selectedArtist.artistId}
          artistName={selectedArtist.artistName}
          onClose={() => setSelectedArtist(null)}
          onSelectTrack={(track) => {
            handlePlaySong(track);
            setSelectedArtist(null);
          }}
        />
      )}

      {/* ── Add to Playlist menu overlay ────────────────────── */}
      {addMenuSong && (
        <AddToPlaylistMenu
          song={addMenuSong}
          onClose={() => setAddMenuSong(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function ResultSection({ title, icon, children }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#d0bcff] text-[20px]">{icon}</span>
        <h2 className="text-headline-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-white/5" />
      ))}
    </div>
  );
}

function ErrorMsg({ msg, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="material-symbols-outlined text-[48px] text-brand-pink/60">cloud_off</span>
      <p className="text-headline-sm text-white font-semibold">Search encountered an issue</p>
      <p className="text-body-md text-outline max-w-md">{msg || 'Unable to reach music endpoints. Please try again.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-label-md transition-colors mt-2">
          Retry Search
        </button>
      )}
    </div>
  );
}

function NoResults({ query }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <span className="material-symbols-outlined text-[48px] text-on-surface-variant">search_off</span>
      <p className="text-headline-sm text-on-surface-variant">No results found for "{query}"</p>
      <p className="text-body-md text-outline">Try searching for a song title, artist, or album</p>
    </div>
  );
}

// ── Default home content when not searching ───────────────────────────
const FEATURED = [
  { id: 'f1', title: 'Arijit Singh Hits',    subtitle: 'Top Bollywood',    gradient: 'from-rose-900 to-orange-900',   query: 'arijit singh' },
  { id: 'f2', title: 'Midnight Lofi',        subtitle: 'Chill Focus Mix',  gradient: 'from-indigo-900 to-violet-900', query: 'lofi chill' },
  { id: 'f3', title: 'Punjabi Bangers',      subtitle: 'Party Hits',       gradient: 'from-yellow-900 to-red-900',    query: 'punjabi hits' },
  { id: 'f4', title: 'Romantic Melodies',    subtitle: 'Evergreen Love',   gradient: 'from-pink-900 to-fuchsia-900',  query: 'romantic hindi' },
  { id: 'f5', title: 'English Top Charts',   subtitle: 'Global Hits',      gradient: 'from-teal-900 to-cyan-900',     query: 'top english hits' },
];

function HomeDefault({ onPlaySong, onArtistClick }) {
  const { loadSong } = usePlayer();
  const [loadingId, setLoadingId] = useState(null);

  const playSuggestion = async (query, cardId) => {
    setLoadingId(cardId);
    try {
      const songs = await saavnSearchSongs(query, 5);
      if (songs.length) loadSong(songs[0], songs, 0);
    } catch (e) { console.error(e); }
    finally { setLoadingId(null); }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── Fast Innertube Search Experience ── */}
      <section className="w-full">
        <Search
          onSelectTrack={(track) => onPlaySong(track)}
          onArtistClick={(artistName, artistId) => onArtistClick?.(artistName, artistId)}
        />
      </section>

      {/* Now playing album art */}
      <NowPlayingHero />

      {/* Featured grid */}
      <section className="flex flex-col gap-3">
        <h2 className="text-headline-sm font-semibold text-white">Featured Stations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {FEATURED.map(f => (
            <button
              key={f.id}
              onClick={() => playSuggestion(f.query, f.id)}
              className={`group relative h-28 rounded-xl bg-gradient-to-br ${f.gradient} overflow-hidden hover:scale-[1.02] transition-transform duration-300`}
            >
              {loadingId === f.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute bottom-3 left-3 text-left">
                <p className="text-label-lg font-bold text-white">{f.title}</p>
                <p className="text-label-sm text-white/70">{f.subtitle}</p>
              </div>
              <span className="material-symbols-outlined text-white/0 group-hover:text-white/80 absolute top-3 right-3 text-[28px] transition-colors" style={{fontVariationSettings:"'FILL' 1"}}>play_circle</span>
            </button>
          ))}
        </div>
      </section>

      <TipBanner />
    </div>
  );
}

function NowPlayingHero() {
  const { currentSong, isPlaying, togglePlay, isLiked, toggleLike } = usePlayer();
  if (!currentSong) return (
    <div className="w-full h-36 rounded-2xl glass-card border border-white/5 flex items-center justify-center gap-4">
      <span className="material-symbols-outlined text-[48px] text-white/10">music_note</span>
      <div>
        <p className="text-headline-sm font-semibold text-on-surface-variant">Nothing playing</p>
        <p className="text-body-md text-outline">Search for a song or click a station above</p>
      </div>
    </div>
  );

  const liked = isLiked(currentSong.id);

  return (
    <div className="w-full rounded-2xl glass-card border border-white/5 p-4 flex items-center gap-4">
      <div className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ${isPlaying ? 'ring-2 ring-brand-violet' : ''}`}>
        <img src={currentSong.thumbnail} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Now Playing</p>
        <h2 className="text-headline-sm font-bold text-white truncate">{currentSong.title}</h2>
        <p className="text-body-md text-on-surface-variant">{currentSong.artist}</p>
      </div>
      <button
        onClick={() => toggleLike(currentSong)}
        className={`p-2 rounded-full transition-transform active:scale-90 ${
          liked ? 'text-brand-pink' : 'text-on-surface-variant hover:text-brand-pink'
        }`}
        title={liked ? 'Unlike' : 'Like'}
      >
        <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings:`'FILL' ${liked ? 1 : 0}`}}>
          favorite
        </span>
      </button>
      <button
        onClick={togglePlay}
        className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg flex-shrink-0"
      >
        <span className="material-symbols-outlined text-[24px] text-black" style={{fontVariationSettings:"'FILL' 1"}}>
          {isPlaying ? 'pause' : 'play_arrow'}
        </span>
      </button>
    </div>
  );
}

function TipBanner() {
  return (
    <div className="w-full rounded-xl bg-gradient-to-r from-brand-violet/10 to-brand-pink/10 border border-brand-violet/20 p-4 flex items-center gap-3">
      <span className="material-symbols-outlined text-[#d0bcff] text-[24px]">tips_and_updates</span>
      <p className="text-body-md text-on-surface-variant">
        <span className="text-white font-semibold">Tip:</span> Search any song, album, or artist. Click album/artist cards to load their full tracklist. Use <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white text-label-sm">+</kbd> on any song to save it to your playlist.
      </p>
    </div>
  );
}
