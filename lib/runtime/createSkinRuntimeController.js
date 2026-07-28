import { installTheTreeMediaWikiRuntime } from '../adapters/thetree-mediawiki/runtime.js';
import { createTheTreeVectorRuntime } from '../adapters/thetree-vector/skin-legacy.js';
import { createLegacyProjectionSurfaceRuntime } from '../legacyMountedParserOutputTransform';
import { createLegacyParserOutputFragmentNavigationRuntime } from '../legacyParserOutputFragmentNavigation';
import { createTheTreePopupsRuntime } from '../adapters/thetree-popups/runtime.js';

function noop() {}

export function createSkinRuntimeController({
  getProjectionSurfaceOptions = () => ({}),
  getPopupsData = () => ({}),
  getPopupsOptions = () => ({}),
  onProjectionSurfaceTransform = noop,
  schedule = (callback) => callback()
} = {}) {
  let theTreeMediaWikiRuntime = null;
  let theTreeVectorRuntime = null;
  let legacyParserOutputFragmentNavigationRuntime = null;
  let projectionSurfaceRuntime = null;
  let theTreePopupsRuntime = null;

  function destroy() {
    if (theTreePopupsRuntime) {
      theTreePopupsRuntime.destroy();
      theTreePopupsRuntime = null;
    }

    if (projectionSurfaceRuntime) {
      projectionSurfaceRuntime.destroy();
      projectionSurfaceRuntime = null;
    }

    if (legacyParserOutputFragmentNavigationRuntime) {
      legacyParserOutputFragmentNavigationRuntime.destroy();
      legacyParserOutputFragmentNavigationRuntime = null;
    }

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

    const popupsData = getPopupsData();
    const popupsOptions = getPopupsOptions();

    // MediaWiki services must exist before Vector registers util.addPortlet and
    // util.addPortletLink hooks. Popups and Cite consume this same namespace.
    theTreeMediaWikiRuntime = installTheTreeMediaWikiRuntime(popupsData, popupsOptions);

    theTreeVectorRuntime = createTheTreeVectorRuntime();
    theTreeVectorRuntime.init();

    legacyParserOutputFragmentNavigationRuntime = createLegacyParserOutputFragmentNavigationRuntime();
    legacyParserOutputFragmentNavigationRuntime.init();

    projectionSurfaceRuntime = createLegacyProjectionSurfaceRuntime(getProjectionSurfaceOptions);
    const projectionSurfaceResult = projectionSurfaceRuntime.init();
    onProjectionSurfaceTransform(projectionSurfaceResult);

    theTreePopupsRuntime = createTheTreePopupsRuntime(popupsData, {
      ...popupsOptions,
      mediaWikiRuntime: theTreeMediaWikiRuntime
    });
    theTreePopupsRuntime.init();

    return {
      projectionSurfaceTransform: projectionSurfaceResult
    };
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
