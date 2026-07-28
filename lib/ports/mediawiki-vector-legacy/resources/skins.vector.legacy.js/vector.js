/*
 * Vue-side runtime bridge for REL1_46 resources/skins.vector.legacy.js/vector.js.
 *
 * Keep this file focused on the Vector legacy page-ready behaviour that wires
 * #p-views to #p-cactions.  The low-level DOM movement remains in
 * collapsibleTabs.js; this layer provides the original Vector-specific
 * collapse/expand conditions and #p-cactions show/hide width animation.
 */
import {
  animateElementWidth,
  calculateTabDistance,
  createLegacyCollapsibleTabs
} from './collapsibleTabs.js';

const cactionsId = 'p-cactions';
const tabContainerSelector = '#p-views ul';
const cactionsSelector = `#${cactionsId}`;
const collapsibleSelector = 'li.collapsible';

function getCactions() {
  return document.getElementById(cactionsId);
}

function getTabContainer() {
  return document.querySelector(tabContainerSelector);
}

function queryListItems(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll('li'));
}

function childrenMatching(root, selector) {
  if (!root) return [];
  return Array.from(root.children).filter((child) => child.matches(selector));
}

function outerWidth(element) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width +
    parseFloat(style.marginLeft || 0) +
    parseFloat(style.marginRight || 0);
}

function jqueryWidth(element) {
  if (!element) return 0;
  const computed = window.getComputedStyle(element);
  const computedWidth = parseFloat(computed.width || '0');
  if (Number.isFinite(computedWidth) && computedWidth > 0) return computedWidth;

  // jQuery.width() returns the content box width.  This fallback keeps that
  // contract for browsers or elements where computed width is temporarily auto.
  const rect = element.getBoundingClientRect();
  const padding = parseFloat(computed.paddingLeft || '0') + parseFloat(computed.paddingRight || '0');
  const border = parseFloat(computed.borderLeftWidth || '0') + parseFloat(computed.borderRightWidth || '0');
  const borderBox = rect.width - padding - border;
  return Math.max(borderBox, 0);
}

function getMwUtil() {
  if (typeof window === 'undefined' || !window.mw || !window.mw.util) {
    throw new Error('Vector legacy requires the shared MediaWiki util runtime.');
  }
  return window.mw.util;
}

function measureHiddenPortletWidth(portlet) {
  if (!portlet) return 0;
  if (getMwUtil().isPortletVisible(cactionsId)) return jqueryWidth(portlet);

  const previous = {
    visibility: portlet.style.visibility,
    position: portlet.style.position,
    display: portlet.style.display
  };
  getMwUtil().showPortlet(cactionsId);
  portlet.style.visibility = 'hidden';
  portlet.style.position = 'absolute';
  portlet.style.display = '';
  const width = jqueryWidth(portlet);
  portlet.style.visibility = previous.visibility;
  portlet.style.position = previous.position;
  portlet.style.display = previous.display;
  getMwUtil().hidePortlet(cactionsId);
  return width;
}

export function createLegacyVectorRuntime() {
  let collapsibleTabs = null;
  let tabContainer = null;
  let initialCactionsWidthValue = null;
  let removeCollapseListener = null;
  let removeExpandListener = null;
  const activeAnimations = new Set();

  function initialCactionsWidth() {
    if (initialCactionsWidthValue !== null) return initialCactionsWidthValue;
    initialCactionsWidthValue = measureHiddenPortletWidth(getCactions());
    return initialCactionsWidthValue;
  }

  function runWidthAnimation(element, targetWidth, done) {
    let cancel = null;
    cancel = animateElementWidth(element, targetWidth, () => {
      if (cancel) activeAnimations.delete(cancel);
      done();
    });
    activeAnimations.add(cancel);
    return cancel;
  }

  function beforeTabCollapse() {
    const cactions = getCactions();
    if (!cactions) return;
    const wasVisible = getMwUtil().isPortletVisible(cactionsId);
    if (wasVisible) return;

    getMwUtil().showPortlet(cactionsId);
    const expandedWidth = jqueryWidth(cactions);
    cactions.style.width = '1px';
    runWidthAnimation(cactions, expandedWidth, () => {});
  }

  function beforeTabExpand() {
    const cactions = getCactions();
    if (!cactions) return;
    const itemCount = queryListItems(cactions).length;
    if (itemCount !== 1) return;

    runWidthAnimation(cactions, 1, () => {
      cactions.setAttribute('style', '');
      getMwUtil().hidePortlet(cactionsId);
    });
  }

  function expandCondition(eleWidth) {
    const distance = calculateTabDistance();
    let result = false;
    if (distance >= eleWidth + 1) {
      result = true;
    } else {
      const cactions = getCactions();
      if (queryListItems(cactions).length === 1) {
        result = distance >= eleWidth + 1 - initialCactionsWidth();
      }
    }
    return result;
  }

  function collapseCondition() {
    const tabContainerElement = getTabContainer();
    const distance = calculateTabDistance();
    if (distance >= 0) {
      return false;
    }
    if (getMwUtil().isPortletVisible(cactionsId)) {
      return true;
    }

    let collapsibleWidth = 0;
    const cactionsWidth = initialCactionsWidth();
    const collapsibleItems = childrenMatching(tabContainerElement, collapsibleSelector);
    const result = collapsibleItems.some((item) => {
      collapsibleWidth += jqueryWidth(item);
      return collapsibleWidth > cactionsWidth;
    });
    return result;
  }

  function bindVectorEvents() {
    tabContainer = getTabContainer();
    if (!tabContainer) return;

    tabContainer.addEventListener('beforeTabCollapse', beforeTabCollapse);
    tabContainer.addEventListener('beforeTabExpand', beforeTabExpand);
    removeCollapseListener = () => tabContainer.removeEventListener('beforeTabCollapse', beforeTabCollapse);
    removeExpandListener = () => tabContainer.removeEventListener('beforeTabExpand', beforeTabExpand);
  }

  function init() {
    initialCactionsWidthValue = null;
    bindVectorEvents();
    collapsibleTabs = createLegacyCollapsibleTabs({
      expandedContainer: tabContainerSelector,
      collapsedContainer: `${cactionsSelector} ul`,
      expandCondition,
      collapseCondition
    });
    collapsibleTabs.init();
  }

  function destroy() {
    if (removeCollapseListener) removeCollapseListener();
    if (removeExpandListener) removeExpandListener();
    removeCollapseListener = null;
    removeExpandListener = null;
    tabContainer = null;
    initialCactionsWidthValue = null;
    activeAnimations.forEach((cancel) => cancel());
    activeAnimations.clear();


    if (collapsibleTabs) {
      collapsibleTabs.destroy();
      collapsibleTabs = null;
    }
  }

  return Object.freeze({
    init,
    destroy,
    get collapsibleTabs() {
      return collapsibleTabs;
    }
  });
}

export const legacyVectorRuntimeInternals = Object.freeze({
  cactionsId,
  tabContainerSelector,
  cactionsSelector,
  collapsibleSelector,
  getMwUtil,
  jqueryWidth,
  measureHiddenPortletWidth
});
