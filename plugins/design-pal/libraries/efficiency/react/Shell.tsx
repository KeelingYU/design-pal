import type { ReactNode } from 'react';
import { PanelLeft, Search } from 'lucide-react';
import { cx } from './cx';
import { Kbd, MOD } from './Kbd';
import { Tooltip } from './Tooltip';

/** 应用外壳：左侧可折叠侧边栏 + 右侧（顶栏 + 内容）。高度由父容器决定，通常为 100vh。 */
export function AppShell({ sidebar, topbar, children, style }: { sidebar: ReactNode; topbar: ReactNode; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="dp-shell" style={style}>
      {sidebar}
      <div className="dp-main">
        {topbar}
        <div className="dp-content">{children}</div>
      </div>
    </div>
  );
}

export interface NavEntry { key: string; icon: ReactNode; label: string; badge?: ReactNode; onClick?: () => void }

/** 侧边栏：展开 216px / 折叠 52px（按 [ 切换）。 */
export function Sidebar({ brand, items, groups = [], current, rail, onToggleRail }: { brand: { mark: string; name: string }; items: NavEntry[]; groups?: { title: string; items: NavEntry[] }[]; current?: string; rail: boolean; onToggleRail: () => void }) {
  const item = (it: NavEntry) => (
    <button key={it.key} type="button" title={it.label} className={cx('dp-nav-item', it.key === current && 'is-current')} aria-current={it.key === current ? 'page' : undefined} onClick={it.onClick}>
      {it.icon}
      <span className="dp-nav-label">{it.label}</span>
      {it.badge}
    </button>
  );
  return (
    <nav className={cx('dp-sidebar', rail && 'is-rail')} aria-label="主导航">
      <div className="dp-sidebar-top">
        <span className="dp-brand">
          <span className="dp-brand-mark">{brand.mark}</span>
          {brand.name}
        </span>
        <Tooltip content={rail ? '展开侧边栏' : '折叠侧边栏'} shortcut="[">
          <button type="button" className="dp-icon-btn" aria-label={rail ? '展开侧边栏' : '折叠侧边栏'} onClick={onToggleRail}><PanelLeft className="dp-icon" /></button>
        </Tooltip>
      </div>
      {items.map(item)}
      {groups.map((g) => (
        <div key={g.title} style={{ display: 'contents' }}>
          <div className="dp-nav-group">{g.title}</div>
          {g.items.map(item)}
        </div>
      ))}
    </nav>
  );
}

/** 顶栏：左侧面包屑，右侧命令面板入口与全局操作。 */
export function Topbar({ left, right, onCommand }: { left: ReactNode; right?: ReactNode; onCommand?: () => void }) {
  return (
    <header className="dp-topbar">
      {left}
      <span className="dp-spacer" />
      {onCommand && (
        <button type="button" className="dp-cmd-trigger" onClick={onCommand}>
          <Search className="dp-icon" />
          搜索或执行命令…
          <Kbd keys={[MOD, 'K']} />
        </button>
      )}
      {right}
    </header>
  );
}

/** 页头：标题 + 数量 + 筛选 + 右侧操作。 */
export function PageHead({ title, count, children, actions }: { title: ReactNode; count?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="dp-page-head">
      <h1 className="dp-page-title">{title}</h1>
      {count !== undefined && <span className="dp-page-count dp-num">{count}</span>}
      {children}
      <span className="dp-spacer" />
      {actions}
    </div>
  );
}
