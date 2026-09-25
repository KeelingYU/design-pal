// 示例应用：把外壳、列表页、设置页、新建对话框组合在一起（共享项目数据）。
import { useCallback, useState } from 'react';
import { Check } from 'lucide-react';
import { useToast } from '../react';
import { AppFrame, type View } from './AppFrame';
import { NewProjectDialog, ProjectListPage, type ListState } from './ProjectList';
import { SettingsPage } from './Settings';
import { seedProjects, type Project } from './data';

export function TaskoApp({ view, navigate, listState, setListState, onToggleMode }: { view: View; navigate: (v: View) => void; listState: ListState; setListState: (s: ListState) => void; onToggleMode?: () => void }) {
  const toast = useToast();
  const [projects, setProjectsState] = useState<Project[]>(seedProjects);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);
  const setProjects = useCallback((u: (p: Project[]) => Project[]) => setProjectsState(u), []);
  const openProject = useCallback((id: string) => { navigate('list'); setOpenId(id); }, [navigate]);
  const onNew = useCallback(() => { navigate('list'); setNewOpen(true); }, [navigate]);

  return (
    <>
      <AppFrame
        current={view}
        crumbs={[{ label: 'Tasko', view: 'list' }, { label: view === 'list' ? '项目' : '设置' }]}
        navigate={navigate}
        projects={projects}
        onNewProject={onNew}
        onOpenProject={openProject}
        onToggleMode={onToggleMode}
      >
        {view === 'list' ? (
          <ProjectListPage
            projects={projects}
            setProjects={setProjects}
            state={listState}
            onRetry={() => { setListState('loading'); setTimeout(() => setListState('normal'), 900); }}
            openId={openId}
            setOpenId={setOpenId}
            onNew={onNew}
            newId={newId}
          />
        ) : (
          <SettingsPage />
        )}
      </AppFrame>
      <NewProjectDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreate={(p) => {
          const id = `P-${130 + projects.length}`;
          setProjectsState((ps) => [{ ...p, id, progress: 0, due: '2026-12-31' }, ...ps]);
          setListState('normal');
          setNewId(id);
          setTimeout(() => setNewId(null), 1300);
          toast({ message: `已创建「${p.name}」`, icon: <Check className="dp-icon" />, action: { label: '打开', run: () => setOpenId(id) } });
        }}
      />
    </>
  );
}
