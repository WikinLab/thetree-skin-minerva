/*
 * Optional Vector content projection.
 *
 * The host Nuxt content is the invariant input. This module owns every
 * operation that projects that input into MediaWiki content semantics. The
 * Vector chrome imports only this public entry and may omit it entirely for a
 * projection-free distribution.
 */

import { getLegacyPageContract } from '../legacyPageContract';
import { SURFACE_TYPE_INTERFACE } from '../legacySpecialPageContract';
import { makeLegacyCategoryData } from './categoryData';
import { createLegacyParserOutputFragmentNavigationRuntime } from './fragmentNavigation';
import { createLegacyProjectionSurfaceRuntime } from './mounted';
import { createLegacyParserOutputStoreRuntime } from './storeRuntime';

export const CONTENT_PROJECTION_ID = 'vector';

function resolveOptions(optionsSource = {}) {
  const options = typeof optionsSource === 'function' ? optionsSource() : optionsSource;
  return options && typeof options === 'object' ? options : {};
}

function resolveMountedRoot(optionsSource = {}) {
  const options = resolveOptions(optionsSource);
  return typeof options.getRoot === 'function' ? options.getRoot() : options.root || null;
}

function createMountedContentProjectionRuntime(optionsSource = {}) {
  let projectionRuntime = null;
  let fragmentNavigationRuntime = null;

  function init() {
    destroy();
    try {
      fragmentNavigationRuntime = createLegacyParserOutputFragmentNavigationRuntime({
        root: resolveMountedRoot(optionsSource)
      });
      fragmentNavigationRuntime.init();

      projectionRuntime = createLegacyProjectionSurfaceRuntime(optionsSource);
      const result = projectionRuntime.init();
      return result;
    } catch (error) {
      destroy();
      throw error;
    }
  }

  function destroy() {
    if (projectionRuntime) projectionRuntime.destroy();
    projectionRuntime = null;
    if (fragmentNavigationRuntime) fragmentNavigationRuntime.destroy();
    fragmentNavigationRuntime = null;
  }

  return Object.freeze({ init, destroy });
}

function resolveProjectedSurface(context = {}) {
  const pageContract = getLegacyPageContract(context);
  const projection = pageContract.projection;
  const root = projection.root;
  return Object.freeze({
    projection,
    root,
    isArticle: pageContract.isArticle,
    isInterface: root.type === SURFACE_TYPE_INTERFACE,
    featureEquivalence: pageContract.featureEquivalence
  });
}

export const vectorContentProjection = Object.freeze({
  id: CONTENT_PROJECTION_ID,
  resolveSurface: resolveProjectedSurface,
  makeCategoryData: makeLegacyCategoryData,
  createStoreRuntime: createLegacyParserOutputStoreRuntime,
  createMountedRuntime: createMountedContentProjectionRuntime
});

export default vectorContentProjection;
