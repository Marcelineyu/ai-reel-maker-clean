export function getViewFromPath(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === '/studio' ? 'studio' : 'landing';
}

export function navigateTo(view) {
  const path = view === 'studio' ? '/studio' : '/';
  if (window.location.pathname !== path) {
    window.history.pushState({ view }, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}
