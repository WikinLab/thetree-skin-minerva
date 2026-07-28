/*
 * Vue-side shape for REL1_46 LegacySidebar.mustache data.
 * Function parameters are local adapter inputs; the returned object preserves
 * the exact upstream SidebarData keys.
 */
import { makeMenuDefinition } from './legacyPortletData';

export function makeSidebarData({
  linkMainpage = '/',
  msgTooltipPLogo = '',
  dataPortletsFirst = null,
  arrayPortletsRest = [],
  dataLanguages = null
} = {}) {
  return {
    'link-mainpage': linkMainpage,
    'msg-tooltip-p-logo': msgTooltipPLogo,
    'data-portlets-first': dataPortletsFirst,
    'array-portlets-rest': Array.isArray(arrayPortletsRest) ? arrayPortletsRest : [],
    'data-portlets': {
      'data-languages': dataLanguages
    }
  };
}

export function makeNavigationPortlet(arrayListItems = []) {
  return makeMenuDefinition('navigation', {
    id: 'p-navigation',
    label: '둘러보기',
    'array-list-items': arrayListItems
  });
}

export function makeToolboxPortlet(arrayListItems = []) {
  return makeMenuDefinition('p-tb', {
    id: 'p-tb',
    label: '도구',
    'array-list-items': arrayListItems
  });
}

export function makeUserToolsPortlet(arrayListItems = []) {
  if (!arrayListItems.length) return null;
  return makePortalPortlet({
    id: 'p-user-tools',
    label: '사용자 메뉴',
    arrayListItems
  });
}

export function makeLanguagesPortlet(arrayListItems = []) {
  if (!arrayListItems.length) return null;
  return makeMenuDefinition('data-languages', {
    id: 'p-lang',
    label: '언어',
    'array-list-items': arrayListItems
  });
}

export function makePortalPortlet({ id, label, arrayListItems = [] }) {
  return makeMenuDefinition(id, {
    id,
    label,
    'array-list-items': arrayListItems
  });
}
