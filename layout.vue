<template>
  <div
    :class="rootClassList"
    :style="skinVars"
    :lang="minervaDocumentEnvironment.htmlAttributes.lang"
    :dir="minervaDocumentEnvironment.htmlAttributes.dir"
    :data-tt-skin-variant="skinVariantId"
  >
    <SkinMinerva>
      <nuxt />
    </SkinMinerva>
  </div>
</template>

<style>
@import "./css/screen.css";
</style>

<script>
import SkinMinerva from './components/SkinMinerva';
import { applyMinervaDocumentEnvironment, makeMinervaDocumentEnvironment } from './lib/minervaDocumentEnvironment';
import { makeTheTreeAdapterContext } from './lib/legacyTheTreeAdapter';
import { makeMinervaSkinVars, makeMinervaThemeColor } from './lib/minervaSkinVars';
import { SKIN_VARIANT_ID } from './lib/skinVariant.js';

export default {
  name: 'TheTreeMinervaSkin',
  components: {
    SkinMinerva
  },
  data() {
    return {
      minervaDocumentCleanup: null,
      skinVariantId: SKIN_VARIANT_ID
    };
  },
  head() {
    return {
      htmlAttrs: {
        ...this.minervaDocumentEnvironment.htmlAttributes,
        class: this.minervaDocumentEnvironment.htmlClasses.join(' ')
      },
      bodyAttrs: {
        class: this.minervaDocumentEnvironment.bodyClasses.join(' ')
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
    minervaDocumentEnvironment() {
      const config = this.$store.state.config || {};
      const pageContract = this.adapterContext.pageContract;
      return makeMinervaDocumentEnvironment({
        lang: config.lang || config['wiki.lang'] || 'ko',
        dir: config.dir || config['wiki.dir'] || 'ltr',
        namespace: pageContract.namespaceId,
        action: pageContract.actionKind,
        theme: this.$store.state.currentTheme
      });
    },
    rootClassList() {
      return {
        ...Object.fromEntries(this.minervaDocumentEnvironment.rootClasses.map((className) => [className, true]))
      };
    },
    themeColor() {
      return makeMinervaThemeColor(this.$store.state.config || {}, this.$store.state.currentTheme);
    },
    skinVars() {
      return makeMinervaSkinVars({
        config: this.$store.state.config || {},
        documentEnvironment: this.minervaDocumentEnvironment
      });
    },
  },
  watch: {
    minervaDocumentEnvironment: {
      deep: true,
      handler() {
        this.syncMinervaDocumentEnvironment();
      }
    }
  },
  mounted() {
    this.syncMinervaDocumentEnvironment();
  },
  beforeDestroy() {
    this.teardownMinervaDocumentEnvironment();
  },
  beforeUnmount() {
    this.teardownMinervaDocumentEnvironment();
  },
  methods: {
    syncMinervaDocumentEnvironment() {
      this.teardownMinervaDocumentEnvironment();
      this.minervaDocumentCleanup = applyMinervaDocumentEnvironment(this.minervaDocumentEnvironment);
    },
    teardownMinervaDocumentEnvironment() {
      if (this.minervaDocumentCleanup) {
        this.minervaDocumentCleanup();
        this.minervaDocumentCleanup = null;
      }
    }
  }
};
</script>
