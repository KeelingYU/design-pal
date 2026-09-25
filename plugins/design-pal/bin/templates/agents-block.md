<!-- design-pal:start（由 design-pal 自动写入，升级或换颜色主题时会更新；请勿手改本段） -->
## 界面开发：design-pal {{libraryName}}组件库

本项目界面使用 design-pal **{{libraryName}}组件库 v{{version}}**，颜色主题 **{{themeName}}**。开发任何界面前先读 `design-pal/RULES.md`，并严格遵守：

- 优先使用现成组件（{{componentsHint}}），不另写相似组件，不引入其他 UI 组件库或图标库。
- 颜色只用 `--dp-*` 变量；不写死颜色，不用 Tailwind 默认色板或任意值颜色。
- 新页面先按 `design-pal/RULES.md` 第 3 节找最接近的页面配方照着做；交互遵守第 4 节（查看详情不跳页、可撤销操作用「撤销」不弹确认、编辑自动保存、键盘优先）。
- 组件库里没有的组件，按 RULES.md 第 9 节补做，记入 `design-pal/overrides.md`，并告诉用户补了什么。
- `design-pal/overrides.md` 中记录的是用户有意保留的项目定制，不得改回组件库原样。用户要求新的定制时，改完在该文件记一行。
- 每次修改界面后运行 `node design-pal/bin/check.mjs`，修正全部问题后才算完成。
- 不要直接编辑 `design-pal/baseline/`（升级合并用的原版副本）。换颜色主题、升级组件库请让用户通过 design-pal 发起（「换成 xx」「升级组件库」）。
- 外观与交互以 `design-pal/demo.html` 为准；{{referenceHint}}
<!-- design-pal:end -->
