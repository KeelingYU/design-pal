#!/usr/bin/env node
// design-pal 自查工具（随项目存放于 design-pal/bin/，零依赖）。
//   node design-pal/bin/check.mjs          检查界面代码是否写死颜色、是否绕开组件库
//   node design-pal/bin/check.mjs --diff   列出项目相对组件库原版（baseline）的实际改动
// 单行可用注释 dp-allow 豁免（须说明原因）。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.env.DP_PROJECT_ROOT || join(import.meta.dirname, '../..');
const lockPath = join(root, 'design-pal/lock.json');
const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : { uiDir: 'src/design-pal' };
const posix = (p) => p.split('\\').join('/');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', '.output', 'coverage', '.turbo', '.vercel']);
const EXTS = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.vue', '.svelte', '.astro', '.html', '.css', '.scss', '.less']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const rel = posix(relative(root, abs));
    if (SKIP_DIRS.has(name) || rel === 'design-pal' || rel === lock.uiDir) continue;
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (EXTS.has(extname(name)) && !/\.(test|spec|config)\./.test(name) && !/^(vite|next|tailwind|postcss|eslint)\.config/.test(name)) out.push(rel);
  }
  return out;
}

const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const RULES = [
  { id: '写死颜色', re: /(?<![\w&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![\w-])/g, hint: '改用 --dp-* 颜色变量（如 var(--dp-primary)）或组件自带样式' },
  { id: '写死颜色', re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g, hint: '改用 --dp-* 颜色变量；需要浅色时用 color-mix(in srgb, var(--dp-…) N%, var(--dp-surface))' },
  { id: 'Tailwind 默认色板', re: new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|placeholder|shadow|accent|caret|decoration)-(?:${PALETTE})-\\d{2,3}\\b|\\b(?:bg|text|border)-(?:white|black)\\b`, 'g'), hint: '改用组件库变量，如 bg-[var(--dp-surface)] 或组件类名' },
  { id: '任意值颜色', re: /\b(?:bg|text|border|ring|fill|stroke|outline|shadow)-\[(?:#|rgb|hsl)/g, hint: '改用 --dp-* 变量' },
  { id: '绕开组件库的原生控件', re: /<select(?![^>]*\bdp-select\b)[\s>]|<input\b(?=[^>]*type=["'](?:checkbox|radio)["'])(?![^>]*\bdp-)/g, hint: 'React 用 Select / Checkbox / RadioGroup 组件；其他技术用 reference.html 中的结构' },
  { id: '其他 UI 组件库', re: /from\s+['"](?:antd|@mui\/[^'"]+|@material-ui\/[^'"]+|element-plus|element-ui|@chakra-ui\/[^'"]+|@mantine\/[^'"]+|react-bootstrap|bootstrap|@headlessui\/[^'"]+|@heroicons\/[^'"]+|react-icons[^'"]*|@fortawesome\/[^'"]+)['"]/g, hint: '只使用 design-pal 组件与 lucide 图标' }
];

function check() {
  const problems = [];
  for (const file of walk(root)) {
    const lines = readFileSync(join(root, file), 'utf8').split('\n');
    let inBlock = false;
    lines.forEach((line, i) => {
      const t = line.trim();
      if (inBlock) { if (t.includes('*/')) inBlock = false; return; }
      if (t.startsWith('/*') && !t.includes('*/')) { inBlock = true; return; }
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('<!--') || /dp-allow/.test(line)) return;
      for (const r of RULES) {
        r.re.lastIndex = 0;
        const m = r.re.exec(line);
        if (m) problems.push({ file, line: i + 1, rule: r.id, text: m[0].trim(), hint: r.hint });
      }
    });
  }
  return problems;
}

function diff() {
  const base = join(root, 'design-pal/baseline');
  if (!existsSync(base)) return [];
  const out = [];
  const files = [];
  (function w(d) { for (const n of readdirSync(d)) { const a = join(d, n); statSync(a).isDirectory() ? w(a) : files.push(posix(relative(base, a))); } })(base);
  for (const f of files) {
    const cur = join(root, f);
    if (!existsSync(cur)) out.push({ file: f, change: '已删除' });
    else if (!readFileSync(cur).equals(readFileSync(join(base, f)))) out.push({ file: f, change: '已修改' });
  }
  return out;
}

const args = process.argv.slice(2);
const json = args.includes('--json');
if (args.includes('--diff')) {
  const d = diff();
  if (json) console.log(JSON.stringify(d, null, 2));
  else console.log(d.length ? `相对组件库原版，本项目改动了 ${d.length} 个文件：\n` + d.map((x) => `  ${x.change}  ${x.file}`).join('\n') + '\n请确认这些改动都已记录在 design-pal/overrides.md。' : '与组件库原版一致，没有项目定制。');
} else {
  const p = check();
  if (json) console.log(JSON.stringify(p, null, 2));
  else if (!p.length) console.log('✔ design-pal 自查通过：没有写死颜色，没有绕开组件库。');
  else {
    console.log(`✘ design-pal 自查发现 ${p.length} 处问题：`);
    for (const x of p) console.log(`  ${x.file}:${x.line}  [${x.rule}] ${x.text}\n      → ${x.hint}`);
  }
  process.exitCode = p.length ? 1 : 0;
}
