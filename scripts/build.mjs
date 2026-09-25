// 构建：由颜色主题 JSON 生成 CSS（后续步骤追加演示页、画廊构建）
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { themeToCss, validateTheme, checkReadability } from '../plugins/design-pal/bin/lib/theme.mjs';

const root = resolve(import.meta.dirname, '..');
export const LIB_ROOT = join(root, 'plugins/design-pal/libraries');

export function buildThemes({ write = true } = {}) {
  const outputs = [];
  for (const lib of readdirSync(LIB_ROOT)) {
    const dir = join(LIB_ROOT, lib, 'themes');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const theme = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const errors = validateTheme(theme);
      const bad = checkReadability(theme).filter((r) => !r.ok && !(theme.acceptedLowContrast || []).includes(`${r.mode}.${r.fg}/${r.bg}`));
      if (errors.length || bad.length) throw new Error(`${lib}/${f}：${[...errors, ...bad.map((b) => `${b.mode} ${b.label} ${b.ratio}:1 不足，建议 ${b.fg} 改为 ${b.suggestion}`)].join('；')}`);
      const file = join(LIB_ROOT, lib, 'styles/themes', f.replace('.json', '.css'));
      const css = themeToCss(theme);
      if (write) writeFileSync(file, css);
      outputs.push({ file, css });
    }
  }
  return outputs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = buildThemes();
  console.log(`已生成 ${out.length} 个颜色主题 CSS`);
}
