import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import { Kbd } from './Kbd';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  /** 快捷键提示，例如 "N" 或 ["⌘", "K"] */
  shortcut?: string | string[];
  iconOnly?: boolean;
}

/** 按钮。主要操作用 primary，每个区域最多一个；危险且不可撤销的操作用 danger。 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', block, loading, icon, shortcut, iconOnly, className, children, type = 'button', disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cx('dp-btn', `dp-btn-${variant}`, size !== 'md' && `dp-btn-${size}`, block && 'dp-btn-block', iconOnly && 'dp-btn-icon', loading && 'is-loading', className)}
      {...rest}
    >
      {!loading && icon}
      {children}
      {shortcut && <Kbd keys={shortcut} />}
    </button>
  );
});

/** 仅图标的轻量按钮（顶栏、详情面板、行内操作）。必须提供 label 作为无障碍名称。 */
export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(function IconButton(
  { label, className, children, type = 'button', ...rest },
  ref
) {
  return (
    <button ref={ref} type={type} aria-label={label} className={cx('dp-icon-btn', className)} {...rest}>
      {children}
    </button>
  );
});

export function ButtonGroup<T extends string>({ options, value, onChange }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="dp-btn-group" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} className={cx('dp-btn dp-btn-secondary', o.value === value && 'is-current')} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
