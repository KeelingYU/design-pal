#!/usr/bin/env node
// 复刻验证：临时空项目 → 应用组件库 → 让 Claude Code / Codex 各做一个演示页里没有的页面 → 自查、构建、截图 → 并排对比报告。
// 会消耗两种 Agent 的真实额度，只在验收前手动运行：
//   npm run verify:repro -- [--agents claude,codex] [--kinds react,html] [--theme blue] [--skip-agents]
// 报告输出到 drafts/repro-<时间>/index.html（不进 Git）。
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { applyToProject } from '../plugins/design-pal/bin/lib/apply.mjs';

const root = resolve(import.meta.dirname, '..');
const plugin = join(root, 'plugins/design-pal');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const agents = arg('agents', 'claude,codex').split(',');
const kinds = arg('kinds', 'react,html').split(',');
const theme = arg('theme', 'blue');
const skip = args.includes('--skip-agents');
const outDir = join(root, 'drafts', 'repro-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
mkdirSync(outDir, { recursive: true });

const TASK = '做一个「订单列表」页面：展示订单号、客户、金额、状态、下单时间，支持按状态筛选、搜索订单号、查看订单详情、批量标记为已发货。用示例数据即可。不要问我问题，直接做完，做完按项目规则自查。';
const git = (dir, ...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });

function makeProject(kind) {
  const dir = mkdtempSync(join(tmpdir(), `dp-repro-${kind}-`));
  git(dir, 'init', '-q'); git(dir, 'config', 'user.email', 'repro@example.com'); git(dir, 'config', 'user.name', 'repro');
  if (kind === 'react') writeFileSync(join(dir, 'README.md'), '# 订单后台\n\n给运营团队用的订单管理后台。\n');
  else {
    writeFileSync(join(dir, 'README.md'), '# 订单后台（纯 HTML）\n\n不使用任何前端框架，页面写在 index.html 中，脚本用原生 JavaScript。\n');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'orders-html', private: true }, null, 2));
    writeFileSync(join(dir, 'index.html'), '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<title>订单后台</title>\n</head>\n<body>\n</body>\n</html>\n');
  }
  git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', 'init');
  applyToProject({ projectDir: dir, pluginRoot: plugin, libId: 'efficiency', themeId: theme, install: false });
  if (kind === 'react') symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'));
  writeFileSync(join(dir, '.git/info/exclude'), 'node_modules\n.agents/\n');
  git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', 'apply design-pal');
  return dir;
}

function runAgent(agent, dir) {
  const t0 = Date.now();
  let r;
  if (agent === 'claude') {
    r = spawnSync('claude', ['-p', TASK, '--model', 'claude-opus-5-5', '--effort', 'medium', '--plugin-dir', plugin, '--permission-mode', 'acceptEdits', '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash(node:*)', 'Bash(npm run build)', 'Bash(npx tsc:*)', 'Bash(ls:*)'], { cwd: dir, encoding: 'utf8', timeout: 20 * 60e3 });
  } else {
    // Codex：项目内放一份使用技能（指明插件位置），沙箱限定在项目目录内读写
    const skillDir = join(dir, '.agents/skills/design-pal');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), readFileSync(join(plugin, 'skills/design-pal/SKILL.md'), 'utf8').replace(/插件根目录是本 `SKILL\.md` 所在目录的上两级[^，]*，/, `插件根目录是 \`${plugin}\`，`));
    r = spawnSync('codex', ['exec', '-c', 'model="gpt-6-sol"', '-c', 'model_reasoning_effort="high"', '--sandbox', 'workspace-write', '-C', dir, TASK], { encoding: 'utf8', timeout: 20 * 60e3 });
  }
  const tail = (r.stdout || '').trim().split('\n').slice(-12).join('\n');
  return { ok: r.status === 0, seconds: Math.round((Date.now() - t0) / 1000), tail: tail || (r.stderr || r.error?.message || '').trim().split('\n').slice(-5).join('\n') };
}

function checkAndBuild(kind, dir) {
  const check = spawnSync(process.execPath, ['design-pal/bin/check.mjs', '--json'], { cwd: dir, encoding: 'utf8' });
  let problems = [];
  try { problems = JSON.parse(check.stdout); } catch { problems = [{ rule: '自查未能运行', text: check.stderr }]; }
  let page = join(dir, 'index.html'), build = { ok: true, message: '无需构建' };
  if (kind === 'react') {
    const b = spawnSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--base', './', '--logLevel', 'error'], { cwd: dir, encoding: 'utf8' });
    build = { ok: b.status === 0, message: b.status === 0 ? '构建成功' : (b.stderr || b.stdout).trim().split('\n').slice(-4).join(' ') };
    page = join(dir, 'dist/index.html');
  }
  return { problems, build, page };
}

async function shoot(url, file) {
  const { chromium } = await import('@playwright/test');
  const b = await chromium.launch({ channel: 'chrome' });
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto(url);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: file });
    return true;
  } catch { return false; } finally { await b.close(); }
}

// React 构建产物用模块脚本，浏览器不允许从本地文件直接加载，需经本机网页服务打开
function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const srv = createServer((q, r) => {
    let p = join(dir, decodeURIComponent(q.url.split('?')[0]));
    if (p.endsWith('/')) p += 'index.html';
    if (!existsSync(p)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
    r.end(readFileSync(p));
  }).listen(0);
  return new Promise((ok) => srv.on('listening', () => ok({ url: `http://localhost:${srv.address().port}/`, close: () => srv.close() })));
}

const results = [];
const demo = pathToFileURL(join(plugin, 'libraries/efficiency/demo.html')).href;
await shoot(`${demo}?theme=${theme}&mode=light#list`, join(outDir, 'reference.png'));
for (const kind of kinds) {
  for (const agent of agents) {
    const dir = makeProject(kind);
    console.log(`▶ ${agent} · ${kind === 'react' ? 'React 空项目' : '纯 HTML 项目'}：${dir}`);
    const run = skip ? { ok: false, seconds: 0, tail: '（未运行：--skip-agents）' } : runAgent(agent, dir);
    const cb = checkAndBuild(kind, dir);
    const img = `${agent}-${kind}.png`;
    let shot = false;
    if (existsSync(cb.page)) {
      const srv = kind === 'react' ? await serve(join(dir, 'dist')) : null;
      shot = await shoot(srv ? srv.url : pathToFileURL(cb.page).href, join(outDir, img));
      srv?.close();
    }
    results.push({ agent, kind, dir, run, ...cb, img: shot ? img : null });
    console.log(`  Agent：${run.ok ? '完成' : '未完成'}（${run.seconds}s）；自查问题 ${cb.problems.length} 处；${cb.build.message}`);
  }
}

const esc = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
writeFileSync(join(outDir, 'index.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>复刻验证报告</title>
<style>body{margin:0;font:14px/1.6 -apple-system,"PingFang SC",sans-serif;background:#F5F5F4;color:#1C1917}.wrap{max-width:1400px;margin:0 auto;padding:28px 24px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0 32px}.card{background:#fff;border:1px solid #E7E5E4;border-radius:12px;overflow:hidden}
.card h3{margin:0;padding:10px 14px;font-size:14px;border-bottom:1px solid #E7E5E4}.card img{display:block;width:100%}.meta{padding:10px 14px;font-size:13px;color:#57534E}
pre{white-space:pre-wrap;background:#F0EFED;border-radius:8px;padding:8px;font-size:12px}.ok{color:#15803D}.bad{color:#B91C1C}</style></head><body><div class="wrap">
<h1>复刻验证报告</h1><p>任务：${esc(TASK)}</p><p>颜色主题：${esc(theme)}。左侧为组件库演示页中的「数据列表」示例（参考），右侧为 Agent 在空项目中只凭需求做出的页面。请对照布局、颜色、字体、间距、圆角、组件样式、交互方式判断是否「肉眼一致」。</p>
${results.map((r) => `<h2>${r.agent === 'claude' ? 'Claude Code' : 'Codex'} · ${r.kind === 'react' ? 'React 空项目' : '纯 HTML 项目'}</h2>
<div class="row"><div class="card"><h3>参考：演示页「数据列表」</h3><img src="reference.png"></div>
<div class="card"><h3>Agent 做出的页面</h3>${r.img ? `<img src="${r.img}">` : '<div class="meta bad">没有可截图的页面</div>'}
<div class="meta">Agent：<span class="${r.run.ok ? 'ok' : 'bad'}">${r.run.ok ? '完成' : '未完成'}</span>（${r.run.seconds}s）　构建：<span class="${r.build.ok ? 'ok' : 'bad'}">${esc(r.build.message)}</span>　自查：<span class="${r.problems.length ? 'bad' : 'ok'}">${r.problems.length ? r.problems.length + ' 处问题' : '通过'}</span><br>项目目录：${esc(r.dir)}
${r.problems.length ? `<pre>${esc(r.problems.slice(0, 10).map((p) => `${p.file}:${p.line} [${p.rule}] ${p.text}`).join('\n'))}</pre>` : ''}<pre>${esc(r.run.tail)}</pre></div></div></div>`).join('')}
</div></body></html>`);
console.log(`\n报告：${join(outDir, 'index.html')}`);
