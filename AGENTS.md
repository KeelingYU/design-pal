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

## 构建与测试

- 安装依赖：`npm install`
- 单元测试：`npm test`
- 界面与交互测试：`npm run test:e2e`（Playwright，使用本机 Chrome）
- 安装测试：`npm run test:install`（临时隔离目录中用 Claude Code 与 Codex 命令行安装插件；可传 GitHub 地址测线上）

## 仓库约定

- 本仓库公开发布。`docs/`（过程文件，独立的本机 Git 存档）与 `drafts/`（设计草稿）被忽略，绝不提交。
- `main` = 已发布内容；开发在 `dev` 等分支进行。提交作者为 GitHub noreply 邮箱（仓库级 git 配置）。
- `archive/pre-publish-*` 分支含早期过程文件与个人邮箱，只留本机，永不推送。
- 两份市场清单（`.claude-plugin/`、`.agents/plugins/`）与两份插件清单版本必须一致。
