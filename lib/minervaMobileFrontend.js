export const MINERVA_MOBILE_FRONTEND_DATA_KEY = 'thetreeMobileFrontend';
export const MINERVA_MOBILE_FRONTEND_SCHEMA = 'thetree-mobilefrontend/v1';
export const MINERVA_STANDALONE_MODE = 'desktop';
export const MINERVA_MOBILE_FRONTEND_MODE = 'mobile';

export function resolveMinervaMobileFrontendMode(pageData = {}) {
  const value = pageData?.[MINERVA_MOBILE_FRONTEND_DATA_KEY];
  if (
    value?.schema === MINERVA_MOBILE_FRONTEND_SCHEMA &&
    value?.mode === MINERVA_MOBILE_FRONTEND_MODE
  ) {
    return MINERVA_MOBILE_FRONTEND_MODE;
  }
  return MINERVA_STANDALONE_MODE;
}

export function hasMinervaMobileFrontend(context = {}) {
  return context.mobileFrontendMode === MINERVA_MOBILE_FRONTEND_MODE;
}
