<template>
  <div
    :class="rootClassList"
    :style="skinVars"
    :lang="legacyDocumentEnvironment.htmlAttributes.lang"
    :dir="legacyDocumentEnvironment.htmlAttributes.dir"
    :data-tt-content-profile="contentProfile.id"
    :data-tt-content-transform="contentTransformSignature"
  >
    <SkinLegacy :content-profile="contentProfile">
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
import activeContentProfile from './lib/content/active';

export default {
  name: 'TheTreeVectorSkin',
  components: {
    SkinLegacy
  },
  data() {
    return {
      legacyDocumentCleanup: null,
      contentStoreRuntime: null,
      contentTransformSignature: 'pending',
      contentProfile: activeContentProfile
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
      this.contentStoreRuntime = this.contentProfile.createStoreRuntime({
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
