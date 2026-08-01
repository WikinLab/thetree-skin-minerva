/*
 * the tree -> SkinLegacy.vue wrapper adapter.
 *
 * SkinLegacy.vue is the only remaining Vue wrapper around the generated
 * the generated shell. This helper keeps the tree-only wrapper inputs out of
 * the SFC template/computed body so the generated shell remains the owner of
 * the REL1_46 skin-legacy.mustache structure and this file owns only the
 * unavoidable Vue/the tree bridge values.
 */
import { getConfiguredString } from './legacyHostAdapterPolicy';
import { getLegacyPageContract } from './legacyPageContract';
import {
  getLegacyAccount,
  getLegacyDocument,
  getLegacyPageData,
  hasLegacyDocument,
  makeDocumentActionTarget,
  makeUserDocumentTarget
} from './legacyTheTreeAdapter';

export function makeSiteNoticeHtml(context = {}) {
  return getConfiguredString(context.config || {}, 'siteNoticeHtml', '');
}

export function makeUnreadUserDiscussionState(context = {}) {
  const session = context.session || {};
  const localConfig = context.localConfig || {};
  const account = getLegacyAccount(context);
  const accountName = account.name || account.username || '';
  const discussionKey = session.user_document_discuss || '';
  const isHidden = localConfig['wiki.hide_user_document_discuss'] === discussionKey;
  const hasUnreadUserDiscussion = !!discussionKey && !isHidden;

  return {
    hasUnreadUserDiscussion,
    userDiscussionKey: discussionKey,
    userDiscussionTarget: hasUnreadUserDiscussion && accountName
      ? makeDocumentActionTarget(context, makeUserDocumentTarget(context, accountName, account.type), 'discuss')
      : null
  };
}

export function makeAclMessageState(context = {}, pageContract = null) {
  const pageData = getLegacyPageData(context);
  const editAclMessageHtml = pageData.edit_acl_message || '';
  const document = getLegacyDocument(context);
  const requestable = pageData.editable === true && !!editAclMessageHtml && pageContract?.canRequestEdit !== false;

  return {
    editAclMessageHtml,
    requestable,
    editRequestTarget: requestable && document
      ? makeDocumentActionTarget(context, document, 'new_edit_request')
      : null
  };
}

export function makeSkinLegacyAdapterState(context = {}) {
  const pageContract = getLegacyPageContract(context);
  const unreadUserDiscussion = makeUnreadUserDiscussionState(context);
  const aclMessage = makeAclMessageState(context, pageContract);

  return {
    siteNoticeHtml: makeSiteNoticeHtml(context),
    hasDocument: hasLegacyDocument(context),
    ...unreadUserDiscussion,
    ...aclMessage
  };
}
