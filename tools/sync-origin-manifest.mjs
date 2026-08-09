#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'ORIGIN-MANIFEST.json');
const previous = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const minervaCheckout = path.join(root, '.upstream', 'mediawiki-skins-MinervaNeue');
const toPosix = (value) => String(value).replaceAll('\\', '/');

function visibleSourceFiles() {
  const result = spawnSync('git', [
    '-c', `safe.directory=${root.replaceAll('\\', '/')}`,
    'ls-files', '--cached', '--others', '--exclude-standard', '-z'
  ], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.split('\0')
    .filter(Boolean)
    .map(toPosix)
    .filter((pathname) => fs.existsSync(path.join(root, pathname)))
    .sort();
}

function role(pathname) {
  if (pathname.startsWith('tools/')) return 'generation-tool';
  if (pathname.startsWith('contracts/upstream-build-toolchains/')) return 'upstream-build-contract';
  if (pathname.startsWith('contracts/')) return 'generation-contract';
  if (pathname.startsWith('lib/mustacheVueRuntime')) return 'origin-runtime';
  if (pathname.startsWith('lib/') || pathname.startsWith('components/')) return 'host-adapter';
  if (pathname === 'layout.vue' || pathname.startsWith('css/')) return 'skin-integration';
  return 'package-metadata';
}

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const pathname = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(pathname));
    else if (entry.isFile()) output.push(pathname);
  }
  return output;
}

const retainedVendor = (previous.sourceInventory?.vendorFiles || []).filter((entry) => (
  ['mediawiki', 'design-codex'].includes(entry.repository)
));
const vendorByPath = new Map(retainedVendor.map((entry) => [entry.path, entry]));
const addVendor = (entry) => vendorByPath.set(entry.path, entry);

const templateRoot = path.join(minervaCheckout, 'includes', 'Skins');
const templateFiles = walk(templateRoot).filter((pathname) => pathname.endsWith('.mustache')).sort();
for (const absolute of templateFiles) {
  const upstreamPath = toPosix(path.relative(minervaCheckout, absolute));
  addVendor({
    path: `vendor/mediawiki-minerva/${upstreamPath}`,
    status: 'mirrored',
    repository: 'mediawiki-skins-MinervaNeue',
    upstreamPath
  });
}

const minervaSeeds = [
  'skin.json',
  'includes/Skins/SkinMinerva.php',
  'includes/Menu/Main/AdvancedMainMenuBuilder.php',
  'includes/Menu/Main/DefaultMainMenuBuilder.php',
  'includes/Menu/Main/MainMenuDirector.php',
  'includes/Menu/User/DefaultUserMenuBuilder.php',
  'resources/mediawiki.less/mediawiki.skin.variables.less',
  'minerva.less/minerva.variables.less',
  'resources/skins.minerva.styles/CSSCustomProperties.less',
  'resources/skins.minerva.styles/skin.less',
  'resources/skins.minerva.styles/index.less',
  'resources/skins.minerva.amc.styles/index.less',
  'resources/skins.minerva.mainPage.styles/common.less',
  'resources/skins.minerva.userpage.styles/userpage.less',
  'resources/skins.minerva.loggedin.styles/styles.less',
  'resources/skins.minerva.search/styles.less',
  'skinStyles/mediawiki.hlist/minerva.less',
  'resources/skins.minerva.content.styles.images/error.svg',
  'resources/skins.minerva.content.styles.images/link-external-ltr.svg',
  'resources/skins.minerva.content.styles.images/link-external-rtl.svg'
];
for (const upstreamPath of minervaSeeds) {
  addVendor({
    path: `vendor/mediawiki-minerva/${upstreamPath}`,
    status: 'mirrored',
    repository: 'mediawiki-skins-MinervaNeue',
    upstreamPath
  });
}

for (const name of ['theme-wikimedia-ui-mixin-dark.less', 'theme-wikimedia-ui-mixin-light.less']) {
  addVendor({
    path: `vendor/wikimedia-codex/packages/codex-design-tokens/dist/${name}`,
    status: 'built',
    repository: 'design-codex',
    buildPath: `packages/codex-design-tokens/dist/${name}`
  });
}

const codexCss = [
  'CdxButton.css', 'CdxMenu.css', 'CdxMenuItem.css', 'CdxProgressBar.css',
  'CdxSearchInput.css', 'CdxSearchResultTitle.css', 'CdxTextInput.css',
  'CdxThumbnail.css', 'CdxTypeaheadSearch.css', 'Icon.css'
];
for (const name of [
  'accessibility.less',
  'normalize.less',
  'content.media-dark.less',
  'content.body.less',
  'content.tables.less',
  'interface.less',
  'interface.category.less',
  'i18n-ordered-lists.less'
]) {
  addVendor({
    path: `vendor/mediawiki-core/resources/src/mediawiki.skinning/${name}`,
    status: 'mirrored',
    repository: 'mediawiki',
    upstreamPath: `resources/src/mediawiki.skinning/${name}`
  });
}
for (const upstreamPath of [
  'resources/src/mediawiki.page.ready/enableSearchDialog.js',
  'resources/src/mediawiki.skinning.typeaheadSearch/App.vue',
  'resources/src/mediawiki.skinning.typeaheadSearch/TypeaheadSearchWrapper.vue'
]) {
  addVendor({
    path: `vendor/mediawiki-core/${upstreamPath}`,
    status: 'mirrored',
    repository: 'mediawiki',
    upstreamPath
  });
}
for (const upstreamPath of [
  'extension.json',
  'includes/Transforms/MakeSectionsTransform.php',
  'resources/mobile.init.styles/main.less',
  'src/mobile.init/isCollapsedByDefault.js',
  'src/mobile.init/Toggler.js'
]) {
  addVendor({
    path: `vendor/mediawiki-mobilefrontend/${upstreamPath}`,
    status: 'mirrored',
    repository: 'mediawiki-extensions-MobileFrontend',
    upstreamPath
  });
}
addVendor({
  path: 'vendor/mediawiki-core/resources/lib/codex/modules/manifest.json',
  status: 'mirrored', repository: 'mediawiki', upstreamPath: 'resources/lib/codex/modules/manifest.json'
});
for (const name of codexCss) {
  addVendor({
    path: `vendor/mediawiki-core/resources/lib/codex/modules/${name}`,
    status: 'mirrored', repository: 'mediawiki', upstreamPath: `resources/lib/codex/modules/${name}`
  });
}

function partialDependencies(absolute) {
  const source = fs.readFileSync(absolute, 'utf8');
  const names = [...source.matchAll(/{{>\s*([^}\s]+)\s*}}/g)].map((match) => match[1]);
  return [...new Set(names)].sort().map((name) => `vendor/mediawiki-minerva/includes/Skins/${name}.mustache`);
}

const mustacheOutputs = templateFiles.map((absolute) => {
  const relative = toPosix(path.relative(templateRoot, absolute));
  const input = `vendor/mediawiki-minerva/includes/Skins/${relative}`;
  return {
    path: `components/${relative.slice(0, -'.mustache'.length)}.vue`,
    originNode: 'mustache-components',
    input,
    partialDependencies: partialDependencies(absolute)
  };
});

const resourceContract = JSON.parse(fs.readFileSync(path.join(root, 'contracts', 'resource-loader-origin-contract.json'), 'utf8'));
const resourceOutputs = [
  ...resourceContract.modules.map((module) => module.output),
  ...resourceContract.modules.flatMap((module) => (module.assets || []).flatMap((mapping) => {
    const sourceRoot = path.join(root, mapping.source.replace('vendor/mediawiki-minerva', '.upstream/mediawiki-skins-MinervaNeue'));
    return walk(sourceRoot).map((source) => toPosix(path.join(mapping.output, path.relative(sourceRoot, source))));
  })),
  resourceContract.customPropertyClosure.output,
  resourceContract.messageCatalog.output,
  resourceContract.pageStyleQueue.output
].map((pathname) => ({ path: toPosix(pathname), originNode: 'resource-loader-css' }));

const generatedPaths = new Set([...mustacheOutputs, ...resourceOutputs].map((entry) => entry.path));
const portedFiles = [
  {
    path: 'lib/adapters/minerva-search-dialog.js',
    repository: 'mediawiki',
    upstreamPaths: [
      'resources/src/mediawiki.page.ready/enableSearchDialog.js',
      'resources/src/mediawiki.skinning.typeaheadSearch/App.vue',
      'resources/src/mediawiki.skinning.typeaheadSearch/TypeaheadSearchWrapper.vue'
    ],
    kind: 'source-port',
    relation: 'many-upstream-files-to-one-local-adapter',
    hostDependency: 'thetree-router-and-dom',
    automationStatus: 'adapter-required',
    license: 'GPL-2.0-or-later',
    modifiedDates: ['2026-08-10'],
    differenceClasses: ['mediawiki-router-to-thetree-runtime', 'spa-lifecycle', 'mobile-dialog-shell'],
    originInputs: [
      'vendor/mediawiki-core/resources/src/mediawiki.page.ready/enableSearchDialog.js',
      'vendor/mediawiki-core/resources/src/mediawiki.skinning.typeaheadSearch/App.vue',
      'vendor/mediawiki-core/resources/src/mediawiki.skinning.typeaheadSearch/TypeaheadSearchWrapper.vue'
    ]
  },
  {
    path: 'lib/adapters/minerva-mobile-sections.js',
    repository: 'mediawiki-extensions-MobileFrontend',
    upstreamPaths: [
      'includes/Transforms/MakeSectionsTransform.php',
      'resources/mobile.init.styles/main.less',
      'src/mobile.init/isCollapsedByDefault.js',
      'src/mobile.init/Toggler.js'
    ],
    kind: 'source-port',
    relation: 'many-upstream-files-to-one-local-adapter',
    hostDependency: 'thetree-namumark-dom',
    automationStatus: 'adapter-required',
    license: 'GPL-2.0-or-later',
    modifiedDates: ['2026-08-10'],
    differenceClasses: ['php-transform-to-dom-adapter', 'host-heading-contract', 'spa-lifecycle'],
    originInputs: [
      'vendor/mediawiki-mobilefrontend/includes/Transforms/MakeSectionsTransform.php',
      'vendor/mediawiki-mobilefrontend/resources/mobile.init.styles/main.less',
      'vendor/mediawiki-mobilefrontend/src/mobile.init/isCollapsedByDefault.js',
      'vendor/mediawiki-mobilefrontend/src/mobile.init/Toggler.js'
    ]
  }
];
const portedPaths = new Set(portedFiles.map((entry) => entry.path));
const localFiles = visibleSourceFiles()
  .filter((pathname) => !generatedPaths.has(pathname) && !portedPaths.has(pathname))
  .map((pathname) => ({
    path: pathname,
    kind: role(pathname),
    hostDependency: pathname.startsWith('lib/') || pathname.startsWith('components/') || pathname === 'layout.vue' || pathname.startsWith('css/')
      ? 'thetree'
      : 'none'
  }));

const manifest = {
  schema: 31,
  title: 'thetree MinervaNeue standalone bootstrap source manifest',
  upstreamLockFile: 'UPSTREAM-LOCK.json',
  hostLock: previous.hostLock,
  distribution: {
    mode: 'bootstrap-source-only',
    snapshotDate: '2026-08-10',
    releaseLine: 'REL1_46',
    vendorIncluded: false,
    generatedOutputsIncluded: false,
    runtimeAssetsIncluded: false,
    upstreamCheckoutsIncluded: false,
    bootstrap: 'npm run bootstrap',
    vendorProvenance: 'git-checkout-only',
    upstreamBuildOutputsIncluded: false
  },
  sourceInventory: {
    schema: 21,
    sourceCoverage: {
      schema: 1,
      root: '.',
      declaredInventories: ['sourceInventory.localFiles', 'sourceInventory.portedFiles'],
      excludedInventories: ['sourceInventory.generatedFiles', 'sourceInventory.materializedRuntimeAssets'],
      ignoredRoots: ['.build-tools', '.git', '.test-dist', '.upstream', 'node_modules', 'vendor'],
      inventoryContracts: [
        {
          inventory: 'sourceInventory.localFiles',
          requiredFields: ['path', 'kind', 'hostDependency'],
          allowedValues: {
            kind: ['package-metadata', 'skin-integration', 'host-adapter', 'origin-runtime', 'generation-tool', 'generation-contract', 'upstream-build-contract']
          }
        },
        {
          inventory: 'sourceInventory.portedFiles',
          requiredFields: ['path', 'kind', 'relation', 'hostDependency', 'repository', 'automationStatus', 'license', 'modifiedDates', 'differenceClasses', 'originInputs'],
          requiredAnyFields: ['upstreamPath', 'upstreamPaths'],
          allowedValues: { kind: ['source-port'], automationStatus: ['adapter-required'] }
        }
      ]
    },
    vendorLessClosure: {
      schema: 2,
      seeds: 'declared-less-files',
      parser: 'less-ast',
      resolution: 'shared-resource-loader-resolver',
      compilation: 'less-import-manager',
      materialization: 'one-upstream-file-to-one-vendor-file'
    },
    vendorFiles: [...vendorByPath.values()].sort((a, b) => a.path.localeCompare(b.path, 'en')),
    portedFiles,
    localFiles,
    generatedFiles: [...mustacheOutputs, ...resourceOutputs].sort((a, b) => a.path.localeCompare(b.path, 'en')),
    materializedRuntimeAssets: []
  },
  generation: {
    schema: 1,
    entrypoint: 'tools/generate-origin.mjs',
    nodes: [
      {
        id: 'mustache-components',
        kind: 'mustache-vue-directory',
        dependsOn: [],
        inputRoot: 'vendor/mediawiki-minerva/includes/Skins',
        outputRoot: 'components',
        inputExtension: '.mustache',
        outputExtension: '.vue',
        outputInventory: 'sourceInventory.generatedFiles',
        inputInventory: 'sourceInventory.vendorFiles',
        partialResolution: 'template-root-name',
        outputRelationContract: { inputField: 'input', dependenciesField: 'partialDependencies' }
      },
      {
        id: 'resource-loader-css',
        kind: 'resource-loader-origin',
        dependsOn: [],
        contract: 'contracts/resource-loader-origin-contract.json',
        outputInventory: 'sourceInventory.generatedFiles'
      }
    ]
  },
  integration: {
    schema: 1,
    skinVariant: {
      schema: 1,
      contract: 'contracts/skin-variant-contract.json',
      runtimeModule: 'lib/skinVariant.js',
      consumer: 'components/MinervaVariantLayout.vue',
      activationAttribute: 'data-tt-skin-variant'
    },
    moduleGraph: {
      schema: 1,
      ignoredRoots: ['.build-tools', '.git', '.test-dist', '.upstream', 'node_modules', 'vendor'],
      allowedBareSpecifiers: ['vue'],
      allowedSpecifierPrefixes: ['node:', '~/']
    },
    stylesheetDelivery: {
      schema: 1,
      mode: 'single-static-entry',
      selection: 'build-time-static',
      profile: 'minerva',
      entry: 'css/screen.css',
      originBundle: 'css/vendor/resource-loader/page-styles.css',
      adapterImports: ['css/minerva-adapter.css', 'css/host-content.css', 'css/host-modal.css'],
      resourceLoaderContract: 'contracts/resource-loader-origin-contract.json',
      hostLimitation: 'thetree supplies one static skin entry; Minerva owns responsive chrome while host content remains isolated under thetree ownership.'
    }
  }
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Synchronized ${path.relative(root, manifestPath)}.`);
