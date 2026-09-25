import { afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const temps: string[] = [];
afterAll(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

const git = (dir: string, ...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });

/** 建一个临时 Git 项目并提交给定文件 */
export function makeRepo(files: Record<string, string> = {}, { commit = true, init = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dp-proj-'));
  temps.push(dir);
  for (const [p, c] of Object.entries(files)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), c); }
  if (init) {
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.email', 't@example.com');
    git(dir, 'config', 'user.name', 't');
    if (commit) { git(dir, 'add', '-A'); git(dir, 'commit', '-q', '--allow-empty', '-m', 'init'); }
  }
  return dir;
}
