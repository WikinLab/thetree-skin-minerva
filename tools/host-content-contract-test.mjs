#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { resolveResourceLoaderOriginContract } from './resource-loader-contract.mjs';
import { LINK_SEMANTICS } from '../lib/linkSemantics.js';

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
  './vendor/resource-loader/host-content-elements.css'
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

const hostElementsSource = read('css/vendor/resource-loader/host-content-elements.css');
const upstreamElementsSource = read('vendor/mediawiki-core/resources/src/mediawiki.skinning/elements.less');
const upstreamContentLinksSource = read('vendor/mediawiki-core/resources/src/mediawiki.skinning/content.links.less');
const skinVariablesSource = read('vendor/mediawiki-vector-legacy/resources/mediawiki.less/vector/mediawiki.skin.variables.less');
const rawResourceLoaderContract = JSON.parse(read('contracts/resource-loader-origin-contract.json'));
const resourceLoaderContract = resolveResourceLoaderOriginContract(root, rawResourceLoaderContract);
const skinVariantContract = JSON.parse(read('contracts/skin-variant-contract.json'));
const generatedVectorCss = read('css/vendor/resource-loader/skins.vector.styles.legacy.css');
const hostElementSelectors = selectors('css/vendor/resource-loader/host-content-elements.css');
assert.ok(hostElementSelectors.length >= 5);
for (const selector of hostElementSelectors) {
  assert.match(selector, /\[data-tt-host-content="1"\]/);
  assert.match(selector, /\[data-tt-vector-surface="parser-output"\]/);

  const selectorAst = selectorParser().astSync(selector);
  for (const branch of selectorAst.nodes) {
    const topLevelNodes = branch.nodes;
    assert.equal(topLevelNodes[0]?.type, 'pseudo');
    assert.equal(topLevelNodes[0]?.value, ':where');
    assert.equal(topLevelNodes[1]?.type, 'combinator');
    assert.equal(topLevelNodes[2]?.type, 'tag');
    assert.equal(topLevelNodes[2]?.value, 'a');
    assert.equal(topLevelNodes.slice(3).some((node) => node.type === 'combinator'), false);
  }
}
assert.match(upstreamElementsSource, /a\s*\{[\s\S]*?color:\s*@color-link;/);
assert.match(upstreamElementsSource, /&:not\(\s*\[\s*href\s*\]\s*\)\s*\{[\s\S]*?cursor:\s*pointer/);
assert.match(upstreamContentLinksSource, /a\.new\s*\{[\s\S]*?color:\s*@color-link-new;/);
assert.match(upstreamContentLinksSource, /a\.external[\s\S]*?color:\s*@color-link-external;/);
assert.match(skinVariablesSource, /@color-link:\s*#0645ad/);
assert.match(skinVariablesSource, /@color-link--visited:\s*#0b0080/);
assert.match(skinVariablesSource, /@color-link--active:\s*#faa700/);
assert.match(hostElementsSource, /Generated mechanically for vector-legacy/);
assert.match(hostElementsSource, /a:not\(\s*\[\s*href\s*\]\s*\)/);
assert.match(hostElementsSource, /cursor:\s*pointer/);
assert.match(hostElementsSource, /a:visited/);
assert.match(hostElementsSource, /color:\s*#0645ad\s*!important/);
assert.match(hostElementsSource, /color:\s*#0b0080\s*!important/);
assert.match(hostElementsSource, /color:\s*#faa700\s*!important/);
assert.match(hostElementsSource, /background:\s*none/);
assert.match(hostElementsSource, /a:hover/);
assert.match(hostElementsSource, /a:focus/);
assert.doesNotMatch(hostElementsSource, /#36c|#6a60b0|#233566/);

const semanticHostClasses = [
  ...LINK_SEMANTICS.missing.hostClasses,
  ...LINK_SEMANTICS.self.hostClasses,
  ...LINK_SEMANTICS.external.hostClasses
];
const semanticRules = [];
postcss.parse(hostElementsSource).walkRules((rule) => {
  if (semanticHostClasses.some((className) => rule.selector.includes(`.${className}`))) semanticRules.push(rule);
});
assert.ok(semanticRules.length >= 7);
for (const rule of semanticRules) {
  assert.match(rule.selector, /\[data-tt-host-content="1"\]/);
  assert.doesNotMatch(rule.selector, /::before|::after/);
  rule.walkDecls((declaration) => {
    assert.equal(declaration.prop, 'color');
    assert.equal(declaration.important, true);
  });
}
function hasSemanticColor(selectorFragment, value) {
  return semanticRules.some((rule) => (
    rule.selector.includes(selectorFragment)
    && rule.nodes.some((node) => node.type === 'decl' && node.prop === 'color' && node.value === value && node.important)
  ));
}
assert.ok(hasSemanticColor('a.not-exist', '#ba0000'));
assert.ok(hasSemanticColor('a.not-exist:visited', '#a55858'));
assert.ok(hasSemanticColor('a.wiki-link-external', '#36b'));
assert.ok(hasSemanticColor('a.wiki-link-whitelisted', '#36b'));
assert.ok(hasSemanticColor('a.wiki-link-external:visited', '#636'));
assert.ok(hasSemanticColor('a.wiki-link-external:active', '#b63'));
assert.ok(hasSemanticColor('a.wiki-self-link', 'inherit'));
assert.doesNotMatch(hostElementsSource, /background-image|\.wiki-link-external::before|\.wiki-link-whitelisted::before/);

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
assert.equal(resourceLoaderContract.hostElementProjection.ownership, 'host-content-elements');
assert.deepEqual(resourceLoaderContract.hostElementProjection.subjectTagNames, ['a']);
assert.deepEqual(resourceLoaderContract.hostElementProjection.linkPalette.allowedProperties, ['color']);
assert.deepEqual(resourceLoaderContract.hostElementProjection.linkPalette.importantProperties, ['color']);

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

console.log('checked host content foundation and source link theme contract');
