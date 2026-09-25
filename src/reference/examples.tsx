// 标准结构参考：每个组件、每种状态的静态 HTML 与交互要求。
// 由 React 组件渲染而来（与演示页同源），给非 React 项目照着写。弹出类组件给出「打开时」的结构。
import type { ReactNode } from 'react';
import { Bell, Check, CircleDot, Filter, Folder, Link2, MoreHorizontal, Plus, Search, Trash2, User as UserIcon, X } from 'lucide-react';
import {
  Alert, Avatar, Badge, Breadcrumb, Button, ButtonGroup, Card, CardBody, CardFoot, CardHead, Checkbox, DataTable, EmptyState, Field, FilterChip,
  InlineProgress, Input, Kbd, Pagination, Progress, Prop, RadioGroup, Saved, SearchInput, Select, Sidebar, Skeleton, Spinner, Stat, Switch, Tabs, Tag, Textarea, TableFoot, User
} from '../../plugins/design-pal/libraries/efficiency/react';
import { STATUS_TONE, seedProjects } from '../../plugins/design-pal/libraries/efficiency/patterns/data';

export interface Example { group: string; name: string; behavior?: string; node: ReactNode }
const noop = () => {};
const rows = seedProjects().slice(0, 3);

export const EXAMPLES: Example[] = [
  { group: '基础', name: '应用根节点', behavior: '页面最外层加 class="dp-app"；颜色主题 CSS 作用于 :root。亮暗切换：在 <html> 上设 data-dp-mode="light|dark"（或加 .dark / .light 类）。', node: <div className="dp-app" style={{ padding: 12 }}>内容</div> },
  { group: '基础', name: '标题与文字', node: <div><h1 className="dp-h1">页面标题</h1><h2 className="dp-h2">区块标题</h2><h3 className="dp-h3">小标题</h3><p className="dp-muted">次要文字</p><p className="dp-faint">辅助文字</p><span className="dp-num">¥128,450.00</span> <code className="dp-code">npm run dev</code> <a className="dp-link">链接</a></div> },
  { group: '基础', name: '快捷键提示', node: <span><Kbd keys={['⌘', 'K']} /> <Kbd keys="N" /></span> },

  { group: '按钮', name: '主要 / 次要 / 文字 / 危险', behavior: '每个区域最多一个主要按钮。危险按钮只用于不可撤销的操作。主要操作按钮内可带快捷键提示。', node: <div style={{ display: 'flex', gap: 8 }}><Button variant="primary" shortcut="N">新建项目</Button><Button>导出</Button><Button variant="ghost">取消</Button><Button variant="danger">注销账号</Button></div> },
  { group: '按钮', name: '状态：禁用 / 加载中', behavior: '加载中加 class="is-loading" 并禁止重复点击；文字改为「xx中」。', node: <div style={{ display: 'flex', gap: 8 }}><Button variant="primary" disabled>保存</Button><Button variant="primary" loading>保存中</Button></div> },
  { group: '按钮', name: '尺寸', node: <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Button size="sm">小</Button><Button>默认</Button><Button size="lg" variant="primary">大</Button></div> },
  { group: '按钮', name: '仅图标按钮 / 轻量图标按钮', behavior: '图标按钮必须有 aria-label，并配工具提示。', node: <div style={{ display: 'flex', gap: 8 }}><Button iconOnly aria-label="更多"><MoreHorizontal className="dp-icon" /></Button><button type="button" className="dp-icon-btn" aria-label="关闭"><X className="dp-icon" /></button></div> },
  { group: '按钮', name: '按钮组（视图切换）', node: <ButtonGroup value="table" onChange={noop} options={[{ value: 'table', label: '表格' }, { value: 'board', label: '看板' }]} /> },

  { group: '表单', name: '字段：默认 / 报错 / 禁用', behavior: '标签在上；报错时字段加 class="is-error"，说明文字替换为报错信息；用户重新输入后立即清除报错。', node: <div style={{ display: 'grid', gap: 12 }}><Field label="项目名称" help="最多 30 个字"><Input placeholder="例如：官网改版" /></Field><Field label="邮箱" required error="邮箱格式不正确"><Input defaultValue="siyuan.chen@" /></Field><Field label="邮箱"><Input defaultValue="siyuan.chen@tasko.cn" disabled /></Field></div> },
  { group: '表单', name: '搜索框（带图标与快捷键）', behavior: '按 / 聚焦；输入即筛选，不需要回车。', node: <SearchInput icon={<Search className="dp-icon" />} shortcut="/" placeholder="筛选项目" /> },
  { group: '表单', name: '下拉选择 / 多行文本', node: <div style={{ display: 'grid', gap: 12 }}><Field label="负责人"><Select options={['陈思远', '林晓']} /></Field><Field label="描述"><Textarea placeholder="可选" /></Field></div> },
  { group: '表单', name: '复选框（含部分选中）', behavior: 'role="checkbox"；选中加 is-checked，部分选中加 is-mixed。点击整行标签也可切换。', node: <div style={{ display: 'flex', gap: 16 }}><Checkbox checked label="已选" /><Checkbox checked={false} label="未选" /><Checkbox checked="mixed" label="部分选中" /></div> },
  { group: '表单', name: '单选', node: <RadioGroup name="通知方式" value="site" onChange={noop} options={[{ value: 'site', label: '站内' }, { value: 'mail', label: '邮件' }]} /> },
  { group: '表单', name: '开关', behavior: '即时生效并自动保存，旁边显示「已保存」；不设保存按钮。', node: <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Switch checked label="开启" onChange={noop} /><Switch checked={false} label="关闭" onChange={noop} /><Saved /></div> },

  { group: '展示', name: '状态标签', behavior: '用小圆点区分状态，不用大面积色块。可点击时用 <button class="dp-tag">，点击打开状态菜单就地修改。', node: <div style={{ display: 'flex', gap: 8 }}><Tag>未开始</Tag><Tag tone="primary">进行中</Tag><Tag tone="warning">有风险</Tag><Tag tone="success">已完成</Tag><Tag tone="danger">已逾期</Tag><Tag outline>设计</Tag></div> },
  { group: '展示', name: '徽标', node: <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Badge>5</Badge><Badge strong>12</Badge><span className="dp-with-badge"><button type="button" className="dp-icon-btn" aria-label="通知"><Bell className="dp-icon" /></button><Badge dot /></span></div> },
  { group: '展示', name: '头像 / 人员', node: <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Avatar name="陈思远" size="sm" /><Avatar name="林晓" /><Avatar name="王磊" size="lg" /><User name="赵一鸣" /></div> },
  { group: '展示', name: '卡片', node: <Card><CardHead><h3 className="dp-h3">官网改版</h3><Tag tone="primary">进行中</Tag></CardHead><CardBody>首页与产品页视觉升级。</CardBody><CardFoot><Button variant="ghost" size="sm">稍后</Button><Button variant="primary" size="sm">查看</Button></CardFoot></Card> },
  { group: '展示', name: '统计数字', node: <Stat label="本月完成任务" value="1,284" delta={{ text: '较上月 +12.4%', up: true }} /> },
  { group: '展示', name: '进度', node: <div style={{ display: 'grid', gap: 8 }}><Progress value={36} width={200} /><InlineProgress value={68} /><InlineProgress value={100} /></div> },

  { group: '列表', name: '筛选条', behavior: '未设置为虚线框；设置后显示值（is-set）。点击打开菜单选择。', node: <div style={{ display: 'flex', gap: 8 }}><FilterChip icon={<Filter className="dp-icon" />} label="状态" value="进行中" /><FilterChip icon={<UserIcon className="dp-icon" />} label="负责人" /></div> },
  {
    group: '列表', name: '数据表格（选择、焦点行、打开行）',
    behavior: '行高 40px、表头吸顶；整行可点，点击在右侧打开详情面板（不跳页）。键盘：J/K 或 ↑↓ 移动焦点（is-focus），↵ 打开（is-open），X 选择（is-selected），Esc 关闭详情或取消选择。选中多行时显示批量操作条。新建的行加 is-new 高亮 1.2 秒。',
    node: (
      <div className="dp-card" style={{ overflow: 'hidden' }}>
        <DataTable rows={rows} rowKey={(p) => p.id} selected={new Set([rows[2].id])} focusIndex={0} openKey={rows[1].id} onRowClick={noop}
          columns={[{ key: 'name', title: '名称', render: (p) => p.name }, { key: 'owner', title: '负责人', render: (p) => <User name={p.owner} /> }, { key: 'status', title: '状态', render: (p) => <Tag tone={STATUS_TONE[p.status]}>{p.status}</Tag> }, { key: 'p', title: '进度', render: (p) => <InlineProgress value={p.progress} /> }]} />
        <TableFoot><span>3 个项目</span><Pagination page={1} pages={2} onChange={noop} /></TableFoot>
      </div>
    )
  },
  { group: '列表', name: '批量操作条', behavior: '选中 ≥1 行时出现在列表底部中间；右侧 ✕ 取消选择。批量删除直接执行并提供撤销。', node: <div style={{ position: 'relative', height: 60 }}><div className="dp-bulk" role="toolbar" aria-label="批量操作"><span>已选 2 项</span><span className="dp-bulk-sep" /><button type="button" className="dp-btn dp-btn-ghost dp-btn-sm"><CircleDot className="dp-icon" />修改状态</button><button type="button" className="dp-btn dp-btn-ghost dp-btn-sm"><Trash2 className="dp-icon" />删除</button><span className="dp-bulk-sep" /><button type="button" className="dp-btn dp-btn-ghost dp-btn-sm" aria-label="取消选择"><X className="dp-icon" /></button></div></div> },
  { group: '列表', name: '空状态 / 加载失败 / 加载中', behavior: '空：说明 + 主要操作；失败：说明 + 重试，保留筛选条件；加载中：骨架屏行。', node: <div style={{ display: 'grid', gap: 8 }}><EmptyState icon={<Folder className="dp-icon-lg" />} title="还没有项目" description="项目用来组织任务和成员。" action={<Button variant="primary" icon={<Plus className="dp-icon" />}>新建项目</Button>} /><EmptyState error icon={<X className="dp-icon-lg" />} title="加载失败" description="网络连接不稳定，已保留你的筛选条件。" action={<Button>重试</Button>} /><Skeleton width={200} /><Spinner /></div> },

  { group: '导航', name: '应用外壳：侧边栏（展开 / 折叠）', behavior: '侧边栏 216px，按 [ 折叠为 52px 图标栏（is-rail），宽度过渡 200ms。当前页 is-current。结构：.dp-shell > .dp-sidebar + .dp-main > .dp-topbar + .dp-content > .dp-content-main + .dp-detail。', node: <div style={{ display: 'flex', gap: 12, height: 200 }}><Sidebar brand={{ mark: 'T', name: 'Tasko' }} rail={false} onToggleRail={noop} current="list" items={[{ key: 'list', icon: <Folder className="dp-icon" />, label: '项目' }, { key: 'b', icon: <CircleDot className="dp-icon" />, label: '我的任务', badge: <Badge>5</Badge> }]} /><Sidebar brand={{ mark: 'T', name: 'Tasko' }} rail onToggleRail={noop} current="list" items={[{ key: 'list', icon: <Folder className="dp-icon" />, label: '项目' }]} /></div> },
  { group: '导航', name: '顶栏（面包屑 + 命令面板入口）', behavior: '⌘K / Ctrl+K 在任何页面打开命令面板。', node: <header className="dp-topbar"><Breadcrumb items={[{ label: 'Tasko', href: '#' }, { label: '项目' }]} /><span className="dp-spacer" /><button type="button" className="dp-cmd-trigger"><Search className="dp-icon" />搜索或执行命令…<Kbd keys={['⌘', 'K']} /></button><Avatar name="陈思远" /></header> },
  { group: '导航', name: '页头', node: <div className="dp-page-head"><h1 className="dp-page-title">项目</h1><span className="dp-page-count dp-num">10</span><span className="dp-spacer" /><Button variant="primary" shortcut="N" icon={<Plus className="dp-icon" />}>新建项目</Button></div> },
  { group: '导航', name: '标签页', node: <Tabs value="all" onChange={noop} items={[{ value: 'all', label: '全部', count: 24 }, { value: 'doing', label: '进行中' }]} /> },
  { group: '导航', name: '分页', node: <Pagination page={2} pages={3} onChange={noop} /> },

  {
    group: '浮层', name: '详情面板（打开时）',
    behavior: '从右侧推入，宽 400px，占据布局空间、不遮挡列表（width 0 → 400px 过渡 200ms，加 is-open）。头部：编号、上一个(K)/下一个(J)、关闭(Esc)。字段修改后自动保存并提示「已保存」。',
    node: <aside className="dp-detail is-open" style={{ height: 260 }}><div className="dp-detail-inner"><div className="dp-detail-head"><span className="dp-mono dp-faint">P-127</span><span className="dp-spacer" /><button type="button" className="dp-icon-btn" aria-label="关闭详情"><X className="dp-icon" /></button></div><div className="dp-detail-body"><Prop label="状态"><Tag tone="primary">进行中</Tag></Prop><Prop label="负责人"><User name="林晓" /></Prop></div></div></aside>
  },
  { group: '浮层', name: '菜单（打开时）', behavior: '点击触发打开，贴触发元素下方 4px；↑↓ 选择、↵ 执行、Esc 或点外部关闭。危险项放最后并用分隔线隔开。', node: <div className="dp-menu" role="menu"><div className="dp-menu-item" role="menuitem"><CircleDot className="dp-icon" />修改状态<Kbd keys="S" /></div><div className="dp-menu-item" role="menuitem"><Link2 className="dp-icon" />复制链接</div><div className="dp-menu-sep" /><div className="dp-menu-item is-danger" role="menuitem"><Trash2 className="dp-icon" />删除<Kbd keys="⌫" /></div></div> },
  { group: '浮层', name: '对话框（打开时）', behavior: '只用于集中填写的表单和不可撤销的操作。遮罩 .dp-overlay + .dp-dialog；打开时焦点进入第一个输入框；⌘↵ 提交、Esc 关闭。不可撤销的操作需输入指定文字后才能点确认。', node: <div className="dp-dialog is-static" role="dialog" aria-label="注销账号？"><div className="dp-dialog-head"><h2 className="dp-dialog-title">注销账号？</h2><button type="button" className="dp-icon-btn" aria-label="关闭"><X className="dp-icon" /></button></div><div className="dp-dialog-body"><p className="dp-dialog-desc">个人数据将在 30 天后永久删除，无法恢复。</p><Field label="输入「注销」以确认"><Input placeholder="注销" /></Field></div><div className="dp-dialog-foot"><Button variant="ghost">取消</Button><Button variant="danger" disabled>确认注销</Button></div></div> },
  { group: '浮层', name: '命令面板（打开时）', behavior: '⌘K 打开；分组列出「跳转 / 操作 / 对象」，输入即过滤；↑↓ 选择、↵ 执行、Esc 关闭。', node: <div className="dp-cmdk" role="dialog" aria-label="命令面板"><div className="dp-cmdk-input"><Search className="dp-icon" /><input placeholder="输入命令或搜索…" /><Kbd keys="Esc" /></div><div className="dp-cmdk-list"><div className="dp-menu-group">跳转</div><div className="dp-menu-item is-active"><Folder className="dp-icon" />项目<span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}><Kbd keys={['G', 'P']} /></span></div></div><div className="dp-cmdk-foot"><span><Kbd keys={['↑', '↓']} /> 选择</span><span><Kbd keys="↵" /> 执行</span></div></div> },
  { group: '浮层', name: '工具提示', behavior: '悬停 300ms 后出现在元素下方 6px；有快捷键时一并显示。', node: <span className="dp-tooltip">折叠侧边栏 <Kbd keys="[" /></span> },

  { group: '反馈', name: '提示消息（带撤销）', behavior: '底部居中，一次只显示一条。删除、改状态等可撤销操作直接执行，不弹确认框，提示中给「撤销」，停留 5 秒；其他提示 2.6 秒。撤销后提示「已撤销」。', node: <div className="dp-toast is-static" role="status"><Trash2 className="dp-icon" /><span>已删除「官网改版」</span><button type="button" className="dp-toast-action">撤销</button></div> },
  { group: '反馈', name: '警告条', node: <div style={{ display: 'grid', gap: 8 }}><Alert tone="info" title="新功能">项目现在支持设置里程碑。</Alert><Alert tone="success" title="导出完成">已发送到你的邮箱。</Alert><Alert tone="warning" title="存储即将用完">已使用 92%。</Alert><Alert tone="danger" title="同步失败">网络中断。</Alert></div> },
  { group: '反馈', name: '已保存', node: <span className="dp-saved"><Check className="dp-icon" />已保存</span> }
];
