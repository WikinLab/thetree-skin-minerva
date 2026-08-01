/*
 * the tree -> MinervaNeue REL1_46 template-data boundary.
 *
 * Minerva owns the generated Mustache DOM. This module only translates host
 * state, routes, permissions and messages into the keys consumed by that DOM.
 */
import { makeFooterInfoData, makeLocalDateHtml } from './legacyFooterData';
import { getConfiguredString } from './legacyHostAdapterPolicy';
import {
  ensureArray,
  getLegacyAccount,
  getLegacyDocument,
  getLegacyPageData,
  getLegacySearchQuery,
  isLegacyAccountLoggedIn,
  makeActionItems,
  makeLanguageItems,
  makeNamespaceItems,
  makePersonalToolsItems,
  makeSidebarNavigationItems,
  makeSidebarPersonalItems,
  makeSidebarToolboxItems,
  makeViewItems
} from './legacyTheTreeAdapter';
import { buildLegacySkinTitleData, buildLegacyTitleHeadingData } from './legacyTitleData';
import { MINERVA_THEME_TOGGLE_ATTRIBUTE } from './adapters/minerva-theme';

const ICON_BY_ITEM = Object.freeze({
  'n-mainpage': 'home',
  'n-recentchanges': 'recentChanges',
  'n-recentdiscuss': 'speechBubbles',
  'n-randompage': 'die',
  't-whatlinkshere': 'link',
  't-specialpages': 'specialPages',
  'pt-login': 'logIn',
  'pt-logout': 'logOut',
  'pt-userpage': 'userAvatar',
  'pt-mytalk': 'userTalk',
  'pt-anontalk': 'userTalk',
  'pt-preferences': 'settings',
  'pt-watchlist': 'watchlist',
  'pt-mycontris': 'userContributions',
  'pt-anoncontribs': 'userContributions',
  'ca-edit': 'edit',
  'ca-history': 'history',
  'ca-watch': 'star',
  'ca-unwatch': 'unStar',
  'ca-talk': 'speechBubbleAdd',
  'ca-backlink': 'link',
  'ca-move': 'move',
  'ca-delete': 'trash'
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
}

function hrefFor(context, item = {}) {
  if (typeof item.href === 'string' && item.href) return item.href;
  if (item.to == null) return '#';
  const resolver = context.linkBuilders?.href;
  return typeof resolver === 'function' ? resolver(item.to) : String(item.to);
}

function attributesFor(context, item = {}, extras = []) {
  const attributes = [...ensureArray(item.arrayAttributes), ...extras]
    .filter((attribute) => attribute?.key && attribute.key !== 'href')
    .map((attribute) => ({ key: attribute.key, value: String(attribute.value ?? '') }));
  attributes.unshift({ key: 'href', value: hrefFor(context, item) });
  return attributes;
}

function menuComponent(context, item, icon = ICON_BY_ITEM[item.id]) {
  return {
    label: item.label || item.text || '',
    classes: [item.class, item.selected ? 'selected' : ''].filter(Boolean).join(' '),
    'array-attributes': attributesFor(context, item),
    ...(icon ? { 'data-icon': { icon } } : {})
  };
}

function menuEntry(context, item, icon) {
  return {
    class: item.selected ? 'selected' : '',
    components: [menuComponent(context, item, icon)]
  };
}

function button(context, item, icon, classes = '') {
  const label = item.label || item.text || '';
  return {
    'tag-name': 'a',
    isButton: true,
    label,
    classes: [classes, item.class, item.selected ? 'selected' : ''].filter(Boolean).join(' '),
    'array-attributes': attributesFor(context, item, [
      { key: 'title', value: label }
    ]),
    ...(icon ? { 'data-icon': { icon } } : {})
  };
}

function group(context, id, items) {
  const entries = ensureArray(items).filter(Boolean).map((item) => menuEntry(context, item));
  return entries.length ? { id, entries } : null;
}

function pageActions(context) {
  const pageContract = context.pageContract || {};
  if (!pageContract.isDocumentPage || pageContract.actionKind === 'edit') return null;
  const views = makeViewItems(context);
  const actions = makeActionItems(context);
  const byId = new Map([...views, ...actions].map((item) => [item.id, item]));
  const toolbarOrder = ['ca-watch', 'ca-unwatch', 'ca-history', 'ca-edit'];
  const toolbar = toolbarOrder
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((item) => ({
      name: item.id,
      components: [button(context, item, ICON_BY_ITEM[item.id], 'page-action')]
    }));
  const toolbarIds = new Set(toolbar.map((entry) => entry.name));
  const overflowItems = [...actions, ...makeSidebarToolboxItems(context)]
    .filter((item) => !toolbarIds.has(item.id))
    .map((item) => menuEntry(context, item));
  return {
    toolbar,
    ...(overflowItems.length ? {
      overflowMenu: {
        'item-id': 'page-actions-overflow',
        checkboxID: 'page-actions-overflow-checkbox',
        toggleID: 'page-actions-overflow-toggle',
        event: 'ui.overflowmenu',
        'data-btn': {
          'tag-name': 'label',
          label: '더 보기',
          classes: 'toggle-list__toggle',
          'data-icon': { icon: 'ellipsis' },
          'array-attributes': [
            { key: 'id', value: 'page-actions-overflow-toggle' },
            { key: 'for', value: 'page-actions-overflow-checkbox' },
            { key: 'aria-hidden', value: 'true' }
          ]
        },
        listID: 'p-cactions',
        listClass: 'page-actions-overflow-list toggle-list__list--drop-down',
        items: overflowItems
      }
    } : {})
  };
}

function tabs(context) {
  const items = makeNamespaceItems(context).map((item) => ({
    href: hrefFor(context, item),
    rel: item.id === 'ca-talk' ? 'discussion' : '',
    text: item.label,
    class: item.selected ? 'selected' : '',
    context: item.id
  }));
  return items.length ? { id: 'p-associated-pages', items } : null;
}

function mainMenu(context, personalItems) {
  const groups = [
    group(context, 'p-navigation', makeSidebarNavigationItems()),
    group(context, 'p-personal', [...personalItems, ...makeSidebarPersonalItems(context)]),
    group(context, 'p-tb', makeSidebarToolboxItems(context))
  ].filter(Boolean);
  return { groups, sitelinks: [] };
}

function personalMenu(context, personalItems) {
  const items = personalItems.map((item) => menuEntry(context, item));
  if (!items.length) return null;
  return {
    class: 'minerva-user-menu',
    checkboxID: 'minerva-user-menu-checkbox',
    toggleID: 'minerva-user-menu-toggle',
    listID: 'p-personal-header',
    listClass: 'toggle-list__list--drop-down',
    event: 'ui.usermenu',
    'data-btn': {
      'tag-name': 'label',
      label: '사용자 메뉴',
      classes: 'toggle-list__toggle',
      'data-icon': { icon: 'userAvatar' },
      'array-attributes': [
        { key: 'id', value: 'minerva-user-menu-toggle' },
        { key: 'for', value: 'minerva-user-menu-checkbox' },
        { key: 'aria-hidden', value: 'true' }
      ]
    },
    items
  };
}

function themeItem(context) {
  const isDark = context.currentTheme === 'dark';
  return {
    id: 'pt-minerva-theme',
    label: isDark ? '밝은 모드' : '어두운 모드',
    href: '#',
    arrayAttributes: [
      { key: MINERVA_THEME_TOGGLE_ATTRIBUTE, value: '1' },
      { key: 'title', value: isDark ? '밝은 모드로 전환' : '어두운 모드로 전환' }
    ]
  };
}

function searchBox(context) {
  const query = getLegacySearchQuery(context);
  return {
    'form-action': '/Search',
    'page-title': '특수:검색',
    'html-input-attributes': [
      'name="search"',
      'type="search"',
      'placeholder="검색"',
      'aria-label="검색"',
      `value="${escapeHtml(query)}"`
    ].join(' '),
    'data-btn': {
      label: '검색',
      classes: 'skin-minerva-search-trigger',
      'data-icon': { icon: 'search' },
      'array-attributes': [{ key: 'id', value: 'searchIcon' }]
    }
  };
}

function footerData(context, titleData) {
  return {
    'data-logos': titleData['data-logos'],
    'data-icons': null,
    'data-info': makeFooterInfoData(context.page, context.pageContract),
    'data-places': null,
    'html-after-content': ''
  };
}

function historyLink(context) {
  const document = getLegacyDocument(context);
  const pageData = getLegacyPageData(context);
  if (!document || !pageData.date) return null;
  const item = makeViewItems(context).find((candidate) => candidate.id === 'ca-history');
  if (!item) return null;
  return {
    href: hrefFor(context, item),
    text: `마지막 편집: ${makeLocalDateHtml(pageData.date).replace(/<[^>]+>/g, '')}`,
    'data-timestamp': String(pageData.date),
    historyIcon: { icon: 'history', size: 'medium' },
    arrowIcon: { icon: 'next', size: 'small' }
  };
}

export function makeMinervaSkinData(context = {}) {
  const title = buildLegacyTitleHeadingData(context.page, context.pageContract);
  const titleMeta = buildLegacySkinTitleData(context.page, context.config, context.pageContract);
  const siteName = getConfiguredString(context.config || {}, 'siteName', 'the tree');
  const personalItems = [...makePersonalToolsItems(context), themeItem(context)];
  const pageData = getLegacyPageData(context);
  const languages = makeLanguageItems(context);
  const logo = { 'msg-sitetitle': siteName, wordmark: null };
  return {
    ...title,
    ...titleMeta,
    'is-title-blank': !title['page-title'],
    'data-logos': logo,
    'link-mainpage': '/',
    'msg-sitetitle': siteName,
    'msg-minerva-user-navigation': '사용자 메뉴',
    'msg-minerva-page-actions-language-switcher': '언어',
    'msg-mobile-frontend-languages-not-available': '사용 가능한 다른 언어가 없습니다.',
    'array-minerva-banners': [getConfiguredString(context.config || {}, 'siteNoticeHtml', '')].filter(Boolean),
    'data-minerva-search-box': searchBox(context),
    'data-minerva-main-menu-btn': {
      'tag-name': 'label',
      label: '주 메뉴',
      text: '주 메뉴',
      classes: 'toggle-list__toggle',
      'data-icon': { icon: 'menu' },
      'array-attributes': [
        { key: 'for', value: 'main-menu-input' },
        { key: 'id', value: 'mw-mf-main-menu-button' },
        { key: 'aria-hidden', value: 'true' }
      ]
    },
    'data-minerva-main-menu': mainMenu(context, personalItems),
    'data-donation-banner': null,
    'html-minerva-tagline': `<div class="tagline">${escapeHtml(titleMeta['msg-tagline'] || '')}</div>`,
    'html-minerva-user-menu': personalMenu(context, personalItems),
    'data-minerva-notifications': null,
    'data-minerva-tabs': tabs(context),
    'data-minerva-page-actions': pageActions(context),
    'data-minerva-secondary-actions': null,
    'html-minerva-subject-link': '',
    'data-minerva-history-link': historyLink(context),
    'html-site-notice': getConfiguredString(context.config || {}, 'siteNoticeHtml', ''),
    'html-title-heading': '',
    'html-user-message': '',
    'html-body-content': '',
    'html-categories': pageData.categories_html || pageData.categoriesHtml || '',
    'html-subtitle': titleMeta['html-subtitle'] || '',
    'data-portlets': {
      'data-dock-bottom': null,
      'data-languages': { id: 'p-lang', 'array-items': languages },
      'data-variants': { id: 'p-variants', 'array-items': [] }
    },
    'has-minerva-languages': languages.length > 0,
    'data-footer': footerData(context, { 'data-logos': logo })
  };
}

export function makeMinervaPersonalMenuData(context = {}) {
  return personalMenu(context, [...makePersonalToolsItems(context), themeItem(context)]);
}

export function isMinervaLoggedIn(context = {}) {
  return isLegacyAccountLoggedIn(context) && !!getLegacyAccount(context);
}
