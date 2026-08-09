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
      <h1 id="firstHeading" :class="headingClassList">
        <template v-if="adapterContext.pageContract.canUseUserHeading">{{ headingText }}</template>
        <span v-else class="mw-page-title-main">{{ headingText }}</span>
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
        class="mw-body-content"
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
import { makeMinervaAdapterContext } from '../lib/minervaTheTreeAdapter';
import { makeMinervaSkinData } from '../lib/minervaSkinData';
import { makeMinervaHostState } from '../lib/minervaHostState';
import { createTheTreeSearchSuggestRuntime } from '../lib/adapters/thetree-search-suggest';
import { createMinervaSearchDialogRuntime } from '../lib/adapters/minerva-search-dialog';
import { createMinervaMobileSectionsRuntime } from '../lib/adapters/minerva-mobile-sections';
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
      return makeMinervaAdapterContext({
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
    headingText() {
      if (this.adapterContext.pageContract.canUseUserHeading) {
        return this.adapterContext.pageData.document?.title || this.pageTitle;
      }
      return this.pageTitle;
    },
    headingClassList() {
      return {
        firstHeading: true,
        'mw-first-heading': true,
        'mw-minerva-user-heading': this.adapterContext.pageContract.isUserPage
      };
    },
    skinAdapter() {
      return makeMinervaHostState(this.adapterContext);
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
      const settingsToggle = isSettingsToggleTarget(event?.target);
      if (settingsToggle) {
        event.preventDefault();
        event.stopPropagation();
        this.$vfm.show({ component: MinervaSettingModal });
        return;
      }
      if (event?.defaultPrevented) return;
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
        createSearchDialogRuntime: () => createMinervaSearchDialogRuntime({
          enabled: this.adapterContext.pageContract.hasMobileFrontend
        }),
        createSearchRuntime: ({ closeMobileSearch } = {}) => createTheTreeSearchSuggestRuntime({
          requestSuggestions: (query, signal) => this.internalRequest(
            `/Complete?q=${encodeURIComponent(query)}`,
            { signal, noProgress: true }
          ),
          navigateDocument: (title) => {
            closeMobileSearch?.();
            return this.$router.push(this.doc_action_link(title, 'w'));
          },
          navigateSearch: (query) => {
            closeMobileSearch?.();
            return this.$router.push({ path: '/Search', query: { q: query } });
          }
        }),
        createMobileSectionsRuntime: () => createMinervaMobileSectionsRuntime({
          enabled: this.adapterContext.pageContract.hasMobileFrontend
        }),
        toggleWatchstar: (href, watched) => this.toggleWatchstar(href, watched),
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
    },
    async toggleWatchstar(href, watched) {
      const response = await fetch(href, {
        method: 'GET',
        credentials: 'same-origin',
        redirect: 'follow',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (!response.ok) throw new Error(`Watchstar request failed: ${response.status}`);
      const pageData = this.$store.state.page?.data;
      if (pageData && typeof pageData.starred === 'boolean') pageData.starred = watched;
    }
  }
};
</script>
