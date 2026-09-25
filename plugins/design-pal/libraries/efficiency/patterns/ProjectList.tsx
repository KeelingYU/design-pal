// 页面配方：数据列表页。
// 页头（标题 + 数量 + 筛选条 + 搜索 + 主要操作）→ 高密度表格 → 表格底栏（快捷键说明 + 分页）；
// 点行在右侧推入详情面板；J/K 移动、↵ 打开、X 选择、N 新建、/ 搜索、Esc 关闭；
// 删除、改状态直接执行并提供「撤销」；选中多行出现批量操作条；空、加载中、加载失败、无匹配各有对应状态。
import { useState } from 'react';
import { Calendar, CloudOff, Filter, Folder, Link2, MoreHorizontal, Plus, Search, Trash2, User as UserIcon, UserPlus, X, CircleDot, Check } from 'lucide-react';
import {
  Avatar, BulkBar, Button, DataTable, DetailPanel, Dialog, EmptyState, Field, FilterChip, InlineProgress, Input, Kbd, Menu, PageHead,
  Pagination, Prop, SearchInput, Select, Skeleton, TableFoot, Tag, Textarea, User, useHotkeys, useToast, type Column, type MenuEntry
} from '../react';
import { STATUSES, STATUS_TONE, type Project, type Status } from './data';

export type ListState = 'normal' | 'empty' | 'loading' | 'error';

export function ProjectListPage({ projects, setProjects, state, onRetry, openId, setOpenId, onNew, newId }: {
  projects: Project[];
  setProjects: (updater: (p: Project[]) => Project[]) => void;
  state: ListState;
  onRetry: () => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onNew: () => void;
  newId: string | null;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<Status | '全部'>('全部');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState(0);
  const rows = projects.filter((p) => (status === '全部' || p.status === status) && (!q || p.name.includes(q) || p.id.includes(q.toUpperCase())));
  const open = projects.find((p) => p.id === openId) || null;
  const ready = state === 'normal' && projects.length > 0;

  const changeStatus = (ids: string[], s: Status) => {
    const before = projects.filter((p) => ids.includes(p.id)).map((p) => [p.id, p.status] as const);
    setProjects((ps) => ps.map((p) => (ids.includes(p.id) ? { ...p, status: s } : p)));
    toast({ message: `${ids.length > 1 ? `${ids.length} 个项目的` : ''}状态已改为「${s}」`, icon: <Check className="dp-icon" />, undo: () => setProjects((ps) => ps.map((p) => { const b = before.find(([id]) => id === p.id); return b ? { ...p, status: b[1] } : p; })) });
  };
  const remove = (ids: string[]) => {
    const snapshot = projects;
    const name = projects.find((p) => p.id === ids[0])?.name;
    setProjects((ps) => ps.filter((p) => !ids.includes(p.id)));
    setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
    if (openId && ids.includes(openId)) setOpenId(null);
    toast({ message: ids.length > 1 ? `已删除 ${ids.length} 个项目` : `已删除「${name}」`, icon: <Trash2 className="dp-icon" />, undo: () => setProjects(() => snapshot) });
  };
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const move = (d: number) => {
    if (!rows.length) return;
    const i = Math.max(0, Math.min(rows.length - 1, focus + d));
    setFocus(i);
    if (openId) setOpenId(rows[i].id);
  };
  const statusItems = (onPick: (s: Status) => void, current?: Status): MenuEntry[] =>
    STATUSES.map((s) => ({ label: <Tag tone={STATUS_TONE[s]}>{s}</Tag>, checked: s === current, onSelect: () => onPick(s) }));

  useHotkeys({
    j: () => move(1), ArrowDown: () => move(1), k: () => move(-1), ArrowUp: () => move(-1),
    Enter: () => rows[focus] && setOpenId(rows[focus].id), o: () => rows[focus] && setOpenId(rows[focus].id),
    x: () => rows[focus] && toggle(rows[focus].id),
    n: (e) => { e.preventDefault(); onNew(); },
    '/': (e) => { e.preventDefault(); document.getElementById('dp-list-search')?.focus(); },
    Escape: () => { if (openId) setOpenId(null); else setSelected(new Set()); }
  }, ready);

  const columns: Column<Project>[] = [
    { key: 'id', title: '编号', render: (p) => <span className="dp-mono dp-faint">{p.id}</span> },
    { key: 'name', title: '名称', render: (p) => <span style={{ fontWeight: 500 }}>{p.name}</span> },
    { key: 'owner', title: '负责人', render: (p) => <User name={p.owner} /> },
    {
      key: 'status', title: '状态',
      render: (p) => <Menu trigger={<Tag tone={STATUS_TONE[p.status]} onClick={(e) => e.stopPropagation()} aria-label={`修改「${p.name}」的状态`}>{p.status}</Tag>} items={statusItems((s) => changeStatus([p.id], s), p.status)} />
    },
    { key: 'progress', title: '进度', render: (p) => <InlineProgress value={p.progress} /> },
    { key: 'due', title: '截止', className: 'dp-num dp-muted', render: (p) => p.due.slice(5) },
    {
      key: 'more', title: '', width: 40,
      render: (p) => (
        <Menu
          align="end"
          trigger={<button type="button" className="dp-icon-btn" aria-label={`「${p.name}」的更多操作`} onClick={(e) => e.stopPropagation()}><MoreHorizontal className="dp-icon" /></button>}
          items={[
            { label: '复制链接', icon: <Link2 className="dp-icon" />, onSelect: () => toast({ message: '链接已复制', icon: <Link2 className="dp-icon" /> }) },
            'separator',
            { label: '删除', icon: <Trash2 className="dp-icon" />, shortcut: '⌫', danger: true, onSelect: () => remove([p.id]) }
          ]}
        />
      )
    }
  ];

  let body;
  if (state === 'loading') {
    body = (
      <table className="dp-table" aria-busy="true"><tbody>
        {Array.from({ length: 8 }, (_, i) => <tr key={i}>{[14, 50, 180, 70, 60, 90, 40].map((w, j) => <td key={j}><Skeleton width={w} /></td>)}</tr>)}
      </tbody></table>
    );
  } else if (state === 'error') {
    body = <EmptyState error icon={<CloudOff className="dp-icon-lg" />} title="加载失败" description="网络连接不稳定，已保留你的筛选条件。" action={<Button onClick={onRetry}>重试</Button>} />;
  } else if (state === 'empty' || projects.length === 0) {
    body = <EmptyState icon={<Folder className="dp-icon-lg" />} title="还没有项目" description={<>项目用来组织任务和成员。按 <Kbd keys="N" /> 快速创建。</>} action={<Button variant="primary" icon={<Plus className="dp-icon" />} onClick={onNew}>新建项目</Button>} />;
  } else if (rows.length === 0) {
    body = <EmptyState icon={<Search className="dp-icon-lg" />} title="没有匹配的项目" description="试试其他关键词，或清除筛选条件。" action={<Button onClick={() => { setQ(''); setStatus('全部'); }}>清除筛选</Button>} />;
  } else {
    body = (
      <>
        <div className="dp-table-wrap" style={{ flex: 1 }}>
          <DataTable
            rows={rows}
            rowKey={(p) => p.id}
            columns={columns}
            selected={selected}
            onToggle={toggle}
            onToggleAll={() => setSelected((s) => (rows.every((r) => s.has(r.id)) ? new Set() : new Set(rows.map((r) => r.id))))}
            focusIndex={focus}
            openKey={openId}
            newKey={newId}
            onRowClick={(p, i) => { setFocus(i); setOpenId(p.id); }}
          />
        </div>
        <TableFoot>
          <span>{rows.length} 个项目 · <Kbd keys="J" /> <Kbd keys="K" /> 上下移动 · <Kbd keys="↵" /> 打开 · <Kbd keys="X" /> 选择</span>
          <Pagination page={1} pages={2} onChange={() => {}} />
        </TableFoot>
      </>
    );
  }

  return (
    <>
      <div className="dp-content-main">
        <PageHead
          title="项目"
          count={state === 'normal' ? projects.length : undefined}
          actions={
            <>
              <SearchInput id="dp-list-search" icon={<Search className="dp-icon" />} shortcut="/" placeholder="筛选项目" value={q} onChange={(e) => { setQ(e.target.value); setFocus(0); }} style={{ width: 200 }} />
              <Button variant="primary" icon={<Plus className="dp-icon" />} shortcut="N" onClick={onNew}>新建项目</Button>
            </>
          }
        >
          <Menu
            trigger={<span><FilterChip icon={<Filter className="dp-icon" />} label="状态" value={status === '全部' ? undefined : status} /></span>}
            items={[{ label: '全部状态', checked: status === '全部', onSelect: () => setStatus('全部') }, ...statusItems((s) => { setStatus(s); setFocus(0); }, status === '全部' ? undefined : status)]}
          />
          <FilterChip icon={<UserIcon className="dp-icon" />} label="负责人" />
        </PageHead>
        {body}
        <BulkBar
          count={selected.size}
          onClear={<button type="button" className="dp-btn dp-btn-ghost dp-btn-sm" aria-label="取消选择" onClick={() => setSelected(new Set())}><X className="dp-icon" /></button>}
        >
          <Menu trigger={<button type="button" className="dp-btn dp-btn-ghost dp-btn-sm"><CircleDot className="dp-icon" />修改状态</button>} items={statusItems((s) => changeStatus([...selected], s))} />
          <button type="button" className="dp-btn dp-btn-ghost dp-btn-sm"><UserPlus className="dp-icon" />分配</button>
          <button type="button" className="dp-btn dp-btn-ghost dp-btn-sm" onClick={() => remove([...selected])}><Trash2 className="dp-icon" />删除</button>
        </BulkBar>
      </div>
      <DetailPanel open={!!open} title={open?.id ?? ''} onClose={() => setOpenId(null)} onPrev={() => move(-1)} onNext={() => move(1)}>
        {open && <ProjectDetail key={open.id} project={open} onChange={(patch) => { setProjects((ps) => ps.map((p) => (p.id === open.id ? { ...p, ...patch } : p))); toast({ message: '已保存', icon: <Check className="dp-icon" /> }); }} onStatus={(s) => changeStatus([open.id], s)} statusItems={statusItems} />}
      </DetailPanel>
    </>
  );
}

function ProjectDetail({ project, onChange, onStatus, statusItems }: { project: Project; onChange: (patch: Partial<Project>) => void; onStatus: (s: Status) => void; statusItems: (onPick: (s: Status) => void, current?: Status) => MenuEntry[] }) {
  return (
    <>
      <Input
        aria-label="项目名称"
        className="dp-input-bare"
        defaultValue={project.name}
        onBlur={(e) => e.target.value.trim() && e.target.value !== project.name && onChange({ name: e.target.value.trim() })}
        style={{ fontSize: 16, fontWeight: 600, height: 34, padding: '0 6px', margin: '0 -6px' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Prop label="状态"><Menu trigger={<Tag tone={STATUS_TONE[project.status]} onClick={() => {}}>{project.status}</Tag>} items={statusItems(onStatus, project.status)} /></Prop>
        <Prop label="负责人"><User name={project.owner} /></Prop>
        <Prop label="截止日期"><span className="dp-num" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Calendar className="dp-icon" />{project.due}</span></Prop>
        <Prop label="进度"><InlineProgress value={project.progress} /></Prop>
      </div>
      <Field label="描述" help="修改后自动保存">
        <Textarea defaultValue={project.desc} onBlur={(e) => e.target.value !== project.desc && onChange({ desc: e.target.value })} />
      </Field>
      <ul className="dp-activity">
        <h3 className="dp-h3" style={{ fontSize: 13 }}>动态</h3>
        {[['林晓', `将状态改为 ${project.status}`, '2 小时前'], ['陈思远', '更新了描述', '昨天'], ['王磊', '创建了项目', '9 月 1 日']].map(([who, what, when]) => (
          <li key={who} className="dp-activity-item"><Avatar name={who} size="sm" /><span><b style={{ color: 'var(--dp-text)', fontWeight: 500 }}>{who}</b> {what} · {when}</span></li>
        ))}
      </ul>
    </>
  );
}

/** 新建项目对话框：⌘↵ 创建；名称必填，报错就地显示。 */
export function NewProjectDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (p: Omit<Project, 'id' | 'progress' | 'due'>) => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [owner, setOwner] = useState('陈思远');
  const [status, setStatus] = useState<Status>('未开始');
  const [error, setError] = useState('');
  const reset = () => { setName(''); setDesc(''); setError(''); };
  const submit = () => {
    if (!name.trim()) { setError('请填写名称'); return; }
    onCreate({ name: name.trim(), desc: desc.trim() || '暂无描述', owner, status });
    reset();
    onOpenChange(false);
  };
  const close = (o: boolean) => { if (!o) reset(); onOpenChange(o); };
  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title="新建项目"
      onSubmit={submit}
      footer={<><Button variant="ghost" onClick={() => close(false)}>取消</Button><Button variant="primary" onClick={submit}>创建项目</Button></>}
    >
      <Field label="名称" required error={error}><Input autoFocus placeholder="例如：官网改版" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} /></Field>
      <Field label="描述"><Textarea placeholder="可选" value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="负责人"><Select value={owner} onChange={(e) => setOwner(e.target.value)} options={['陈思远', '林晓', '王磊']} /></Field>
        <Field label="状态"><Select value={status} onChange={(e) => setStatus(e.target.value as Status)} options={STATUSES} /></Field>
      </div>
    </Dialog>
  );
}
