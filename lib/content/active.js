/*
 * Build-selected content profile entrypoint.
 *
 * Shared shell code imports only this module. A future Lite distribution can
 * replace this one static entrypoint and omit lib/content/full from its
 * source/build inventory. Shared compilers may remain when an extension uses
 * them independently of the page-content profile.
 */

import { FULL_CONTENT_PROFILE } from './full';

export const ACTIVE_CONTENT_PROFILE = FULL_CONTENT_PROFILE;
export default ACTIVE_CONTENT_PROFILE;
