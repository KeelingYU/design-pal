import { useEffect, useRef } from 'react';

type Handler = (e: KeyboardEvent) => void;

const isTyping = (el: Element | null) => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || (el as HTMLElement).isContentEditable);
const overlayOpen = () => !!document.querySelector('[role="dialog"], [role="menu"]');

/** 全局快捷键。键名：单键 "j"、"[" "/" "Escape"；组合 "mod+k"（⌘ 或 Ctrl）；序列 "g p"（先按 g 再按 p）。
 *  在输入框中、或有对话框/菜单打开时，只响应 mod 组合键；Escape 交给对话框自己处理。 */
export function useHotkeys(map: Record<string, Handler>, enabled = true) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    if (!enabled) return;
    let pending = '';
    let timer: ReturnType<typeof setTimeout>;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (mod) {
        const h = ref.current['mod+' + key];
        if (h) { e.preventDefault(); h(e); }
        return;
      }
      if (e.altKey || isTyping(document.activeElement) || overlayOpen()) return;
      const seq = pending ? `${pending} ${key}` : key;
      if (ref.current[seq]) { pending = ''; ref.current[seq](e); return; }
      if (Object.keys(ref.current).some((k) => k.startsWith(key + ' '))) {
        pending = key;
        clearTimeout(timer);
        timer = setTimeout(() => (pending = ''), 800);
        return;
      }
      pending = '';
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}
