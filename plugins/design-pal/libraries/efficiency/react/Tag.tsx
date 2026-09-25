import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

/** 状态标签：用小圆点区分状态，不用大面积色块。传 onClick 时变为可点击（例如就地修改状态）。 */
export function Tag({ tone = 'neutral', dot = true, outline, children, onClick, className, ...rest }: { tone?: Tone; dot?: boolean; outline?: boolean; children: ReactNode; onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']; className?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const cls = cx('dp-tag', tone !== 'neutral' && `dp-tag-${tone}`, outline && 'dp-tag-outline', className);
  const inner = (
    <>
      {dot && !outline && <span className="dp-tag-dot" />}
      {children}
    </>
  );
  return onClick ? <button type="button" className={cls} onClick={onClick} {...rest}>{inner}</button> : <span className={cls}>{inner}</span>;
}

export function Badge({ children, strong, dot }: { children?: ReactNode; strong?: boolean; dot?: boolean }) {
  return <span className={cx('dp-badge', strong && 'dp-badge-strong', dot && 'dp-badge-dot')}>{dot ? null : children}</span>;
}

const TONES = ['', 'dp-avatar-2', 'dp-avatar-3', 'dp-avatar-4'];
const toneOf = (name: string) => TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];

/** 头像：无图片时显示名字首字，颜色由名字稳定决定。 */
export function Avatar({ name, src, size = 'md' }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={cx('dp-avatar', size !== 'md' && `dp-avatar-${size}`, toneOf(name))} aria-hidden={!src}>
      {src ? <img src={src} alt={name} /> : [...name][0]}
    </span>
  );
}

/** 头像 + 名字（表格、详情中的人员）。 */
export function User({ name }: { name: string }) {
  return (
    <span className="dp-user">
      <Avatar name={name} size="sm" />
      {name}
    </span>
  );
}
