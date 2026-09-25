// 安装测试：在临时隔离目录中，用 Claude Code 与 Codex 的命令行从本仓库安装插件。
// 通过 CLAUDE_CONFIG_DIR / CODEX_HOME 指向临时目录，不触碰真实配置。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = process.argv[2] || root; // 可传入 GitHub 地址（如 KeelingYU/design-pal）测试线上安装
const tmp = mkdtempSync(join(tmpdir(), 'dp-install-'));
const run = (cmd, args, env) => execFileSync(cmd, args, { env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

let failed = 0;
function check(name, fn) {
  try { fn(); console.log(`✔ ${name}`); }
  catch (e) { failed++; console.log(`✘ ${name}\n  ${(e.stderr || e.message || '').toString().trim().split('\n').slice(-3).join('\n  ')}`); }
}

const cc = { CLAUDE_CONFIG_DIR: join(tmp, 'claude') };
const cx = { CODEX_HOME: join(tmp, 'codex') };
mkdirSync(cc.CLAUDE_CONFIG_DIR);
mkdirSync(cx.CODEX_HOME);

check('Claude Code：添加市场', () => run('claude', ['plugin', 'marketplace', 'add', source], cc));
check('Claude Code：安装插件', () => run('claude', ['plugin', 'install', 'design-pal@design-pal'], cc));
check('Claude Code：识别使用技能', () => {
  const out = run('claude', ['plugin', 'details', 'design-pal'], cc);
  if (!/Skills \(\d+\)[^\n]*design-pal/.test(out)) throw new Error('未识别到 design-pal 技能：\n' + out);
});

check('Codex：添加市场', () => run('codex', ['plugin', 'marketplace', 'add', source], cx));
check('Codex：安装插件', () => run('codex', ['plugin', 'add', 'design-pal@design-pal'], cx));
check('Codex：识别使用技能', () => {
  const out = run('codex', ['plugin', 'list'], cx);
  if (!/design-pal@design-pal\s+installed, enabled/.test(out)) throw new Error('插件未启用：\n' + out);
  const version = JSON.parse(run('node', ['-e', `process.stdout.write(require('fs').readFileSync('${join(root, 'plugins/design-pal/plugin.json')}','utf8'))`])).version;
  const skill = join(cx.CODEX_HOME, 'plugins/cache/design-pal/design-pal', version, 'skills/design-pal/SKILL.md');
  if (!existsSync(skill)) throw new Error('缓存中缺少技能文件：' + skill);
});

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} 项失败` : '\n全部通过');
process.exit(failed ? 1 : 0);
