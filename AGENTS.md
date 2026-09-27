# 项目规则

<!-- coding-pal:start -->
## 开发流程（coding-pal）

本项目按 coding-pal 流程开发。每次会话开始、或用户说「继续」时，使用 coding-pal 技能：先读 `docs/交接.md`，按其中的「当前阶段」继续工作。

| 文件 | 作用 |
|---|---|
| `docs/PRD.md` | 产品需求（用户已确认的版本为准） |
| `docs/方案.md` | 技术方案与实现步骤 |
| `docs/交接.md` | 当前阶段、下一步、未决事项 |
| `docs/决策记录.md` | 用户做出的业务决定 |

- 用户是不写代码的产品负责人。和用户沟通只讲业务影响，技术判断由 Agent 自己做。
- 只有「会做出错误的东西」和「会造成难以挽回的损失」这两类问题才阻塞流程，允许返工。
<!-- coding-pal:end -->

## 仓库定位

- 本仓库既是 Claude Code 与 Codex 的插件市场（`.claude-plugin/marketplace.json`、`.agents/plugins/marketplace.json`），也是插件与设计工具的源码。
- 安装者拿到的只有 `plugins/design-pal/`：使用技能 `skills/design-pal/`、零依赖命令行 `bin/dp.mjs`（apply / theme / upgrade / diff / gallery）、组件库 `libraries/<id>/`、画廊 `gallery.html`。
- 组件库外观的唯一来源是 `libraries/<id>/styles/components.css`（只用 `--dp-*` 变量）；`react/` 组件只引用这些类名。颜色主题的唯一来源是 `themes/*.json`，`styles/themes/*.css` 由构建生成。
- `demo.html`、`reference.html`、`gallery.html`、`styles/themes/*.css` 是构建产物但需提交（安装者离线直接打开）；源码在 `src/demo/`、`src/reference/`、`scripts/`。
- 设计工具（`.agents/skills/design-pal-design/`、`scripts/design.mjs`）只在本仓库中使用，不随插件分发。

## 构建与测试

- 安装依赖：`npm install`
- 构建：`npm run build`（改动组件、样式、颜色主题、示例页、`library.json` 后必须运行并提交产物；单元测试会检查主题 CSS 是否与 JSON 同步）
- 单元测试：`npm test`
- 界面与交互测试：`npm run test:e2e`（先构建，再用 Playwright 驱动本机 Chrome，断网打开单文件页面）
- 安装测试：`npm run test:install`（临时隔离目录中用 Claude Code 与 Codex 命令行安装插件，不改真实配置；可传 GitHub 地址测线上）
- 复刻验证：`npm run verify:repro`（真实调用两种 Agent，消耗额度，仅在用户同意后于验收前运行）
- 使用技能实测：`npm run verify:skill`（真实调用两种 Agent 在临时项目走查看→推荐→应用→定制→换主题→升级；同样消耗额度）
- 验收模型（用户指定）：Claude Code 用 `claude-opus-5-5`（medium），Codex 用 `gpt-6-sol`（high）；需 Claude Code ≥ 2.1.280

## 修改约定

- 新增或改名 React 组件时，同步 `react/index.ts` 导出与 `RULES.md` 第 8 节组件清单（`tests/unit/rules.test.ts` 会检查）。
- `bin/dp.mjs`、`bin/check.mjs` 及 `bin/lib/` 只能用 Node 内置模块（它们在用户项目中运行）。
- 改动会写入用户项目的逻辑（apply / theme / upgrade）时，保持：先检查 Git 已存档、冲突时一个文件都不写、只追加不覆盖用户文件；并补相应单元测试（`tests/unit/apply.test.ts`、`update.test.ts`）。
- 两份市场清单名称、两份插件清单版本必须一致（`tests/unit/manifest.test.ts`）。
- 公开（纳入版本库）的文件与文件夹名只用英文字符，内容可以是中文；`docs/`、`drafts/` 过程文件不受限（`tests/unit/manifest.test.ts` 会检查）。

## 仓库与发布约定

- 本仓库公开发布。`docs/`（过程文件，独立的本机 Git 存档，改动需在其中单独提交）与 `drafts/`（设计草稿、参考素材）被忽略，绝不提交。
- `main` = 已发布内容；开发在 `dev` 分支进行。会话开始先看当前分支：在 `main` 上时先 `git switch dev`（未提交改动会一起带过去）再工作。仓库的提交守卫（`.githooks/pre-commit`，`npm install` 时自动启用）会拦下 main 上的直接提交，只放行发布脚本。提交作者为 GitHub noreply 邮箱（仓库级 git 配置）。
- `archive/pre-publish-*` 分支含早期过程文件与个人邮箱，只留本机，永不推送。
- 未经用户明确同意，不运行 `scripts/design.mjs publish --confirm` / `maintain --confirm`，也不直接 `git push`、不开 PR 或网页合并。main 只通过这两个命令更新：颜色主题与示例页用 `publish`，其余开发分支改动（工具、测试、文档、组件修复）用 `maintain`；两者都会核对全部待公开文件、拦截过程文件、密钥与非 noreply 作者。
