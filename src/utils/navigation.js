export function getViewFromHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return hash === '/studio' ? 'studio' : 'landing';
}

export function navigateTo(view) {
  const hash = view === 'studio' ? '#/studio' : '#/';
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}
