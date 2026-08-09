import { cssStringToken, makeLegacyMediaWikiLanguageContext } from './legacyMediaWikiMessages';
import { getMinervaConfiguredString } from './minervaHostConfig.js';

export function makeMinervaThemeColor(config = {}, theme = 'light') {
  return theme === 'dark' ? '#101418' : getMinervaConfiguredString(config, 'themeColor', '#ffffff');
}

export function makeMinervaSkinVars({ config = {}, documentEnvironment } = {}) {
  const language = makeLegacyMediaWikiLanguageContext({
    lang: config.lang || config['wiki.lang'] || 'ko',
    dir: config.dir || config['wiki.dir'] || 'ltr',
    config,
    messages: config.mediaWikiMessages || config.mediawikiMessages || config.messages || null
  });
  return {
    direction: documentEnvironment?.htmlAttributes?.dir || 'ltr',
    ...Object.fromEntries(Object.entries(language.resourceLoaderMessages).map(([key, value]) => [
      `--mw-msg-${key}`,
      cssStringToken(value)
    ]))
  };
}
