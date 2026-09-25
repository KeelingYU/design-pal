import type { ReactNode } from 'react';
import { AlertTriangle, Check, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cx } from './cx';

const ALERT_ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

/** 页内警告条：紧凑，一行标题 + 说明。 */
export function Alert({ tone = 'info', title, children }: { tone?: keyof typeof ALERT_ICON; title?: ReactNode; children?: ReactNode }) {
  const Icon = ALERT_ICON[tone];
  return (
    <div className={`dp-alert dp-alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon className="dp-icon" />
      <div>
        {title && <span className="dp-alert-title">{title}</span>}
        {children}
      </div>
    </div>
  );
}

export function Progress({ value, width }: { value: number; width?: number | string }) {
  return (
    <div className={cx('dp-progress', value >= 100 && 'is-done')} style={{ width }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${value}%` }} />
    </div>
  );
}

/** 表格中的进度：短进度条 + 百分比。 */
export function InlineProgress({ value }: { value: number }) {
  return (
    <span className="dp-prog">
      <Progress value={value} />
      <span className="dp-faint dp-num">{value}%</span>
    </span>
  );
}

export const Spinner = ({ label = '加载中' }: { label?: string }) => <span className="dp-spinner" role="status" aria-label={label} />;
export const Skeleton = ({ width, height }: { width?: number | string; height?: number }) => <div className="dp-skeleton" style={{ width, height }} aria-hidden />;

/** 空状态 / 加载失败：图标 + 标题 + 说明 + 一个操作。 */
export function EmptyState({ icon, title, description, action, error }: { icon: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; error?: boolean }) {
  return (
    <div className={cx('dp-empty', error && 'is-error')}>
      {icon}
      <h3 className="dp-empty-title">{title}</h3>
      {description && <p className="dp-empty-desc">{description}</p>}
      {action}
    </div>
  );
}

/** 自动保存后的「已保存」提示。 */
export const Saved = () => (
  <span className="dp-saved" role="status">
    <Check className="dp-icon" />
    已保存
  </span>
);
