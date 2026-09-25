import type { ReactNode } from 'react';
import { cx } from './cx';
import { Checkbox } from './Choice';

export interface Column<T> { key: string; title: ReactNode; render: (row: T) => ReactNode; width?: number | string; className?: string }

/** 高密度数据表格：行高 40px、表头吸顶、整行可点、左侧竖线表示键盘焦点、可多选。
 *  配合 useListKeys（J/K/↵/X/Esc）与 DetailPanel 使用。 */
export function DataTable<T>({ rows, rowKey, columns, selected, onToggle, onToggleAll, focusIndex, openKey, newKey, onRowClick }: {
  rows: T[];
  rowKey: (r: T) => string;
  columns: Column<T>[];
  selected?: Set<string>;
  onToggle?: (key: string) => void;
  onToggleAll?: () => void;
  focusIndex?: number;
  openKey?: string | null;
  newKey?: string | null;
  onRowClick?: (row: T, index: number) => void;
}) {
  const all = !!selected && rows.length > 0 && rows.every((r) => selected.has(rowKey(r)));
  const some = !!selected && !all && rows.some((r) => selected.has(rowKey(r)));
  return (
    <table className="dp-table">
      <thead>
        <tr>
          {selected && <th className="dp-col-check"><Checkbox checked={all ? true : some ? 'mixed' : false} onChange={() => onToggleAll?.()} label={undefined} /></th>}
          {columns.map((c) => <th key={c.key} style={{ width: c.width }}>{c.title}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const k = rowKey(r);
          return (
            <tr
              key={k}
              data-row={k}
              className={cx(onRowClick && 'is-clickable', i === focusIndex && 'is-focus', selected?.has(k) && 'is-selected', openKey === k && 'is-open', newKey === k && 'is-new')}
              onClick={() => onRowClick?.(r, i)}
            >
              {selected && <td className="dp-col-check"><Checkbox checked={selected.has(k)} onChange={() => onToggle?.(k)} /></td>}
              {columns.map((c) => <td key={c.key} className={c.className}>{c.render(r)}</td>)}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function TableFoot({ children }: { children: ReactNode }) {
  return <div className="dp-table-foot">{children}</div>;
}

/** 批量操作条：选中多行后出现在列表底部。 */
export function BulkBar({ count, children, onClear }: { count: number; children: ReactNode; onClear: ReactNode }) {
  if (!count) return null;
  return (
    <div className="dp-bulk" role="toolbar" aria-label="批量操作">
      <span>已选 {count} 项</span>
      <span className="dp-bulk-sep" />
      {children}
      <span className="dp-bulk-sep" />
      {onClear}
    </div>
  );
}
