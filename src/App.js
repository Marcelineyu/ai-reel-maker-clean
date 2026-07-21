import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Studio from './components/Studio';
import { getViewFromPath, navigateTo } from './utils/navigation';

function App() {
  const [view, setView] = useState(() => getViewFromPath());

  useEffect(() => {
    const onPopState = () => setView(getViewFromPath());
    window.addEventListener('popstate', onPopState);

    if (window.location.hash) {
      const legacyPath = window.location.hash.replace(/^#/, '') || '/';
      const targetPath = legacyPath === '/studio' ? '/studio' : '/';
      const targetView = getViewFromPath(targetPath);
      window.history.replaceState({ view: targetView }, '', targetPath);
      setView(targetView);
    }

    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    if (currentPath !== '/' && currentPath !== '/studio') {
      window.history.replaceState({ view: 'landing' }, '', '/');
      setView('landing');
    }

    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (view === 'studio') {
    return <Studio onGoHome={() => navigateTo('landing')} />;
  }

  return <LandingPage onOpenStudio={() => navigateTo('studio')} />;
}

export default App;
