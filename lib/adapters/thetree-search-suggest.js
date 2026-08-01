/*
 * the tree /Complete -> MediaWiki searchSuggest DOM boundary.
 *
 * Minerva keeps ownership of SearchBox.mustache. This adapter only fills its
 * typeahead surface with host results and router actions.
 */

export const SEARCH_SUGGEST_CONTAINER_ID = 'tt-minerva-search-suggestions';

export function normalizeTheTreeSuggestions(value, limit = 10) {
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

export function createTheTreeSearchSuggestRuntime(options = {}) {
  const documentRoot = options.documentRoot || (typeof document === 'undefined' ? null : document);
  const requestSuggestions = options.requestSuggestions || (() => Promise.resolve([]));
  const navigateDocument = options.navigateDocument || (() => {});
  const navigateSearch = options.navigateSearch || (() => {});
  const wait = Number.isFinite(options.wait) ? options.wait : 50;
  const limit = Number.isFinite(options.limit) ? options.limit : 10;
  let input = null;
  let searchRoot = null;
  let container = null;
  let resultsRoot = null;
  let specialRoot = null;
  let suggestions = [];
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
  }

  function closeSuggestions() {
    activeIndex = -1;
    setExpanded(false);
    if (input) input.removeAttribute('aria-activedescendant');
  }

  function activate(index) {
    if (!resultsRoot || !suggestions.length) return;
    activeIndex = Math.max(0, Math.min(index, suggestions.length - 1));
    const rows = resultsRoot.querySelectorAll('[role="option"]');
    rows.forEach((row, rowIndex) => {
      const isActive = rowIndex === activeIndex;
      row.classList.toggle('suggestions-result-current', isActive);
      row.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    const activeRow = rows[activeIndex];
    if (activeRow && input) input.setAttribute('aria-activedescendant', activeRow.id);
  }

  function selectTitle(title) {
    if (!title) return;
    if (input) input.value = title;
    closeSuggestions();
    navigateDocument(title);
  }

  function render(query, items) {
    if (!resultsRoot || !specialRoot) return;
    suggestions = items;
    activeIndex = -1;
    resultsRoot.replaceChildren();
    specialRoot.replaceChildren();

    suggestions.forEach((title, index) => {
      const row = documentRoot.createElement('div');
      row.id = `${SEARCH_SUGGEST_CONTAINER_ID}-option-${index}`;
      row.className = 'suggestions-result';
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.textContent = title;
      row.addEventListener('mousedown', (event) => {
        event.preventDefault();
        selectTitle(title);
      });
      resultsRoot.appendChild(row);
    });

    if (query) {
      const fulltext = documentRoot.createElement('div');
      fulltext.className = 'suggestions-special-item';
      fulltext.textContent = `“${query}” 전체 검색`;
      fulltext.addEventListener('mousedown', (event) => {
        event.preventDefault();
        closeSuggestions();
        navigateSearch(query);
      });
      specialRoot.appendChild(fulltext);
    }

    setExpanded(!!query && (suggestions.length > 0 || specialRoot.childNodes.length > 0));
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
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      activate(activeIndex + 1);
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      activate(activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      event.stopPropagation();
      selectTitle(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeSuggestions();
    }
  }

  function init() {
    if (!documentRoot) return false;
    input = documentRoot.getElementById('searchInput');
    searchRoot = documentRoot.querySelector('.minerva-search-form .search-box');
    if (!input || !searchRoot) return false;

    container = documentRoot.createElement('div');
    container.id = SEARCH_SUGGEST_CONTAINER_ID;
    container.className = 'suggestions tt-minerva-search-suggestions';
    container.hidden = true;
    container.setAttribute('role', 'listbox');
    resultsRoot = documentRoot.createElement('div');
    resultsRoot.className = 'suggestions-results';
    specialRoot = documentRoot.createElement('div');
    specialRoot.className = 'suggestions-special';
    container.append(resultsRoot, specialRoot);
    searchRoot.appendChild(container);

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', SEARCH_SUGGEST_CONTAINER_ID);
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
    if (container) container.remove();
    input = null;
    searchRoot = null;
    container = null;
    resultsRoot = null;
    specialRoot = null;
    suggestions = [];
    activeIndex = -1;
  }

  return Object.freeze({ init, destroy });
}
