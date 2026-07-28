import { SEARCH_TARGET_POLICY } from './legacyHostAdapterPolicy';
/*
 * Adapter for REL1_46 LegacySearchBox submit behavior in the the tree router.
 *
 * LegacySearchBox.mustache renders both submit controls in tree order:
 *   1. name="fulltext" (#mw-searchButton)
 *   2. name="go" (#searchButton)
 * Browsers use the first submit button by default when Enter submits the input.
 * MediaWiki searchSuggest later removes/overrides the fulltext button; the tree
 * port does not run that module, so we preserve the explicit button modes here.
 */

export const SEARCH_MODE_FULLTEXT = 'fulltext';
export const SEARCH_MODE_GO = 'go';

export function getSearchModeFromSubmitEvent(event) {
  const submitterName = event && event.submitter && event.submitter.name;
  return submitterName === SEARCH_MODE_GO ? SEARCH_MODE_GO : SEARCH_TARGET_POLICY.defaultSubmitMode;
}

export function makeFulltextSearchTarget(query) {
  return {
    path: SEARCH_TARGET_POLICY.fulltextPath,
    query: { [SEARCH_TARGET_POLICY.queryParam]: query }
  };
}

export function makeGoSearchTarget(query, buildDocumentTarget) {
  return typeof buildDocumentTarget === 'function'
    ? buildDocumentTarget(query)
    : query;
}

export function makeSearchSubmitTarget(query, mode, options = {}) {
  if (mode === SEARCH_MODE_GO) {
    return makeGoSearchTarget(query, options.buildDocumentTarget);
  }
  return makeFulltextSearchTarget(query);
}


export function makeSearchSubmitTargetForContext(query, mode, context = {}) {
  return makeSearchSubmitTarget(query, mode, {
    buildDocumentTarget: (title) => {
      const builder = context.linkBuilders && context.linkBuilders.documentAction;
      return typeof builder === 'function' ? builder(title, SEARCH_TARGET_POLICY.goAction) : title;
    }
  });
}
