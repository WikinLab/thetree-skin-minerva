#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEARCH_SUGGEST_CONTAINER_ID, normalizeTheTreeSuggestions } from '../lib/adapters/thetree-search-suggest.js';
import { MINERVA_THEME_TOGGLE_ATTRIBUTE } from '../lib/adapters/minerva-theme.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (pathname) => fs.readFileSync(path.join(root, pathname), 'utf8');

assert.equal(SEARCH_SUGGEST_CONTAINER_ID, 'tt-minerva-search-suggestions');
assert.deepEqual(normalizeTheTreeSuggestions([' 문서 ', '', '문서', '분류:테스트']), ['문서', '분류:테스트']);
assert.equal(MINERVA_THEME_TOGGLE_ATTRIBUTE, 'data-tt-minerva-theme-toggle');

const dataAdapter = read('lib/minervaSkinData.js');
assert.match(dataAdapter, /data-minerva-main-menu/);
assert.match(dataAdapter, /data-minerva-page-actions/);
assert.match(dataAdapter, /makePersonalToolsItems/);
assert.match(dataAdapter, /linkBuilders\?\.href/);

const wrapper = read('components/SkinMinerva.vue');
assert.match(wrapper, /this\.\$vfm\.show\(\{ component: MinervaSettingModal \}\)/);
assert.match(wrapper, /createTheTreeSearchSuggestRuntime/);
assert.match(wrapper, /`\/Complete\?q=\$\{encodeURIComponent\(query\)\}`/);
assert.match(wrapper, /wiki\.hide_user_document_discuss/);

const runtime = read('lib/runtime/createMinervaRuntimeController.js');
assert.match(runtime, /toggle-list__checkbox/);
assert.match(runtime, /aria-expanded/);
assert.match(runtime, /mw-mf-page-center__mask/);
console.log('Minerva host-adapter feature contract passed.');
