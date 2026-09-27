import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '../..');
const json = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));

describe('市场与插件清单', () => {
  const cc = json('.claude-plugin/marketplace.json');
  const cx = json('.agents/plugins/marketplace.json');
  const ccPlugin = json('plugins/design-pal/.claude-plugin/plugin.json');
  const cxPlugin = json('plugins/design-pal/plugin.json');

  it('两种 Agent 的市场名与插件名一致，安装命令相同', () => {
    expect(cc.name).toBe('design-pal');
    expect(cx.name).toBe(cc.name);
    expect(cc.plugins.map((p: any) => p.name)).toEqual(cx.plugins.map((p: any) => p.name));
    expect(ccPlugin.name).toBe(cc.plugins[0].name);
    expect(cxPlugin.name).toBe(ccPlugin.name);
  });

  it('两份插件清单版本号一致，保证两边更新同步', () => {
    expect(cxPlugin.version).toBe(ccPlugin.version);
  });

  it('市场条目指向的插件目录存在', () => {
    expect(existsSync(join(root, cc.plugins[0].source))).toBe(true);
    expect(existsSync(join(root, cx.plugins[0].source.path))).toBe(true);
  });

  it('公开的文件与文件夹名只用英文字符（内容可以是中文；过程文件不公开，不受此限）', () => {
    const tracked = execFileSync('git', ['-c', 'core.quotePath=false', 'ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
    expect(tracked.filter((p) => /[^\x20-\x7E]/.test(p))).toEqual([]);
  });

  it('使用技能的触发说明包含「查看 design-pal 组件库」', () => {
    const skill = readFileSync(join(root, 'plugins/design-pal/skills/design-pal/SKILL.md'), 'utf8');
    expect(skill).toMatch(/查看 design-pal 组件库/);
  });
});
