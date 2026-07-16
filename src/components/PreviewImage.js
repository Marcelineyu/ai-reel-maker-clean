import React, { useState } from 'react';

function ImageFallbackIcon() {
  return (
    <svg className="w-5 h-5 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export default function PreviewImage({ src, alt, className = '', label }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`preview-image-fallback ${className}`} role="img" aria-label={alt}>
        <ImageFallbackIcon />
        {label ? <span className="text-[10px] font-medium text-text-secondary">{label}</span> : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
