/*
 * MobileFrontend section transform and toggler bridge for the tree.
 *
 * Derived from MobileFrontend's MakeSectionsTransform and Toggler. The tree
 * already emits heading/content sibling pairs, so this adapter applies the
 * upstream structural classes and accessibility state without rewriting
 * article HTML.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Modified: 2026-08-10
 */

export const MINERVA_COLLAPSIBLE_SECTION_MEDIA = '(max-width: 639px)';

function targetInside(record, documentRoot) {
  const hash = documentRoot?.defaultView?.location?.hash || '';
  if (!hash || hash === '#') return false;
  let target = null;
  try {
    target = documentRoot.querySelector(hash);
  } catch {
    return false;
  }
  return target === record.heading || record.content.contains?.(target);
}

export function createMinervaMobileSectionsRuntime({
  enabled = false,
  documentRoot = typeof document === 'undefined' ? null : document,
  windowRoot = typeof window === 'undefined' ? null : window
} = {}) {
  const records = new Map();
  let observer = null;
  let mediaQuery = null;
  let nextSection = 1;

  function setExpanded(record, expanded) {
    const open = !!expanded;
    record.heading.classList.toggle('open-block', open);
    record.heading.setAttribute('aria-expanded', open ? 'true' : 'false');
    record.content.classList.toggle('open-block', open);
    if (open) record.content.removeAttribute('hidden');
    else record.content.setAttribute('hidden', 'until-found');
  }

  function transform(heading) {
    if (records.has(heading)) return;
    const content = heading.nextElementSibling;
    if (!content?.classList?.contains('wiki-heading-content')) return;
    const id = content.id || `mf-section-${nextSection++}`;
    const indicator = documentRoot.createElement('span');
    indicator.className = 'indicator tt-minerva-section-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    heading.prepend(indicator);

    const initial = {
      headingClass: heading.getAttribute('class'),
      headingRole: heading.getAttribute('role'),
      headingTabindex: heading.getAttribute('tabindex'),
      headingControls: heading.getAttribute('aria-controls'),
      headingExpanded: heading.getAttribute('aria-expanded'),
      contentClass: content.getAttribute('class'),
      contentId: content.getAttribute('id'),
      contentHidden: content.getAttribute('hidden'),
      editClass: null,
      editLinkClass: null,
      editLinkAriaLabel: null
    };
    const record = { heading, content, indicator, initial };
    records.set(heading, record);

    heading.classList.add('section-heading', 'collapsible-heading');
    heading.setAttribute('role', 'button');
    heading.setAttribute('tabindex', '0');
    heading.setAttribute('aria-controls', id);
    content.id = id;
    content.classList.add('collapsible-block', 'collapsible-block-js');
    const edit = heading.querySelector('.wiki-edit-section');
    initial.editClass = edit?.getAttribute?.('class') ?? null;
    edit?.classList?.add('mw-editsection');
    const editLink = edit?.querySelector?.('a');
    initial.editLinkClass = editLink?.getAttribute?.('class') ?? null;
    initial.editLinkAriaLabel = editLink?.getAttribute?.('aria-label') ?? null;
    editLink?.classList?.add('minerva-icon', 'minerva-icon--edit');
    editLink?.setAttribute?.('aria-label', '문단 편집');

    const collapsed = mediaQuery?.matches && !targetInside(record, documentRoot);
    setExpanded(record, !collapsed);
  }

  function transformAll() {
    const headings = [...(documentRoot?.querySelectorAll?.('#mw-content-text .wiki-content .wiki-heading') || [])];
    const ranks = headings.map((heading) => Number(/^H([1-6])$/.exec(heading.tagName)?.[1])).filter(Boolean);
    const topRank = ranks.length ? Math.min(...ranks) : null;
    for (const heading of headings.filter((candidate) => Number(/^H([1-6])$/.exec(candidate.tagName)?.[1]) === topRank)) {
      transform(heading);
    }
  }

  function recordFromEvent(event) {
    const heading = event.target?.closest?.('.section-heading.collapsible-heading');
    return heading ? records.get(heading) : null;
  }

  function onClick(event) {
    const record = recordFromEvent(event);
    const clickedLink = event.target?.closest?.('a');
    if (!record || clickedLink?.href) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    setExpanded(record, record.heading.getAttribute('aria-expanded') !== 'true');
  }

  function onKeydown(event) {
    if (!['Enter', ' '].includes(event.key)) return;
    const record = recordFromEvent(event);
    if (!record) return;
    onClick(event);
  }

  function onBeforeMatch(event) {
    for (const record of records.values()) {
      if (record.content === event.target || record.content.contains?.(event.target)) setExpanded(record, true);
    }
  }

  function onMediaChange() {
    if (!mediaQuery?.matches) records.forEach((record) => setExpanded(record, true));
  }

  function restoreAttribute(node, name, value) {
    if (value === null) node.removeAttribute(name);
    else node.setAttribute(name, value);
  }

  function init() {
    if (!enabled || !documentRoot) return false;
    mediaQuery = windowRoot?.matchMedia?.(MINERVA_COLLAPSIBLE_SECTION_MEDIA) || null;
    transformAll();
    documentRoot.addEventListener?.('click', onClick, true);
    documentRoot.addEventListener?.('keydown', onKeydown, true);
    documentRoot.addEventListener?.('beforematch', onBeforeMatch, true);
    mediaQuery?.addEventListener?.('change', onMediaChange);
    const Observer = windowRoot?.MutationObserver || documentRoot.defaultView?.MutationObserver;
    observer = typeof Observer === 'function' ? new Observer(transformAll) : null;
    observer?.observe(documentRoot.getElementById?.('mw-content-text') || documentRoot.body, {
      childList: true,
      subtree: true
    });
    return true;
  }

  function destroy() {
    observer?.disconnect?.();
    documentRoot?.removeEventListener?.('click', onClick, true);
    documentRoot?.removeEventListener?.('keydown', onKeydown, true);
    documentRoot?.removeEventListener?.('beforematch', onBeforeMatch, true);
    mediaQuery?.removeEventListener?.('change', onMediaChange);
    for (const record of records.values()) {
      const { heading, content, indicator, initial } = record;
      restoreAttribute(heading, 'class', initial.headingClass);
      restoreAttribute(heading, 'role', initial.headingRole);
      restoreAttribute(heading, 'tabindex', initial.headingTabindex);
      restoreAttribute(heading, 'aria-controls', initial.headingControls);
      restoreAttribute(heading, 'aria-expanded', initial.headingExpanded);
      restoreAttribute(content, 'class', initial.contentClass);
      restoreAttribute(content, 'id', initial.contentId);
      restoreAttribute(content, 'hidden', initial.contentHidden);
      const edit = heading.querySelector('.wiki-edit-section');
      const editLink = edit?.querySelector?.('a');
      if (edit) restoreAttribute(edit, 'class', initial.editClass);
      if (editLink) {
        restoreAttribute(editLink, 'class', initial.editLinkClass);
        restoreAttribute(editLink, 'aria-label', initial.editLinkAriaLabel);
      }
      indicator.remove();
    }
    records.clear();
    observer = null;
    mediaQuery = null;
    nextSection = 1;
  }

  return Object.freeze({ init, destroy });
}
