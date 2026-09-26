import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeRepo } from './helpers';
import { applyToProject } from '../../plugins/design-pal/bin/lib/apply.mjs';

const repoRoot = join(import.meta.dirname, '../..');
const pluginRoot = join(repoRoot, 'plugins/design-pal');
const git = (dir: string, ...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
const read = (dir: string, p: string) => readFileSync(join(dir, p), 'utf8');
const apply = (dir: string, themeId = 'blue') => applyToProject({ projectDir: dir, pluginRoot, libId: 'efficiency', themeId, install: false, today: '2026-09-25' });
const errorOf = (fn: () => unknown) => { try { fn(); } catch (e: any) { return e; } throw new Error('应当报错'); };

describe('dp apply：空项目', () => {
  const dir = makeRepo({ 'README.md': '# demo\n' });
  const r = apply(dir);

  it('搭好 React 基础工程并放入组件、样式、字体、规则、演示页', () => {
    expect(r.kind).toMatch(/新建基础工程/);
    for (const p of ['package.json', 'index.html', 'src/main.tsx', 'src/App.tsx', 'src/design-pal/components/Button.tsx', 'src/design-pal/components/index.ts', 'src/design-pal/styles/index.css', 'src/design-pal/styles/theme.css', 'src/design-pal/fonts/inter-latin.woff2', 'design-pal/RULES.md', 'design-pal/demo.html', 'design-pal/reference.html', 'design-pal/patterns/ProjectList.tsx', 'design-pal/bin/check.mjs', 'design-pal/overrides.md'])
      expect(existsSync(join(dir, p)), p).toBe(true);
  });

  it('选定的颜色主题写入项目，并记录在 lock 中', () => {
    expect(read(dir, 'src/design-pal/styles/theme.css')).toContain('商务蓝');
    expect(JSON.parse(read(dir, 'design-pal/lock.json'))).toMatchObject({ library: 'efficiency', version: '1.0.0', theme: 'blue', kind: 'react', uiDir: 'src/design-pal' });
  });

  it('保存原版副本（升级合并用），与放入项目的文件一致', () => {
    expect(read(dir, 'design-pal/baseline/src/design-pal/components/Button.tsx')).toBe(read(dir, 'src/design-pal/components/Button.tsx'));
    expect(existsSync(join(dir, 'design-pal/baseline/design-pal/RULES.md'))).toBe(true);
  });

  it('写入项目规则：AGENTS.md 含 design-pal 段，CLAUDE.md 引用 AGENTS.md', () => {
    expect(read(dir, 'AGENTS.md')).toMatch(/design-pal:start[\s\S]*效率型组件库 v1\.0\.0[\s\S]*商务蓝[\s\S]*design-pal:end/);
    expect(read(dir, 'CLAUDE.md')).toBe('@AGENTS.md\n');
  });

  it('基础工程的外壳符合规则：顶栏有命令面板入口（⌘K）与头像', () => {
    const app = read(dir, 'src/App.tsx');
    for (const k of ['<CommandPalette', 'onCommand=', '<Avatar', "'mod+k'"]) expect(app).toContain(k);
  });

  it('配方代码的引用路径指向项目内组件目录', () => {
    expect(read(dir, 'design-pal/patterns/ProjectList.tsx')).toContain("from '../../src/design-pal/components'");
  });

  it('再次应用会被拒绝', () => {
    git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', 'applied');
    expect(errorOf(() => apply(dir)).code).toBe('ALREADY_APPLIED');
  });

  it('基础工程能通过类型检查与构建，且自查通过', () => {
    symlinkSync(join(repoRoot, 'node_modules'), join(dir, 'node_modules'));
    execFileSync(process.execPath, [join(repoRoot, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', '.'], { cwd: dir, stdio: 'pipe' });
    execFileSync(process.execPath, [join(repoRoot, 'node_modules/vite/bin/vite.js'), 'build', '--logLevel', 'error'], { cwd: dir, stdio: 'pipe' });
    expect(existsSync(join(dir, 'dist/index.html'))).toBe(true);
    const out = execFileSync(process.execPath, ['design-pal/bin/check.mjs'], { cwd: dir, encoding: 'utf8' });
    expect(out).toContain('自查通过');
  }, 60000);
});

describe('dp apply：还没有代码、只有文档与工具配置的项目按空项目处理', () => {
  it('有需求文档目录、隐藏配置目录时仍搭 React 基础工程', () => {
    const dir = makeRepo({ 'README.md': '# demo\n', 'AGENTS.md': '# 规则\n', 'docs/PRD.md': '# PRD\n', '.claude/settings.json': '{}', '.vscode/settings.json': '{}', '.trial/log': 'x', 'notes.txt': 'x' });
    const r = apply(dir);
    expect(r.kind).toMatch(/新建基础工程/);
    expect(existsSync(join(dir, 'src/design-pal/components/Button.tsx'))).toBe(true);
    expect(read(dir, 'docs/PRD.md')).toBe('# PRD\n');
  });

  it('已有网页文件的项目不当作空项目', () => {
    const dir = makeRepo({ 'README.md': '# demo\n', 'index.html': '<!doctype html>\n' });
    expect(apply(dir).kind).not.toMatch(/新建基础工程/);
    expect(existsSync(join(dir, 'src/main.tsx'))).toBe(false);
  });
});

describe('dp apply：已有 React 项目（只追加、不覆盖）', () => {
  const dir = makeRepo({
    'package.json': JSON.stringify({ name: 'shop', dependencies: { react: '^19.0.0', 'lucide-react': '^1.0.0' } }, null, 2),
    'src/main.tsx': "import React from 'react';\nconsole.log('app');\n",
    'AGENTS.md': '# 项目规则\n\n已有内容。\n',
    'CLAUDE.md': '# 我的偏好\n'
  });
  const r = apply(dir, 'cyan');

  it('补装缺失依赖，已有依赖保持原版本', () => {
    const pkg = JSON.parse(read(dir, 'package.json'));
    expect(pkg.dependencies['lucide-react']).toBe('^1.0.0');
    expect(pkg.dependencies['@radix-ui/react-dialog']).toBeTruthy();
    expect(pkg.dependencies.react).toBe('^19.0.0');
  });

  it('在入口文件顶部追加样式引入，原内容不变', () => {
    const main = read(dir, 'src/main.tsx');
    expect(main.split('\n')[0]).toBe("import './design-pal/styles/index.css'; // design-pal");
    expect(main).toContain("import React from 'react';\nconsole.log('app');");
  });

  it('AGENTS.md 与 CLAUDE.md 保留原内容并追加', () => {
    expect(read(dir, 'AGENTS.md')).toMatch(/^# 项目规则\n\n已有内容。\n\n<!-- design-pal:start/);
    expect(read(dir, 'CLAUDE.md')).toMatch(/^# 我的偏好\n[\s\S]*\n@AGENTS\.md\n$/);
    expect(r.modified).toEqual(['AGENTS.md', 'CLAUDE.md', 'package.json', 'src/main.tsx']);
  });

  it('提示把根元素加上 dp-app', () => {
    expect(r.todos.join('')).toContain('dp-app');
  });
});

describe('dp apply：非 React 项目', () => {
  const dir = makeRepo({ 'package.json': JSON.stringify({ name: 'v', dependencies: { vue: '^3.5.0' } }), 'src/main.ts': 'console.log(1)\n' });
  const r = apply(dir);
  it('只放入通用样式、字体、规则与结构参考，不放 React 组件', () => {
    expect(r.kind).toBe('other');
    expect(existsSync(join(dir, 'src/design-pal/styles/components.css'))).toBe(true);
    expect(existsSync(join(dir, 'src/design-pal/components'))).toBe(false);
    expect(existsSync(join(dir, 'design-pal/patterns'))).toBe(false);
    expect(read(dir, 'AGENTS.md')).toContain('reference.html');
    expect(JSON.parse(read(dir, 'package.json')).dependencies).toEqual({ vue: '^3.5.0' });
  });
});

describe('dp apply：保护措施', () => {
  it('目标文件已存在时停止，一个文件都不写', () => {
    const dir = makeRepo({ 'package.json': JSON.stringify({ dependencies: { react: '^19.0.0' } }), 'src/design-pal/components/Button.tsx': 'export const mine = 1;\n' });
    const e = errorOf(() => apply(dir));
    expect(e.code).toBe('CONFLICT');
    expect(e.detail).toContain('src/design-pal/components/Button.tsx');
    expect(git(dir, 'status', '--porcelain')).toBe('');
    expect(read(dir, 'src/design-pal/components/Button.tsx')).toBe('export const mine = 1;\n');
  });

  it('不是 Git 仓库时停止', () => {
    const dir = makeRepo({}, { init: false });
    expect(errorOf(() => apply(dir)).code).toBe('NOT_GIT');
  });

  it('有未提交改动时停止', () => {
    const dir = makeRepo({ 'a.txt': '1' });
    writeFileSync(join(dir, 'a.txt'), '2');
    expect(errorOf(() => apply(dir)).code).toBe('DIRTY');
    expect(existsSync(join(dir, 'design-pal'))).toBe(false);
  });

  it('颜色主题不存在时停止并列出可选项', () => {
    const e = errorOf(() => apply(makeRepo({}), 'pink'));
    expect(e.code).toBe('NO_THEME');
    expect(e.message).toContain('blue（商务蓝）');
  });
});

describe('自查与差异', () => {
  const dir = makeRepo({ 'README.md': '' });
  apply(dir);
  git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', 'applied');
  writeFileSync(join(dir, 'src/Bad.tsx'), [
    "import { Button } from 'antd';",
    "// 注释里的 #fff 不算",
    "export const A = () => <div style={{ color: '#fff' }} className=\"bg-blue-500 text-[#333]\">",
    "  <a href=\"#list\">链接</a><select></select>",
    "  <span style={{ background: 'rgb(0,0,0)' }} /> {/* dp-allow 品牌色要求 */}",
    "  <i style={{ color: '#abc' }} /> // dp-allow 品牌色",
    "</div>;"
  ].join('\n'));
  writeFileSync(join(dir, 'src/design-pal/components/Extra.tsx'), "export const x = '#123456';\n");

  const run = (...args: string[]) => {
    try { return { code: 0, out: execFileSync(process.execPath, ['design-pal/bin/check.mjs', ...args], { cwd: dir, encoding: 'utf8' }) }; }
    catch (e: any) { return { code: e.status, out: e.stdout as string }; }
  };

  it('找出写死颜色、Tailwind 默认色板、任意值颜色、原生下拉、其他组件库；忽略注释、锚点、dp-allow 与组件库目录', () => {
    const { code, out } = run('--json');
    const problems = JSON.parse(out);
    expect(code).toBe(1);
    const rules = problems.map((p: any) => `${p.line}:${p.rule}`).sort();
    expect(rules).toEqual(['1:其他 UI 组件库', '3:Tailwind 默认色板', '3:任意值颜色', '3:写死颜色', '4:绕开组件库的原生控件'].sort());
    expect(problems.every((p: any) => p.file === 'src/Bad.tsx')).toBe(true);
  });

  it('--diff 列出相对原版的改动（用于核对定制记录）', () => {
    writeFileSync(join(dir, 'src/design-pal/styles/tokens.css'), read(dir, 'src/design-pal/styles/tokens.css').replace('--dp-r-md: 6px', '--dp-r-md: 0px'));
    const { out } = run('--diff', '--json');
    expect(JSON.parse(out)).toEqual([{ file: 'src/design-pal/styles/tokens.css', change: '已修改' }]);
  });
});
