# 效率型组件库 · 开发规则

> 适用：design-pal 效率型组件库 v1.0.0。本文件是本项目界面开发的最高依据。
> 组件库的外观与交互以演示页为准：`design-pal/demo.html`（双击离线打开，含组件总览与 3 个示例页）。

**项目中的文件位置**

| 内容 | 位置 |
|---|---|
| React 组件 | `src/design-pal/components/`（从 `index.ts` 引入） |
| 样式与字体 | `src/design-pal/styles/`（tokens.css、theme.css、components.css）、`src/design-pal/fonts/` |
| 页面配方（示例代码） | `design-pal/patterns/` |
| 演示页 / 结构参考 | `design-pal/demo.html` / `design-pal/reference.html` |
| 自查工具 | `design-pal/bin/check.mjs` |
| 项目定制记录 | `design-pal/overrides.md` |

## 1. 必须遵守

1. **只用组件库的颜色**：颜色一律来自 `--dp-*` 变量或组件自带样式。禁止写死颜色（十六进制、rgb/hsl、颜色名）、Tailwind 默认色板类名（如 `bg-blue-500`）和任意值颜色（如 `text-[#333]`）。需要浅色背景时用 `color-mix(in srgb, var(--dp-primary) 10%, var(--dp-surface))` 这类由变量派生的写法。
2. **优先用现成组件**：见第 8 节组件清单。组件库里有的，禁止另写一个相似的。
3. **形状、密度、动效用变量**：圆角 `--dp-r-sm/md/lg`（4/6/8px），控件高 `--dp-h-ctl`（32px），表格行高 `--dp-h-row`（40px），动效时长 `--dp-dur-fast/--dp-dur/--dp-dur-panel` 与缓动 `--dp-ease`。不要自创其他数值。
4. **字体与字号**：继承 `.dp-app`，正文 13px、辅助 12px、页面标题 20px、区块标题 16px、小标题 14px。不引入其他字体。数字用 `dp-num`（等宽对齐）。
5. **图标**：lucide 图标，16px，线宽 1.5（React 中加 `className="dp-icon"`）。空状态用 28px（`dp-icon-lg`）。不混用其他图标库。
6. **项目定制优先**：`design-pal/overrides.md` 中记录的差异是用户有意为之，必须保留，不得「改回」组件库原样。
7. **做完自查**：每次修改界面后运行 `node design-pal/bin/check.mjs`，修正它报告的全部问题后才算完成。

## 2. 页面骨架

```
.dp-app
└─ .dp-shell（高度 100vh）
   ├─ .dp-sidebar  侧边栏 216px，按 [ 折叠为 52px 图标栏（is-rail）
   └─ .dp-main
      ├─ .dp-topbar  顶栏 44px：左侧面包屑，右侧命令面板入口（⌘K）、通知、头像
      └─ .dp-content
         ├─ .dp-content-main  页头（.dp-page-head）+ 页面内容
         └─ .dp-detail        详情面板 400px，从右侧推入，不遮挡列表
```

- 所有登录后的页面都放在这个外壳里（React：`AppShell` + `Sidebar` + `Topbar`，参考 `design-pal/patterns/AppFrame.tsx`）。
- 页头：标题 15px + 数量 + 筛选条 + 右侧（搜索框、一个主要按钮）。页头与内容之间用 1px 分隔线，不用大块留白。
- 列表的筛选（按状态、负责人等）一律用页头里的筛选按钮（`FilterChip`，点开用 `Menu` 选值），与标题同一行；不用整行宽的下拉框，`Select` 只用于表单。
- 内容区是白底（`--dp-surface`），侧边栏与页面背景是 `--dp-bg`。卡片只用于仪表盘、设置危险区等需要分组的场合，列表页不套卡片。

## 3. 页面配方（新页面先找最接近的配方照着做）

| 页面类型 | 做法 | 参考 |
|---|---|---|
| 数据列表 | 页头（标题、数量、筛选条、搜索、新建）→ 高密度表格（可多选、焦点行）→ 表格底栏（快捷键说明 + 分页）。点行在右侧详情面板打开。 | `design-pal/patterns/ProjectList.tsx`，演示页「示例 · 数据列表」 |
| 查看 / 编辑单条记录 | 默认用右侧详情面板，不跳页。字段就地编辑、失焦自动保存。只有需要独立链接分享时才做独立详情页：顶栏面包屑 + 左侧主内容（最大 720px）+ 右侧 280px 属性栏。 | `DetailPanel`、`Prop` |
| 新建记录 | 字段 ≤ 6 个用对话框（⌘↵ 提交）；更多字段用独立页面：单栏最大 640px，按主题分组，底部固定「取消 / 创建」。新建是显式提交，不自动保存。 | `NewProjectDialog` |
| 设置 | 左侧二级导航 180px + 右侧行式布局（标题 200px ｜ 控件 ｜「已保存」）。改完自动保存，不设保存按钮。危险操作放在最底部的危险区。 | `design-pal/patterns/Settings.tsx` |
| 登录 / 注册 | 居中窄表单 340px；第三方登录按钮在前，邮箱表单在后；错误在表单内显示。 | `design-pal/patterns/Login.tsx` |
| 仪表盘 / 概览 | 顶部一行统计卡片（`Stat`，每行 3–4 个）；下方卡片内放表格或列表。图表只用主色、中性灰和状态色。 | `Card`、`Stat` |
| 任何展示数据的区域 | 必须同时做好 4 种状态：有数据、空（说明 + 主要操作）、加载中（骨架屏）、加载失败（说明 + 重试，保留筛选条件）。搜索无结果单独提示并提供「清除筛选」。 | `EmptyState`、`Skeleton` |

## 4. 交互规则

1. **查看详情不跳页**：点击列表行，在右侧推入详情面板，列表保持可见；J/K 在详情间切换，Esc 关闭。
2. **可撤销的操作不弹确认**：删除、改状态、归档等直接执行，底部提示消息给「撤销」（5 秒）。撤销后提示「已撤销」。
3. **不可撤销的操作才用对话框**：注销账号、永久删除等，必须用 `ConfirmDialog`，输入指定文字后才能确认。
4. **编辑已存在的数据自动保存**：设置项、详情字段改完即存（失焦或切换时），旁边或提示消息显示「已保存」；不设全局保存按钮。校验不通过时就地报错且不保存。
5. **新建用对话框或独立页面**：⌘↵ 提交，Esc 关闭；名称类必填项未填时就地报错；创建后新行置顶并短暂高亮，提示消息提供「打开」。
6. **批量操作**：表格支持多选；选中后底部中间出现批量操作条（已选数量、常用操作、取消选择）。
7. **就地修改**：状态、负责人等枚举字段点标签直接弹菜单修改，不进编辑页。
8. **键盘优先**：见第 5 节。主要按钮和工具提示上显示快捷键。
9. **一次只一条提示消息**，出现在底部中间；页面内的持续性问题用警告条（`Alert`），不用弹窗。

## 5. 快捷键约定

| 范围 | 按键 | 作用 |
|---|---|---|
| 全局 | ⌘K / Ctrl+K | 命令面板（跳转、操作、搜索对象） |
| 全局 | [ | 折叠 / 展开侧边栏 |
| 全局 | G 然后字母 | 跳转页面（如 G P 项目、G S 设置） |
| 列表 | J / K（↓ / ↑） | 下移 / 上移焦点行 |
| 列表 | ↵ | 打开详情 |
| 列表 | X | 选择当前行 |
| 列表 | N | 新建 |
| 列表 | / | 聚焦筛选框 |
| 列表 | Esc | 关闭详情，或取消选择 |
| 对话框 | ⌘↵ / Ctrl+↵ | 提交 |

在输入框中或有对话框、菜单打开时，单键快捷键不生效（React 中用 `useHotkeys` 已处理）。新增页面的快捷键要加入命令面板和设置页「快捷键」列表。

## 6. 动效

- 只动透明度和 4–6px 的位移；无弹跳、无缩放超过 2%、无旋转（加载图标除外）。
- 悬停、菜单、工具提示 120ms；对话框、提示消息、开关 160ms；侧边栏折叠、详情面板推入 200ms。缓动统一 `--dp-ease`。
- 尊重系统「减少动态效果」设置（tokens.css 已处理）。

## 7. 文案

- 中文短句，不用感叹号。按钮以动词开头：「新建项目」「导出」「重试」。
- 提示消息说结果：「已删除「官网改版」」「状态已改为「已完成」」。
- 报错说原因和办法：「网络连接不稳定，请检查后重试」，不写错误代码。
- 空状态：一句说明这是什么 + 一个主要操作。

## 8. 组件清单（React，从 `src/design-pal/components` 引入）

| 类别 | 组件 |
|---|---|
| 按钮 | `Button`（primary / secondary / ghost / danger，sm / md / lg，loading，shortcut，iconOnly）、`IconButton`、`ButtonGroup` |
| 表单 | `Field`（label / required / help / error）、`Input`、`Textarea`、`Select`、`SearchInput`、`Checkbox`（支持 mixed）、`RadioGroup`、`Switch` |
| 展示 | `Tag`（neutral / primary / success / warning / danger，可点击）、`Badge`、`Avatar`、`User`、`Card` / `CardHead` / `CardBody` / `CardFoot`、`Stat`、`Progress`、`InlineProgress`、`Kbd` |
| 列表 | `DataTable`（选择、焦点行、打开行、新行高亮）、`TableFoot`、`BulkBar`、`FilterChip`、`Pagination`、`Tabs` |
| 导航 | `AppShell`、`Sidebar`、`Topbar`、`PageHead`、`Breadcrumb` |
| 浮层 | `DetailPanel` + `Prop`、`Menu`、`Dialog`、`ConfirmDialog`、`CommandPalette`、`Tooltip`（根部需 `TooltipProvider`） |
| 反馈 | `ToastProvider` + `useToast`（支持 undo / action）、`Alert`、`EmptyState`、`Skeleton`、`Spinner`、`Saved` |
| 其他 | `useHotkeys`、`MOD`（⌘ 或 Ctrl）、`cx` |

完整示例见 `design-pal/patterns/`；每个组件各状态的 HTML 结构见 `design-pal/reference.html`。

## 9. 组件库里没有的组件怎么做

1. 先确认确实没有（包括能否由现有组件组合出来）。
2. 用现有变量与类名组合：颜色 `--dp-*`，圆角 `--dp-r-*`，高度 `--dp-h-*`，动效 `--dp-dur-*`。新类名用 `app-` 前缀，不要用 `dp-`（`dp-` 保留给组件库）。
3. 风格对齐：1px 细边框、小圆角、紧凑密度、状态用小圆点、浮层用 `--dp-surface` + 细边框 + 柔和阴影。
4. 在 `design-pal/overrides.md` 的「新增组件」一节记一行：组件名、用途、文件位置。
5. 完成后告诉用户新补了什么组件。

## 10. 非 React 项目

- 引入 `src/design-pal/styles/` 下的 tokens.css、theme.css、components.css（应用时已放入项目）。
- 按 `design-pal/reference.html` 中每个组件的 HTML 结构和类名编写，并实现其中写明的「交互要求」；页面配方与本文件第 2–7 节同样适用。
- 交互（菜单、对话框、命令面板、快捷键、撤销）需在该技术下自行实现，行为以演示页为准。

## 11. 禁止事项

- 写死颜色；引入其他 UI 组件库（如 Ant Design、MUI、Element）或其他图标库。
- 为可撤销的操作弹确认框；为查看详情跳到新页面；在设置页放「保存」按钮。
- 大圆角（> 8px）、胶囊按钮、大面积色块标签、渐变、厚重阴影、弹跳动效。
- 把 `overrides.md` 中记录的定制改回组件库原样。
