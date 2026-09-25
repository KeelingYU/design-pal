// 组件总览：展示组件库的设计要点、配色、每个组件的各种状态、交互规则与动效
import { useState, type ReactNode } from 'react';
import { AlertTriangle, Bell, Check, CircleDot, Command as CommandIcon, Filter, Folder, Link2, Mail, MoreHorizontal, Plus, Search, Trash2, User as UserIcon, UserPlus, X } from 'lucide-react';
import {
  Alert, Avatar, Badge, Breadcrumb, Button, ButtonGroup, Card, Checkbox, CommandPalette, ConfirmDialog, DataTable, EmptyState, Field, FilterChip,
  InlineProgress, Input, Kbd, MOD, Menu, Pagination, Progress, RadioGroup, Saved, SearchInput, Select, Sidebar, Skeleton, Spinner, Stat, Switch,
  Tabs, Tag, Textarea, TableFoot, User, useToast
} from '../../plugins/design-pal/libraries/efficiency/react';
import { STATUSES, STATUS_TONE, seedProjects } from '../../plugins/design-pal/libraries/efficiency/patterns/data';
import { ShortcutList } from '../../plugins/design-pal/libraries/efficiency/patterns/Settings';
import { checkReadability, COLOR_KEYS } from '../../plugins/design-pal/bin/lib/theme.mjs';
import type { DemoLibrary, DemoTheme } from './types';

const SW_LABEL: Record<string, string> = { primary: '主色', primaryHover: '主色 · 悬停', onPrimary: '主色上的文字', bg: '页面背景', surface: '内容底色', surface2: '次级底色', border: '边框', borderStrong: '强调边框', text: '正文', text2: '次要文字', text3: '辅助文字', success: '成功', warning: '警告', danger: '危险' };
const SECTIONS: [string, string][] = [['o-key', '设计要点'], ['o-color', '配色'], ['o-type', '文字'], ['o-btn', '按钮'], ['o-form', '表单输入'], ['o-choice', '选择类'], ['o-tag', '标签 · 头像'], ['o-table', '表格 · 筛选'], ['o-nav', '导航'], ['o-float', '浮层'], ['o-feedback', '反馈'], ['o-rule', '交互规则'], ['o-motion', '动效']];

function Sec({ id, title, sub, children }: { id: string; title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="ov-sec" id={id}>
      <h2 className="dp-h2">{title}</h2>
      <p className="dp-faint ov-sub">{sub || ' '}</p>
      {children}
    </section>
  );
}
const Cell = ({ cap, children }: { cap: string; children: ReactNode }) => <div className="ov-cell">{children}<span className="ov-cap">{cap}</span></div>;
const Panel = ({ children }: { children: ReactNode }) => <Card className="ov-panel">{children}</Card>;

export function Overview({ library, theme, mode }: { library: DemoLibrary; theme: DemoTheme; mode: 'light' | 'dark' }) {
  const toast = useToast();
  const [cmdk, setCmdk] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [checks, setChecks] = useState([true, false]);
  const [radio, setRadio] = useState('site');
  const [sw, setSw] = useState([true, false]);
  const [seg, setSeg] = useState('table');
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [played, setPlayed] = useState<Record<string, number>>({});
  const colors = theme[mode];
  const accepted = new Set(theme.acceptedLowContrast || []);
  const readability = checkReadability(theme).filter((r: any) => r.mode === mode);
  const flagged = new Set(readability.filter((r: any) => !r.ok).map((r: any) => r.fg));
  const rows = seedProjects().slice(0, 4);

  return (
    <div className="ov">
      <nav className="ov-toc" aria-label="组件总览目录">
        {SECTIONS.map(([id, t]) => <a key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>{t}</a>)}
      </nav>
      <div style={{ minWidth: 0 }}>
        <Sec id="o-key" title="设计要点" sub={`这些是${library.name}区别于其他组件库的地方；颜色主题不会改变它们。`}>
          <Panel>
            <p style={{ margin: 0 }}>{library.summary}</p>
            <p className="dp-muted" style={{ margin: 0 }}>适用：{library.fitDesc}</p>
            <div className="ov-traits">{library.traits.map(([k, v]) => <div key={k}><span className="dp-faint">{k}</span><p style={{ margin: '2px 0 0' }}>{v}</p></div>)}</div>
            <div className="skel">
              <div className="skel-side">侧边栏<br /><span className="dp-faint">216px · 可折叠为 52px</span></div>
              <div className="skel-main">
                <div className="skel-top">顶栏 44px · 面包屑 + 命令面板入口</div>
                <div className="skel-body">
                  <div className="skel-content">页头 + 筛选条<br />高密度表格（行高 40px）</div>
                  <div className="skel-detail">详情面板<br /><span className="dp-faint">400px · 从右侧推入，不遮挡列表</span></div>
                </div>
              </div>
            </div>
          </Panel>
        </Sec>

        <Sec id="o-color" title="配色" sub={`当前颜色主题：${theme.name}。项目中不应出现这里没有的颜色。`}>
          <Panel>
            <div className="swatches">
              {COLOR_KEYS.map((k: string) => (
                <div key={k} className={'sw' + (flagged.has(k) ? ' flag' : '')}><i style={{ background: colors[k] }} /><div><b>{SW_LABEL[k]}</b><span className="dp-mono dp-faint">{colors[k]}</span></div></div>
              ))}
            </div>
            <div>
              <h3 className="dp-h3" style={{ marginBottom: 8 }}>可读性检查</h3>
              <div className="cr">
                {readability.map((r: any) => (
                  <span key={r.label} style={{ display: 'contents' }}>
                    <span className="sample" style={{ color: colors[r.fg], background: colors[r.bg] }}>{r.label} · 示例文字 Aa</span>
                    <span className="dp-mono dp-num">{r.ratio.toFixed(1)} : 1</span>
                    {r.ok ? <Tag tone="success">通过</Tag> : <Tag tone="danger">{accepted.has(`${mode}.${r.fg}/${r.bg}`) ? '不足 · 已保留' : `不足 · 建议 ${r.suggestion}`}</Tag>}
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </Sec>

        <Sec id="o-type" title="文字" sub="正文 13px，标题克制；数字统一等宽对齐。">
          <Panel>
            <div className="type">
              <span className="dp-faint">页面标题 20</span><h1 className="dp-h1">项目概览 Project overview</h1>
              <span className="dp-faint">区块标题 16</span><h2 className="dp-h2">本周进展与风险</h2>
              <span className="dp-faint">小标题 14</span><h3 className="dp-h3">里程碑</h3>
              <span className="dp-faint">正文 13</span><p>设计评审定在周四 15:00，请提前在文档里留下意见。The review is on Thursday at 3 PM.</p>
              <span className="dp-faint">次要 13</span><p className="dp-muted">最后编辑于 2 小时前 · 林晓</p>
              <span className="dp-faint">辅助 12</span><p className="dp-faint">支持 JPG、PNG，不超过 2 MB</p>
              <span className="dp-faint">数字</span><p className="dp-num" style={{ fontSize: 20, fontWeight: 600 }}>¥128,450.00 · 98.6% · 2026-09-25</p>
              <span className="dp-faint">代码与链接</span><p>运行 <code className="dp-code">npm run dev</code>，或查看 <a className="dp-link">使用说明</a></p>
            </div>
          </Panel>
        </Sec>

        <Sec id="o-btn" title="按钮" sub="4 种用途 × 6 种状态 × 3 种尺寸；主要操作旁显示快捷键。">
          <Panel>
            <div className="ov-row">
              <span className="ov-label">用途</span>
              <Cell cap="主要"><Button variant="primary" shortcut="N">新建项目</Button></Cell>
              <Cell cap="次要"><Button>导出</Button></Cell>
              <Cell cap="文字"><Button variant="ghost">取消</Button></Cell>
              <Cell cap="危险"><Button variant="danger">注销账号</Button></Cell>
              <Cell cap="仅图标"><Button iconOnly aria-label="更多"><MoreHorizontal className="dp-icon" /></Button></Cell>
              <Cell cap="按钮组"><ButtonGroup value={seg} onChange={setSeg} options={[{ value: 'table', label: '表格' }, { value: 'board', label: '看板' }, { value: 'cal', label: '日历' }]} /></Cell>
            </div>
            <div className="ov-row">
              <span className="ov-label">状态</span>
              <Cell cap="默认"><Button variant="primary">保存</Button></Cell>
              <Cell cap="悬停"><Button variant="primary" className="is-hover">保存</Button></Cell>
              <Cell cap="按下"><Button variant="primary" className="is-hover is-active">保存</Button></Cell>
              <Cell cap="键盘聚焦"><Button variant="primary" className="is-focus">保存</Button></Cell>
              <Cell cap="禁用"><Button variant="primary" disabled>保存</Button></Cell>
              <Cell cap="加载中"><Button variant="primary" loading>保存中</Button></Cell>
            </div>
            <div className="ov-row">
              <span className="ov-label">尺寸</span>
              <Cell cap="小 26"><Button size="sm">小按钮</Button></Cell>
              <Cell cap="默认 32"><Button>默认按钮</Button></Cell>
              <Cell cap="大 36"><Button variant="primary" size="lg">大按钮</Button></Cell>
            </div>
          </Panel>
        </Sec>

        <Sec id="o-form" title="表单输入" sub="标签在上、控件高 32px；报错信息紧跟在控件下方。">
          <Panel>
            <div className="ov-grid">
              <Field label="项目名称" help="默认"><Input placeholder="例如：官网改版" /></Field>
              <Field label="项目名称" help="聚焦"><Input className="is-focus" defaultValue="官网改版" /></Field>
              <Field label="邮箱" required error="邮箱格式不正确"><Input defaultValue="siyuan.chen@" /></Field>
              <Field label="邮箱" help="禁用"><Input defaultValue="siyuan.chen@tasko.cn" disabled /></Field>
              <Field label="搜索" help="带图标与快捷键"><SearchInput icon={<Search className="dp-icon" />} shortcut="/" placeholder="筛选项目" /></Field>
              <Field label="负责人" help="下拉选择"><Select options={['陈思远', '林晓']} /></Field>
              <Field label="描述" help="多行文本" className="ov-full"><Textarea placeholder="简单说明项目目标和范围" /></Field>
            </div>
          </Panel>
        </Sec>

        <Sec id="o-choice" title="选择类" sub="可点击切换；开关即时生效。">
          <Panel>
            <div className="ov-row"><span className="ov-label">复选框</span>
              <Checkbox checked={checks[0]} onChange={(v) => setChecks([v, checks[1]])} label="已选" />
              <Checkbox checked={checks[1]} onChange={(v) => setChecks([checks[0], v])} label="未选" />
              <Checkbox checked="mixed" label="部分选中" />
              <Checkbox checked={false} disabled label="禁用" />
            </div>
            <div className="ov-row"><span className="ov-label">单选</span><RadioGroup name="通知方式" value={radio} onChange={setRadio} options={[{ value: 'site', label: '站内' }, { value: 'mail', label: '邮件' }, { value: 'both', label: '两者' }]} /></div>
            <div className="ov-row"><span className="ov-label">开关</span>
              <label className="dp-choice"><Switch label="开启" checked={sw[0]} onChange={(v) => setSw([v, sw[1]])} />开启</label>
              <label className="dp-choice"><Switch label="关闭" checked={sw[1]} onChange={(v) => setSw([sw[0], v])} />关闭</label>
            </div>
          </Panel>
        </Sec>

        <Sec id="o-tag" title="标签 · 徽标 · 头像" sub="状态标签用小圆点区分，不用大面积色块。">
          <Panel>
            <div className="ov-row"><span className="ov-label">状态标签</span>{STATUSES.map((s) => <Tag key={s} tone={STATUS_TONE[s]}>{s}</Tag>)}<Tag tone="danger">已逾期</Tag><Tag outline>设计</Tag></div>
            <div className="ov-row"><span className="ov-label">徽标</span><Badge>5</Badge><Badge strong>12</Badge><span className="dp-with-badge"><button type="button" className="dp-icon-btn" aria-label="通知"><Bell className="dp-icon" /></button><Badge dot /></span></div>
            <div className="ov-row"><span className="ov-label">头像</span><Avatar name="陈思远" size="sm" /><Avatar name="林晓" /><Avatar name="王磊" size="lg" /><User name="赵一鸣" /></div>
            <div className="ov-row"><span className="ov-label">统计</span><Card style={{ padding: 16, minWidth: 200 }}><Stat label="本月完成任务" value="1,284" delta={{ text: '较上月 +12.4%', up: true }} /></Card></div>
          </Panel>
        </Sec>

        <Sec id="o-table" title="表格 · 筛选" sub="行高 40px、表头吸顶；悬停整行高亮；左侧竖线表示键盘焦点。">
          <Card style={{ overflow: 'hidden' }}>
            <div className="dp-page-head">
              <FilterChip icon={<Filter className="dp-icon" />} label="状态" value="进行中" />
              <FilterChip icon={<UserIcon className="dp-icon" />} label="负责人" />
              <FilterChip icon={<Plus className="dp-icon" />} label="添加筛选" />
            </div>
            <DataTable
              rows={rows}
              rowKey={(p) => p.id}
              selected={new Set([rows[2].id])}
              focusIndex={1}
              columns={[
                { key: 'id', title: '编号', render: (p) => <span className="dp-mono dp-faint">{p.id}</span> },
                { key: 'name', title: '名称', render: (p) => <span style={{ fontWeight: 500 }}>{p.name}</span> },
                { key: 'owner', title: '负责人', render: (p) => <User name={p.owner} /> },
                { key: 'status', title: '状态', render: (p) => <Tag tone={STATUS_TONE[p.status]}>{p.status}</Tag> },
                { key: 'progress', title: '进度', render: (p) => <InlineProgress value={p.progress} /> },
                { key: 'due', title: '截止', className: 'dp-num dp-muted', render: (p) => p.due.slice(5) }
              ]}
            />
            <TableFoot><span>共 24 条</span><Pagination page={page} pages={3} onChange={setPage} /></TableFoot>
          </Card>
        </Sec>

        <Sec id="o-nav" title="导航" sub="侧边栏可折叠为图标栏；标签页用下划线；面包屑放在顶栏。">
          <Panel>
            <Tabs value={tab} onChange={setTab} items={[{ value: 'all', label: '全部', count: 24 }, { value: 'doing', label: '进行中', count: 9 }, { value: 'done', label: '已完成' }, { value: 'archived', label: '已归档' }]} />
            <Breadcrumb items={[{ label: 'Tasko', href: '#overview' }, { label: '项目', href: '#overview' }, { label: '官网改版' }]} />
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {[false, true].map((rail) => (
                <div key={String(rail)} style={{ height: 230, display: 'flex', border: '1px solid var(--dp-border)', borderRadius: 'var(--dp-r-lg)', overflow: 'hidden' }}>
                  <Sidebar brand={{ mark: 'T', name: 'Tasko' }} rail={rail} onToggleRail={() => {}} current="list" items={[
                    { key: 'list', icon: <Folder className="dp-icon" />, label: '项目' },
                    { key: 'tasks', icon: <CircleDot className="dp-icon" />, label: '我的任务', badge: <Badge>5</Badge> },
                    { key: 'members', icon: <UserPlus className="dp-icon" />, label: '成员' }
                  ]} />
                </div>
              ))}
              <div className="dp-faint" style={{ alignSelf: 'center' }}>左：展开 216px　右：折叠 52px<br />按 <Kbd keys="[" /> 切换</div>
            </div>
          </Panel>
        </Sec>

        <Sec id="o-float" title="浮层" sub="菜单、命令面板、对话框、工具提示。对话框只用于不可撤销的操作和集中填写的表单。">
          <Panel>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Cell cap="菜单">
                <div className="dp-menu" style={{ animation: 'none' }}>
                  <div className="dp-menu-item"><CircleDot className="dp-icon" />修改状态<Kbd keys="S" /></div>
                  <div className="dp-menu-item"><UserPlus className="dp-icon" />分配负责人<Kbd keys="A" /></div>
                  <div className="dp-menu-item"><Link2 className="dp-icon" />复制链接</div>
                  <div className="dp-menu-sep" />
                  <div className="dp-menu-item is-danger"><Trash2 className="dp-icon" />删除<Kbd keys="⌫" /></div>
                </div>
              </Cell>
              <Cell cap="对话框">
                <div className="dp-dialog is-static" style={{ width: 360 }}>
                  <div className="dp-dialog-head"><h3 className="dp-dialog-title">注销账号？</h3><span className="dp-icon-btn"><X className="dp-icon" /></span></div>
                  <div className="dp-dialog-body"><p className="dp-dialog-desc">个人数据将在 30 天后永久删除，无法恢复。</p></div>
                  <div className="dp-dialog-foot"><Button variant="ghost">取消</Button><Button variant="danger">确认注销</Button></div>
                </div>
              </Cell>
              <Cell cap="工具提示（悬停 300ms 后出现）"><span className="dp-tooltip" style={{ animation: 'none' }}>折叠侧边栏 <Kbd keys="[" /></span></Cell>
            </div>
            <div className="ov-row">
              <Button icon={<CommandIcon className="dp-icon" />} shortcut={[MOD, 'K']} onClick={() => setCmdk(true)}>打开命令面板</Button>
              <Button onClick={() => setConfirm(true)}>打开对话框</Button>
              <Menu trigger={<Button>打开菜单</Button>} items={STATUSES.map((s) => ({ label: <Tag tone={STATUS_TONE[s]}>{s}</Tag>, onSelect: () => toast({ message: `状态已改为「${s}」`, icon: <Check className="dp-icon" /> }) }))} />
            </div>
          </Panel>
        </Sec>

        <Sec id="o-feedback" title="反馈" sub="提示消息出现在底部中间，可撤销的操作都带「撤销」；页内警告条紧凑。">
          <Panel>
            <div className="ov-row">
              <div className="dp-toast is-static"><Trash2 className="dp-icon" />已删除「官网改版」<button type="button" className="dp-toast-action">撤销</button></div>
              <div className="dp-toast is-static"><Check className="dp-icon" />状态已改为「已完成」<button type="button" className="dp-toast-action">撤销</button></div>
              <Button size="sm" onClick={() => toast({ message: '已删除「官网改版」', icon: <Trash2 className="dp-icon" />, undo: () => {} })}>触发一条</Button>
            </div>
            <Alert tone="info" title="新功能">项目现在支持设置里程碑。</Alert>
            <Alert tone="success" title="导出完成">共 1,284 条记录，已发送到你的邮箱。</Alert>
            <Alert tone="warning" title="存储即将用完">已使用 92%，建议清理归档项目。</Alert>
            <Alert tone="danger" title="同步失败">网络中断，恢复后会自动重试。</Alert>
            <div className="ov-row"><span className="ov-label">加载与保存</span><Spinner /><div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 240 }}><Skeleton width="60%" /><Skeleton /></div><Saved /><Progress value={36} width={160} /></div>
            <Card><EmptyState icon={<Folder className="dp-icon-lg" />} title="还没有项目" description={<>项目用来组织任务和成员。按 <Kbd keys="N" /> 快速创建。</>} action={<Button variant="primary" icon={<Plus className="dp-icon" />}>新建项目</Button>} /></Card>
            <Card><EmptyState error icon={<AlertTriangle className="dp-icon-lg" />} title="加载失败" description="网络连接不稳定，已保留你的筛选条件。" action={<Button>重试</Button>} /></Card>
          </Panel>
        </Sec>

        <Sec id="o-rule" title="交互规则" sub="项目里的 Agent 开发新页面时，需要遵守的交互方式。">
          <Panel>
            <ol className="rules">
              <li><b>查看详情不跳页</b>：点击列表行，在右侧推入详情面板，列表保持可见；<Kbd keys="J" /><Kbd keys="K" /> 在详情间切换。</li>
              <li><b>可撤销的操作不弹确认</b>：删除、改状态等直接执行，底部提示消息提供「撤销」（约 5 秒）。</li>
              <li><b>不可撤销的操作才用对话框</b>：如注销账号、永久删除；对话框需要二次输入确认。</li>
              <li><b>设置自动保存</b>：改完即存，控件旁显示「已保存」；不设全局保存按钮。</li>
              <li><b>新建用对话框</b>：<Kbd keys={[MOD, '↵']} /> 提交，<Kbd keys="Esc" /> 关闭；创建后新行短暂高亮。</li>
              <li><b>批量操作</b>：选中多行后，底部出现批量操作条。</li>
              <li><b>键盘优先</b>：常用操作都有快捷键，按钮与工具提示上显示快捷键。</li>
            </ol>
            <h3 className="dp-h3">快捷键</h3>
            <ShortcutList />
          </Panel>
        </Sec>

        <Sec id="o-motion" title="动效" sub="快进慢停、无弹跳。只动透明度和短距离位移。">
          <Panel>
            <div className="motion">
              {([['fast', '快 · 120ms', '悬停、菜单、工具提示', 120], ['std', '标准 · 160ms', '对话框、提示消息、开关', 160], ['panel', '面板 · 200ms', '侧边栏折叠、详情面板推入', 200]] as const).map(([k, t, d, ms]) => (
                <Card key={k} style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><b>{t}</b><div className="dp-faint">{d}</div></div>
                    <Button size="sm" onClick={() => { setPlayed((p) => ({ ...p, [k]: 0 })); requestAnimationFrame(() => requestAnimationFrame(() => setPlayed((p) => ({ ...p, [k]: Date.now() })))); }}>播放</Button>
                  </div>
                  <div className="m-track"><div className={'m-dot' + (played[k] ? ' go' : '')} style={{ ['--d' as string]: `${ms}ms` }} /></div>
                </Card>
              ))}
            </div>
          </Panel>
        </Sec>
      </div>
      <CommandPalette open={cmdk} onOpenChange={setCmdk} commands={[
        { id: 'a', group: '操作', label: '新建项目', icon: <Plus className="dp-icon" />, shortcut: 'N', run: () => toast({ message: '新建项目' }) },
        { id: 'b', group: '操作', label: '邀请成员', icon: <Mail className="dp-icon" />, run: () => toast({ message: '邀请成员' }) },
        ...seedProjects().map((p) => ({ id: p.id, group: '项目', label: p.name, keywords: p.id, run: () => toast({ message: `打开「${p.name}」` }) }))
      ]} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="注销账号？" description="个人数据将在 30 天后永久删除，无法恢复。" confirmWord="注销" actionLabel="确认注销" onConfirm={() => toast({ message: '已提交注销申请' })} />
    </div>
  );
}

