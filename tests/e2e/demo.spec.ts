import { expect, test, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEMO = pathToFileURL(join(import.meta.dirname, '../../plugins/design-pal/libraries/efficiency/demo.html')).href;
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

/** 断网打开：拦截所有非本地请求并记录 */
async function openOffline(page: Page, hash = '', query = '') {
  const external: string[] = [];
  await page.route(/^(?!file:|data:|blob:)/, (route) => { external.push(route.request().url()); return route.abort(); });
  await page.goto(`${DEMO}${query}${hash}`);
  return external;
}
const rows = (page: Page) => page.locator('tbody tr[data-row]');

test('组件总览：断网可打开、无外部请求、13 个分区齐全、英文字体已内联', async ({ page }) => {
  const external = await openOffline(page);
  for (const t of ['设计要点', '配色', '文字', '按钮', '表单输入', '选择类', '标签 · 徽标 · 头像', '表格 · 筛选', '导航', '浮层', '反馈', '交互规则', '动效']) {
    await expect(page.getByRole('heading', { name: t, exact: true })).toBeVisible();
  }
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('600 13px Inter'))).toBe(true);
  expect(external).toEqual([]);
});

test('切换颜色主题与亮暗模式：配色随之变化', async ({ page }) => {
  await openOffline(page);
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = await bg();
  await page.getByRole('group', { name: '亮暗模式' }).getByRole('button', { name: '暗色' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-dp-mode', 'dark');
  expect(await bg()).not.toBe(light);
  await page.getByRole('group', { name: '颜色主题' }).getByRole('button', { name: /极客青/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-dp-theme', 'cyan');
  await expect(page.getByText('当前颜色主题：极客青')).toBeVisible();
});

test('数据列表：J/K 移动、回车打开右侧详情、Esc 关闭', async ({ page }) => {
  await openOffline(page, '#list');
  await expect(rows(page)).toHaveCount(10);
  await page.keyboard.press('j');
  await expect(rows(page).nth(1)).toHaveClass(/is-focus/);
  await page.keyboard.press('Enter');
  const panel = page.locator('.dp-detail');
  await expect(panel).toHaveClass(/is-open/);
  await expect(panel.getByRole('textbox', { name: '项目名称' })).toHaveValue('移动端 2.0');
  await page.keyboard.press('j');
  await expect(panel.getByRole('textbox', { name: '项目名称' })).toHaveValue('年度用户调研');
  await expect(rows(page).nth(0)).toBeVisible(); // 列表仍然可见，没有跳页
  await page.keyboard.press('Escape');
  await expect(panel).not.toHaveClass(/is-open/);
});

test('删除不弹确认：批量删除后可撤销恢复', async ({ page }) => {
  await openOffline(page, '#list');
  await page.keyboard.press('x');
  await page.keyboard.press('j');
  await page.keyboard.press('x');
  const bulk = page.getByRole('toolbar', { name: '批量操作' });
  await expect(bulk).toContainText('已选 2 项');
  await bulk.getByRole('button', { name: '删除' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(rows(page)).toHaveCount(8);
  await page.getByRole('button', { name: '撤销' }).click();
  await expect(rows(page)).toHaveCount(10);
  await expect(page.getByText('已撤销')).toBeVisible();
});

test('就地修改状态并撤销', async ({ page }) => {
  await openOffline(page, '#list');
  await page.getByRole('button', { name: '修改「官网改版」的状态' }).click();
  await page.getByRole('menuitem', { name: '已完成' }).click();
  await expect(rows(page).first()).toContainText('已完成');
  await expect(page.getByText('状态已改为「已完成」')).toBeVisible();
  await page.getByRole('button', { name: '撤销' }).click();
  await expect(rows(page).first()).toContainText('进行中');
});

test('新建项目：N 打开对话框，名称必填，⌘↵ 创建，新行在最前并可「打开」', async ({ page }) => {
  await openOffline(page, '#list');
  await page.keyboard.press('n');
  const dialog = page.getByRole('dialog', { name: '新建项目' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press(`${MOD}+Enter`);
  await expect(dialog.getByText('请填写名称')).toBeVisible();
  await dialog.getByRole('textbox', { name: '名称' }).fill('会员体系升级');
  await expect(dialog.getByText('请填写名称')).toHaveCount(0);
  await page.keyboard.press(`${MOD}+Enter`);
  await expect(dialog).toHaveCount(0);
  await expect(rows(page).first()).toContainText('会员体系升级');
  await expect(page.locator('.dp-detail')).not.toHaveClass(/is-open/);
  await page.getByRole('button', { name: '打开' }).click();
  await expect(page.locator('.dp-detail')).toHaveClass(/is-open/);
});

test('命令面板：⌘K 搜索「设置」回车跳转；[ 折叠侧边栏', async ({ page }) => {
  await openOffline(page, '#list');
  await page.keyboard.press(`${MOD}+k`);
  const palette = page.getByRole('dialog', { name: '命令面板' });
  await expect(palette).toBeVisible();
  await page.keyboard.type('设置');
  await page.keyboard.press('Enter');
  await expect(palette).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '个人资料' })).toBeVisible();
  await page.keyboard.press('[');
  await expect(page.getByRole('navigation', { name: '主导航' })).toHaveClass(/is-rail/);
});

test('设置：改完自动保存；姓名清空时报错不保存；注销需输入确认', async ({ page }) => {
  await openOffline(page, '#settings');
  const name = page.getByRole('textbox', { name: '姓名' });
  await name.fill('');
  await name.blur();
  await expect(page.getByText('姓名不能为空，未保存')).toBeVisible();
  await name.fill('陈思远');
  await name.blur();
  await expect(page.getByText('已保存')).toBeVisible();
  await page.getByRole('button', { name: '安全' }).click();
  await page.getByRole('button', { name: '注销账号…' }).click();
  const dialog = page.getByRole('dialog', { name: '注销账号？' });
  const ok = dialog.getByRole('button', { name: '确认注销' });
  await expect(ok).toBeDisabled();
  await dialog.getByRole('textbox').fill('注销');
  await expect(ok).toBeEnabled();
  await ok.click();
  await expect(page.getByText('已提交注销申请')).toBeVisible();
});

test('特殊状态：列表空 / 加载中 / 加载失败，登录密码错误', async ({ page }) => {
  await openOffline(page, '#list');
  const states = page.getByRole('group', { name: '列表状态' });
  await states.getByRole('button', { name: '空', exact: true }).click();
  await expect(page.getByText('还没有项目')).toBeVisible();
  await states.getByRole('button', { name: '加载中' }).click();
  await expect(page.locator('table[aria-busy="true"]')).toBeVisible();
  await states.getByRole('button', { name: '加载失败' }).click();
  await expect(page.getByText('加载失败', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: '重试' }).click();
  await expect(rows(page)).toHaveCount(10);

  await page.getByRole('group', { name: '页面' }).getByRole('button', { name: '示例 · 登录' }).click();
  await page.getByRole('group', { name: '登录结果' }).getByRole('button', { name: '密码错误' }).click();
  await page.locator('form').getByRole('button', { name: /^登录/ }).click();
  await expect(page.getByText('邮箱或密码错误')).toBeVisible();
});

test('中英文显示：标题与正文中英文均正常渲染', async ({ page }) => {
  await openOffline(page);
  const box = await page.getByText('Project overview', { exact: false }).first().boundingBox();
  expect(box && box.width > 100).toBe(true);
  await expect(page.getByText('设计评审定在周四 15:00')).toBeVisible();
});

test('标准结构参考与演示页外观同源：同一组件的颜色、尺寸、圆角、字体一致', async ({ page, browser }) => {
  const REF = DEMO.replace('demo.html', 'reference.html');
  const pick = async (p: Page, sel: string) => p.locator(sel).first().evaluate((el) => {
    const s = getComputedStyle(el);
    return [s.backgroundColor, s.color, s.height, s.borderRadius, s.fontSize, s.fontFamily, s.borderTopColor].join('|');
  });
  await openOffline(page, '', '?theme=blue&mode=light');
  const ref = await browser.newPage();
  await ref.goto(REF);
  for (const sel of ['.dp-btn-primary', '.dp-btn-secondary', '.dp-input', '.dp-tag-primary', '.dp-table th', '.dp-alert-warning', '.dp-toast']) {
    expect(await pick(ref, sel), sel).toBe(await pick(page, sel));
  }
});

test('通用样式层去掉页面默认外边距：应用放在 body 内部（React 根节点）或 body 上时，界面贴边无白边', async ({ page }) => {
  const css = pathToFileURL(join(import.meta.dirname, '../../plugins/design-pal/libraries/efficiency/styles/components.css')).href;
  const dir = mkdtempSync(join(tmpdir(), 'dp-margin-'));
  for (const [name, body] of [['inner.html', '<body><div id="root"><div class="dp-app">x</div></div></body>'], ['self.html', '<body class="dp-app">x</body>']]) {
    writeFileSync(join(dir, name), `<!doctype html><html><head><link rel="stylesheet" href="${css}"></head>${body}</html>`);
    await page.goto(pathToFileURL(join(dir, name)).href);
    expect(await page.evaluate(() => getComputedStyle(document.body).margin), name).toBe('0px');
  }
});

test('草稿配色有未处理的低对比颜色时仍能生成预览，顶部提示待处理的数量', async ({ page }) => {
  const { buildDemo } = await import('../../scripts/build.mjs');
  const blue = JSON.parse(readFileSync(join(import.meta.dirname, '../../plugins/design-pal/libraries/efficiency/themes/blue.json'), 'utf8'));
  const draft = { ...blue, id: 'pale', name: '浅灰草稿', draft: true, acceptedLowContrast: [], light: { ...blue.light, text: '#D4D4D4' } };
  const out = join(mkdtempSync(join(tmpdir(), 'dp-draft-')), 'demo.html');
  await (buildDemo as any)('efficiency', { extraThemes: [draft], outFile: out });
  await page.goto(pathToFileURL(out).href + '?theme=pale&mode=light');
  await expect(page.locator('.f-banner.warn')).toContainText(/对比度不足（\d+ 处待处理）/);
});

test('浮层（命令面板、提示消息、对话框背景）自带组件库字号：挂在页面最外层时也不退回浏览器默认字号', async ({ page }) => {
  await openOffline(page, '#list');
  await page.keyboard.press(`${MOD}+k`);
  const item = page.locator('.dp-cmdk-list [role="option"], .dp-cmdk-list .dp-cmdk-item').first();
  await expect(item).toBeVisible();
  const [size, base] = await item.evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(document.documentElement).getPropertyValue('--dp-fs').trim()]);
  expect(size).toBe(base);
});

test('状态标签保持自身宽度：放在纵向排列的容器里也不会被拉成整行', async ({ page }) => {
  const css = (f: string) => pathToFileURL(join(import.meta.dirname, '../../plugins/design-pal/libraries/efficiency/styles', f)).href;
  const dir = mkdtempSync(join(tmpdir(), 'dp-tag-'));
  writeFileSync(join(dir, 'p.html'), `<!doctype html><html><head>${['tokens.css', 'themes/blue.css', 'components.css'].map((f) => `<link rel="stylesheet" href="${css(f)}">`).join('')}</head><body class="dp-app"><div style="display:flex;flex-direction:column;width:400px"><span class="dp-tag">待审核</span></div></body></html>`);
  await page.goto(pathToFileURL(join(dir, 'p.html')).href);
  expect(await page.locator('.dp-tag').evaluate((el) => el.getBoundingClientRect().width)).toBeLessThan(100);
});

test('商品列表：搜索、状态筛选、详情与批量下架撤销', async ({ page }) => {
  expect(await openOffline(page, '#products')).toEqual([]);
  await expect(rows(page)).toHaveCount(10);
  await page.getByRole('textbox', { name: '搜索商品' }).fill('SP-1002');
  await expect(rows(page)).toHaveCount(1);
  await rows(page).first().click();
  await expect(page.locator('.dp-detail')).toHaveClass(/is-open/);
  await expect(page.locator('.dp-detail')).toContainText('轻量机械键盘');
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: '搜索商品' }).fill('不存在');
  await page.getByRole('button', { name: '清除筛选' }).click();
  await expect(rows(page)).toHaveCount(10);
  await page.keyboard.press('x');
  await page.keyboard.press('j');
  await page.keyboard.press('x');
  await page.getByRole('toolbar', { name: '批量操作' }).getByRole('button', { name: '下架', exact: true }).click();
  await expect(rows(page).first()).toContainText('已下架');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(rows(page).first()).toContainText('销售中');
  await page.getByRole('button', { name: '状态', exact: true }).click();
  await page.getByRole('menuitem', { name: '待上架' }).click();
  await expect(rows(page)).toHaveCount(2);
});

test('商品列表：新增校验、清除筛选、四种状态与亮暗切换', async ({ page }) => {
  await openOffline(page, '#products');
  await page.getByRole('textbox', { name: '搜索商品' }).fill('耳机');
  await page.getByRole('button', { name: /新增商品/ }).click();
  const dialog = page.getByRole('dialog', { name: '新增商品' });
  await dialog.getByRole('button', { name: '添加商品' }).click();
  await expect(dialog.getByRole('alert')).toContainText('请填写商品名称');
  await dialog.getByRole('textbox', { name: '商品名称' }).fill('旅行充电器');
  await dialog.getByRole('textbox', { name: '售价（元）' }).fill('-1');
  await dialog.getByRole('button', { name: '添加商品' }).click();
  await expect(dialog.getByRole('alert')).toContainText('售价需为非负金额');
  await dialog.getByRole('textbox', { name: '售价（元）' }).fill('99.90');
  await dialog.getByRole('textbox', { name: '库存' }).fill('1.5');
  await dialog.getByRole('button', { name: '添加商品' }).click();
  await expect(dialog.getByRole('alert')).toContainText('库存需为非负整数');
  await dialog.getByRole('textbox', { name: '库存' }).fill('20');
  await page.keyboard.press(`${MOD}+Enter`);
  await expect(rows(page)).toHaveCount(11);
  await expect(rows(page).first()).toContainText('旅行充电器');
  await expect(rows(page).first()).toContainText('¥99.90');
  const states = page.getByRole('group', { name: '列表状态' });
  await states.getByRole('button', { name: '空', exact: true }).click();
  await expect(page.getByText('还没有商品')).toBeVisible();
  await states.getByRole('button', { name: '加载中' }).click();
  await expect(page.getByLabel('正在加载商品')).toBeVisible();
  await states.getByRole('button', { name: '加载失败' }).click();
  await page.getByRole('button', { name: '重试' }).click();
  await expect(rows(page)).toHaveCount(11);
  await page.getByRole('group', { name: '亮暗模式' }).getByRole('button', { name: '暗色' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-dp-mode', 'dark');
  await page.keyboard.press(`${MOD}+k`);
  await expect(page.getByRole('dialog', { name: '命令面板' })).toContainText('旅行充电器');
});
