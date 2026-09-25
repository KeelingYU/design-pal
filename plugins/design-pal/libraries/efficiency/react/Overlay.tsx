import * as RD from '@radix-ui/react-dialog';
import * as RM from '@radix-ui/react-dropdown-menu';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cx } from './cx';
import { Kbd, MOD } from './Kbd';
import { Button } from './Button';
import { Field, Input } from './Field';

export type MenuEntry = { label: ReactNode; icon?: ReactNode; shortcut?: string; danger?: boolean; checked?: boolean; onSelect: () => void } | 'separator';

/** 下拉菜单：行内「更多」、筛选、就地修改状态都用它。 */
export function Menu({ trigger, items, align = 'start' }: { trigger: ReactElement; items: MenuEntry[]; align?: 'start' | 'end' }) {
  return (
    <RM.Root>
      <RM.Trigger asChild>{trigger}</RM.Trigger>
      <RM.Portal>
        <RM.Content className="dp-menu" align={align} sideOffset={4} onClick={(e) => e.stopPropagation()}>
          {items.map((it, i) =>
            it === 'separator' ? (
              <RM.Separator key={i} className="dp-menu-sep" />
            ) : (
              <RM.Item key={i} className={cx('dp-menu-item', it.danger && 'is-danger')} onSelect={it.onSelect}>
                {it.icon}
                {it.label}
                {it.shortcut && <Kbd keys={it.shortcut} />}
                {it.checked && <Check className="dp-icon dp-menu-check" />}
              </RM.Item>
            )
          )}
        </RM.Content>
      </RM.Portal>
    </RM.Root>
  );
}

/** 对话框：只用于「集中填写的表单」和「不可撤销的操作」。⌘↵ 提交，Esc 关闭。 */
export function Dialog({ open, onOpenChange, title, children, footer, onSubmit, submitHint = true }: { open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; children: ReactNode; footer: ReactNode; onSubmit?: () => void; submitHint?: boolean }) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="dp-overlay" />
        <RD.Content
          className="dp-dialog"
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (onSubmit && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.stopPropagation(); onSubmit(); }
          }}
        >
          <div className="dp-dialog-head">
            <RD.Title className="dp-dialog-title">{title}</RD.Title>
            <RD.Close className="dp-icon-btn" aria-label="关闭"><X className="dp-icon" /></RD.Close>
          </div>
          <div className="dp-dialog-body">{children}</div>
          <div className="dp-dialog-foot">
            {onSubmit && submitHint && <span className="dp-dialog-hint dp-faint"><Kbd keys={[MOD, '↵']} /> 提交</span>}
            {footer}
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

/** 不可撤销操作的二次确认：必须输入指定文字才能执行。 */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmWord, actionLabel, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description: ReactNode; confirmWord: string; actionLabel: string; onConfirm: () => void }) {
  const [typed, setTyped] = useState('');
  const close = (o: boolean) => { if (!o) setTyped(''); onOpenChange(o); };
  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>取消</Button>
          <Button variant="danger" disabled={typed.trim() !== confirmWord} onClick={() => { close(false); onConfirm(); }}>{actionLabel}</Button>
        </>
      }
    >
      <p className="dp-dialog-desc">{description}</p>
      <Field label={`输入「${confirmWord}」以确认`}>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={confirmWord} autoFocus />
      </Field>
    </Dialog>
  );
}
