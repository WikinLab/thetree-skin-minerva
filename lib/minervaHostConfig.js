const CONFIG_FALLBACKS = Object.freeze({
  siteNoticeHtml: ['skin.minerva.site_notice', 'wiki.sitenotice'],
  footerPlacesHtml: [
    'skin.minerva.footer_html',
    'footer_html',
    'wiki.footer_text'
  ],
  themeColor: ['skin.minerva.theme_color', 'wiki.theme_color'],
  tagline: ['skin.minerva.tagline', 'wiki.tagline'],
  siteName: ['wiki.site_name', 'wiki.name', 'site_name', 'siteName'],
  frontPage: ['wiki.front_page', 'front_page']
});

const BOOLEAN_CONFIG_FALLBACKS = Object.freeze({
  hideInterlanguageLinks: [
    'skin.minerva.hide_interlanguage_links',
    'skin.minerva.hideInterlanguageLinks'
  ],
  alwaysShowLanguageButton: [
    'skin.minerva.always_show_language_button',
    'skin.minerva.alwaysShowLanguageButton'
  ]
});

export function firstConfiguredString(config = {}, keys = [], fallback = '') {
  for (const key of keys) {
    const value = config?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

export function getMinervaConfiguredString(config = {}, name, fallback = '') {
  return firstConfiguredString(config, CONFIG_FALLBACKS[name] || [], fallback);
}

function configuredBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
}

export function getMinervaConfiguredBoolean(config = {}, name, fallback = false) {
  for (const key of BOOLEAN_CONFIG_FALLBACKS[name] || []) {
    const value = configuredBoolean(config?.[key]);
    if (value !== null) return value;
  }
  return fallback;
}

export function getMinervaFrontPage(config = {}) {
  return getMinervaConfiguredString(config, 'frontPage', 'FrontPage');
}
