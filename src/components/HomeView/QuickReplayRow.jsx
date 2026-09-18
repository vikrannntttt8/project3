import { usePlayer } from '../../context/PlayerContext.jsx';

const RECENT_TRACKS = [
  { title: 'Blinding Lights', artist: 'The Weeknd',  videoId: '3JZ4pnNtyxQ', color: 'from-rose-900 to-orange-900' },
  { title: 'Midnight Rain',   artist: 'Taylor Swift', videoId: 'dQw4w9WgXcQ',  color: 'from-blue-900 to-violet-900' },
  { title: 'Heat Waves',      artist: 'Glass Animals', videoId: 'kXYiU_JCYtU', color: 'from-teal-900 to-cyan-900' },
  { title: 'As It Was',       artist: 'Harry Styles', videoId: 'SlPhMPnQ58k',  color: 'from-pink-900 to-fuchsia-900' },
  { title: 'Stay',            artist: 'Kid Laroi',    videoId: 'hHW1oY26kxQ',  color: 'from-indigo-900 to-purple-900' },
];

export default function QuickReplayRow({ onPlay }) {
  return (
    <section className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <span className="text-headline-sm font-semibold text-white">Quick Replay</span>
        <span className="text-label-sm text-on-surface-variant">Recently Played</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {RECENT_TRACKS.map(track => (
          <button
            key={track.videoId}
            onClick={() => onPlay(track)}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/8 border border-white/5 hover:border-brand-violet/30 transition-all group"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${track.color} flex-shrink-0`} />
            <div className="flex flex-col text-left min-w-0">
              <span className="text-label-md font-semibold text-white group-hover:text-[#d0bcff] transition-colors truncate max-w-[100px]">
                {track.title}
              </span>
              <span className="text-body-sm text-on-surface-variant truncate max-w-[100px]">{track.artist}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
