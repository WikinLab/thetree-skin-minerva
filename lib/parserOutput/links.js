/*
 * the tree link source -> MediaWiki parser-output link contract.
 *
 * Host class ownership comes exclusively from PARSER_OUTPUT_FEATURE_MAP via
 * grammar.js.  This module does not accept suffix aliases or infer decorative
 * child nodes from class/src/alt substrings.
 */

import {
  cloneNode,
  elementNode,
  getAttr,
  getClasses,
  hasAnyClass
} from './domAst.js';
import {
  EXTERNAL_NOFOLLOW_SCHEME_PATTERN,
  EXTERNAL_SCHEME_PATTERN,
  TREE_EXTERNAL_LINK_CLASSES,
  TREE_INTERNAL_LINK_CLASSES,
  TREE_MISSING_LINK_CLASSES
} from './grammar.js';

export function isExternalLink(node) {
  if (node?.type !== 'element' || node.tagName !== 'a') return false;
  const href = getAttr(node, 'href');
  return EXTERNAL_SCHEME_PATTERN.test(href) || hasAnyClass(node, TREE_EXTERNAL_LINK_CLASSES);
}

export function isInternalWikiLink(node) {
  if (node?.type !== 'element' || node.tagName !== 'a') return false;
  if (isExternalLink(node)) return false;
  return hasAnyClass(node, TREE_INTERNAL_LINK_CLASSES)
    || hasAnyClass(node, TREE_MISSING_LINK_CLASSES);
}

function isTreeInternalLinkSourceClass(className) {
  return TREE_INTERNAL_LINK_CLASSES.has(className)
    || TREE_MISSING_LINK_CLASSES.has(className);
}

function internalLinkAttrs(source) {
  const attrs = [];
  for (const attr of source.attrs || []) {
    const name = attr.name.toLowerCase();
    if (name === 'style' || name === 'class') continue;
    attrs.push({ ...attr });
  }
  const sourceClasses = getClasses(source);
  const classes = sourceClasses.filter((className) => !isTreeInternalLinkSourceClass(className));
  if (sourceClasses.some((className) => TREE_MISSING_LINK_CLASSES.has(className))) classes.push('new');
  const uniqueClasses = Array.from(new Set(classes.filter(Boolean)));
  if (uniqueClasses.length) attrs.push({ name: 'class', value: uniqueClasses.join(' ') });
  return attrs;
}

export function transformInternalWikiLink(node, context, transformNode) {
  const sourceClasses = getClasses(node);
  const alreadyCompiled = !sourceClasses.some((className) => isTreeInternalLinkSourceClass(className))
    && !getAttr(node, 'style');
  if (alreadyCompiled) return cloneNode(node);
  return elementNode('a', internalLinkAttrs(node), node.children.flatMap((child) => transformNode(child, context)));
}

export function transformExternalLink(node, context, transformNode) {
  const existingClasses = getClasses(node);
  const alreadyCompiled = existingClasses.includes('external')
    && existingClasses.includes('text')
    && !existingClasses.some((className) => TREE_EXTERNAL_LINK_CLASSES.has(className))
    && !getAttr(node, 'style');
  if (alreadyCompiled) return cloneNode(node);

  const attrs = node.attrs
    .filter((attr) => !['class', 'style'].includes(attr.name.toLowerCase()))
    .map((attr) => ({ ...attr }));
  const classes = existingClasses.filter((className) => !TREE_EXTERNAL_LINK_CLASSES.has(className));
  classes.push('external', 'text');
  attrs.push({ name: 'class', value: Array.from(new Set(classes)).join(' ') });

  const href = getAttr(node, 'href');
  if (EXTERNAL_NOFOLLOW_SCHEME_PATTERN.test(href) && !node.attrs.some((attr) => attr.name.toLowerCase() === 'rel')) {
    attrs.push({ name: 'rel', value: 'nofollow noreferrer noopener' });
  }
  return elementNode('a', attrs, node.children.flatMap((child) => transformNode(child, context)));
}
