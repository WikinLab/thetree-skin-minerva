/* Declarative the tree -> locked MinervaNeue projection policy. */

import { getMinervaConfiguredBoolean } from './minervaHostConfig.js';
import { getTheTreeHostFeature } from './thetreeHostFeatureCatalog.js';

export const FEATURE_EQUIVALENCE = Object.freeze({
  EXACT: 'exact',
  ANALOG: 'analog',
  LOCAL_ONLY: 'local-only',
  UNSUPPORTED: 'unsupported'
});

export const MINERVA_MAIN_MENU_GROUP_ORDER = Object.freeze([
  'p-navigation',
  'p-interaction',
  'p-personal',
  'pt-preferences'
]);

function projection(sourceId, equivalence, target, transform = 'identity', loss = 'none') {
  const source = getTheTreeHostFeature(sourceId);
  const normalizedTransform = typeof transform === 'string' ? { kind: transform } : transform;
  const normalizedLoss = loss === 'none' ? [] : typeof loss === 'string' ? [loss] : loss;
  return Object.freeze({
    id: sourceId,
    sourceId,
    source,
    equivalence,
    target: Object.freeze({ system: 'mediawiki-minerva', ...target }),
    transform: Object.freeze(normalizedTransform),
    loss: Object.freeze([...normalizedLoss])
  });
}

export const MINERVA_MAIN_MENU_POLICY = Object.freeze([
  projection('sidebar.mainpage', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-navigation', id: 'n-mainpage', icon: 'home'
  }),
  projection('sidebar.randompage', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-navigation', id: 'n-randompage', icon: 'die'
  }),
  projection('sidebar.recentchanges', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-interaction', id: 'n-recentchanges', icon: 'recentChanges'
  }),
  projection('sidebar.recentdiscuss', FEATURE_EQUIVALENCE.LOCAL_ONLY, {
    group: 'p-interaction', id: 'n-recentdiscuss', icon: 'speechBubbles'
  }, 'community-portal-slot', 'MediaWiki community portal is represented by the tree recent discussions'),
  projection('toolbox.upload', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-interaction', id: 't-upload', icon: 'specialPages'
  }, 'expand-special-pages', 'the tree has no single SpecialPages index'),
  projection('toolbox.neededpages', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-interaction', id: 't-neededpages', icon: 'newspaper'
  }, 'expand-special-pages', 'the tree has no single SpecialPages index'),
  projection('toolbox.orphanedpages', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-interaction', id: 't-orphanedpages', icon: 'listBullet'
  }, 'expand-special-pages', 'the tree has no single SpecialPages index'),
  projection('toolbox.orphanedcategories', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-interaction', id: 't-orphanedcategories', icon: 'listBullet'
  }, 'expand-special-pages', 'the tree has no single SpecialPages index'),
  projection('toolbox.uncategorizedpages', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-interaction', id: 't-uncategorizedpages', icon: 'listBullet'
  }, 'expand-special-pages', 'the tree has no single SpecialPages index'),
  projection('toolbox.oldpages', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-interaction', id: 't-oldpages', icon: 'history'
  }, 'expand-special-pages', 'the tree has no single SpecialPages index'),
  projection('toolbox.shortpages', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-interaction', id: 't-shortpages', icon: 'listBullet'
  }, 'expand-special-pages', 'the tree has no single SpecialPages index'),
  projection('toolbox.longpages', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-interaction', id: 't-longpages', icon: 'listBullet'
  }, 'expand-special-pages', 'the tree has no single SpecialPages index'),
  projection('toolbox.blockhistory', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-interaction', id: 't-blockhistory', icon: 'block'
  }, 'expand-special-pages', 'the tree has no single SpecialPages index'),
  projection('toolbox.randompage-list', FEATURE_EQUIVALENCE.LOCAL_ONLY, {
    group: 'p-interaction', id: 't-randompage-list', icon: 'die'
  }, 'expand-special-pages', 'the tree has no single SpecialPages index')
]);

export const MINERVA_SITE_LINK_POLICY = Object.freeze([
  projection('toolbox.license', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'p-minerva-sitelinks', id: 't-license'
  }, 'site-footer-link', 'MediaWiki about/disclaimer links are unavailable from the tree')
]);

export const MINERVA_SETTINGS_POLICY = Object.freeze([
  projection('personal.anonymous-settings', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'pt-preferences', id: 'settings', icon: 'settings'
  }, 'settings-action', 'the tree settings open a modal instead of a MediaWiki special page'),
  projection('personal.settings', FEATURE_EQUIVALENCE.ANALOG, {
    group: 'pt-preferences', id: 'settings', icon: 'settings'
  }, 'settings-action', 'the tree settings open a modal instead of a MediaWiki special page')
]);

export const MINERVA_PERSONAL_TOOL_POLICY = Object.freeze([
  projection('personal.anonymous-user', FEATURE_EQUIVALENCE.UNSUPPORTED, {
    slot: 'personal-menu'
  }, 'no-target', 'Minerva personal menu toggle already communicates anonymous session state'),
  projection('personal.anonymous-talk', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'personal-menu', id: 'pt-anontalk', icon: 'userTalk'
  }, 'user-discussion', 'the tree IP discussions are document discussions'),
  projection('personal.anonymous-contributions', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'personal-menu', id: 'pt-anoncontribs', icon: 'userContributions'
  }, 'contribution'),
  projection('personal.login', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'personal-menu', id: 'pt-login', icon: 'logIn'
  }, 'login-with-redirect'),
  projection('personal.userpage', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'personal-menu', id: 'pt-userpage', icon: 'userAvatar'
  }, 'user-document', 'the tree user document does not guarantee MediaWiki user-namespace semantics'),
  projection('personal.user-talk', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'personal-menu', id: 'pt-mytalk', icon: 'userTalk'
  }, 'user-discussion', 'the tree user discussions are document discussions'),
  projection('personal.watchlist', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'personal-menu', id: 'pt-watchlist', icon: 'watchlist'
  }, 'static-route', 'the tree starred documents are not MediaWiki watchlist events'),
  projection('personal.contributions', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'personal-menu', id: 'pt-mycontris', icon: 'userContributions'
  }, 'contribution'),
  projection('personal.member-info', FEATURE_EQUIVALENCE.LOCAL_ONLY, {
    slot: 'personal-menu', id: 'pt-memberinfo', icon: 'userAvatar'
  }, 'static-route', 'the tree account management has no single MediaWiki equivalent'),
  projection('personal.logout', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'personal-menu', id: 'pt-logout', icon: 'logOut'
  }, 'logout-with-redirect')
]);

export const MINERVA_NOTIFICATION_POLICY = projection(
  'personal.notifications',
  FEATURE_EQUIVALENCE.ANALOG,
  { slot: 'top-bar', id: 'pt-notifications', icon: 'bellOutline' },
  'single-notification-stream',
  'the tree provides one stream instead of separate MediaWiki alert and notice groups'
);

export const MINERVA_SESSION_MENU_POLICY = projection(
  'sidebar.session-menu',
  FEATURE_EQUIVALENCE.LOCAL_ONLY,
  { group: 'p-interaction' },
  'collection-item-projection',
  'the tree session menus are host-defined and have no fixed MediaWiki inventory'
);

export const MINERVA_NAMESPACE_POLICY = Object.freeze([
  projection('namespace.subject', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'associated-pages', id: 'ca-nstab-main'
  }, 'document-action'),
  projection('namespace.talk', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'associated-pages', id: 'ca-talk'
  }, 'document-action', 'the tree discussion route is not a MediaWiki Talk namespace page')
]);

export const MINERVA_PAGE_ACTION_POLICY = Object.freeze([
  projection('document.action.language', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'toolbar', name: 'language-selector', icon: 'language'
  }, 'minerva-language-options', 'the tree only exposes document languages when host data provides them'),
  projection('document.action.watchstar', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'toolbar', name: 'page-actions-watch', icon: 'star'
  }),
  projection('document.action.history', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'toolbar', name: 'page-actions-history', nodeId: 'ca-history', icon: 'history'
  }),
  projection('toolbox.relevant-user-contributions', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'toolbar', name: 'page-actions-contributions', nodeId: 'ca-contributions', icon: 'userContributions'
  }),
  projection('document.action.edit', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'toolbar', name: 'page-actions-edit', nodeId: 'ca-edit', icon: 'edit'
  }),
  projection('document.action.backlink', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'overflow', id: 'page-actions-overflow-backlink', nodeId: 'ca-backlink', icon: 'link'
  }),
  projection('document.action.acl', FEATURE_EQUIVALENCE.LOCAL_ONLY, {
    slot: 'overflow', id: 'page-actions-overflow-acl', nodeId: 'ca-acl', icon: 'lock'
  }, 'document-permission-action', 'MediaWiki protection semantics are replaced by the tree ACL'),
  projection('document.action.raw', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'overflow', id: 'page-actions-overflow-raw', nodeId: 'ca-raw', icon: 'wikiText'
  }, 'revision-query', 'route and revision identifiers use the tree semantics'),
  projection('document.action.blame', FEATURE_EQUIVALENCE.LOCAL_ONLY, {
    slot: 'overflow', id: 'page-actions-overflow-blame', nodeId: 'ca-blame', icon: 'userContributions'
  }),
  projection('document.action.move', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'overflow', id: 'page-actions-overflow-move', nodeId: 'ca-move', icon: 'move'
  }),
  projection('document.action.delete', FEATURE_EQUIVALENCE.ANALOG, {
    slot: 'overflow', id: 'page-actions-overflow-delete', nodeId: 'ca-delete', icon: 'trash'
  })
]);

const SESSION_ROUTE_ICON_POLICY = Object.freeze([
  [/^\/admin\/grant(?:\/|$)/, 'lock'],
  [/^\/admin\/manage_account(?:\/|$)/, 'userGroup'],
  [/^\/admin\/login_history(?:\/|$)/, 'history'],
  [/^\/aclgroup(?:\/|$)/, 'lock'],
  [/^\/admin\/batch_revert(?:\/|$)/, 'history'],
  [/^\/admin\/audit_log(?:\/|$)/, 'history'],
  [/^\/admin\/config(?:\/|$)/, 'settings'],
  [/^\/admin\/developer(?:\/|$)/, 'settings']
]);

const SUPPORTED_SESSION_ICONS = new Set([
  'block', 'history', 'lock', 'settings', 'specialPages', 'userGroup'
]);

export function projectMinervaFeature(row) {
  const source = getTheTreeHostFeature(row.sourceId);
  return {
    id: row.target.id,
    label: source.label,
    to: source.route,
    icon: row.target.icon
  };
}

export function resolveMinervaSessionIcon(item = {}) {
  const route = String(item.l || item.to || '');
  const matched = SESSION_ROUTE_ICON_POLICY.find(([pattern]) => pattern.test(route));
  if (matched) return matched[1];
  return SUPPORTED_SESSION_ICONS.has(item.icon) ? item.icon : 'specialPages';
}

export function shouldShowMinervaLanguageButton(context = {}, { hasLanguages = false } = {}) {
  const contract = context.pageContract;
  if (!contract?.showPageActions || contract.isUserPage) return false;
  if (getMinervaConfiguredBoolean(context.config, 'hideInterlanguageLinks', true)) return false;
  if (contract.isMainPage) return true;
  return hasLanguages || getMinervaConfiguredBoolean(
    context.config,
    'alwaysShowLanguageButton',
    true
  );
}
