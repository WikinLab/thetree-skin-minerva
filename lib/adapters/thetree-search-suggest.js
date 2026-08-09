/*
 * the tree /Complete -> Minerva Codex typeahead boundary.
 *
 * SearchBox.mustache owns the input shell. This adapter renders the same
 * Codex menu contract that Minerva's search enhancement creates at runtime.
 */

export const SEARCH_SUGGEST_CONTAINER_ID = 'tt-minerva-search-suggestions';
export const SEARCH_SUGGEST_LISTBOX_ID = `${SEARCH_SUGGEST_CONTAINER_ID}-listbox`;
export const SEARCH_SUGGESTION_LIMIT = 3;

export function normalizeTheTreeSuggestions(value, limit = SEARCH_SUGGESTION_LIMIT) {
  const source = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
  const seen = new Set();
  const result = [];
  for (const candidate of source) {
    const title = String(candidate ?? '').trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    result.push(title);
    if (result.length >= limit) break;
  }
  return result;
}

function setAttributes(node, attributes) {
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  return node;
}

function appendThumbnail(documentRoot, content) {
  const thumbnail = documentRoot.createElement('span');
  thumbnail.className = 'cdx-thumbnail cdx-menu-item__thumbnail';
  const placeholder = documentRoot.createElement('span');
  placeholder.className = 'cdx-thumbnail__placeholder';
  const icon = documentRoot.createElement('span');
  icon.className = 'cdx-thumbnail__placeholder__icon';
  icon.setAttribute('aria-hidden', 'true');
  placeholder.appendChild(icon);
  thumbnail.appendChild(placeholder);
  content.appendChild(thumbnail);
}

function appendSearchIcon(documentRoot, content) {
  const icon = documentRoot.createElement('span');
  icon.className = 'cdx-icon cdx-icon--medium cdx-menu-item__thumbnail cdx-typeahead-search__search-footer__icon';
  icon.setAttribute('aria-hidden', 'true');
  const svg = setAttributes(documentRoot.createElementNS('http://www.w3.org/2000/svg', 'svg'), {
    width: 20,
    height: 20,
    viewBox: '0 0 20 20'
  });
  const group = documentRoot.createElementNS('http://www.w3.org/2000/svg', 'g');
  const path = setAttributes(documentRoot.createElementNS('http://www.w3.org/2000/svg', 'path'), {
    d: 'M12.43 14.34A5 5 0 0110 15a5 5 0 113.95-2L17 16.09V3a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 001.45-.63z'
  });
  const circle = setAttributes(documentRoot.createElementNS('http://www.w3.org/2000/svg', 'circle'), {
    cx: 10,
    cy: 10,
    r: 3
  });
  group.append(path, circle);
  svg.appendChild(group);
  icon.appendChild(svg);
  content.appendChild(icon);
}

function menuItem(documentRoot, id, title = '') {
  const row = setAttributes(documentRoot.createElement('li'), {
    id,
    role: 'option',
    'aria-disabled': 'false',
    'aria-selected': 'false'
  });
  row.className = 'cdx-menu-item cdx-menu-item--enabled cdx-menu-item--bold-label cdx-menu-item--hide-description-overflow';
  if (title) row.title = title;
  return row;
}

export function createTheTreeSearchSuggestRuntime(options = {}) {
  const documentRoot = options.documentRoot || (typeof document === 'undefined' ? null : document);
  const requestSuggestions = options.requestSuggestions || (() => Promise.resolve([]));
  const navigateDocument = options.navigateDocument || (() => {});
  const navigateSearch = options.navigateSearch || (() => {});
  const wait = Number.isFinite(options.wait) ? options.wait : 50;
  const limit = Number.isFinite(options.limit) ? options.limit : SEARCH_SUGGESTION_LIMIT;
  let input = null;
  let typeaheadRoot = null;
  let container = null;
  let listbox = null;
  let suggestions = [];
  let currentQuery = '';
  let activeIndex = -1;
  let timer = null;
  let blurTimer = null;
  let controller = null;
  let requestGeneration = 0;

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function clearBlurTimer() {
    if (blurTimer !== null) clearTimeout(blurTimer);
    blurTimer = null;
  }

  function setExpanded(expanded) {
    if (!input || !container) return;
    input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    container.hidden = !expanded;
    typeaheadRoot?.classList.toggle('cdx-typeahead-search--expanded', expanded);
  }

  function closeSuggestions() {
    activeIndex = -1;
    setExpanded(false);
    if (input) input.removeAttribute('aria-activedescendant');
  }

  function optionRows() {
    return [...(listbox?.querySelectorAll('[role="option"]') || [])];
  }

  function activate(index) {
    const rows = optionRows();
    if (!rows.length) return;
    activeIndex = Math.max(0, Math.min(index, rows.length - 1));
    rows.forEach((row, rowIndex) => {
      const active = rowIndex === activeIndex;
      row.classList.toggle('cdx-menu-item--highlighted', active);
      row.classList.toggle('cdx-typeahead-search__search-footer__active', active && rowIndex === suggestions.length);
      row.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    input?.setAttribute('aria-activedescendant', rows[activeIndex].id);
  }

  function selectTitle(title) {
    if (!title) return;
    if (input) input.value = title;
    closeSuggestions();
    navigateDocument(title);
  }

  function selectIndex(index) {
    if (index >= 0 && index < suggestions.length) {
      selectTitle(suggestions[index]);
    } else if (index === suggestions.length && currentQuery) {
      closeSuggestions();
      navigateSearch(currentQuery);
    }
  }

  function bindPointerSelection(row, index) {
    row.addEventListener('mouseenter', () => activate(index));
    row.addEventListener('mousedown', (event) => event.preventDefault());
    row.addEventListener('click', (event) => {
      event.preventDefault();
      selectIndex(index);
    });
  }

  function documentRow(title, index) {
    const row = menuItem(documentRoot, `${SEARCH_SUGGEST_CONTAINER_ID}-option-${index}`, title);
    const content = documentRoot.createElement('a');
    content.className = 'cdx-menu-item__content';
    content.href = '#';
    appendThumbnail(documentRoot, content);
    const text = documentRoot.createElement('span');
    text.className = 'cdx-menu-item__text';
    const label = documentRoot.createElement('span');
    label.className = 'cdx-menu-item__text__label';
    const bidi = documentRoot.createElement('bdi');
    bidi.textContent = title;
    label.appendChild(bidi);
    text.appendChild(label);
    content.appendChild(text);
    row.appendChild(content);
    bindPointerSelection(row, index);
    return row;
  }

  function searchRow(query, index) {
    const row = menuItem(documentRoot, `${SEARCH_SUGGEST_CONTAINER_ID}-search`);
    const content = documentRoot.createElement('a');
    content.className = 'cdx-menu-item__content cdx-typeahead-search__search-footer';
    content.href = '#';
    appendSearchIcon(documentRoot, content);
    const text = documentRoot.createElement('span');
    text.className = 'cdx-menu-item__text cdx-typeahead-search__search-footer__text';
    const label = documentRoot.createElement('span');
    const strong = documentRoot.createElement('strong');
    strong.className = 'cdx-typeahead-search__search-footer__query';
    strong.textContent = query;
    label.append(strong, documentRoot.createTextNode(' 항목이 포함된 글을 검색'));
    text.appendChild(label);
    content.appendChild(text);
    row.appendChild(content);
    bindPointerSelection(row, index);
    return row;
  }

  function render(query, items) {
    if (!listbox) return;
    suggestions = items;
    currentQuery = query;
    activeIndex = -1;
    listbox.replaceChildren();
    suggestions.forEach((title, index) => listbox.appendChild(documentRow(title, index)));
    if (query) listbox.appendChild(searchRow(query, suggestions.length));
    setExpanded(!!query);
    input?.removeAttribute('aria-activedescendant');
  }

  async function updateSuggestions(query, generation) {
    if (controller) controller.abort();
    controller = typeof AbortController === 'undefined' ? null : new AbortController();
    try {
      const response = await requestSuggestions(query, controller ? controller.signal : undefined);
      if (generation !== requestGeneration || !input || input.value.trim() !== query) return;
      render(query, normalizeTheTreeSuggestions(response, limit));
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      if (generation === requestGeneration) render(query, []);
    } finally {
      if (generation === requestGeneration) controller = null;
    }
  }

  function scheduleUpdate() {
    clearTimer();
    requestGeneration += 1;
    const generation = requestGeneration;
    const query = input ? input.value.trim() : '';
    if (!query) {
      if (controller) controller.abort();
      controller = null;
      render('', []);
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      updateSuggestions(query, generation);
    }, wait);
  }

  function onFocus() {
    clearBlurTimer();
    if (input && input.value.trim()) scheduleUpdate();
  }

  function onBlur() {
    clearBlurTimer();
    blurTimer = setTimeout(closeSuggestions, 150);
  }

  function onKeydown(event) {
    if (!container || container.hidden) return;
    const count = optionRows().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      activate(activeIndex + 1);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      activate(activeIndex <= 0 ? count - 1 : activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      event.stopPropagation();
      selectIndex(activeIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeSuggestions();
    }
  }

  function init() {
    if (!documentRoot) return false;
    input = documentRoot.getElementById('searchInput');
    typeaheadRoot = documentRoot.querySelector('.minerva-search-form .cdx-typeahead-search');
    if (!input || !typeaheadRoot) return false;

    container = documentRoot.createElement('div');
    container.id = SEARCH_SUGGEST_CONTAINER_ID;
    container.className = 'cdx-menu cdx-menu--has-footer cdx-typeahead-search__menu tt-minerva-search-suggestions';
    container.hidden = true;
    listbox = setAttributes(documentRoot.createElement('ul'), {
      id: SEARCH_SUGGEST_LISTBOX_ID,
      role: 'listbox',
      tabindex: '-1',
      'aria-label': '검색 결과'
    });
    listbox.className = 'cdx-menu__listbox';
    container.appendChild(listbox);
    typeaheadRoot.appendChild(container);

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', SEARCH_SUGGEST_LISTBOX_ID);
    input.setAttribute('aria-expanded', 'false');
    input.addEventListener('input', scheduleUpdate);
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    input.addEventListener('keydown', onKeydown);
    return true;
  }

  function destroy() {
    requestGeneration += 1;
    clearTimer();
    clearBlurTimer();
    if (controller) controller.abort();
    controller = null;
    if (input) {
      input.removeEventListener('input', scheduleUpdate);
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('keydown', onKeydown);
      input.removeAttribute('aria-autocomplete');
      input.removeAttribute('aria-controls');
      input.removeAttribute('aria-expanded');
      input.removeAttribute('aria-activedescendant');
    }
    typeaheadRoot?.classList.remove('cdx-typeahead-search--expanded');
    container?.remove();
    input = null;
    typeaheadRoot = null;
    container = null;
    listbox = null;
    suggestions = [];
    currentQuery = '';
    activeIndex = -1;
  }

  return Object.freeze({ init, destroy });
}
