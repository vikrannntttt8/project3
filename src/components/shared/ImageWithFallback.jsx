import { useState, useEffect } from 'react';

/**
 * ImageWithFallback
 * Gracefully loads image URLs and falls back to a clean dark icon
 * on error, broken link, or undefined/empty src.
 */
export default function ImageWithFallback({
  src,
  alt = '',
  className = '',
  icon = 'music_note',
  iconClassName = 'text-white/30 text-[28px]',
  loading = 'lazy',
  ...props
}) {
  const [hasError, setHasError] = useState(!src);

  // Reset error state if src changes
  useEffect(() => {
    setHasError(!src);
  }, [src]);

  if (hasError || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-white/5 select-none ${className}`}
        aria-label={alt || 'Placeholder'}
      >
        <span className={`material-symbols-outlined ${iconClassName}`}>
          {icon}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
