/*
 * MediaWiki DarkMode REL1_46 -> the tree host adapter.
 *
 * The extension owns the personal-tool label/class contract and the
 * skin-theme-clientpref-* document classes. The host owns persistence and the
 * effective theme state. This adapter maps only those two boundaries; it does
 * not reproduce MediaWiki API, user-option, cookie, or hook infrastructure.
 */
import darkModeMessagesEn from '../../vendor/mediawiki-darkmode/i18n/en.json';
import darkModeMessagesKo from '../../vendor/mediawiki-darkmode/i18n/ko.json';

export const DARK_MODE_PERSONAL_TOOL_ID = 'pt-darkmode';
export const DARK_MODE_TOGGLE_ATTRIBUTE = 'data-tt-darkmode-toggle';

function message(messages, key, fallback) {
  const value = messages && typeof messages[key] === 'string' ? messages[key] : '';
  return value || fallback;
}

function messagesForLanguage(lang = 'ko') {
  return String(lang).toLowerCase().split('-')[0] === 'ko' ? darkModeMessagesKo : darkModeMessagesEn;
}

export function makeDarkModePersonalTool({ theme = 'light', lang = 'ko', messages = messagesForLanguage(lang) } = {}) {
  const isDark = theme === 'dark';
  return Object.freeze({
    id: DARK_MODE_PERSONAL_TOOL_ID,
    label: message(messages, isDark ? 'darkmode-default-link' : 'darkmode-link', isDark ? '기본 모드' : '어두운 모드'),
    href: '#',
    arrayAttributes: Object.freeze([
      Object.freeze({ key: 'href', value: '#' }),
      Object.freeze({ key: 'class', value: 'ext-darkmode-link' }),
      Object.freeze({ key: DARK_MODE_TOGGLE_ATTRIBUTE, value: '1' }),
      Object.freeze({
        key: 'title',
        value: message(
          messages,
          isDark ? 'darkmode-default-link-tooltip' : 'darkmode-link-tooltip',
          isDark ? '다크 모드 끄기' : '다크 모드 켜기'
        )
      })
    ])
  });
}

export function insertDarkModePersonalTool(items = [], options = {}) {
  const source = Array.isArray(items) ? items.filter(Boolean) : [];
  const withoutExisting = source.filter((item) => item.id !== DARK_MODE_PERSONAL_TOOL_ID);
  const tool = makeDarkModePersonalTool(options);
  const talkIndex = withoutExisting.findIndex((item) => item.id === 'pt-mytalk' || item.id === 'pt-anontalk');
  const insertIndex = talkIndex >= 0 ? talkIndex + 1 : withoutExisting.length;
  return Object.freeze([
    ...withoutExisting.slice(0, insertIndex),
    tool,
    ...withoutExisting.slice(insertIndex)
  ]);
}

export function isDarkModeToggleTarget(target) {
  if (!target || typeof target.closest !== 'function') return null;
  return target.closest(`a.ext-darkmode-link[${DARK_MODE_TOGGLE_ATTRIBUTE}="1"]`);
}

export function toggleTheTreeDarkMode(storeState = {}) {
  const nextTheme = storeState.currentTheme === 'dark' ? 'light' : 'dark';
  if (typeof storeState.localConfigSetValue === 'function') {
    storeState.localConfigSetValue('wiki.theme', nextTheme);
  }
  storeState.currentTheme = nextTheme;
  return nextTheme;
}
