import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';

interface ToastOptions { message: ReactNode; icon?: ReactNode; undo?: () => void; action?: { label: string; run: () => void } }
const Ctx = createContext<(o: ToastOptions) => void>(() => {});

/** 提示消息：底部居中，一次只显示一条。
 *  可撤销的操作（删除、改状态）直接执行并传 undo，显示「撤销」约 5 秒；不要为这类操作弹确认框。 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number; leaving?: boolean }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((o: ToastOptions) => {
    clearTimeout(timer.current);
    const id = Date.now();
    setToast({ ...o, id });
    timer.current = setTimeout(() => {
      setToast((t) => (t && t.id === id ? { ...t, leaving: true } : t));
      timer.current = setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 160);
    }, o.undo ? 5000 : 2600);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {createPortal(
        <div className="dp-toast-host" aria-live="polite">
          {toast && (
            <div key={toast.id} className={cx('dp-toast', toast.leaving && 'is-leaving')} role="status">
              {toast.icon}
              <span>{toast.message}</span>
              {toast.undo && <button type="button" className="dp-toast-action" onClick={() => { toast.undo!(); show({ message: '已撤销' }); }}>撤销</button>}
              {!toast.undo && toast.action && <button type="button" className="dp-toast-action" onClick={() => { setToast(null); toast.action!.run(); }}>{toast.action.label}</button>}
            </div>
          )}
        </div>,
        document.body
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
