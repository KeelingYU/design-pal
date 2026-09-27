// 组件库演示页：外框（切换示例页、颜色主题、亮暗）+ 组件总览 + 4 个示例页；#mini 为画廊缩略图
import '../../plugins/design-pal/libraries/efficiency/styles/tokens.css';
import '../generated/themes.css';
import '../../plugins/design-pal/libraries/efficiency/styles/components.css';
import './frame.css';
import { StrictMode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider, TooltipProvider } from '../../plugins/design-pal/libraries/efficiency/react';
import { LoginPage } from '../../plugins/design-pal/libraries/efficiency/patterns/Login';
import { TaskoApp } from '../../plugins/design-pal/libraries/efficiency/patterns/TaskoApp';
import type { ListState } from '../../plugins/design-pal/libraries/efficiency/patterns/ProjectList';
import { ProductListApp } from '../../plugins/design-pal/libraries/efficiency/patterns/ProductList';
import { Overview } from './Overview';
import { checkReadability } from '../../plugins/design-pal/bin/lib/theme.mjs';
import type { DemoData } from './types';
import data from '../generated/demo-data.json';

const { library, themes } = data as unknown as DemoData;
type View = 'overview' | 'login' | 'list' | 'settings' | 'products' | 'mini';
const VIEWS: [View, string][] = [['overview', '组件总览'], ['login', '示例 · 登录'], ['list', '示例 · 数据列表'], ['settings', '示例 · 设置'], ['products', '示例 · 商品列表']];
const params = new URLSearchParams(location.search);
const hashView = (): View => { const v = location.hash.slice(1) as View; return ['overview', 'login', 'list', 'settings', 'products', 'mini'].includes(v) ? v : 'overview'; };

function App() {
  const [view, setView] = useState<View>(hashView);
  const [themeId, setThemeId] = useState(params.get('theme') || themes.find((t) => t.draft)?.id || themes[0].id);
  const theme = themes.find((t) => t.id === themeId) || themes[0];
  const [mode, setMode] = useState<'light' | 'dark'>((params.get('mode') as 'light' | 'dark') || theme.defaultMode);
  const [listState, setListState] = useState<ListState>('normal');
  const [loginFailed, setLoginFailed] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => { const on = () => setView(hashView()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  useLayoutEffect(() => {
    document.documentElement.dataset.dpTheme = theme.id;
    document.documentElement.dataset.dpMode = mode;
    document.title = `${library.name}组件库 · ${theme.name} · design-pal`;
    const h = top.current?.offsetHeight || 0;
    document.documentElement.style.setProperty('--frame-h', h + 'px');
  });
  const go = useCallback((v: View) => { if (location.hash !== '#' + v) location.hash = v; setView(v); window.scrollTo(0, 0); }, []);
  const pickTheme = (id: string) => { setThemeId(id); setMode(themes.find((t) => t.id === id)!.defaultMode); };
  const toggleMode = useCallback(() => setMode((m) => (m === 'light' ? 'dark' : 'light')), []);

  if (view === 'mini') {
    return <div className="dp-app" style={{ height: '100vh' }}><TaskoApp view="list" navigate={() => {}} listState="normal" setListState={() => {}} /></div>;
  }

  const accepted = (theme.acceptedLowContrast || []).filter((k) => k.startsWith(mode + '.'));
  // 草稿：未处理的低对比组合也显示出来，便于用户看到效果后再决定改还是坚持保留
  const pending = theme.draft ? checkReadability(theme).filter((r: any) => r.mode === mode && !r.ok && !accepted.includes(`${r.mode}.${r.fg}/${r.bg}`)) : [];
  return (
    <>
      <div className="f-top" ref={top}>
        <header className="f-bar">
          <a className="f-logo" href="../../gallery.html"><i />design-pal</a>
          <span className="f-sep" />
          <a className="f-crumb" href="../../gallery.html">组件库</a>
          <span className="f-faint">/</span>
          <strong style={{ whiteSpace: 'nowrap' }}>{library.name}组件库</strong>
          <span className="f-pill">v{library.version}</span>
          <span className="f-spacer" />
          <span className="f-faint">颜色主题</span>
          <div className="f-seg" role="group" aria-label="颜色主题">
            {themes.map((t) => (
              <button key={t.id} type="button" aria-pressed={t.id === theme.id} onClick={() => pickTheme(t.id)}>
                <span className="f-swatch" style={{ background: t[mode].primary }} />{t.name}{t.draft && <span className="f-pill draft">草稿</span>}
              </button>
            ))}
          </div>
          <div className="f-seg" role="group" aria-label="亮暗模式">
            <button type="button" aria-pressed={mode === 'light'} onClick={() => setMode('light')}>亮色</button>
            <button type="button" aria-pressed={mode === 'dark'} onClick={() => setMode('dark')}>暗色</button>
          </div>
        </header>
        <div className="f-sub">
          <div className="f-seg" role="group" aria-label="页面">
            {VIEWS.map(([v, label]) => <button key={v} type="button" aria-pressed={v === view} onClick={() => go(v)}>{label}</button>)}
          </div>
          {(view === 'list' || view === 'products') && (
            <div className="f-seg" role="group" aria-label="列表状态">
              {([['normal', '有数据'], ['empty', '空'], ['loading', '加载中'], ['error', '加载失败']] as const).map(([s, l]) => <button key={s} type="button" aria-pressed={listState === s} onClick={() => setListState(s)}>{l}</button>)}
            </div>
          )}
          {view === 'login' && (
            <div className="f-seg" role="group" aria-label="登录结果">
              <button type="button" aria-pressed={!loginFailed} onClick={() => setLoginFailed(false)}>登录成功</button>
              <button type="button" aria-pressed={loginFailed} onClick={() => setLoginFailed(true)}>密码错误</button>
            </div>
          )}
          <span className="f-faint f-ellipsis">适用：{library.fitFor.join('、')}　·　「{theme.name}」{theme.desc}</span>
        </div>
        {theme.draft && <div className="f-banner draft">✎ 正在设计的颜色主题「{theme.name}」（草稿，未发布）。满意后在对话中说「定稿」。</div>}
        {accepted.length + pending.length > 0 && (
          <div className="f-banner warn">⚠ 当前颜色主题有 {accepted.length + pending.length} 处对比度不足（{pending.length ? `${pending.length} 处待处理` : '已确认保留'}），部分用户可能看不清。<a onClick={() => { go('overview'); setTimeout(() => document.getElementById('o-color')?.scrollIntoView(), 50); }}>查看</a></div>
        )}
      </div>
      <div className={'dp-app' + (view === 'overview' ? '' : ' f-stage-app')} key={view === 'list' || view === 'settings' ? 'app' : view}>
        {view === 'products' && <ProductListApp state={listState} setState={setListState} />}
        {view === 'overview' && <Overview library={library} theme={theme} mode={mode} />}
        {view === 'login' && <LoginPage failed={loginFailed} onSuccess={() => go('list')} />}
        {(view === 'list' || view === 'settings') && <TaskoApp view={view} navigate={go} listState={listState} setListState={setListState} onToggleMode={toggleMode} />}
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </TooltipProvider>
  </StrictMode>
);
