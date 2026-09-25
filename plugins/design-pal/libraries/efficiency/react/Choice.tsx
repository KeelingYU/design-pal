import type { ReactNode } from 'react';
import { cx } from './cx';

/** 复选框。checked 为 'mixed' 时表示部分选中（表头全选）。 */
export function Checkbox({ checked, onChange, label, disabled, className }: { checked: boolean | 'mixed'; onChange?: (next: boolean) => void; label?: ReactNode; disabled?: boolean; className?: string }) {
  const box = (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked === 'mixed' ? 'mixed' : checked}
      aria-label={typeof label === 'string' ? label : undefined}
      disabled={disabled}
      className={cx('dp-check', checked === true && 'is-checked', checked === 'mixed' && 'is-mixed', !label && className)}
      onClick={(e) => { e.stopPropagation(); onChange?.(checked !== true); }}
    />
  );
  if (!label) return box;
  return (
    <label className={cx('dp-choice', disabled && 'is-disabled', className)} onClick={(e) => { if (e.target === e.currentTarget && !disabled) onChange?.(checked !== true); }}>
      {box}
      {label}
    </label>
  );
}

export function RadioGroup<T extends string>({ options, value, onChange, name }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <label key={o.value} className="dp-choice">
          <button type="button" role="radio" aria-checked={o.value === value} className={cx('dp-radio', o.value === value && 'is-checked')} onClick={() => onChange(o.value)} />
          <span onClick={() => onChange(o.value)}>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/** 开关：即时生效，不需要保存按钮。 */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label?: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={cx('dp-switch', checked && 'is-on')} onClick={() => onChange(!checked)} />;
}
