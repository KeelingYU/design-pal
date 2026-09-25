import * as RT from '@radix-ui/react-tooltip';
import type { ReactElement, ReactNode } from 'react';
import { Kbd } from './Kbd';

/** 在应用根部包一层；悬停 300ms 后出现。 */
export const TooltipProvider = ({ children }: { children: ReactNode }) => <RT.Provider delayDuration={300}>{children}</RT.Provider>;

/** 工具提示：图标按钮必须配工具提示；有快捷键时一并显示。 */
export function Tooltip({ content, shortcut, children }: { content: ReactNode; shortcut?: string | string[]; children: ReactElement }) {
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content className="dp-tooltip" sideOffset={6}>
          {content}
          {shortcut && <Kbd keys={shortcut} />}
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
