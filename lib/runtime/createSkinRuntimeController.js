import { installTheTreeMediaWikiRuntime } from '../adapters/thetree-mediawiki/runtime.js';
import { createTheTreeVectorRuntime } from '../adapters/thetree-vector/skin-legacy.js';
import { createTheTreePopupsRuntime } from '../adapters/thetree-popups/runtime.js';

function noop() {}

export function createSkinRuntimeController({
  createContentRuntime = null,
  getContentRuntimeOptions = () => ({}),
  getPopupsData = () => ({}),
  getPopupsOptions = () => ({}),
  onContentTransform = noop,
  schedule = (callback) => callback()
} = {}) {
  let theTreeMediaWikiRuntime = null;
  let theTreeVectorRuntime = null;
  let contentRuntime = null;
  let theTreePopupsRuntime = null;

  function destroy() {
    if (theTreePopupsRuntime) {
      theTreePopupsRuntime.destroy();
      theTreePopupsRuntime = null;
    }

    if (contentRuntime) {
      contentRuntime.destroy();
      contentRuntime = null;
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

    const contentResult = typeof createContentRuntime === 'function'
      ? (() => {
        contentRuntime = createContentRuntime(getContentRuntimeOptions);
        return contentRuntime.init();
      })()
      : null;
    onContentTransform(contentResult);

    theTreePopupsRuntime = createTheTreePopupsRuntime(popupsData, {
      ...popupsOptions,
      mediaWikiRuntime: theTreeMediaWikiRuntime
    });
    theTreePopupsRuntime.init();

    return {
      contentTransform: contentResult
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
