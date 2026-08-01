<template>
  <SkinOrigin
    :data="skinData"
    :intercept-events="['submit']"
    @submit="submitSearch"
    @click="onSkinClick($event)"
  >
    <template #html-minerva-user-menu>
      <ToggleListOrigin v-if="personalMenuData" :data="personalMenuData" />
    </template>

    <template #html-title-heading>
      <h1 id="firstHeading" class="firstHeading mw-first-heading">
        <span class="mw-page-title-main">{{ pageTitle }}</span>
      </h1>
    </template>

    <template #html-user-message>
      <div v-if="hasUnreadUserDiscussion" class="usermessage minerva-anon-talk-message">
        현재 진행 중인 <nuxt-link :to="userDiscussionTarget">사용자 토론</nuxt-link>이 있습니다.
        <button
          type="button"
          class="tt-usermessage-close"
          aria-label="사용자 토론 알림 닫기"
          @click="dismissUserDiscussion"
        >×</button>
      </div>

      <alert v-if="isShowACLMessage && editAclMessageHtml" error closable @close="isShowACLMessage = false">
        <span v-html="editAclMessageHtml"></span>
        <span v-if="requestable"><br>대신 <nuxt-link :to="editRequestTarget">편집 요청</nuxt-link>을 생성할 수 있습니다.</span>
      </alert>
    </template>

    <template #html-body-content>
      <div
        id="mw-content-text"
        key="mw-content-text"
        data-tt-host-content="1"
        :data-tt-host-content-name="adapterContext.pageContract.hostContentName || null"
      >
        <slot />
      </div>
    </template>

    <template #html-categories>
      <RawHtmlFragment :html="skinData['html-categories'] || ''" />
    </template>

    <template #html-after-content>
      <slot name="after-content" />
    </template>
  </SkinOrigin>
</template>

<script>
import Common from '~/mixins/common';
import Alert from '~/components/alert';

import SkinOrigin from './skin.vue';
import ToggleListOrigin from './ToggleList/ToggleList.vue';
import RawHtmlFragment from '../lib/legacyRawHtmlFragment';
import MinervaSettingModal from './MinervaSettingModal';
import { makeTheTreeAdapterContext } from '../lib/legacyTheTreeAdapter';
import { makeMinervaSkinData } from '../lib/minervaSkinData';
import { makeSkinLegacyAdapterState } from '../lib/legacySkinAdapter';
import { isMinervaThemeToggleTarget, toggleTheTreeMinervaTheme } from '../lib/adapters/minerva-theme';
import { createTheTreeSearchSuggestRuntime } from '../lib/adapters/thetree-search-suggest';
import { isSettingsToggleTarget } from '../lib/adapters/thetree-settings';
import { createMinervaRuntimeController } from '../lib/runtime/createMinervaRuntimeController';

export default {
  name: 'SkinMinerva',
  mixins: [Common],
  components: {
    Alert,
    RawHtmlFragment,
    SkinOrigin,
    ToggleListOrigin
  },
  data() {
    return {
      isShowACLMessage: true,
      minervaRuntimeController: null
    };
  },
  computed: {
    adapterContext() {
      return makeTheTreeAdapterContext({
        storeState: this.$store.state,
        route: this.$route,
        linkBuilders: {
          documentAction: (document, action, query) => this.doc_action_link(document, action, query),
          userDocument: (name, type) => this.user_doc(name, type),
          contribution: (uuid) => this.contribution_link(uuid),
          href: (target) => this.resolveHref(target)
        }
      });
    },
    skinData() {
      return makeMinervaSkinData(this.adapterContext);
    },
    personalMenuData() {
      return this.skinData['html-minerva-user-menu'];
    },
    pageTitle() {
      return this.skinData['page-title'] || '';
    },
    skinAdapter() {
      return makeSkinLegacyAdapterState(this.adapterContext);
    },
    hasUnreadUserDiscussion() {
      return this.skinAdapter.hasUnreadUserDiscussion;
    },
    userDiscussionTarget() {
      return this.skinAdapter.userDiscussionTarget;
    },
    editAclMessageHtml() {
      return this.skinAdapter.editAclMessageHtml;
    },
    requestable() {
      return this.skinAdapter.requestable;
    },
    editRequestTarget() {
      return this.skinAdapter.editRequestTarget;
    }
  },
  watch: {
    $route() {
      this.isShowACLMessage = true;
      this.resetMinervaRuntime();
    },
    skinData() {
      this.resetMinervaRuntime();
    }
  },
  mounted() {
    this.initMinervaRuntime();
  },
  beforeDestroy() {
    this.teardownMinervaRuntime();
  },
  beforeUnmount() {
    this.teardownMinervaRuntime();
  },
  methods: {
    resolveHref(target) {
      if (typeof target === 'string') return target;
      try {
        return this.$router.resolve(target).href;
      } catch (error) {
        return '#';
      }
    },
    onSkinClick(event) {
      const themeToggle = isMinervaThemeToggleTarget(event?.target);
      if (themeToggle) {
        event.preventDefault();
        event.stopPropagation();
        toggleTheTreeMinervaTheme(this.$store.state);
        return;
      }
      const settingsToggle = isSettingsToggleTarget(event?.target);
      if (settingsToggle) {
        event.preventDefault();
        event.stopPropagation();
        this.$vfm.show({ component: MinervaSettingModal });
        return;
      }
      this.onDynamicContentClick(event);
    },
    dismissUserDiscussion() {
      const value = this.skinAdapter.userDiscussionKey;
      if (!value) return;
      if (typeof this.$store.commit === 'function') {
        this.$store.commit('localConfigSetValue', {
          key: 'wiki.hide_user_document_discuss',
          value
        });
      } else if (typeof this.$store.state.localConfigSetValue === 'function') {
        this.$store.state.localConfigSetValue('wiki.hide_user_document_discuss', value);
      }
    },
    submitSearch(event) {
      event.preventDefault();
      const input = event.target?.elements?.search;
      const query = String(input?.value || '').trim();
      if (!query) {
        input?.focus?.();
        return;
      }
      this.$router.push({ path: '/Search', query: { q: query } });
    },
    ensureMinervaRuntimeController() {
      if (this.minervaRuntimeController) return this.minervaRuntimeController;
      this.minervaRuntimeController = createMinervaRuntimeController({
        createSearchRuntime: () => createTheTreeSearchSuggestRuntime({
          requestSuggestions: (query, signal) => this.internalRequest(
            `/Complete?q=${encodeURIComponent(query)}`,
            { signal, noProgress: true }
          ),
          navigateDocument: (title) => this.$router.push(this.doc_action_link(title, 'w')),
          navigateSearch: (query) => this.$router.push({ path: '/Search', query: { q: query } })
        }),
        schedule: (callback) => this.$nextTick(callback)
      });
      return this.minervaRuntimeController;
    },
    initMinervaRuntime() {
      this.ensureMinervaRuntimeController().init();
    },
    teardownMinervaRuntime() {
      this.minervaRuntimeController?.destroy();
      this.minervaRuntimeController = null;
    },
    resetMinervaRuntime() {
      this.ensureMinervaRuntimeController().reset();
    }
  }
};
</script>
