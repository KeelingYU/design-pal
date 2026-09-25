import { defineConfig } from '@playwright/test';

// 使用本机已安装的 Chrome，不额外下载浏览器
export default defineConfig({
  testDir: 'tests/e2e',
  use: { channel: 'chrome', headless: true }
});
