#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEARCH_SUGGEST_CONTAINER_ID, normalizeTheTreeSuggestions } from '../lib/adapters/thetree-search-suggest.js';
import { MINERVA_THEME_TOGGLE_ATTRIBUTE } from '../lib/adapters/minerva-theme.js';
import { applyMinervaDocumentEnvironment, makeMinervaDocumentEnvironment } from '../lib/minervaDocumentEnvironment.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (pathname) => fs.readFileSync(path.join(root, pathname), 'utf8');

assert.equal(SEARCH_SUGGEST_CONTAINER_ID, 'tt-minerva-search-suggestions');
assert.deepEqual(normalizeTheTreeSuggestions([' 문서 ', '', '문서', '분류:테스트']), ['문서', '분류:테스트']);
assert.equal(MINERVA_THEME_TOGGLE_ATTRIBUTE, 'data-tt-minerva-theme-toggle');

const dataAdapter = read('lib/minervaSkinData.js');
const minervaAdapter = read('lib/minervaTheTreeAdapter.js');
assert.match(dataAdapter, /data-minerva-main-menu/);
assert.match(dataAdapter, /data-minerva-page-actions/);
assert.match(dataAdapter, /data-minerva-notifications/);
assert.match(minervaAdapter, /id: 'pt-notifications'/);
assert.match(minervaAdapter, /icon: 'bellOutline'/);
assert.match(minervaAdapter, /id: 'pt-watchlist'/);
assert.match(dataAdapter, /placeholder=\"\$\{escapeHtml\(siteName\)\} 검색\"/);
assert.match(dataAdapter, /makeMinervaPersonalMenuItems/);
assert.match(dataAdapter, /linkBuilders\?\.href/);
assert.match(dataAdapter, /minerva-user-menu-list toggle-list__list--drop-down/);
assert.match(minervaAdapter, /name: 'page-actions-watch'/);

const wrapper = read('components/SkinMinerva.vue');
assert.match(wrapper, /this\.\$vfm\.show\(\{ component: MinervaSettingModal \}\)/);
assert.match(wrapper, /createTheTreeSearchSuggestRuntime/);
assert.match(wrapper, /`\/Complete\?q=\$\{encodeURIComponent\(query\)\}`/);
assert.match(wrapper, /wiki\.hide_user_document_discuss/);
assert.match(wrapper, /event\?\.defaultPrevented/);
assert.match(wrapper, /pageContract\.canUseUserHeading/);

const runtime = read('lib/runtime/createMinervaRuntimeController.js');
assert.match(runtime, /toggle-list__checkbox/);
assert.match(runtime, /aria-expanded/);
assert.match(runtime, /mw-mf-page-center__mask/);
assert.match(runtime, /minerva-animations-ready/);
assert.match(runtime, /data-tt-minerva-watchstar/);

const generatedMinervaStyles = read('css/vendor/resource-loader/skins.minerva.styles.css');
assert.match(
  generatedMinervaStyles,
  /\.header-container\.header-chrome[^{}]*\{[^{}]*background-color:\s*var\(--background-color-interactive,\s*#eaecf0\)/s,
  'Minerva chrome must compile against the locked Codex palette rather than MediaWiki legacy defaults'
);
assert.doesNotMatch(
  generatedMinervaStyles,
  /\.header-container\.header-chrome[^{}]*\{[^{}]*background-color:\s*#eee\s*;/s
);

let observerCallback = null;
let observerDisconnected = false;
const bodyClasses = new Set(['theseed-light-mode']);
const removalCounts = new Map();
const classList = {
  contains(name) {
    return bodyClasses.has(name);
  },
  add(name) {
    bodyClasses.add(name);
  },
  remove(name) {
    removalCounts.set(name, (removalCounts.get(name) || 0) + 1);
    bodyClasses.delete(name);
  },
  toggle(name, force) {
    if (force) bodyClasses.add(name);
    else bodyClasses.delete(name);
  }
};
const htmlAttributes = new Map();
const htmlClasses = new Set();
const documentObject = {
  documentElement: {
    classList: {
      contains: (name) => htmlClasses.has(name),
      toggle: (name, force) => force ? htmlClasses.add(name) : htmlClasses.delete(name)
    },
    getAttribute: (name) => htmlAttributes.get(name) ?? null,
    setAttribute: (name, value) => htmlAttributes.set(name, value),
    removeAttribute: (name) => htmlAttributes.delete(name)
  },
  body: { classList },
  defaultView: {
    MutationObserver: class {
      constructor(callback) {
        observerCallback = callback;
      }
      observe() {}
      disconnect() {
        observerDisconnected = true;
      }
    }
  }
};
const cleanupDocumentEnvironment = applyMinervaDocumentEnvironment(
  makeMinervaDocumentEnvironment({ theme: 'light' }),
  documentObject
);
assert.equal(removalCounts.get('theseed-light-mode'), 1);
assert.equal(removalCounts.get('theseed-dark-mode') || 0, 0);
observerCallback();
assert.equal(removalCounts.get('theseed-light-mode'), 1, 'observer must not write absent host classes');
bodyClasses.add('theseed-dark-mode');
observerCallback();
assert.equal(bodyClasses.has('theseed-dark-mode'), false, 'observer removes a host class only when restored');
cleanupDocumentEnvironment();
assert.equal(observerDisconnected, true);
console.log('Minerva host-adapter feature contract passed.');
