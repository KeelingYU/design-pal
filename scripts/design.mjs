#!/usr/bin/env node
// design-pal 设计工具命令行（仅在本仓库中使用，由设计技能调用）。
//   status                                              列出未完成的草稿（用于续做）
//   new --id <编号> --library <组件库> --name <名称> [--from <已有颜色主题>]
//   directions --id <编号> --file <方向.json>            生成配色方向页（2～3 个方向）并在浏览器打开
//   choose --id <编号> --label A                        选定方向
//   update --id <编号> --file <修改.json> [--accept light.text3/surface ...]   修改配色；--accept 记录用户坚持保留的低对比组合
//   preview --id <编号>                                  生成草稿演示页并在浏览器打开
//   finalize --id <编号> --desc <简介>                    定稿，生成待发布包（不改动组件库）
//   page --id <编号> --library <组件库> --name <名称>        开始替换示例页（创建草稿分支 draft/<编号> 并切换过去）
//   page-finalize --id <编号> --note <一句话说明>          示例页定稿（草稿分支上的改动需已提交）
//   publish --id <编号> [--confirm]                      不带 --confirm 只列出将公开的文件；带上才提交并推送
//   abandon --id <编号>                                  放弃发布，内容退回草稿
//   maintain [--note <更新说明>] [--confirm]              维护发布：把当前任务分支（工具、测试、文档、组件修复）发布到 main；改到插件时需 --note
// 通用：--json、--no-open。
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DesignError, ROOT, libraryMeta, chooseDirection, draftDir, finalizePage, finalizeTheme, listDrafts, loadDraft, newPageDraft, newThemeDraft, setDirections, updateTheme } from './lib/draft.mjs';
import { abandonPublish, publishMaintenance, publishTheme } from './lib/publish.mjs';
import { buildDemo, buildGallery, buildReference, buildThemes } from './build.mjs';
import { directionsHtml } from './lib/directions-page.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const opt = { accept: [] };
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith('--')) continue;
  const k = rest[i].slice(2);
  const v = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
  Array.isArray(opt[k]) ? opt[k].push(v) : (opt[k] = v);
}
const json = !!opt.json;
const out = (human, data) => console.log(json ? JSON.stringify(data, null, 2) : human);
const open = (f) => { if (!opt['no-open']) spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [f], { detached: true, stdio: 'ignore' }).unref(); };
const issuesText = (issues) => (issues.length ? issues.map((i) => `  ${i.accepted ? '（已保留）' : '⚠'} ${i.mode === 'light' ? '亮色' : '暗色'} ${i.label} ${i.ratio}:1，建议改为 ${i.suggestion}`).join('\n') : '  可读性检查全部通过');

async function fullBuild(root) {
  buildThemes();
  buildGallery();
  const { readdirSync } = await import('node:fs');
  for (const lib of readdirSync(join(root, 'plugins/design-pal/libraries'))) { await buildDemo(lib); await buildReference(lib); }
}

async function main() {
  switch (cmd) {
    case 'status': {
      const d = listDrafts();
      out(d.length ? '未完成的草稿：\n' + d.map((x) => `  ${x.id}「${x.name}」（${x.library}）进度：${x.step}，更新于 ${x.updatedAt.slice(0, 16).replace('T', ' ')}`).join('\n') : '没有未完成的草稿。', d);
      break;
    }
    case 'new': {
      const s = newThemeDraft({ id: opt.id, library: opt.library || 'efficiency', name: opt.name, from: opt.from });
      out(`已创建草稿「${s.name}」（${s.id}）。参考图等素材请放在 ${join(draftDir(s.id), 'references')}，它们不会被公开。`, s);
      break;
    }
    case 'directions': {
      const { state, report } = setDirections(opt.id, JSON.parse(readFileSync(opt.file, 'utf8')));
      const demo = join(draftDir(state.id), 'directions-demo.html');
      await buildDemo(state.library, { extraThemes: state.directions, outFile: demo });
      const page = join(draftDir(state.id), 'directions.html');
      writeFileSync(page, directionsHtml(state, libraryMeta(state.library).meta.name));
      open(page);
      out(`已生成配色方向页：${page}\n` + report.map((r) => `方向 ${r.label}「${r.name}」\n${issuesText(r.issues)}`).join('\n'), { page, report });
      break;
    }
    case 'choose': {
      const { state, issues } = chooseDirection(opt.id, opt.label);
      out(`已选定方向，进入修改阶段。\n${issuesText(issues)}`, { state, issues });
      break;
    }
    case 'update': {
      const patch = opt.file ? JSON.parse(readFileSync(opt.file, 'utf8')) : {};
      const { issues } = updateTheme(opt.id, patch, opt.accept);
      out(`已更新配色。\n${issuesText(issues)}`, { issues });
      break;
    }
    case 'preview': {
      const s = loadDraft(opt.id);
      if (!s.theme) throw new DesignError('NO_THEME_YET', '还没有选定配色方向。');
      const file = join(draftDir(s.id), 'preview.html');
      await buildDemo(s.library, { extraThemes: [s.theme], outFile: file });
      open(file);
      out(`已生成草稿演示页：${file}`, { file });
      break;
    }
    case 'finalize': {
      const r = finalizeTheme(opt.id, { desc: opt.desc, note: opt.note });
      out(`已定稿「${r.theme.name}」。发布后组件库将升级为 v${r.version}（当前 v${r.fromVersion}）。\n组件库本身尚未改动；用户确认发布后才会写入并公开。`, r);
      break;
    }
    case 'page': {
      const st = newPageDraft({ id: opt.id, library: opt.library || 'efficiency', name: opt.name });
      out(`已创建示例页草稿「${st.name}」，并切换到草稿分支 ${st.branch}。在 plugins/design-pal/libraries/${st.library}/patterns/ 中编写新页面、接入 src/demo/main.tsx，改完运行 npm run build 预览并提交。`, st);
      break;
    }
    case 'page-finalize': {
      const r = finalizePage(opt.id, { note: opt.note });
      out(`已定稿：${r.note}。发布后组件库将升级为 v${r.version}。用户确认发布前 main 不会变化。`, r);
      break;
    }
    case 'publish': {
      const r = await publishTheme({ root: ROOT, id: opt.id, confirm: !!opt.confirm, build: fullBuild });
      const list = (fs) => fs.map((f) => '  ' + f).join('\n');
      const human = {
        ready: () => `将公开以下文件（与线上相比）：\n${list(r.files || [])}\n发布后${r.release?.library}组件库为 v${r.release?.version}。请用户确认后加 --confirm 执行。`,
        blocked: () => '✘ 已停止发布：\n' + (r.problems || []).map((p) => `  ${p.message}\n${list(p.files)}`).join('\n'),
        'push-failed': () => `✘ 推送失败：${r.message}\n已在本机提交，可稍后重试（再次 publish --confirm），或 abandon 放弃。`,
        published: () => `✔ 已发布 v${r.version}，公开了 ${r.files.length} 个文件。${r.note ? '\n' + r.note : ''}`
      }[r.status];
      out(human ? human() : JSON.stringify(r), r);
      if (r.status === 'blocked' || r.status === 'push-failed') process.exitCode = 1;
      break;
    }
    case 'maintain': {
      const r = await publishMaintenance({ root: ROOT, confirm: !!opt.confirm, note: typeof opt.note === 'string' ? opt.note : undefined, build: fullBuild });
      const list = (fs) => fs.map((f) => '  ' + f).join('\n');
      const ver = r.versions && Object.keys(r.versions).length ? `组件库版本：${Object.entries(r.versions).map(([k, v]) => `${k} v${v}`).join('、')}。` : '不改变组件库版本。';
      const human = {
        nothing: () => r.message,
        ready: () => `将公开以下文件（与线上相比）：\n${list(r.files)}\n${r.affectsInstallers ? '会影响安装者拿到的插件，' : '不影响安装者拿到的插件，'}${ver}请用户确认后加 --confirm 执行。`,
        blocked: () => '✘ 已停止发布：\n' + r.problems.map((p) => `  ${p.message}\n${list(p.files)}`).join('\n'),
        'push-failed': () => `✘ 推送失败：${r.message}\n已在本机提交，可稍后再次 maintain --confirm 重试。`,
        published: () => `✔ 已发布到 main，公开了 ${r.files.length} 个文件。${ver}`
      }[r.status];
      out(human ? human() : JSON.stringify(r), r);
      if (r.status === 'blocked' || r.status === 'push-failed') process.exitCode = 1;
      break;
    }
    case 'abandon': {
      out('已放弃发布，内容保留在草稿中。', abandonPublish({ root: ROOT, id: opt.id }));
      break;
    }
    default:
      console.log('用法见 scripts/design.mjs 文件开头。');
  }
}

main().catch((e) => {
  if (e instanceof DesignError) { out(`✘ ${e.message}${e.detail ? '\n  ' + [].concat(e.detail).join('\n  ') : ''}`, { error: e.code, message: e.message, detail: e.detail }); process.exitCode = 2; }
  else throw e;
});
