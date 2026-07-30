/* Orthogonal content-rendering modes shared by every skin variant. */

export const CONTENT_MODE_NATIVE = 'native';
export const CONTENT_MODE_PROJECTED = 'projected';

export function contentModeUsesProjection(mode) {
  return mode === CONTENT_MODE_PROJECTED;
}
