import { getMinervaPageContract } from './minervaPageContract.js';
import {
  getMinervaAccount,
  getMinervaDocument,
  getMinervaPageData,
  makeMinervaDocumentActionTarget,
  makeMinervaUserDocumentTarget
} from './minervaTheTreeAdapter.js';

export function makeMinervaHostState(context = {}) {
  const contract = getMinervaPageContract(context);
  const data = getMinervaPageData(context);
  const account = getMinervaAccount(context);
  const accountName = account.name || account.username || '';
  const discussionKey = context.session?.user_document_discuss || '';
  const hiddenKey = context.localConfig?.['wiki.hide_user_document_discuss'];
  const hasUnreadUserDiscussion = !!discussionKey && discussionKey !== hiddenKey;
  const document = getMinervaDocument(context);
  const editAclMessageHtml = data.edit_acl_message || '';
  const requestable = data.editable === true && !!editAclMessageHtml && contract.canRequestEdit;
  return Object.freeze({
    hasUnreadUserDiscussion,
    userDiscussionKey: discussionKey,
    userDiscussionTarget: hasUnreadUserDiscussion && accountName
      ? makeMinervaDocumentActionTarget(
        context,
        makeMinervaUserDocumentTarget(context, accountName, account.type),
        'discuss'
      )
      : null,
    editAclMessageHtml,
    requestable,
    editRequestTarget: requestable && document
      ? makeMinervaDocumentActionTarget(context, document, 'new_edit_request')
      : null
  });
}
