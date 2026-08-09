/* the tree -> MinervaNeue REL1_46 template-data boundary. */
import { makeMinervaFooterInfoData, makeMinervaLocalDateHtml } from './minervaFooterData.js';
import { getMinervaConfiguredBoolean, getMinervaConfiguredString } from './minervaHostConfig.js';
import {
  MINERVA_MAIN_MENU_GROUP_ORDER,
  MINERVA_SESSION_MENU_POLICY
} from './minervaHostAdapterPolicy.js';
import { getMinervaPageContract } from './minervaPageContract.js';
import {
  ensureArray,
  getMinervaDocument,
  getMinervaPageData,
  getMinervaSearchQuery,
  isMinervaLoggedIn,
  makeMinervaConfigurationItems,
  makeMinervaDocumentActionTarget,
  makeMinervaFooterPlacesData,
  makeMinervaInteractionItems,
  makeMinervaLanguageItems,
  makeMinervaLanguagesHtml,
  makeMinervaMainMenuPersonalItems,
  makeMinervaNamespaceItems,
  makeMinervaNavigationItems,
  makeMinervaNotificationItems,
  makeMinervaOverflowItems,
  makeMinervaPersonalMenuItems,
  makeMinervaSessionMenuItems,
  makeMinervaSitelinkItems,
  makeMinervaToolbarItems,
} from './minervaTheTreeAdapter.js';
import { buildMinervaSkinTitleData, buildMinervaTitleHeadingData } from './minervaTitleData.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
}

function hrefForTarget(context, target, fallback = '#') {
  if (typeof target === 'string' && target) return target;
  if (target == null) return fallback;
  const resolver = context.linkBuilders?.href;
  return typeof resolver === 'function' ? resolver(target) : String(target);
}

function hrefFor(context, item = {}) {
  if (item.href === '') return '';
  return item.href || hrefForTarget(context, item.to);
}

function attributesFor(context, item = {}, extras = []) {
  const attributes = new Map();
  const add = (attribute) => {
    if (!attribute?.key || attribute.key === 'href') return;
    attributes.set(attribute.key, String(attribute.value ?? ''));
  };
  ensureArray(item.arrayAttributes).forEach(add);
  extras.forEach(add);
  if (item.nodeId || item.id) attributes.set('id', item.nodeId || item.id);
  attributes.set('href', hrefFor(context, item));
  if (item.watchstar) {
    attributes.set('data-tt-minerva-watchstar', '1');
    attributes.set('data-watched', item.watchstar.watched ? 'true' : 'false');
    attributes.set('data-watch-href', hrefForTarget(context, item.watchstar.watchTarget));
    attributes.set('data-unwatch-href', hrefForTarget(context, item.watchstar.unwatchTarget));
    attributes.set('aria-pressed', item.watchstar.watched ? 'true' : 'false');
  }
  const href = attributes.get('href');
  attributes.delete('href');
  return [{ key: 'href', value: href }, ...[...attributes].map(([key, value]) => ({ key, value }))];
}

function menuComponent(context, item = {}) {
  return {
    label: item.label || item.text || '',
    classes: [item.classes, item.class, item.selected ? 'selected' : ''].filter(Boolean).join(' '),
    'array-attributes': attributesFor(context, item),
    ...(item.icon ? { 'data-icon': { icon: item.icon } } : {})
  };
}

function menuEntry(context, item = {}) {
  return {
    class: item.selected ? 'selected' : '',
    components: [menuComponent(context, item)]
  };
}

function button(context, item = {}) {
  const label = item.label || item.text || '';
  return {
    'tag-name': 'a',
    isButton: true,
    label,
    classes: [item.classes, item.class].filter(Boolean).join(' '),
    'array-attributes': attributesFor(context, item, [{ key: 'title', value: label }]),
    ...(item.icon ? { 'data-icon': { icon: item.icon } } : {})
  };
}

function group(context, id, items) {
  const entries = ensureArray(items).filter(Boolean).map((item) => menuEntry(context, item));
  return entries.length ? { id, entries } : null;
}

function pageActions(context, hasLanguages) {
  const contract = getMinervaPageContract(context);
  if (!contract.showPageActions) return null;
  const toolbar = makeMinervaToolbarItems(context, { hasLanguages }).map((item) => ({
    name: item.name,
    components: [button(context, item)]
  }));
  const overflowItems = makeMinervaOverflowItems(context).map((item) => menuEntry(context, item));
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
        listID: 'p-tb',
        listClass: 'page-actions-overflow-list toggle-list__list--drop-down',
        items: overflowItems
      }
    } : {})
  };
}

function tabs(context) {
  if (!getMinervaPageContract(context).showPageTabs) return null;
  const items = makeMinervaNamespaceItems(context).map((item) => ({
    href: hrefFor(context, item),
    rel: item.id === 'ca-talk' ? 'discussion' : '',
    text: item.label,
    class: item.selected ? 'selected' : '',
    context: item.id
  }));
  return items.length ? { id: 'p-associated-pages', items } : null;
}

function mainMenu(context) {
  const contract = getMinervaPageContract(context);
  const navigation = makeMinervaNavigationItems(context);
  const interaction = contract.showAdvancedMainMenu ? makeMinervaInteractionItems(context) : [];
  const mainPersonal = makeMinervaMainMenuPersonalItems(context);
  const configuration = makeMinervaConfigurationItems(context);
  const sitelinks = makeMinervaSitelinkItems(context);
  const reservedIds = new Set([
    ...MINERVA_MAIN_MENU_GROUP_ORDER,
    ...[
      ...navigation,
      ...configuration,
      ...interaction,
      ...mainPersonal,
      ...sitelinks,
      ...makeMinervaPersonalMenuItems(context),
      ...makeMinervaNotificationItems(context)
    ].map((item) => item.id)
  ]);
  const hostItems = makeMinervaSessionMenuItems(context).filter((item) => !reservedIds.has(item.id));
  const groupItems = new Map([
    ['p-navigation', navigation],
    [MINERVA_SESSION_MENU_POLICY.target.group, [...interaction, ...hostItems]],
    ['p-personal', mainPersonal],
    ['pt-preferences', configuration]
  ]);
  return {
    groups: MINERVA_MAIN_MENU_GROUP_ORDER
      .map((id) => group(context, id, groupItems.get(id)))
      .filter(Boolean),
    sitelinks: sitelinks.map((item) => menuEntry(context, item))
  };
}

function personalMenu(context) {
  if (!getMinervaPageContract(context).showPersonalMenu) return null;
  const items = makeMinervaPersonalMenuItems(context).map((item) => menuEntry(context, item));
  if (!items.length) return null;
  return {
    class: 'minerva-user-menu',
    checkboxID: 'minerva-user-menu-checkbox',
    toggleID: 'minerva-user-menu-toggle',
    listID: 'p-personal',
    listClass: 'minerva-user-menu-list toggle-list__list--drop-down',
    event: 'ui.usermenu',
    'data-btn': {
      'tag-name': 'label',
      label: '사용자 메뉴',
      classes: 'toggle-list__toggle',
      'data-icon': { icon: 'userAvatarOutline' },
      'array-attributes': [
        { key: 'id', value: 'minerva-user-menu-toggle' },
        { key: 'for', value: 'minerva-user-menu-checkbox' },
        { key: 'aria-hidden', value: 'true' }
      ]
    },
    items
  };
}

function notificationData(context) {
  const buttons = makeMinervaNotificationItems(context).map((item) => button(context, item));
  return buttons.length ? { 'array-buttons': buttons } : null;
}

function searchBox(context, siteName) {
  const query = getMinervaSearchQuery(context);
  return {
    'form-action': '/Search',
    'page-title': '특수:검색',
    'html-input-attributes': [
      'name="search"',
      'type="search"',
      `placeholder="${escapeHtml(siteName)} 검색"`,
      `aria-label="${escapeHtml(siteName)} 검색"`,
      'autocapitalize="none"',
      'spellcheck="false"',
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

function siteNoticeBanner(siteNotice) {
  const html = String(siteNotice || '').trim();
  if (!html) return '<div id="siteNotice"></div>';
  if (/<[^>]+\bid=(?:"siteNotice"|'siteNotice'|siteNotice)(?:\s|>)/i.test(html)) return html;
  return '<div id="siteNotice"><div id="localNotice" data-nosnippet="">' +
    `<div class="sitenotice">${html}</div></div></div>`;
}

function historyLink(context) {
  const contract = getMinervaPageContract(context);
  const data = getMinervaPageData(context);
  const document = getMinervaDocument(context);
  if (!contract.showHistoryLink || !document) return null;
  const generic = contract.historyLinkMode === 'generic' || !data.date;
  return {
    href: hrefForTarget(context, makeMinervaDocumentActionTarget(context, document, 'history')),
    text: generic
      ? '역사 보기'
      : `마지막 편집: ${makeMinervaLocalDateHtml(data.date).replace(/<[^>]+>/g, '')}`,
    ...(!generic ? { 'data-timestamp': String(data.date) } : {}),
    historyIcon: { icon: 'modified-history', size: 'medium' },
    arrowIcon: { icon: 'expand', size: 'small' }
  };
}

function secondaryActions(context, hasLanguages, contract, pageTitle) {
  if (contract.actionKind === 'edit' || contract.isUserPage) return null;
  const document = getMinervaDocument(context);
  const actions = {};
  if (document && contract.isMainPage && !contract.isTalkPage && contract.isAuthenticated) {
    actions.talk = {
      'tag-name': 'a',
      isButton: true,
      label: '토론',
      classes: 'talk button',
      'array-attributes': [
        { key: 'href', value: hrefForTarget(context, makeMinervaDocumentActionTarget(context, document, 'discuss')) },
        { key: 'data-title', value: pageTitle }
      ]
    };
  }
  if (hasLanguages && contract.isMainPage) {
    actions.language = {
      'tag-name': 'a',
      isButton: true,
      label: '언어',
      classes: 'language-selector button',
      'array-attributes': [{ key: 'href', value: '#p-lang' }]
    };
  }
  return Object.keys(actions).length ? actions : null;
}

function footerData(context, logo) {
  return {
    'data-logos': logo,
    'data-icons': null,
    'data-info': makeMinervaFooterInfoData(context.page, getMinervaPageContract(context)),
    'data-places': makeMinervaFooterPlacesData(context)
    // html-after-content is intentionally inherited from the root slot context.
  };
}

export function makeMinervaSkinData(context = {}) {
  const contract = getMinervaPageContract(context);
  const title = buildMinervaTitleHeadingData(context.page, contract);
  const titleMeta = buildMinervaSkinTitleData(context.page, context.config, contract);
  const siteName = getMinervaConfiguredString(context.config || {}, 'siteName', 'the tree');
  const data = getMinervaPageData(context);
  const languages = getMinervaConfiguredBoolean(context.config, 'hideInterlanguageLinks', true)
    ? []
    : makeMinervaLanguageItems(context);
  const languagesHtml = makeMinervaLanguagesHtml(context, languages);
  const siteNotice = getMinervaConfiguredString(context.config || {}, 'siteNoticeHtml', '');
  const siteNoticeHtml = siteNoticeBanner(siteNotice);
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
    'array-minerva-banners': [siteNoticeHtml],
    'data-minerva-search-box': searchBox(context, siteName),
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
    'data-minerva-main-menu': mainMenu(context),
    'data-donation-banner': null,
    'html-minerva-tagline': `<div class="tagline">${escapeHtml(titleMeta['msg-tagline'] || '')}</div>`,
    'html-minerva-user-menu': personalMenu(context),
    'data-minerva-notifications': notificationData(context),
    'data-minerva-tabs': tabs(context),
    'data-minerva-page-actions': pageActions(context, languages.length > 0),
    'data-minerva-secondary-actions': secondaryActions(context, languages.length > 0, contract, title['page-title']),
    'html-minerva-subject-link': '',
    'data-minerva-history-link': historyLink(context),
    'html-site-notice': siteNoticeHtml,
    'html-title-heading': '',
    'html-user-message': '',
    'html-body-content': '',
    'html-categories': contract.showCategories ? data.categories_html || data.categoriesHtml || '' : '',
    'html-subtitle': titleMeta['html-subtitle'] || '',
    'data-portlets': {
      'data-dock-bottom': null,
      'data-languages': languages.length ? { id: 'p-lang', 'html-items': languagesHtml } : null,
      'data-variants': null
    },
    'has-minerva-languages': languages.length > 0,
    'data-footer': footerData(context, logo)
  };
}

export function makeMinervaPersonalMenuData(context = {}) {
  return personalMenu(context);
}

export { isMinervaLoggedIn };
