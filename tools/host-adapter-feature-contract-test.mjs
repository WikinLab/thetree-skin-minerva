#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SEARCH_SUGGESTION_LIMIT,
  MINERVA_SEARCH_DIALOG_BREAKPOINT,
  makeTheTreeCodexSearchResults,
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

assert.equal(SEARCH_SUGGESTION_LIMIT, 10);
const lockedTypeaheadApp = read('vendor/mediawiki-core/resources/src/mediawiki.skinning.typeaheadSearch/App.vue');
const lockedDialogBreakpoint = /dialogBreakpoint:\s*\{[\s\S]*?default:\s*(\d+)/.exec(lockedTypeaheadApp);
assert.ok(lockedDialogBreakpoint, 'locked App.vue must declare the dialog breakpoint default');
assert.equal(MINERVA_SEARCH_DIALOG_BREAKPOINT, Number(lockedDialogBreakpoint[1]));
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
assert.deepEqual(
  makeTheTreeCodexSearchResults([' 문서 ', '', '문서'], { urlForTitle: (title) => `/w/${title}` }),
  [{ value: '문서', label: '문서', url: '/w/문서', thumbnail: null }]
);
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
assert.match(searchAdapter, /mountSearchApp/);
assert.match(searchAdapter, /header \.minerva-search-form \.search-box/);
assert.doesNotMatch(searchAdapter, /createElement|innerHTML|cdx-menu-item|cdx-thumbnail__placeholder/);
const minervaAdapterCss = read('css/minerva-adapter.css');
assert.doesNotMatch(minervaAdapterCss, /tt-minerva-search|cdx-menu-item|cdx-menu__listbox/);
const searchDialogAdapter = read('components/MinervaSearchDialog.vue');
assert.match(searchDialogAdapter, /MediaWikiTypeaheadSearchOrigin/);
assert.match(searchDialogAdapter, /id="minerva-overlay-search"/);
assert.match(searchDialogAdapter, /:show-thumbnail="true"/);
assert.match(searchDialogAdapter, /:show-description="true"/);
assert.match(searchDialogAdapter, /:auto-expand-width="true"/);
assert.match(searchDialogAdapter, /requestSuggestions/);
assert.match(searchDialogAdapter, /makeTheTreeTypeaheadRestClient/);
assert.doesNotMatch(searchDialogAdapter, /CdxTypeaheadSearch|<ul\b|cdx-menu-item__content|tt-minerva-search-dialog/);
assert.doesNotMatch(searchDialogAdapter, /wiki-heading|wiki-content|collapsible-block/);
const typeaheadAppOrigin = read('lib/generated/mediawiki.skinning.typeaheadSearch/App.vue');
assert.match(typeaheadAppOrigin, /template and component options remain upstream-owned/);
assert.match(typeaheadAppOrigin, /<cdx-typeahead-search/);
assert.match(typeaheadAppOrigin, /mediawiki\.codex\.typeaheadSearch\.js/);
assert.match(typeaheadAppOrigin, /mediawiki-typeahead-instrumentation\.js/);
assert.match(typeaheadAppOrigin, /mediawiki-vue-component-environment\.js/);
const typeaheadOrigin = read('lib/generated/mediawiki.skinning.typeaheadSearch/TypeaheadSearchWrapper.vue');
assert.match(typeaheadOrigin, /template and component options remain upstream-owned/);
assert.match(typeaheadOrigin, /<cdx-dialog/);
assert.match(typeaheadOrigin, /mediawiki\.codex\.typeaheadSearch\.js/);
assert.match(typeaheadOrigin, /<div v-else>/);
assert.match(typeaheadOrigin, /<template #header>[\s\S]*<\/template>[\s\S]*<\/cdx-dialog>/);
const codexTypeaheadBundle = read('lib/generated/mediawiki.codex.typeaheadSearch.js');
assert.match(codexTypeaheadBundle, /exact locked mediawiki\.codex\.typeaheadSearch CommonJS graph/);
assert.match(codexTypeaheadBundle, /useCssVars/);
assert.match(codexTypeaheadBundle, /17e0a1f0/);

const wrapper = read('components/SkinMinerva.vue');
assert.match(wrapper, /this\.\$vfm\.show\(\{ component: MinervaSettingModal \}\)/);
assert.match(wrapper, /createTheTreeSearchSuggestRuntime/);
assert.match(wrapper, /createApp\(MediaWikiTypeaheadSearchOrigin, props\)/);
assert.match(wrapper, /isMinervaSearchDialogViewport/);
assert.match(wrapper, /MinervaSearchDialog/);
assert.match(wrapper, /:document-url="searchDocumentUrl"/);
assert.match(wrapper, /:search-url="searchResultsUrl"/);
assert.match(wrapper, /:navigate-search="navigateSearchResults"/);
assert.doesNotMatch(wrapper, /pageContract\.hasMobileFrontend\s*&&[\s\S]{0,100}searchIcon/);
assert.match(wrapper, /`\/Complete\?q=\$\{encodeURIComponent\(query\)\}`/);
assert.match(wrapper, /wiki\.hide_user_document_discuss/);
assert.match(wrapper, /event\?\.defaultPrevented/);
assert.match(wrapper, /pageContract\.canUseUserHeading/);
assert.doesNotMatch(wrapper, /minerva-theme|isMinervaThemeToggleTarget/);

const mediaWikiMessages = JSON.parse(read('lib/generated/mediawiki-less-messages.json'));
assert.equal(mediaWikiMessages.languages.ko.messages['search-close'], '검색 대화상자 닫기');
assert.match(mediaWikiMessages.languages.ko.messages['searchsuggest-containing-html'], /cdx-typeahead-search__search-footer__query/);

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
