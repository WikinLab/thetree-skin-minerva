/*
 * Vue-side equivalent of REL1_46 SkinVectorLegacy::decoratePortletData().
 * All data below this boundary is keyed exactly like the upstream
 * MenuDefinition consumed by LegacyMenu.mustache and MenuContents.mustache.
 */
import { makeMenuData, normalizeClass } from './legacyComponentData';

export const MENU_TYPE_DEFAULT = 0;
export const MENU_TYPE_TABS = 1;
export const MENU_TYPE_DROPDOWN = 2;
export const MENU_TYPE_PORTAL = 3;

function menuTypeForKey(key) {
  switch (key) {
    case 'data-actions':
    case 'data-variants':
    case 'data-sticky-header-toc':
      return MENU_TYPE_DROPDOWN;
    case 'data-user-menu':
      return MENU_TYPE_DEFAULT;
    case 'data-views':
    case 'data-associated-pages':
      return MENU_TYPE_TABS;
    case 'data-notifications':
    case 'data-user-page':
    case 'data-vector-user-menu-overflow':
      return MENU_TYPE_DEFAULT;
    default:
      return MENU_TYPE_PORTAL;
  }
}

export function updatePortletClasses(portletData, type = MENU_TYPE_DEFAULT) {
  const extraClasses = {
    [MENU_TYPE_DROPDOWN]: 'vector-menu-dropdown',
    [MENU_TYPE_TABS]: 'vector-menu-tabs vector-menu-tabs-legacy',
    [MENU_TYPE_PORTAL]: 'vector-menu-portal portal',
    [MENU_TYPE_DEFAULT]: ''
  };

  return {
    ...portletData,
    class: normalizeClass('mw-portlet', portletData.class, extraClasses[type]),
    'heading-class': normalizeClass(portletData['heading-class'])
  };
}

export function decoratePortletData(key, portletData) {
  const type = menuTypeForKey(key);
  const next = { ...portletData };

  if (key === 'data-user-menu') {
    next['html-tooltip'] = '';
    next.class = normalizeClass(next.class, 'vector-user-menu-legacy');
  }

  return {
    ...updatePortletClasses(next, type),
    'is-dropdown': type === MENU_TYPE_DROPDOWN
  };
}

export function makeMenuDefinition(key, portletData) {
  return makeMenuData(decoratePortletData(key, {
    'array-list-items': [],
    ...portletData
  }));
}
