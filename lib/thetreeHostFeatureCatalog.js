/* Skin-neutral the tree feature facts consumed by skin projection policies. */

function feature(id, definition) {
  return Object.freeze({ id, system: 'thetree', ...definition });
}

export const THETREE_HOST_FEATURES = Object.freeze({
  'sidebar.mainpage': feature('sidebar.mainpage', {
    kind: 'navigation', feature: 'front-page-route', label: '대문', route: '/'
  }),
  'sidebar.randompage': feature('sidebar.randompage', {
    kind: 'navigation', feature: 'random-document-route', label: '임의 문서', route: '/random'
  }),
  'sidebar.recentchanges': feature('sidebar.recentchanges', {
    kind: 'interaction', feature: 'recent-changes-route', label: '최근 변경', route: '/RecentChanges'
  }),
  'sidebar.recentdiscuss': feature('sidebar.recentdiscuss', {
    kind: 'interaction', feature: 'recent-discussions-route', label: '최근 토론', route: '/RecentDiscuss'
  }),
  'toolbox.upload': feature('toolbox.upload', {
    kind: 'special-page', feature: 'upload-route', label: '파일 올리기', route: '/Upload'
  }),
  'toolbox.neededpages': feature('toolbox.neededpages', {
    kind: 'special-page', feature: 'needed-pages-route', label: '작성이 필요한 문서', route: '/NeededPages'
  }),
  'toolbox.orphanedpages': feature('toolbox.orphanedpages', {
    kind: 'special-page', feature: 'orphaned-pages-route', label: '고립된 문서', route: '/OrphanedPages'
  }),
  'toolbox.orphanedcategories': feature('toolbox.orphanedcategories', {
    kind: 'special-page', feature: 'orphaned-categories-route', label: '고립된 분류', route: '/OrphanedCategories'
  }),
  'toolbox.uncategorizedpages': feature('toolbox.uncategorizedpages', {
    kind: 'special-page', feature: 'uncategorized-pages-route', label: '분류가 되지 않은 문서', route: '/UncategorizedPages'
  }),
  'toolbox.oldpages': feature('toolbox.oldpages', {
    kind: 'special-page', feature: 'old-pages-route', label: '오래된 문서', route: '/OldPages'
  }),
  'toolbox.shortpages': feature('toolbox.shortpages', {
    kind: 'special-page', feature: 'short-pages-route', label: '짧은 문서', route: '/ShortestPages'
  }),
  'toolbox.longpages': feature('toolbox.longpages', {
    kind: 'special-page', feature: 'long-pages-route', label: '긴 문서', route: '/LongestPages'
  }),
  'toolbox.blockhistory': feature('toolbox.blockhistory', {
    kind: 'special-page', feature: 'block-history-route', label: '차단 내역', route: '/BlockHistory'
  }),
  'toolbox.randompage-list': feature('toolbox.randompage-list', {
    kind: 'special-page', feature: 'random-page-list-route', label: '임의 문서 목록', route: '/RandomPage'
  }),
  'toolbox.license': feature('toolbox.license', {
    kind: 'site-link', feature: 'license-route', label: '라이선스', route: '/License'
  }),
  'personal.anonymous-user': feature('personal.anonymous-user', {
    kind: 'personal-tool', feature: 'anonymous-session', accountType: 'anonymous', label: '로그인하지 않음'
  }),
  'personal.anonymous-talk': feature('personal.anonymous-talk', {
    kind: 'personal-tool', feature: 'ip-user-document-discussion', accountType: 'anonymous', label: '토론'
  }),
  'personal.anonymous-settings': feature('personal.anonymous-settings', {
    kind: 'personal-tool', feature: 'local-settings', accountType: 'anonymous', label: '환경 설정'
  }),
  'personal.anonymous-contributions': feature('personal.anonymous-contributions', {
    kind: 'personal-tool', feature: 'ip-contributions', accountType: 'anonymous', label: '기여', requires: 'uuid'
  }),
  'personal.login': feature('personal.login', {
    kind: 'personal-tool', feature: 'login-route', accountType: 'anonymous', label: '로그인', route: '/member/login'
  }),
  'personal.userpage': feature('personal.userpage', {
    kind: 'personal-tool', feature: 'user-document', accountType: 'logged-in', label: ''
  }),
  'personal.notifications': feature('personal.notifications', {
    kind: 'personal-tool', feature: 'notifications', accountType: 'logged-in', label: '알림', route: '/member/notifications'
  }),
  'personal.user-talk': feature('personal.user-talk', {
    kind: 'personal-tool', feature: 'user-document-discussion', accountType: 'logged-in', label: '토론'
  }),
  'personal.settings': feature('personal.settings', {
    kind: 'personal-tool', feature: 'local-settings', accountType: 'logged-in', label: '환경 설정'
  }),
  'personal.member-info': feature('personal.member-info', {
    kind: 'personal-tool', feature: 'member-page', accountType: 'logged-in', label: '내 정보', route: '/member/mypage'
  }),
  'personal.watchlist': feature('personal.watchlist', {
    kind: 'personal-tool', feature: 'starred-documents', accountType: 'logged-in', label: '주시문서 목록', route: '/member/starred_documents'
  }),
  'personal.contributions': feature('personal.contributions', {
    kind: 'personal-tool', feature: 'account-contributions', accountType: 'logged-in', label: '기여', requires: 'uuid'
  }),
  'personal.logout': feature('personal.logout', {
    kind: 'personal-tool', feature: 'logout-route', accountType: 'logged-in', label: '로그아웃', route: '/member/logout'
  }),
  'sidebar.session-menu': feature('sidebar.session-menu', {
    kind: 'session-menu', feature: 'session-menu-array', label: ''
  }),
  'document.action.language': feature('document.action.language', {
    kind: 'document-action', feature: 'document-language', label: '언어', action: 'language'
  }),
  'document.action.view': feature('document.action.view', {
    kind: 'document-action', feature: 'document-view', label: '읽기', action: 'w'
  }),
  'document.action.watchstar': feature('document.action.watchstar', {
    kind: 'document-action', feature: 'starred-document', label: '주시',
    action: 'member/star', activeAction: 'member/unstar'
  }),
  'document.action.history': feature('document.action.history', {
    kind: 'document-action', feature: 'document-history', label: '역사 보기', action: 'history'
  }),
  'toolbox.relevant-user-contributions': feature('toolbox.relevant-user-contributions', {
    kind: 'relevant-user-action', feature: 'relevant-user-contributions', label: '사용자 기여'
  }),
  'document.action.edit': feature('document.action.edit', {
    kind: 'document-action', feature: 'document-edit', label: '편집', action: 'edit'
  }),
  'document.action.backlink': feature('document.action.backlink', {
    kind: 'document-action', feature: 'document-backlink', label: '역링크', action: 'backlink'
  }),
  'document.action.acl': feature('document.action.acl', {
    kind: 'document-action', feature: 'document-acl', label: 'ACL', action: 'acl'
  }),
  'document.action.raw': feature('document.action.raw', {
    kind: 'document-action', feature: 'document-raw', label: '원본', action: 'raw'
  }),
  'document.action.blame': feature('document.action.blame', {
    kind: 'document-action', feature: 'document-blame', label: 'Blame', action: 'blame'
  }),
  'document.action.move': feature('document.action.move', {
    kind: 'document-action', feature: 'document-move', label: '이동', action: 'move'
  }),
  'document.action.delete': feature('document.action.delete', {
    kind: 'document-action', feature: 'document-delete', label: '삭제', action: 'delete'
  }),
  'namespace.subject': feature('namespace.subject', {
    kind: 'namespace-action', feature: 'document-subject', label: '문서', action: 'w', namespaceKind: 'subject'
  }),
  'namespace.talk': feature('namespace.talk', {
    kind: 'namespace-action', feature: 'document-discussion', label: '토론', action: 'discuss', namespaceKind: 'talk'
  })
});

export function getTheTreeHostFeature(id) {
  const definition = THETREE_HOST_FEATURES[id];
  if (!definition) throw new Error(`Unknown the tree host feature: ${id}`);
  return definition;
}
