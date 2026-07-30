#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { resolveResourceLoaderOriginContract } from './resource-loader-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function imports(source) {
  return [...source.matchAll(/@import\s+["']([^"']+)["']\s*;/g)].map((match) => match[1]);
}

function rules(relativePath) {
  const result = [];
  postcss.parse(read(relativePath), { from: relativePath }).walkRules((rule) => {
    selectorParser().processSync(rule.selector);
    result.push(rule);
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
  './host-content/native-links.css'
]);

const foundationSource = read('css/host-content/foundation.css');
const foundationRules = rules('css/host-content/foundation.css');
assert.ok(foundationRules.length > 0);
for (const rule of foundationRules) {
  assert.match(rule.selector, /\[data-tt-host-content="1"\]/);
  assert.match(rule.selector, /\[data-tt-vector-surface="parser-output"\]/);
}
assert.match(foundationSource, /box-sizing:\s*border-box/);
assert.match(foundationSource, /::before/);
assert.match(foundationSource, /::after/);
assert.doesNotMatch(foundationSource, /!important/);
assert.doesNotMatch(foundationSource, /data-tt-content-projection/);

const nativeLinksSource = read('css/host-content/native-links.css');
const nativeLinkRules = rules('css/host-content/native-links.css');
assert.equal(nativeLinkRules.length, 1);
const nativeLinkRule = nativeLinkRules[0];
const nativeLinkSelectors = selectorParser().astSync(nativeLinkRule.selector).nodes;
assert.equal(nativeLinkSelectors.length, 5);
for (const selector of nativeLinkSelectors) {
  assert.match(selector.toString(), /\[data-tt-host-content="1"\]/);
  assert.match(selector.toString(), /\[data-tt-vector-surface="parser-output"\]/);
  assert.match(selector.toString(), /:where\(a/);
  assert.match(selector.toString(), /\[data-tt-vector-surface="parser-output"\]\s+\*/);
}
for (const state of ['', ':hover', ':focus', ':active', ':visited']) {
  assert.ok(nativeLinkSelectors.some((selector) => selector.toString().includes(`:where(a${state}:not(`)));
}
assert.equal(nativeLinkRule.nodes.length, 1);
assert.equal(nativeLinkRule.nodes[0].prop, 'text-decoration');
assert.equal(nativeLinkRule.nodes[0].value, 'none');
assert.equal(Boolean(nativeLinkRule.nodes[0].important), false);
assert.doesNotMatch(nativeLinksSource, /\bcolor\s*:|background|content\s*:|font-family|wiki-link|not-exist|!important/);

const rawResourceLoaderContract = JSON.parse(read('contracts/resource-loader-origin-contract.json'));
const resourceLoaderContract = resolveResourceLoaderOriginContract(root, rawResourceLoaderContract);
const skinVariantContract = JSON.parse(read('contracts/skin-variant-contract.json'));
const generatedVectorCss = read('css/vendor/resource-loader/skins.vector.styles.legacy.css');

assert.equal(skinVariantContract.id, 'vector-legacy');
assert.equal(skinVariantContract.upstreamSkinName, 'vector');
assert.equal(
  skinVariantContract.upstream.contentLinksSource,
  'vendor/mediawiki-core/resources/src/mediawiki.skinning/content.links.less'
);
assert.deepEqual(skinVariantContract.contentModes, ['native', 'projected']);
assert.equal(skinVariantContract.defaultContentMode, 'native');
assert.equal(rawResourceLoaderContract.skinVariantContract, 'contracts/skin-variant-contract.json');
assert.equal(
  resourceLoaderContract.shared.importAliases['mediawiki.skin.variables.less'],
  skinVariantContract.upstream.lessVariables
);
assert.equal(resourceLoaderContract.hostElementProjection, undefined);
assert.equal(resourceLoaderContract.shared.ownershipPolicies['host-content-elements'], undefined);
assert.equal(fs.existsSync(path.join(root, 'css/vendor/resource-loader/host-content-elements.css')), false);

assert.match(resourceLoaderContract.shared.hostSurfaces.contentLinks, /data-tt-vector-surface/);
assert.match(resourceLoaderContract.shared.hostSurfaces.contentLinks, /data-tt-vector-catlinks-surface/);
assert.equal(
  resourceLoaderContract.skinModule.ownershipRules.find((rule) => rule.pattern === '^content-links$')?.ownership,
  'content-links'
);
assert.match(
  generatedVectorCss,
  /:where\(\[data-tt-vector-surface="parser-output"\], \[data-tt-vector-catlinks-surface="1"\]\) a\.new\s*\{\s*color:\s*#ba0000;/
);
assert.match(
  generatedVectorCss,
  /:where\(\[data-tt-vector-surface="parser-output"\], \[data-tt-vector-catlinks-surface="1"\]\) a\.new:visited\s*\{\s*color:\s*#a55858;/
);
assert.match(
  generatedVectorCss,
  /:where\(\[data-tt-vector-surface="parser-output"\], \[data-tt-vector-catlinks-surface="1"\]\)\.mw-parser-output a\.external\s*\{\s*color:\s*#36b;/
);

console.log('checked native host ownership and projected Vector link contract');
