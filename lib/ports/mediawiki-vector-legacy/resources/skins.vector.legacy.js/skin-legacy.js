/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Modified by thetree-skin-vector, 2026-07-29 and 2026-07-30.
 * Source provenance: ORIGIN-MANIFEST.json and NOTICE.
 *
 * DOM port of REL1_46 resources/skins.vector.legacy.js/skin-legacy.js.
 *
 * The upstream entrypoint only composes collapsibleTabs, vector, portlets,
 * mediawiki.page.ready search loading, and the vector-body marker. Host lookup
 * is deliberately injected so this file does not know about thetree globals.
 */
import { createLegacyPortletsRuntime } from '../../../../adapters/thetree-vector/portlets.js';
import { createLegacyVectorRuntime } from './vector.js';

export const searchSuggestModule = 'mediawiki.searchSuggest';
export const vectorBodyClass = 'vector-body';

export function createSkinLegacyPortRuntime(options = {}) {
  let vectorRuntime = null;
  let portletsRuntime = null;
  let addedVectorBodyClass = false;
  const pageReady = options.pageReady || null;
  const teleportTarget = options.teleportTarget || null;

  function loadSearchModule(moduleName = searchSuggestModule) {
    if (pageReady && typeof pageReady.loadSearchModule === 'function') {
      pageReady.loadSearchModule(moduleName);
      return true;
    }
    return false;
  }

  function addVectorBodyClass() {
    if (!teleportTarget) return;
    addedVectorBodyClass = !teleportTarget.classList.contains(vectorBodyClass);
    teleportTarget.classList.add(vectorBodyClass);
  }

  function removeVectorBodyClass() {
    if (teleportTarget && addedVectorBodyClass) {
      teleportTarget.classList.remove(vectorBodyClass);
    }
    addedVectorBodyClass = false;
  }

  function main() {
    vectorRuntime = createLegacyVectorRuntime();
    vectorRuntime.init();

    portletsRuntime = createLegacyPortletsRuntime();
    portletsRuntime.init();

    loadSearchModule(options.searchSuggestModule || searchSuggestModule);
    addVectorBodyClass();
  }

  function init() {
    return main();
  }

  function destroy() {
    if (portletsRuntime) {
      portletsRuntime.destroy();
      portletsRuntime = null;
    }
    if (vectorRuntime) {
      vectorRuntime.destroy();
      vectorRuntime = null;
    }
    removeVectorBodyClass();
  }

  return Object.freeze({
    init,
    main,
    destroy,
    get vectorRuntime() {
      return vectorRuntime;
    },
    get portletsRuntime() {
      return portletsRuntime;
    }
  });
}
