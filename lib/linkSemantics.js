/*
 * Exact the tree -> MediaWiki link semantics shared by native CSS projection
 * and projected ParserOutput conversion. Presentation values never belong here.
 */

function freezeSemantic(definition) {
  return Object.freeze(Object.fromEntries(
    Object.entries(definition).map(([key, value]) => [
      key,
      Array.isArray(value) ? Object.freeze([...value]) : value
    ])
  ));
}

export const LINK_SEMANTICS = Object.freeze({
  internal: freezeSemantic({
    hostClasses: ['wiki-link-internal'],
    presentationOwner: 'skin-variant'
  }),
  missing: freezeSemantic({
    hostClasses: ['not-exist'],
    upstreamClasses: ['new'],
    presentationOwner: 'skin-variant'
  }),
  self: freezeSemantic({
    hostClasses: ['wiki-self-link'],
    upstreamClasses: ['mw-selflink'],
    presentationOwner: 'skin-variant'
  }),
  external: freezeSemantic({
    hostClasses: ['wiki-link-external', 'wiki-link-whitelisted'],
    upstreamClasses: ['external', 'extiw'],
    emittedClasses: ['external', 'text'],
    presentationOwner: 'skin-variant',
    preserveHostClasses: false
  })
});

export default LINK_SEMANTICS;
