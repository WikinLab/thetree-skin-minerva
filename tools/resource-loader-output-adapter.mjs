import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeUrlRewrite(rewrite) {
  if (Array.isArray(rewrite)) return { fromPrefix: rewrite[0], toPrefix: rewrite[1] };
  return {
    fromPrefix: rewrite.fromPrefix ?? rewrite.from,
    toPrefix: rewrite.toPrefix ?? rewrite.to
  };
}

function firstMeaningfulValueNode(nodes) {
  return (nodes || []).find((node) => node.type !== 'space' && node.type !== 'comment');
}

function rewriteUrlValue(value, rewrites) {
  const normalized = asArray(rewrites).map(normalizeUrlRewrite);
  if (!normalized.length || !String(value).includes('url')) return value;
  const parsed = valueParser(value);
  parsed.walk((node) => {
    if (node.type !== 'function' || String(node.value).toLowerCase() !== 'url') return;
    const target = firstMeaningfulValueNode(node.nodes);
    if (!target || !['word', 'string'].includes(target.type)) return;
    for (const rewrite of normalized) {
      const from = String(rewrite.fromPrefix ?? '');
      if (!from || !String(target.value).startsWith(from)) continue;
      target.value = `${String(rewrite.toPrefix ?? '')}${String(target.value).slice(from.length)}`;
      break;
    }
  });
  return parsed.toString();
}

export function rewriteCssUrls(css, rewrites = []) {
  const root = postcss.parse(css);
  root.walkDecls((decl) => {
    decl.value = rewriteUrlValue(decl.value, rewrites);
  });
  return root.toString();
}

export function makeCssAssetUrlRewrites(assetDirectory, { includeLegacyThreeLevelParent = false } = {}) {
  const prefix = String(assetDirectory || '').replace(/\\/g, '/');
  if (!prefix.endsWith('/')) throw new Error('CSS asset directory must end with /');
  return [
    { fromPrefix: 'images/', toPrefix: prefix },
    { fromPrefix: './images/', toPrefix: prefix },
    ...(includeLegacyThreeLevelParent
      ? [{ fromPrefix: '../../../images/', toPrefix: prefix }]
      : [])
  ];
}

function unquoteMessageContentValue(value) {
  const parsed = valueParser(value);
  const meaningful = (parsed.nodes || []).filter((node) => node.type !== 'space' && node.type !== 'comment');
  if (meaningful.length !== 1 || meaningful[0].type !== 'string') return value;
  const inner = valueParser(meaningful[0].value);
  const innerMeaningful = (inner.nodes || []).filter((node) => node.type !== 'space' && node.type !== 'comment');
  if (innerMeaningful.length !== 1) return value;
  const fn = innerMeaningful[0];
  if (fn.type !== 'function' || fn.value !== 'var') return value;
  const variable = firstMeaningfulValueNode(fn.nodes);
  if (!variable || variable.type !== 'word' || !String(variable.value).startsWith('--mw-msg-')) return value;
  return inner.toString();
}

export function unquoteMediaWikiMessageContentVariables(css) {
  const root = postcss.parse(css);
  root.walkDecls('content', (decl) => {
    decl.value = unquoteMessageContentValue(decl.value);
  });
  return root.toString();
}

export function adaptResourceLoaderOutputCss(css, { assetUrlRewrites = [] } = {}) {
  return rewriteCssUrls(
    unquoteMediaWikiMessageContentVariables(css),
    assetUrlRewrites
  );
}

export function rewriteResourceLoaderSelectorRoots(css, rewrites = {}) {
  const entries = Object.entries(rewrites || {});
  if (!entries.length) return css;
  const parsedRewrites = entries.map(([from, to]) => {
    const fromAst = selectorParser().astSync(from);
    const toAst = selectorParser().astSync(to);
    if (fromAst.nodes.length !== 1 || toAst.nodes.length !== 1 || fromAst.first.nodes.length !== 1) {
      throw new Error(`ResourceLoader selector root rewrite must contain one simple source selector and one replacement selector: ${from} -> ${to}`);
    }
    return { from: fromAst.first.first.toString(), to: toAst.first.clone() };
  });
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return;
    rule.selector = selectorParser((selectors) => {
      selectors.each((selector) => {
        selector.walk((node) => {
          for (const rewrite of parsedRewrites) {
            if (node.toString() !== rewrite.from) continue;
            node.replaceWith(...rewrite.to.nodes.map((replacement) => replacement.clone()));
            break;
          }
        });
      });
    }).processSync(rule.selector);
  });
  return root.toString();
}

function customPropertyReferenceRecords(value) {
  const references = [];
  const parsed = valueParser(value);
  parsed.walk((node) => {
    if (node.type !== 'function' || node.value !== 'var') return;
    const variable = firstMeaningfulValueNode(node.nodes);
    if (!variable || variable.type !== 'word' || !String(variable.value).startsWith('--')) return;
    references.push({
      name: variable.value,
      hasFallback: (node.nodes || []).some((child) => child.type === 'div' && child.value === ',')
    });
  });
  return references;
}

function selectorProvidesDocumentCustomProperties(selectorText) {
  let provides = false;
  selectorParser((selectors) => {
    selectors.each((selector) => {
      if (selector.nodes.some((node) => node.type === 'combinator')) return;
      const nodes = selector.nodes.filter((node) => node.type !== 'comment');
      if (nodes.length === 1) {
        const node = nodes[0];
        if (node.type === 'pseudo' && node.value === ':root') provides = true;
        if (node.type === 'tag' && ['html', 'body'].includes(String(node.value).toLowerCase())) provides = true;
      }
      if (
        nodes.length === 2 &&
        nodes[0].type === 'tag' && String(nodes[0].value).toLowerCase() === 'html' &&
        nodes[1].type === 'pseudo' && nodes[1].value === ':root'
      ) provides = true;
    });
  }).processSync(selectorText);
  return provides;
}

function normalizedAtRuleContext(node) {
  const context = [];
  for (let parent = node?.parent; parent; parent = parent.parent) {
    if (parent.type !== 'atrule') continue;
    context.unshift(`@${String(parent.name || '').trim()} ${String(parent.params || '').trim()}`.trim());
  }
  return context;
}

function selectorCompoundSignature(node) {
  if (node.type === 'universal' || node.type === 'comment') return null;
  if (node.type === 'tag') return `tag:${String(node.value || '').toLowerCase()}`;
  if (node.type === 'class') return `class:${node.value}`;
  if (node.type === 'id') return `id:${node.value}`;
  if (node.type === 'attribute') return `attribute:${node.toString()}`;
  if (node.type === 'pseudo') return `pseudo:${node.toString()}`;
  return `${node.type}:${node.toString()}`;
}

function normalizeSelectorCombinator(value) {
  const normalized = String(value || '').trim();
  return normalized === '' ? ' ' : normalized;
}

function parseSelectorBranches(selectorText) {
  const ast = selectorParser().astSync(selectorText);
  return ast.nodes.map((selector) => {
    const compounds = [[]];
    const combinators = [];
    for (const node of selector.nodes || []) {
      if (node.type === 'combinator') {
        combinators.push(normalizeSelectorCombinator(node.value));
        compounds.push([]);
        continue;
      }
      const signature = selectorCompoundSignature(node);
      if (signature) compounds[compounds.length - 1].push(signature);
    }
    return {
      text: selector.toString(),
      compounds: compounds.map((items) => new Set(items)),
      combinators
    };
  });
}

function selectorCompoundCovers(declarationCompound, referenceCompound) {
  for (const signature of declarationCompound) {
    if (!referenceCompound.has(signature)) return false;
  }
  return true;
}

function selectorCombinatorCovers(declarationCombinator, referenceCombinator) {
  if (declarationCombinator === ' ') return referenceCombinator === ' ' || referenceCombinator === '>';
  return declarationCombinator === referenceCombinator;
}

function isDescendantPath(reference, fromIndex, toIndex) {
  for (let index = fromIndex; index < toIndex; index++) {
    const combinator = reference.combinators[index];
    if (combinator !== ' ' && combinator !== '>') return false;
  }
  return true;
}

function selectorBranchProvidesCustomProperty(declaration, reference) {
  const declarationLength = declaration.compounds.length;
  const referenceLength = reference.compounds.length;
  if (!declarationLength || declarationLength > referenceLength) return false;

  const matchFrom = (declarationIndex, referenceIndex) => {
    if (!selectorCompoundCovers(
      declaration.compounds[declarationIndex],
      reference.compounds[referenceIndex]
    )) return false;

    if (declarationIndex === declarationLength - 1) {
      return isDescendantPath(reference, referenceIndex, referenceLength - 1);
    }

    const combinator = declaration.combinators[declarationIndex];
    if (combinator === ' ') {
      for (let next = referenceIndex + 1; next < referenceLength; next++) {
        if (!isDescendantPath(reference, referenceIndex, next)) break;
        if (matchFrom(declarationIndex + 1, next)) return true;
      }
      return false;
    }

    const next = referenceIndex + 1;
    if (next >= referenceLength) return false;
    if (!selectorCombinatorCovers(combinator, reference.combinators[referenceIndex])) return false;
    return matchFrom(declarationIndex + 1, next);
  };

  for (let start = 0; start < referenceLength; start++) {
    if (matchFrom(0, start)) return true;
  }
  return false;
}

function atRuleContextProvidesCustomProperty(declarationContext, referenceContext) {
  if (declarationContext.length > referenceContext.length) return false;
  return declarationContext.every((frame, index) => frame === referenceContext[index]);
}

function selectorBranchProvidesCustomPropertyThroughDom(
  declaration,
  reference,
  domClassDescendants
) {
  if (!(domClassDescendants instanceof Map) || domClassDescendants.size === 0) return false;
  const compoundIndex = declaration.compounds.length - 1;
  if (compoundIndex < 0) return false;
  const compound = declaration.compounds[compoundIndex];
  for (const signature of compound) {
    if (!signature.startsWith('class:')) continue;
    const ancestorClass = signature.slice('class:'.length);
    const descendants = domClassDescendants.get(ancestorClass);
    if (!descendants) continue;
    for (const descendantClass of descendants) {
      const projected = {
        text: declaration.text,
        combinators: [...declaration.combinators],
        compounds: declaration.compounds.map((items, index) => {
          const copy = new Set(items);
          if (index === compoundIndex) {
            copy.delete(signature);
            copy.add(`class:${descendantClass}`);
          }
          return copy;
        })
      };
      if (selectorBranchProvidesCustomProperty(projected, reference)) return true;
    }
  }
  return false;
}

function declarationSiteProvidesReference(
  declarationSite,
  referenceSite,
  domClassDescendants
) {
  if (!atRuleContextProvidesCustomProperty(declarationSite.atRules, referenceSite.atRules)) return false;
  if (declarationSite.documentRoot) return true;
  return referenceSite.selectors.every((referenceSelector) =>
    declarationSite.selectors.some((declarationSelector) =>
      selectorBranchProvidesCustomProperty(declarationSelector, referenceSelector) ||
      selectorBranchProvidesCustomPropertyThroughDom(
        declarationSelector,
        referenceSelector,
        domClassDescendants
      )
    )
  );
}

export function analyzeCssCustomProperties(css) {
  const references = new Set();
  const declarations = new Map();
  const documentDeclarations = new Set();
  const referenceSites = new Map();
  const declarationSites = new Map();
  const root = postcss.parse(css);
  root.walkDecls((decl) => {
    const rule = decl.parent?.type === 'rule' ? decl.parent : null;
    const selectors = rule ? parseSelectorBranches(rule.selector) : [];
    const atRules = normalizedAtRuleContext(decl);
    if (String(decl.prop).startsWith('--')) {
      const values = declarations.get(decl.prop) || new Set();
      values.add(decl.value);
      declarations.set(decl.prop, values);
      const sites = declarationSites.get(decl.prop) || [];
      const documentRoot = Boolean(rule && selectorProvidesDocumentCustomProperties(rule.selector));
      sites.push({ selectors, atRules, selectorText: rule?.selector || '', documentRoot });
      declarationSites.set(decl.prop, sites);
      if (documentRoot) documentDeclarations.add(decl.prop);
    }
    for (const reference of customPropertyReferenceRecords(decl.value)) {
      references.add(reference.name);
      const sites = referenceSites.get(reference.name) || [];
      sites.push({
        selectors,
        atRules,
        selectorText: rule?.selector || '',
        property: decl.prop,
        hasFallback: reference.hasFallback
      });
      referenceSites.set(reference.name, sites);
    }
  });
  return { references, declarations, documentDeclarations, referenceSites, declarationSites };
}

export function findUnresolvedCssCustomPropertyReferences(
  cssSources,
  { domClassDescendants = new Map() } = {}
) {
  const references = new Set();
  const referenceSites = new Map();
  const declarationSites = new Map();
  for (const css of cssSources) {
    const analysis = analyzeCssCustomProperties(css);
    for (const name of analysis.references) references.add(name);
    for (const [name, sites] of analysis.referenceSites) {
      referenceSites.set(name, [...(referenceSites.get(name) || []), ...sites]);
    }
    for (const [name, sites] of analysis.declarationSites) {
      declarationSites.set(name, [...(declarationSites.get(name) || []), ...sites]);
    }
  }

  return [...references].filter((name) => {
    const declarations = declarationSites.get(name) || [];
    return (referenceSites.get(name) || []).some((referenceSite) => {
      if (referenceSite.hasFallback) return false;
      return !declarations.some((declarationSite) =>
        declarationSiteProvidesReference(
          declarationSite,
          referenceSite,
          domClassDescendants
        )
      );
    });
  }).sort();
}

export function extractCssCustomPropertyDeclarations(css, { selector = null } = {}) {
  const declarations = new Map();
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (selector && rule.selector !== selector) return;
    rule.walkDecls((decl) => {
      if (String(decl.prop).startsWith('--')) declarations.set(decl.prop, decl.value);
    });
  });
  return declarations;
}

function isInsideKeyframes(rule) {
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && /(?:^|-)keyframes$/i.test(parent.name || '')) return true;
  }
  return false;
}

function firstCompound(selector) {
  const nodes = [];
  for (const node of selector.nodes || []) {
    if (node.type === 'combinator') break;
    nodes.push(node);
  }
  return nodes;
}

function firstCombinatorIndex(selector) {
  return (selector.nodes || []).findIndex((node) => node.type === 'combinator');
}

function compoundContainsClass(compound, names) {
  return compound.some((node) => node.type === 'class' && names.has(node.value));
}

function compoundContainsId(compound, names) {
  return compound.some((node) => node.type === 'id' && names.has(node.value));
}

function compoundContainsTag(compound, names) {
  return compound.some((node) => node.type === 'tag' && names.has(String(node.value || '').toLowerCase()));
}

function scopeSelectorText(selectorText, {
  scopeSelector,
  rootClassNames,
  rootIdNames,
  rootTagNames,
  ancestorContextClassNames,
  ancestorContextTagNames
}) {
  const rootClasses = new Set(rootClassNames || []);
  const rootIds = new Set(rootIdNames || []);
  const rootTags = new Set((rootTagNames || []).map((name) => String(name).toLowerCase()));
  const contextClasses = new Set(ancestorContextClassNames || []);
  const contextTags = new Set((ancestorContextTagNames || []).map((name) => String(name).toLowerCase()));
  const output = [];

  selectorParser((selectors) => {
    selectors.each((selector) => {
      const raw = selector.toString().trim();
      if (!raw || raw.includes(scopeSelector)) {
        output.push(raw);
        return;
      }

      const compound = firstCompound(selector);
      const rootMatch = compoundContainsClass(compound, rootClasses)
        || compoundContainsId(compound, rootIds);
      if (rootMatch) {
        output.push(`${scopeSelector}${raw}`);
        return;
      }

      const rootTagMatch = compoundContainsTag(compound, rootTags);
      if (rootTagMatch) {
        const combinatorIndex = firstCombinatorIndex(selector);
        const compoundText = (combinatorIndex === -1 ? selector.nodes : selector.nodes.slice(0, combinatorIndex))
          .map((node) => node.toString()).join('').trim();
        const rest = combinatorIndex === -1
          ? ''
          : selector.nodes.slice(combinatorIndex).map((node) => node.toString()).join('');
        output.push(`${scopeSelector} ${raw}`);
        output.push(`${scopeSelector}:is(${compoundText})${rest}`);
        return;
      }

      const contextMatch = compoundContainsClass(compound, contextClasses)
        || compoundContainsTag(compound, contextTags);
      if (contextMatch) {
        const combinatorIndex = firstCombinatorIndex(selector);
        if (combinatorIndex === -1) {
          output.push(`${raw} ${scopeSelector}`);
          return;
        }
        const before = selector.nodes.slice(0, combinatorIndex).map((node) => node.toString()).join('').trim();
        const after = selector.nodes.slice(combinatorIndex).map((node) => node.toString()).join('');
        output.push(`${before} ${scopeSelector}${after}`);
        return;
      }

      output.push(`${scopeSelector} ${raw}`);
    });
  }).processSync(selectorText);

  return output.join(',\n');
}

/*
 * ResourceLoader normally injects SkinModule content CSS only into MediaWiki's
 * page surface. the tree bundles the generated CSS globally, so the output
 * adapter restores that ownership boundary by qualifying every style rule with
 * one explicit surface selector. At-rules and keyframe steps remain unchanged.
 */
export function scopeResourceLoaderOutputCss(css, options = {}) {
  const scopeSelector = String(options.scopeSelector || '').trim();
  if (!scopeSelector) throw new Error('ResourceLoader CSS scope selector is required');
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return;
    rule.selector = scopeSelectorText(rule.selector, {
      scopeSelector,
      rootClassNames: options.rootClassNames || [],
      rootIdNames: options.rootIdNames || [],
      rootTagNames: options.rootTagNames || [],
      ancestorContextClassNames: options.ancestorContextClassNames || [],
      ancestorContextTagNames: options.ancestorContextTagNames || []
    });
  });
  return root.toString();
}

export function filterResourceLoaderOutputCssBySubjectTags(css, tagNames = []) {
  const allowed = new Set((tagNames || []).map((name) => String(name).toLowerCase()));
  if (!allowed.size) throw new Error('ResourceLoader subject tag filter requires at least one tag name');
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return;
    const selectors = selectorParser().astSync(rule.selector);
    const retained = selectors.nodes.filter((selector) => {
      if (selector.nodes.some((node) => node.type === 'combinator')) return false;
      return selector.nodes.some((node) => (
        node.type === 'tag' && allowed.has(String(node.value || '').toLowerCase())
      ));
    });
    if (!retained.length) {
      rule.remove();
      return;
    }
    rule.selector = retained.map((selector) => selector.toString()).join(',\n');
  });

  let removedEmptyContainer = true;
  while (removedEmptyContainer) {
    removedEmptyContainer = false;
    root.walkAtRules((atRule) => {
      if (!Array.isArray(atRule.nodes) || atRule.nodes.length) return;
      atRule.remove();
      removedEmptyContainer = true;
    });
  }
  return root.toString();
}

export function projectResourceLoaderLinkSemantics(css, options = {}) {
  const aliases = new Map(Object.entries(options.classAliases || {}).map(([source, targets]) => [
    source,
    [...new Set(asArray(targets).map(String).filter(Boolean))]
  ]));
  const removableRoots = new Set(options.removableRootClassNames || []);
  const preservedContexts = new Set(options.preserveContextClassNames || []);
  const allowedProperties = new Set((options.allowedProperties || []).map((name) => String(name).toLowerCase()));
  const importantProperties = new Set((options.importantProperties || []).map((name) => String(name).toLowerCase()));
  if (!aliases.size || [...aliases.values()].some((targets) => !targets.length)) {
    throw new Error('ResourceLoader link semantic projection requires complete class aliases');
  }

  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return;
    const selectors = selectorParser().astSync(rule.selector);
    const projected = [];

    for (const selector of selectors.nodes) {
      let hasAnchor = false;
      let hasSemanticClass = false;
      let unsupported = false;
      const choices = [];

      selector.walkTags((node) => {
        const name = String(node.value || '').toLowerCase();
        if (name === 'a') hasAnchor = true;
        else if (!['html', 'body'].includes(name)) unsupported = true;
      });
      selector.walkIds(() => { unsupported = true; });
      selector.walkClasses((node) => {
        const name = String(node.value || '');
        if (aliases.has(name)) {
          hasSemanticClass = true;
          choices.push(aliases.get(name));
        } else if (!removableRoots.has(name) && !preservedContexts.has(name)) {
          unsupported = true;
        }
      });
      if (!hasAnchor || !hasSemanticClass || unsupported) continue;

      let combinations = [[]];
      for (const values of choices) {
        combinations = combinations.flatMap((prefix) => values.map((value) => [...prefix, value]));
      }
      for (const combination of combinations) {
        const clone = selector.clone();
        let semanticIndex = 0;
        clone.walkClasses((node) => {
          const name = String(node.value || '');
          if (aliases.has(name)) node.value = combination[semanticIndex++];
        });
        const roots = [];
        clone.walkClasses((node) => {
          if (removableRoots.has(String(node.value || ''))) roots.push(node);
        });
        for (const node of roots) {
          const parent = node.parent;
          if (parent?.type !== 'selector') {
            unsupported = true;
            break;
          }
          const next = node.next();
          const previous = node.prev();
          node.remove();
          if (next?.type === 'combinator') next.remove();
          else if (previous?.type === 'combinator') previous.remove();
        }
        if (!unsupported) projected.push(clone.toString());
      }
    }

    const unique = [...new Set(projected)];
    if (!unique.length) {
      rule.remove();
      return;
    }
    rule.selector = unique.join(',\n');
    rule.walkDecls((declaration) => {
      const property = String(declaration.prop || '').toLowerCase();
      if (allowedProperties.size && !allowedProperties.has(property)) {
        declaration.remove();
        return;
      }
      if (importantProperties.has(property)) declaration.important = true;
    });
    if (!rule.nodes?.length) rule.remove();
  });

  let removedEmptyContainer = true;
  while (removedEmptyContainer) {
    removedEmptyContainer = false;
    root.walkAtRules((atRule) => {
      if (!Array.isArray(atRule.nodes) || atRule.nodes.length) return;
      atRule.remove();
      removedEmptyContainer = true;
    });
  }
  return root.toString();
}

export function markResourceLoaderPropertiesImportant(css, propertyNames = []) {
  const properties = new Set(asArray(propertyNames).map((name) => String(name).toLowerCase()));
  if (!properties.size) return css;
  const root = postcss.parse(css);
  root.walkDecls((declaration) => {
    if (properties.has(String(declaration.prop || '').toLowerCase())) declaration.important = true;
  });
  return root.toString();
}


function appendSubjectFilter(selector, filterSelector) {
  const filterAst = selectorParser().astSync(`x${filterSelector}`);
  const filterNode = filterAst.first.nodes[1]?.clone();
  if (!filterNode) throw new Error(`Invalid selector subject filter: ${filterSelector}`);

  let lastCombinatorIndex = -1;
  for (let index = 0; index < selector.nodes.length; index += 1) {
    if (selector.nodes[index].type === 'combinator') lastCombinatorIndex = index;
  }

  let pseudoElement = null;
  for (let index = lastCombinatorIndex + 1; index < selector.nodes.length; index += 1) {
    const node = selector.nodes[index];
    if (node.type === 'pseudo' && String(node.value || '').startsWith('::')) {
      pseudoElement = node;
      break;
    }
  }

  if (pseudoElement) selector.insertBefore(pseudoElement, filterNode);
  else selector.append(filterNode);
}

/*
 * The Vector chrome and the tree/Nuxt content share one document. Generated
 * skin CSS therefore remains authoritative outside the immutable host-content
 * root, while the host-content subtree is excluded unless the matched subject
 * is the declared parser-output projection root or one of its descendants.
 *
 * The zero-specificity subject filter preserves the original selector and
 * cascade weight. This makes the projection a routing boundary rather than a
 * second hand-written stylesheet: article output keeps the source declarations
 * and order, raw interface DOM is isolated, and nested edit-preview
 * parser-output is re-admitted through the same projection contract.
 */
export function isolateResourceLoaderOutputCssFromHostContent(css, {
  hostContentSelector,
  projectedSurfaceSelector,
  preserveAncestorClassNames = [],
  preserveAncestorIdNames = []
} = {}) {
  const hostContent = String(hostContentSelector || '').trim();
  const projectedSurface = String(projectedSurfaceSelector || '').trim();
  if (!hostContent) throw new Error('ResourceLoader host-content selector is required');
  if (!projectedSurface) throw new Error('ResourceLoader projected-surface selector is required');

  const preservedClasses = new Set(preserveAncestorClassNames || []);
  const preservedIds = new Set(preserveAncestorIdNames || []);
  const selectorOwnsContentContext = (selector) => (selector.nodes || []).some((node) => (
    (node.type === 'class' && preservedClasses.has(node.value))
    || (node.type === 'id' && preservedIds.has(node.value))
  ));

  const unprojectedRoot = `${hostContent}:not(${projectedSurface})`;
  const unprojectedDescendant = `${hostContent} :not(${projectedSurface}, ${projectedSurface} *)`;
  const subjectFilter = `:where(:not(${unprojectedRoot}, ${unprojectedDescendant}))`;
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return;
    rule.selector = selectorParser((selectors) => {
      selectors.each((selector) => {
        if (selector.toString().includes(subjectFilter)) return;
        if (selectorOwnsContentContext(selector)) return;
        appendSubjectFilter(selector, subjectFilter);
      });
    }).processSync(rule.selector);
  });
  return root.toString();
}

export function withGeneratedCssBanner(css, { banner, moduleName } = {}) {
  const header = banner || `/* Generated from ${moduleName} using tools/resource-loader-less.mjs. */`;
  return `${header}\n${css}\n`;
}
