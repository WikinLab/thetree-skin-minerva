import {
  getTheTreeDocumentTitle,
  getTheTreeHostPageContract
} from './thetreeHostPageContract.js';
import { hasMinervaMobileFrontend } from './minervaMobileFrontend.js';
import { resolveMinervaFeatureProfile } from './minervaFeatureProfile.js';

const NAMESPACE_IDS = Object.freeze({
  '': 0,
  '문서': 0,
  '토론': 1,
  '사용자': 2,
  '사용자토론': 3,
  '아이피사용자': 2,
  '아이피사용자토론': 3,
  '삭제된사용자': 2,
  '파일': 6,
  '파일토론': 7,
  '틀': 10,
  '틀토론': 11,
  '분류': 14,
  '분류토론': 15
});

function namespaceId(document = {}, namespaceKind = 'subject') {
  const numericCandidates = [document.namespaceId, document.namespace_id, document.ns];
  for (const candidate of numericCandidates) {
    const value = Number(candidate);
    if (Number.isInteger(value)) return namespaceKind === 'talk' && value % 2 === 0 ? value + 1 : value;
  }

  const namespace = String(document.namespace || '').trim();
  const resolved = NAMESPACE_IDS[namespace] ?? 0;
  return namespaceKind === 'talk' && resolved % 2 === 0 ? resolved + 1 : resolved;
}

function cssPageName(value) {
  return String(value || '')
    .trim()
    .replaceAll(' ', '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '_') || 'Special';
}

export const getMinervaDocumentTitle = getTheTreeDocumentTitle;

export function makeMinervaPageContract(context = {}) {
  const host = getTheTreeHostPageContract(context);
  const data = host.pageData;
  const document = host.document;
  const namespaceKind = !host.hasDocument ? 'special' : host.isTalkPage ? 'talk' : 'subject';
  const resolvedNamespaceId = !host.hasDocument ? -1 : namespaceId(document || {}, namespaceKind);
  const hasMobileFrontend = hasMinervaMobileFrontend(context);
  const isAccessibleUserPage = [2, 3].includes(resolvedNamespaceId) && (
    ['아이피사용자', '아이피사용자토론'].includes(String(document?.namespace || '')) ||
    !!data.user?.uuid
  );
  const features = resolveMinervaFeatureProfile(context, {
    isAccessibleUserPage,
    isDiffPage: host.isDiffPage,
    isAuthenticated: host.isAuthenticated
  });

  // MinervaPagePermissions gives the main page only language, talk and history actions.
  const canEdit = host.canEdit && !host.isMainPage;
  const canHistory = host.exists && host.canHistory;
  const watchable = host.exists && !host.isMainPage;
  const canMove = host.canMove && !host.isMainPage;
  const canDelete = host.canDelete && !host.isMainPage;
  const canAcl = host.canAcl && !host.isMainPage;
  const showPageActions = host.hasDocument && !host.hasError && host.actionKind === 'view' &&
    (host.isArticle || host.isNotFound);
  const showPageTabs = (
    (showPageActions && !host.isMainPage && features.talkAtTop) ||
    ((!host.hasDocument || host.actionKind === 'history') && features.tabsOnSpecials)
  );
  const showHistoryInPageActions = features.historyInPageActions;
  const showOverflowInPageActions = features.overflowSubmenu;
  const showHistoryLink = host.isArticle && host.actionKind === 'view' && !host.isDiffPage;
  const pageClass = host.isMainPage
    ? 'page-Main_Page'
    : `page-${cssPageName(host.documentTitle || context.page?.title || host.hostContentName)}`;
  const rootTitle = String(host.documentTitle || '').split('/')[0];
  const bodyClasses = [
    pageClass,
    `rootpage-${cssPageName(host.isMainPage ? 'Main Page' : rootTitle || context.page?.title || host.hostContentName)}`,
    ...(host.isAuthenticated ? ['is-authenticated'] : []),
    ...(canEdit ? ['mw-editable'] : []),
    ...(host.isDiffPage ? ['mw-article-diff'] : []),
    ...(host.isNotFound ? ['mw-article-new'] : []),
    ...(showPageActions && showHistoryInPageActions ? ['minerva--history-page-action-enabled'] : [])
  ];

  return Object.freeze({
    hasDocument: host.hasDocument,
    exists: host.exists,
    isDocumentPage: host.exists,
    isArticle: host.isArticle,
    isSpecialPage: !host.hasDocument,
    isTalkPage: host.isTalkPage,
    isMainPage: host.isMainPage,
    isUserPage: host.isUserPage,
    isDiffPage: host.isDiffPage,
    isCurrentRevision: host.isCurrentRevision,
    isAuthenticated: host.isAuthenticated,
    isAccessibleUserPage,
    mobileFrontendMode: context.mobileFrontendMode,
    hasMobileFrontend,
    canUseDocumentTitle: host.hasDocument && !host.hasError,
    canUseUserHeading: host.isUserPage && isAccessibleUserPage,
    canRequestEdit: !host.isNotFound,
    canEdit,
    canHistory,
    canWatch: watchable && host.isAuthenticated && host.hasWatchState,
    watchable,
    canMove,
    canDelete,
    canAcl,
    showPageActions,
    showPageTabs,
    showHistoryInPageActions,
    showOverflowInPageActions,
    showAdvancedMainMenu: features.advancedMainMenu,
    showPersonalMenu: features.personalMenu,
    showCategories: features.categories,
    showHistoryLink,
    showLastModifiedFooter: host.isArticle && host.actionKind === 'view',
    historyLinkMode: host.isMainPage || !host.isCurrentRevision ? 'generic' : 'relative',
    namespaceId: resolvedNamespaceId,
    namespaceKind,
    actionKind: host.actionKind,
    hostViewName: host.hostViewName,
    hostContentName: host.hostContentName,
    pageClass,
    bodyClasses: Object.freeze(bodyClasses),
    defaultSubtitleHtml: host.defaultSubtitleHtml,
    features
  });
}

export function getMinervaPageContract(context = {}) {
  return context.pageContract || makeMinervaPageContract(context);
}
