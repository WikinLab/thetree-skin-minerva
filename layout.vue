<template>
  <div
    :class="rootClassList"
    :style="skinVars"
    :lang="legacyDocumentEnvironment.htmlAttributes.lang"
    :dir="legacyDocumentEnvironment.htmlAttributes.dir"
    :data-tt-skin-variant="skinVariantId"
    :data-tt-content-mode="contentModePreference.mode"
    :data-tt-content-projection="activeContentProjection ? activeContentProjection.id : null"
    :data-tt-content-transform="contentTransformSignature"
  >
    <SkinLegacy :content-projection="activeContentProjection">
      <nuxt />
    </SkinLegacy>
  </div>
</template>

<style>
@import "./css/screen.css";
</style>

<script>
import SkinLegacy from './components/SkinLegacy';
import { applyLegacyDocumentEnvironment, makeLegacyDocumentEnvironment } from './lib/legacyDocumentEnvironment';
import { makeTheTreeAdapterContext } from './lib/legacyTheTreeAdapter';
import { makeLegacySkinVars, makeLegacyThemeColor } from './lib/legacySkinVars';
import vectorContentProjection from './lib/contentProjection';
import { CONTENT_MODE_PROJECTED } from './lib/contentMode.js';
import { SKIN_VARIANT_ID } from './lib/skinVariant.js';
import { resolveContentModePreference } from './lib/adapters/thetree-content-projection';

export default {
  name: 'TheTreeVectorSkin',
  components: {
    SkinLegacy
  },
  data() {
    return {
      legacyDocumentCleanup: null,
      contentStoreRuntime: null,
      contentTransformSignature: 'projection-pending',
      projectedContentAdapter: vectorContentProjection,
      skinVariantId: SKIN_VARIANT_ID
    };
  },
  head() {
    return {
      htmlAttrs: {
        ...this.legacyDocumentEnvironment.htmlAttributes,
        class: this.legacyDocumentEnvironment.htmlClasses.join(' ')
      },
      bodyAttrs: {
        class: this.legacyDocumentEnvironment.bodyClasses.join(' ')
      },
      meta: [
        { name: 'theme-color', content: this.themeColor }
      ]
    };
  },
  computed: {
    adapterContext() {
      return makeTheTreeAdapterContext({
        storeState: this.$store.state,
        route: this.$route
      });
    },
    contentModePreference() {
      return resolveContentModePreference(this.adapterContext);
    },
    activeContentProjection() {
      return this.contentModePreference.mode === CONTENT_MODE_PROJECTED
        ? this.projectedContentAdapter
        : null;
    },
    legacyDocumentEnvironment() {
      const config = this.$store.state.config || {};
      const pageContract = this.adapterContext.pageContract;
      return makeLegacyDocumentEnvironment({
        lang: config.lang || config['wiki.lang'] || 'ko',
        dir: config.dir || config['wiki.dir'] || 'ltr',
        namespace: pageContract.namespaceId,
        action: pageContract.actionKind,
        theme: this.$store.state.currentTheme
      });
    },
    rootClassList() {
      return {
        ...Object.fromEntries(this.legacyDocumentEnvironment.rootClasses.map((className) => [className, true]))
      };
    },
    themeColor() {
      return makeLegacyThemeColor(this.$store.state.config || {}, this.$store.state.currentTheme);
    },
    skinVars() {
      return makeLegacySkinVars({
        config: this.$store.state.config || {},
        documentEnvironment: this.legacyDocumentEnvironment
      });
    },
  },
  created() {
    this.installContentStoreRuntime();
  },
  beforeUpdate() {
    this.syncContentStoreRuntime();
  },
  watch: {
    legacyDocumentEnvironment: {
      deep: true,
      handler() {
        this.syncLegacyDocumentEnvironment();
      }
    }
  },
  mounted() {
    this.syncLegacyDocumentEnvironment();
  },
  beforeDestroy() {
    this.teardownContentStoreRuntime();
    this.teardownLegacyDocumentEnvironment();
  },
  beforeUnmount() {
    this.teardownContentStoreRuntime();
    this.teardownLegacyDocumentEnvironment();
  },
  methods: {
    installContentStoreRuntime() {
      if (this.contentStoreRuntime) return;
      if (!this.activeContentProjection) {
        this.contentTransformSignature = 'content-native';
        return;
      }
      this.contentStoreRuntime = this.activeContentProjection.createStoreRuntime({
        store: this.$store,
        onUpdate: (signature) => {
          this.contentTransformSignature = signature;
        }
      });
      this.contentStoreRuntime.init();
    },
    syncContentStoreRuntime() {
      if (this.contentStoreRuntime) {
        this.contentStoreRuntime.sync();
      }
    },
    teardownContentStoreRuntime() {
      if (this.contentStoreRuntime) {
        this.contentStoreRuntime.destroy();
      }
      this.contentStoreRuntime = null;
    },
    syncLegacyDocumentEnvironment() {
      this.teardownLegacyDocumentEnvironment();
      this.legacyDocumentCleanup = applyLegacyDocumentEnvironment(this.legacyDocumentEnvironment);
    },
    teardownLegacyDocumentEnvironment() {
      if (this.legacyDocumentCleanup) {
        this.legacyDocumentCleanup();
        this.legacyDocumentCleanup = null;
      }
    }
  }
};
</script>
