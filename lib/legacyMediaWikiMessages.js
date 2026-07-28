import mediaWikiLessMessageCatalog from './generated/mediawiki-less-messages.json';
const FALLBACK_MESSAGES = Object.freeze({
  en: Object.freeze({ tocTitle: 'Contents', edit: 'edit', backlink: '↑', categories: 'Categories' }),
  ko: Object.freeze({ tocTitle: '목차', edit: '편집', backlink: '↑', categories: '분류' })
});

const RTL_LANGUAGES = new Set(['ar', 'arc', 'dv', 'fa', 'he', 'khw', 'ks', 'ku', 'mzn', 'nqo', 'pnb', 'ps', 'sd', 'ug', 'ur', 'yi']);

const MESSAGE_KEYS = Object.freeze({
  tocTitle: ['toc', 'toc-title', 'tocTitle', 'contents', 'msg-toc'],
  hide: ['hidetoc', 'msg-hidetoc', 'toc-hide', 'hide'],
  show: ['showtoc', 'msg-showtoc', 'toc-show', 'show'],
  edit: ['editsection', 'edit', 'msg-editsection', 'msg-edit'],
  backlink: ['cite_reference_link', 'cite-reference-link', 'backlink'],
  categories: ['pagecategories', 'categories', 'msg-pagecategories']
});

function normalizeLanguageCode(lang) {
  const raw = String(lang || 'ko').trim() || 'ko';
  return raw.toLowerCase().split('-')[0] || 'ko';
}

function normalizeMessageSource(source) {
  if (!source) return null;
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof source === 'object' ? source : null;
}

function messageSources({ config = {}, messages = null } = {}) {
  return [
    messages,
    config.mediaWikiMessages,
    config.mediawikiMessages,
    config.messages,
    config.i18nMessages,
    config['wiki.messages'],
    config['wiki.i18n.messages']
  ].map(normalizeMessageSource).filter(Boolean);
}

function readMessage(sources, keys) {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.length > 0) return value;
    }
  }
  return null;
}

function catalogMessages(language) {
  const languages = mediaWikiLessMessageCatalog?.languages || {};
  const resolved = {};
  const visited = new Set();
  let current = language;
  while (current && !visited.has(current)) {
    visited.add(current);
    const entry = languages[current];
    if (!entry) {
      current = current === 'en' ? null : 'en';
      continue;
    }
    for (const [key, value] of Object.entries(entry.messages || {})) {
      if (!(key in resolved) && typeof value === 'string') resolved[key] = value;
    }
    current = entry.fallback || (current === 'en' ? null : 'en');
  }
  return resolved;
}

function resourceLoaderMessages(code, sources) {
  const fallback = catalogMessages(code);
  return Object.fromEntries(Object.keys(fallback).sort().map((key) => {
    let value = null;
    for (const source of sources) {
      for (const candidate of [key, `msg-${key}`]) {
        if (typeof source[candidate] === 'string') {
          value = source[candidate];
          break;
        }
      }
      if (value != null) break;
    }
    return [key, value ?? fallback[key]];
  }));
}

export function makeLegacyMediaWikiLanguageContext({ lang = 'ko', dir = null, config = {}, messages = null } = {}) {
  const code = normalizeLanguageCode(lang);
  const fallback = FALLBACK_MESSAGES[code] || FALLBACK_MESSAGES.en;
  const sources = messageSources({ config, messages });
  const lessMessages = resourceLoaderMessages(code, sources);
  const resolvedMessages = Object.fromEntries(Object.entries(MESSAGE_KEYS).map(([name, keys]) => [
    name,
    readMessage(sources, keys)
      || (name === 'hide' ? lessMessages.hidetoc : null)
      || (name === 'show' ? lessMessages.showtoc : null)
      || fallback[name]
      || FALLBACK_MESSAGES.en[name]
  ]));
  return {
    code,
    htmlCode: code,
    dir: dir || config.dir || config['wiki.dir'] || (RTL_LANGUAGES.has(code) ? 'rtl' : 'ltr'),
    messages: resolvedMessages,
    resourceLoaderMessages: lessMessages
  };
}

export function cssStringToken(value) {
  const text = String(value ?? '');
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\a ')}"`;
}
