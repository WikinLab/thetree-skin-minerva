import { settingsToggleAttributes } from './adapters/thetree-settings.js';
import {
  MINERVA_MAIN_MENU_POLICY,
  MINERVA_NAMESPACE_POLICY,
  MINERVA_NOTIFICATION_POLICY,
  MINERVA_PAGE_ACTION_POLICY,
  MINERVA_PERSONAL_TOOL_POLICY,
  MINERVA_SETTINGS_POLICY,
  MINERVA_SITE_LINK_POLICY,
  projectMinervaFeature,
  resolveMinervaSessionIcon,
  shouldShowMinervaLanguageButton
} from './minervaHostAdapterPolicy.js';
import { getMinervaConfiguredString } from './minervaHostConfig.js';
import { resolveMinervaMobileFrontendMode } from './minervaMobileFrontend.js';
import { getMinervaPageContract, makeMinervaPageContract } from './minervaPageContract.js';
import { getTheTreeHostFeature } from './thetreeHostFeatureCatalog.js';
import { makeTheTreeHostPageContract } from './thetreeHostPageContract.js';

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function makeMinervaAdapterContext({ storeState = {}, route = {}, linkBuilders = {} } = {}) {
  const page = storeState.page || {};
  const baseContext = {
    page,
    pageData: page.data || {},
    viewData: storeState.viewData || {},
    config: storeState.config || {},
    session: storeState.session || {},
    localConfig: storeState.localConfig || {},
    currentTheme: storeState.currentTheme || 'light',
    route,
    linkBuilders,
    mobileFrontendMode: resolveMinervaMobileFrontendMode(page.data || {})
  };
  const hostPageContract = makeTheTreeHostPageContract(baseContext);
  const contextWithHostContract = { ...baseContext, hostPageContract };
  return Object.freeze({
    ...contextWithHostContract,
    pageContract: makeMinervaPageContract(contextWithHostContract)
  });
}

export function getMinervaPageData(context = {}) {
  return context.pageData || context.page?.data || {};
}

export function getMinervaDocument(context = {}) {
  return getMinervaPageData(context).document || null;
}

export function getMinervaAccount(context = {}) {
  return context.session?.account || {};
}

export function isMinervaLoggedIn(context = {}) {
  return getMinervaPageContract(context).isAuthenticated;
}

export function getMinervaSearchQuery(context = {}) {
  return context.route?.query?.q || '';
}

function callBuilder(context, name, ...args) {
  const builder = context.linkBuilders?.[name];
  return typeof builder === 'function' ? builder(...args) : null;
}

export function makeMinervaDocumentActionTarget(context, documentOrTitle, action, query = {}) {
  return callBuilder(context, 'documentAction', documentOrTitle, action, query) || '/';
}

export function makeMinervaUserDocumentTarget(context, userName, accountType = 1) {
  return callBuilder(context, 'userDocument', userName, accountType) || {
    namespace: accountType === 1 ? '사용자' : '아이피사용자',
    title: userName || ''
  };
}

export function makeMinervaContributionTarget(context, uuid) {
  return callBuilder(context, 'contribution', uuid) || '/RecentChanges';
}

function normalizeItems(items = []) {
  const seen = new Set();
  return ensureArray(items).filter(Boolean).filter((item) => {
    if (!item.label || item.hidden || item.disabled || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function getMinervaRedirectPath(context = {}) {
  const path = String(context.route?.fullPath || '/');
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

function redirectTarget(context, path) {
  return { path, query: { redirect: getMinervaRedirectPath(context) } };
}

function relevantUserUuid(context = {}) {
  const data = getMinervaPageData(context);
  if (data.user?.uuid) return data.user.uuid;
  if (data.account?.uuid) return data.account.uuid;
  const document = getMinervaDocument(context);
  const account = getMinervaAccount(context);
  const accountName = account.name || account.username || '';
  return document && ['사용자', '아이피사용자', '삭제된사용자'].includes(document.namespace) &&
    account.uuid && accountName === document.title ? account.uuid : null;
}

function personalProjection(sourceId, overrides = {}) {
  const row = MINERVA_PERSONAL_TOOL_POLICY.find((candidate) => candidate.sourceId === sourceId);
  return {
    id: row.target.id,
    label: row.source.label,
    icon: row.target.icon,
    ...overrides
  };
}

export function makeMinervaPersonalMenuItems(context = {}) {
  const account = getMinervaAccount(context);
  const loggedIn = isMinervaLoggedIn(context);
  const accountName = account.name || account.username || '';
  if (!loggedIn) {
    return normalizeItems([
      accountName ? personalProjection('personal.anonymous-talk', {
        to: makeMinervaDocumentActionTarget(
          context,
          makeMinervaUserDocumentTarget(context, accountName, account.type),
          'discuss'
        )
      }) : null,
      account.uuid ? personalProjection('personal.anonymous-contributions', {
        to: makeMinervaContributionTarget(context, account.uuid)
      }) : null,
      personalProjection('personal.login', {
        to: redirectTarget(context, getTheTreeHostFeature('personal.login').route)
      })
    ]);
  }

  const userDocument = makeMinervaUserDocumentTarget(context, accountName, account.type);
  return normalizeItems([
    accountName ? personalProjection('personal.userpage', {
      label: accountName,
      to: makeMinervaDocumentActionTarget(context, userDocument, 'w')
    }) : null,
    accountName ? personalProjection('personal.user-talk', {
      to: makeMinervaDocumentActionTarget(context, userDocument, 'discuss')
    }) : null,
    personalProjection('personal.watchlist', {
      to: getTheTreeHostFeature('personal.watchlist').route
    }),
    account.uuid ? personalProjection('personal.contributions', {
      to: makeMinervaContributionTarget(context, account.uuid)
    }) : null,
    personalProjection('personal.member-info', {
      to: getTheTreeHostFeature('personal.member-info').route
    }),
    personalProjection('personal.logout', {
      to: redirectTarget(context, getTheTreeHostFeature('personal.logout').route)
    })
  ]);
}

export function makeMinervaMainMenuPersonalItems(context = {}) {
  const contract = getMinervaPageContract(context);
  if (contract.showPersonalMenu) return [];
  // Minerva's default main-menu builder exposes only login to anonymous
  // users when the header personal-menu feature is disabled.
  return makeMinervaPersonalMenuItems(context).filter((item) => item.id === 'pt-login');
}

export function makeMinervaNotificationItems(context = {}) {
  if (!isMinervaLoggedIn(context)) return [];
  const count = ensureArray(context.session?.notifications).length;
  const source = MINERVA_NOTIFICATION_POLICY.source;
  const target = MINERVA_NOTIFICATION_POLICY.target;
  return [{
    id: target.id,
    label: count ? `${source.label} (${count >= 5 ? '5+' : count})` : source.label,
    icon: target.icon,
    to: source.route,
    arrayAttributes: [
      { key: 'id', value: 'pt-notifications' },
      { key: 'title', value: count ? `읽지 않은 알림 ${count >= 5 ? '5개 이상' : `${count}개`}` : '알림' }
    ]
  }];
}

export function makeMinervaConfigurationItems(context = {}) {
  const sourceId = isMinervaLoggedIn(context) ? 'personal.settings' : 'personal.anonymous-settings';
  const row = MINERVA_SETTINGS_POLICY.find((candidate) => candidate.sourceId === sourceId);
  return [{
    id: row.target.id,
    label: row.source.label,
    icon: row.target.icon,
    href: '#',
    arrayAttributes: settingsToggleAttributes()
  }];
}

export function makeMinervaSessionMenuItems(context = {}) {
  return normalizeItems(ensureArray(context.session?.menus).map((item, index) => ({
    id: item?.id || `pt-host-${index}`,
    label: typeof item?.t === 'string' ? item.t : '',
    to: item?.l || null,
    icon: resolveMinervaSessionIcon(item),
    hidden: item?.hidden,
    disabled: item?.disabled
  })));
}

export function makeMinervaNavigationItems() {
  return MINERVA_MAIN_MENU_POLICY
    .filter((row) => row.target.group === 'p-navigation')
    .map(projectMinervaFeature);
}

export function makeMinervaInteractionItems() {
  return MINERVA_MAIN_MENU_POLICY
    .filter((row) => row.target.group === 'p-interaction')
    .map(projectMinervaFeature);
}

export function makeMinervaToolboxItems() {
  return MINERVA_MAIN_MENU_POLICY
    .filter((row) => row.sourceId.startsWith('toolbox.'))
    .map(projectMinervaFeature);
}

export function makeMinervaSitelinkItems() {
  return MINERVA_SITE_LINK_POLICY.map(projectMinervaFeature);
}

export function makeMinervaNamespaceItems(context = {}) {
  const contract = getMinervaPageContract(context);
  const document = getMinervaDocument(context);
  if (!document || !contract.showPageTabs) return [];
  const data = getMinervaPageData(context);
  return MINERVA_NAMESPACE_POLICY.map((row) => ({
    id: row.target.id,
    label: row.source.label,
    to: makeMinervaDocumentActionTarget(
      context,
      document,
      row.source.action,
      row.source.namespaceKind === 'subject' && data.uuid ? { uuid: data.uuid } : {}
    ),
    selected: contract.namespaceKind === row.source.namespaceKind
  }));
}

function watchToolbarItem(context) {
  const contract = getMinervaPageContract(context);
  const document = getMinervaDocument(context);
  const data = getMinervaPageData(context);
  if (!contract.watchable || !document) return null;
  const projection = MINERVA_PAGE_ACTION_POLICY.find(
    (row) => row.sourceId === 'document.action.watchstar'
  ).target;
  if (!contract.isAuthenticated) {
    return {
      name: projection.name,
      nodeId: 'ca-watch',
      label: '주시',
      icon: projection.icon,
      to: redirectTarget(context, '/member/login')
    };
  }
  if (typeof data.starred !== 'boolean') return null;
  const watchTarget = makeMinervaDocumentActionTarget(context, document, 'member/star');
  const unwatchTarget = makeMinervaDocumentActionTarget(context, document, 'member/unstar');
  return {
    name: projection.name,
    nodeId: 'ca-watch',
    label: data.starred ? '주시 해제' : '주시',
    icon: data.starred ? 'unStar' : 'star',
    classes: 'mw-watchlink',
    to: data.starred ? unwatchTarget : watchTarget,
    watchstar: { watched: data.starred, watchTarget, unwatchTarget }
  };
}

function toolbarProjection(sourceId) {
  return MINERVA_PAGE_ACTION_POLICY.find((row) => row.sourceId === sourceId).target;
}

export function makeMinervaToolbarItems(context = {}, { hasLanguages = false } = {}) {
  const contract = getMinervaPageContract(context);
  const document = getMinervaDocument(context);
  if (!contract.showPageActions || !document) return [];
  const items = [];
  if (shouldShowMinervaLanguageButton(context, { hasLanguages })) {
    const projection = toolbarProjection('document.action.language');
    items.push({
      name: projection.name,
      label: getTheTreeHostFeature('document.action.language').label,
      icon: projection.icon,
      classes: `language-selector${hasLanguages ? '' : ' disabled'}`,
      href: hasLanguages ? '#p-lang' : ''
    });
  }
  const watch = watchToolbarItem(context);
  if (watch) items.push(watch);
  if (contract.canHistory && contract.showHistoryInPageActions) {
    const projection = toolbarProjection('document.action.history');
    items.push({
      ...projection,
      label: getTheTreeHostFeature('document.action.history').label,
      to: makeMinervaDocumentActionTarget(context, document, 'history')
    });
  }
  if (contract.isUserPage) {
    const uuid = relevantUserUuid(context);
    if (uuid) {
      const projection = toolbarProjection('toolbox.relevant-user-contributions');
      items.push({
        ...projection,
        label: getTheTreeHostFeature('toolbox.relevant-user-contributions').label,
        to: makeMinervaContributionTarget(context, uuid)
      });
    }
  }
  if (contract.canEdit) {
    const projection = toolbarProjection('document.action.edit');
    items.push({
      ...projection,
      label: getTheTreeHostFeature('document.action.edit').label,
      classes: 'edit-page',
      to: makeMinervaDocumentActionTarget(context, document, 'edit')
    });
  }
  return items;
}

export function makeMinervaOverflowItems(context = {}) {
  const contract = getMinervaPageContract(context);
  const document = getMinervaDocument(context);
  if (!contract.showPageActions || !contract.showOverflowInPageActions || !document) return [];
  const data = getMinervaPageData(context);
  const revision = data.uuid ? { uuid: data.uuid } : {};
  return normalizeItems(MINERVA_PAGE_ACTION_POLICY
    .filter((row) => row.target.slot === 'overflow')
    .map((row) => {
      if (row.sourceId === 'document.action.acl' && !contract.canAcl) return null;
      if (['document.action.raw', 'document.action.blame'].includes(row.sourceId) && !contract.exists) return null;
      if (row.sourceId === 'document.action.move' && !contract.canMove) return null;
      if (row.sourceId === 'document.action.delete' && !contract.canDelete) return null;
      const source = getTheTreeHostFeature(row.sourceId);
      const query = ['document.action.raw', 'document.action.blame'].includes(row.sourceId) ? revision : {};
      return {
        ...row.target,
        label: source.label,
        to: makeMinervaDocumentActionTarget(context, document, source.action, query)
      };
    }));
}

export function makeMinervaLanguageItems(context = {}) {
  const data = getMinervaPageData(context);
  const source = ensureArray(data.languages || data.languageLinks || data.interlanguage);
  return source.map((item, index) => {
    if (typeof item === 'string') return { id: `lang-${index}`, label: item, href: '#' };
    const label = item?.label || item?.text || item?.name || item?.title || '';
    if (!label) return null;
    return {
      id: item.id || `lang-${item.lang || index}`,
      label,
      lang: item.lang || item.language || '',
      href: item.href || item.url || null,
      to: item.to || null
    };
  }).filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
}

export function makeMinervaLanguagesHtml(context = {}, items = makeMinervaLanguageItems(context)) {
  const href = (item) => item.href || (
    typeof context.linkBuilders?.href === 'function' && item.to != null
      ? context.linkBuilders.href(item.to)
      : item.to || '#'
  );
  return items.map((item) => (
    `<li id="${escapeHtml(item.id)}"><a href="${escapeHtml(href(item))}"` +
    `${item.lang ? ` lang="${escapeHtml(item.lang)}" hreflang="${escapeHtml(item.lang)}"` : ''}>` +
    `${escapeHtml(item.label)}</a></li>`
  )).join('');
}

function parseFooterItems(html) {
  const raw = String(html || '').trim();
  if (!raw) return [];
  const items = [];
  const pattern = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = pattern.exec(raw))) {
    const id = /\bid=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(match[1] || '');
    items.push({ id: id?.[1] || id?.[2] || id?.[3] || `footer-place-${items.length}`, html: match[2] || '' });
  }
  return items.length ? items : [{ id: 'footer-places-the-tree', html: raw }];
}

export function makeMinervaFooterPlacesData(context = {}) {
  const items = parseFooterItems(getMinervaConfiguredString(context.config || {}, 'footerPlacesHtml', ''));
  return items.length ? { id: 'footer-places', className: null, 'array-items': items } : null;
}
