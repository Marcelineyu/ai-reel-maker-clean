import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Studio from './components/Studio';
import { getViewFromHash } from './utils/navigation';

function App() {
  const [view, setView] = useState(() => getViewFromHash());

  useEffect(() => {
    const onHashChange = () => setView(getViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) {
      window.location.hash = '#/';
    }
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (view === 'studio') {
    return <Studio onGoHome={() => setView('landing')} />;
  }

  return <LandingPage onOpenStudio={() => setView('studio')} />;
}

export default App;
