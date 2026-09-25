import { Fragment } from 'react';

/** 快捷键提示。keys 可为单键 "N" 或组合 ["⌘", "K"]。 */
export function Kbd({ keys }: { keys: string | string[] }) {
  const list = Array.isArray(keys) ? keys : [keys];
  return (
    <>
      {list.map((k, i) => (
        <Fragment key={i}>
          <kbd className="dp-kbd">{k}</kbd>
        </Fragment>
      ))}
    </>
  );
}

/** 当前系统的修饰键：Mac 为 ⌘，其他为 Ctrl */
export const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
