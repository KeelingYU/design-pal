// 页面配方：应用外壳。侧边栏 + 顶栏 + 命令面板 + 全局快捷键（⌘K、[、G P、G S）。
import { useMemo, useState, type ReactNode } from 'react';
import { Bell, CircleDot, Folder, FolderOpen, Home, Moon, PanelLeft, Plus, Settings, Users, BarChart3 } from 'lucide-react';
import { AppShell, Badge, Breadcrumb, CommandPalette, Sidebar, Topbar, Avatar, Tooltip, useHotkeys, type Command } from '../react';
import type { Project } from './data';

export type View = 'list' | 'settings';

export function AppFrame({ current, crumbs, navigate, projects, onNewProject, onOpenProject, onToggleMode, children }: {
  current: View;
  crumbs: { label: string; view?: View }[];
  navigate: (v: View) => void;
  projects: Project[];
  onNewProject: () => void;
  onOpenProject: (id: string) => void;
  onToggleMode?: () => void;
  children: ReactNode;
}) {
  const [rail, setRail] = useState(false);
  const [cmdk, setCmdk] = useState(false);
  useHotkeys({ 'mod+k': () => setCmdk(true), '[': () => setRail((r) => !r), 'g p': () => navigate('list'), 'g s': () => navigate('settings') });

  const commands = useMemo<Command[]>(() => [
    { id: 'go-list', group: '跳转', label: '项目', icon: <Folder className="dp-icon" />, shortcut: 'G P', run: () => navigate('list') },
    { id: 'go-settings', group: '跳转', label: '设置', icon: <Settings className="dp-icon" />, shortcut: 'G S', run: () => navigate('settings') },
    { id: 'new', group: '操作', label: '新建项目', icon: <Plus className="dp-icon" />, shortcut: 'N', run: onNewProject },
    ...(onToggleMode ? [{ id: 'mode', group: '操作', label: '切换亮色 / 暗色', icon: <Moon className="dp-icon" />, run: onToggleMode }] : []),
    { id: 'rail', group: '操作', label: '折叠 / 展开侧边栏', icon: <PanelLeft className="dp-icon" />, shortcut: '[', run: () => setRail((r) => !r) },
    ...projects.map((p) => ({ id: p.id, group: '项目', label: p.name, keywords: p.id, icon: <span className="dp-mono dp-faint" style={{ width: 44 }}>{p.id}</span>, run: () => onOpenProject(p.id) }))
  ], [projects, navigate, onNewProject, onOpenProject, onToggleMode]);

  const nav = (key: string, icon: ReactNode, label: string, view?: View, badge?: ReactNode) => ({ key, icon, label, badge, onClick: view ? () => navigate(view) : undefined });
  return (
    <>
      <AppShell
        style={{ height: '100%' }}
        sidebar={
          <Sidebar
            brand={{ mark: 'T', name: 'Tasko' }}
            rail={rail}
            onToggleRail={() => setRail((r) => !r)}
            current={current}
            items={[
              nav('home', <Home className="dp-icon" />, '工作台', 'list'),
              nav('list', <Folder className="dp-icon" />, '项目', 'list'),
              nav('tasks', <CircleDot className="dp-icon" />, '我的任务', undefined, <Badge>5</Badge>),
              nav('members', <Users className="dp-icon" />, '成员'),
              nav('reports', <BarChart3 className="dp-icon" />, '报表'),
              nav('settings', <Settings className="dp-icon" />, '设置', 'settings')
            ]}
            groups={[{ title: '收藏', items: projects.slice(0, 2).map((p) => ({ key: 'fav-' + p.id, icon: <FolderOpen className="dp-icon" />, label: p.name, onClick: () => onOpenProject(p.id) })) }]}
          />
        }
        topbar={
          <Topbar
            left={<Breadcrumb items={crumbs.map((c) => ({ label: c.label, onClick: c.view ? () => navigate(c.view!) : undefined, href: c.view ? '#' + c.view : undefined }))} />}
            onCommand={() => setCmdk(true)}
            right={
              <>
                <Tooltip content="通知">
                  <span className="dp-with-badge"><button type="button" className="dp-icon-btn" aria-label="通知"><Bell className="dp-icon" /></button><Badge dot /></span>
                </Tooltip>
                <Avatar name="陈思远" />
              </>
            }
          />
        }
      >
        {children}
      </AppShell>
      <CommandPalette open={cmdk} onOpenChange={setCmdk} commands={commands} placeholder="输入命令或搜索项目…" />
    </>
  );
}
