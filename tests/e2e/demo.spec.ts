import { expect, test, type Page } from '@playwright/test';
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
