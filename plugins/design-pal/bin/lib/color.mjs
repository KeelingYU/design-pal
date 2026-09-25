// 颜色工具：对比度计算与达标建议色（WCAG 2 相对亮度算法）
export const MIN_CONTRAST = 4.5;

const hexToRgb = (hex) => {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/* 在保持色相的前提下，把前景色逐步往黑或白方向调，直到与背景对比度达标；返回最接近原色的达标颜色 */
export function suggest(fg, bg, target = MIN_CONTRAST) {
  if (contrast(fg, bg) >= target) return fg.toUpperCase();
  const src = hexToRgb(fg);
  const toward = luminance(bg) > 0.18 ? [0, 0, 0] : [255, 255, 255];
  for (let t = 0.02; t <= 1; t += 0.02) {
    const c = rgbToHex(src.map((v, i) => v + (toward[i] - v) * t));
    if (contrast(c, bg) >= target) return c;
  }
  return rgbToHex(toward);
}
