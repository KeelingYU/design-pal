import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cx } from './cx';
import { Tooltip } from './Tooltip';

/** 详情面板：从右侧推入，占据布局空间，列表保持可见；查看详情一律用它，不跳页。
 *  open 由有无选中项决定；关闭时先收起再卸载内容（200ms）。 */
export function DetailPanel({ open, title, onClose, onPrev, onNext, actions, children }: { open: boolean; title: ReactNode; onClose: () => void; onPrev?: () => void; onNext?: () => void; actions?: ReactNode; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <aside className={cx('dp-detail', shown && 'is-open')} aria-hidden={!open} aria-label="详情">
      {mounted && (
        <div className="dp-detail-inner">
          <div className="dp-detail-head">
            <span className="dp-mono dp-faint">{title}</span>
            <span className="dp-spacer" />
            {onPrev && <Tooltip content="上一个" shortcut="K"><button type="button" className="dp-icon-btn" aria-label="上一个" onClick={onPrev}><ChevronUp className="dp-icon" /></button></Tooltip>}
            {onNext && <Tooltip content="下一个" shortcut="J"><button type="button" className="dp-icon-btn" aria-label="下一个" onClick={onNext}><ChevronDown className="dp-icon" /></button></Tooltip>}
            {actions}
            <Tooltip content="关闭" shortcut="Esc"><button type="button" className="dp-icon-btn" aria-label="关闭详情" onClick={onClose}><X className="dp-icon" /></button></Tooltip>
          </div>
          <div className="dp-detail-body">{children}</div>
        </div>
      )}
    </aside>
  );
}

export function Prop({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="dp-prop">
      <span className="dp-prop-label">{label}</span>
      <span>{children}</span>
    </div>
  );
}
