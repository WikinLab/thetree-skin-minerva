/*
 * Vue-side equivalent of REL1_46 VectorComponentSearchBox::getTemplateData().
 * searchBoxData is an upstream-keyed override object. Host-only options remain
 * separate and the returned SearchData contains no camelCase alias properties.
 */
import { normalizeClass } from './legacyComponentData';

export const SEARCH_COLLAPSIBLE_CLASS = 'vector-search-box-collapses';
export const SEARCH_SHOW_THUMBNAIL_CLASS = 'vector-search-box-show-thumbnail';
export const SEARCH_AUTO_EXPAND_WIDTH_CLASS = 'vector-search-box-auto-expand-width';
export const SEARCH_BOX_INPUT_LOCATION_DEFAULT = 'header-navigation';
export const SEARCH_BOX_INPUT_LOCATION_MOVED = 'header-moved';

function serializeHtmlAttributes(attributes = {}) {
  return Object.entries(attributes)
    .filter(([key, value]) => key && value !== null && value !== undefined && value !== false)
    .map(([key, value]) => value === true ? key : `${key}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ');
}

export function makeSearchBoxData(searchBoxData = {}, options = {}) {
  const isCollapsible = !!options.isCollapsible;
  const isPrimary = options.isPrimary !== false;
  const isThumbnail = !!options.isThumbnail;
  const isAutoExpand = isThumbnail && !!options.autoExpandWidth;
  const formId = options.formId || 'searchform';
  const inputLocation = options.inputLocation || SEARCH_BOX_INPUT_LOCATION_DEFAULT;
  const msgSearch = options.msgSearch || searchBoxData['msg-search'] || '검색';
  const msgSearchbutton = options.msgSearchbutton || searchBoxData['msg-searchbutton'] || '검색';
  const msgSearcharticle = options.msgSearcharticle || searchBoxData['msg-searcharticle'] || '문서';
  const msgSearchsuggestSearch = options.msgSearchsuggestSearch || searchBoxData['msg-searchsuggest-search'] || msgSearch;
  const formAction = options.formAction || searchBoxData['form-action'] || '/Search';
  const pageTitle = searchBoxData['page-title'] || options.pageTitle || 'Special:Search';
  const searchValue = options.searchValue ?? '';
  const searchPlaceholder = options.searchPlaceholder || msgSearchsuggestSearch;

  const searchClass = normalizeClass(
    searchBoxData.class,
    'vector-search-box-vue',
    isCollapsible && SEARCH_COLLAPSIBLE_CLASS,
    isThumbnail && SEARCH_SHOW_THUMBNAIL_CLASS,
    isAutoExpand && SEARCH_AUTO_EXPAND_WIDTH_CLASS
  );

  const htmlInputAttributes = searchBoxData['html-input-attributes'] || serializeHtmlAttributes({
    type: 'search',
    name: 'search',
    autocomplete: 'off',
    placeholder: searchPlaceholder,
    value: searchValue
  });
  const htmlButtonFulltextAttributes = searchBoxData['html-button-fulltext-attributes'] || serializeHtmlAttributes({
    class: 'searchButton',
    type: 'submit',
    name: 'fulltext'
  });
  const htmlButtonGoAttributes = searchBoxData['html-button-go-attributes'] || serializeHtmlAttributes({
    class: 'searchButton',
    type: 'submit',
    name: 'go'
  });

  return {
    class: searchClass,
    'is-primary': isPrimary,
    'form-id': formId,
    'form-action': formAction,
    'input-location': inputLocation,
    'page-title': pageTitle,
    'msg-search': msgSearch,
    'msg-searchbutton': msgSearchbutton,
    'msg-searcharticle': msgSearcharticle,
    'msg-searchsuggest-search': msgSearchsuggestSearch,
    'html-user-language-attributes': searchBoxData['html-user-language-attributes'] || '',
    'html-input-attributes': htmlInputAttributes,
    'html-button-fulltext-attributes': htmlButtonFulltextAttributes,
    'html-button-go-attributes': htmlButtonGoAttributes
  };
}
