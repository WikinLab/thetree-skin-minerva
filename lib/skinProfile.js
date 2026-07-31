const SOURCE_SURFACE = Object.freeze({
  root: Object.freeze({}),
  isArticle: false,
  isInterface: false,
  featureMappingId: null,
  featureEquivalence: null
});

const EMPTY_CATEGORIES = Object.freeze({
  hasCategories: false,
  label: '',
  items: Object.freeze([])
});

const skinProfile = Object.freeze({
  id: 'vector-legacy',
  isEnabled: () => false,
  resolveSurface: () => SOURCE_SURFACE,
  contentRootBinding: () => Object.freeze({ classList: {}, attributes: {} }),
  makeCategoryData: () => EMPTY_CATEGORIES,
  decoratePersonalTools: (items) => items,
  handleClick: () => false,
  createStoreRuntime: null,
  createMountedRuntime: null,
  makeRuntimeData: () => ({}),
  makeRuntimeOptions: () => ({}),
  createExtensions: () => [],
  capabilities: Object.freeze([])
});

export default skinProfile;
