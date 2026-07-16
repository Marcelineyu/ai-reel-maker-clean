import React from 'react';
import { navigateTo } from '../utils/navigation';

export default function Footer({ onOpenStudio }) {
  const openStudio = () => {
    onOpenStudio?.();
    navigateTo('studio');
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <footer className="border-t border-border bg-surface py-10 px-5 sm:px-8 lg:px-12">
      <div className="max-w-4xl xl:max-w-5xl flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <p className="font-medium text-text-primary">AI Reel Maker</p>
          <p className="text-sm text-text-secondary mt-1 max-w-xs leading-relaxed">Storyboard, visuals, narration, and publishing tools in one workspace.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          <button type="button" onClick={() => scrollTo('features')} className="text-text-secondary hover:text-text-primary transition-colors">Features</button>
          <button type="button" onClick={() => scrollTo('how-it-works')} className="text-text-secondary hover:text-text-primary transition-colors">How It Works</button>
          <button type="button" onClick={openStudio} className="text-text-secondary hover:text-text-primary transition-colors">Open Studio</button>
        </nav>
      </div>
      <p className="max-w-4xl xl:max-w-5xl mt-8 pt-6 border-t border-border text-xs text-text-secondary">
        © {new Date().getFullYear()} AI Reel Maker
      </p>
    </footer>
  );
}
