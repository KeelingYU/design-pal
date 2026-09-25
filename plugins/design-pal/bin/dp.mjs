#!/usr/bin/env node
// design-pal 命令行（零依赖，Node 18+）。由使用技能调用；用户一般不直接运行。
//   node dp.mjs list [--json]                                   列出组件库、颜色主题与适用说明（用于推荐）
//   node dp.mjs gallery                                          在浏览器打开画廊
//   node dp.mjs apply   --project <dir> --library <id> --theme <id> [--no-install]
//   node dp.mjs theme   --project <dir> --theme <id> [--force]   换颜色主题（--force：用户同意放弃颜色定制时）
//   node dp.mjs upgrade --project <dir> [--apply] [--resolve <文件>=ours|theirs ...]
//                                                                不带 --apply 只给出升级计划；冲突逐条选择后带上 --resolve 与 --apply 执行
//   node dp.mjs diff    --project <dir>                          列出相对原版的项目定制
// 通用：--json 输出机器可读结果。退出码：0 成功，1 需要用户处理（如冲突），2 前置条件不满足。
import { execFileSync, spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DpError } from './lib/project.mjs';
import { applyToProject, loadLibrary } from './lib/apply.mjs';

const pluginRoot = resolve(import.meta.dirname, '..');
const [cmd, ...rest] = process.argv.slice(2);
const opt = {};
const multi = { resolve: [] };
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2);
  const v = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
  if (k in multi) multi[k].push(v); else opt[k] = v;
}
const json = !!opt.json;
const out = (human, data) => console.log(json ? JSON.stringify(data, null, 2) : human);
const project = resolve(opt.project || process.cwd());

function openInBrowser(file) {
  const [bin, args] = process.platform === 'darwin' ? ['open', [file]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', file]] : ['xdg-open', [file]];
  spawn(bin, args, { detached: true, stdio: 'ignore' }).unref();
}

async function main() {
  switch (cmd) {
    case 'list': {
      const libs = readdirSync(join(pluginRoot, 'libraries')).map((id) => {
        const { meta, themes } = loadLibrary(pluginRoot, id);
        return { id, name: meta.name, version: meta.version, summary: meta.summary, fitFor: meta.fitFor, fitDesc: meta.fitDesc, themes: themes.map((t) => ({ id: t.id, name: t.name, desc: t.desc, defaultMode: t.defaultMode })) };
      });
      out(libs.map((l) => `${l.name}（${l.id}）v${l.version}：${l.summary}\n  适用：${l.fitDesc}\n  颜色主题：${l.themes.map((t) => `${t.name}（${t.id}，${t.desc}）`).join('；')}`).join('\n\n'), libs);
      return 0;
    }
    case 'gallery': {
      const file = join(pluginRoot, 'gallery.html');
      openInBrowser(file);
      out(`已在浏览器打开画廊：${file}`, { file });
      return 0;
    }
    case 'apply': {
      if (!opt.library || !opt.theme) throw new DpError('USAGE', '需要 --library 与 --theme。可先运行 list 查看。');
      const r = applyToProject({ projectDir: project, pluginRoot, libId: opt.library, themeId: opt.theme, install: !opt['no-install'] });
      out(
        [`✔ 已应用 ${r.library}，颜色主题「${r.theme}」（项目类型：${r.kind}）`, `新增 ${r.created.length} 个文件（另存原版副本 ${r.baselineFiles} 个，用于日后升级）`, r.modified.length ? `追加修改：${r.modified.join('、')}` : '', ...r.todos.map((t) => `待办：${t}`)].filter(Boolean).join('\n'),
        r
      );
      return 0;
    }
    case 'diff': {
      execFileSync(process.execPath, [join(project, 'design-pal/bin/check.mjs'), '--diff', ...(json ? ['--json'] : [])], { stdio: 'inherit', env: { ...process.env, DP_PROJECT_ROOT: project } });
      return 0;
    }
    case 'theme':
    case 'upgrade': {
      const { runTheme, runUpgrade } = await import('./lib/update.mjs');
      const r = cmd === 'theme'
        ? runTheme({ projectDir: project, pluginRoot, themeId: opt.theme, force: !!opt.force })
        : runUpgrade({ projectDir: project, pluginRoot, apply: !!opt.apply, resolutions: multi.resolve });
      out(r.message, r);
      return r.status === 'conflicts' ? 1 : 0;
    }
    default:
      console.log('用法见 dp.mjs 文件开头的说明。');
      return cmd ? 2 : 0;
  }
}

main().then((code) => (process.exitCode = code)).catch((e) => {
  if (e instanceof DpError) {
    out(`✘ ${e.message}${e.detail ? '\n  ' + [].concat(e.detail).join('\n  ') : ''}`, { error: e.code, message: e.message, detail: e.detail });
    process.exitCode = 2;
  } else throw e;
});
