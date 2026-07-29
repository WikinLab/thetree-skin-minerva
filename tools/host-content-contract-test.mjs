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
const sourceLinkSelectors = selectors('css/host-content/source-links.css');
assert.ok(sourceLinkSelectors.length >= 3);
for (const selector of sourceLinkSelectors) {
  assert.match(selector, /\[data-tt-host-content="1"\]/);
  assert.match(selector, /\[data-tt-vector-surface="parser-output"\]/);
}
assert.match(sourceLinksSource, /a:visited/);
assert.match(sourceLinksSource, /var\(--color-link,\s*#36c\)/);
assert.match(sourceLinksSource, /var\(--color-link--hover,\s*#3056a9\)/);
assert.match(sourceLinksSource, /var\(--color-link--active,\s*#233566\)/);
assert.doesNotMatch(sourceLinksSource, /!important/);

console.log('checked host content foundation and source link theme contract');
