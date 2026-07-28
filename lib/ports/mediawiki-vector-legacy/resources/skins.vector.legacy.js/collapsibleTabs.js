/*
 * DOM-side port of REL1_46 resources/skins.vector.legacy.js/collapsibleTabs.js.
 *
 * This deliberately operates on the rendered <li> elements instead of moving
 * Vue arrays between menus. The goal is to keep Vector legacy's tab-collapse
 * behaviour deterministic: measure the same DOM, insert the same placeholders,
 * and move the same nodes between #p-views and #p-cactions.
 */

export const COLLAPSIBLE_TABS_DEFAULTS = Object.freeze({
  expandedContainer: '#p-views ul',
  collapsedContainer: '#p-cactions ul',
  collapsible: 'li.collapsible',
  shifting: false,
  expandedWidth: 0,
  expandCondition(eleWidth) {
    return calculateTabDistance() >= eleWidth + 1;
  },
  collapseCondition() {
    return calculateTabDistance() < 0;
  }
});

export const JQUERY_NORMAL_ANIMATION_MS = 400;

function getMwUtil() {
  if (typeof window === 'undefined' || !window.mw || !window.mw.util) {
    throw new Error('Vector legacy requires the shared MediaWiki util runtime.');
  }
  return window.mw.util;
}

function mergeSettings(options = {}) {
  return {
    ...COLLAPSIBLE_TABS_DEFAULTS,
    ...options
  };
}

function elementMatches(element, selector) {
  return !!element && element.nodeType === 1 && element.matches(selector);
}

function outerWidth(element) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width +
    parseFloat(style.marginLeft || 0) +
    parseFloat(style.marginRight || 0);
}

function contentBoxWidth(element) {
  if (!element) return 0;
  const computed = window.getComputedStyle(element);
  const computedWidth = parseFloat(computed.width || '0');
  if (Number.isFinite(computedWidth) && computedWidth > 0) return computedWidth;

  const rect = element.getBoundingClientRect();
  const padding = parseFloat(computed.paddingLeft || '0') + parseFloat(computed.paddingRight || '0');
  const border = parseFloat(computed.borderLeftWidth || '0') + parseFloat(computed.borderRightWidth || '0');
  return Math.max(rect.width - padding - border, 0);
}

function getElement(selectorOrElement) {
  if (!selectorOrElement) return null;
  if (typeof selectorOrElement === 'string') return document.querySelector(selectorOrElement);
  return selectorOrElement;
}

function getMwHook(name) {
  if (typeof window === 'undefined') return null;
  const mw = window.mw;
  if (!mw || typeof mw.hook !== 'function') return null;
  return mw.hook(name);
}

function getChildren(parent, selector) {
  if (!parent) return [];
  return Array.from(parent.children).filter((child) => elementMatches(child, selector));
}

function insertAfter(newNode, referenceNode) {
  if (!referenceNode || !referenceNode.parentNode) return;
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function setRelativeInlineStart(element, side) {
  element.style.position = 'relative';
  element.style[side] = '0';
}

export function jquerySwing(progress) {
  return 0.5 - Math.cos(progress * Math.PI) / 2;
}

export function animateElementWidth(element, targetWidth, done = () => {}) {
  const startWidth = Math.max(contentBoxWidth(element), 1);
  const widthDelta = targetWidth - startWidth;
  const startedAt = window.performance.now();
  let frameId = null;
  let completed = false;

  const finish = () => {
    if (completed) return;
    completed = true;
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
    element.style.width = `${targetWidth}px`;
    done();
  };

  const tick = (time) => {
    if (completed) return;
    const progress = Math.min((time - startedAt) / JQUERY_NORMAL_ANIMATION_MS, 1);
    const eased = jquerySwing(progress);
    element.style.width = `${startWidth + widthDelta * eased}px`;
    if (progress >= 1) finish();
    else frameId = window.requestAnimationFrame(tick);
  };

  element.style.width = `${startWidth}px`;
  element.style.overflow = 'hidden';
  // REL1_46 uses jQuery.animate( { width }, 'normal' ).  Do not use a CSS
  // transition here; jQuery normal is a 400ms JavaScript animation with the
  // default swing easing.
  frameId = window.requestAnimationFrame(tick);
  window.setTimeout(finish, JQUERY_NORMAL_ANIMATION_MS + 100);

  return () => {
    if (completed) return;
    completed = true;
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
  };
}

export function calculateTabDistance() {
  let leftTab;
  let rightTab;
  let leftEnd;
  let rightStart;
  const isRTL = document.documentElement.dir === 'rtl';

  if (!isRTL) {
    leftTab = document.getElementById('left-navigation');
    rightTab = document.getElementById('right-navigation');
  } else {
    leftTab = document.getElementById('right-navigation');
    rightTab = document.getElementById('left-navigation');
  }

  if (leftTab && rightTab) {
    leftEnd = leftTab.getBoundingClientRect().right;
    rightStart = rightTab.getBoundingClientRect().left;
    return rightStart - leftEnd;
  }
  return 0;
}

export function createLegacyCollapsibleTabs(options = {}) {
  const settingsByElement = new WeakMap();
  const instances = [];
  let resizeHandler = null;
  let resizeFrame = null;
  let addPortletLinkHook = null;
  let destroyed = false;
  const activeAnimations = new Set();
  const isRTL = () => document.documentElement.dir === 'rtl';

  function addData(collapsible, containerSettings) {
    const settings = containerSettings || getSettings(collapsible.parentNode);
    if (settings) {
      settingsByElement.set(collapsible, {
        expandedContainer: settings.expandedContainer,
        collapsedContainer: settings.collapsedContainer,
        expandedWidth: outerWidth(collapsible)
      });
    }
  }

  function getSettings(element) {
    if (!element) return {};
    let settings = settingsByElement.get(element);
    if (!settings && elementMatches(element, COLLAPSIBLE_TABS_DEFAULTS.collapsible)) {
      addData(element);
      settings = settingsByElement.get(element);
    }
    return settings || {};
  }

  function scheduleHandleResize() {
    if (destroyed) return;
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(handleResize);
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

  function moveToCollapsed(moving) {
    const outerData = getSettings(moving);
    if (!outerData.expandedContainer || !outerData.collapsedContainer) return;

    const expandedContainer = getElement(outerData.expandedContainer);
    const collapsedContainer = getElement(outerData.collapsedContainer);
    // REL1_46 names this local collapsedContainerSettings even though it is
    // read from outerData.expandedContainer. Preserve that source vocabulary
    // here so later source-review work stays aligned to the upstream file.
    const collapsedContainerSettings = getSettings(expandedContainer);
    if (!expandedContainer || !collapsedContainer || !collapsedContainerSettings) return;

    collapsedContainerSettings.shifting = true;
    settingsByElement.set(expandedContainer, collapsedContainerSettings);

    setRelativeInlineStart(moving, isRTL() ? 'left' : 'right');
    runWidthAnimation(moving, 1, () => {
      moving.style.display = 'none';
      const placeholder = document.createElement('span');
      placeholder.className = 'placeholder';
      placeholder.style.display = 'none';
      insertAfter(placeholder, moving);

      collapsedContainer.insertBefore(moving, collapsedContainer.firstChild);
      settingsByElement.set(moving, outerData);
      moving.setAttribute('style', 'display: list-item;');
      collapsedContainerSettings.shifting = false;
      settingsByElement.set(expandedContainer, collapsedContainerSettings);
      scheduleHandleResize();
    });
  }

  function moveToExpanded(moving) {
    const data = getSettings(moving);
    if (!data.expandedContainer) return;

    const expandedContainer = getElement(data.expandedContainer);
    const expandedContainerSettings = getSettings(expandedContainer);
    const target = expandedContainer ? expandedContainer.querySelector('span.placeholder') : null;
    if (!expandedContainer || !expandedContainerSettings || !target) return;

    expandedContainerSettings.shifting = true;
    settingsByElement.set(expandedContainer, expandedContainerSettings);

    const expandedWidth = data.expandedWidth || outerWidth(moving);
    setRelativeInlineStart(moving, isRTL() ? 'right' : 'left');
    moving.style.width = '1px';
    target.replaceWith(moving);
    settingsByElement.set(moving, data);

    runWidthAnimation(moving, expandedWidth, () => {
      moving.setAttribute('style', 'display: block;');
      window.requestAnimationFrame(() => {
        data.expandedWidth = outerWidth(moving) || 0;
        settingsByElement.set(moving, data);
        expandedContainerSettings.shifting = false;
        settingsByElement.set(expandedContainer, expandedContainerSettings);
        handleResize();
      });
    });
  }

  function restoreCollapsedItems() {
    instances.forEach((element) => {
      const data = getSettings(element);
      const expandedContainer = getElement(data.expandedContainer);
      const collapsedContainer = getElement(data.collapsedContainer);
      if (!expandedContainer || !collapsedContainer) return;

      const placeholders = Array.from(expandedContainer.querySelectorAll('span.placeholder'));
      const collapsedItems = getChildren(collapsedContainer, data.collapsible);
      placeholders.forEach((placeholder, index) => {
        const item = collapsedItems[index];
        if (!item) {
          placeholder.remove();
          return;
        }
        item.setAttribute('style', 'display: block;');
        placeholder.replaceWith(item);
      });

      getChildren(collapsedContainer, data.collapsible).forEach((item) => {
        item.setAttribute('style', 'display: block;');
        expandedContainer.appendChild(item);
      });

      data.shifting = false;
      settingsByElement.set(expandedContainer, data);
    });
  }

  function dispatchBeforeEvent(element, eventName) {
    element.dispatchEvent(new CustomEvent(eventName, { bubbles: false }));
  }

  function handleResize() {
    if (destroyed) return;
    instances.forEach((element) => {
      const data = getSettings(element);
      if (!data.expandedContainer || data.shifting) return;

      const collapsibleItems = getChildren(element, data.collapsible);
      if (collapsibleItems.length && data.collapseCondition()) {
        dispatchBeforeEvent(element, 'beforeTabCollapse');
        moveToCollapsed(collapsibleItems[collapsibleItems.length - 1]);
      }

      const collapsedContainer = getElement(data.collapsedContainer);
      const tab = collapsedContainer ? getChildren(collapsedContainer, data.collapsible)[0] : null;
      if (
        tab &&
        data.expandCondition(getSettings(tab).expandedWidth || 0)
      ) {
        dispatchBeforeEvent(element, 'beforeTabExpand');
        moveToExpanded(tab);
      }
    });
  }

  function markCollapsibleTabs() {
    const views = document.querySelectorAll('#p-views li');
    views.forEach((item) => {
      if (item.id !== 'ca-watch' && item.id !== 'ca-unwatch') {
        item.classList.add('collapsible');
      }
    });
  }

  function init() {
    destroyed = false;
    markCollapsibleTabs();
    const expandedContainer = getElement(options.expandedContainer || COLLAPSIBLE_TABS_DEFAULTS.expandedContainer);
    if (!expandedContainer) return;

    const settings = mergeSettings(options);
    instances.length = 0;
    instances.push(expandedContainer);
    settingsByElement.set(expandedContainer, settings);
    getChildren(expandedContainer, settings.collapsible).forEach((child) => addData(child, settings));

    resizeHandler = getMwUtil().debounce(() => {
      window.requestAnimationFrame(handleResize);
    }, 10);
    window.addEventListener('resize', resizeHandler);

    // REL1_46 registers $.collapsibleTabs.handleResize on util.addPortletLink
    // so links inserted after initial page load are measured by the same tab
    // movement algorithm instead of a skin-specific observer or hard-coded list.
    const hook = getMwHook('util.addPortletLink');
    if (hook && typeof hook.add === 'function') {
      hook.add(handleResize);
      addPortletLinkHook = hook;
    }

    window.requestAnimationFrame(handleResize);
  }

  function destroy() {
    destroyed = true;
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
    if (addPortletLinkHook && typeof addPortletLinkHook.remove === 'function') {
      addPortletLinkHook.remove(handleResize);
    }
    addPortletLinkHook = null;
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = null;
    activeAnimations.forEach((cancel) => cancel());
    activeAnimations.clear();
    restoreCollapsedItems();
    instances.length = 0;
  }

  return Object.freeze({
    init,
    destroy,
    handleResize,
    addData,
    getSettings,
    moveToCollapsed,
    moveToExpanded,
    calculateTabDistance,
    get defaults() {
      return COLLAPSIBLE_TABS_DEFAULTS;
    },
    get instances() {
      return instances;
    }
  });
}

export const legacyCollapsibleTabsInternals = Object.freeze({
  defaults: COLLAPSIBLE_TABS_DEFAULTS,
  calculateTabDistance,
  outerWidth,
  contentBoxWidth,
  jquerySwing,
  animateElementWidth,
  getMwUtil,
  getMwHook
});
