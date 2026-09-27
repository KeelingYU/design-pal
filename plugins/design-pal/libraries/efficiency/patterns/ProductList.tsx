// 页面配方：商品后台。示例数据仅保存在当前页面，刷新后恢复。
import { useRef, useState } from 'react';
import { Package, Search, Plus, Filter, CloudOff } from 'lucide-react';
import { AppShell, Sidebar, Topbar, Breadcrumb, Avatar, CommandPalette, PageHead, Button, SearchInput, FilterChip, Menu, Tag, DataTable, TableFoot, BulkBar, DetailPanel, Prop, EmptyState, Skeleton, Dialog, Field, Input, Select, Kbd, useHotkeys, useToast, type Column } from '../react';
import type { ListState } from './ProjectList';

type Status = '销售中' | '待上架' | '已下架';
type Product = { id: string; name: string; category: string; price: number; stock: number; status: Status };
const statuses: Status[] = ['销售中', '待上架', '已下架'];
const tones = { '销售中': 'success', '待上架': 'warning', '已下架': 'neutral' } as const;
const categories = ['数码配件', '办公文具', '生活用品'];
const seed: Product[] = [
  { id: 'SP-1001', name: '无线降噪耳机', category: '数码配件', price: 399, stock: 128, status: '销售中' },
  { id: 'SP-1002', name: '轻量机械键盘', category: '数码配件', price: 269, stock: 8, status: '销售中' },
  { id: 'SP-1003', name: '桌面收纳盒', category: '办公文具', price: 59, stock: 246, status: '销售中' },
  { id: 'SP-1004', name: '便携保温杯', category: '生活用品', price: 129, stock: 0, status: '已下架' },
  { id: 'SP-1005', name: '磁吸充电支架', category: '数码配件', price: 159, stock: 64, status: '待上架' },
  { id: 'SP-1006', name: '方格笔记本', category: '办公文具', price: 29.9, stock: 512, status: '销售中' },
  { id: 'SP-1007', name: '护眼阅读灯', category: '生活用品', price: 189, stock: 6, status: '销售中' },
  { id: 'SP-1008', name: '编织数据线', category: '数码配件', price: 39, stock: 320, status: '销售中' },
  { id: 'SP-1009', name: '随行帆布袋', category: '生活用品', price: 49, stock: 85, status: '待上架' },
  { id: 'SP-1010', name: '铝合金笔筒', category: '办公文具', price: 45, stock: 32, status: '已下架' },
];
const money = (n: number) => `¥${n.toFixed(2)}`;

export function ProductListApp({ state, setState }: { state: ListState; setState: (s: ListState) => void }) {
  const [products, setProducts] = useState(seed);
  const nextId = useRef(1011);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('全部');
  const [category, setCategory] = useState('全部');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [focus, setFocus] = useState(0);
  const [rail, setRail] = useState(false);
  const [cmdk, setCmdk] = useState(false);
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const rows = products.filter((p) => (status === '全部' || p.status === status) && (category === '全部' || p.category === category) && `${p.name} ${p.id}`.toLowerCase().includes(q.trim().toLowerCase()));
  const open = products.find((p) => p.id === openId);
  const clear = () => { setQ(''); setStatus('全部'); setCategory('全部'); setFocus(0); setSelected(new Set()); };
  const changeStatus = (ids: string[], next: Status) => {
    const before = products.filter((p) => ids.includes(p.id));
    setProducts((ps) => ps.map((p) => ids.includes(p.id) ? { ...p, status: next } : p));
    setSelected(new Set());
    toast({ message: `${ids.length} 个商品已改为「${next}」`, undo: () => setProducts((ps) => ps.map((p) => { const old = before.find((b) => b.id === p.id); return old ? { ...p, status: old.status } : p; })) });
  };
  const statusItems = (ids: string[]) => statuses.map((s) => ({ label: <Tag tone={tones[s]}>{s}</Tag>, onSelect: () => changeStatus(ids, s) }));
  const toggle = (id: string) => setSelected((s) => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const move = (d: number) => { const i = Math.max(0, Math.min(rows.length - 1, focus + d)); setFocus(i); if (openId && rows[i]) setOpenId(rows[i].id); };
  useHotkeys({ 'mod+k': () => setCmdk(true), '[': () => setRail((r) => !r), n: () => setCreating(true), '/': (e) => { e.preventDefault(); document.getElementById('product-search')?.focus(); }, Escape: () => { setOpenId(null); setSelected(new Set()); } });
  useHotkeys({ j: () => move(1), k: () => move(-1), ArrowDown: () => move(1), ArrowUp: () => move(-1), Enter: () => rows[focus] && setOpenId(rows[focus].id), x: () => rows[focus] && toggle(rows[focus].id) }, state === 'normal');
  const columns: Column<Product>[] = [
    { key: 'id', title: '商品编号', render: (p) => <span className="dp-mono dp-faint">{p.id}</span> },
    { key: 'name', title: '商品名称', render: (p) => <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><Package className="dp-icon" style={{ color: `var(--dp-${p.category === '数码配件' ? 'primary' : p.category === '办公文具' ? 'warning' : 'success'})` }} />{p.name}</span> },
    { key: 'category', title: '分类', className: 'dp-muted', render: (p) => p.category },
    { key: 'price', title: <div style={{ textAlign: 'right' }}>售价</div>, render: (p) => <div className="dp-num" style={{ textAlign: 'right' }}>{money(p.price)}</div> },
    { key: 'stock', title: <div style={{ textAlign: 'right' }}>库存</div>, render: (p) => <div className="dp-num" style={{ textAlign: 'right', color: p.stock < 10 ? 'var(--dp-warning)' : undefined }}>{p.stock}{p.stock < 10 && <span style={{ marginLeft: 6 }}>待补货</span>}</div> },
    { key: 'status', title: '状态', render: (p) => <Menu trigger={<Tag tone={tones[p.status]} aria-label={`修改「${p.name}」的状态`} onClick={(e) => e.stopPropagation()}>{p.status}</Tag>} items={statusItems([p.id])} /> },
  ];
  return <>
    <AppShell style={{ height: '100%' }} sidebar={<Sidebar brand={{ mark: 'S', name: '商家工作台' }} rail={rail} onToggleRail={() => setRail((r) => !r)} current="products" items={[{ key: 'products', icon: <Package className="dp-icon" />, label: '商品管理', onClick: clear }]} groups={[{ title: '商品分类', items: categories.map((c) => ({ key: c, icon: <Package className="dp-icon" />, label: c, onClick: () => { setCategory(c); setFocus(0); setSelected(new Set()); } })) }]} />} topbar={<Topbar left={<Breadcrumb items={[{ label: '商家工作台' }, { label: '商品管理' }]} />} onCommand={() => setCmdk(true)} right={<><span className="dp-faint">演示数据 · 刷新后恢复</span><Avatar name="林晓" /></>} />}>
      <div className="dp-content-main">
        <PageHead title="商品" count={state === 'normal' ? rows.length : undefined} actions={<><SearchInput id="product-search" aria-label="搜索商品" placeholder="搜索商品名称或编号" icon={<Search className="dp-icon" />} shortcut="/" value={q} onChange={(e) => { setQ(e.target.value); setFocus(0); setSelected(new Set()); }} style={{ width: 210 }} /><Button variant="primary" icon={<Plus className="dp-icon" />} shortcut="N" onClick={() => setCreating(true)}>新增商品</Button></>}>
          <Menu trigger={<span><FilterChip icon={<Filter className="dp-icon" />} label="状态" value={status === '全部' ? undefined : status} /></span>} items={[{ label: '全部状态', onSelect: () => { setStatus('全部'); setFocus(0); setSelected(new Set()); } }, ...statuses.map((s) => ({ label: <Tag tone={tones[s]}>{s}</Tag>, onSelect: () => { setStatus(s); setFocus(0); setSelected(new Set()); } }))]} />
          <Menu trigger={<span><FilterChip label="分类" value={category === '全部' ? undefined : category} /></span>} items={['全部', ...categories].map((c) => ({ label: c, onSelect: () => { setCategory(c); setFocus(0); setSelected(new Set()); } }))} />
        </PageHead>
        {state === 'loading' ? <div aria-busy="true" aria-label="正在加载商品" style={{ padding: 20 }}><Skeleton height={240} /></div> : state === 'error' ? <EmptyState error icon={<CloudOff className="dp-icon-lg" />} title="商品加载失败" description="请重试，已保留筛选条件。" action={<Button onClick={() => setState('normal')}>重试</Button>} /> : state === 'empty' ? <EmptyState icon={<Package className="dp-icon-lg" />} title="还没有商品" description="添加第一件商品，开始管理商品目录。" action={<Button onClick={() => setCreating(true)}>新增商品</Button>} /> : !rows.length ? <EmptyState icon={<Search className="dp-icon-lg" />} title="没有匹配的商品" action={<Button onClick={clear}>清除筛选</Button>} /> : <>
          <div className="dp-table-wrap" style={{ flex: 1 }}><DataTable rows={rows} rowKey={(p) => p.id} columns={columns} focusIndex={focus} openKey={openId} selected={selected} onToggle={toggle} onToggleAll={() => setSelected(rows.every((p) => selected.has(p.id)) ? new Set() : new Set(rows.map((p) => p.id)))} onRowClick={(p, i) => { setFocus(i); setOpenId(p.id); }} /></div>
          <TableFoot><span>{rows.length} 个商品 · <Kbd keys="J" /> <Kbd keys="K" /> 上下移动 · <Kbd keys="↵" /> 详情 · <Kbd keys="X" /> 选择</span><span>全部商品已显示</span></TableFoot>
          <BulkBar count={selected.size} onClear={<Button variant="ghost" onClick={() => setSelected(new Set())}>取消选择</Button>}><Button variant="ghost" onClick={() => changeStatus([...selected], '销售中')}>上架</Button><Button variant="ghost" onClick={() => changeStatus([...selected], '已下架')}>下架</Button></BulkBar>
        </>}
      </div>
      <DetailPanel open={!!open && state === 'normal'} title={open?.id || ''} onClose={() => setOpenId(null)} onPrev={() => move(-1)} onNext={() => move(1)}>{open && <><h2 className="dp-h2">{open.name}</h2><Prop label="分类">{open.category}</Prop><Prop label="售价"><span className="dp-num">{money(open.price)}</span></Prop><Prop label="库存"><span className="dp-num">{open.stock}</span></Prop><Prop label="状态"><Menu trigger={<Tag tone={tones[open.status]} onClick={() => {}}>{open.status}</Tag>} items={statusItems([open.id])} /></Prop><p className="dp-muted">商品状态可就地修改，操作后支持撤销。</p></>}</DetailPanel>
    </AppShell>
    <CommandPalette open={cmdk} onOpenChange={setCmdk} commands={[{ id: 'new-product', group: '操作', label: '新增商品', shortcut: 'N', run: () => setCreating(true) }, { id: 'search-products', group: '操作', label: '搜索商品', shortcut: '/', run: () => document.getElementById('product-search')?.focus() }, ...products.map((p) => ({ id: p.id, group: '商品', label: p.name, keywords: p.id, run: () => { setState('normal'); setOpenId(p.id); } }))]} />
    {creating && <NewProductDialog onClose={() => setCreating(false)} onCreate={(p) => { const id = `SP-${nextId.current++}`; setProducts((ps) => [{ ...p, id, status: '待上架' }, ...(state === 'empty' ? [] : ps)]); clear(); setState('normal'); setCreating(false); toast({ message: `已添加「${p.name}」`, action: { label: '打开', run: () => setOpenId(id) } }); }} />}
  </>;
}

function NewProductDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Omit<Product, 'id' | 'status'>) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [error, setError] = useState('');
  const submit = () => {
    if (!name.trim()) { setError('请填写商品名称'); return; }
    if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || !/^\d+(\.\d{1,2})?$/.test(price)) { setError('售价需为非负金额，最多两位小数'); return; }
    if (!/^\d+$/.test(stock) || !Number.isSafeInteger(Number(stock))) { setError('库存需为非负整数'); return; }
    onCreate({ name: name.trim(), category, price: Number(price), stock: Number(stock) });
  };
  return <Dialog open onOpenChange={(o) => !o && onClose()} title="新增商品" onSubmit={submit} footer={<><Button variant="ghost" onClick={onClose}>取消</Button><Button variant="primary" onClick={submit}>添加商品</Button></>}>
    <Field label="商品名称" required><Input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(''); }} /></Field>
    <Field label="分类"><Select options={categories} value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
    <Field label="售价（元）" required><Input inputMode="decimal" value={price} onChange={(e) => { setPrice(e.target.value); setError(''); }} /></Field>
    <Field label="库存" required><Input inputMode="numeric" value={stock} onChange={(e) => { setStock(e.target.value); setError(''); }} /></Field>
    {error && <p role="alert" style={{ color: 'var(--dp-danger)' }}>{error}</p>}
  </Dialog>;
}
