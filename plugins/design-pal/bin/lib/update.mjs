// 换颜色主题与升级组件库。原则：先存档（Git 干净）、不降级、有冲突时一个文件都不写，等用户逐条选择后一次性写入。
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { DpError, assertCleanGit } from './project.mjs';
import { META_DIR, agentsBlock, libraryFiles, loadLibrary, upsertBlock } from './apply.mjs';

const posix = (p) => p.split('\\').join('/');
const cmpVer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const buf = (c) => (c === undefined ? undefined : Buffer.isBuffer(c) ? c : Buffer.from(c));
const same = (a, b) => (a === undefined && b === undefined) || (a !== undefined && b !== undefined && buf(a).equals(buf(b)));
const isText = (p) => !/\.(woff2?|ttf|otf|png|jpe?g|gif|webp|ico)$/i.test(p);

function readLock(projectDir) {
  const p = join(projectDir, META_DIR, 'lock.json');
  if (!existsSync(p)) throw new DpError('NOT_APPLIED', '这个项目还没有应用 design-pal 组件库。');
  return JSON.parse(readFileSync(p, 'utf8'));
}

function readTree(dir) {
  const out = {};
  if (!existsSync(dir)) return out;
  (function walk(d) { for (const n of readdirSync(d)) { const a = join(d, n); statSync(a).isDirectory() ? walk(a) : (out[posix(relative(dir, a))] = readFileSync(a)); } })(dir);
  return out;
}

function writeAll(projectDir, files, removals = []) {
  for (const [p, c] of Object.entries(files)) { const a = join(projectDir, p); mkdirSync(dirname(a), { recursive: true }); writeFileSync(a, c); }
  for (const p of removals) { const a = join(projectDir, p); if (existsSync(a)) unlinkSync(a); }
}

function syncAgents(projectDir, pluginRoot, lib, theme, lock) {
  const p = join(projectDir, 'AGENTS.md');
  const text = existsSync(p) ? readFileSync(p, 'utf8') : '';
  return upsertBlock(text, agentsBlock(pluginRoot, lib, theme, lock.kind, lock.uiDir));
}

/* ---------- 换颜色主题 ---------- */
export function runTheme({ projectDir, pluginRoot, themeId, force = false, today = new Date().toISOString().slice(0, 10) }) {
  assertCleanGit(projectDir);
  const lock = readLock(projectDir);
  if (!themeId) throw new DpError('USAGE', '需要 --theme。');
  const lib = loadLibrary(pluginRoot, lock.library);
  const theme = lib.themes.find((t) => t.id === themeId);
  if (!theme) throw new DpError('NO_THEME', `组件库「${lib.meta.name}」没有颜色主题「${themeId}」。可选：${lib.themes.map((t) => `${t.id}（${t.name}）`).join('、')}`);
  if (lock.theme === themeId) return { status: 'unchanged', message: `当前已经是「${theme.name}」，无需切换。` };
  const rel = `${lock.uiDir}/styles/theme.css`;
  const cur = join(projectDir, rel), base = join(projectDir, META_DIR, 'baseline', rel);
  if (existsSync(base) && existsSync(cur) && !same(readFileSync(cur), readFileSync(base)) && !force)
    throw new DpError('THEME_CUSTOMIZED', `项目改过颜色文件（${rel}），直接切换会丢掉这些颜色定制。请与用户确认后再决定：保留定制（不切换），或放弃定制并切换。`, [rel]);
  const css = readFileSync(join(lib.dir, 'styles/themes', themeId + '.css'));
  const newLock = { ...lock, theme: themeId, updatedAt: today };
  writeAll(projectDir, {
    [rel]: css,
    [`${META_DIR}/baseline/${rel}`]: css,
    [`${META_DIR}/lock.json`]: JSON.stringify(newLock, null, 2) + '\n',
    'AGENTS.md': syncAgents(projectDir, pluginRoot, lib, theme, newLock)
  });
  return { status: 'done', message: `✔ 已换成颜色主题「${theme.name}」。布局与交互不变，只有配色变化。`, changed: [rel, 'AGENTS.md', `${META_DIR}/lock.json`] };
}

/* ---------- 升级组件库 ---------- */
function unifiedDiff(a, b, label) {
  const tmp = mkdtempSync(join(tmpdir(), 'dp-diff-'));
  try {
    writeFileSync(join(tmp, 'a'), a ?? ''); writeFileSync(join(tmp, 'b'), b ?? '');
    try { execFileSync('git', ['diff', '--no-index', '--no-color', '-U1', 'a', 'b'], { cwd: tmp, encoding: 'utf8' }); return ''; }
    catch (e) { return String(e.stdout).split('\n').slice(4).filter((l) => !l.startsWith('\\')).slice(0, 40).join('\n').replace(/^/, `${label}\n`); }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/** 三方合并。favor = 'ours' | 'theirs' 时只在冲突处取该方，其余改动照常合并；不传则冲突时返回冲突块 */
function merge3(ours, base, theirs, favor) {
  const tmp = mkdtempSync(join(tmpdir(), 'dp-merge-'));
  try {
    writeFileSync(join(tmp, 'ours'), ours); writeFileSync(join(tmp, 'base'), base); writeFileSync(join(tmp, 'theirs'), theirs);
    const args = ['merge-file', '-p', ...(favor ? ['--' + favor] : ['--diff3']), 'ours', 'base', 'theirs'];
    try { return { clean: true, content: execFileSync('git', args, { cwd: tmp }) }; }
    catch (e) { if (e.status > 0) return { clean: false, hunks: conflictHunks(String(e.stdout)) }; throw e; }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/** 从 diff3 冲突标记中取出每个冲突块的三方内容 */
function conflictHunks(text) {
  const hunks = [];
  let cur = null, part = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('<<<<<<< ')) { cur = { ours: [], base: [], theirs: [] }; part = 'ours'; }
    else if (cur && line.startsWith('||||||| ')) part = 'base';
    else if (cur && line === '=======') part = 'theirs';
    else if (cur && line.startsWith('>>>>>>> ')) { hunks.push(cur); cur = null; }
    else if (cur) cur[part].push(line);
  }
  return hunks;
}

const hunkDiff = (hunks, side, label) => `${label}\n` + hunks.map((h) => [...h.base.map((l) => '- ' + l), ...h[side].map((l) => '+ ' + l)].join('\n')).join('\n…\n').split('\n').slice(0, 40).join('\n');

/**
 * 不带 apply：只给出升级计划（更新说明、将更新的文件、冲突清单），不写入。
 * 带 apply：没有未决冲突时一次性写入；resolutions 形如 ["路径=ours", "路径=theirs"]。
 */
export function runUpgrade({ projectDir, pluginRoot, apply = false, resolutions = [], today = new Date().toISOString().slice(0, 10) }) {
  assertCleanGit(projectDir);
  const lock = readLock(projectDir);
  const lib = loadLibrary(pluginRoot, lock.library);
  const c = cmpVer(lib.meta.version, lock.version);
  if (c === 0) return { status: 'up-to-date', message: `已经是最新版本（${lib.meta.name} v${lock.version}）。` };
  if (c < 0) throw new DpError('DOWNGRADE', `本机 design-pal 中的${lib.meta.name}组件库是 v${lib.meta.version}，比项目正在用的 v${lock.version} 还旧，不能降级。请先更新 design-pal 插件。`);
  if (!lib.themes.find((t) => t.id === lock.theme)) throw new DpError('THEME_REMOVED', `新版不再包含项目正在用的颜色主题「${lock.theme}」，请先换一个颜色主题。`);

  const choose = Object.fromEntries(resolutions.map((r) => { const i = r.lastIndexOf('='); return [r.slice(0, i), r.slice(i + 1)]; }));
  const theirsAll = libraryFiles(lib, lock.theme, lock.kind, lock.uiDir);
  const baseAll = readTree(join(projectDir, META_DIR, 'baseline'));
  const paths = [...new Set([...Object.keys(theirsAll), ...Object.keys(baseAll)])].sort();
  const writes = {}, removals = [], conflicts = [], updated = [], kept = [], merged = [];

  for (const p of paths) {
    const base = baseAll[p], theirs = theirsAll[p];
    const abs = join(projectDir, p);
    const ours = existsSync(abs) ? readFileSync(abs) : undefined;
    if (same(theirs, base)) { if (!same(ours, base)) kept.push(p); continue; }       // 库没改：保留项目现状
    if (same(ours, base) || same(ours, theirs)) {                                    // 项目没改：直接跟随新版
      if (!same(ours, theirs)) { theirs === undefined ? removals.push(p) : (writes[p] = theirs); updated.push(p); }
      continue;
    }
    // 双方都改了：文本文件逐行合并，不冲突的改动两边都保留
    const pick = choose[p];
    if (base !== undefined && ours !== undefined && theirs !== undefined && isText(p)) {
      const m = merge3(ours, base, theirs);
      if (m.clean) { writes[p] = m.content; merged.push(p); continue; }
      // 用户的选择只作用于冲突处
      if (pick === 'ours' || pick === 'theirs') { writes[p] = merge3(ours, base, theirs, pick).content; merged.push(p); continue; }
      conflicts.push({ file: p, kind: `项目定制与新版改动在 ${m.hunks.length} 处冲突（文件中其他改动会自动合并）`, library: hunkDiff(m.hunks, 'theirs', '新版改了：'), project: hunkDiff(m.hunks, 'ours', '项目改了：') });
      continue;
    }
    // 整个文件层面的冲突（增删文件、二进制文件）
    const kind = ours === undefined ? '项目删除了这个文件，新版改了它' : theirs === undefined ? '新版删除了这个文件，项目改过它' : base === undefined ? '新版新增了这个文件，项目里已有同名文件' : '项目定制与新版改动冲突';
    if (pick === 'ours') { kept.push(p); continue; }
    if (pick === 'theirs') { theirs === undefined ? removals.push(p) : (writes[p] = theirs); updated.push(p); continue; }
    conflicts.push({ file: p, kind, library: isText(p) ? unifiedDiff(base?.toString(), theirs?.toString(), '新版改了：') : '（二进制文件）', project: isText(p) ? unifiedDiff(base?.toString(), ours?.toString(), '项目改了：') : '（二进制文件）' });
  }

  const notes = (lib.meta.changelog || []).filter((x) => cmpVer(x.version, lock.version) > 0);
  const summary = { from: lock.version, to: lib.meta.version, changelog: notes, updated, merged, kept, conflicts };
  const head = `${lib.meta.name}组件库 v${lock.version} → v${lib.meta.version}\n更新说明：\n${notes.map((n) => `  v${n.version}（${n.date}）${n.notes}`).join('\n') || '  （无）'}\n将更新 ${updated.length} 个文件；${merged.length} 个文件合并新版改动并保留项目定制；${kept.length} 个文件保留项目现状${conflicts.length ? `；另有 ${conflicts.length} 个文件中的项目定制与新版冲突` : ''}。`;
  if (conflicts.length) {
    return { status: 'conflicts', ...summary, message: `${head}\n有 ${conflicts.length} 处冲突需要逐条选择（本次没有写入任何文件）：\n${conflicts.map((x) => `  - ${x.file}：${x.kind}`).join('\n')}\n选择后用 --resolve <文件>=ours（保留项目定制）或 =theirs（跟随新版）重新执行，并加 --apply。` };
  }
  if (!apply) return { status: 'plan', ...summary, message: `${head}\n没有冲突。确认后加 --apply 执行升级。` };

  // 写入：项目文件、原版副本、自查工具、lock、项目规则、依赖
  const newLock = { ...lock, version: lib.meta.version, updatedAt: today };
  const baseWrites = Object.fromEntries(Object.entries(theirsAll).map(([p, v]) => [`${META_DIR}/baseline/${p}`, v]));
  const baseRemovals = Object.keys(baseAll).filter((p) => !(p in theirsAll)).map((p) => `${META_DIR}/baseline/${p}`);
  const extra = {
    [`${META_DIR}/bin/check.mjs`]: readFileSync(join(pluginRoot, 'bin/check.mjs')),
    [`${META_DIR}/lock.json`]: JSON.stringify(newLock, null, 2) + '\n',
    'AGENTS.md': syncAgents(projectDir, pluginRoot, lib, lib.themes.find((t) => t.id === lock.theme), newLock)
  };
  const todos = [];
  if (lock.kind === 'react' && existsSync(join(projectDir, 'package.json'))) {
    const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
    const missing = Object.entries(lib.meta.reactDependencies || {}).filter(([n]) => !(pkg.dependencies?.[n] || pkg.devDependencies?.[n]));
    if (missing.length) { pkg.dependencies = { ...pkg.dependencies, ...Object.fromEntries(missing) }; extra['package.json'] = JSON.stringify(pkg, null, 2) + '\n'; todos.push('新版增加了依赖，请在项目中重新安装依赖。'); }
  }
  writeAll(projectDir, { ...writes, ...baseWrites, ...extra }, [...removals, ...baseRemovals]);
  return { status: 'done', ...summary, todos, message: `✔ 已升级到${lib.meta.name}组件库 v${lib.meta.version}。更新 ${updated.length} 个文件，合并 ${merged.length} 个文件（保留项目定制），${kept.length} 个文件保留项目现状。${todos.map((t) => '\n待办：' + t).join('')}` };
}
