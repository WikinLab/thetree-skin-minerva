/* Skin-neutral the tree page/session facts. Skin layout decisions belong elsewhere. */

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

function configuredFrontPage(config = {}) {
  for (const key of ['wiki.front_page', 'front_page']) {
    const value = config?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'FrontPage';
}

function permissionValue(data, name, fallback) {
  for (const container of [data.permissions, data.serverData?.permissions]) {
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

export function getTheTreeDocumentTitle(document = {}) {
  const namespace = String(document.namespace || '').trim();
  const title = String(document.title || '').trim();
  const showNamespace = namespace && namespace !== '문서' && document.forceShowNamespace !== false;
  return showNamespace ? `${namespace}:${title}` : title;
}

export function makeTheTreeHostPageContract(context = {}) {
  const data = pageData(context);
  const document = data.document || null;
  const content = contentName(context);
  const view = viewName(context);
  const actionKind = ACTION_BY_CONTENT[content] || ACTION_BY_CONTENT[`document/${view}`] || 'view';
  const isDiffPage = content === 'document/diff' || view === 'diff';
  const isNotFound = content === 'notfound' || view === 'notfound';
  const hasDocument = !!document;
  const hasError = !!data.error;
  const exists = hasDocument && !isNotFound && !hasError;
  const isTalkPage = TALK_CONTENT.has(content) || view === 'thread_list' || view === 'thread_list_close';
  const isArticle = exists && ARTICLE_CONTENT.has(content || 'wiki');
  const isAuthenticated = context.session?.account?.type === 1;
  const documentTitle = getTheTreeDocumentTitle(document || {});
  const isMainPage = hasDocument && !hasError &&
    normalizeTitle(documentTitle) === normalizeTitle(configuredFrontPage(context.config || {}));
  const isUserPage = exists && ['사용자', '아이피사용자', '삭제된사용자'].includes(
    String(document?.namespace || '')
  );

  return Object.freeze({
    pageData: data,
    document,
    documentTitle,
    hostViewName: view,
    hostContentName: content,
    actionKind,
    hasDocument,
    hasError,
    exists,
    isNotFound,
    isArticle,
    isTalkPage,
    isMainPage,
    isUserPage,
    isDiffPage,
    isAuthenticated,
    isCurrentRevision: !data.rev && !context.route?.query?.uuid,
    canEdit: hasDocument && !hasError && permissionValue(data, 'edit', data.editable !== false),
    canHistory: hasDocument && !hasError && permissionValue(data, 'history', true),
    canMove: exists && permissionValue(data, 'move', true),
    canDelete: exists && permissionValue(data, 'delete', true),
    canAcl: exists && permissionValue(data, 'acl', true),
    hasWatchState: typeof data.starred === 'boolean',
    defaultSubtitleHtml: subtitle(data, actionKind)
  });
}

export function getTheTreeHostPageContract(context = {}) {
  return context.hostPageContract || makeTheTreeHostPageContract(context);
}
