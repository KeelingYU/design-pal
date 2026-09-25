import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { contrast, suggest, MIN_CONTRAST } from '../../plugins/design-pal/bin/lib/color.mjs';
import { COLOR_KEYS, checkReadability, themeToCss, validateTheme } from '../../plugins/design-pal/bin/lib/theme.mjs';
import { buildThemes, LIB_ROOT } from '../../scripts/build.mjs';

const themes = readdirSync(LIB_ROOT).flatMap((lib) =>
  readdirSync(join(LIB_ROOT, lib, 'themes')).map((f) => ({ lib, theme: JSON.parse(readFileSync(join(LIB_ROOT, lib, 'themes', f), 'utf8')) }))
);

describe('对比度计算', () => {
  it('黑白对比度为 21:1，同色为 1:1', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrast('#2563EB', '#2563EB')).toBeCloseTo(1, 5);
  });

  it('不达标的浅灰文字会得到达标的建议色（白底往深调、深底往浅调）', () => {
    const onWhite = suggest('#C4C8CE', '#FFFFFF');
    expect(contrast(onWhite, '#FFFFFF')).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(contrast(onWhite, '#000000')).toBeLessThan(contrast('#C4C8CE', '#000000'));
    const onDark = suggest('#3E444C', '#111827');
    expect(contrast(onDark, '#111827')).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  it('已达标的颜色原样返回', () => {
    expect(suggest('#101828', '#FFFFFF')).toBe('#101828');
  });
});

describe('组件库自带的颜色主题', () => {
  it('至少包含商务蓝与极客青', () => {
    expect(themes.map((t) => t.theme.id)).toEqual(expect.arrayContaining(['blue', 'cyan']));
  });

  for (const { lib, theme } of themes) {
    it(`${lib}/${theme.name}：格式完整，亮暗两种模式所有文字组合 ≥ 4.5:1`, () => {
      expect(validateTheme(theme)).toEqual([]);
      const bad = checkReadability(theme).filter((r) => !r.ok);
      expect(bad).toEqual([]);
    });
  }

  it('模拟用户坚持保留浅灰辅助文字：检查报出问题并给出建议色', () => {
    const t = structuredClone(themes[0].theme);
    t.light.text3 = '#C4C8CE';
    const bad = checkReadability(t).filter((r) => !r.ok);
    expect(bad.length).toBeGreaterThan(0);
    for (const b of bad) expect(contrast(b.suggestion, t.light[b.bg])).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });
});

describe('生成颜色主题 CSS', () => {
  const theme = themes.find((t) => t.theme.id === 'cyan')!.theme;

  it('默认、强制亮色、强制暗色三段都包含全部 14 个颜色变量', () => {
    const css = themeToCss(theme);
    const blocks = css.split('}').filter((b) => b.includes('{'));
    expect(blocks).toHaveLength(3);
    for (const b of blocks) expect(b.match(/--dp-[a-z0-9-]+:/g)).toHaveLength(COLOR_KEYS.length);
  });

  it('极客青默认暗色：未指定模式时使用暗色配色', () => {
    const first = themeToCss(theme).split('}')[0];
    expect(first).toContain(`--dp-bg: ${theme.dark.bg}`);
    expect(first).toContain('color-scheme: dark');
  });

  it('多主题场景可限定作用范围', () => {
    expect(themeToCss(theme, '[data-dp-theme="cyan"]')).toContain('[data-dp-theme="cyan"][data-dp-mode="light"]');
  });

  it('仓库中的主题 CSS 与 JSON 同步（改了 JSON 忘记构建会失败）', () => {
    for (const { file, css } of buildThemes({ write: false })) expect(readFileSync(file, 'utf8')).toBe(css);
  });
});
