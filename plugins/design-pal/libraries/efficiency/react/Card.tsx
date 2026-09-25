import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export function Card({ danger, className, ...rest }: HTMLAttributes<HTMLDivElement> & { danger?: boolean }) {
  return <div className={cx('dp-card', danger && 'dp-card-danger', className)} {...rest} />;
}
export const CardHead = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => <div className={cx('dp-card-head', className)} {...rest} />;
export const CardBody = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => <div className={cx('dp-card-body', className)} {...rest} />;
export const CardFoot = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => <div className={cx('dp-card-foot', className)} {...rest} />;

export function Stat({ label, value, delta }: { label: ReactNode; value: ReactNode; delta?: { text: string; up: boolean } }) {
  return (
    <div className="dp-stat">
      <span className="dp-faint">{label}</span>
      <span className="dp-stat-value">{value}</span>
      {delta && <span className={delta.up ? 'dp-delta-up' : 'dp-delta-down'}>{delta.text}</span>}
    </div>
  );
}
