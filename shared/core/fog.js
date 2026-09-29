export const visualStatus = (distM, visibilityM) =>
  distM > visibilityM ? 'BEYOND_VISUAL_RANGE' : 'WITHIN_VISUAL_RANGE';
