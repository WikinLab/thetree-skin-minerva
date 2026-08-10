#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (pathname) => fs.readFileSync(path.join(root, pathname), 'utf8');
const imports = (source) => [...source.matchAll(/@import\s+["']([^"']+)["']\s*;/g)].map((match) => match[1]);
const rules = (pathname) => {
  const output = [];
  postcss.parse(read(pathname), { from: pathname }).walkRules((rule) => {
    selectorParser().processSync(rule.selector);
    output.push(rule);
  });
  return output;
};

assert.deepEqual(imports(read('css/screen.css')), [
  './vendor/resource-loader/page-styles.css',
  './minerva-adapter.css',
  './host-content.css',
  './host-modal.css'
]);
assert.match(read('components/SkinMinerva.vue'), /data-tt-host-content="1"/);
assert.match(read('components/SkinMinerva.vue'), /SkinOrigin/);
assert.match(read('components/SkinMinerva.vue'), /ToggleListOrigin/);
assert.doesNotMatch(read('components/SkinMinerva.vue'), /wiki-heading|wiki-heading-content|createMinervaMobileSectionsRuntime/);

const hostContentSources = [
  read('css/host-content.css'),
  ...fs.readdirSync(path.join(root, 'css', 'host-content'))
    .filter((name) => name.endsWith('.css'))
    .map((name) => read(`css/host-content/${name}`)),
  ...fs.readdirSync(path.join(root, 'lib', 'adapters'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => read(`lib/adapters/${name}`))
].join('\n');
assert.doesNotMatch(hostContentSources, /wiki-heading|wiki-heading-content|collapsible-block-js|mf-collapsible-sections/);

for (const rule of rules('css/host-content/foundation.css')) {
  assert.match(rule.selector, /\[data-tt-host-content="1"\]/);
}
for (const rule of rules('css/host-modal.css')) {
  assert.match(rule.selector, /\.thetree-modal-container/);
}

const variant = JSON.parse(read('contracts/skin-variant-contract.json'));
const contract = JSON.parse(read('contracts/resource-loader-origin-contract.json'));
assert.equal(variant.id, 'minerva-standalone');
assert.equal(contract.pageStyleQueue.profile, 'minerva');
assert.ok(contract.modules.some((module) => module.name === 'skins.minerva.styles'));
assert.ok(contract.modules.some((module) => module.name === 'skins.minerva.icons'));
assert.ok(contract.pageStyleQueue.phases.some((phase) => (
  phase.sources.some((source) => source.kind === 'php-array-append-modules')
)));

const generated = read('css/vendor/resource-loader/skins.minerva.styles.css');
assert.match(generated, /#mw-content-text\[data-tt-host-content="1"\]/);
assert.doesNotMatch(generated, /\.tt-vector/);
console.log('Minerva host-content ownership contract passed.');
