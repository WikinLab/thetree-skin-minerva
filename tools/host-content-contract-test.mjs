#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function imports(source) {
  return [...source.matchAll(/@import\s+["']([^"']+)["']\s*;/g)].map((match) => match[1]);
}

function selectors(relativePath) {
  const result = [];
  postcss.parse(read(relativePath), { from: relativePath }).walkRules((rule) => {
    selectorParser().processSync(rule.selector);
    result.push(rule.selector);
  });
  return result;
}

const screenSource = read('css/screen.css');
const hostContentImport = '@import "./host-content.css";';
const projectionImport = '@import "./content-projection.css";';
assert.equal(screenSource.split(hostContentImport).length - 1, 1);
assert.ok(screenSource.indexOf(hostContentImport) < screenSource.indexOf(projectionImport));

assert.deepEqual(imports(read('css/host-content.css')), [
  './host-content/foundation.css',
  './host-content/source-links.css'
]);

const foundationSource = read('css/host-content/foundation.css');
const foundationSelectors = selectors('css/host-content/foundation.css');
assert.ok(foundationSelectors.length > 0);
for (const selector of foundationSelectors) {
  assert.match(selector, /\[data-tt-host-content="1"\]/);
  assert.match(selector, /\[data-tt-vector-surface="parser-output"\]/);
}
assert.match(foundationSource, /box-sizing:\s*border-box/);
assert.match(foundationSource, /::before/);
assert.match(foundationSource, /::after/);
assert.doesNotMatch(foundationSource, /!important/);
assert.doesNotMatch(foundationSource, /data-tt-content-projection/);

const sourceLinksSource = read('css/host-content/source-links.css');
const upstreamElementsSource = read('vendor/mediawiki-core/resources/src/mediawiki.skinning/elements.less');
const sourceLinkSelectors = selectors('css/host-content/source-links.css');
assert.ok(sourceLinkSelectors.length >= 5);
for (const selector of sourceLinkSelectors) {
  assert.match(selector, /\[data-tt-host-content="1"\]/);
  assert.match(selector, /\[data-tt-vector-surface="parser-output"\]/);

  const selectorAst = selectorParser().astSync(selector);
  assert.equal(selectorAst.nodes.length, 1);
  const topLevelNodes = selectorAst.nodes[0].nodes;
  const hostBoundaryIndex = topLevelNodes.findIndex((node) => (
    node.type === 'pseudo'
    && node.value === ':where'
    && node.toString().includes('#mw-content-text')
  ));
  const linkSubjectIndex = topLevelNodes.findIndex((node) => (
    node.type === 'pseudo'
    && node.value === ':where'
    && /^:where\(a(?:\)|:)/.test(node.toString())
  ));
  const parserOutputExclusionIndex = topLevelNodes.findIndex((node) => (
    node.type === 'pseudo'
    && node.value === ':not'
    && node.toString().includes('[data-tt-vector-surface="parser-output"]')
  ));

  assert.equal(hostBoundaryIndex, 0);
  assert.equal(topLevelNodes[hostBoundaryIndex + 1]?.type, 'combinator');
  assert.equal(parserOutputExclusionIndex, linkSubjectIndex + 1);
  assert.notEqual(topLevelNodes[linkSubjectIndex + 1]?.type, 'combinator');
}
assert.match(upstreamElementsSource, /a\s*\{[\s\S]*?color:\s*@color-link;/);
assert.match(upstreamElementsSource, /&:not\(\s*\[\s*href\s*\]\s*\)\s*\{[\s\S]*?cursor:\s*pointer/);
assert.match(sourceLinksSource, /:where\(a\):not\(/);
assert.match(sourceLinksSource, /a:not\(\[href\]\)/);
assert.match(sourceLinksSource, /cursor:\s*pointer/);
assert.match(sourceLinksSource, /a:visited/);
assert.match(sourceLinksSource, /var\(--color-link,\s*#36c\)/);
assert.match(sourceLinksSource, /var\(--color-link--visited,\s*#6a60b0\)/);
assert.match(sourceLinksSource, /var\(--color-link--active,\s*#233566\)/);
assert.match(sourceLinksSource, /background:\s*none/);
assert.match(sourceLinksSource, /a:hover,\s*a:focus/);
assert.doesNotMatch(sourceLinksSource, /color-link--hover/);
assert.doesNotMatch(sourceLinksSource, /!important/);

console.log('checked host content foundation and source link theme contract');
