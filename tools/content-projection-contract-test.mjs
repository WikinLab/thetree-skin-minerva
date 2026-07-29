#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  CONTENT_PROJECTION_PROTOCOL,
  CONTENT_PROJECTION_SERVER_DATA_KEY,
  insertContentProjectionPersonalTool,
  resolveContentProjectionPreference,
  serializeContentProjectionCookie
} from '../lib/adapters/thetree-content-projection.js';
import { RUNTIME_CAPABILITIES } from '../lib/runtime/capabilities.js';
import { createExtensionRuntimeHost } from '../lib/runtime/createExtensionRuntimeHost.js';

function contextWith(enabled) {
  return {
    config: { lang: 'ko' },
    viewData: {
      [CONTENT_PROJECTION_SERVER_DATA_KEY]: {
        protocol: CONTENT_PROJECTION_PROTOCOL,
        enabled
      }
    }
  };
}

assert.deepEqual(resolveContentProjectionPreference({}), {
  available: false,
  enabled: false,
  source: 'host-default'
});
assert.equal(resolveContentProjectionPreference(contextWith(true)).enabled, true);
assert.equal(resolveContentProjectionPreference(contextWith(false)).enabled, false);
assert.equal(resolveContentProjectionPreference({
  viewData: {
    [CONTENT_PROJECTION_SERVER_DATA_KEY]: {
      protocol: 'unknown',
      enabled: false
    }
  }
}).enabled, false);

assert.equal(insertContentProjectionPersonalTool([], {}).length, 0);
assert.equal(insertContentProjectionPersonalTool([], contextWith(true))[0].label, '스킨 본문 끄기');
assert.equal(insertContentProjectionPersonalTool([], contextWith(false))[0].label, '스킨 본문 켜기');
assert.match(serializeContentProjectionCookie(false), /thetree_vector_content_projection=off/);
assert.match(serializeContentProjectionCookie(true, { secure: true }), /; Secure$/);

let extensionCreates = 0;
let extensionInits = 0;
let extensionDestroys = 0;
const extensionHost = createExtensionRuntimeHost([{
  id: 'mediawiki-popups',
  requires: [RUNTIME_CAPABILITIES.MEDIAWIKI_CONTENT_SURFACE],
  create() {
    extensionCreates += 1;
    return {
      init() { extensionInits += 1; },
      destroy() { extensionDestroys += 1; }
    };
  }
}]);
assert.deepEqual(extensionHost.init([]), []);
assert.equal(extensionCreates, 0);
assert.deepEqual(
  extensionHost.init([RUNTIME_CAPABILITIES.MEDIAWIKI_CONTENT_SURFACE]),
  ['mediawiki-popups']
);
assert.equal(extensionCreates, 1);
assert.equal(extensionInits, 1);
extensionHost.destroy();
assert.equal(extensionDestroys, 1);

console.log('checked optional content projection preference contract');
