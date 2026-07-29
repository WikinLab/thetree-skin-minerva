/* Shared contract for build-selected content profiles. */

const REQUIRED_METHODS = Object.freeze([
  'resolveSurface',
  'makeCategoryData',
  'createStoreRuntime',
  'createMountedRuntime'
]);

const CATEGORY_OWNERS = Object.freeze(new Set(['host', 'vector']));
const STYLE_DOMAINS = Object.freeze(new Set(['host', 'mediawiki']));

export function defineContentProfile(profile = {}) {
  if (!profile.id || typeof profile.id !== 'string') {
    throw new TypeError('Content profile requires a stable string id.');
  }
  if (!CATEGORY_OWNERS.has(profile.categoryOwnership)) {
    throw new TypeError(`Content profile ${profile.id} has invalid category ownership.`);
  }
  if (!STYLE_DOMAINS.has(profile.styleDomain)) {
    throw new TypeError(`Content profile ${profile.id} has invalid style domain.`);
  }
  for (const method of REQUIRED_METHODS) {
    if (typeof profile[method] !== 'function') {
      throw new TypeError(`Content profile ${profile.id} lacks ${method}().`);
    }
  }
  return Object.freeze({ ...profile });
}

export const contentProfileContract = Object.freeze({
  requiredMethods: REQUIRED_METHODS,
  categoryOwners: Object.freeze([...CATEGORY_OWNERS]),
  styleDomains: Object.freeze([...STYLE_DOMAINS])
});
