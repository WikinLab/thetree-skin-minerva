/*
 * the tree -> REL1_46 Vector navigation data adapter boundary.
 * The returned object is the exact navigation subset of skin-legacy.mustache;
 * host source arrays and route objects never leak into the template data.
 */
import { makeMenuDefinition } from './legacyPortletData';
import { makeSearchBoxData } from './legacySearchBoxData';
import { makeLanguagesPortlet, makeSidebarData } from './legacySidebarData';
import { makeLegacyLogoTooltip } from './legacyLogoAdapter';
import {
  DOCUMENT_ACTION_MAP,
  NAMESPACE_MAP,
  PERSONAL_TOOL_MAP,
  SESSION_MENU_MAP,
  SIDEBAR_NAVIGATION_MAP,
  SIDEBAR_TOOLBOX_MAP,
  featureTargetForPortlet,
  getConfiguredString
} from './legacyHostAdapterPolicy';
import {
  getLegacySearchQuery,
  makeActionItems,
  makeLanguageItems,
  makeNamespaceItems,
  makePersonalToolsItems,
  makeSidebarNavigationItems,
  makeSidebarPersonalItems,
  makeSidebarToolboxItems,
  makeViewItems
} from './legacyTheTreeAdapter';

function makeMappedMenuDefinition(featureMap, portletKey, label, items) {
  const target = featureTargetForPortlet(featureMap, portletKey);
  return makeMenuDefinition(portletKey, {
    id: target?.portletId || '',
    label,
    'array-list-items': items
  });
}

function makeMappedSidebarPortlet(featureMap, portletKey, label, items) {
  const target = featureTargetForPortlet(featureMap, portletKey);
  return makeMenuDefinition(target?.portletId || portletKey, {
    id: target?.portletId || '',
    label,
    'array-list-items': items
  });
}

export function makeNavigationData(context = {}) {
  const config = context.config || {};
  const namespaceItems = makeNamespaceItems(context);
  const viewItems = makeViewItems(context);
  const actionItems = makeActionItems(context);
  const personalItems = makePersonalToolsItems(context);
  const navigationItems = makeSidebarNavigationItems(context);
  const toolboxItems = makeSidebarToolboxItems(context);
  const sidebarPersonalItems = makeSidebarPersonalItems(context);
  const languageItems = makeLanguageItems(context);

  const dataUserMenu = makeMappedMenuDefinition(PERSONAL_TOOL_MAP, 'data-user-menu', '개인 도구', personalItems);
  const dataAssociatedPages = makeMappedMenuDefinition(NAMESPACE_MAP, 'data-associated-pages', '이름공간', namespaceItems);
  const dataVariants = null;
  const dataViews = makeMappedMenuDefinition(DOCUMENT_ACTION_MAP, 'data-views', '보기', viewItems);
  const dataActions = makeMappedMenuDefinition(DOCUMENT_ACTION_MAP, 'data-actions', '더 보기', actionItems);
  const dataSearchBox = makeSearchBoxData({
    'page-title': getConfiguredString(config, 'searchTitle', 'Special:Search')
  }, {
    searchValue: getLegacySearchQuery(context),
    searchPlaceholder: getConfiguredString(config, 'searchPlaceholder', '검색'),
    isCollapsible: false,
    isPrimary: true,
    formId: 'searchform',
    autoExpandWidth: true,
    inputLocation: 'header-navigation'
  });
  const dataPortletsMainMenu = makeSidebarData({
    linkMainpage: '/',
    msgTooltipPLogo: makeLegacyLogoTooltip({ config }),
    dataPortletsFirst: makeMappedSidebarPortlet(SIDEBAR_NAVIGATION_MAP, 'data-portlets-first', '둘러보기', navigationItems),
    arrayPortletsRest: [
      makeMappedSidebarPortlet(SIDEBAR_TOOLBOX_MAP, 'array-portlets-rest', '도구', toolboxItems),
      sidebarPersonalItems.length
        ? makeMappedSidebarPortlet(SESSION_MENU_MAP, 'array-portlets-rest', '사용자 메뉴', sidebarPersonalItems)
        : null
    ].filter(Boolean),
    dataLanguages: makeLanguagesPortlet(languageItems)
  });

  return {
    'msg-navigation-heading': getConfiguredString(config, 'navigationHeading', '둘러보기'),
    'data-portlets': {
      'data-user-menu': dataUserMenu,
      'data-associated-pages': dataAssociatedPages,
      'data-variants': dataVariants,
      'data-views': dataViews,
      'data-actions': dataActions,
      'data-search-box': dataSearchBox
    },
    'data-portlets-main-menu': dataPortletsMainMenu
  };
}
