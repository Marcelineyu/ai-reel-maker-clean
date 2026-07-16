import React, { useState, useEffect } from 'react';
import LogoMark from './LogoMark';
import { navigateTo } from '../utils/navigation';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'use-cases', label: 'What You Can Create' },
];

function NavLink({ id, label, onNavigate, active, className = '' }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(id)}
      className={`sidebar-link w-full text-left ${active ? 'sidebar-link-active' : ''} ${className}`}
    >
      {label}
    </button>
  );
}

export default function LandingSidebar({ onOpenStudio }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const scrollTo = (id) => {
    setDrawerOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(id);
  };

  const openStudio = () => {
    setDrawerOpen(false);
    onOpenStudio?.();
    navigateTo('studio');
  };

  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((item) => item.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5] },
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const sidebarContent = (
    <>
      <div className="px-5 pt-6 pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="font-semibold text-text-primary text-[15px] leading-tight">AI Reel Maker</p>
            <p className="text-xs text-text-secondary mt-0.5 leading-snug">Creative video workflow studio</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5" aria-label="Page sections">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.id} id={item.id} label={item.label} onNavigate={scrollTo} active={activeSection === item.id} />
        ))}
      </nav>

      <div className="px-4 pb-6 pt-4 border-t border-border mt-auto">
        <button type="button" onClick={openStudio} className="btn-primary w-full text-sm">
          Open Studio
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 z-40 h-screen w-[260px] bg-surface border-r border-border">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button type="button" onClick={() => scrollTo('overview')} className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
            <LogoMark size="sm" />
            <span className="font-semibold text-text-primary text-sm">AI Reel Maker</span>
          </button>
          <button
            type="button"
            className="p-2 rounded-lg text-text-primary hover:bg-surface-muted transition-colors"
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {drawerOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-text-primary/20" onClick={() => setDrawerOpen(false)} aria-hidden />
          <aside className="lg:hidden fixed left-0 top-0 z-50 h-full w-[min(280px,85vw)] bg-surface border-r border-border flex flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
