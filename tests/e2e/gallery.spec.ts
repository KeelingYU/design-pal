import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const GALLERY = pathToFileURL(join(import.meta.dirname, '../../plugins/design-pal/gallery.html')).href;

test('画廊：断网打开，列出组件库与颜色主题缩略图，可筛选、看使用说明、进入演示页', async ({ page }) => {
  const external: string[] = [];
  await page.route(/^(?!file:|data:|blob:)/, (r) => { external.push(r.request().url()); return r.abort(); });
  await page.goto(GALLERY);
  const card = page.locator('article.lib[data-lib="efficiency"]');
  await expect(card.getByRole('heading', { name: '效率型' })).toBeVisible();
  await expect(card.locator('.shot')).toHaveCount(2);
  await expect(card.getByText('商务蓝')).toBeVisible();
  await expect(card.getByText('极客青')).toBeVisible();

  // 缩略图是演示页的真实渲染
  const thumb = page.frameLocator('article.lib iframe').first();
  await expect(thumb.getByText('官网改版').first()).toBeVisible();

  // 筛选
  await page.getByRole('button', { name: '开发者工具' }).click();
  await expect(card).toBeVisible();

  // 使用说明弹窗
  await page.getByRole('button', { name: '如何在项目中使用' }).click();
  const how = page.getByRole('dialog', { name: '在你的项目里使用' });
  await expect(how).toBeVisible();
  await expect(how).toContainText('claude plugin marketplace add KeelingYU/design-pal');
  await expect(how).toContainText('codex plugin marketplace add KeelingYU/design-pal');
  await page.keyboard.press('Escape');
  await expect(how).toBeHidden();

  // 进入演示页（极客青）并能返回
  await card.locator('.shot').nth(1).click();
  await expect(page).toHaveURL(/demo\.html\?theme=cyan/);
  await expect(page.locator('html')).toHaveAttribute('data-dp-theme', 'cyan');
  await page.getByRole('link', { name: '组件库' }).click();
  await expect(page).toHaveURL(/gallery\.html/);
  expect(external).toEqual([]);
});
