// 把组件库应用到项目：先完整规划、检查冲突，确认无冲突后才写入；只新增文件或追加内容，不覆盖已有文件
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { DpError, assertCleanGit, detectProject } from './project.mjs';

export const META_DIR = 'design-pal';
const START = '<!-- design-pal:start';
const END = '<!-- design-pal:end -->';
const read = (p) => readFileSync(p);
const readText = (p) => readFileSync(p, 'utf8');
const posix = (p) => p.split('\\').join('/');
const relImport = (fromDir, to) => { const r = posix(relative(fromDir, to)); return r.startsWith('.') ? r : './' + r; };

export function loadLibrary(pluginRoot, libId) {
  const dir = join(pluginRoot, 'libraries', libId);
  if (!existsSync(join(dir, 'library.json'))) throw new DpError('NO_LIBRARY', `找不到组件库「${libId}」。`);
  const meta = JSON.parse(readText(join(dir, 'library.json')));
  const themes = meta.colorThemes.map((id) => JSON.parse(readText(join(dir, 'themes', id + '.json'))));
  return { dir, meta, themes };
}

/** 组件库自有的文件（会进入 baseline，升级时参与三方合并）。返回 { 项目内相对路径: 内容 } */
export function libraryFiles(lib, themeId, kind, uiDir) {
  const files = {};
  const add = (to, content) => { files[posix(to)] = content; };
  const { dir } = lib;
  const ls = (d) => (existsSync(d) ? readdirSync(d).filter((f) => !f.startsWith('.')) : []);
  add(`${uiDir}/styles/tokens.css`, read(join(dir, 'styles/tokens.css')));
  add(`${uiDir}/styles/components.css`, read(join(dir, 'styles/components.css')));
  add(`${uiDir}/styles/theme.css`, read(join(dir, 'styles/themes', themeId + '.css')));
  add(`${uiDir}/styles/index.css`, '/* design-pal 样式入口（由 design-pal 生成） */\n@import "./tokens.css";\n@import "./theme.css";\n@import "./components.css";\n');
  for (const f of ls(join(dir, 'fonts'))) add(`${uiDir}/fonts/${f}`, read(join(dir, 'fonts', f)));
  const rules = readText(join(dir, 'RULES.md')).split('src/design-pal/').join(uiDir + '/');
  add(`${META_DIR}/RULES.md`, rules);
  add(`${META_DIR}/demo.html`, read(join(dir, 'demo.html')));
  add(`${META_DIR}/reference.html`, read(join(dir, 'reference.html')));
  if (kind !== 'other') {
    for (const f of ls(join(dir, 'react'))) add(`${uiDir}/components/${f}`, read(join(dir, 'react', f)));
    const imp = relImport(`${META_DIR}/patterns`, `${uiDir}/components`);
    for (const f of ls(join(dir, 'patterns'))) add(`${META_DIR}/patterns/${f}`, readText(join(dir, 'patterns', f)).split("from '../react'").join(`from '${imp}'`));
  }
  return files;
}

export function agentsBlock(pluginRoot, lib, theme, kind, uiDir) {
  const tpl = readText(join(pluginRoot, 'bin/templates/agents-block.md'));
  const react = kind !== 'other';
  return tpl
    .replaceAll('{{libraryName}}', lib.meta.name)
    .replaceAll('{{version}}', lib.meta.version)
    .replaceAll('{{themeName}}', theme.name)
    .replaceAll('{{componentsHint}}', react ? `组件在 \`${uiDir}/components/\`，从其 index.ts 引入` : `本项目不是 React：按 \`design-pal/reference.html\` 的结构和类名编写，样式在 \`${uiDir}/styles/\``)
    .replaceAll('{{referenceHint}}', react ? '每个组件的 HTML 结构见 `design-pal/reference.html`。' : '非 React 项目按 RULES.md 第 10 节执行，交互需自行实现，行为以演示页为准。');
}

/** 在文本中写入/替换 design-pal 标记段 */
export function upsertBlock(text, block) {
  const s = text.indexOf(START), e = text.indexOf(END);
  if (s >= 0 && e > s) return text.slice(0, s) + block.trimEnd() + text.slice(e + END.length);
  return (text.trimEnd() ? text.trimEnd() + '\n\n' : '') + block.trimEnd() + '\n';
}

function scaffold(projectName, lib) {
  const pkg = {
    name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'app',
    private: true,
    type: 'module',
    scripts: { dev: 'vite', build: 'tsc --noEmit && vite build', preview: 'vite preview' },
    dependencies: { react: '^19.3.0', 'react-dom': '^19.3.0', ...lib.meta.reactDependencies },
    devDependencies: { vite: '^8.3.1', '@vitejs/plugin-react': '^6.1.1', typescript: '^7.0.2', '@types/react': '^19.3.0', '@types/react-dom': '^19.3.0' }
  };
  return {
    'package.json': JSON.stringify(pkg, null, 2) + '\n',
    'index.html': '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>App</title>\n</head>\n<body>\n<div id="root"></div>\n<script type="module" src="/src/main.tsx"></script>\n</body>\n</html>\n',
    'vite.config.ts': "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({ plugins: [react()] });\n",
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true, types: ['vite/client'] }, include: ['src'] }, null, 2) + '\n',
    'src/main.tsx': "import './design-pal/styles/index.css';\nimport { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { ToastProvider, TooltipProvider } from './design-pal/components';\nimport { App } from './App';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <TooltipProvider>\n      <ToastProvider>\n        <App />\n      </ToastProvider>\n    </TooltipProvider>\n  </StrictMode>\n);\n",
    'src/App.tsx': "import { LayoutGrid } from 'lucide-react';\nimport { AppShell, EmptyState, PageHead, Sidebar, Topbar, Breadcrumb } from './design-pal/components';\n\nexport function App() {\n  return (\n    <div className=\"dp-app\" style={{ height: '100vh' }}>\n      <AppShell\n        style={{ height: '100%' }}\n        sidebar={<Sidebar brand={{ mark: 'A', name: 'App' }} rail={false} onToggleRail={() => {}} current=\"home\" items={[{ key: 'home', icon: <LayoutGrid className=\"dp-icon\" />, label: '首页' }]} />}\n        topbar={<Topbar left={<Breadcrumb items={[{ label: '首页' }]} />} />}\n      >\n        <div className=\"dp-content-main\">\n          <PageHead title=\"首页\" />\n          <EmptyState icon={<LayoutGrid className=\"dp-icon-lg\" />} title=\"从这里开始\" description=\"对 Agent 说出你要的页面，它会按 design-pal 组件库来做。\" />\n        </div>\n      </AppShell>\n    </div>\n  );\n}\n"
  };
}

/**
 * 应用组件库。返回 { kind, uiDir, created, modified, todos }。
 * options: { projectDir, pluginRoot, libId, themeId, install = true, today }
 */
export function applyToProject({ projectDir, pluginRoot, libId, themeId, install = true, today = new Date().toISOString().slice(0, 10) }) {
  assertCleanGit(projectDir);
  if (existsSync(join(projectDir, META_DIR, 'lock.json'))) throw new DpError('ALREADY_APPLIED', '这个项目已经应用过 design-pal。换颜色主题请用 theme，升级请用 upgrade。');
  const lib = loadLibrary(pluginRoot, libId);
  const theme = lib.themes.find((t) => t.id === themeId);
  if (!theme) throw new DpError('NO_THEME', `组件库「${lib.meta.name}」没有颜色主题「${themeId}」。可选：${lib.themes.map((t) => `${t.id}（${t.name}）`).join('、')}`);
  const info = detectProject(projectDir);
  const { kind, uiDir } = info;

  // 1. 规划新增文件
  const owned = libraryFiles(lib, themeId, kind, uiDir);
  const created = { ...(kind === 'empty' ? scaffold(basename(projectDir), lib) : {}), ...owned };
  for (const [p, c] of Object.entries(owned)) created[`${META_DIR}/baseline/${p}`] = c;
  created[`${META_DIR}/overrides.md`] = readText(join(pluginRoot, 'bin/templates/overrides.md'));
  created[`${META_DIR}/bin/check.mjs`] = read(join(pluginRoot, 'bin/check.mjs'));
  created[`${META_DIR}/lock.json`] = JSON.stringify({ library: libId, version: lib.meta.version, theme: themeId, kind: kind === 'empty' ? 'react' : kind, uiDir, appliedAt: today, updatedAt: today }, null, 2) + '\n';

  // 2. 冲突检查：任何目标文件已存在就停止，一个文件都不写
  const conflicts = Object.keys(created).filter((p) => existsSync(join(projectDir, p)));
  if (conflicts.length) throw new DpError('CONFLICT', '项目中已有同名文件，为避免覆盖，本次没有写入任何文件。', conflicts);

  // 3. 规划追加修改
  const modified = {};
  const todos = [];
  const text = (p) => (existsSync(join(projectDir, p)) ? readText(join(projectDir, p)) : null);
  if (kind === 'react') {
    const pkg = JSON.parse(text('package.json'));
    const missing = Object.entries(lib.meta.reactDependencies).filter(([n]) => !(pkg.dependencies?.[n] || pkg.devDependencies?.[n]));
    if (missing.length) { pkg.dependencies = { ...pkg.dependencies, ...Object.fromEntries(missing) }; modified['package.json'] = JSON.stringify(pkg, null, 2) + '\n'; }
    if (info.entry) {
      const src = text(info.entry);
      const imp = `import '${relImport(dirname(info.entry), `${uiDir}/styles/index.css`)}'; // design-pal`;
      if (!src.includes('design-pal/styles/index.css')) modified[info.entry] = imp + '\n' + src;
    } else todos.push(`没有找到应用入口文件，请在入口处引入 ${uiDir}/styles/index.css。`);
    todos.push('给应用最外层元素加上 class="dp-app"（字体、底色、文字颜色由它提供），登录后的页面放进 AppShell 外壳（见 design-pal/RULES.md 第 2 节）。');
  }
  if (kind === 'other') todos.push(`在页面入口引入 ${uiDir}/styles/index.css，并给最外层元素加上 class="dp-app"。交互按 design-pal/reference.html 与 RULES.md 第 10 节实现。`);
  if (kind === 'empty' && text('.gitignore') !== null && !/node_modules/.test(text('.gitignore'))) modified['.gitignore'] = text('.gitignore').trimEnd() + '\nnode_modules/\ndist/\n';
  if (kind === 'empty' && text('.gitignore') === null) created['.gitignore'] = 'node_modules/\ndist/\n';
  const agents = upsertBlock(text('AGENTS.md') || '', agentsBlock(pluginRoot, lib, theme, kind, uiDir));
  if (text('AGENTS.md') === null) created['AGENTS.md'] = agents; else modified['AGENTS.md'] = agents;
  const claude = text('CLAUDE.md');
  if (claude === null) created['CLAUDE.md'] = '@AGENTS.md\n';
  else if (!/^@AGENTS\.md\s*$/m.test(claude)) modified['CLAUDE.md'] = claude.trimEnd() + '\n\n<!-- design-pal：让 Claude Code 读取 AGENTS.md 中的规则 -->\n@AGENTS.md\n';

  // 4. 写入
  for (const [p, c] of Object.entries({ ...created, ...modified })) {
    const abs = join(projectDir, p);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, c);
  }
  if (install && kind !== 'other') {
    try { execFileSync(info.pm, ['install'], { cwd: projectDir, stdio: 'pipe' }); }
    catch (e) { todos.push(`依赖安装失败，请在项目中运行 ${info.pm} install。原因：${String(e.stderr || e.message).split('\n').slice(-3).join(' ')}`); }
  }
  return {
    kind: kind === 'empty' ? 'react（新建基础工程）' : kind,
    uiDir,
    library: `${lib.meta.name} v${lib.meta.version}`,
    theme: theme.name,
    created: Object.keys(created).filter((p) => !p.startsWith(`${META_DIR}/baseline/`)).sort(),
    baselineFiles: Object.keys(owned).length,
    modified: Object.keys(modified).sort(),
    todos
  };
}
