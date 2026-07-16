import React from 'react';
import LogoMark from './LogoMark';
import { navigateTo } from '../utils/navigation';

function ProviderBadge({ label, active }) {
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-md border ${active ? 'bg-surface-soft border-primary/30 text-primary' : 'bg-surface border-border text-text-secondary'}`}>
      {label}
    </span>
  );
}

export default function StudioHeader({ providers, onGoHome }) {
  const goHome = () => {
    onGoHome?.();
    navigateTo('landing');
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <LogoMark size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-text-primary truncate">AI Reel Maker</span>
              <span className="text-text-secondary" aria-hidden>/</span>
              <span className="text-text-secondary">Studio</span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5" aria-label="Provider status">
          <ProviderBadge label="OpenAI" active={providers?.openai} />
          <ProviderBadge label="Gemini" active={providers?.gemini} />
          <ProviderBadge label="ElevenLabs" active={providers?.elevenlabs} />
        </div>

        <button type="button" onClick={goHome} className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-2 py-1">
          ← Back to Home
        </button>
      </div>
    </header>
  );
}
