<template>
  <SkinLegacyOrigin
    :data="skinData"
    :intercept-events="['submit']"
    @submit="submitSearch"
    @click="onSkinClick($event)"
  >
    <template #html-site-notice>
      <div v-if="siteNoticeHtml" id="siteNotice" class="mw-body-content">
        <div id="localNotice">
          <span v-html="siteNoticeHtml"></span>
        </div>
      </div>
    </template>

    <template #html-title-heading>
      <RawHtmlFragment v-if="titleHeadingHtml" :html="titleHeadingHtml" />
      <h1 v-else id="firstHeading" class="firstHeading mw-first-heading">
        <span class="mw-page-title-main">{{ pageTitle }}</span>
      </h1>
    </template>

    <template #html-user-message>
      <div v-if="hasUnreadUserDiscussion" class="usermessage">
        현재 진행 중인 <nuxt-link :to="userDiscussionTarget">사용자 토론</nuxt-link>이 있습니다.
      </div>

      <alert v-if="isShowACLMessage && editAclMessageHtml" error closable @close="isShowACLMessage = false">
        <span v-html="editAclMessageHtml"></span>
        <span v-if="requestable"><br>대신 <nuxt-link :to="editRequestTarget">편집 요청</nuxt-link>을 생성할 수 있습니다.</span>
      </alert>
    </template>

    <template #html-body-content>
      <div
        id="mw-content-text"
        ref="contentText"
        key="mw-content-text"
        :class="contentTextClassList"
        data-tt-host-content="1"
        :data-tt-vector-surface="rootSurface.type"
        :data-tt-vector-surface-role="rootSurface.role"
        :data-tt-vector-interface-surface="isInterfaceSurface ? rootSurface.upstreamSurface : null"
        :data-tt-vector-interface-archetype="isInterfaceSurface ? rootSurface.archetype : null"
        :data-tt-vector-interface-equivalence="isInterfaceSurface ? featureEquivalence : null"
        :data-tt-vector-page-contract="adapterContext.pageContract.featureMappingId"
        :data-tt-host-content-name="adapterContext.pageContract.hostContentName || null"
        :data-tt-content-profile="contentProfile.id"
      >
        <slot />
      </div>
    </template>

    <template #html-categories>
      <div
        v-if="legacyCategoryData.hasCategories"
        id="catlinks"
        class="catlinks"
        data-mw="interface"
        data-tt-vector-category-slot="1"
        data-tt-vector-catlinks-surface="1"
      >
        <div id="mw-normal-catlinks" class="mw-normal-catlinks">
          <span class="mw-catlinks-label">분류</span>:
          <ul>
            <li
              v-for="category in legacyCategoryData.items"
              :key="category.id"
              :class="category.itemClasses"
            >
              <nuxt-link :to="category.to" :class="category.linkClasses">{{ category.text }}</nuxt-link>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #html-after-content>
      <slot name="after-content" />
    </template>
  </SkinLegacyOrigin>
</template>

<script>
import Common from '~/mixins/common';
import Alert from '~/components/alert';

import SkinLegacyOrigin from './skin-legacy.vue';
import RawHtmlFragment from '../lib/legacyRawHtmlFragment';
import { getLegacyDocument, makeTheTreeAdapterContext, makeViewItems } from '../lib/legacyTheTreeAdapter';
import { makeSkinLegacyData } from '../lib/legacySkinData';
import { buildLegacyTitleHeadingData } from '../lib/legacyTitleData';
import { getSearchModeFromSubmitEvent, makeSearchSubmitTargetForContext } from '../lib/legacySearchSubmit';
import { makeSkinLegacyAdapterState } from '../lib/legacySkinAdapter';
import { makeTheTreePopupsRuntimeData } from '../lib/adapters/thetree-popups/data';
import { createSkinRuntimeController } from '../lib/runtime/createSkinRuntimeController';
import { isDarkModeToggleTarget, toggleTheTreeDarkMode } from '../lib/adapters/mediawiki-darkmode';

export default {
  name: 'SkinLegacy',
  mixins: [Common],
  props: {
    contentProfile: {
      type: Object,
      required: true
    }
  },
  components: {
    Alert,
    RawHtmlFragment,
    SkinLegacyOrigin
  },
  data() {
    return {
      isShowACLMessage: true,
      legacySkinRuntimeController: null
    };
  },
  computed: {
    adapterContext() {
      return makeTheTreeAdapterContext({
        storeState: this.$store.state,
        route: this.$route,
        linkBuilders: {
          documentAction: (document, action) => this.doc_action_link(document, action),
          userDocument: (name) => this.user_doc(name),
          contribution: (uuid) => this.contribution_link(uuid)
        }
      });
    },
    skinData() {
      return makeSkinLegacyData(this.adapterContext);
    },
    titleData() {
      return buildLegacyTitleHeadingData(this.adapterContext.page, this.adapterContext.pageContract);
    },
    titleHeadingHtml() {
      return this.skinData['html-title-heading'] || '';
    },
    pageTitle() {
      return this.titleData['page-title'] || '';
    },
    projectionContract() {
      return this.contentSurface.projection;
    },
    contentSurface() {
      return this.contentProfile.resolveSurface(this.adapterContext);
    },
    rootSurface() {
      return this.projectionContract.root;
    },
    isInterfaceSurface() {
      return this.contentSurface.isInterface;
    },
    featureEquivalence() {
      return this.contentSurface.featureEquivalence;
    },
    contentDirectionClass() {
      const direction = this.adapterContext.config?.dir || this.adapterContext.config?.['wiki.dir'] || 'ltr';
      return direction === 'rtl' ? 'mw-content-rtl' : 'mw-content-ltr';
    },
    contentTextClassList() {
      return {
        'mw-body-content': true,
        [this.contentDirectionClass]: true,
        'wiki-article': this.contentSurface.isArticle
      };
    },
    skinAdapter() {
      return makeSkinLegacyAdapterState(this.adapterContext);
    },
    legacyCategoryData() {
      return this.contentProfile.makeCategoryData(this.adapterContext);
    },
    theTreePopupsRuntimeData() {
      return makeTheTreePopupsRuntimeData(this.adapterContext);
    },
    siteNoticeHtml() {
      return this.skinAdapter.siteNoticeHtml;
    },
    document() {
      return getLegacyDocument(this.adapterContext);
    },
    baseViewItems() {
      return makeViewItems(this.adapterContext);
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
      this.resetLegacySkinRuntime();
    },
    document() {
      this.resetLegacySkinRuntime();
    },
    baseViewItems() {
      this.resetLegacySkinRuntime();
    }
  },
  mounted() {
    this.initLegacySkinRuntime();
  },
  beforeDestroy() {
    this.teardownLegacySkinRuntime();
  },
  beforeUnmount() {
    this.teardownLegacySkinRuntime();
  },
  methods: {
    onSkinClick(event) {
      const toggle = isDarkModeToggleTarget(event && event.target);
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        toggleTheTreeDarkMode(this.$store.state);
        return;
      }
      this.onDynamicContentClick(event);
    },
    submitSearch(event) {
      const form = event && event.target;
      const input = form && form.elements && form.elements.search;
      const q = String((input && input.value) || '').trim();
      if (!q) {
        if (input && typeof input.focus === 'function') {
          input.focus();
        }
        return;
      }

      const mode = getSearchModeFromSubmitEvent(event);
      const target = makeSearchSubmitTargetForContext(q, mode, this.adapterContext);
      this.$router.push(target);
    },
    makeContentRuntimeOptions() {
      const config = this.$store.state.config || {};
      return {
        getRoot: () => this.$refs.contentText || null,
        getProjectionContract: () => this.contentSurface.projection,
        lang: config.lang || config['wiki.lang'] || 'ko',
        config,
        messages: config.mediaWikiMessages || config.mediawikiMessages || config.messages || null
      };
    },
    requestTheTreePageData(path, { signal } = {}) {
      return this.internalRequest(path, {
        signal,
        noProgress: true
      });
    },
    makePopupsRuntimeOptions() {
      return {
        theTreeHostCapabilities: {
          requestPageData: (path, requestOptions) => this.requestTheTreePageData(path, requestOptions)
        },
        theTreeSettings: {
          getLocalConfig: () => {
            const state = this.$store.state;
            if (state.localConfigInitialized) return state.localConfig || {};
            try {
              return JSON.parse(window.localStorage.getItem('thetree_settings')) || {};
            } catch (error) {
              return state.localConfig || {};
            }
          },
          setLocalConfigValue: (key, value) => {
            this.$store.state.localConfigSetValue(key, value);
          }
        }
      };
    },
    ensureLegacySkinRuntimeController() {
      if (this.legacySkinRuntimeController) return this.legacySkinRuntimeController;
      this.legacySkinRuntimeController = createSkinRuntimeController({
        createContentRuntime: (optionsSource) => this.contentProfile.createMountedRuntime(optionsSource),
        getContentRuntimeOptions: () => this.makeContentRuntimeOptions(),
        getPopupsData: () => this.theTreePopupsRuntimeData,
        getPopupsOptions: () => this.makePopupsRuntimeOptions(),
        schedule: (callback) => this.$nextTick(callback)
      });
      return this.legacySkinRuntimeController;
    },
    initLegacySkinRuntime() {
      this.ensureLegacySkinRuntimeController().init();
    },
    teardownLegacySkinRuntime() {
      if (this.legacySkinRuntimeController) {
        this.legacySkinRuntimeController.destroy();
      }
      this.legacySkinRuntimeController = null;
    },
    resetLegacySkinRuntime() {
      this.ensureLegacySkinRuntimeController().reset();
    }
  }
};
</script>
