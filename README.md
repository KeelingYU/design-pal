# design-pal

让 Claude Code 与 Codex 按同一套设计开发网页界面的组件库。

每个**组件库**决定页面布局、组件形状、交互方式、动效与图标；组件库下的**颜色主题**只决定配色，每个颜色主题都有亮色与暗色两种模式。组件库以插件形式分发，装上后，项目里的 Agent 只需听功能需求，就会按组件库的组件、页面配方和交互规则来做，并在做完后自查。

想了解每个使用环节里 Agent 和程序具体做了什么、为什么这样设计，见 [工作原理](HOW-IT-WORKS.md)。

## 组件库

| 组件库 | 适用 | 颜色主题 |
|---|---|---|
| 效率型 | 企业后台、SaaS 工具、数据管理、开发者工具 | 商务蓝、极客青 |

安装后说「查看 design-pal 组件库」即可在浏览器中打开画廊（离线可用），浏览每个组件库的组件总览与示例页。

## 安装

Claude Code：

```bash
claude plugin marketplace add KeelingYU/design-pal && claude plugin install design-pal@design-pal
```

Codex：

```bash
codex plugin marketplace add KeelingYU/design-pal && codex plugin add design-pal@design-pal
```

## 在项目中使用

对项目里的 Agent 说：

- 「用 design-pal 给这个项目推荐组件库和颜色主题」：Agent 说明推荐理由，你同意后，组件、样式、规则与自查工具放入项目，并写入项目的 `AGENTS.md`（Claude Code 通过 `CLAUDE.md` 中的 `@AGENTS.md` 读取）。
- 之后只说功能需求，例如「做一个订单列表页」。
- 「换成极客青」：只换配色，布局与交互不变。
- 「这个项目的按钮改成直角」：项目定制，只影响本项目，记录在 `design-pal/overrides.md`，以后不会被改回。
- 「升级组件库」：先列出新版改动；与项目定制冲突的地方逐条让你选择。项目不会自动跟随新版。

放入项目、换颜色主题、升级都要求项目是 Git 仓库且改动已提交，任何时候都可以退回。项目不是 React 时，会放入通用样式与标准 HTML 结构参考（含整页骨架），外观同源，交互由 Agent 按规则自行实现，因此与演示页的一致性略低于 React 项目，个别细节可能需要让 Agent 对照演示页再修一次。**新项目推荐使用 React。**

## 仓库结构

| 位置 | 内容 |
|---|---|
| `plugins/design-pal/` | 插件（安装者拿到的全部内容）：使用技能、命令行、组件库、画廊 |
| `plugins/design-pal/libraries/<组件库>/` | 组件库：样式层、React 组件、示例页配方、规则、演示页、结构参考、颜色主题 |
| `.claude-plugin/`、`.agents/plugins/` | Claude Code 与 Codex 的插件市场清单 |
| `.agents/skills/design-pal-design/` | 设计工具（设计新颜色主题、替换示例页、发布），只在本仓库中使用 |
| `src/`、`scripts/`、`tests/` | 演示页与画廊源码、构建与发布脚本、测试 |

## 开发

```bash
npm install
npm run build      # 生成颜色主题样式、演示页、结构参考、画廊
npm test           # 单元测试
npm run test:e2e   # 界面与交互测试（使用本机 Chrome）
npm run test:install  # 在隔离目录中用两种 Agent 的命令行安装插件
```

## 许可

代码以 MIT 许可发布，见 [LICENSE](LICENSE)。打包的第三方素材（字体、图标等）遵循各自许可，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
