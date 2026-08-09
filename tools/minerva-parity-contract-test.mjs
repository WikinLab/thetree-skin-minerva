#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Mustache from 'mustache';
import { makeMinervaDocumentEnvironment } from '../lib/minervaDocumentEnvironment.js';
import { makeMinervaSkinData } from '../lib/minervaSkinData.js';
import { makeMinervaAdapterContext } from '../lib/minervaTheTreeAdapter.js';
import { createMinervaRuntimeController } from '../lib/runtime/createMinervaRuntimeController.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = (name) => fs.readFileSync(path.join(root, 'vendor', 'mediawiki-minerva', 'includes', 'Skins', `${name}.mustache`), 'utf8');

function href(target) {
  if (typeof target === 'string') return target;
  if (!target) return '#';
  const query = new URLSearchParams(target.query || {}).toString();
  return `${target.path || '/'}${query ? `?${query}` : ''}`;
}

function context({
  contentName = 'wiki',
  viewName = 'wiki',
  namespace = '문서',
  title = 'Document',
  loggedIn = true,
  editable = true,
  starred = false,
  extraData = {},
  config = {},
  sessionMenus = []
} = {}) {
  const document = { namespace, title };
  return makeMinervaAdapterContext({
    storeState: {
      page: {
        contentName,
        viewName,
        title,
        data: { document, editable, starred, date: 1700000000, ...extraData }
      },
      config: { 'wiki.front_page': 'FrontPage', ...config },
      session: {
        account: loggedIn
          ? { type: 1, name: 'Tester', username: 'Tester', uuid: 'account-1' }
          : { type: 0, name: '127.0.0.1', uuid: 'ip-1' },
        notifications: loggedIn ? [{ id: 1 }] : [],
        menus: sessionMenus
      }
    },
    route: { fullPath: `/w/${title}`, query: {} },
    linkBuilders: {
      documentAction: (documentOrTitle, action, query = {}) => ({
        path: `/${action}/${documentOrTitle.title || documentOrTitle}`,
        query
      }),
      userDocument: (name, type) => ({ namespace: type === 1 ? '사용자' : '아이피사용자', title: name }),
      contribution: (uuid) => `/contribution/${uuid}`,
      href
    }
  });
}

function attributes(component) {
  return Object.fromEntries(component['array-attributes'].map(({ key, value }) => [key, value]));
}

function menuNodeIds(menu) {
  return menu.items.map((entry) => attributes(entry.components[0]).id);
}

const articleContext = context({
  title: 'FrontPage',
  sessionMenus: [
    { id: 'pt-notifications', t: '중복 알림', l: '/duplicate' },
    { id: 'n-mainpage', t: '중복 대문', l: '/duplicate-main' },
    { id: 'pt-host-extra', t: '호스트 메뉴', l: '/host-extra' }
  ]
});
const articleData = makeMinervaSkinData(articleContext);
assert.equal(articleContext.pageContract.isMainPage, true);
assert.equal(articleData['page-title'], 'FrontPage');
assert.ok(articleContext.pageContract.bodyClasses.includes('page-Main_Page'));
assert.ok(articleContext.pageContract.bodyClasses.includes('is-authenticated'));
assert.equal(articleData['data-minerva-tabs'], null);
assert.equal(articleData['data-minerva-secondary-actions'].talk.label, '토론');
assert.match(attributes(articleData['data-minerva-secondary-actions'].talk).href, /discuss\/FrontPage/);
assert.deepEqual(
  articleData['data-minerva-page-actions'].toolbar.map((item) => item.name),
  ['page-actions-watch', 'page-actions-history', 'page-actions-edit']
);
const watchButton = articleData['data-minerva-page-actions'].toolbar[0].components[0];
assert.equal(attributes(watchButton).id, 'ca-watch');
assert.equal(attributes(watchButton)['data-tt-minerva-watchstar'], '1');
assert.match(watchButton.classes, /mw-watchlink/);

const renderedActions = Mustache.render(
  template('PageActionsMenu/PageActionsMenu'),
  articleData['data-minerva-page-actions'],
  {
    Button: template('Button'),
    Icon: template('Icon'),
    'ToggleList/ToggleList': template('ToggleList/ToggleList'),
    'ToggleList/ToggleListItem': template('ToggleList/ToggleListItem')
  }
);
assert.match(renderedActions, /<li id="page-actions-watch"/);
assert.match(renderedActions, /id="ca-watch"/);
assert.doesNotMatch(renderedActions, /<li id="ca-watch"/);

const personalMenu = articleData['html-minerva-user-menu'];
assert.equal(personalMenu.listID, 'p-personal');
assert.match(personalMenu.listClass, /minerva-user-menu-list/);
assert.ok(menuNodeIds(personalMenu).includes('pt-watchlist'));
assert.ok(!menuNodeIds(personalMenu).includes('pt-preferences'));
assert.ok(!menuNodeIds(personalMenu).includes('pt-notifications'));
assert.ok(!articleData['data-minerva-main-menu'].groups.some((group) => group.id === 'p-personal'));
const mainMenuIds = articleData['data-minerva-main-menu'].groups.flatMap((group) => [
  group.id,
  ...group.entries.map((entry) => attributes(entry.components[0]).id)
]);
assert.equal(new Set(mainMenuIds).size, mainMenuIds.length, 'main-menu IDs must be unique');
assert.ok(mainMenuIds.includes('pt-host-extra'));
assert.equal(mainMenuIds.filter((id) => id === 'pt-notifications').length, 0);
assert.equal(mainMenuIds.filter((id) => id === 'n-mainpage').length, 1);
assert.deepEqual(
  articleData['data-minerva-notifications']['array-buttons'].map((item) => attributes(item).id),
  ['pt-notifications']
);

const standardArticleData = makeMinervaSkinData(context());
assert.ok(standardArticleData['data-minerva-tabs']);

const historyContext = context({ contentName: 'document/history', viewName: 'history' });
const historyData = makeMinervaSkinData(historyContext);
assert.equal(historyContext.pageContract.actionKind, 'history');
assert.equal(historyData['data-minerva-page-actions'], null);
assert.ok(historyData['data-minerva-tabs']);
assert.equal(historyData['data-minerva-history-link'], null);

const diffContext = context({ contentName: 'document/diff', viewName: 'diff' });
const diffData = makeMinervaSkinData(diffContext);
assert.equal(diffContext.pageContract.isDiffPage, true);
assert.ok(diffData['data-minerva-page-actions']);
assert.equal(diffData['data-minerva-history-link'], null);
assert.ok(diffContext.pageContract.bodyClasses.includes('mw-article-diff'));

const missingContext = context({ contentName: 'notfound', viewName: 'notfound' });
const missingData = makeMinervaSkinData(missingContext);
assert.equal(missingContext.pageContract.exists, false);
assert.ok(missingContext.pageContract.bodyClasses.includes('mw-article-new'));
assert.deepEqual(
  missingData['data-minerva-page-actions'].toolbar.map((item) => item.name),
  ['page-actions-history', 'page-actions-edit']
);
assert.ok(!menuNodeIds(missingData['data-minerva-page-actions'].overflowMenu).includes('ca-raw'));

const missingMainContext = context({ contentName: 'notfound', viewName: 'notfound', title: 'FrontPage' });
assert.equal(missingMainContext.pageContract.isMainPage, true);
assert.equal(missingMainContext.pageContract.pageClass, 'page-Main_Page');

const protectedData = makeMinervaSkinData(context({ editable: false }));
assert.ok(!protectedData['data-minerva-page-actions'].toolbar.some((item) => item.name === 'page-actions-edit'));

const anonymousData = makeMinervaSkinData(context({ loggedIn: false }));
const anonymousWatch = anonymousData['data-minerva-page-actions'].toolbar.find((item) => item.name === 'page-actions-watch');
assert.ok(anonymousWatch);
assert.equal(attributes(anonymousWatch.components[0])['data-tt-minerva-watchstar'], undefined);
assert.match(attributes(anonymousWatch.components[0]).href, /member\/login/);

const userTalkContext = context({
  contentName: 'document/discuss',
  viewName: 'thread_list',
  namespace: '사용자',
  extraData: { user: { uuid: 'account-1' } }
});
assert.equal(userTalkContext.pageContract.namespaceId, 3);
assert.equal(userTalkContext.pageContract.namespaceKind, 'talk');
assert.equal(userTalkContext.pageContract.isUserPage, true);
assert.equal(userTalkContext.pageContract.canUseUserHeading, true);
const userTalkEnvironment = makeMinervaDocumentEnvironment({ pageContract: userTalkContext.pageContract });
assert.ok(userTalkEnvironment.bodyClasses.includes('ns-3'));
assert.ok(userTalkEnvironment.bodyClasses.includes('ns-talk'));

const languageData = makeMinervaSkinData(context({
  title: 'FrontPage',
  extraData: { languages: [{ id: 'lang-en', lang: 'en', label: 'English', href: '/w/Document?lang=en' }] }
}));
assert.equal(languageData['has-minerva-languages'], true);
assert.match(languageData['data-portlets']['data-languages']['html-items'], /hreflang="en"/);
assert.equal(languageData['data-minerva-page-actions'].toolbar[0].name, 'page-actions-language');
assert.equal(languageData['data-minerva-secondary-actions'].language.label, '언어');
assert.equal(languageData['data-minerva-history-link'].arrowIcon.icon, 'expand');
assert.deepEqual(articleData['array-minerva-banners'], ['<div id="siteNotice"></div>']);

function classList(initial = []) {
  const values = new Set(initial);
  return {
    values,
    add: (...items) => items.forEach((item) => values.add(item)),
    remove: (...items) => items.forEach((item) => values.delete(item)),
    contains: (item) => values.has(item)
  };
}

const listeners = new Map();
const checkboxAttributes = new Map([['aria-labelledby', 'toggle-button']]);
const checkbox = {
  checked: true,
  setAttribute: (key, value) => checkboxAttributes.set(key, value),
  getAttribute: (key) => checkboxAttributes.get(key),
  closest: (selector) => selector === '.toggle-list__checkbox' ? checkbox : null
};
let scrolled = 0;
const tabContainer = {};
const selectedTab = {
  closest: (selector) => selector === '.minerva__tab-container' ? tabContainer : null,
  scrollIntoView: () => { scrolled += 1; }
};
const historyClasses = classList();
const historyBar = { classList: historyClasses };
const historyLabel = { textContent: '' };
const historyNode = {
  textContent: 'preserve-wrapper',
  getAttribute: (key) => key === 'data-timestamp' ? '1000' : null,
  querySelector: (selector) => selector === 'span' ? historyLabel : null,
  closest: () => historyBar
};
const bodyClasses = classList();
let searchInitialized = 0;
let searchDestroyed = 0;
const documentObject = {
  body: { classList: bodyClasses },
  addEventListener: (name, listener) => listeners.set(name, listener),
  removeEventListener: (name) => listeners.delete(name),
  querySelectorAll: (selector) => {
    if (selector === '.toggle-list__checkbox') return [checkbox];
    if (selector === '.modified-enhancement[data-timestamp]') return [historyNode];
    return [];
  },
  querySelector: (selector) => selector === '.minerva__tab.selected' ? selectedTab : null,
  getElementById: () => null
};
let toggledWatch = null;
const runtime = createMinervaRuntimeController({
  documentRoot: () => documentObject,
  now: () => 1060000,
  createSearchRuntime: () => ({
    init: () => { searchInitialized += 1; },
    destroy: () => { searchDestroyed += 1; }
  }),
  toggleWatchstar: async (watchHref, watched) => { toggledWatch = { watchHref, watched }; }
});
runtime.init();
assert.ok(bodyClasses.contains('minerva-animations-ready'));
assert.equal(checkboxAttributes.get('aria-expanded'), 'true');
assert.equal(scrolled, 1);
assert.equal(historyNode.textContent, 'preserve-wrapper');
assert.equal(historyLabel.textContent, '마지막 편집: 1분 전');
assert.ok(historyClasses.contains('active'));
assert.equal(searchInitialized, 1);

listeners.get('click')({ target: { closest: () => null } });
assert.equal(checkbox.checked, false);

const watchAttributes = new Map([
  ['href', '/member/star/Document'],
  ['data-watched', 'false'],
  ['data-watch-href', '/member/star/Document'],
  ['data-unwatch-href', '/member/unstar/Document']
]);
const watchIconClasses = classList(['minerva-icon', 'minerva-icon--star']);
const watchLabel = { textContent: '주시', classList: classList() };
const watchAnchor = {
  dataset: {},
  getAttribute: (key) => watchAttributes.get(key),
  setAttribute: (key, value) => watchAttributes.set(key, value),
  removeAttribute: (key) => watchAttributes.delete(key),
  querySelector: (selector) => selector === '.minerva-icon' ? { classList: watchIconClasses } : watchLabel
};
await listeners.get('click')({
  preventDefault() {},
  target: {
    closest: (selector) => selector === 'a[data-tt-minerva-watchstar="1"]' ? watchAnchor : null
  }
});
assert.deepEqual(toggledWatch, { watchHref: '/member/star/Document', watched: true });
assert.equal(watchAttributes.get('href'), '/member/unstar/Document');
assert.ok(watchIconClasses.contains('minerva-icon--unStar'));
assert.equal(watchLabel.textContent, '주시 해제');

runtime.destroy();
assert.ok(!bodyClasses.contains('minerva-animations-ready'));
assert.equal(searchDestroyed, 1);

console.log('Minerva semantic parity contract passed.');
