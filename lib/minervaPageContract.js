import { getMinervaFrontPage } from './minervaHostConfig.js';

const ACTION_BY_CONTENT = Object.freeze({
  'document/edit': 'edit',
  'document/editRequest': 'edit',
  'document/closedEditRequest': 'edit',
  'document/history': 'history',
  'document/revert': 'revert',
  'document/backlink': 'backlink',
  'document/acl': 'acl',
  'document/raw': 'raw',
  'document/blame': 'blame',
  'document/move': 'move',
  'document/delete': 'delete'
});

const ARTICLE_CONTENT = new Set([
  'wiki',
  'document/diff',
  'document/discuss',
  'document/closedDiscuss'
]);

const TALK_CONTENT = new Set([
  'document/discuss',
  'document/closedDiscuss'
]);

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

function pageData(context = {}) {
  return context.pageData || context.page?.data || {};
}

function contentName(context = {}) {
  return context.page?.contentName || context.viewData?.contentName || '';
}

function viewName(context = {}) {
  return context.page?.viewName || context.viewData?.viewName || '';
}

function normalizeTitle(value) {
  return String(value || '').trim().replaceAll('_', ' ');
}

export function getMinervaDocumentTitle(document = {}) {
  const namespace = String(document.namespace || '').trim();
  const title = String(document.title || '').trim();
  const showNamespace = namespace && namespace !== '문서' && document.forceShowNamespace !== false;
  return showNamespace ? `${namespace}:${title}` : title;
}

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

function permissionValue(data, name, fallback) {
  const containers = [data.permissions, data.serverData?.permissions];
  for (const container of containers) {
    if (typeof container?.[name] === 'boolean') return container[name];
  }
  return fallback;
}

function subtitle(data = {}, actionKind = 'view') {
  if (data.htmlSubtitle) return data.htmlSubtitle;
  if (data.subtitle) return data.subtitle;
  switch (actionKind) {
    case 'edit':
      if (data.body?.section) return `(r${data.body.baserev} 문단 편집)`;
      if (data.body?.baserev === '0') return '(새 문서 생성)';
      return data.body?.baserev ? `(r${data.body.baserev} 편집)` : '';
    case 'history': return '(역사)';
    case 'backlink': return '(역링크)';
    case 'move': return '(이동)';
    case 'delete': return '(삭제)';
    case 'acl': return '(ACL)';
    case 'raw': return data.rev ? `(r${data.rev} RAW)` : '(RAW)';
    case 'blame': return data.rev ? `(r${data.rev} Blame)` : '(Blame)';
    case 'revert': return data.rev ? `(r${data.rev}로 되돌리기)` : '(되돌리기)';
    default: return '';
  }
}

export function makeMinervaPageContract(context = {}) {
  const data = pageData(context);
  const document = data.document || null;
  const content = contentName(context);
  const view = viewName(context);
  const actionKind = ACTION_BY_CONTENT[content] || ACTION_BY_CONTENT[`document/${view}`] || 'view';
  const isDiffPage = content === 'document/diff' || view === 'diff';
  const isNotFound = content === 'notfound' || view === 'notfound';
  const hasDocument = !!document;
  const exists = hasDocument && !isNotFound && !data.error;
  const isTalkPage = TALK_CONTENT.has(content) || view === 'thread_list' || view === 'thread_list_close';
  const isArticle = exists && ARTICLE_CONTENT.has(content || 'wiki');
  const isAuthenticated = context.session?.account?.type === 1;
  const documentTitle = getMinervaDocumentTitle(document || {});
  const isMainPage = hasDocument && !data.error &&
    normalizeTitle(documentTitle) === normalizeTitle(getMinervaFrontPage(context.config || {}));
  const isUserPage = exists && ['사용자', '아이피사용자', '삭제된사용자'].includes(String(document?.namespace || ''));
  const namespaceKind = isTalkPage ? 'talk' : 'subject';
  const resolvedNamespaceId = namespaceId(document || {}, namespaceKind);
  const isCurrentRevision = !data.rev && !context.route?.query?.uuid;
  const showPageActions = hasDocument && !data.error && actionKind === 'view' && (isArticle || isNotFound);
  const showPageTabs = (showPageActions && !isMainPage) || actionKind === 'history';
  const showHistoryLink = isArticle && actionKind === 'view' && !isDiffPage;
  const pageClass = isMainPage ? 'page-Main_Page' : `page-${cssPageName(documentTitle || context.page?.title || content)}`;
  const rootTitle = String(documentTitle || '').split('/')[0];
  const bodyClasses = [
    pageClass,
    `rootpage-${cssPageName(isMainPage ? 'Main Page' : rootTitle || context.page?.title || content)}`,
    ...(isAuthenticated ? ['is-authenticated'] : []),
    ...(isDiffPage ? ['mw-article-diff'] : []),
    ...(isNotFound ? ['mw-article-new'] : []),
    ...(showPageActions ? ['minerva--history-page-action-enabled'] : [])
  ];

  return Object.freeze({
    hasDocument,
    exists,
    isDocumentPage: exists,
    isArticle,
    isSpecialPage: !hasDocument,
    isTalkPage,
    isMainPage,
    isUserPage,
    isDiffPage,
    isCurrentRevision,
    isAuthenticated,
    canUseDocumentTitle: hasDocument && !data.error,
    canUseUserHeading: isUserPage && (
      String(document?.namespace || '') === '아이피사용자' || !!data.user?.uuid
    ),
    canRequestEdit: !isNotFound,
    canEdit: hasDocument && !data.error && permissionValue(data, 'edit', data.editable !== false),
    canHistory: hasDocument && !data.error && permissionValue(data, 'history', true),
    canWatch: exists && isAuthenticated && typeof data.starred === 'boolean',
    watchable: exists,
    canMove: exists && permissionValue(data, 'move', true),
    canDelete: exists && permissionValue(data, 'delete', true),
    canAcl: exists && permissionValue(data, 'acl', true),
    showPageActions,
    showPageTabs,
    showHistoryLink,
    showLastModifiedFooter: isArticle && actionKind === 'view',
    historyLinkMode: isMainPage || !isCurrentRevision ? 'generic' : 'relative',
    namespaceId: resolvedNamespaceId,
    namespaceKind,
    actionKind,
    hostViewName: view,
    hostContentName: content,
    pageClass,
    bodyClasses: Object.freeze(bodyClasses),
    defaultSubtitleHtml: subtitle(data, actionKind)
  });
}

export function getMinervaPageContract(context = {}) {
  return context.pageContract || makeMinervaPageContract(context);
}
