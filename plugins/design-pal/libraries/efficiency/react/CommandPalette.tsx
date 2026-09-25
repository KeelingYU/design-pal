import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { cx } from './cx';
import { Kbd } from './Kbd';

export interface Command { id: string; group: string; label: string; icon?: ReactNode; shortcut?: string; keywords?: string; run: () => void }

/** 全局命令面板（⌘K）：跳转、操作、搜索对象。↑↓ 选择，↵ 执行，Esc 关闭。 */
export function CommandPalette({ open, onOpenChange, commands, placeholder = '输入命令或搜索…' }: { open: boolean; onOpenChange: (o: boolean) => void; commands: Command[]; placeholder?: string }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? commands.filter((c) => (c.label + ' ' + (c.keywords || '')).toLowerCase().includes(s)) : commands;
  }, [q, commands]);
  useEffect(() => { if (open) { setQ(''); setActive(0); } }, [open]);
  useEffect(() => { listRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' }); }, [active]);
  if (!open) return null;
  const run = (i: number) => { const c = shown[i]; onOpenChange(false); c && setTimeout(c.run, 0); };
  let group = '';
  return createPortal(
    <div className="dp-cmdk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}>
      <div className="dp-cmdk" role="dialog" aria-label="命令面板">
        <div className="dp-cmdk-input">
          <Search className="dp-icon" />
          <input
            autoFocus
            value={q}
            placeholder={placeholder}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); run(active); }
              else if (e.key === 'Escape') onOpenChange(false);
            }}
          />
          <Kbd keys="Esc" />
        </div>
        <div className="dp-cmdk-list" ref={listRef} role="listbox">
          {shown.length === 0 && <div className="dp-empty" style={{ padding: 28 }}><p className="dp-empty-desc">没有匹配的结果</p></div>}
          {shown.map((c, i) => {
            const head = c.group !== group ? ((group = c.group), <div key={'g' + c.group} className="dp-menu-group">{c.group}</div>) : null;
            return (
              <div key={c.id} style={{ display: 'contents' }}>
                {head}
                <div role="option" aria-selected={i === active} className={cx('dp-menu-item', i === active && 'is-active')} onMouseMove={() => setActive(i)} onClick={() => run(i)}>
                  {c.icon}
                  {c.label}
                  {c.shortcut && <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}><Kbd keys={c.shortcut.split(' ')} /></span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="dp-cmdk-foot">
          <span><Kbd keys={['↑', '↓']} /> 选择</span>
          <span><Kbd keys="↵" /> 执行</span>
          <span><Kbd keys="Esc" /> 关闭</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
