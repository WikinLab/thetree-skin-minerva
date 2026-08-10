#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SEARCH_SUGGEST_CONTAINER_ID,
  SEARCH_SUGGEST_LISTBOX_ID,
  SEARCH_SUGGESTION_LIMIT,
  normalizeTheTreeSuggestions
} from '../lib/adapters/thetree-search-suggest.js';
import {
  FEATURE_EQUIVALENCE,
  MINERVA_MAIN_MENU_GROUP_ORDER,
  MINERVA_MAIN_MENU_POLICY,
  MINERVA_NAMESPACE_POLICY,
  MINERVA_NOTIFICATION_POLICY,
  MINERVA_PAGE_ACTION_POLICY,
  MINERVA_PERSONAL_TOOL_POLICY,
  MINERVA_SESSION_MENU_POLICY,
  MINERVA_SETTINGS_POLICY,
  resolveMinervaSessionIcon
} from '../lib/minervaHostAdapterPolicy.js';
import { applyMinervaDocumentEnvironment, makeMinervaDocumentEnvironment } from '../lib/minervaDocumentEnvironment.js';
import { getTheTreeHostFeature } from '../lib/thetreeHostFeatureCatalog.js';
import {
  MINERVA_MOBILE_FRONTEND_MODE,
  MINERVA_MOBILE_FRONTEND_DATA_KEY,
  MINERVA_MOBILE_FRONTEND_SCHEMA,
  MINERVA_STANDALONE_MODE,
  resolveMinervaMobileFrontendMode
} from '../lib/minervaMobileFrontend.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (pathname) => fs.readFileSync(path.join(root, pathname), 'utf8');

assert.equal(SEARCH_SUGGEST_CONTAINER_ID, 'tt-minerva-search-suggestions');
assert.equal(SEARCH_SUGGEST_LISTBOX_ID, 'tt-minerva-search-suggestions-listbox');
assert.equal(SEARCH_SUGGESTION_LIMIT, 10);
const mobileFrontendContract = JSON.parse(read('contracts/mobilefrontend-data-contract.json'));
assert.equal(MINERVA_MOBILE_FRONTEND_DATA_KEY, mobileFrontendContract.publicDataKey);
assert.equal(MINERVA_MOBILE_FRONTEND_SCHEMA, mobileFrontendContract.dataSchema);
assert.equal(MINERVA_MOBILE_FRONTEND_MODE, mobileFrontendContract.mobileMode);
assert.equal(MINERVA_STANDALONE_MODE, mobileFrontendContract.desktopMode);
assert.equal(resolveMinervaMobileFrontendMode({}), MINERVA_STANDALONE_MODE);
assert.equal(resolveMinervaMobileFrontendMode({
  thetreeMobileFrontend: { schema: 'thetree-mobilefrontend/v1', mode: 'mobile' }
}), MINERVA_MOBILE_FRONTEND_MODE);
assert.equal(resolveMinervaMobileFrontendMode({
  thetreeMobileFrontend: { schema: 'unknown', mode: 'mobile' }
}), MINERVA_STANDALONE_MODE);
assert.deepEqual(normalizeTheTreeSuggestions([' 문서 ', '', '문서', '분류:테스트']), ['문서', '분류:테스트']);
assert.deepEqual(normalizeTheTreeSuggestions(['가', '나', '다', '라']), ['가', '나', '다', '라']);
assert.deepEqual(MINERVA_MAIN_MENU_GROUP_ORDER, ['p-navigation', 'p-interaction', 'p-personal', 'pt-preferences']);
const projectionRows = [
  ...MINERVA_MAIN_MENU_POLICY,
  ...MINERVA_SETTINGS_POLICY,
  ...MINERVA_PERSONAL_TOOL_POLICY,
  MINERVA_NOTIFICATION_POLICY,
  MINERVA_SESSION_MENU_POLICY,
  ...MINERVA_NAMESPACE_POLICY,
  ...MINERVA_PAGE_ACTION_POLICY
];
assert.ok(projectionRows.every((row) => row.source === getTheTreeHostFeature(row.sourceId)));
assert.ok(projectionRows.every((row) => row.source.system === 'thetree'));
assert.ok(projectionRows.every((row) => row.target.system === 'mediawiki-minerva'));
assert.ok(projectionRows.every((row) => Array.isArray(row.loss)));
assert.ok(MINERVA_MAIN_MENU_POLICY.some((row) => row.equivalence === FEATURE_EQUIVALENCE.ANALOG));
assert.equal(new Set(MINERVA_MAIN_MENU_POLICY.map((row) => row.target.id)).size, MINERVA_MAIN_MENU_POLICY.length);
assert.equal(
  MINERVA_PAGE_ACTION_POLICY.find((row) => row.sourceId === 'document.action.language').target.icon,
  'language'
);
assert.equal(resolveMinervaSessionIcon({ l: '/admin/grant' }), 'lock');
assert.equal(resolveMinervaSessionIcon({ l: '/unknown', icon: 'not-a-minerva-icon' }), 'specialPages');
const generatedIconCss = fs.readdirSync(path.join(root, 'css', 'vendor', 'resource-loader'))
  .filter((name) => name.endsWith('.css'))
  .map((name) => read(`css/vendor/resource-loader/${name}`))
  .join('\n');
const projectedIcons = new Set([
  ...MINERVA_MAIN_MENU_POLICY.map((row) => row.target.icon),
  ...MINERVA_SETTINGS_POLICY.map((row) => row.target.icon),
  ...MINERVA_PERSONAL_TOOL_POLICY.map((row) => row.target.icon),
  MINERVA_NOTIFICATION_POLICY.target.icon,
  ...MINERVA_PAGE_ACTION_POLICY.map((row) => row.target.icon),
  'settings',
  'specialPages',
  'unStar'
].filter(Boolean));
for (const icon of projectedIcons) {
  assert.match(
    generatedIconCss,
    new RegExp(`minerva-icon(?:\\.minerva-icon)?--${icon}\\b`),
    `Projected icon ${icon} must exist in the locked generated Minerva glyph modules`
  );
}

const dataAdapter = read('lib/minervaSkinData.js');
const minervaAdapter = read('lib/minervaTheTreeAdapter.js');
assert.match(dataAdapter, /data-minerva-main-menu/);
assert.match(dataAdapter, /data-minerva-page-actions/);
assert.match(dataAdapter, /data-minerva-notifications/);
assert.match(dataAdapter, /MINERVA_MAIN_MENU_GROUP_ORDER/);
assert.doesNotMatch(dataAdapter, /p-minerva-tools|p-host|MINERVA_THEME_TOGGLE_ATTRIBUTE/);
assert.equal(MINERVA_NOTIFICATION_POLICY.target.id, 'pt-notifications');
assert.equal(MINERVA_NOTIFICATION_POLICY.target.icon, 'bellOutline');
assert.equal(
  MINERVA_PERSONAL_TOOL_POLICY.find((row) => row.sourceId === 'personal.watchlist').target.id,
  'pt-watchlist'
);
assert.match(dataAdapter, /placeholder=\"\$\{escapeHtml\(siteName\)\} 검색\"/);
assert.match(dataAdapter, /makeMinervaPersonalMenuItems/);
assert.match(dataAdapter, /linkBuilders\?\.href/);
assert.match(dataAdapter, /minerva-user-menu-list toggle-list__list--drop-down/);
assert.match(minervaAdapter, /document\.action\.watchstar/);

const searchAdapter = read('lib/adapters/thetree-search-suggest.js');
assert.match(searchAdapter, /cdx-menu cdx-menu--has-footer cdx-typeahead-search__menu/);
assert.match(searchAdapter, /cdx-menu-item--bold-label/);
assert.match(searchAdapter, /cdx-thumbnail__placeholder/);
assert.match(searchAdapter, /cdx-typeahead-search__search-footer/);
assert.doesNotMatch(searchAdapter, /className = 'suggestions-result'/);
const searchDialogAdapter = read('components/MinervaSearchDialog.vue');
assert.match(searchDialogAdapter, /cdx-dialog skin-dialog-search/);
assert.match(searchDialogAdapter, /cdx-dialog__header/);
assert.match(searchDialogAdapter, /requestSuggestions/);
assert.match(searchDialogAdapter, /navigate-document/);
assert.doesNotMatch(searchDialogAdapter, /wiki-heading|wiki-content|collapsible-block/);

const wrapper = read('components/SkinMinerva.vue');
assert.match(wrapper, /this\.\$vfm\.show\(\{ component: MinervaSettingModal \}\)/);
assert.match(wrapper, /createTheTreeSearchSuggestRuntime/);
assert.match(wrapper, /MinervaSearchDialog/);
assert.match(wrapper, /pageContract\.hasMobileFrontend/);
assert.match(wrapper, /`\/Complete\?q=\$\{encodeURIComponent\(query\)\}`/);
assert.match(wrapper, /wiki\.hide_user_document_discuss/);
assert.match(wrapper, /event\?\.defaultPrevented/);
assert.match(wrapper, /pageContract\.canUseUserHeading/);
assert.doesNotMatch(wrapper, /minerva-theme|isMinervaThemeToggleTarget/);

const runtime = read('lib/runtime/createMinervaRuntimeController.js');
assert.match(runtime, /toggle-list__checkbox/);
assert.match(runtime, /aria-expanded/);
assert.match(runtime, /mw-mf-page-center__mask/);
assert.match(runtime, /minerva-animations-ready/);
assert.match(runtime, /data-tt-minerva-watchstar/);
assert.doesNotMatch(runtime, /createSearchDialogRuntime|createMobileSectionsRuntime/);

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
