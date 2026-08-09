import { getMinervaConfiguredString } from './minervaHostConfig.js';
import { getMinervaDocumentTitle } from './minervaPageContract.js';

function pageTitle(pageState = {}, pageContract = {}) {
  const document = pageState.data?.document;
  if (document && pageContract.canUseDocumentTitle) {
    return getMinervaDocumentTitle(document);
  }
  return pageState.title || '';
}

export function buildMinervaTitleHeadingData(pageState = {}, pageContract = {}) {
  return { 'page-title': pageTitle(pageState, pageContract) };
}

export function buildMinervaSkinTitleData(pageState = {}, config = {}, pageContract = {}) {
  const tagline = getMinervaConfiguredString(config, 'tagline', '');
  return {
    'is-article': !!pageContract.isArticle,
    'msg-tagline': tagline,
    'html-subtitle': pageContract.defaultSubtitleHtml || '',
    'html-undelete-link': pageState.data?.htmlUndeleteLink || pageState.data?.htmlUndelete || '',
    'html-user-language-attributes': ''
  };
}
