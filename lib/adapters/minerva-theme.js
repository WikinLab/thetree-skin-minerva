export const MINERVA_THEME_TOGGLE_ATTRIBUTE = 'data-tt-minerva-theme-toggle';

export function isMinervaThemeToggleTarget(target) {
  return target?.closest?.(`a[${MINERVA_THEME_TOGGLE_ATTRIBUTE}="1"]`) || null;
}

export function toggleTheTreeMinervaTheme(storeState = {}) {
  const nextTheme = storeState.currentTheme === 'dark' ? 'light' : 'dark';
  if (typeof storeState.localConfigSetValue === 'function') {
    storeState.localConfigSetValue('wiki.theme', nextTheme);
  }
  storeState.currentTheme = nextTheme;
  return nextTheme;
}
