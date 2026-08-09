/*
 * MobileFrontend search-dialog bridge for the tree.
 *
 * Derived from MediaWiki core's enableSearchDialog and mobile typeahead
 * wrapper. This local adapter preserves Minerva's route-independent DOM
 * contract while navigation remains owned by the tree router.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Modified: 2026-08-10
 */

export const MINERVA_SEARCH_DIALOG_MEDIA = '(max-width: 639px)';

export function createMinervaSearchDialogRuntime({
  enabled = false,
  documentRoot = typeof document === 'undefined' ? null : document,
  windowRoot = typeof window === 'undefined' ? null : window
} = {}) {
  let trigger = null;
  let form = null;
  let input = null;
  let backButton = null;
  let mediaQuery = null;
  let openState = false;

  function supportsMobileDialog() {
    return enabled && (!mediaQuery || mediaQuery.matches);
  }

  function setOpen(open, { restoreFocus = false } = {}) {
    const next = !!open && supportsMobileDialog();
    openState = next;
    form?.classList?.toggle('tt-minerva-search-dialog', next);
    form?.setAttribute?.('data-tt-minerva-search-dialog', next ? 'open' : 'closed');
    documentRoot?.body?.classList?.toggle('tt-minerva-search-dialog-open', next);
    documentRoot?.body?.classList?.toggle('cdx-dialog-open', next);
    backButton?.toggleAttribute?.('hidden', !next);
    trigger?.setAttribute?.('aria-expanded', next ? 'true' : 'false');
    if (next) input?.focus?.();
    else if (restoreFocus) trigger?.focus?.();
    return next;
  }

  function open(event) {
    if (!supportsMobileDialog()) return false;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    return setOpen(true);
  }

  function close(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    return setOpen(false, { restoreFocus: true });
  }

  function onKeydown(event) {
    if (!openState) return;
    if (event.key === 'Escape') {
      close(event);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(form?.querySelectorAll?.(
      'button:not([hidden]), input:not([type="hidden"]), a[href], [tabindex]:not([tabindex="-1"])'
    ) || [])].filter((node) => (
      node !== trigger &&
      !node.disabled &&
      !node.closest?.('[hidden]') &&
      node.getAttribute?.('aria-hidden') !== 'true'
    ));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && documentRoot.activeElement === first) {
      event.preventDefault?.();
      last.focus?.();
    } else if (!event.shiftKey && documentRoot.activeElement === last) {
      event.preventDefault?.();
      first.focus?.();
    }
  }

  function onMediaChange() {
    if (!supportsMobileDialog() && openState) setOpen(false);
  }

  function init() {
    if (!enabled || !documentRoot) return false;
    trigger = documentRoot.getElementById?.('searchIcon');
    form = documentRoot.querySelector?.('.minerva-search-form');
    input = documentRoot.getElementById?.('searchInput');
    if (!trigger || !form || !input) return false;

    mediaQuery = windowRoot?.matchMedia?.(MINERVA_SEARCH_DIALOG_MEDIA) || null;
    backButton = documentRoot.createElement('button');
    backButton.type = 'button';
    backButton.className = 'tt-minerva-search-dialog__back';
    backButton.setAttribute('aria-label', '검색 닫기');
    backButton.setAttribute('hidden', '');
    backButton.innerHTML = '<span aria-hidden="true"></span>';
    form.prepend(backButton);
    form.setAttribute('data-tt-minerva-search-dialog', 'closed');
    form.setAttribute('aria-label', '검색');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', open);
    backButton.addEventListener('click', close);
    documentRoot.addEventListener?.('keydown', onKeydown, true);
    mediaQuery?.addEventListener?.('change', onMediaChange);
    return true;
  }

  function destroy() {
    setOpen(false);
    trigger?.removeEventListener?.('click', open);
    backButton?.removeEventListener?.('click', close);
    documentRoot?.removeEventListener?.('keydown', onKeydown, true);
    mediaQuery?.removeEventListener?.('change', onMediaChange);
    trigger?.removeAttribute?.('aria-haspopup');
    trigger?.removeAttribute?.('aria-expanded');
    form?.removeAttribute?.('data-tt-minerva-search-dialog');
    form?.removeAttribute?.('aria-label');
    backButton?.remove();
    trigger = null;
    form = null;
    input = null;
    backButton = null;
    mediaQuery = null;
    openState = false;
  }

  return Object.freeze({ init, destroy, open, close, isOpen: () => openState });
}
