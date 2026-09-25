// 构建：颜色主题 CSS → 演示页（单文件 HTML）→ 画廊（后续步骤）
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { themeToCss, validateTheme, checkReadability } from '../plugins/design-pal/bin/lib/theme.mjs';
import { galleryHtml } from './gallery-template.mjs';

const root = resolve(import.meta.dirname, '..');
export const LIB_ROOT = join(root, 'plugins/design-pal/libraries');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

export function loadThemes(lib) {
  const dir = join(LIB_ROOT, lib, 'themes');
  const meta = readJson(join(LIB_ROOT, lib, 'library.json'));
  return meta.colorThemes.map((id) => readJson(join(dir, id + '.json')));
}

function assertTheme(lib, theme) {
  const errors = validateTheme(theme);
  const accepted = theme.acceptedLowContrast || [];
  const bad = checkReadability(theme).filter((r) => !r.ok && !accepted.includes(`${r.mode}.${r.fg}/${r.bg}`));
  if (errors.length || bad.length) throw new Error(`${lib}/${theme.id}：${[...errors, ...bad.map((b) => `${b.mode} ${b.label} ${b.ratio}:1 不足，建议 ${b.fg} 改为 ${b.suggestion}`)].join('；')}`);
}

export function buildThemes({ write = true } = {}) {
  const outputs = [];
  for (const lib of readdirSync(LIB_ROOT)) {
    for (const theme of loadThemes(lib)) {
      assertTheme(lib, theme);
      const file = join(LIB_ROOT, lib, 'styles/themes', theme.id + '.css');
      const css = themeToCss(theme);
      if (write) writeFileSync(file, css);
      outputs.push({ file, css });
    }
  }
  return outputs;
}

/* 演示页：extraThemes 用于设计草稿（带 draft: true），outFile 默认写入组件库目录 */
export async function buildDemo(lib = 'efficiency', { extraThemes = [], outFile } = {}) {
  const { build } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  const { viteSingleFile } = await import('vite-plugin-singlefile');
  const meta = readJson(join(LIB_ROOT, lib, 'library.json'));
  const themes = [...loadThemes(lib), ...extraThemes];
  themes.forEach((t) => assertTheme(lib, t));
  const gen = join(root, 'src/generated');
  mkdirSync(gen, { recursive: true });
  const { id, name, en, version, summary, fitFor, fitDesc, traits } = meta;
  writeFileSync(join(gen, 'demo-data.json'), JSON.stringify({ library: { id, name, en, version, summary, fitFor, fitDesc, traits }, themes }, null, 2));
  writeFileSync(join(gen, 'themes.css'), themes.map((t) => themeToCss(t, `[data-dp-theme="${t.id}"]`)).join('\n'));
  const outDir = join(root, 'node_modules/.dp-build/demo');
  await build({ root: join(root, 'src/demo'), logLevel: 'warn', plugins: [react(), viteSingleFile()], build: { outDir, emptyOutDir: true } });
  const target = outFile || join(LIB_ROOT, lib, 'demo.html');
  if (existsSync(target)) rmSync(target);
  renameSync(join(outDir, 'index.html'), target);
  return target;
}

/* 标准结构参考：用 React 组件渲染出静态 HTML（与演示页同源），供非 React 项目照写 */
export async function buildReference(lib = 'efficiency') {
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  const server = await createServer({ root, logLevel: 'error', plugins: [react()], server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { EXAMPLES } = await server.ssrLoadModule('/src/reference/examples.tsx');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement } = await import('react');
    const { TooltipProvider } = await server.ssrLoadModule(`/plugins/design-pal/libraries/${lib}/react/index.ts`);
    const meta = readJson(join(LIB_ROOT, lib, 'library.json'));
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let group = '';
    const body = EXAMPLES.map((ex) => {
      const html = renderToStaticMarkup(createElement(TooltipProvider, null, ex.node));
      const head = ex.group !== group ? `<h2 class="dp-h2 ref-group">${(group = ex.group)}</h2>\n` : '';
      return `${head}<section class="ref-item">
  <h3 class="dp-h3">${ex.name}</h3>
  ${ex.behavior ? `<p class="dp-muted ref-behavior">交互要求：${ex.behavior}</p>` : ''}
  <div class="ref-preview">${html}</div>
  <pre class="ref-code"><code>${esc(html)}</code></pre>
</section>`;
    }).join('\n');
    const page = `<!doctype html>
<html lang="zh-CN" data-dp-mode="${loadThemes(lib)[0].defaultMode}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.name}组件库 · 标准结构参考 · design-pal</title>
<!-- 本文件由 React 组件渲染生成（npm run build），请勿手改。
     非 React 项目：按下方每个组件的 HTML 结构与类名编写，并实现「交互要求」。
     需引入：styles/tokens.css、styles/themes/<颜色主题>.css、styles/components.css。图标使用 lucide（ISC 协议）同名图标。 -->
<link rel="stylesheet" href="styles/tokens.css">
<link rel="stylesheet" href="styles/themes/${loadThemes(lib)[0].id}.css">
<link rel="stylesheet" href="styles/components.css">
<style>
  body { margin: 0; }
  .ref { max-width: 960px; margin: 0 auto; padding: 32px 24px 96px; }
  .ref-group { margin: 40px 0 8px; padding-top: 16px; border-top: 1px solid var(--dp-border); }
  .ref-item { margin: 20px 0; }
  .ref-behavior { margin: 4px 0 10px; }
  .ref-preview { padding: 16px; border: 1px solid var(--dp-border); border-radius: var(--dp-r-lg); background: var(--dp-surface); }
  .ref-code { margin: 8px 0 0; padding: 10px 12px; overflow: auto; border-radius: var(--dp-r-md); background: var(--dp-surface-2); font: 12px/1.5 var(--dp-font-mono); white-space: pre-wrap; word-break: break-all; }
</style>
</head>
<body class="dp-app">
<main class="ref">
<h1 class="dp-h1">${meta.name}组件库 · 标准结构参考 <span class="dp-faint">v${meta.version}</span></h1>
<p class="dp-muted">每个组件的 HTML 结构、类名与交互要求。外观全部来自样式文件；不要改类名，不要写死颜色。</p>
${body}
</main>
</body>
</html>
`;
    const file = join(LIB_ROOT, lib, 'reference.html');
    writeFileSync(file, page);
    return file;
  } finally {
    await server.close();
  }
}

/* 画廊：列出所有组件库及其颜色主题 */
export function buildGallery({ write = true } = {}) {
  const libs = readdirSync(LIB_ROOT).map((lib) => {
    const m = readJson(join(LIB_ROOT, lib, 'library.json'));
    return { id: m.id, name: m.name, en: m.en, version: m.version, summary: m.summary, fitFor: m.fitFor, fitDesc: m.fitDesc, themes: loadThemes(lib).map(({ id, name, desc, defaultMode, light }) => ({ id, name, desc, defaultMode, light: { primary: light.primary } })) };
  });
  const file = join(root, 'plugins/design-pal/gallery.html');
  const html = galleryHtml(libs);
  if (write) writeFileSync(file, html);
  return { file, html };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = buildThemes();
  console.log(`已生成 ${out.length} 个颜色主题 CSS`);
  console.log('已生成画廊', buildGallery().file);
  for (const lib of readdirSync(LIB_ROOT)) {
    console.log('已生成演示页', await buildDemo(lib));
    console.log('已生成标准结构参考', await buildReference(lib));
  }
}
