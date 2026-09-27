// 发布：只有用户确认（confirm）后才提交并推送到公开仓库。
// 保护：① 草稿在确认前不进入 main；② 推送前核对与线上相比将公开的全部文件，出现不属于本次发布的就停止；
// ③ 过程文件（docs/、drafts/）与疑似密钥一律拦截；④ 待推送提交的作者必须是 GitHub noreply 邮箱。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DesignError, loadDraft, saveDraft } from './draft.mjs';

export const NOREPLY = { name: 'KeelingYU', email: '200402043+KeelingYU@users.noreply.github.com' };
const FORBIDDEN = /^(docs|drafts)\//;
const SECRET = /(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;

// core.quotePath=false：中文文件名按原样列出，否则清单显示为转义码、密钥检查也读不到这些文件
const git = (root, args, opts = {}) => execFileSync('git', ['-c', 'core.quotePath=false', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const tryGit = (root, args) => { try { return git(root, args); } catch { return null; } };

const VERSION_FILES = ['plugins/design-pal/.claude-plugin/plugin.json', 'plugins/design-pal/plugin.json', 'package.json'];
// 示例页允许范围之外，只额外允许演示页自身的界面测试；发布规则等工具改动走维护发布，不随示例页夹带。
const PAGE_SUPPORT_FILES = new Set(['tests/e2e/demo.spec.ts']);
const PAGE_SCOPE = (lib) => new RegExp(`^(plugins/design-pal/libraries/${lib}/(patterns/|demo\\.html$|reference\\.html$|RULES\\.md$|library\\.json$)|src/(demo|reference)/|plugins/design-pal/gallery\\.html$)`);

/** 本次发布允许改动的文件（相对仓库根） */
export function releaseFiles(release, root) {
  const lib = `plugins/design-pal/libraries/${release.library}`;
  if (release.kind === 'page') {
    const changed = git(root, ['diff', '--name-only', `main...${release.branch}`]).split('\n').filter(Boolean);
    return [...new Set([...changed, `${lib}/library.json`, `${lib}/demo.html`, `${lib}/reference.html`, 'plugins/design-pal/gallery.html', ...VERSION_FILES])];
  }
  return [
    `${lib}/themes/${release.theme.id}.json`, `${lib}/styles/themes/${release.theme.id}.css`, `${lib}/library.json`, `${lib}/demo.html`, `${lib}/reference.html`,
    'plugins/design-pal/gallery.html', 'plugins/design-pal/.claude-plugin/plugin.json', 'plugins/design-pal/plugin.json', 'package.json'
  ];
}

const bumpMinor = (v) => { const [a, b] = v.split('.').map(Number); return `${a}.${b + 1}.0`; };

/** 把待发布包写进组件库（只在确认后、在 main 上调用） */
function applyRelease(root, release) {
  const lib = join(root, 'plugins/design-pal/libraries', release.library);
  if (release.kind === 'page') {
    try { git(root, ['merge', '--squash', release.branch]); }
    catch (e) { tryGit(root, ['merge', '--abort']); tryGit(root, ['reset', '-q', '--merge']); throw new DesignError('MERGE_CONFLICT', '示例页草稿与当前版本有冲突，需要先在草稿分支上合并最新的 main。'); }
  } else writeFileSync(join(lib, 'themes', release.theme.id + '.json'), JSON.stringify(release.theme, null, 2) + '\n');
  const meta = JSON.parse(readFileSync(join(lib, 'library.json'), 'utf8'));
  if (release.kind !== 'page') meta.colorThemes = [...new Set([...meta.colorThemes, release.theme.id])];
  meta.version = release.version;
  meta.changelog = [{ version: release.version, date: new Date().toISOString().slice(0, 10), notes: release.note }, ...(meta.changelog || [])];
  writeFileSync(join(lib, 'library.json'), JSON.stringify(meta, null, 2) + '\n');
  for (const p of VERSION_FILES) {
    const f = join(root, p);
    if (!existsSync(f)) continue;
    const j = JSON.parse(readFileSync(f, 'utf8'));
    j.version = bumpMinor(j.version);
    writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
  }
}

/** 发布前检查：返回将公开的文件与问题；有问题时不可推送 */
export function inspectOutgoing(root, allowed, { remote = 'origin', branch = 'main', upstream = `${remote}/${branch}` } = {}) {
  const hasUpstream = tryGit(root, ['rev-parse', '--verify', upstream]) !== null;
  const range = hasUpstream ? `${upstream}..${branch}` : branch;
  const files = hasUpstream ? git(root, ['diff', '--name-only', upstream, branch]).split('\n').filter(Boolean) : git(root, ['ls-tree', '-r', '--name-only', branch]).split('\n').filter(Boolean);
  const problems = [];
  const unrelated = allowed ? files.filter((f) => !allowed.includes(f)) : [];
  if (unrelated.length) problems.push({ code: 'UNRELATED', message: '有不属于本次发布的内容也会被一起公开，已停止。', files: unrelated });
  const tree = git(root, ['ls-tree', '-r', '--name-only', branch]).split('\n');
  const forbidden = tree.filter((f) => FORBIDDEN.test(f));
  if (forbidden.length) problems.push({ code: 'FORBIDDEN', message: '过程文件或草稿被纳入了版本库，禁止公开。', files: forbidden });
  const authors = [...new Set(git(root, ['log', range, '--format=%ae']).split('\n').filter(Boolean))];
  const bad = authors.filter((e) => !/@users\.noreply\.github\.com$/.test(e));
  if (bad.length) problems.push({ code: 'EMAIL', message: '待推送的提交中出现了非隐藏邮箱，会公开个人邮箱。', files: bad });
  const secrets = files.filter((f) => { try { return SECRET.test(git(root, ['show', `${branch}:${f}`])); } catch { return false; } });
  if (secrets.length) problems.push({ code: 'SECRET', message: '文件中疑似包含密钥。', files: secrets });
  return { files, problems, hasUpstream };
}

/**
 * 发布颜色主题。confirm=false：只列出将公开的内容（不改动任何东西）；confirm=true：提交并推送。
 * build(root) 负责重建主题 CSS、演示页、参考页、画廊。
 */
export async function publishRelease({ root, id, confirm = false, build, drafts, remote = 'origin', author = NOREPLY }) {
  const s = loadDraft(id, drafts);
  if (!s.release) throw new DesignError('NOT_FINALIZED', '还没有定稿，不能发布。');
  if (s.release.kind === 'page') {
    const outside = git(root, ['diff', '--name-only', `main...${s.release.branch}`]).split('\n').filter((f) => f && !PAGE_SCOPE(s.release.library).test(f) && !PAGE_SUPPORT_FILES.has(f));
    if (outside.length) return { status: 'blocked', problems: [{ code: 'UNRELATED', message: '示例页草稿改动了示例页以外的文件，已停止。', files: outside }] };
  }
  if (tryGit(root, ['remote', 'get-url', remote]) === null) throw new DesignError('NO_REMOTE', '还没有配置公开仓库。首次发布需要先创建公开仓库（需用户确认）。');
  if (git(root, ['status', '--porcelain'])) throw new DesignError('DIRTY', '仓库有未提交的改动，请先处理（发布前必须干净，防止半成品被带出去）。');
  try { git(root, ['fetch', remote]); }
  catch { throw new DesignError('NETWORK', '连不上公开仓库（网络断开或没有权限），这次什么都没有提交，恢复后再发布即可。'); }
  // 版本号在发布时按线上最新版本计算，避免两份草稿从同一版本定稿后先后发布得到相同版本号
  if (!s.publishing) {
    const meta = JSON.parse(git(root, ['show', `main:plugins/design-pal/libraries/${s.release.library}/library.json`]));
    s.release = { ...s.release, fromVersion: meta.version, version: bumpMinor(meta.version) };
  }
  const allowed = releaseFiles(s.release, root);
  const back = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);

  // 重试：之前已提交但推送失败
  const pending = s.publishing && tryGit(root, ['merge-base', '--is-ancestor', s.publishing.commit, 'main']) !== null;
  if (!pending) {
    const before = inspectOutgoing(root, allowed, { remote });
    if (before.problems.length) return { status: 'blocked', problems: before.problems };
    if (!confirm) return { status: 'ready', files: [...new Set([...before.files, ...allowed])].sort(), release: s.release };
    git(root, ['checkout', '-q', 'main']);
    try {
      applyRelease(root, s.release);
      await build(root);
      git(root, ['add', '-A', '--', ...allowed.filter((f) => existsSync(join(root, f)))]);
      git(root, ['-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`, 'commit', '-q', '-m', `feat(release): ${s.release.library} v${s.release.version} · ${s.release.kind === 'page' ? s.release.note : `新增颜色主题「${s.release.theme.name}」`}`]);
      s.publishing = { commit: git(root, ['rev-parse', 'HEAD']), version: s.release.version };
      s.step = 'publishing';
      saveDraft(s, drafts);
    } finally {
      if (git(root, ['rev-parse', '--abbrev-ref', 'HEAD']) !== back) git(root, ['checkout', '-q', back]);
    }
  } else if (!confirm) {
    return { status: 'ready', retry: true, files: inspectOutgoing(root, allowed, { remote }).files, release: s.release };
  }

  const out = inspectOutgoing(root, allowed, { remote });
  if (out.problems.length) return { status: 'blocked', problems: out.problems, committed: s.publishing.commit };
  try { git(root, ['push', remote, 'main']); }
  catch (e) { return { status: 'push-failed', message: String(e.stderr || e.message).trim().split('\n').slice(-2).join(' '), committed: s.publishing.commit }; }
  let note = '';
  if (back !== 'main') {
    try { git(root, ['merge', '-q', '--no-edit', 'main']); }
    catch { tryGit(root, ['merge', '--abort']); note = `已发布；但把发布内容合并回「${back}」分支时有冲突，已取消合并，需要手动合并 main。`; }
  }
  s.step = 'published';
  s.publishedAt = new Date().toISOString();
  delete s.publishing;
  saveDraft(s, drafts);
  return { status: 'published', files: out.files, version: s.release.version, note };
}

/** 放弃发布：已在 main 上提交但尚未推送时，用反向提交撤回（不改写历史），内容退回草稿 */
export function abandonPublish({ root, id, drafts, author = NOREPLY }) {
  const s = loadDraft(id, drafts);
  if (s.publishing) {
    const back = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
    git(root, ['checkout', '-q', 'main']);
    try { git(root, ['-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`, 'revert', '--no-edit', s.publishing.commit]); }
    finally { if (back !== 'main') git(root, ['checkout', '-q', back]); }
    delete s.publishing;
  }
  s.step = 'finalized';
  saveDraft(s, drafts);
  return { status: 'abandoned' };
}

export const publishTheme = publishRelease;

const bumpPatch = (v) => { const [a, b, c] = v.split('.').map(Number); return `${a}.${b}.${c + 1}`; };
const MAINT_PREFIX = 'release: 维护更新';

/**
 * 维护发布：把当前任务分支（工具、测试、文档、组件修复）发布到 main。
 * confirm=false 只列出将公开的文件；改到插件（安装者拿到的内容）时必须提供 note，发布时组件库与插件版本按补丁号递增并写入更新记录。
 */
export async function publishMaintenance({ root, confirm = false, note, build, remote = 'origin', author = NOREPLY }) {
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch === 'main' || branch === 'HEAD') throw new DesignError('WRONG_BRANCH', '请在任务分支上执行维护发布（不在 main 上开发）。');
  if (git(root, ['status', '--porcelain'])) throw new DesignError('DIRTY', '仓库有未提交的改动，请先提交（发布前必须干净，防止半成品被带出去）。');
  if (tryGit(root, ['remote', 'get-url', remote]) === null) throw new DesignError('NO_REMOTE', '还没有配置公开仓库。');
  try { git(root, ['fetch', remote]); }
  catch { throw new DesignError('NETWORK', '连不上公开仓库（网络断开或没有权限），这次什么都没有提交，恢复后再发布即可。'); }
  const upstream = `${remote}/main`;
  if (tryGit(root, ['merge-base', '--is-ancestor', upstream, 'HEAD']) === null) throw new DesignError('BEHIND', '任务分支缺少线上 main 的最新内容，请先把 main 合并进来再发布。');
  let files = git(root, ['diff', '--name-only', upstream, 'HEAD']).split('\n').filter(Boolean);
  if (!files.length) return { status: 'nothing', message: '当前分支与线上一致，没有需要发布的内容。' };

  const pending = git(root, ['log', '-1', '--format=%s']).startsWith(MAINT_PREFIX) && tryGit(root, ['merge-base', '--is-ancestor', 'HEAD', upstream]) === null;
  const affectsInstallers = files.some((f) => f.startsWith('plugins/design-pal/'));
  const libs = [...new Set(files.map((f) => f.match(/^plugins\/design-pal\/libraries\/([^/]+)\//)?.[1]).filter(Boolean))];
  if (affectsInstallers && !pending && !note) throw new DesignError('NO_NOTE', '这次改动会影响安装者拿到的插件，请用一句话写更新说明（升级时会显示给用户）。');
  const libJson = (lib) => join(root, 'plugins/design-pal/libraries', lib, 'library.json');
  const versions = Object.fromEntries(libs.map((lib) => { const v = JSON.parse(readFileSync(libJson(lib), 'utf8')).version; return [lib, pending ? v : bumpPatch(v)]; }));

  const check = () => inspectOutgoing(root, null, { remote, branch: 'HEAD', upstream });
  const before = check();
  if (before.problems.length) return { status: 'blocked', problems: before.problems };
  if (!confirm) return { status: 'ready', files: affectsInstallers && !pending ? [...new Set([...files, ...VERSION_FILES, ...libs.map((l) => `plugins/design-pal/libraries/${l}/library.json`)])].sort() : files, affectsInstallers, versions };

  if (affectsInstallers && !pending) {
    const today = new Date().toISOString().slice(0, 10);
    for (const lib of libs) {
      const meta = JSON.parse(readFileSync(libJson(lib), 'utf8'));
      meta.version = versions[lib];
      meta.changelog = [{ version: versions[lib], date: today, notes: note }, ...(meta.changelog || [])];
      writeFileSync(libJson(lib), JSON.stringify(meta, null, 2) + '\n');
    }
    for (const p of VERSION_FILES) {
      const f = join(root, p);
      if (!existsSync(f)) continue;
      const j = JSON.parse(readFileSync(f, 'utf8'));
      j.version = bumpPatch(j.version);
      writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
    }
    await build(root);
    git(root, ['add', '-A']);
    git(root, ['-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`, 'commit', '-q', '-m', `${MAINT_PREFIX} · ${note}`]);
    const after = check();
    if (after.problems.length) return { status: 'blocked', problems: after.problems, committed: git(root, ['rev-parse', 'HEAD']) };
    files = after.files;
  }
  try { git(root, ['push', remote, 'HEAD:main']); }
  catch (e) { return { status: 'push-failed', message: String(e.stderr || e.message).trim().split('\n').slice(-2).join(' ') }; }
  git(root, ['fetch', '-q', remote]);
  git(root, ['branch', '-f', 'main', 'HEAD']);
  return { status: 'published', files, affectsInstallers, versions };
}
