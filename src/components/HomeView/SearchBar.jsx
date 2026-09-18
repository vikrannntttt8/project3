export default function SearchBar({ query, onChange, onFocus, onBlur }) {
  return (
    <div className="relative flex items-center bg-white/5 rounded-full px-space-md py-2 gap-space-xs text-on-surface-variant focus-within:text-white transition-all border border-white/8 focus-within:border-brand-violet/60 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.15)]">
      <span className="material-symbols-outlined text-[18px] flex-shrink-0">search</span>
      <input
        type="text"
        value={query}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Search songs, artists…"
        className="bg-transparent border-none outline-none text-body-sm text-white placeholder:text-outline w-52 focus:w-72 transition-all duration-300"
      />
      {query && (
        <button
          onClick={() => onChange('')}
          className="text-outline hover:text-white transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
      {!query && (
        <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-on-surface-variant text-label-sm tracking-wider flex-shrink-0">⌘K</kbd>
      )}
    </div>
  );
}
