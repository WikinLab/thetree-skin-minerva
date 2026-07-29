/*
 * Skin-level article compiler for the tree WikiContent HTML.
 *
 * The parser/frontend cannot be changed, so the skin owns a narrow pre-render
 * compiler boundary: the tree contentHtml/topDocument/bottomDocument fragments
 * are read before <nuxt/> paints, interpreted into small article IR models, and
 * emitted as MediaWiki-compatible parser-output structures. This file is the
 * orchestration boundary; parser-output sub-contracts live under lib/parserOutput/.
 */

import { makeLegacyMediaWikiLanguageContext } from './legacyMediaWikiMessages.js';
import {
  parseHtmlFragment,
  serializeHtml,
  cloneNode,
  collectElements
} from './parserOutput/domAst.js';
import {
  ARTICLE_INPUT_GRAMMAR as PARSER_INPUT_GRAMMAR,
  ARTICLE_OUTPUT_GRAMMAR as PARSER_OUTPUT_GRAMMAR
} from './parserOutput/grammar.js';
import {
  isTreeCategorySource,
  transformCategorySource
} from './parserOutput/categories.js';
import {
  collectReferenceModels,
  isReferenceList,
  isReferenceSup,
  transformReferenceList,
  transformReferenceSup
} from './parserOutput/cite.js';
import {
  collectSectionModels,
  isHeadingContent,
  isTreeHeading,
  renderHeadingFromSection
} from './parserOutput/heading.js';
import {
  isTreeToc,
  renderTocFromSections
} from './parserOutput/toc.js';
import {
  isTheTreePreCodeBlock,
  isTreeBlockquote,
  isTreeClearfix,
  isTreeIndent,
  isTreeList,
  isTreeParagraph,
  transformArticleFlowChildren,
  transformSingleParagraphContentOrChildren,
  transformTreeBlockquote,
  transformTreeClearfix,
  transformTreeIndent,
  transformTreeList,
  transformTreeParagraph,
  transformTreePreCodeBlock
} from './parserOutput/flow.js';
import {
  isTreeTable,
  isTreeTableWrapper,
  renderTableNode,
  renderTableWrapper
} from './parserOutput/tables.js';
import {
  isExternalLink,
  isInternalWikiLink,
  transformExternalLink,
  transformInternalWikiLink
} from './parserOutput/links.js';
import {
  emitArticleRoot,
  unwrapParserOutputRootWrapper
} from './parserOutput/root.js';
import {
  STORE_ARTICLE_HTML_TARGETS,
  applyLegacyParserOutputTransformToStore as applyStoreParserOutputTransform,
  collectLegacyParserOutputStoreTargets,
  subscribeLegacyParserOutputTransformToStore as subscribeStoreParserOutputTransform
} from './parserOutput/store.js';

export {
  PARSER_INPUT_GRAMMAR as ARTICLE_INPUT_GRAMMAR,
  PARSER_OUTPUT_GRAMMAR as ARTICLE_OUTPUT_GRAMMAR,
  parseHtmlFragment,
  serializeHtml,
  STORE_ARTICLE_HTML_TARGETS,
  collectLegacyParserOutputStoreTargets
};

function mediaWikiLanguageContext(lang, options = {}) {
  return makeLegacyMediaWikiLanguageContext({ lang, ...options });
}

const PARSER_OUTPUT_SOURCE_PREDICATES = Object.freeze({
  isTreeToc,
  isTreeHeading,
  isHeadingContent,
  isTreeCategorySource,
  isTreeTableWrapper,
  isTreeTable,
  isReferenceList
});

function transformChildren(children, context) {
  const output = [];
  for (const child of children) output.push(...transformNode(child, context));
  return output;
}

function transformTableSingleParagraphContent(children, context) {
  return transformSingleParagraphContentOrChildren(children, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);
}

export function transformNode(node, context, flags = {}) {
  if (!node) return [];
  if (node.type === 'text' || node.type === 'comment') return [cloneNode(node)];
  if (node.type === 'root') return transformArticleFlowChildren(node.children, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);

  if (!flags.inHeadingTitle && isTreeToc(node)) {
    if (context.textExtractsMode) return [];
    const toc = renderTocFromSections(context);
    return toc ? [toc] : [cloneNode(node)];
  }
  if (!flags.inHeadingTitle && isTreeHeading(node)) {
    const section = context.sectionBySource.get(node);
    return section ? [renderHeadingFromSection(section, context, transformNode)] : [cloneNode(node)];
  }
  if (!flags.inHeadingTitle && isHeadingContent(node)) {
    return transformArticleFlowChildren(node.children, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);
  }
  if (!flags.inHeadingTitle && isTreeCategorySource(node)) return transformCategorySource(node, context);
  if (isTreeClearfix(node)) return transformTreeClearfix(node, context);
  if (isTheTreePreCodeBlock(node)) return transformTreePreCodeBlock(node, context, transformNode);
  if (isTreeTableWrapper(node)) return renderTableWrapper(node, context, transformNode, transformTableSingleParagraphContent);
  if (isTreeTable(node)) return [renderTableNode(node, context, transformNode, transformTableSingleParagraphContent)];
  if (isTreeParagraph(node)) return transformTreeParagraph(node, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);
  if (isTreeList(node)) return [transformTreeList(node, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES)];
  if (isTreeIndent(node)) return transformTreeIndent(node, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);
  if (isTreeBlockquote(node)) return transformTreeBlockquote(node, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);
  if (isReferenceSup(node)) return [transformReferenceSup(node, context)];
  if (isReferenceList(node)) return [transformReferenceList(node, context, transformNode)];
  if (isExternalLink(node)) return [transformExternalLink(node, context, transformNode)];
  if (isInternalWikiLink(node)) return [transformInternalWikiLink(node, context, transformNode)];
  const out = cloneNode(node);
  out.children = transformChildren(node.children || [], context);
  return [out];
}

function makeArticleCompilerContext(ast, options = {}) {
  let sequence = 0;
  const sections = collectSectionModels(ast, collectElements);
  const minSectionLevel = sections.reduce((min, section) => Math.min(min, section.level), 2);
  const sectionBySource = new WeakMap();
  sections.forEach((section) => sectionBySource.set(section.source, section));
  const languageContext = mediaWikiLanguageContext(options.lang || 'ko', { config: options.config || {}, messages: options.messages || null });
  const context = {
    kind: 'ArticleIR',
    lang: options.lang || 'ko',
    htmlLang: languageContext.htmlCode,
    dir: languageContext.dir,
    messages: languageContext.messages,
    sections,
    minSectionLevel,
    sectionBySource,
    hasStructuredCategories: !!options.hasStructuredCategories,
    textExtractsMode: !!options.textExtractsMode,
    referenceNotes: [],
    referenceNoteByKey: new Map(),
    referenceInlineBySource: new WeakMap(),
    referenceListItemBySource: new WeakMap(),
    nextId(prefix) {
      sequence += 1;
      return `${prefix}-${sequence}`;
    }
  };
  collectReferenceModels(ast, context);
  return context;
}

function compileArticleAst(ast, options = {}) {
  const context = makeArticleCompilerContext(ast, options);
  const body = unwrapParserOutputRootWrapper(transformArticleFlowChildren(ast.children, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES));
  return {
    kind: 'ArticleIR',
    context,
    body
  };
}

export function projectParserOutputHtml(html, options = {}) {
  if (typeof html !== 'string' || html.length === 0) return html;
  if (!/[<][A-Za-z!/?]/.test(html)) return html;
  const ast = parseHtmlFragment(html);
  const article = compileArticleAst(ast, options);
  return serializeHtml(emitArticleRoot(article, options));
}


// Backward-compatible export for extension bridges that consume the same canonical projector.
export const transformHtmlFragment = projectParserOutputHtml;

export function applyLegacyParserOutputTransformToStore(storeState) {
  return applyStoreParserOutputTransform(storeState, projectParserOutputHtml);
}

export function subscribeLegacyParserOutputTransformToStore(store, storeState, onResult) {
  return subscribeStoreParserOutputTransform(store, storeState, onResult, projectParserOutputHtml);
}

export const legacyParserOutputTransformContract = {
  contractVersion: 2,
  owns: [
    'pre-render skin-level article compiler with store-target output signature cache',
    'parser-output compiler orchestration boundary with heading/toc/flow/table/link/root/store sub-contract modules',
    'single exact $store.state.viewData target for contentHtml/topDocument/bottomDocument matching the tree wiki.vue -> WikiContent prop flow',
    'ordinary article parser-output compilation before WikiContent v-html rendering without a mounted article fallback',
    'Vuex subscription guard for post-navigation store mutations before Nuxt v-html repaint',
    'explicit ARTICLE_INPUT_GRAMMAR to ARTICLE_OUTPUT_GRAMMAR boundary',
    'single PARSER_OUTPUT_FEATURE_MAP source-to-target contract for heading/toc/category/table/flow/link/reference/root features',
    'exact the tree emitter tokens derived from the feature map instead of per-module aliases or class-substring patterns',
    'SectionIR extraction from actual the tree backend hN.wiki-heading grammar before TOC and heading emission',
    'TableIR-style table subtree regeneration without source presentation classes',
    'table caption subtree normalization using the same simple-paragraph elimination rule as MediaWiki table cells',
    'deterministic table wrapper style merge with duplicate CSS declarations collapsed after safe-style filtering',
    'the tree table-right/table-center wrapper layout semantics compiled into MediaWiki table style attributes',
    'the tree wiki-clearfix marker compiled into MediaWiki clear-both flow block',
    'the tree pre > code preformatted blocks normalized into MediaWiki generic pre blocks while preserving text and highlighter token spans without classifying them as SyntaxHighlight',
    'source-to-origin contract correction for backend paragraph/list/table/indent/blockquote/link/reference artifacts',
    'source grammar artifact elimination for wiki-paragraph/wiki-list/wiki-indent/wiki-quote wrappers without CSS compensation',
    'MediaWiki BlockLevelPass-derived paragraph boundary handling for mixed block/inline the tree paragraph wrappers',
    'source separator br and browser-repair empty p artifacts removed only through article-flow recompilation',
    'body-content scope owned by SkinLegacyShell #mw-content-text, with one compiler-owned contentHtml .mw-parser-output root marked by data-tt-vector-parser-output',
    'MediaWiki 1.45 mw-heading wrapper grammar with semantic editsection label normalization',
    'ordinary paragraph/list/hr/pre flow preservation without wrapper insertion and pre-code blocks normalized only through the exact backend emitter contract',
    'the tree internal link semantics to MediaWiki article link status classes',
    'ReferenceIR collection from exact the tree wiki-fn-content/wiki-macro-footnote output grammar before MediaWiki Cite DOM emission',
    'Cite REL1_46 inline marker bracket span emission with cite_ref-name_number-ordinal and cite_note-name-number ids',
    'the tree fn/rfn ids, including tc<commentId>-prefixed ids, are paired before Cite id emission and source backlink markers are removed from reference-text',
    'the tree external link semantics to MediaWiki external link subtree',
    'language-aware TOC/category messages and Vector typography handoff',
    'MediaWiki core source-oracle heading wrapper topology from elements.less and HandleSectionLinks behavior',
    'structured category slot duplicate suppression without mounted DOM extraction',
    'idempotent repeated guard execution with visited/changed path reporting',
    'recognized source predicates require exact the tree emitter classes instead of substring class heuristics',
    'heading compilation requires the exact h2-h6.wiki-heading plus s-<number> TOC anchor topology emitted by the tree namumark worker'
  ],
  forbids: [
    'ordinary article mounted structural DOM rewriting or #mw-content-text > .wiki-content discovery',
    'mounted structural content DOM rewriting as default path',
    'regex replacement as structural transform mechanism',
    'class-only half-transform for heading/toc/table/reference/indent/blockquote structures',
    'compiled table captions retaining the tree wiki-paragraph wrapper as a visible p child',
    'compiled tables retaining duplicated style declarations when wrapper width/style is folded into the target table',
    'source section numbers inside emitted article headings',
    'parser-output bridge touching Vector chrome',
    'interface-page bridge touching article parser-output structures',
    'duplicate lifecycle entrypoints that mutate the same article HTML targets independently',
    'converting ambiguous heading-like or footnote-like custom widgets that do not carry exact the tree emitter classes',
    'TOC-adjacent CSS or selector patches such as #toc + br compensation instead of article-flow recompilation',
    'TOC-specific repositioning for floated infobox layouts instead of table wrapper layout compilation',
    'CSS-only nested pre/code compensation instead of pre-code DOM contract normalization',
    'ambiguous pre > code blocks being classified as MediaWiki SyntaxHighlight without preserved source language metadata',
    'independent parser-output module alias lists, wildcard class suffixes, or aria/src/alt-based link and heading artifact inference'
  ]
};
