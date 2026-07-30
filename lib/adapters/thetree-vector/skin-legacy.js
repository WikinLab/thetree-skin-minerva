/* thetree host adapter for the Vector legacy skin-legacy.js port. */
import {
  createSkinLegacyPortRuntime,
  searchSuggestModule
} from '../../ports/mediawiki-vector-legacy/resources/skins.vector.legacy.js/skin-legacy.js';

export const VECTOR_CONTENT_CONTEXT_ATTRIBUTE = 'data-tt-vector-context';
export const VECTOR_CONTENT_CONTEXT_VALUE = 'content-common';

function getPageReady(options = {}) {
  if (options.pageReady) return options.pageReady;
  if (typeof window === 'undefined') return null;
  return window.mediaWikiPageReady || null;
}

function getTeleportTarget(pageReady, options = {}) {
  if (options.teleportTarget) return options.teleportTarget;
  if (pageReady && pageReady.teleportTarget) return pageReady.teleportTarget;
  if (typeof document === 'undefined') return null;
  return document.getElementById('bodyContent');
}

export function createTheTreeVectorRuntime(options = {}) {
  let portRuntime = null;
  let contentContextTarget = null;
  let previousContentContext = null;
  let hadContentContextAttribute = false;

  function installContentContext(target) {
    if (!target || target.nodeType !== 1) return;
    contentContextTarget = target;
    hadContentContextAttribute = target.hasAttribute(VECTOR_CONTENT_CONTEXT_ATTRIBUTE);
    previousContentContext = target.getAttribute(VECTOR_CONTENT_CONTEXT_ATTRIBUTE);
    target.setAttribute(VECTOR_CONTENT_CONTEXT_ATTRIBUTE, VECTOR_CONTENT_CONTEXT_VALUE);
  }

  function restoreContentContext() {
    if (!contentContextTarget) return;
    if (hadContentContextAttribute) {
      contentContextTarget.setAttribute(VECTOR_CONTENT_CONTEXT_ATTRIBUTE, previousContentContext || '');
    } else {
      contentContextTarget.removeAttribute(VECTOR_CONTENT_CONTEXT_ATTRIBUTE);
    }
    contentContextTarget = null;
    previousContentContext = null;
    hadContentContextAttribute = false;
  }

  function init() {
    const pageReady = getPageReady(options);
    const teleportTarget = getTeleportTarget(pageReady, options);
    portRuntime = createSkinLegacyPortRuntime({
      pageReady,
      teleportTarget,
      searchSuggestModule: options.searchSuggestModule || searchSuggestModule
    });
    const result = portRuntime.init();
    installContentContext(teleportTarget);
    return result;
  }

  function destroy() {
    restoreContentContext();
    if (portRuntime) {
      portRuntime.destroy();
      portRuntime = null;
    }
  }

  return Object.freeze({
    init,
    main: init,
    destroy,
    get vectorRuntime() {
      return portRuntime ? portRuntime.vectorRuntime : null;
    },
    get portletsRuntime() {
      return portRuntime ? portRuntime.portletsRuntime : null;
    }
  });
}
