export function createMinervaRuntimeController({
  createSearchRuntime = () => null,
  schedule = (callback) => callback(),
  documentRoot = () => (typeof document === 'undefined' ? null : document)
} = {}) {
  let searchRuntime = null;
  let root = null;
  let generation = 0;

  function onChange(event) {
    const checkbox = event.target?.closest?.('.toggle-list__checkbox');
    if (checkbox) checkbox.setAttribute('aria-expanded', checkbox.checked ? 'true' : 'false');
  }

  function onClick(event) {
    if (!event.target?.closest?.('.mw-mf-page-center__mask')) return;
    event.preventDefault();
    const checkbox = root?.getElementById?.('main-menu-input');
    if (checkbox) {
      checkbox.checked = false;
      checkbox.setAttribute('aria-expanded', 'false');
    }
  }

  function destroyNow() {
    searchRuntime?.destroy?.();
    searchRuntime = null;
    root?.removeEventListener?.('change', onChange, true);
    root?.removeEventListener?.('click', onClick, true);
    root = null;
  }

  function initNow() {
    destroyNow();
    root = documentRoot();
    if (!root) return;
    root.addEventListener('change', onChange, true);
    root.addEventListener('click', onClick, true);
    searchRuntime = createSearchRuntime();
    searchRuntime?.init?.();
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
