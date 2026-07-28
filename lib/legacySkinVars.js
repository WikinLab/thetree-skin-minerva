import { makeLegacyLogoAsset } from './legacyLogoAdapter';
import { getConfiguredString } from './legacyHostAdapterPolicy';
import { cssStringToken, makeLegacyMediaWikiLanguageContext } from './legacyMediaWikiMessages';

export function makeLegacyThemeColor(config = {}, theme = 'light') {
  if (theme === 'dark') return '#000000';
  return getConfiguredString(config, 'themeColor', '#eaecf0');
}

export function makeLegacySkinMessages(config = {}) {
  return makeLegacyMediaWikiLanguageContext({
    lang: config.lang || config['wiki.lang'] || 'ko',
    dir: config.dir || config['wiki.dir'] || 'ltr',
    config,
    messages: config.mediaWikiMessages || config.mediawikiMessages || config.messages || config.i18nMessages || config['wiki.messages'] || null
  }).messages;
}

export function makeLegacySkinVars({ config = {}, documentEnvironment } = {}) {
  const logoAsset = makeLegacyLogoAsset({ config });
  const language = makeLegacyMediaWikiLanguageContext({
    lang: config.lang || config['wiki.lang'] || 'ko',
    dir: config.dir || config['wiki.dir'] || 'ltr',
    config,
    messages: config.mediaWikiMessages || config.mediawikiMessages || config.messages || config.i18nMessages || config['wiki.messages'] || null
  });
  const messageVars = Object.fromEntries(Object.entries(language.resourceLoaderMessages).map(([key, value]) => [
    `--mw-msg-${key}`,
    cssStringToken(value)
  ]));
  return {
    direction: documentEnvironment?.htmlAttributes?.dir || config.dir || config['wiki.dir'] || 'ltr',
    '--tt-vector-logo': logoAsset.cssBackgroundImage,
    ...messageVars
  };
}
