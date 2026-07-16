import React from 'react';

export default function LogoMark({ size = 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-9 h-9 rounded-xl';
  const icon = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className={`${dim} bg-primary flex items-center justify-center shrink-0`} aria-hidden>
      <svg className={`${icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4" />
      </svg>
    </div>
  );
}
