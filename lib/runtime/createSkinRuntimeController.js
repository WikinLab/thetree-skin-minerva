import { installTheTreeMediaWikiRuntime } from '../adapters/thetree-mediawiki/runtime.js';
import { createTheTreeVectorRuntime } from '../adapters/thetree-vector/skin-legacy.js';

export function createSkinRuntimeController({
  schedule = (callback) => callback()
} = {}) {
  let theTreeMediaWikiRuntime = null;
  let theTreeVectorRuntime = null;

  function destroy() {
    if (theTreeVectorRuntime) {
      theTreeVectorRuntime.destroy();
      theTreeVectorRuntime = null;
    }

    if (theTreeMediaWikiRuntime) {
      theTreeMediaWikiRuntime.destroy();
      theTreeMediaWikiRuntime = null;
    }
  }

  function init() {
    if (typeof window === 'undefined') return null;
    destroy();

    // MediaWiki services must exist before Vector registers util.addPortlet and
    // util.addPortletLink hooks.
    theTreeMediaWikiRuntime = installTheTreeMediaWikiRuntime();

    theTreeVectorRuntime = createTheTreeVectorRuntime();
    theTreeVectorRuntime.init();

    return Object.freeze({ initialized: true });
  }

  function reset() {
    schedule(() => {
      init();
    });
  }

  return Object.freeze({
    init,
    destroy,
    reset
  });
}
