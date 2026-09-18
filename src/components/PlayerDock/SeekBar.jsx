import { formatTime } from '../../utils/timeFormat.js';

export default function SeekBar({ currentTime, duration, onSeek }) {
  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full flex items-center gap-space-sm">
      <span className="text-label-sm text-on-surface-variant w-8 text-right tabular-nums font-mono">
        {formatTime(currentTime)}
      </span>

      {/* Track bar */}
      <div className="relative flex-1 h-1 group cursor-pointer">
        {/* Background track */}
        <div className="absolute inset-0 bg-white/15 rounded-full overflow-hidden">
          {/* Fill gradient */}
          <div
            className="h-full seek-fill rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Range input overlay (invisible, handles interaction) */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.25}
          value={currentTime}
          onChange={e => onSeek(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      <span className="text-label-sm text-on-surface-variant w-8 tabular-nums font-mono">
        {formatTime(duration)}
      </span>
    </div>
  );
}
