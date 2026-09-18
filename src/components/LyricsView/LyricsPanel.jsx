import { useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { useLrcSync, useLyricsScroll } from '../../hooks/useLrcSync.js';

export default function LyricsPanel() {
  const { lrcString, lyricsSource, currentTime, seek } = usePlayer();
  const containerRef = useRef(null);

  // Parse LRC and get active line index
  const { lines, activeIndex } = useLrcSync(lrcString, currentTime);

  // Auto-scroll active line into center of container
  useLyricsScroll(activeIndex, containerRef);

  if (!lines.length) {
    return (
      <section className="lg:col-span-6 flex items-center justify-center">
        <p className="text-on-surface-variant text-body-lg">No lyrics available</p>
      </section>
    );
  }

  return (
    <section className="lg:col-span-6 h-full flex flex-col justify-center overflow-hidden relative">
      {/* Top gradient fade */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#09090B] to-transparent pointer-events-none z-10" />
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#09090B] to-transparent pointer-events-none z-10" />

      {/* Lyrics scroll container */}
      <div
        ref={containerRef}
        className="overflow-y-auto py-20 space-y-7 lg:space-y-9 px-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {lines.map((line, i) => {
          const isActive   = i === activeIndex;
          const isPast     = i < activeIndex;
          const isFarPast  = i < activeIndex - 2;
          const isUpcoming = i > activeIndex;
          const isFarAhead = i > activeIndex + 3;

          return (
            <p
              key={i}
              onClick={() => seek(line.time)}
              className={`
                font-bold tracking-tight cursor-pointer leading-snug transition-all duration-400 select-text
                ${isActive
                  ? 'lyric-active-glow text-white text-2xl sm:text-3xl lg:text-[36px] scale-[1.03] origin-left'
                  : isFarPast
                  ? 'text-white/15 text-xl sm:text-2xl lg:text-[24px] hover:text-white/40'
                  : isPast
                  ? 'text-white/30 text-xl sm:text-2xl lg:text-[26px] hover:text-white/50'
                  : isUpcoming && !isFarAhead
                  ? 'text-white/35 text-xl sm:text-2xl lg:text-[26px] hover:text-white/60'
                  : 'text-white/15 text-xl sm:text-2xl lg:text-[24px] hover:text-white/40'
                }
              `}
              style={{
                filter: isActive ? 'blur(0px)' : isFarPast || isFarAhead ? 'blur(0.4px)' : 'blur(0px)',
              }}
            >
              {line.text}
            </p>
          );
        })}
      </div>

      {/* Lyrics source badge */}
      <div className="absolute bottom-2 right-0 z-20">
        <span className="text-label-sm text-outline/50 uppercase tracking-wider">
          {lyricsSource === 'synced'
            ? '✦ Synced Lyrics'
            : lyricsSource === 'plain'
            ? '✦ Lyrics'
            : '✦ Demo Lyrics'}
        </span>
      </div>
    </section>
  );
}
