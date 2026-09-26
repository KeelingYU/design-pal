import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyToProject } from '../../plugins/design-pal/bin/lib/apply.mjs';
import { runTheme, runUpgrade } from '../../plugins/design-pal/bin/lib/update.mjs';
import { makeRepo, temps } from './helpers';

const git = (dir: string, ...a: string[]) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' });
const read = (dir: string, p: string) => readFileSync(join(dir, p), 'utf8');
const commit = (dir: string, m = 'c') => { git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', m); };
const errorOf = (fn: () => unknown) => { try { fn(); } catch (e: any) { return e; } throw new Error('应当报错'); };

/** 复制一份插件，便于模拟「组件库发布了新版本」 */
function pluginCopy() {
  const d = mkdtempSync(join(tmpdir(), 'dp-plugin-'));
  temps.push(d);
  cpSync(join(import.meta.dirname, '../../plugins/design-pal'), d, { recursive: true });
  return d;
}
function releaseV110(plugin: string) {
  const lib = join(plugin, 'libraries/efficiency');
  const meta = JSON.parse(read(lib, 'library.json'));
  meta.version = '1.1.0';
  meta.changelog.unshift({ version: '1.1.0', date: '2026-10-01', notes: '中圆角由 6px 调为 5px；按钮加粗。' });
  writeFileSync(join(lib, 'library.json'), JSON.stringify(meta, null, 2));
  writeFileSync(join(lib, 'styles/tokens.css'), read(lib, 'styles/tokens.css').replace('--dp-r-md: 6px', '--dp-r-md: 5px'));
  writeFileSync(join(lib, 'react/Button.tsx'), read(lib, 'react/Button.tsx').replace("/** 按钮。", "/** 按钮（v1.1）。"));
}
function setup() {
  const plugin = pluginCopy();
  const dir = makeRepo({ 'README.md': '' });
  applyToProject({ projectDir: dir, pluginRoot: plugin, libId: 'efficiency', themeId: 'blue', install: false });
  commit(dir, 'apply');
  return { plugin, dir };
}

describe('dp upgrade：升级组件库', () => {
  it('版本相同时提示已是最新；不带 --apply 只给计划不写入', () => {
    const { plugin, dir } = setup();
    expect((runUpgrade as any)({ projectDir: dir, pluginRoot: plugin }).status).toBe('up-to-date');
    releaseV110(plugin);
    const plan = (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin });
    expect(plan.status).toBe('plan');
    expect(plan.message).toContain('v1.0.0 → v1.1.0');
    expect(plan.message).toContain('中圆角由 6px 调为 5px');
    expect(plan.updated).toEqual(expect.arrayContaining(['src/design-pal/styles/tokens.css', 'src/design-pal/components/Button.tsx']));
    expect(git(dir, 'status', '--porcelain')).toBe('');
  });

  it('项目未定制：升级后文件、原版副本、版本记录、项目规则同步更新', () => {
    const { plugin, dir } = setup();
    releaseV110(plugin);
    const r = (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin, apply: true });
    expect(r.status).toBe('done');
    expect(read(dir, 'src/design-pal/styles/tokens.css')).toContain('--dp-r-md: 5px');
    expect(read(dir, 'design-pal/baseline/src/design-pal/styles/tokens.css')).toContain('--dp-r-md: 5px');
    expect(JSON.parse(read(dir, 'design-pal/lock.json')).version).toBe('1.1.0');
    expect(read(dir, 'AGENTS.md')).toContain('效率型组件库 v1.1.0');
  });

  it('定制与新版改动不在同一处：自动合并，两边改动都保留', () => {
    const { plugin, dir } = setup();
    writeFileSync(join(dir, 'src/design-pal/components/Button.tsx'), read(dir, 'src/design-pal/components/Button.tsx') + '\n// 项目定制：按钮埋点\n');
    commit(dir, 'custom');
    releaseV110(plugin);
    const r = (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin, apply: true });
    expect(r.status).toBe('done');
    const btn = read(dir, 'src/design-pal/components/Button.tsx');
    expect(btn).toContain('按钮（v1.1）');
    expect(btn).toContain('项目定制：按钮埋点');
  });

  it('定制与新版冲突：本次不写入任何文件、不更新版本；逐条选择后才执行', () => {
    const { plugin, dir } = setup();
    const tokens = 'src/design-pal/styles/tokens.css';
    writeFileSync(join(dir, tokens), read(dir, tokens).replace('--dp-r-md: 6px', '--dp-r-md: 0px'));
    commit(dir, 'custom radius');
    releaseV110(plugin);

    const c = (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin, apply: true });
    expect(c.status).toBe('conflicts');
    expect(c.conflicts.map((x: any) => x.file)).toEqual([tokens]);
    expect(c.conflicts[0].library).toContain('--dp-r-md: 5px');
    expect(c.conflicts[0].project).toContain('--dp-r-md: 0px');
    expect(git(dir, 'status', '--porcelain')).toBe('');
    expect(JSON.parse(read(dir, 'design-pal/lock.json')).version).toBe('1.0.0');

    const ok = (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin, apply: true, resolutions: [`${tokens}=ours`] });
    expect(ok.status).toBe('done');
    expect(read(dir, tokens)).toContain('--dp-r-md: 0px');                 // 保留定制
    expect(read(dir, 'src/design-pal/components/Button.tsx')).toContain('按钮（v1.1）'); // 其他改动照常更新
    expect(read(dir, `design-pal/baseline/${tokens}`)).toContain('--dp-r-md: 5px'); // 原版副本更新为新版
    expect(JSON.parse(read(dir, 'design-pal/lock.json')).version).toBe('1.1.0');
  });

  it('冲突选择「跟随新版」时采用新版内容', () => {
    const { plugin, dir } = setup();
    const tokens = 'src/design-pal/styles/tokens.css';
    writeFileSync(join(dir, tokens), read(dir, tokens).replace('--dp-r-md: 6px', '--dp-r-md: 0px'));
    commit(dir);
    releaseV110(plugin);
    (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin, apply: true, resolutions: [`${tokens}=theirs`] });
    expect(read(dir, tokens)).toContain('--dp-r-md: 5px');
  });

  describe('同一文件里既有冲突处也有不冲突的改动：选择只作用于冲突处', () => {
    const css = 'src/design-pal/styles/components.css';
    const BTN = 'padding: 0 12px; border-radius: var(--dp-r-md);';
    const TD = '.dp-table td { height: var(--dp-h-row); padding: 0 12px;';
    function prepare() {
      const { plugin, dir } = setup();
      // 项目：按钮改直角（与新版同一行），文件末尾另加一处定制
      writeFileSync(join(dir, css), read(dir, css).replace(BTN, 'padding: 0 12px; border-radius: 0;') + '\n/* 项目定制：打印时隐藏侧栏 */\n');
      commit(dir, 'custom');
      releaseV110(plugin);
      // 新版：同一行的按钮留白加宽，另一处表格留白加宽
      const lib = join(plugin, 'libraries/efficiency/styles/components.css');
      writeFileSync(lib, read(lib, '').replace(BTN, 'padding: 0 14px; border-radius: var(--dp-r-md);').replace(TD, '.dp-table td { height: var(--dp-h-row); padding: 0 16px;'));
      return { plugin, dir };
    }

    it('冲突只列出冲突的那几行；计划中说明有定制卷入冲突', () => {
      const { plugin, dir } = prepare();
      const c = (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin });
      expect(c.status).toBe('conflicts');
      const x = c.conflicts.find((y: any) => y.file === css);
      expect(x.library).toContain('padding: 0 14px');
      expect(x.project).toContain('border-radius: 0');
      expect(x.library + x.project).not.toContain('.dp-table td');
      expect(c.message).toMatch(/冲突/);
    });

    it('保留我的定制：冲突处保留直角，新版的其他改进照常更新，其他定制也保留', () => {
      const { plugin, dir } = prepare();
      const r = (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin, apply: true, resolutions: [`${css}=ours`] });
      expect(r.status).toBe('done');
      const out = read(dir, css);
      expect(out).toContain('padding: 0 12px; border-radius: 0;');
      expect(out).toContain('.dp-table td { height: var(--dp-h-row); padding: 0 16px;');
      expect(out).toContain('项目定制：打印时隐藏侧栏');
    });

    it('跟随新版：冲突处用新版，与冲突无关的项目定制仍保留', () => {
      const { plugin, dir } = prepare();
      (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin, apply: true, resolutions: [`${css}=theirs`] });
      const out = read(dir, css);
      expect(out).toContain('padding: 0 14px; border-radius: var(--dp-r-md);');
      expect(out).toContain('.dp-table td { height: var(--dp-h-row); padding: 0 16px;');
      expect(out).toContain('项目定制：打印时隐藏侧栏');
    });
  });

  it('未存档、非 Git、降级时停止', () => {
    const { plugin, dir } = setup();
    releaseV110(plugin);
    writeFileSync(join(dir, 'README.md'), 'x');
    expect(errorOf(() => (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin })).code).toBe('DIRTY');
    commit(dir);
    const lock = JSON.parse(read(dir, 'design-pal/lock.json'));
    writeFileSync(join(dir, 'design-pal/lock.json'), JSON.stringify({ ...lock, version: '2.0.0' }));
    commit(dir);
    expect(errorOf(() => (runUpgrade as any)({ projectDir: dir, pluginRoot: plugin })).code).toBe('DOWNGRADE');
    const noGit = makeRepo({}, { init: false });
    expect(errorOf(() => (runUpgrade as any)({ projectDir: noGit, pluginRoot: plugin })).code).toBe('NOT_GIT');
  });
});

describe('dp theme：换颜色主题', () => {
  it('切换后配色文件、版本记录、项目规则同步更新，其他文件不变', () => {
    const { plugin, dir } = setup();
    const before = read(dir, 'src/design-pal/styles/components.css');
    const r = (runTheme as any)({ projectDir: dir, pluginRoot: plugin, themeId: 'cyan' });
    expect(r.status).toBe('done');
    expect(read(dir, 'src/design-pal/styles/theme.css')).toContain('极客青');
    expect(read(dir, 'design-pal/baseline/src/design-pal/styles/theme.css')).toContain('极客青');
    expect(JSON.parse(read(dir, 'design-pal/lock.json')).theme).toBe('cyan');
    expect(read(dir, 'AGENTS.md')).toContain('颜色主题 **极客青**');
    expect(read(dir, 'src/design-pal/styles/components.css')).toBe(before);
    expect(git(dir, 'status', '--porcelain').split('\n').filter(Boolean).map((l) => l.slice(3)).sort()).toEqual(['AGENTS.md', 'design-pal/baseline/src/design-pal/styles/theme.css', 'design-pal/lock.json', 'src/design-pal/styles/theme.css']);
  });

  it('颜色文件被定制过时停止，用户同意放弃定制后才切换', () => {
    const { plugin, dir } = setup();
    const theme = 'src/design-pal/styles/theme.css';
    writeFileSync(join(dir, theme), read(dir, theme).replace('#2563EB', '#1E40AF'));
    commit(dir);
    const e = errorOf(() => (runTheme as any)({ projectDir: dir, pluginRoot: plugin, themeId: 'cyan' }));
    expect(e.code).toBe('THEME_CUSTOMIZED');
    expect(git(dir, 'status', '--porcelain')).toBe('');
    expect((runTheme as any)({ projectDir: dir, pluginRoot: plugin, themeId: 'cyan', force: true }).status).toBe('done');
  });

  it('未存档时停止；与当前相同时无需切换', () => {
    const { plugin, dir } = setup();
    expect((runTheme as any)({ projectDir: dir, pluginRoot: plugin, themeId: 'blue' }).status).toBe('unchanged');
    writeFileSync(join(dir, 'README.md'), 'x');
    expect(errorOf(() => (runTheme as any)({ projectDir: dir, pluginRoot: plugin, themeId: 'cyan' })).code).toBe('DIRTY');
  });
});
