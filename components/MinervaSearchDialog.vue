<template>
  <MediaWikiTypeaheadSearchOrigin
    v-if="open && restClient && urlGenerator && routerAdapter"
    id="minerva-overlay-search"
    prefix-class="skin-"
    autocapitalize-value="none"
    :router="routerAdapter"
    :url-generator="urlGenerator"
    :rest-client="restClient"
    :search-query="initialQuery"
    :search-button-label="''"
    :search-placeholder="`${siteName} 검색`"
    :action="searchUrl('')"
    :autofocus-input="true"
    :supports-mobile-experience="true"
    :show-thumbnail="true"
    :show-description="true"
    :highlight-query="false"
    :auto-expand-width="true"
    :show-empty-search-recommendations="false"
  />
</template>

<script>
import MediaWikiTypeaheadSearchOrigin from '../lib/generated/mediawiki.skinning.typeaheadSearch/App.vue';
import {
  makeTheTreeTypeaheadRestClient,
  makeTheTreeTypeaheadRouter,
  makeTheTreeTypeaheadUrlGenerator
} from '../lib/adapters/thetree-search-suggest.js';

export default {
  name: 'MinervaSearchDialog',
  components: {
    MediaWikiTypeaheadSearchOrigin
  },
  props: {
    open: { type: Boolean, default: false },
    siteName: { type: String, default: 'the tree' },
    initialQuery: { type: String, default: '' },
    requestSuggestions: { type: Function, required: true },
    documentUrl: { type: Function, required: true },
    searchUrl: { type: Function, required: true },
    navigateSearch: { type: Function, required: true }
  },
  data() {
    return {
      restClient: null,
      routerAdapter: null,
      urlGenerator: null
    };
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        if (value) this.activate();
        else this.deactivate();
      }
    }
  },
  beforeDestroy() {
    this.deactivate();
  },
  beforeUnmount() {
    this.deactivate();
  },
  methods: {
    activate() {
      if (this.restClient) return;
      this.restClient = makeTheTreeTypeaheadRestClient({
        requestSuggestions: this.requestSuggestions,
        urlForTitle: this.documentUrl
      });
      this.urlGenerator = makeTheTreeTypeaheadUrlGenerator(this.searchUrl);
      this.routerAdapter = makeTheTreeTypeaheadRouter(() => this.$emit('close'));
      if (typeof document !== 'undefined') document.addEventListener('submit', this.onSubmit, true);
    },
    deactivate() {
      if (typeof document !== 'undefined') document.removeEventListener('submit', this.onSubmit, true);
      this.restClient?.destroy?.();
      this.routerAdapter?.destroy?.();
      this.restClient = null;
      this.routerAdapter = null;
      this.urlGenerator = null;
    },
    onSubmit(event) {
      const form = event?.target;
      if (form?.id !== 'minerva-overlay-search') return;
      event.preventDefault();
      const query = String(
        form.elements?.search?.value || form.querySelector?.('input[type="search"]')?.value || ''
      ).trim();
      if (!query) return;
      this.navigateSearch(query);
      this.$emit('close');
    }
  }
};
</script>
