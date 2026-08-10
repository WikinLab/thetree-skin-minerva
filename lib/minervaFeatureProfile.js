import { MINERVA_FEATURE_PROFILE } from './generated/minerva-feature-profile.js';
import { hasMinervaMobileFrontend } from './minervaMobileFrontend.js';

function mobileValue(layers = {}, page = {}, context = {}) {
  let value = !!layers.base;
  if (page.isAuthenticated && Object.hasOwn(layers, 'loggedin')) {
    value = !!layers.loggedin;
  }
  if (context.minervaAdvancedMobileMode && Object.hasOwn(layers, 'amc')) {
    value = !!layers.amc;
  }
  return value;
}

function conditionMatches(condition, page = {}) {
  if (condition === 'accessible-user-page') return !!page.isAccessibleUserPage;
  if (condition === 'diff') return !!page.isDiffPage;
  throw new Error(`Unknown generated Minerva feature condition: ${condition}`);
}

export function resolveMinervaFeatureProfile(context = {}, page = {}) {
  if (!hasMinervaMobileFrontend(context)) return Object.freeze({ ...MINERVA_FEATURE_PROFILE.desktop });
  const result = {};
  for (const [name, layers] of Object.entries(MINERVA_FEATURE_PROFILE.mobile)) {
    const forced = (MINERVA_FEATURE_PROFILE.forceTrueWhen[name] || [])
      .some((condition) => conditionMatches(condition, page));
    result[name] = forced || mobileValue(layers, page, context);
  }
  return Object.freeze(result);
}
