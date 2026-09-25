// 项目探测与前置检查（零依赖）
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export class DpError extends Error {
  constructor(code, message, detail) { super(message); this.code = code; this.detail = detail; }
}

const git = (dir, args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** 项目必须是 Git 仓库，且改动已全部提交（保证任何操作都能一键回退） */
export function assertCleanGit(dir) {
  try { git(dir, ['rev-parse', '--is-inside-work-tree']); }
  catch { throw new DpError('NOT_GIT', '项目还不是 Git 仓库。为了能随时退回，design-pal 只在 Git 仓库中改动文件。请先初始化 Git 并提交一次。'); }
  const dirty = git(dir, ['status', '--porcelain']).trim();
  if (dirty) throw new DpError('DIRTY', '项目中有未提交的改动。请先提交（存档）再操作，这样出问题时可以一键退回。', dirty.split('\n'));
}

const EMPTY_OK = /^(\.git|\.gitignore|README(\..*)?|LICENSE(\..*)?|AGENTS\.md|CLAUDE\.md|\.DS_Store)$/i;

/** 返回 { kind: 'empty' | 'react' | 'other', pm, entry, uiDir } */
export function detectProject(dir) {
  const files = readdirSync(dir);
  const pkgPath = join(dir, 'package.json');
  const pm = existsSync(join(dir, 'pnpm-lock.yaml')) ? 'pnpm' : existsSync(join(dir, 'yarn.lock')) ? 'yarn' : existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock')) ? 'bun' : 'npm';
  if (!existsSync(pkgPath) && files.every((f) => EMPTY_OK.test(f))) return { kind: 'empty', pm: 'npm', entry: 'src/main.tsx', uiDir: 'src/design-pal' };
  let deps = {};
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
  }
  const uiDir = existsSync(join(dir, 'src')) ? 'src/design-pal' : 'design-pal/ui';
  const entries = ['src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/index.jsx', 'src/main.ts', 'src/main.js', 'src/app/layout.tsx', 'app/layout.tsx', 'src/pages/_app.tsx', 'pages/_app.tsx'];
  const entry = entries.find((e) => existsSync(join(dir, e))) || null;
  return { kind: deps.react ? 'react' : 'other', pm, entry, uiDir };
}
