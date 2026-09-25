// 颜色主题：校验、可读性检查、生成 CSS 变量
import { contrast, suggest, MIN_CONTRAST } from './color.mjs';

export const COLOR_KEYS = ['bg', 'surface', 'surface2', 'border', 'borderStrong', 'text', 'text2', 'text3', 'primary', 'primaryHover', 'onPrimary', 'success', 'warning', 'danger'];

// 需要保证可读的「文字 / 底色」组合
export const READABLE_PAIRS = [
  ['text', 'bg', '正文 / 页面背景'],
  ['text', 'surface', '正文 / 内容底色'],
  ['text2', 'bg', '次要文字 / 页面背景'],
  ['text2', 'surface', '次要文字 / 内容底色'],
  ['text3', 'bg', '辅助文字 / 页面背景'],
  ['text3', 'surface', '辅助文字 / 内容底色'],
  ['onPrimary', 'primary', '按钮文字 / 主色'],
  ['primary', 'surface', '链接 / 内容底色'],
  ['success', 'surface', '成功 / 内容底色'],
  ['warning', 'surface', '警告 / 内容底色'],
  ['danger', 'surface', '危险 / 内容底色']
];

const cssVar = (k) => '--dp-' + k.replace(/[A-Z0-9]/g, (m) => '-' + m.toLowerCase());

export function validateTheme(theme) {
  const errors = [];
  for (const key of ['id', 'name', 'defaultMode']) if (!theme[key]) errors.push(`缺少 ${key}`);
  for (const mode of ['light', 'dark']) {
    for (const k of COLOR_KEYS) {
      const v = theme[mode]?.[k];
      if (!/^#[0-9A-Fa-f]{6}$/.test(v || '')) errors.push(`${mode}.${k} 不是 6 位十六进制颜色：${v}`);
    }
  }
  return errors;
}

/* 返回每个组合的对比度；不达标的附建议色 */
export function checkReadability(theme) {
  const out = [];
  for (const mode of ['light', 'dark']) {
    const c = theme[mode];
    for (const [fg, bg, label] of READABLE_PAIRS) {
      const ratio = contrast(c[fg], c[bg]);
      const ok = ratio >= MIN_CONTRAST;
      out.push({ mode, fg, bg, label, ratio: Math.round(ratio * 100) / 100, ok, suggestion: ok ? null : suggest(c[fg], c[bg]) });
    }
  }
  return out;
}

/* selector：项目中用 ':root'；演示页等多主题场景用 '[data-dp-theme="blue"]'。
   亮暗切换：在同一元素上设 data-dp-mode="light|dark"，或在祖先上加 .light / .dark 类；都不设时用主题默认模式。 */
export function themeToCss(theme, selector = ':root') {
  const lines = (mode) => COLOR_KEYS.map((k) => `  ${cssVar(k)}: ${theme[mode][k]};`).join('\n');
  const block = (sel, mode) => `${sel} {\n${lines(mode)}\n  color-scheme: ${mode};\n}`;
  const forced = (m) => (selector === ':root' ? `:root[data-dp-mode="${m}"], :root.${m}` : `${selector}[data-dp-mode="${m}"], .${m} ${selector}`);
  const def = theme.defaultMode;
  return [
    `/* design-pal 颜色主题：${theme.name}（${theme.id}）。由 themes/${theme.id}.json 生成，请勿手改。 */`,
    block(selector, def),
    block(forced('light'), 'light'),
    block(forced('dark'), 'dark'),
    ''
  ].join('\n\n');
}
