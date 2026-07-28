/* thetree SPA lifecycle adapter for the generated Vector legacy portlets module. */
import {
  main as upstreamMain,
  addPortletHandler
} from '../../generated/mediawiki-vector-legacy/resources/skins.vector.legacy.js/portlets.js';

function getPortletHook() {
  if (typeof window === 'undefined' || !window.mw || typeof window.mw.hook !== 'function') {
    return null;
  }
  return window.mw.hook('util.addPortlet');
}

export function createLegacyPortletsRuntime() {
  let registeredHook = null;
  let initialized = false;

  function main() {
    if (initialized) return { addPortletHandler };
    initialized = true;
    const result = upstreamMain();
    registeredHook = getPortletHook();
    return result;
  }

  function init() {
    return main();
  }

  function destroy() {
    if (registeredHook && typeof registeredHook.remove === 'function') {
      registeredHook.remove(addPortletHandler);
    }
    registeredHook = null;
    initialized = false;
  }

  return Object.freeze({
    init,
    main,
    destroy,
    addPortletHandler
  });
}

export const theTreeVectorPortletsAdapterInternals = Object.freeze({
  getPortletHook
});
