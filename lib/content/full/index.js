/*
 * Full MediaWiki content profile.
 *
 * This is the only profile currently shipped. It owns every operation that
 * changes the tree content into MediaWiki content: pre-render ParserOutput
 * compilation, mounted dynamic WikiContent projection, fragment navigation,
 * Vector category ownership, and the active surface contract. The shell does
 * not import those concrete implementations directly.
 */

import { getLegacyPageContract } from '../../legacyPageContract';
import { SURFACE_TYPE_INTERFACE } from '../../legacySpecialPageContract';
import { defineContentProfile } from '../contract';
import { makeLegacyCategoryData } from './categoryData';
import { createLegacyParserOutputFragmentNavigationRuntime } from './fragmentNavigation';
import { createLegacyProjectionSurfaceRuntime } from './mounted';
import { createLegacyParserOutputStoreRuntime } from './storeRuntime';

export const CONTENT_PROFILE_FULL = 'full';

function resolveOptions(optionsSource = {}) {
  const options = typeof optionsSource === 'function' ? optionsSource() : optionsSource;
  return options && typeof options === 'object' ? options : {};
}

function resolveMountedRoot(optionsSource = {}) {
  const options = resolveOptions(optionsSource);
  return typeof options.getRoot === 'function' ? options.getRoot() : options.root || null;
}

function createFullMountedContentRuntime(optionsSource = {}) {
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

function resolveFullSurface(context = {}) {
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

export const FULL_CONTENT_PROFILE = defineContentProfile({
  id: CONTENT_PROFILE_FULL,
  implementation: 'mediawiki-parser-output',
  categoryOwnership: 'vector',
  styleDomain: 'mediawiki',
  resolveSurface: resolveFullSurface,
  makeCategoryData: makeLegacyCategoryData,
  createStoreRuntime: createLegacyParserOutputStoreRuntime,
  createMountedRuntime: createFullMountedContentRuntime
});
