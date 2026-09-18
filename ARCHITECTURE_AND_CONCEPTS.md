# Pulse — Architecture & Concepts Guide

> A comprehensive learning guide for the Pulse music web app.
> This document explains every major design decision, algorithm, and integration.

---

## Table of Contents
1. [App Architecture & Directory Layout](#1-app-architecture--directory-layout)
2. [Stitch UI → Tailwind CSS Translation](#2-stitch-ui--tailwind-css-translation)
3. [Audio Playback & State Flow](#3-audio-playback--state-flow)
4. [LRC Timestamp Syncing Algorithm](#4-lrc-timestamp-syncing-algorithm)
5. [API Integration Breakdown (Innertube Stack)](#5-api-integration-breakdown-innertube-stack)

---

## 1. App Architecture & Directory Layout

```
PULSE MUSIC/
├── index.html                    # HTML shell — dark class, Material Symbols CDN
├── vite.config.js                # Vite + CORS proxy for Piped API / lrclib
├── tailwind.config.js            # Nordic Nocturne design tokens from Stitch
├── ARCHITECTURE_AND_CONCEPTS.md  # This file
│
└── src/
    ├── main.jsx                  # React entry — mounts <App> into #root
    ├── App.jsx                   # Root shell: sidebar + view switching + dock
    ├── index.css                 # Global CSS: glass utilities, lyric glow, range inputs
    │
    ├── context/
    │   └── PlayerContext.jsx     # Global audio state: single source of truth
    │
    ├── hooks/
    │   ├── useAudioPlayer.js     # (Logic embedded in PlayerContext)
    │   ├── useLrcSync.js         # LRC parse + active line detection
    │   └── useMusicSearch.js     # Debounced search + stream resolution
    │
    ├── utils/
    │   ├── lrcParser.js          # Pure functions: parseLrc(), getActiveLyricIndex()
    │   ├── innertube.js          # API layer: searchSongs(), getSongStream(), fetchLyrics()
    │   └── timeFormat.js         # formatTime(seconds) → "MM:SS"
    │
    └── components/
        ├── Sidebar.jsx           # Left nav: Home, Search, Library, Playlists
        ├── HomeView/
        │   ├── HomeView.jsx      # Main home layout: greeting, art, recs, queue
        │   ├── SearchBar.jsx     # Capsule input with focus glow
        │   ├── QuickReplayRow.jsx # Horizontal recent tracks
        │   └── RecommendationCard.jsx # Featured mix card
        ├── LyricsView/
        │   ├── LyricsView.jsx    # 2-column fullscreen lyrics container
        │   ├── AlbumArtPanel.jsx # Left col: art + controls + seek
        │   └── LyricsPanel.jsx   # Right col: auto-scroll karaoke
        └── PlayerDock/
            ├── PlayerDock.jsx    # Fixed glass bottom dock
            ├── SeekBar.jsx       # Gradient seek scrubber
            └── VolumeSlider.jsx  # Volume with mute toggle
```

### Why This Structure?

| Principle | How Applied |
|---|---|
| **Single Responsibility** | Each component does one thing: `LyricsPanel` only renders lyrics, `SeekBar` only handles scrubbing |
| **Separation of Concerns** | API logic lives in `utils/`, React state in `context/`, UI in `components/` |
| **Single Audio Element** | One `<audio>` ref in `PlayerContext` — prevents multiple simultaneous streams |
| **Context over Prop Drilling** | Any component can call `usePlayer()` without chaining props through 5 levels |

---

## 2. Stitch UI → Tailwind CSS Translation

The design system from Stitch ("Nordic Nocturne") was mapped to Tailwind config exactly:

### Color Token Mapping

| Stitch Token | Hex Value | Tailwind Class | Usage |
|---|---|---|---|
| `background` | `#131315` | `bg-background` | Page canvas |
| Canvas base | `#09090B` | `bg-[#09090B]` | OLED black void |
| `primary` | `#d0bcff` (Electric Violet) | `text-primary` | Active states, badges |
| `secondary` | `#ffb0cd` (Neon Pink) | `text-secondary` | Lyrics glow, favorites |
| `tertiary` | `#4cd7f6` (Electric Cyan) | `text-tertiary` | Spatial badges, live dots |
| Brand Violet | `#8B5CF6` | `text-brand-violet` | Seek fill, focus glows |
| Brand Pink | `#EC4899` | `text-brand-pink` | Heart buttons, lyric active |
| Brand Cyan | `#06B6D4` | `text-brand-cyan` | Audio quality badges |

### Glassmorphism — Stitch Elevation Levels

The Stitch design system defines 4 elevation levels, all implemented as CSS utility classes:

```css
/* Level 1: Cards */
.glass-card {
  background: rgba(18, 18, 21, 0.40);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Level 2: Panels / Modals */
.glass-panel {
  background: rgba(24, 24, 28, 0.70);
  backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
}

/* Level 3: Floating Dock (highest) */
.glass-dock {
  background: rgba(18, 18, 21, 0.65);
  backdrop-filter: blur(40px) saturate(1.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.6),       /* depth shadow */
    0 0 48px -12px rgba(139, 92, 246, 0.2); /* violet subsurface glow */
}
```

**Key insight:** Glassmorphism in this design does NOT use `box-shadow: drop-shadow`. Instead it uses:
- `backdrop-filter: blur()` — frosted glass effect on content behind it
- `saturate(1.8)` — intensifies colors seen through the glass
- `rgba()` borders — hairline "rim light" to define the glass edge

### Active Lyric Glow

```css
.lyric-active-glow {
  text-shadow:
    0 0 35px rgba(236, 72, 153, 0.45),  /* neon pink outer glow */
    0 0 15px rgba(255, 255, 255, 0.25); /* inner white shimmer */
}
```

This creates the "singing line" effect matching Stitch's spec: `text-shadow: 0 0 35px rgba(192,38,211,0.4)`.

### Seek Bar Gradient

```css
.seek-fill {
  background: linear-gradient(90deg, #8B5CF6, #EC4899);
}
```

From Stitch Component spec: *"track fill illuminated with linear gradient (#8B5CF6 to #EC4899)"*.

---

## 3. Audio Playback & State Flow

The core audio engine is a single native `<audio>` element managed by `PlayerContext`.

### The State Machine

```
┌─────────────────────────────────────────────┐
│               PlayerContext                 │
│                                             │
│  audioRef ──► <audio> element (hidden)      │
│                                             │
│  State:                                     │
│   isPlaying   ◄── 'play' / 'pause' events  │
│   currentTime ◄── 'timeupdate' event        │
│   duration    ◄── 'durationchange' event    │
│   volume      ◄── changeVolume() action     │
│   currentSong ◄── loadSong() action         │
│   lrcString   ◄── fetchLyrics() async       │
│   view        ◄── toggleView() action       │
└─────────────────────────────────────────────┘
```

### How Events Wire Up

```javascript
// In PlayerContext useEffect:
const onTimeUpdate = () => setCurrentTime(audio.currentTime);
// ↑ Called ~4x per second by the browser automatically
// This drives the seek bar position AND the active lyric line

audio.addEventListener('timeupdate', onTimeUpdate);
// Cleanup is critical to prevent memory leaks:
return () => audio.removeEventListener('timeupdate', onTimeUpdate);
```

### loadSong() Flow

```
User clicks a search result
        │
        ▼
useMusicSearch.getStreamDetails(videoId)
        │ calls Piped API → /streams/{videoId}
        │ returns { streamUrl, title, artist, thumbnail, duration }
        ▼
PlayerContext.loadSong(song)
        │
        ├─ audio.pause()           // stop current
        ├─ audio.src = streamUrl   // set new source
        ├─ audio.load()            // reset decoder
        ├─ audio.play()            // start playback
        │
        └─ fetchLyrics(title, artist) // async, non-blocking
                │
                ├─ lrclib.net API search
                ├─ returns syncedLyrics (LRC format)
                └─ setLrcString(lrc) → triggers useLrcSync re-parse
```

### seek() Implementation

```javascript
const seek = useCallback((time) => {
  const audio = audioRef.current;
  // Clamp to valid range — prevents NaN or out-of-bounds
  audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
  // The 'timeupdate' event fires automatically after this assignment,
  // updating currentTime state and re-running the active lyric check.
}, []);
```

---

## 4. LRC Timestamp Syncing Algorithm

LRC (Lyric) format stores synchronized lyrics as:
```
[00:16.00] Drowning in the neon waves of timeless reverie
[01:00.00] Rise above the static and the noise
```

### Step 1: Parse with Regex

```javascript
// lrcParser.js
const LRC_LINE_REGEX = /\[(\d{1,3}):(\d{2}(?:\.\d+)?)\](.*)/;

// Breakdown:
// \[          — literal opening bracket
// (\d{1,3})   — capture group 1: MINUTES (1-3 digits, e.g. "01" or "1")
// :           — literal colon separator
// (\d{2}      — capture group 2: SECONDS (always 2 digits)
//   (?:\.\d+)?) — optional decimal milliseconds, e.g. ".45"
// \]          — literal closing bracket
// (.*)        — capture group 3: lyric text (rest of line)

export function parseLrc(lrcString) {
  return lrcString.split('\n')
    .map(line => LRC_LINE_REGEX.exec(line.trim()))
    .filter(Boolean)
    .map(match => ({
      time: parseInt(match[1]) * 60 + parseFloat(match[2]),
      // ^ e.g. [01:23.45] → 1 * 60 + 23.45 = 83.45 seconds
      text: match[3].trim() || '♪',
    }))
    .sort((a, b) => a.time - b.time); // ensure chronological order
}
```

### Step 2: Find Active Line

```javascript
export function getActiveLyricIndex(lines, currentTime) {
  // Strategy: linear scan from start
  // The "active" line is the LAST line whose timestamp <= currentTime
  // This handles the case where lyrics overlap time windows

  let activeIndex = -1; // -1 = before any lyrics start

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) {
      activeIndex = i; // keep updating — last match wins
    } else {
      break; // array is sorted, so no need to look further
    }
  }
  return activeIndex;
}
```

**Time complexity:** O(n) scan — with typical LRC files (50-200 lines), this runs in < 0.1ms per frame.

### Step 3: useLrcSync Hook Wires It Together

```javascript
// useLrcSync.js
export function useLrcSync(lrcString, currentTime) {
  // parseLrc is memoized — only re-runs when lrcString changes (new song)
  const lines = useMemo(() => parseLrc(lrcString), [lrcString]);

  // getActiveLyricIndex runs on every currentTime change (~4x/sec)
  const activeIndex = useMemo(
    () => getActiveLyricIndex(lines, currentTime),
    [lines, currentTime]
  );

  return { lines, activeIndex };
}
```

### Step 4: Auto-scroll + Click-to-seek

```javascript
// In LyricsPanel.jsx — auto-scroll
useEffect(() => {
  const activeEl = containerRef.current?.children[activeIndex];
  activeEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // 'block: center' keeps the active lyric at the optical center
  // of the scroll container (not top or bottom)
}, [activeIndex]);

// Click-to-seek
<p onClick={() => seek(line.time)}>
  {line.text}
</p>
// When clicked: seek(83.45) → audio.currentTime = 83.45
// → 'timeupdate' fires → activeIndex recalculates → lyric updates
```

---

## 5. API Integration Breakdown (Innertube Stack)

Pulse uses a 3-layer API stack — **zero API keys required**.

### Layer 1: Search (Piped API → Innertube)

```
User types "Blinding Lights" in SearchBar
        │ (350ms debounce)
        ▼
searchSongs("Blinding Lights")
        │
        ▼ GET https://pipedapi.kavin.rocks/search
              ?q=Blinding+Lights&filter=music_songs
        │
        ▼ Response: { items: [ { url, title, uploaderName, thumbnail, duration }, ... ] }
        │
        ▼ normalizeSearchItem() → { videoId, title, artist, thumbnail, duration }
        │
        ▼ setResults([...]) → renders dropdown list
```

**Why Piped?** Piped is an open-source YouTube frontend that wraps the Innertube API (YouTube's internal protocol). It returns structured JSON without requiring authentication.

### Layer 2: Stream Resolution (Piped /streams)

```
User clicks a search result
        │
        ▼
getSongStream("dQw4w9WgXcQ")
        │
        ▼ GET https://pipedapi.kavin.rocks/streams/dQw4w9WgXcQ
        │
        ▼ Response: {
            title, uploader, thumbnailUrl, duration,
            audioStreams: [
              { url: "...", mimeType: "audio/mp4; codecs=mp4a", bitrate: 128000 },
              { url: "...", mimeType: "audio/webm; codecs=opus", bitrate: 160000 },
            ]
          }
        │
        ▼ Sort by bitrate descending, prefer mp4a (wider browser support)
        │
        ▼ return { streamUrl: audioStreams[0].url, ... }
        │
        ▼ audio.src = streamUrl → browser fetches and plays
```

**Fallback chain:** 3 Piped instances are tried in order. If all fail, error is shown.

### Layer 3: Synchronized Lyrics (lrclib.net)

```
After song loads (async, non-blocking):
        │
        ▼
fetchLyrics("Blinding Lights", "The Weeknd", 200)
        │
        ▼ GET https://lrclib.net/api/search
              ?track_name=Blinding+Lights&artist_name=The+Weeknd&duration=200
        │
        ▼ Response: [{ syncedLyrics: "[00:01.00] I been tryna...", ... }]
        │
        ├─ Has syncedLyrics? → use it directly (LRC format)
        ├─ Has plainLyrics? → convert to timed LRC (5s per line)
        └─ Neither? → use DEMO_LRC (always shows the karaoke engine working)
        │
        ▼ setLrcString(lrc) → triggers useLrcSync → lyrics panel updates live
```

**lrclib.net** is a free, community-driven lyrics database with synchronized LRC data for millions of tracks.

### Complete Data Flow Diagram

```
Search Query
     │
     ▼
Piped Search API ──► videoId + metadata
     │
     ▼
Piped Streams API ──► streamUrl (mp4a audio)
     │                              │
     │                              ▼
     │                    audio.src = streamUrl
     │                    audio.play()
     │                              │
     ▼                              ▼
lrclib.net ──► LRC string    timeupdate events
     │                              │
     ▼                              ▼
parseLrc() ──► [{time, text}]  currentTime state
     │                              │
     └──────────────────────────────┘
                     │
                     ▼
          getActiveLyricIndex()
                     │
                     ▼
          LyricsPanel highlights
          active line + auto-scrolls
```

---

*Built by Vikrant · Pulse Music App · Powered by Innertube / Piped / lrclib.net*
