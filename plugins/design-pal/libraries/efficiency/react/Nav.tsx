import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from './cx';

export function Tabs<T extends string>({ items, value, onChange }: { items: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="dp-tabs" role="tablist">
      {items.map((it) => (
        <button key={it.value} type="button" role="tab" aria-selected={it.value === value} className={cx('dp-tab', it.value === value && 'is-current')} onClick={() => onChange(it.value)}>
          {it.label}
          {it.count !== undefined && <span className="dp-badge">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** 筛选条目：未设置时为虚线框，设置后显示当前值。点击通常打开 Menu 选择。 */
export function FilterChip({ icon, label, value, onClick }: { icon?: ReactNode; label: ReactNode; value?: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className={cx('dp-filter', value !== undefined && 'is-set')} onClick={onClick}>
      {icon}
      {label}
      {value !== undefined && (
        <>
          ：<span className="dp-filter-value">{value}</span>
        </>
      )}
    </button>
  );
}

export function Breadcrumb({ items }: { items: { label: ReactNode; href?: string; onClick?: () => void }[] }) {
  return (
    <nav className="dp-breadcrumb" aria-label="面包屑">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} style={{ display: 'contents' }}>
            {last ? <span className="dp-breadcrumb-current" aria-current="page">{it.label}</span> : <a href={it.href} onClick={it.onClick}>{it.label}</a>}
            {!last && <span className="dp-breadcrumb-sep">/</span>}
          </span>
        );
      })}
    </nav>
  );
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  return (
    <div className="dp-pagination">
      <button type="button" className="dp-page" aria-label="上一页" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="dp-icon" /></button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button key={p} type="button" className={cx('dp-page', p === page && 'is-current')} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button type="button" className="dp-page" aria-label="下一页" disabled={page >= pages} onClick={() => onChange(page + 1)}><ChevronRight className="dp-icon" /></button>
    </div>
  );
}
