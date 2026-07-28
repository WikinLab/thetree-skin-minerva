const BASE_BODY_CLASSES = [
  'mediawiki',
  'skin-vector',
  'skin-vector-legacy',
  'mw-hide-empty-elt'
];

const BASE_ROOT_CLASSES = [
  'tt-vector'
];

const DARK_MODE_HTML_CLASS_UNIVERSE = [
  'skin-theme-clientpref-day',
  'skin-theme-clientpref-night',
  'client-darkmode'
];

const HOST_THEME_CLASSES_SUPPRESSED_BY_DARKMODE = [
  'theseed-light-mode',
  'theseed-dark-mode'
];

const DIRECTIONAL_BODY_CLASSES = {
  ltr: ['ltr', 'sitedir-ltr'],
  rtl: ['rtl', 'sitedir-rtl']
};

function normalizeDirection(dir) {
  return dir === 'rtl' ? 'rtl' : 'ltr';
}

function normalizeLanguage(lang) {
  return lang || 'ko';
}

function actionClass(action) {
  return `action-${action || 'view'}`;
}

function namespaceClasses(namespace) {
  const parsed = Number.parseInt(namespace, 10);
  const ns = Number.isFinite(parsed) ? parsed : 0;
  return [`ns-${ns}`, ns % 2 === 0 ? 'ns-subject' : 'ns-talk'];
}

function darkModeHtmlClasses(theme) {
  return theme === 'dark'
    ? ['skin-theme-clientpref-night', 'client-darkmode']
    : ['skin-theme-clientpref-day'];
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export function makeLegacyDocumentEnvironment({
  lang = 'ko',
  dir = 'ltr',
  namespace = 0,
  action = 'view',
  theme = 'light'
} = {}) {
  const direction = normalizeDirection(dir);
  const language = normalizeLanguage(lang);
  return {
    htmlAttributes: {
      dir: direction,
      lang: language
    },
    htmlClasses: darkModeHtmlClasses(theme),
    managedHtmlClasses: [...DARK_MODE_HTML_CLASS_UNIVERSE],
    suppressedBodyClasses: [...HOST_THEME_CLASSES_SUPPRESSED_BY_DARKMODE],
    bodyClasses: unique([
      ...BASE_BODY_CLASSES,
      ...DIRECTIONAL_BODY_CLASSES[direction],
      ...namespaceClasses(namespace),
      actionClass(action)
    ]),
    rootClasses: [...BASE_ROOT_CLASSES]
  };
}

export function applyLegacyDocumentEnvironment(environment, documentObject = globalThis.document) {
  if (!documentObject) return () => {};

  const html = documentObject.documentElement;
  const body = documentObject.body;
  if (!html || !body) return () => {};

  const previousHtmlAttributes = {};
  for (const [key, value] of Object.entries(environment.htmlAttributes || {})) {
    previousHtmlAttributes[key] = html.getAttribute(key);
    html.setAttribute(key, value);
  }

  const previousHtmlClassState = new Map();
  const desiredHtmlClasses = new Set(environment.htmlClasses || []);
  for (const className of environment.managedHtmlClasses || []) {
    previousHtmlClassState.set(className, html.classList.contains(className));
    html.classList.toggle(className, desiredHtmlClasses.has(className));
  }

  const suppressedBodyClasses = [...(environment.suppressedBodyClasses || [])];
  const suppressedBodyClassState = new Map();
  const suppressHostThemeClasses = () => {
    for (const className of suppressedBodyClasses) {
      if (body.classList.contains(className)) body.classList.remove(className);
    }
  };
  for (const className of suppressedBodyClasses) {
    suppressedBodyClassState.set(className, body.classList.contains(className));
  }
  suppressHostThemeClasses();

  let bodyClassObserver = null;
  const MutationObserverClass = documentObject.defaultView?.MutationObserver || globalThis.MutationObserver;
  if (suppressedBodyClasses.length && typeof MutationObserverClass === 'function') {
    bodyClassObserver = new MutationObserverClass(() => {
      suppressHostThemeClasses();
    });
    bodyClassObserver.observe(body, { attributes: true, attributeFilter: ['class'] });
  }

  const addedBodyClasses = [];
  for (const className of environment.bodyClasses || []) {
    if (!body.classList.contains(className)) {
      body.classList.add(className);
      addedBodyClasses.push(className);
    }
  }

  return () => {
    if (bodyClassObserver) bodyClassObserver.disconnect();
    bodyClassObserver = null;
    for (const className of addedBodyClasses) {
      body.classList.remove(className);
    }
    for (const [className, wasPresent] of suppressedBodyClassState) {
      body.classList.toggle(className, wasPresent);
    }
    for (const [className, wasPresent] of previousHtmlClassState) {
      html.classList.toggle(className, wasPresent);
    }
    for (const [key, value] of Object.entries(previousHtmlAttributes)) {
      if (value === null) html.removeAttribute(key);
      else html.setAttribute(key, value);
    }
  };
}
