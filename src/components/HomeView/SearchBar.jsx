export default function SearchBar({ query, onChange, onClear }) {
  return (
    <div className="relative flex items-center bg-white/5 rounded-full px-4 py-2 gap-2 border border-white/8 focus-within:border-brand-violet/60 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all">
      <span className="material-symbols-outlined text-on-surface-variant text-[18px] flex-shrink-0">search</span>
      <input
        type="text"
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Songs, albums, artists…"
        className="bg-transparent border-none outline-none text-body-md text-white placeholder:text-outline w-52 focus:w-72 transition-all duration-300"
      />
      {query ? (
        <button onClick={onClear} className="text-outline hover:text-white transition-colors flex-shrink-0">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      ) : (
        <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-on-surface-variant text-label-sm tracking-wider flex-shrink-0">⌘K</kbd>
      )}
    </div>
  );
}
