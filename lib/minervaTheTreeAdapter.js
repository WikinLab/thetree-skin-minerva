import { settingsToggleAttributes } from './adapters/thetree-settings.js';
import { getMinervaConfiguredString } from './minervaHostConfig.js';
import { getMinervaPageContract, makeMinervaPageContract } from './minervaPageContract.js';

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
    linkBuilders
  };
  return Object.freeze({
    ...baseContext,
    pageContract: makeMinervaPageContract(baseContext)
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

function redirectTarget(context, path) {
  return { path, query: { redirect: context.route?.fullPath || '/' } };
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

export function makeMinervaPersonalMenuItems(context = {}) {
  const account = getMinervaAccount(context);
  const loggedIn = isMinervaLoggedIn(context);
  const accountName = account.name || account.username || '';
  if (!loggedIn) {
    return normalizeItems([
      accountName ? {
        id: 'pt-anontalk', label: '토론', icon: 'userTalk',
        to: makeMinervaDocumentActionTarget(
          context,
          makeMinervaUserDocumentTarget(context, accountName, account.type),
          'discuss'
        )
      } : null,
      account.uuid ? {
        id: 'pt-anoncontribs', label: '기여', icon: 'userContributions',
        to: makeMinervaContributionTarget(context, account.uuid)
      } : null,
      {
        id: 'pt-login', label: '로그인', icon: 'logIn',
        to: redirectTarget(context, '/member/login')
      }
    ]);
  }

  const userDocument = makeMinervaUserDocumentTarget(context, accountName, account.type);
  return normalizeItems([
    accountName ? {
      id: 'pt-userpage', label: accountName, icon: 'userAvatar',
      to: makeMinervaDocumentActionTarget(context, userDocument, 'w')
    } : null,
    accountName ? {
      id: 'pt-mytalk', label: '토론', icon: 'userTalk',
      to: makeMinervaDocumentActionTarget(context, userDocument, 'discuss')
    } : null,
    {
      id: 'pt-watchlist', label: '주시문서 목록', icon: 'watchlist',
      to: '/member/starred_documents'
    },
    account.uuid ? {
      id: 'pt-mycontris', label: '기여', icon: 'userContributions',
      to: makeMinervaContributionTarget(context, account.uuid)
    } : null,
    { id: 'pt-memberinfo', label: '내 정보', icon: 'userAvatar', to: '/member/mypage' },
    {
      id: 'pt-logout', label: '로그아웃', icon: 'logOut',
      to: redirectTarget(context, '/member/logout')
    }
  ]);
}

export function makeMinervaNotificationItems(context = {}) {
  if (!isMinervaLoggedIn(context)) return [];
  const count = ensureArray(context.session?.notifications).length;
  return [{
    id: 'pt-notifications',
    label: count ? `알림 (${count >= 5 ? '5+' : count})` : '알림',
    icon: 'bellOutline',
    to: '/member/notifications',
    arrayAttributes: [
      { key: 'id', value: 'pt-notifications' },
      { key: 'title', value: count ? `읽지 않은 알림 ${count >= 5 ? '5개 이상' : `${count}개`}` : '알림' }
    ]
  }];
}

export function makeMinervaConfigurationItems() {
  return [{
    id: 'pt-preferences',
    label: '환경 설정',
    icon: 'settings',
    href: '#',
    arrayAttributes: settingsToggleAttributes()
  }];
}

export function makeMinervaSessionMenuItems(context = {}) {
  return normalizeItems(ensureArray(context.session?.menus).map((item, index) => ({
    id: item?.id || `pt-host-${index}`,
    label: typeof item?.t === 'string' ? item.t : '',
    to: item?.l || null,
    icon: item?.icon || null,
    hidden: item?.hidden,
    disabled: item?.disabled
  })));
}

export function makeMinervaNavigationItems() {
  return [
    { id: 'n-mainpage', label: '대문', icon: 'home', to: '/' },
    { id: 'n-recentchanges', label: '최근 변경', icon: 'recentChanges', to: '/RecentChanges' },
    { id: 'n-recentdiscuss', label: '최근 토론', icon: 'speechBubbles', to: '/RecentDiscuss' },
    { id: 'n-randompage', label: '임의 문서', icon: 'die', to: '/random' }
  ];
}

const TOOLBOX_ITEMS = Object.freeze([
  ['t-upload', '파일 올리기', '/Upload'],
  ['t-neededpages', '작성이 필요한 문서', '/NeededPages'],
  ['t-orphanedpages', '고립된 문서', '/OrphanedPages'],
  ['t-orphanedcategories', '고립된 분류', '/OrphanedCategories'],
  ['t-uncategorizedpages', '분류가 되지 않은 문서', '/UncategorizedPages'],
  ['t-oldpages', '오래된 문서', '/OldPages'],
  ['t-shortpages', '짧은 문서', '/ShortestPages'],
  ['t-longpages', '긴 문서', '/LongestPages'],
  ['t-blockhistory', '차단 내역', '/BlockHistory'],
  ['t-randompage-list', '임의 문서 목록', '/RandomPage'],
  ['t-license', '라이선스', '/License']
]);

export function makeMinervaToolboxItems(context = {}) {
  const items = TOOLBOX_ITEMS.map(([id, label, to]) => ({ id, label, to, icon: 'listBullet' }));
  const uuid = relevantUserUuid(context);
  if (uuid) items.push({
    id: 't-contributions', label: '사용자 기여', icon: 'userContributions',
    to: makeMinervaContributionTarget(context, uuid)
  });
  return items;
}

export function makeMinervaNamespaceItems(context = {}) {
  const contract = getMinervaPageContract(context);
  const document = getMinervaDocument(context);
  if (!document || !contract.showPageTabs) return [];
  const data = getMinervaPageData(context);
  return [
    {
      id: 'ca-nstab-main',
      label: '문서',
      to: makeMinervaDocumentActionTarget(context, document, 'w', data.uuid ? { uuid: data.uuid } : {}),
      selected: contract.namespaceKind === 'subject'
    },
    {
      id: 'ca-talk',
      label: '토론',
      to: makeMinervaDocumentActionTarget(context, document, 'discuss'),
      selected: contract.namespaceKind === 'talk'
    }
  ];
}

function watchToolbarItem(context) {
  const contract = getMinervaPageContract(context);
  const document = getMinervaDocument(context);
  const data = getMinervaPageData(context);
  if (!contract.watchable || !document) return null;
  if (!contract.isAuthenticated) {
    return {
      name: 'page-actions-watch',
      nodeId: 'ca-watch',
      label: '주시',
      icon: 'star',
      to: redirectTarget(context, '/member/login')
    };
  }
  if (typeof data.starred !== 'boolean') return null;
  const watchTarget = makeMinervaDocumentActionTarget(context, document, 'member/star');
  const unwatchTarget = makeMinervaDocumentActionTarget(context, document, 'member/unstar');
  return {
    name: 'page-actions-watch',
    nodeId: 'ca-watch',
    label: data.starred ? '주시 해제' : '주시',
    icon: data.starred ? 'unStar' : 'star',
    classes: 'mw-watchlink',
    to: data.starred ? unwatchTarget : watchTarget,
    watchstar: { watched: data.starred, watchTarget, unwatchTarget }
  };
}

export function makeMinervaToolbarItems(context = {}, { hasLanguages = false } = {}) {
  const contract = getMinervaPageContract(context);
  const document = getMinervaDocument(context);
  if (!contract.showPageActions || !document) return [];
  const items = [];
  if (hasLanguages) items.push({
    name: 'page-actions-language',
    nodeId: 'ca-language',
    label: '언어',
    icon: 'language',
    classes: 'language-selector',
    href: '#p-lang'
  });
  const watch = watchToolbarItem(context);
  if (watch) items.push(watch);
  if (contract.canHistory) items.push({
    name: 'page-actions-history',
    nodeId: 'ca-history',
    label: '역사 보기',
    icon: 'history',
    to: makeMinervaDocumentActionTarget(context, document, 'history')
  });
  if (contract.isUserPage) {
    const uuid = relevantUserUuid(context);
    if (uuid) items.push({
      name: 'page-actions-contributions',
      nodeId: 'ca-contributions',
      label: '사용자 기여',
      icon: 'userContributions',
      to: makeMinervaContributionTarget(context, uuid)
    });
  }
  if (contract.canEdit) items.push({
    name: 'page-actions-edit',
    nodeId: 'ca-edit',
    label: '편집',
    icon: 'edit',
    classes: 'edit-page',
    to: makeMinervaDocumentActionTarget(context, document, 'edit')
  });
  return items;
}

export function makeMinervaOverflowItems(context = {}) {
  const contract = getMinervaPageContract(context);
  const document = getMinervaDocument(context);
  if (!contract.showPageActions || !document) return [];
  const data = getMinervaPageData(context);
  const revision = data.uuid ? { uuid: data.uuid } : {};
  return normalizeItems([
    { id: 'page-actions-overflow-backlink', nodeId: 'ca-backlink', label: '역링크', icon: 'link', to: makeMinervaDocumentActionTarget(context, document, 'backlink') },
    contract.canAcl ? { id: 'page-actions-overflow-acl', nodeId: 'ca-acl', label: 'ACL', icon: 'settings', to: makeMinervaDocumentActionTarget(context, document, 'acl') } : null,
    contract.exists ? { id: 'page-actions-overflow-raw', nodeId: 'ca-raw', label: '원본', icon: 'listBullet', to: makeMinervaDocumentActionTarget(context, document, 'raw', revision) } : null,
    contract.exists ? { id: 'page-actions-overflow-blame', nodeId: 'ca-blame', label: 'Blame', icon: 'userContributions', to: makeMinervaDocumentActionTarget(context, document, 'blame', revision) } : null,
    contract.canMove ? { id: 'page-actions-overflow-move', nodeId: 'ca-move', label: '이동', icon: 'move', to: makeMinervaDocumentActionTarget(context, document, 'move') } : null,
    contract.canDelete ? { id: 'page-actions-overflow-delete', nodeId: 'ca-delete', label: '삭제', icon: 'trash', to: makeMinervaDocumentActionTarget(context, document, 'delete') } : null,
    ...makeMinervaToolboxItems(context)
  ]);
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
