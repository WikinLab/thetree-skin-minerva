# Minerva standalone development principles

1. Upstream inputs are exact Git commits. Moving refs are resolved only by an explicit refresh or release operation.
2. Upstream Minerva owns its Mustache DOM, responsive layout, ResourceLoader styles and interaction contracts.
3. the tree differences are isolated to adapters for data, routes, permissions, session state, search and theme persistence.
4. Repeated conversion is implemented by deterministic generators. Inputs, outputs and direct dependencies are declared in `ORIGIN-MANIFEST.json`.
5. Generated components, CSS, vendor mirrors, runtime assets and upstream checkouts are never hand-edited or distributed as tracked source.
6. Fix source contracts or generators instead of patching generated output.
7. `npm run bootstrap -- --clean` followed by `npm run check` is the reproducibility boundary.
8. This `minerva` branch remains a standalone skin. A later Vector/legacy integration adds activation policy above the skins rather than mixing their DOM ownership.
