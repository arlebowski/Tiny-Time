/**
 * color-mix(in srgb, colorA p%, colorB) equivalent for React Native
 * Returns hex string of blended color. Handles 6 or 8 char hex.
 */
export function colorMix(colorA, colorB, percentA = 50) {
  const p = Math.max(0, Math.min(100, percentA)) / 100;
  const parse = (hex) => {
    if (!hex || typeof hex !== 'string') return { r: 245, g: 245, b: 247 };
    const h = hex.replace('#', '').slice(0, 6);
    if (h.length !== 6) return { r: 245, g: 245, b: 247 };
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r: isNaN(r) ? 245 : r, g: isNaN(g) ? 245 : g, b: isNaN(b) ? 247 : b };
  };
  const a = parse(colorA);
  const b = parse(colorB);
  const r = Math.round(a.r * p + b.r * (1 - p));
  const g = Math.round(a.g * p + b.g * (1 - p));
  const bl = Math.round(a.b * p + b.b * (1 - p));
  return '#' + [r, g, bl].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
}
