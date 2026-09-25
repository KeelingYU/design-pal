import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const lib = join(import.meta.dirname, '../../plugins/design-pal/libraries/efficiency');
const rules = readFileSync(join(lib, 'RULES.md'), 'utf8');

describe('组件库规则文档', () => {
  it('组件清单覆盖所有导出的 React 组件（新增组件忘记写进规则会失败）', () => {
    const index = readFileSync(join(lib, 'react/index.ts'), 'utf8');
    const names = [...index.matchAll(/export \{([^}]+)\}/g)].flatMap((m) => m[1].split(',')).map((s) => s.trim()).filter((s) => s && !s.startsWith('type '));
    const missing = names.filter((n) => !['cx'].includes(n) && !rules.includes('`' + n + '`'));
    expect(missing).toEqual([]);
  });

  it('包含已确认样稿中的全部交互规则', () => {
    for (const rule of ['查看详情不跳页', '可撤销的操作不弹确认', '不可撤销的操作才用对话框', '自动保存', '新建用对话框', '批量操作', '键盘优先']) expect(rules).toContain(rule);
  });

  it('规定了自查、定制保留与补组件的做法', () => {
    expect(rules).toContain('node design-pal/bin/check.mjs');
    expect(rules).toContain('design-pal/overrides.md');
    expect(rules).toMatch(/组件库里没有的组件怎么做/);
  });

  it('引用的配方文件都存在', () => {
    for (const m of rules.matchAll(/design-pal\/patterns\/(\w+\.tsx)/g)) expect(() => readFileSync(join(lib, 'patterns', m[1]))).not.toThrow();
  });
});
