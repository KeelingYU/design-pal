// 设计草稿：状态保存在 drafts/<id>/（不进 Git），中断后可续做；参考素材只放在草稿目录
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { COLOR_KEYS, checkReadability, validateTheme } from '../../plugins/design-pal/bin/lib/theme.mjs';

export const ROOT = resolve(import.meta.dirname, '../..');
export const DRAFTS = join(ROOT, 'drafts');
export const LIB_ROOT = join(ROOT, 'plugins/design-pal/libraries');

export class DesignError extends Error {
  constructor(code, message, detail) { super(message); this.code = code; this.detail = detail; }
}

const now = () => new Date().toISOString();
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const draftDir = (id, drafts = DRAFTS) => join(drafts, id);

export function loadDraft(id, drafts = DRAFTS) {
  const p = join(draftDir(id, drafts), 'state.json');
  if (!existsSync(p)) throw new DesignError('NO_DRAFT', `没有找到草稿「${id}」。`);
  return readJson(p);
}
export function saveDraft(state, drafts = DRAFTS) {
  mkdirSync(draftDir(state.id, drafts), { recursive: true });
  state.updatedAt = now();
  writeFileSync(join(draftDir(state.id, drafts), 'state.json'), JSON.stringify(state, null, 2));
  return state;
}

/** 所有草稿及进度（用于启动时询问是否续做） */
export function listDrafts(drafts = DRAFTS) {
  if (!existsSync(drafts)) return [];
  return readdirSync(drafts).filter((d) => existsSync(join(drafts, d, 'state.json'))).map((d) => {
    const s = readJson(join(drafts, d, 'state.json'));
    return { id: s.id, kind: s.kind, name: s.name, library: s.library, step: s.step, updatedAt: s.updatedAt };
  }).filter((d) => d.step !== 'published').sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function libraryMeta(lib, libRoot = LIB_ROOT) {
  const dir = join(libRoot, lib);
  if (!existsSync(join(dir, 'library.json'))) throw new DesignError('NO_LIBRARY', `没有组件库「${lib}」。`);
  const meta = readJson(join(dir, 'library.json'));
  return { meta, themes: meta.colorThemes.map((t) => readJson(join(dir, 'themes', t + '.json'))) };
}

export function newThemeDraft({ id, library, name, from }, drafts = DRAFTS, libRoot = LIB_ROOT) {
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(id || '')) throw new DesignError('BAD_ID', '草稿编号只能用小写字母、数字和连字符，例如 green-finance。');
  if (existsSync(join(draftDir(id, drafts), 'state.json'))) throw new DesignError('EXISTS', `草稿「${id}」已存在，可直接续做。`);
  const { themes } = libraryMeta(library, libRoot);
  const base = from ? themes.find((t) => t.id === from) : null;
  if (from && !base) throw new DesignError('NO_THEME', `组件库中没有颜色主题「${from}」。`);
  mkdirSync(join(draftDir(id, drafts), 'references'), { recursive: true });
  return saveDraft({ id, kind: 'theme', library, name: name || id, step: base ? 'editing' : 'brief', createdAt: now(), acceptedLowContrast: [], theme: base ? { ...structuredClone(base), id, name: name || id, draft: true } : null, directions: [] }, drafts);
}

/** 补齐颜色主题的基本字段并检查：格式错误报错；可读性问题返回（带建议色） */
export function inspectTheme(theme, accepted = []) {
  const errors = validateTheme(theme);
  if (errors.length) throw new DesignError('BAD_THEME', '配色数据不完整：' + errors.join('；'));
  const issues = checkReadability(theme).filter((r) => !r.ok).map((r) => ({ ...r, key: `${r.mode}.${r.fg}/${r.bg}`, accepted: accepted.includes(`${r.mode}.${r.fg}/${r.bg}`) }));
  return issues;
}

export function setDirections(id, palettes, drafts = DRAFTS) {
  const s = loadDraft(id, drafts);
  if (!Array.isArray(palettes) || palettes.length < 2 || palettes.length > 3) throw new DesignError('BAD_DIRECTIONS', '请提供 2～3 个配色方向。');
  s.directions = palettes.map((p, i) => {
    const label = p.label || 'ABC'[i];
    return { ...p, label, id: `${id}-${label.toLowerCase()}`, name: p.name || `方向 ${label}`, defaultMode: p.defaultMode || 'light', draft: true };
  });
  const report = s.directions.map((d) => ({ label: d.label, name: d.name, issues: inspectTheme(d) }));
  s.step = 'directions';
  saveDraft(s, drafts);
  return { state: s, report };
}

export function chooseDirection(id, label, drafts = DRAFTS) {
  const s = loadDraft(id, drafts);
  const d = s.directions.find((x) => x.label.toLowerCase() === String(label).toLowerCase());
  if (!d) throw new DesignError('NO_DIRECTION', `没有方向「${label}」。`);
  s.theme = { ...structuredClone(d), id, name: s.name, draft: true };
  delete s.theme.label;
  s.step = 'editing';
  saveDraft(s, drafts);
  return { state: s, issues: inspectTheme(s.theme, s.acceptedLowContrast) };
}

/** 修改配色：patch 可含 light/dark 的部分颜色、desc、defaultMode；accept 为用户坚持保留的低对比组合 */
export function updateTheme(id, patch = {}, accept = [], drafts = DRAFTS) {
  const s = loadDraft(id, drafts);
  if (!s.theme) throw new DesignError('NO_THEME_YET', '还没有选定配色方向。');
  for (const mode of ['light', 'dark']) if (patch[mode]) for (const k of Object.keys(patch[mode])) { if (!COLOR_KEYS.includes(k)) throw new DesignError('BAD_KEY', `未知颜色项 ${k}`); s.theme[mode][k] = patch[mode][k].toUpperCase(); }
  for (const k of ['desc', 'defaultMode', 'name']) if (patch[k]) s.theme[k] = patch[k];
  if (patch.name) s.name = patch.name;
  s.acceptedLowContrast = [...new Set([...s.acceptedLowContrast, ...accept])];
  s.theme.acceptedLowContrast = s.acceptedLowContrast;
  s.step = 'editing';
  saveDraft(s, drafts);
  return { state: s, issues: inspectTheme(s.theme, s.acceptedLowContrast) };
}

const nextMinor = (v) => { const [a, b] = v.split('.').map(Number); return `${a}.${b + 1}.0`; };

/** 定稿：检查可读性与重名，生成「待发布包」（仍在草稿目录，不改动组件库） */
export function finalizeTheme(id, { desc, note } = {}, drafts = DRAFTS, libRoot = LIB_ROOT) {
  const s = loadDraft(id, drafts);
  if (!s.theme) throw new DesignError('NO_THEME_YET', '还没有选定配色。');
  if (desc) s.theme.desc = desc;
  if (!s.theme.desc) throw new DesignError('NO_DESC', '请补一句颜色主题的简介（会显示在画廊与演示页）。');
  const open = inspectTheme(s.theme, s.acceptedLowContrast).filter((i) => !i.accepted);
  if (open.length) throw new DesignError('LOW_CONTRAST', '还有对比度不足的颜色未处理：请改用建议色，或由用户确认坚持保留。', open.map((i) => `${i.mode} ${i.label} ${i.ratio}:1 → 建议 ${i.suggestion}`));
  const { meta, themes } = libraryMeta(s.library, libRoot);
  const dupe = themes.find((t) => t.id === s.theme.id || t.name === s.theme.name);
  if (dupe) throw new DesignError('DUPLICATE', `与已有颜色主题「${dupe.name}（${dupe.id}）」重名，请换一个名称或编号。`);
  const otherLibs = readdirSync(libRoot).map((l) => readJson(join(libRoot, l, 'library.json')).name);
  if (otherLibs.includes(s.theme.name)) throw new DesignError('DUPLICATE', `与组件库「${s.theme.name}」重名，请换一个名称。`);
  const { draft, ...theme } = s.theme;
  if (!theme.acceptedLowContrast?.length) delete theme.acceptedLowContrast;
  const version = nextMinor(meta.version);
  s.release = { kind: 'theme', library: s.library, fromVersion: meta.version, version, theme, note: note || `新增颜色主题「${theme.name}」：${theme.desc}` };
  s.step = 'finalized';
  saveDraft(s, drafts);
  return s.release;
}

/* ---------- 替换示例页（改代码，所以在单独的草稿分支上进行，确认发布前不进入 main） ---------- */
const gitIn = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

export function newPageDraft({ id, library, name }, { root = ROOT, drafts = DRAFTS, libRoot = LIB_ROOT } = {}) {
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(id || '')) throw new DesignError('BAD_ID', '草稿编号只能用小写字母、数字和连字符。');
  if (existsSync(join(draftDir(id, drafts), 'state.json'))) throw new DesignError('EXISTS', `草稿「${id}」已存在，可直接续做。`);
  libraryMeta(library, libRoot);
  if (gitIn(root, ['status', '--porcelain'])) throw new DesignError('DIRTY', '仓库有未提交的改动，请先处理。');
  const branch = `draft/${id}`;
  gitIn(root, ['checkout', '-q', '-b', branch]);
  mkdirSync(join(draftDir(id, drafts), 'references'), { recursive: true });
  return saveDraft({ id, kind: 'page', library, name: name || id, branch, step: 'editing', createdAt: now() }, drafts);
}

export function finalizePage(id, { note } = {}, { root = ROOT, drafts = DRAFTS, libRoot = LIB_ROOT } = {}) {
  const s = loadDraft(id, drafts);
  if (s.kind !== 'page') throw new DesignError('WRONG_KIND', '这不是示例页草稿。');
  if (gitIn(root, ['status', '--porcelain'])) throw new DesignError('DIRTY', '草稿分支上还有未提交的改动，请先提交。');
  if (!note) throw new DesignError('NO_NOTE', '请用一句话说明替换了哪个示例页（写入更新记录）。');
  const { meta } = libraryMeta(s.library, libRoot);
  s.release = { kind: 'page', library: s.library, branch: s.branch, fromVersion: meta.version, version: nextMinor(meta.version), note };
  s.step = 'finalized';
  saveDraft(s, drafts);
  return s.release;
}
