import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeRepo } from './helpers';

const hooks = join(import.meta.dirname, '../../.githooks');
const run = (dir: string, args: string[], env: Record<string, string> = {}) => {
  try { execFileSync('git', args, { cwd: dir, stdio: 'pipe', env: { ...process.env, ...env } }); return 'ok'; }
  catch (e: any) { return String(e.stderr); }
};

describe('防止在 main 上直接开发', () => {
  const setup = () => {
    const dir = makeRepo({ 'a.txt': '1' });
    execFileSync('git', ['branch', '-M', 'main'], { cwd: dir });
    execFileSync('git', ['config', 'core.hooksPath', hooks], { cwd: dir });
    writeFileSync(join(dir, 'a.txt'), '2');
    execFileSync('git', ['add', '-A'], { cwd: dir });
    return dir;
  };

  it('在 main 上提交被拦下，并提示切到开发分支', () => {
    const dir = setup();
    expect(run(dir, ['commit', '-q', '-m', 'x'])).toMatch(/git switch dev/);
  });

  it('切到开发分支后可以提交', () => {
    const dir = setup();
    execFileSync('git', ['switch', '-q', '-c', 'dev'], { cwd: dir });
    expect(run(dir, ['commit', '-q', '-m', 'x'])).toBe('ok');
  });

  it('发布脚本在 main 上的提交（带 DP_RELEASE=1）不受影响', () => {
    const dir = setup();
    expect(run(dir, ['commit', '-q', '-m', 'release'], { DP_RELEASE: '1' })).toBe('ok');
  });
});
