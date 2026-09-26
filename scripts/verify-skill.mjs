#!/usr/bin/env node
// 使用技能实测：临时空项目中，按用户的日常说法让 Claude Code / Codex 依次走完
// 查看组件库 → 推荐 → 应用 → 项目定制 → 换颜色主题 → 升级，每步自动核对结果。
// 会消耗两种 Agent 的真实额度，只在需要时手动运行：
//   npm run verify:skill -- [--agents claude,codex]
// 不改真实配置：Codex 使用临时 CODEX_HOME（仅复制登录凭据）从本仓库安装插件；Claude Code 用 --plugin-dir 加载。
// 「打开浏览器」被替换为记录日志，不会弹出窗口。记录输出到 drafts/skill-<时间>/report.md（不进 Git）。
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const plugin = join(root, 'plugins/design-pal');
const args = process.argv.slice(2);
const i = args.indexOf('--agents');
const agents = (i >= 0 ? args[i + 1] : 'claude,codex').split(',');
const outDir = join(root, 'drafts', 'skill-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
mkdirSync(outDir, { recursive: true });
// 验收使用的模型（用户指定）
const CLAUDE_MODEL = ['--model', 'claude-opus-5-5', '--effort', 'medium'];
const CODEX_MODEL = ['-c', 'model="gpt-6-sol"', '-c', 'model_reasoning_effort="high"'];
const THEME_NAMES = { blue: '商务蓝', cyan: '极客青' };

const sh = (dir, cmd, ...a) => spawnSync(cmd, a, { cwd: dir, encoding: 'utf8' });
const git = (dir, ...a) => sh(dir, 'git', ...a).stdout.trim();
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const lock = (dir) => { try { return JSON.parse(read(join(dir, 'design-pal/lock.json'))); } catch { return null; } };

function makeProject(tmp) {
  const dir = join(tmp, 'orders-admin');
  mkdirSync(dir);
  git(dir, 'init', '-q'); git(dir, 'config', 'user.email', 'trial@example.com'); git(dir, 'config', 'user.name', 'trial');
  writeFileSync(join(dir, 'README.md'), '# 订单后台\n\n给运营团队用的订单管理后台：查订单、处理发货与售后。刚起步，还没有代码。\n');
  writeFileSync(join(dir, '.gitignore'), 'node_modules\ndist\n.trial\n');
  git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', 'init');
  // 用记录日志的假 open 代替真实浏览器
  const bin = join(tmp, 'bin');
  mkdirSync(bin);
  for (const name of ['open', 'xdg-open']) {
    writeFileSync(join(bin, name), `#!/bin/sh\nmkdir -p "${dir}/.trial"\necho "$@" >> "${dir}/.trial/open.log"\n`);
    chmodSync(join(bin, name), 0o755);
  }
  return { dir, bin };
}

function agentRunner(agent, tmp, dir, bin) {
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  if (agent === 'claude') {
    const tools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash(node:*)', 'Bash(git:*)', 'Bash(npm:*)', 'Bash(npx:*)', 'Bash(ls:*)', 'Bash(cat:*)', 'Bash(claude plugin marketplace update:*)'];
    let first = true;
    return (prompt) => {
      const a = ['-p', prompt, ...CLAUDE_MODEL, '--plugin-dir', plugin, '--permission-mode', 'acceptEdits', '--allowedTools', ...tools];
      if (!first) a.push('--continue');
      first = false;
      return spawnSync('claude', a, { cwd: dir, env, encoding: 'utf8', timeout: 20 * 60e3 });
    };
  }
  const home = join(tmp, 'codex-home');
  mkdirSync(home);
  copyFileSync(join(homedir(), '.codex/auth.json'), join(home, 'auth.json'));
  const cx = { ...env, CODEX_HOME: home };
  execFileSync('codex', ['plugin', 'marketplace', 'add', root], { env: cx, stdio: 'pipe' });
  execFileSync('codex', ['plugin', 'add', 'design-pal@design-pal'], { env: cx, stdio: 'pipe' });
  // 真实使用时 Codex 提交存档需用户批准越过沙箱（.git 在沙箱内只读）；无人值守时在临时项目中直接放开，相当于用户都批准。
  // 不用登录 shell，否则 PATH 被重置，假 open 失效、会弹出真实浏览器。
  const cfg = [...CODEX_MODEL, '-c', 'sandbox_mode="danger-full-access"', '-c', 'allow_login_shell=false'];
  let first = true;
  return (prompt) => {
    const a = first ? ['exec', ...cfg, '-C', dir, prompt] : ['exec', 'resume', '--last', ...cfg, prompt];
    first = false;
    const r = spawnSync('codex', a, { cwd: dir, env: cx, encoding: 'utf8', timeout: 20 * 60e3 });
    // codex exec 的最终回复在 stdout 末尾「codex」标记之后
    const out = r.stdout || '';
    const k = out.lastIndexOf('\ncodex\n');
    return { ...r, stdout: k >= 0 ? out.slice(k + 7).replace(/\ntokens used[\s\S]*$/, '') : out };
  };
}

// 每步：用户说法 + 核对（返回问题列表，空 = 通过）
function steps(dir) {
  let head;
  const ctx = {};
  return [
    { say: '查看 design-pal 组件库', check: () => (read(join(dir, '.trial/open.log')).includes('gallery.html') ? [] : ['没有打开画廊']) },
    {
      say: '这个项目适合用哪个组件库和颜色主题？先只给建议，不要改文件。',
      before: () => { head = git(dir, 'rev-parse', 'HEAD'); },
      check: (out) => [
        ...(git(dir, 'status', '--porcelain') || git(dir, 'rev-parse', 'HEAD') !== head ? ['只要建议却改动了项目'] : []),
        ...(/效率/.test(out) ? [] : ['回复中没有推荐效率型组件库']),
      ],
    },
    {
      say: '同意，就按你推荐的应用到这个项目。需要存档就直接提交，不用再问我。',
      check: () => {
        const l = lock(dir);
        if (!l) return ['没有应用组件库'];
        ctx.theme = l.theme;
        const p = [];
        if (!read(join(dir, 'AGENTS.md')).includes('design-pal')) p.push('项目规则中没有 design-pal 一节');
        const c = sh(dir, process.execPath, 'design-pal/bin/check.mjs', '--json');
        try { const n = JSON.parse(c.stdout).length; if (n) p.push(`自查有 ${n} 处问题`); } catch { p.push('自查无法运行'); }
        const b = sh(dir, 'npm', 'run', 'build');
        if (b.status !== 0) p.push('项目构建失败：' + (b.stderr || b.stdout).trim().split('\n').slice(-2).join(' '));
        head = git(dir, 'rev-parse', 'HEAD');
        return p;
      },
    },
    {
      say: '只在这个项目里，把按钮改成直角。',
      check: () => {
        const p = [];
        const rec = read(join(dir, 'design-pal/overrides.md')).split('## 新增组件')[0];
        if (!/\d{4}-\d{2}-\d{2}｜[^\n]*(按钮|直角)/.test(rec)) p.push('定制记录中没有这一条');
        const diff = JSON.parse(sh(dir, process.execPath, 'design-pal/bin/check.mjs', '--diff', '--json').stdout || '[]');
        if (!diff.length) p.push('项目文件没有实际改动');
        if (git(dir, 'diff', head, '--stat', '--', 'design-pal/baseline')) p.push('改动了原版备份');
        return p;
      },
    },
    {
      get say() { ctx.target = ctx.theme === 'cyan' ? 'blue' : 'cyan'; return `换成${THEME_NAMES[ctx.target]}，同意直接换，需要存档就直接提交。`; },
      check: () => (lock(dir)?.theme === ctx.target ? [] : [`颜色主题没有换成 ${ctx.target}`]),
    },
    {
      say: '升级组件库。',
      before: () => { ctx.version = lock(dir)?.version; },
      check: (out) => [
        ...(lock(dir)?.version === ctx.version ? [] : ['版本发生了变化']),
        ...(/已是最新|已经是最新|在用最新|没有(可应用的|可用的)?新版本|无需升级|不需要升级/.test(out) ? [] : ['没有告诉用户已是最新']),
      ],
    },
  ];
}

const report = [`# 使用技能实测\n\n时间：${new Date().toLocaleString('zh-CN')}\n`];
let failed = 0;
for (const agent of agents) {
  const tmp = mkdtempSync(join(tmpdir(), `dp-skill-${agent}-`));
  const { dir, bin } = makeProject(tmp);
  const run = agentRunner(agent, tmp, dir, bin);
  const name = agent === 'claude' ? 'Claude Code' : 'Codex';
  console.log(`▶ ${name}：${dir}`);
  report.push(`\n## ${name}\n\n项目目录：${dir}\n`);
  for (const s of steps(dir)) {
    const say = s.say;
    s.before?.();
    const t0 = Date.now();
    const r = run(say);
    const out = (r.stdout || '').trim();
    const problems = r.status === 0 ? s.check(out) : [`Agent 异常退出：${(r.stderr || r.error?.message || '').trim().split('\n').slice(-3).join(' ')}`];
    failed += problems.length ? 1 : 0;
    const sec = Math.round((Date.now() - t0) / 1000);
    console.log(`  ${problems.length ? '✘' : '✔'} ${say}（${sec}s）${problems.length ? '：' + problems.join('；') : ''}`);
    report.push(`\n### 用户：${say}\n\n结果：${problems.length ? '✘ ' + problems.join('；') : '✔ 通过'}（${sec}s）\n\n${out.split('\n').map((l) => '> ' + l).join('\n')}\n`);
  }
}
writeFileSync(join(outDir, 'report.md'), report.join(''));
console.log(`\n记录：${join(outDir, 'report.md')}`);
console.log(failed ? `${failed} 步未通过` : '全部通过');
process.exit(failed ? 1 : 0);
