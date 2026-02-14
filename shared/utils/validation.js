/**
 * Validation utilities — shared between web and native.
 * Extracted from web/script.js
 */

/**
 * Validate hex color format (#RRGGBB)
 */
export const isValidHex = (hex) =>
  typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex);
