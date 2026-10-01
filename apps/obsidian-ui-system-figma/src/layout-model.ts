/** Historical layout identifiers remain readable so existing exported ZIPs still import. */
export const CURRENT_LAYOUT_MODEL = 'mapping-layout-probes-2';
export const LEGACY_LAYOUT_MODEL = 'atlas-layout-probes-2';

export function isTypographyLayoutModel(value: unknown): boolean {
  return value === CURRENT_LAYOUT_MODEL || value === LEGACY_LAYOUT_MODEL;
}

export function isSupportedButtonLayoutModel(value: unknown): boolean {
  return isTypographyLayoutModel(value) || value === 'atlas-layout-probes-1';
}
