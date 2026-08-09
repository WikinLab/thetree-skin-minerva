function setExpanded(checkbox, expanded) {
  checkbox.checked = expanded;
  checkbox.setAttribute?.('aria-expanded', expanded ? 'true' : 'false');
}

function relativeTime(timestamp, now) {
  const delta = Math.max(0, Math.floor((now - timestamp * 1000) / 1000));
  if (delta < 60) return '방금 전';
  if (delta < 3600) return `${Math.floor(delta / 60)}분 전`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}시간 전`;
  if (delta < 2592000) return `${Math.floor(delta / 86400)}일 전`;
  if (delta < 31536000) return `${Math.floor(delta / 2592000)}개월 전`;
  return `${Math.floor(delta / 31536000)}년 전`;
}

function updateWatchstarElement(anchor, watched) {
  const watchHref = anchor.getAttribute?.('data-watch-href') || anchor.dataset?.watchHref;
  const unwatchHref = anchor.getAttribute?.('data-unwatch-href') || anchor.dataset?.unwatchHref;
  anchor.setAttribute?.('data-watched', watched ? 'true' : 'false');
  anchor.setAttribute?.('aria-pressed', watched ? 'true' : 'false');
  anchor.setAttribute?.('href', watched ? unwatchHref : watchHref);
  const icon = anchor.querySelector?.('.minerva-icon');
  icon?.classList?.remove('minerva-icon--star', 'minerva-icon--unStar', 'minerva-icon--halfStar');
  icon?.classList?.add(watched ? 'minerva-icon--unStar' : 'minerva-icon--star');
  const label = anchor.querySelector?.('span:last-child');
  if (label && !label.classList?.contains?.('minerva-icon')) label.textContent = watched ? '주시 해제' : '주시';
}

export function createMinervaRuntimeController({
  createSearchRuntime = () => null,
  createSearchDialogRuntime = () => null,
  createMobileSectionsRuntime = () => null,
  toggleWatchstar = async () => {},
  schedule = (callback) => callback(),
  documentRoot = () => (typeof document === 'undefined' ? null : document),
  now = () => Date.now()
} = {}) {
  let searchRuntime = null;
  let searchDialogRuntime = null;
  let mobileSectionsRuntime = null;
  let root = null;
  let generation = 0;
  let animationTarget = null;

  function checkboxes() {
    return [...(root?.querySelectorAll?.('.toggle-list__checkbox') || [])];
  }

  function closeToggleLists(except = null) {
    for (const checkbox of checkboxes()) {
      if (checkbox !== except && checkbox.checked) setExpanded(checkbox, false);
    }
  }

  function onChange(event) {
    const checkbox = event.target?.closest?.('.toggle-list__checkbox');
    if (!checkbox) return;
    if (checkbox.checked) closeToggleLists(checkbox);
    setExpanded(checkbox, !!checkbox.checked);
  }

  async function onClick(event) {
    const watchstar = event.target?.closest?.('a[data-tt-minerva-watchstar="1"]');
    if (watchstar) {
      event.preventDefault?.();
      if (watchstar.getAttribute?.('aria-busy') === 'true') return;
      const watched = watchstar.getAttribute?.('data-watched') === 'true';
      const href = watchstar.getAttribute?.('href') || '';
      watchstar.setAttribute?.('aria-busy', 'true');
      try {
        await toggleWatchstar(href, !watched);
        updateWatchstarElement(watchstar, !watched);
        watchstar.removeAttribute?.('data-watch-error');
      } catch {
        watchstar.setAttribute?.('data-watch-error', 'true');
      } finally {
        watchstar.removeAttribute?.('aria-busy');
      }
      return;
    }

    const mask = event.target?.closest?.('.mw-mf-page-center__mask, .main-menu-mask');
    if (mask) {
      event.preventDefault?.();
      const checkbox = root?.getElementById?.('main-menu-input');
      if (checkbox) setExpanded(checkbox, false);
      return;
    }

    if (!event.target?.closest?.('.toggle-list')) closeToggleLists();
  }

  function onFocusIn(event) {
    const component = event.target?.closest?.('.toggle-list');
    if (!component) {
      closeToggleLists();
      return;
    }
    const current = component.querySelector?.('.toggle-list__checkbox') || null;
    closeToggleLists(current);
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    const expanded = checkboxes().find((checkbox) => checkbox.checked);
    closeToggleLists();
    if (expanded) {
      const labelledBy = expanded.getAttribute?.('aria-labelledby');
      root?.getElementById?.(labelledBy)?.focus?.();
    }
  }

  function initTabs() {
    const selected = root?.querySelector?.('.minerva__tab.selected');
    const container = selected?.closest?.('.minerva__tab-container');
    if (!selected || !container) return;
    selected.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }

  function initHistoryLinks() {
    for (const node of root?.querySelectorAll?.('.modified-enhancement[data-timestamp]') || []) {
      const timestamp = Number(node.getAttribute?.('data-timestamp') || node.dataset?.timestamp);
      if (!Number.isFinite(timestamp) || timestamp <= 0) continue;
      const label = node.querySelector?.('span') || node;
      label.textContent = `마지막 편집: ${relativeTime(timestamp, now())}`;
      if (now() - timestamp * 1000 < 86400000) node.closest?.('.last-modified-bar')?.classList?.add('active');
    }
  }

  function destroyNow() {
    searchRuntime?.destroy?.();
    searchRuntime = null;
    searchDialogRuntime?.destroy?.();
    searchDialogRuntime = null;
    mobileSectionsRuntime?.destroy?.();
    mobileSectionsRuntime = null;
    root?.removeEventListener?.('change', onChange, true);
    root?.removeEventListener?.('click', onClick, true);
    root?.removeEventListener?.('focusin', onFocusIn, true);
    root?.removeEventListener?.('keydown', onKeyDown, true);
    animationTarget?.classList?.remove?.('minerva-animations-ready');
    animationTarget = null;
    root = null;
  }

  function initNow() {
    destroyNow();
    root = documentRoot();
    if (!root) return;
    root.addEventListener?.('change', onChange, true);
    root.addEventListener?.('click', onClick, true);
    root.addEventListener?.('focusin', onFocusIn, true);
    root.addEventListener?.('keydown', onKeyDown, true);
    animationTarget = root.body || root.documentElement || null;
    animationTarget?.classList?.add?.('minerva-animations-ready');
    for (const checkbox of checkboxes()) setExpanded(checkbox, !!checkbox.checked);
    initTabs();
    initHistoryLinks();
    searchDialogRuntime = createSearchDialogRuntime();
    searchDialogRuntime?.init?.();
    searchRuntime = createSearchRuntime({
      closeMobileSearch: () => searchDialogRuntime?.close?.()
    });
    searchRuntime?.init?.();
    mobileSectionsRuntime = createMobileSectionsRuntime();
    mobileSectionsRuntime?.init?.();
  }

  function init() {
    generation += 1;
    initNow();
  }

  function destroy() {
    generation += 1;
    destroyNow();
  }

  function reset() {
    const requestedGeneration = ++generation;
    schedule(() => {
      if (requestedGeneration === generation) initNow();
    });
  }

  return Object.freeze({ init, destroy, reset });
}
