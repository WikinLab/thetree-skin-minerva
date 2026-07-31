#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeTheTreeWatchstarItem } from '../lib/adapters/thetree-watchstar.js';
import { makeMenuListItem } from '../lib/legacyComponentData.js';
import { DOCUMENT_ACTION_MAP } from '../lib/legacyHostAdapterPolicy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapping = DOCUMENT_ACTION_MAP.find((row) => row.id === 'document.action.watchstar');
const document = Object.freeze({ namespace: '문서', title: '주시 기능' });
const makeActionTarget = (targetDocument, action) => `/${action}/${targetDocument.title}`;
const makeItem = (pageData, loggedIn = true) => makeTheTreeWatchstarItem({
  mapping,
  document,
  pageData,
  loggedIn,
  makeActionTarget
});

assert.ok(mapping, 'The watchstar feature mapping must be declared.');
assert.equal(makeItem({ starred: false }, false), null, 'Anonymous users must not receive a watchstar.');
assert.equal(makeItem({}, true), null, 'Pages without authoritative starred state must not receive a watchstar.');

const watch = makeItem({ starred: false });
assert.deepEqual(watch, {
  id: 'ca-watch',
  label: '주시',
  to: '/member/star/주시 기능',
  class: 'icon',
  watchlink: true,
  arrayAttributes: [{ key: 'title', value: '이 문서를 주시문서 목록에 추가' }]
});

const unwatch = makeItem({ starred: true });
assert.deepEqual(unwatch, {
  id: 'ca-unwatch',
  label: '주시 해제',
  to: '/member/unstar/주시 기능',
  class: 'icon',
  watchlink: true,
  arrayAttributes: [{ key: 'title', value: '이 문서를 주시문서 목록에서 제거' }]
});

const menuItem = makeMenuListItem(watch);
assert.equal(menuItem.id, 'ca-watch');
assert.match(menuItem.class, /\bicon\b/);
assert.match(menuItem.class, /\bmw-watchlink\b/);
assert.deepEqual(menuItem['array-links'][0]['array-attributes'], [
  { key: 'href', value: '/member/star/주시 기능' },
  { key: 'title', value: '이 문서를 주시문서 목록에 추가' }
]);

const generatedVectorCss = fs.readFileSync(
  path.join(root, 'css/vendor/resource-loader/skins.vector.styles.legacy.css'),
  'utf8'
);
assert.match(generatedVectorCss, /#ca-watch\.icon/);
assert.match(generatedVectorCss, /#ca-unwatch\.icon/);
for (const asset of ['watch-icon.svg', 'watch-icon-hl.svg', 'unwatch-icon.svg', 'unwatch-icon-hl.svg']) {
  assert.equal(fs.existsSync(path.join(root, 'images', asset)), true, `Missing upstream Vector asset: ${asset}`);
}
const collapsibleTabsSource = fs.readFileSync(
  path.join(root, 'lib/ports/mediawiki-vector-legacy/resources/skins.vector.legacy.js/collapsibleTabs.js'),
  'utf8'
);
assert.match(collapsibleTabsSource, /item\.id !== 'ca-watch' && item\.id !== 'ca-unwatch'/);

console.log('Watchstar adapter contract passed.');
