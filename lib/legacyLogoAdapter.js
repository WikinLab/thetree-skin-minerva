/*
 * the tree -> REL1_46 Vector logo asset adapter boundary.
 *
 * Upstream Vector legacy owns the #p-logo / .mw-wiki-logo DOM and geometry.
 * MediaWiki supplies the actual logo asset through ResourceLoader/site config.
 * the tree supplies the equivalent runtime asset URL through this deterministic
 * adapter, but it does not invent on-screen logo text inside #p-logo.
 */

import { firstConfiguredString, getConfiguredString, CONFIG_FALLBACKS } from './legacyHostAdapterPolicy';

export function makeLegacyLogoAsset({ config = {} } = {}) {
  const logoImage = firstConfiguredString(config, CONFIG_FALLBACKS.logoImage, '');
  const fallbackLogoUrl = getConfiguredString(config, 'logoUrl', '');
  const cssBackgroundImage = logoImage || (fallbackLogoUrl ? `url(${fallbackLogoUrl})` : 'none');
  return {
    logoImage,
    logoUrl: fallbackLogoUrl,
    cssBackgroundImage
  };
}

export function makeLegacyLogoTooltip({ config = {} } = {}) {
  return getConfiguredString(config, 'logoTooltip', 'the tree');
}
