# Pulse — Architecture & Concepts Guide

> Complete learning guide for the Pulse music web app.
> Every major design decision, algorithm, and API integration explained.

---

## Table of Contents
1. [App Architecture & Directory Layout](#1-app-architecture--directory-layout)
2. [Stitch UI → Tailwind CSS Translation](#2-stitch-ui--tailwind-css-translation)
3. [Audio Playback & State Flow (useRef Audio Engine)](#3-audio-playback--state-flow)
4. [LRC Timestamp Syncing Algorithm](#4-lrc-timestamp-syncing-algorithm)
5. [Saavn.dev API Integration](#5-saavndev-api-integration)
6. [Playlist & Library State Engine (localStorage)](#6-playlist--library-state-engine)

---

## 1. App Architecture & Directory Layout

```
PULSE MUSIC/
├── index.html
├── vite.config.js                # No proxy needed — Saavn.dev is CORS-open
├── tailwind.config.js            # Nordic Nocturne tokens from Stitch
├── ARCHITECTURE_AND_CONCEPTS.md
│
└── src/
    ├── main.jsx
    ├── App.jsx                   # View router: home | lyrics | library
    ├── index.css                 # glass-dock, glass-card, lyric-active-glow
    │
    ├── context/
    │   └── PlayerContext.jsx     # Single Audio() instance + all state
    │
    ├── hooks/
    │   ├── useLrcSync.js         # LRC parse → active line index
    │   ├── useMusicSearch.js     # Debounced 5-tab Saavn search
    │   └── useLibrary.js         # localStorage CRUD for playlists + liked
    │
    ├── utils/
    │   ├── saavn.js              # Saavn.dev API wrapper (all endpoints)
    │   ├── lrcParser.js          # parseLrc(), getActiveLyricIndex()
    │   └── timeFormat.js         # formatTime(seconds) → "MM:SS"
    │
    └── components/
        ├── Sidebar.jsx
        ├── HomeView/
        │   ├── HomeView.jsx      # Search tabs + result renderers + default home
        │   ├── SearchBar.jsx
        │   ├── SongRow.jsx       # Playable track row with like/add-to-playlist
        │   ├── AlbumCard.jsx     # Album/Playlist card grid item
        │   └── ArtistCard.jsx    # Circular artist avatar card
        ├── LyricsView/
        │   ├── LyricsView.jsx
        │   ├── AlbumArtPanel.jsx
        │   └── LyricsPanel.jsx   # Karaoke scroll + click-to-seek
        ├── LibraryView/
        │   └── LibraryView.jsx   # Playlist CRUD + liked tracks view
        ├── PlayerDock/
        │   ├── PlayerDock.jsx    # Persistent glass dock — fully wired
        │   ├── SeekBar.jsx
        │   └── VolumeSlider.jsx
        └── shared/
            └── AddToPlaylistMenu.jsx  # Modal: pick/create playlist for a song
```

---

## 2. Stitch UI → Tailwind CSS Translation

### Nordic Nocturne Color Tokens

| Stitch Design Token | Hex | CSS Utility |
|---|---|---|
| Background canvas | `#09090B` | `bg-[#09090B]` |
| Primary (Electric Violet) | `#d0bcff` | `text-primary` |
| Brand Violet (accent) | `#8B5CF6` | `text-brand-violet` |
| Brand Pink | `#EC4899` | `text-brand-pink` |
| Brand Cyan | `#06B6D4` | `text-brand-cyan` |
| Surface low | `#1c1b1d` | `bg-surface-low` |

### Glassmorphism CSS Classes

```css
/* Glass Dock — Stitch Level 3 Elevation */
.glass-dock {
  background: rgba(18, 18, 21, 0.65);
  backdrop-filter: blur(40px) saturate(1.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.6),
    0 0 48px -12px rgba(139, 92, 246, 0.2); /* violet subsurface glow */
}
```

### Active Lyric Glow
```css
.lyric-active-glow {
  text-shadow:
    0 0 35px rgba(236, 72, 153, 0.45), /* neon pink bloom */
    0 0 15px rgba(255, 255, 255, 0.25); /* inner shimmer */
}
```

---

## 3. Audio Playback & State Flow

### Why `useRef(new Audio())` instead of `<audio>` element?

```javascript
// PlayerContext.jsx
const audioRef = useRef(null);
if (!audioRef.current) {
  audioRef.current = new Audio();
}
```

**Key reasons:**
1. `useRef` holds a mutable value that **never triggers re-renders** when changed
2. `new Audio()` creates a persistent browser audio engine — one instance for the app's lifetime
3. Unlike `<audio>` in JSX, it doesn't get recreated on state changes, preventing playback interruptions
4. Event listeners attached once on mount stay active forever without re-registration

### Event Wiring Pattern

```javascript
useEffect(() => {
  const audio = audioRef.current;
  const onTimeUpdate = () => setCurrentTime(audio.currentTime);
  // ↑ Fires ~4x/sec → drives seekbar + active lyric line

  audio.addEventListener('timeupdate', onTimeUpdate);
  // Cleanup prevents memory leaks if component unmounts:
  return () => audio.removeEventListener('timeupdate', onTimeUpdate);
}, []); // Empty deps = runs once on mount only
```

### loadSong() — Complete Flow

```
User clicks SongRow/AlbumCard/ArtistCard
     │
     ▼
loadSong(song, queue, index)
     │
     ├─ audio.pause()            // stop current
     ├─ audio.src = streamUrl    // set new Saavn 320kbps MP3 URL
     ├─ audio.load()             // reset decoder buffer
     ├─ audio.play()             // begin playback
     │      │ (browser fetches audio stream from Saavn CDN)
     │      ▼
     │  'play' event fires → setIsPlaying(true)
     │  'durationchange' fires → setDuration(n)
     │  'timeupdate' fires ~4x/sec → setCurrentTime(n)
     │
     └─ fetchSongLyrics(id, title, artist)  [async, non-blocking]
            │
            ├─ Try saavn.dev /songs/{id}/lyrics
            ├─ Try lrclib.net synced LRC
            └─ Fallback: DEMO_LRC
            │
            ▼
       setLrcString(lrc) → useLrcSync re-parses → LyricsPanel updates
```

### Queue Navigation

```javascript
const playNext = () => {
  const nextIndex = (queueIndex + 1) % queue.length; // wraps around
  loadSong(queue[nextIndex], null, nextIndex);
};

const playPrev = () => {
  const audio = audioRef.current;
  if (audio.currentTime > 3) {
    audio.currentTime = 0; // restart current if > 3s played
    return;
  }
  const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
  loadSong(queue[prevIndex], null, prevIndex);
};
```

---

## 4. LRC Timestamp Syncing Algorithm

### Regex Parser

```javascript
// [01:23.45] lyric text
const LRC_LINE_REGEX = /\[(\d{1,3}):(\d{2}(?:\.\d+)?)\](.*)/;

// \[         — literal [
// (\d{1,3})  — MINUTES capture (1-3 digits)
// :          — colon separator
// (\d{2}     — SECONDS (always 2 digits)
//  (?:\.\d+)?) — optional .milliseconds
// \]         — literal ]
// (.*)       — lyric text (rest of line)

const match = LRC_LINE_REGEX.exec('[01:23.45] Hello World');
// match[1] = "01" → 1 minute
// match[2] = "23.45" → 23.45 seconds
// match[3] = " Hello World"

const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
// = 1 * 60 + 23.45 = 83.45 seconds
```

### Active Line Detection

```javascript
export function getActiveLyricIndex(lines, currentTime) {
  // Lines are sorted by timestamp.
  // Active = last line whose time <= currentTime.
  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) activeIndex = i;
    else break; // sorted — stop early
  }
  return activeIndex;
}
// O(n) — fast enough for 200-line LRC files (<0.1ms per call)
```

### Click-to-Seek

```jsx
<p onClick={() => seek(line.time)}>{line.text}</p>
// seek(83.45) → audio.currentTime = 83.45
// → 'timeupdate' fires → currentTime state updates
// → getActiveLyricIndex runs → activeIndex updates → lyric highlights
```

---

## 5. Saavn.dev API Integration

**Base URL:** `https://saavn.dev/api`  
**Auth:** None required  
**CORS:** Open — works directly from browser  
**Stream format:** 320kbps MP3 (last item in `downloadUrl` array)

### Endpoint Reference

| Endpoint | Purpose | Key Response Fields |
|---|---|---|
| `GET /search/all?query=` | Multi-category results | `data.{songs,albums,artists,playlists}.results[]` |
| `GET /search/songs?query=` | Songs only | `data.results[].{name, artists, image, downloadUrl, duration}` |
| `GET /search/albums?query=` | Albums | `data.results[].{name, artists, image, songCount}` |
| `GET /search/artists?query=` | Artists | `data.results[].{name, image, followerCount}` |
| `GET /search/playlists?query=` | Playlists | `data.results[].{name, image, songCount}` |
| `GET /albums?id=` | Album tracklist | `data.songs[]` |
| `GET /artists/{id}/songs` | Artist top songs | `data.songs.results[]` |
| `GET /playlists?id=` | Playlist tracks | `data.songs[]` |
| `GET /songs/{id}/lyrics` | Song lyrics (plain) | `data.lyrics` |

### Image & Stream Extraction

```javascript
// Image: last item in array = highest resolution (500×500)
function bestImage(arr) {
  return arr[arr.length - 1]?.url || '';
}

// Stream: last item = 320kbps MP3
function bestStream(arr) {
  return arr[arr.length - 1]?.url || '';
}

// Usage:
const song = {
  thumbnail: bestImage(rawSong.image),      // 500x500 JPG
  streamUrl: bestStream(rawSong.downloadUrl) // 320kbps MP3
};

// Plug into Audio:
audio.src = song.streamUrl;
audio.play();
```

### Search Tab Architecture

```
User types in SearchBar
        │ (350ms debounce via useMusicSearch)
        ▼
Tab: "all"       → searchAll()      → { songs[], albums[], artists[], playlists[] }
Tab: "songs"     → searchSongs()    → Song[]
Tab: "albums"    → searchAlbums()   → Album[]
Tab: "artists"   → searchArtists()  → Artist[]
Tab: "playlists" → searchPlaylists() → Playlist[]

Clicking tab → switchTab(tab) → re-runs search for current query with new endpoint
```

---

## 6. Playlist & Library State Engine

### localStorage Schema

```javascript
// Key: "pulse_liked_songs" → Song[]
// Key: "pulse_playlists"   → Playlist[]

// Playlist shape:
{
  id:          "pl_1726667000000",  // Date.now() based unique ID
  title:       "My Playlist",
  description: "",
  createdAt:   1726667000000,
  songs:       [Song, Song, ...],   // full song objects stored inline
  thumbnail:   "https://..."        // auto-set from first song
}
```

### CRUD Operations

```javascript
// CREATE
const createPlaylist = (title) => {
  const playlist = { id: `pl_${Date.now()}`, title, songs: [], thumbnail: '' };
  setPlaylists(prev => [playlist, ...prev]);
  return playlist.id; // return id so caller can immediately add songs
};

// ADD SONG (deduplication built-in)
const addToPlaylist = (playlistId, song) => {
  setPlaylists(prev => prev.map(p => {
    if (p.id !== playlistId) return p;
    if (p.songs.some(s => s.id === song.id)) return p; // already present
    return { ...p, songs: [...p.songs, song], thumbnail: p.thumbnail || song.thumbnail };
  }));
};

// REMOVE SONG
const removeFromPlaylist = (playlistId, songId) => {
  setPlaylists(prev => prev.map(p =>
    p.id !== playlistId ? p : { ...p, songs: p.songs.filter(s => s.id !== songId) }
  ));
};

// DELETE PLAYLIST
const deletePlaylist = (id) => {
  setPlaylists(prev => prev.filter(p => p.id !== id));
};
```

### Persistence Pattern

```javascript
// useLibrary.js — auto-sync to localStorage on every state change
useEffect(() => {
  localStorage.setItem('pulse_playlists', JSON.stringify(playlists));
}, [playlists]); // runs whenever playlists changes

// Initial load from localStorage
const [playlists, setPlaylists] = useState(() => {
  try { return JSON.parse(localStorage.getItem('pulse_playlists')) || []; }
  catch { return []; }
});
// ↑ Lazy initializer (function form) — runs ONCE on mount, not every render
```

### Why Store Full Song Objects?

Storing the complete song object (including `streamUrl`) means:
- Playlists work **offline** after first load — no re-fetch needed
- `playCollection(playlist.songs)` works instantly without additional API calls
- Trade-off: more localStorage space used, but typical song object is ~300 bytes

---

*Built by Vikrant · Pulse Music App · Saavn.dev + lrclib.net + Nordic Nocturne Design System*
