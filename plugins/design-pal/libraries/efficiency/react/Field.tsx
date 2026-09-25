import { forwardRef, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, cloneElement } from 'react';
import { cx } from './cx';
import { Kbd } from './Kbd';

/** 表单字段：标签在上，控件高 32px，说明或报错紧跟在控件下方。 */
export function Field({ label, required, help, error, children, className }: { label?: ReactNode; required?: boolean; help?: ReactNode; error?: ReactNode; children: ReactElement<{ id?: string; 'aria-invalid'?: boolean }>; className?: string }) {
  const id = useId();
  return (
    <div className={cx('dp-field', error ? 'is-error' : '', className)}>
      {label && (
        <label className="dp-label" htmlFor={id}>
          {label}
          {required && <span className="dp-req">*</span>}
        </label>
      )}
      {cloneElement(children, { id, 'aria-invalid': !!error || undefined })}
      {(error || help) && <span className="dp-help">{error || help}</span>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx('dp-input', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx('dp-textarea', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[] }>(function Select({ className, options, ...rest }, ref) {
  return (
    <select ref={ref} className={cx('dp-select', className)} {...rest}>
      {options.map((o) => (typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
});

/** 带前置图标与快捷键提示的输入框（搜索、筛选）。 */
export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode; shortcut?: string }>(function SearchInput({ icon, shortcut, className, style, ...rest }, ref) {
  return (
    <div className={cx('dp-input-group', className)} style={style}>
      {icon}
      <input ref={ref} className="dp-input" {...rest} />
      {shortcut && <Kbd keys={shortcut} />}
    </div>
  );
});
