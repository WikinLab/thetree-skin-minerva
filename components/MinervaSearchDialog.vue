<!--
  Host-adapted port of locked MediaWiki enableSearchDialog.js,
  TypeaheadSearchWrapper.vue and App.vue.
  The dialog structure remains MediaWiki-owned; only request and navigation are
  supplied by the tree through function props.
  SPDX-License-Identifier: GPL-2.0-or-later
  Modified: 2026-08-10
-->
<template>
  <div
    v-if="open"
    class="cdx-dialog skin-dialog-search tt-minerva-search-dialog"
    role="dialog"
    aria-modal="true"
    aria-label="검색"
  >
    <div class="cdx-dialog__header">
      <div>
        <button
          ref="closeButton"
          type="button"
          class="cdx-button cdx-button--weight-quiet cdx-button--icon-only tt-minerva-search-dialog__back"
          aria-label="검색 닫기"
          @click="$emit('close')"
        ><span class="tt-minerva-search-dialog__back-icon" aria-hidden="true"></span></button>
        <form class="cdx-typeahead-search skin-typeahead-search" role="search" @submit.prevent="submit">
          <div class="cdx-search-input">
            <div class="cdx-search-input__input-wrapper">
              <div class="cdx-text-input cdx-text-input--has-start-icon">
                <input
                  ref="input"
                  v-model="query"
                  class="cdx-text-input__input"
                  type="search"
                  name="search"
                  autocomplete="off"
                  autocapitalize="none"
                  spellcheck="false"
                  :placeholder="`${siteName} 검색`"
                  :aria-label="`${siteName} 검색`"
                  aria-autocomplete="list"
                  :aria-expanded="query ? 'true' : 'false'"
                  @input="schedule"
                  @keydown.esc.prevent="$emit('close')"
                >
                <span class="cdx-text-input__icon cdx-text-input__start-icon"></span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    <div class="cdx-dialog__body">
      <ul v-if="query" class="cdx-menu__listbox" role="listbox" aria-label="검색 결과">
        <li
          v-for="title in suggestions"
          :key="title"
          class="cdx-menu-item cdx-menu-item--enabled cdx-menu-item--bold-label"
          role="option"
        >
          <button type="button" class="cdx-menu-item__content" @click="$emit('navigate-document', title)">
            <span class="cdx-menu-item__text"><span class="cdx-menu-item__text__label"><bdi>{{ title }}</bdi></span></span>
          </button>
        </li>
        <li class="cdx-menu-item cdx-menu-item--enabled" role="option">
          <button type="button" class="cdx-menu-item__content cdx-typeahead-search__search-footer" @click="submit">
            <span class="cdx-menu-item__text"><strong>{{ query }}</strong> 항목이 포함된 글을 검색</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { normalizeTheTreeSuggestions } from '../lib/adapters/thetree-search-suggest.js';

export default {
  name: 'MinervaSearchDialog',
  props: {
    open: { type: Boolean, default: false },
    siteName: { type: String, default: 'the tree' },
    initialQuery: { type: String, default: '' },
    requestSuggestions: { type: Function, required: true }
  },
  data() {
    return { query: '', suggestions: [], timer: null, controller: null, generation: 0 };
  },
  watch: {
    open(value) {
      if (value) this.activate();
      else this.deactivate();
    }
  },
  mounted() {
    if (this.open) this.activate();
  },
  beforeDestroy() {
    this.deactivate();
  },
  beforeUnmount() {
    this.deactivate();
  },
  methods: {
    activate() {
      this.query = this.initialQuery;
      document.body?.classList.add('tt-minerva-search-dialog-open', 'cdx-dialog-open');
      this.$nextTick(() => this.$refs.input?.focus?.());
      if (this.query) this.schedule();
    },
    deactivate() {
      this.generation += 1;
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = null;
      this.controller?.abort?.();
      this.controller = null;
      this.suggestions = [];
      document.body?.classList.remove('tt-minerva-search-dialog-open', 'cdx-dialog-open');
    },
    schedule() {
      if (this.timer !== null) clearTimeout(this.timer);
      const query = this.query.replace(/^\s+/, '');
      this.query = query;
      if (!query) {
        this.suggestions = [];
        return;
      }
      const generation = ++this.generation;
      this.timer = setTimeout(() => this.load(query, generation), 50);
    },
    async load(query, generation) {
      this.controller?.abort?.();
      this.controller = typeof AbortController === 'undefined' ? null : new AbortController();
      try {
        const value = await this.requestSuggestions(query, this.controller?.signal);
        if (generation === this.generation && query === this.query) {
          this.suggestions = normalizeTheTreeSuggestions(value, 10);
        }
      } catch (error) {
        if (error?.name !== 'AbortError' && generation === this.generation) this.suggestions = [];
      }
    },
    submit() {
      const query = this.query.trim();
      if (query) this.$emit('navigate-search', query);
      else this.$refs.input?.focus?.();
    }
  }
};
</script>

<style>
.tt-minerva-search-dialog {
  background: var(--background-color-base, #fff);
  box-sizing: border-box;
  inset: 0;
  max-height: none;
  max-width: none;
  position: fixed;
  width: 100%;
  z-index: 1000;
}
.tt-minerva-search-dialog .cdx-dialog__header {
  background-color: var(--background-color-interactive, #eaecf0);
  padding: 0;
}
.tt-minerva-search-dialog .cdx-dialog__header > div {
  align-items: center;
  box-sizing: border-box;
  display: flex;
  height: 55px;
  padding: 0 8px;
}
.tt-minerva-search-dialog .skin-typeahead-search { flex-grow: 1; }
.tt-minerva-search-dialog__back { flex: 0 0 44px; }
.tt-minerva-search-dialog__back-icon {
  border-bottom: 2px solid currentColor;
  border-left: 2px solid currentColor;
  display: block;
  height: 14px;
  margin-left: 5px;
  transform: rotate(45deg);
  width: 14px;
}
.tt-minerva-search-dialog .cdx-dialog__body {
  bottom: 0;
  left: 0;
  overflow-y: auto;
  position: absolute;
  right: 0;
  top: 55px;
}
.tt-minerva-search-dialog .cdx-menu__listbox { margin: 0; padding: 0; }
.tt-minerva-search-dialog .cdx-menu-item { margin: 0; }
.tt-minerva-search-dialog .cdx-menu-item__content {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  text-align: start;
  width: 100%;
}
</style>
