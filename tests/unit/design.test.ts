import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chooseDirection, finalizePage, finalizeTheme, listDrafts, newPageDraft, newThemeDraft, setDirections, updateTheme } from '../../scripts/lib/draft.mjs';
import { abandonPublish, publishTheme, NOREPLY } from '../../scripts/lib/publish.mjs';
import { themeToCss } from '../../plugins/design-pal/bin/lib/theme.mjs';
import { temps } from './helpers';

const REAL = join(import.meta.dirname, '../..');
const tmp = (p: string) => { const d = mkdtempSync(join(tmpdir(), p)); temps.push(d); return d; };
const git = (dir: string, ...a: string[]) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const errorOf = async (fn: () => unknown) => { try { await fn(); } catch (e: any) { return e; } throw new Error('应当报错'); };
const blue = JSON.parse(readFileSync(join(REAL, 'plugins/design-pal/libraries/efficiency/themes/blue.json'), 'utf8'));
const palette = (primary: string) => ({ light: { ...blue.light, primary }, dark: { ...blue.dark }, desc: '测试方向' });

/** 最小的 design-pal 仓库副本 + 本地「公开仓库」 */
function makeSite() {
  const root = tmp('dp-site-');
  const lib = 'plugins/design-pal/libraries/efficiency';
  for (const p of [`${lib}/library.json`, `${lib}/themes`, `${lib}/styles/themes`, `${lib}/patterns`, `${lib}/react/Button.tsx`, 'plugins/design-pal/.claude-plugin/plugin.json', 'plugins/design-pal/plugin.json', 'package.json'])
    cpSync(join(REAL, p), join(root, p), { recursive: true });
  mkdirSync(join(root, `${lib}/styles/themes`), { recursive: true });
  writeFileSync(join(root, '.gitignore'), 'docs/\ndrafts/\n');
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.name', NOREPLY.name); git(root, 'config', 'user.email', NOREPLY.email);
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init');
  const remote = tmp('dp-remote-');
  git(remote, 'init', '-q', '--bare', '-b', 'main');
  git(root, 'remote', 'add', 'origin', remote);
  git(root, 'push', '-q', 'origin', 'main');
  git(root, 'checkout', '-q', '-b', 'dev');
  return { root, remote, libRoot: join(root, 'plugins/design-pal/libraries'), drafts: tmp('dp-drafts-') };
}
const build = async (root: string) => {
  const lib = join(root, 'plugins/design-pal/libraries/efficiency');
  for (const id of JSON.parse(readFileSync(join(lib, 'library.json'), 'utf8')).colorThemes)
    writeFileSync(join(lib, 'styles/themes', id + '.css'), themeToCss(JSON.parse(readFileSync(join(lib, 'themes', id + '.json'), 'utf8'))));
  writeFileSync(join(root, 'plugins/design-pal/gallery.html'), '<!-- gallery -->');
};
function finalized(site: ReturnType<typeof makeSite>, id: string, name: string) {
  newThemeDraft({ id, library: 'efficiency', name, from: 'blue' }, site.drafts, site.libRoot);
  updateTheme(id, { light: { primary: '#1F6F50' }, desc: `${name}测试` }, [], site.drafts);
  return finalizeTheme(id, {}, site.drafts, site.libRoot);
}
const remoteFiles = (site: ReturnType<typeof makeSite>) => git(site.remote, 'ls-tree', '-r', '--name-only', 'main').split('\n');

describe('设计草稿', () => {
  const drafts = tmp('dp-drafts-');

  it('从已有颜色主题起步；中断后能在草稿列表中找到进度（续做）', () => {
    newThemeDraft({ id: 'green', library: 'efficiency', name: '墨绿', from: 'blue' }, drafts);
    const list = listDrafts(drafts);
    expect(list).toEqual([expect.objectContaining({ id: 'green', name: '墨绿', step: 'editing' })]);
    expect(existsSync(join(drafts, 'green/references'))).toBe(true);
  });

  it('生成 2～3 个配色方向并选定其一', () => {
    (newThemeDraft as any)({ id: "warm", library: "efficiency", name: "暖色" }, drafts);
    const { report } = setDirections('warm', [palette('#1F6F50'), palette('#A4501F'), palette('#9F1239')], drafts);
    expect(report.map((r: any) => r.label)).toEqual(['A', 'B', 'C']);
    const { state } = chooseDirection('warm', 'B', drafts);
    expect(state.theme.light.primary).toBe('#A4501F');
    expect(state.step).toBe('editing');
  });

  it('文字颜色太浅：给出警告和建议色；未处理时不能定稿；用户坚持保留后可以定稿并在主题中标注', () => {
    const { issues } = updateTheme('green', { light: { text3: '#C4C8CE' } }, [], drafts);
    const bad = issues.filter((i: any) => i.fg === 'text3' && i.mode === 'light');
    expect(bad.length).toBeGreaterThan(0);
    expect(bad[0].suggestion).toMatch(/^#[0-9A-F]{6}$/);
    return errorOf(() => finalizeTheme('green', { desc: '稳重的墨绿' }, drafts)).then((e) => {
      expect(e.code).toBe('LOW_CONTRAST');
      updateTheme('green', {}, bad.map((b: any) => b.key), drafts);
      const release = finalizeTheme('green', { desc: '稳重的墨绿' }, drafts);
      expect(release.version).toBe('1.1.0');
      expect(release.theme.acceptedLowContrast).toEqual(bad.map((b: any) => b.key));
    });
  });

  it('与已有颜色主题重名时不能定稿', async () => {
    newThemeDraft({ id: 'blue2', library: 'efficiency', name: '商务蓝', from: 'cyan' }, drafts);
    updateTheme('blue2', { desc: '重复' }, [], drafts);
    expect((await errorOf(() => finalizeTheme('blue2', {}, drafts))).code).toBe('DUPLICATE');
  });

  it('修改里含非颜色内容（如圆角）或没有任何有效改动时报错，不会误报「已更新」', () => {
    const drafts = tmp('dp-drafts-');
    newThemeDraft({ id: 'radius', library: 'efficiency', name: '圆角测试', from: 'blue' }, drafts);
    expect(() => updateTheme('radius', { radius: '2px' } as any, [], drafts)).toThrow(/只能修改颜色/);
    expect(() => updateTheme('radius', {}, [], drafts)).toThrow(/没有.*改动/);
  });

  it('定稿只生成待发布包，不改动组件库', () => {
    const before = readFileSync(join(REAL, 'plugins/design-pal/libraries/efficiency/library.json'), 'utf8');
    expect(readFileSync(join(REAL, 'plugins/design-pal/libraries/efficiency/library.json'), 'utf8')).toBe(before);
    expect(existsSync(join(REAL, 'plugins/design-pal/libraries/efficiency/themes/green.json'))).toBe(false);
  });
});

describe('发布（公开前的保护）', () => {
  it('不带确认：只列出将公开的文件，不提交、不推送', async () => {
    const site = makeSite();
    finalized(site, 'green', '墨绿');
    const head = git(site.root, 'rev-parse', 'main');
    const r = await (publishTheme as any)({ root: site.root, id: 'green', drafts: site.drafts, build });
    expect(r.status).toBe('ready');
    expect(r.files).toContain('plugins/design-pal/libraries/efficiency/themes/green.json');
    expect(git(site.root, 'rev-parse', 'main')).toBe(head);
    expect(remoteFiles(site)).not.toContain('plugins/design-pal/libraries/efficiency/themes/green.json');
  });

  it('先对主题 X 说「先不发」，再发布主题 Y：只有 Y 被公开', async () => {
    const site = makeSite();
    finalized(site, 'xtheme', '主题X');
    finalized(site, 'ytheme', '主题Y');
    const r = await (publishTheme as any)({ root: site.root, id: 'ytheme', confirm: true, drafts: site.drafts, build });
    expect(r.status).toBe('published');
    const files = remoteFiles(site);
    expect(files).toContain('plugins/design-pal/libraries/efficiency/themes/ytheme.json');
    expect(files.join('\n')).not.toMatch(/xtheme/);
    expect(git(site.remote, 'log', '-1', '--format=%ae', 'main')).toBe(NOREPLY.email);
    expect(JSON.parse(git(site.remote, 'show', 'main:plugins/design-pal/libraries/efficiency/library.json')).version).toBe('1.1.0');
    expect(git(site.root, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('dev');
    expect(existsSync(join(site.root, 'plugins/design-pal/libraries/efficiency/themes/ytheme.json'))).toBe(true); // 已合并回开发分支
  });

  it('main 上有不属于本次发布的内容时停止，不推送', async () => {
    const site = makeSite();
    git(site.root, 'checkout', '-q', 'main');
    writeFileSync(join(site.root, 'half-done.ts'), 'export {}\n');
    git(site.root, 'add', '-A'); git(site.root, 'commit', '-q', '-m', 'wip');
    git(site.root, 'checkout', '-q', 'dev');
    finalized(site, 'green', '墨绿');
    const r = await (publishTheme as any)({ root: site.root, id: 'green', confirm: true, drafts: site.drafts, build });
    expect(r.status).toBe('blocked');
    expect(r.problems[0]).toMatchObject({ code: 'UNRELATED', files: ['half-done.ts'] });
    expect(remoteFiles(site)).not.toContain('half-done.ts');
  });

  it('过程文件被纳入版本库、或提交作者不是隐藏邮箱时停止', async () => {
    const site = makeSite();
    git(site.root, 'checkout', '-q', 'main');
    mkdirSync(join(site.root, 'docs'));
    writeFileSync(join(site.root, 'docs/PRD.md'), '# 需求\n');
    git(site.root, 'add', '-f', 'docs/PRD.md');
    git(site.root, '-c', 'user.email=someone@gmail.com', 'commit', '-q', '-m', 'oops');
    git(site.root, 'checkout', '-q', 'dev');
    finalized(site, 'green', '墨绿');
    const r = await (publishTheme as any)({ root: site.root, id: 'green', confirm: true, drafts: site.drafts, build });
    expect(r.status).toBe('blocked');
    expect(r.problems.map((p: any) => p.code).sort()).toEqual(['EMAIL', 'FORBIDDEN', 'UNRELATED']);
  });

  it('两套配色从同一版本定稿、先后发布：版本号依次递增，组件库与插件版本一致', async () => {
    const site = makeSite();
    finalized(site, 'xtheme', '主题X');
    finalized(site, 'ytheme', '主题Y');
    const libJson = () => JSON.parse(git(site.remote, 'show', 'main:plugins/design-pal/libraries/efficiency/library.json'));
    const pluginVer = () => JSON.parse(git(site.remote, 'show', 'main:plugins/design-pal/plugin.json')).version;
    expect((await (publishTheme as any)({ root: site.root, id: 'xtheme', confirm: true, drafts: site.drafts, build })).version).toBe('1.1.0');
    const ready = await (publishTheme as any)({ root: site.root, id: 'ytheme', drafts: site.drafts, build });
    expect(ready.release.version).toBe('1.2.0');   // 列出将公开内容时显示的就是实际版本
    const y = await (publishTheme as any)({ root: site.root, id: 'ytheme', confirm: true, drafts: site.drafts, build });
    expect(y.version).toBe('1.2.0');
    expect(libJson().version).toBe('1.2.0');
    expect(libJson().changelog.map((c: any) => c.version).slice(0, 2)).toEqual(['1.2.0', '1.1.0']);
    expect(pluginVer()).toBe('1.2.0');
  });

  it('连不上公开仓库时给出可理解的提示，不提交任何东西', async () => {
    const site = makeSite();
    finalized(site, 'green', '墨绿');
    const head = git(site.root, 'rev-parse', 'main');
    git(site.root, 'remote', 'set-url', 'origin', '/nonexistent/remote.git');
    const e = await errorOf(() => (publishTheme as any)({ root: site.root, id: 'green', confirm: true, drafts: site.drafts, build }));
    expect(e.code).toBe('NETWORK');
    expect(e.message).toMatch(/连不上公开仓库/);
    expect(git(site.root, 'rev-parse', 'main')).toBe(head);
  });

  it('推送失败后可重试（不重复提交），也可放弃（撤回提交，内容退回草稿）', async () => {
    const site = makeSite();
    finalized(site, 'green', '墨绿');
    git(site.root, 'remote', 'set-url', 'origin', '/nonexistent/remote.git');
    const failed = await (publishTheme as any)({ root: site.root, id: 'green', confirm: true, drafts: site.drafts, build }).catch((e: any) => ({ status: 'error', e }));
    // fetch 也会失败：此时尚未提交
    expect(['push-failed', 'error']).toContain(failed.status);
    git(site.root, 'remote', 'set-url', 'origin', site.remote);

    // 模拟「已提交、推送时断网」
    const pushFail = await (async () => {
      const r1 = await (publishTheme as any)({ root: site.root, id: 'green', drafts: site.drafts, build });
      expect(r1.status).toBe('ready');
      git(site.root, 'config', 'remote.origin.pushurl', '/nonexistent/remote.git');
      return (publishTheme as any)({ root: site.root, id: 'green', confirm: true, drafts: site.drafts, build });
    })();
    expect(pushFail.status).toBe('push-failed');
    const commits = git(site.root, 'rev-list', '--count', 'main');
    git(site.root, 'config', '--unset', 'remote.origin.pushurl');
    const retry = await (publishTheme as any)({ root: site.root, id: 'green', confirm: true, drafts: site.drafts, build });
    expect(retry.status).toBe('published');
    expect(git(site.root, 'rev-list', '--count', 'main')).toBe(commits);

    const site2 = makeSite();
    finalized(site2, 'green', '墨绿');
    git(site2.root, 'config', 'remote.origin.pushurl', '/nonexistent/remote.git');
    expect((await (publishTheme as any)({ root: site2.root, id: 'green', confirm: true, drafts: site2.drafts, build })).status).toBe('push-failed');
    abandonPublish({ root: site2.root, id: 'green', drafts: site2.drafts });
    expect(git(site2.root, 'diff', '--name-only', 'origin/main', 'main')).toBe('');
    expect(listDrafts(site2.drafts)[0]).toMatchObject({ id: 'green', step: 'finalized' });
  });
});

describe('替换示例页', () => {
  const page = (site: ReturnType<typeof makeSite>, extra?: (root: string) => void) => {
    newPageDraft({ id: 'order-detail', library: 'efficiency', name: '订单详情页' }, { root: site.root, drafts: site.drafts, libRoot: site.libRoot });
    const f = join(site.root, 'plugins/design-pal/libraries/efficiency/patterns/OrderDetail.tsx');
    writeFileSync(f, '// 页面配方：订单详情页\nexport const OrderDetail = () => null;\n');
    extra?.(site.root);
    git(site.root, 'add', '-A'); git(site.root, 'commit', '-q', '-m', 'page');
    return finalizePage('order-detail', { note: '示例页「设置」替换为「订单详情」' }, { root: site.root, drafts: site.drafts, libRoot: site.libRoot });
  };

  it('在草稿分支上修改；确认发布前 main 不变，确认后公开并记入更新记录', async () => {
    const site = makeSite();
    const rel = page(site);
    expect(rel.branch).toBe('draft/order-detail');
    expect(git(site.root, 'show', 'main:plugins/design-pal/libraries/efficiency/library.json')).not.toContain('订单详情');
    const r = await (publishTheme as any)({ root: site.root, id: 'order-detail', confirm: true, drafts: site.drafts, build });
    expect(r.status).toBe('published');
    expect(remoteFiles(site)).toContain('plugins/design-pal/libraries/efficiency/patterns/OrderDetail.tsx');
    expect(git(site.remote, 'show', 'main:plugins/design-pal/libraries/efficiency/library.json')).toContain('示例页「设置」替换为「订单详情」');
    expect(git(site.remote, 'log', '-1', '--format=%ae', 'main')).toBe(NOREPLY.email);
  });

  it('草稿改到了示例页以外的组件代码时停止', async () => {
    const site = makeSite();
    page(site, (root) => writeFileSync(join(root, 'plugins/design-pal/libraries/efficiency/react/Button.tsx'), '// changed\n'));
    const r = await (publishTheme as any)({ root: site.root, id: 'order-detail', confirm: true, drafts: site.drafts, build });
    expect(r.status).toBe('blocked');
    expect(r.problems[0].files).toEqual(['plugins/design-pal/libraries/efficiency/react/Button.tsx']);
  });
});
