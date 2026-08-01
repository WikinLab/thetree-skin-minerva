const BASE_BODY_CLASSES = [
  'mediawiki',
  'skin-minerva',
  'skin--responsive',
  'mw-hide-empty-elt'
];

const BASE_ROOT_CLASSES = ['tt-minerva'];
const THEME_CLASSES = ['skin-theme-clientpref-day', 'skin-theme-clientpref-night'];
const HOST_THEME_CLASSES = ['theseed-light-mode', 'theseed-dark-mode'];

function namespaceClasses(namespace) {
  const parsed = Number.parseInt(namespace, 10);
  const value = Number.isFinite(parsed) ? parsed : 0;
  return [`ns-${value}`, value % 2 === 0 ? 'ns-subject' : 'ns-talk'];
}

export function makeMinervaDocumentEnvironment({
  lang = 'ko',
  dir = 'ltr',
  namespace = 0,
  action = 'view',
  theme = 'light'
} = {}) {
  const direction = dir === 'rtl' ? 'rtl' : 'ltr';
  return {
    htmlAttributes: { lang: lang || 'ko', dir: direction },
    htmlClasses: [theme === 'dark' ? 'skin-theme-clientpref-night' : 'skin-theme-clientpref-day'],
    managedHtmlClasses: THEME_CLASSES,
    suppressedBodyClasses: HOST_THEME_CLASSES,
    bodyClasses: [
      ...BASE_BODY_CLASSES,
      direction,
      `sitedir-${direction}`,
      ...namespaceClasses(namespace),
      `action-${action || 'view'}`
    ],
    rootClasses: BASE_ROOT_CLASSES
  };
}

export function applyMinervaDocumentEnvironment(environment, documentObject = globalThis.document) {
  if (!documentObject?.documentElement || !documentObject?.body) return () => {};
  const html = documentObject.documentElement;
  const body = documentObject.body;
  const oldAttributes = Object.fromEntries(Object.keys(environment.htmlAttributes).map((key) => [key, html.getAttribute(key)]));
  const oldHtmlClasses = new Map(environment.managedHtmlClasses.map((name) => [name, html.classList.contains(name)]));
  const oldSuppressedClasses = new Map(environment.suppressedBodyClasses.map((name) => [name, body.classList.contains(name)]));
  for (const [key, value] of Object.entries(environment.htmlAttributes)) html.setAttribute(key, value);
  const desired = new Set(environment.htmlClasses);
  for (const name of environment.managedHtmlClasses) html.classList.toggle(name, desired.has(name));
  const suppressHostClasses = () => environment.suppressedBodyClasses.forEach((name) => body.classList.remove(name));
  suppressHostClasses();
  const Observer = documentObject.defaultView?.MutationObserver || globalThis.MutationObserver;
  const observer = typeof Observer === 'function' ? new Observer(suppressHostClasses) : null;
  observer?.observe(body, { attributes: true, attributeFilter: ['class'] });
  const added = environment.bodyClasses.filter((name) => !body.classList.contains(name));
  added.forEach((name) => body.classList.add(name));
  return () => {
    observer?.disconnect();
    added.forEach((name) => body.classList.remove(name));
    oldSuppressedClasses.forEach((present, name) => body.classList.toggle(name, present));
    oldHtmlClasses.forEach((present, name) => html.classList.toggle(name, present));
    Object.entries(oldAttributes).forEach(([key, value]) => value === null ? html.removeAttribute(key) : html.setAttribute(key, value));
  };
}
