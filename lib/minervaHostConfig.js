const CONFIG_FALLBACKS = Object.freeze({
  siteNoticeHtml: ['skin.minerva.site_notice', 'wiki.sitenotice'],
  footerPlacesHtml: [
    'skin.minerva.footer_html',
    'footer_html',
    'wiki.footer_text',
    // Retain the old key as a migration fallback, not as a skin contract.
    'skin.vector.footer_html'
  ],
  themeColor: ['skin.minerva.theme_color', 'wiki.theme_color', 'skin.vector.theme_color'],
  tagline: ['skin.minerva.tagline', 'wiki.tagline', 'skin.vector.tagline'],
  siteName: ['wiki.site_name', 'wiki.name', 'site_name', 'siteName'],
  frontPage: ['wiki.front_page', 'front_page']
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

export function getMinervaFrontPage(config = {}) {
  return getMinervaConfiguredString(config, 'frontPage', 'FrontPage');
}
