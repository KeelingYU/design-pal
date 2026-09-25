// 页面配方：设置页。左侧二级导航 + 右侧「标题 | 控件 | 已保存」行式布局；改完自动保存，不设保存按钮；
// 不可撤销的操作（注销账号）放在危险区，用二次输入确认。
import { useRef, useState, type ReactNode } from 'react';
import { Bell, Keyboard, Shield, User as UserIcon } from 'lucide-react';
import { Avatar, Button, Card, CardBody, ConfirmDialog, Input, Kbd, MOD, RadioGroup, Saved, Select, Switch, useToast } from '../react';

type Tab = 'profile' | 'notify' | 'security' | 'keys';

function useAutoSave() {
  const [saved, setSaved] = useState<Record<string, number>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const mark = (key: string) => {
    setSaved((s) => ({ ...s, [key]: Date.now() }));
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => setSaved((s) => { const n = { ...s }; delete n[key]; return n; }), 1600);
  };
  return [saved, mark] as const;
}

function Row({ title, desc, children, saved }: { title: ReactNode; desc?: ReactNode; children: ReactNode; saved?: boolean }) {
  return (
    <div className="dp-set-row">
      <div><div className="dp-set-title">{title}</div>{desc && <div className="dp-set-desc">{desc}</div>}</div>
      <div>{children}</div>
      <div>{saved && <Saved />}</div>
    </div>
  );
}

export const SHORTCUTS: [string, [string, string][]][] = [
  ['全局', [[`${MOD} K`, '打开命令面板'], ['[', '折叠 / 展开侧边栏'], ['G P', '前往项目'], ['G S', '前往设置']]],
  ['列表', [['J', '下移'], ['K', '上移'], ['↵', '打开详情'], ['X', '选择当前行'], ['N', '新建'], ['/', '筛选'], ['Esc', '关闭详情 / 取消选择']]],
  ['对话框', [[`${MOD} ↵`, '提交'], ['Esc', '关闭']]]
];

export function ShortcutList() {
  return (
    <>
      {SHORTCUTS.map(([group, keys]) => (
        <div key={group} style={{ marginBottom: 16 }}>
          <div className="dp-faint" style={{ marginBottom: 6 }}>{group}</div>
          {keys.map(([k, d]) => (
            <div key={k + d} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--dp-border)' }}>
              <span>{d}</span>
              <span style={{ display: 'inline-flex', gap: 4 }}><Kbd keys={k.split(' ')} /></span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const [saved, mark] = useAutoSave();
  const [name, setName] = useState('陈思远');
  const [nameError, setNameError] = useState('');
  const [notify, setNotify] = useState({ assign: true, mention: true, due: false, weekly: true });
  const [channel, setChannel] = useState<'site' | 'mail' | 'both'>('site');
  const [twoFactor, setTwoFactor] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  const nav: [Tab, ReactNode, string][] = [['profile', <UserIcon className="dp-icon" />, '个人资料'], ['notify', <Bell className="dp-icon" />, '通知'], ['security', <Shield className="dp-icon" />, '安全'], ['keys', <Keyboard className="dp-icon" />, '快捷键']];

  return (
    <>
      <nav className="dp-subnav" aria-label="设置分类">
        {nav.map(([k, icon, label]) => (
          <button key={k} type="button" className={'dp-nav-item' + (k === tab ? ' is-current' : '')} onClick={() => setTab(k)}>{icon}<span className="dp-nav-label">{label}</span></button>
        ))}
      </nav>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 720, padding: '24px 32px 64px' }}>
          {tab === 'profile' && (
            <>
              <h2 className="dp-h2">个人资料</h2>
              <p className="dp-muted" style={{ margin: '2px 0 12px' }}>修改后自动保存，无需点击保存按钮。</p>
              <Row title="头像"><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Avatar name={name || '陈'} size="lg" /><Button size="sm">上传新头像</Button><span className="dp-faint">JPG / PNG，≤ 2 MB</span></div></Row>
              <Row title="姓名" desc="团队成员看到的名字" saved={!!saved.name}>
                <div className={'dp-field' + (nameError ? ' is-error' : '')} style={{ maxWidth: 320 }}>
                  <Input aria-label="姓名" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} onBlur={() => (name.trim() ? mark('name') : setNameError('姓名不能为空，未保存'))} />
                  {nameError && <span className="dp-help">{nameError}</span>}
                </div>
              </Row>
              <Row title="邮箱" desc="如需修改请联系管理员"><Input aria-label="邮箱" value="siyuan.chen@tasko.cn" disabled style={{ maxWidth: 320 }} /></Row>
              <Row title="职位" saved={!!saved.role}><Select aria-label="职位" options={['产品经理', '设计师', '工程师']} onChange={() => mark('role')} style={{ maxWidth: 320 }} /></Row>
              <Row title="时区" desc="影响截止日期与提醒时间" saved={!!saved.tz}><Select aria-label="时区" options={['(UTC+08:00) 北京', '(UTC+09:00) 东京']} onChange={() => mark('tz')} style={{ maxWidth: 320 }} /></Row>
            </>
          )}
          {tab === 'notify' && (
            <>
              <h2 className="dp-h2">通知</h2>
              <p className="dp-muted" style={{ margin: '2px 0 12px' }}>开关即时生效。</p>
              {([['assign', '任务分配给我', '有人把任务指派给你时'], ['mention', '被 @ 提到', '评论或文档中提到你'], ['due', '截止提醒', '截止前 1 天提醒负责人'], ['weekly', '每周周报', '每周一 09:00 发送']] as const).map(([k, t, d]) => (
                <Row key={k} title={t} desc={d} saved={!!saved[k]}><Switch label={t} checked={notify[k]} onChange={(v) => { setNotify((n) => ({ ...n, [k]: v })); mark(k); }} /></Row>
              ))}
              <Row title="通知方式" saved={!!saved.channel}><RadioGroup name="通知方式" value={channel} onChange={(v) => { setChannel(v); mark('channel'); }} options={[{ value: 'site', label: '站内' }, { value: 'mail', label: '邮件' }, { value: 'both', label: '两者' }]} /></Row>
            </>
          )}
          {tab === 'security' && (
            <>
              <h2 className="dp-h2" style={{ marginBottom: 12 }}>安全</h2>
              <Row title="登录密码" desc="上次修改于 3 个月前"><Button size="sm">修改密码</Button></Row>
              <Row title="两步验证" desc="登录时额外验证手机验证码" saved={!!saved.tfa}><Switch label="两步验证" checked={twoFactor} onChange={(v) => { setTwoFactor(v); mark('tfa'); }} /></Row>
              <Row title="登录设备" desc="MacBook Pro · 上海 · 当前设备"><Button size="sm" variant="ghost">管理 2 台设备</Button></Row>
              <Card danger style={{ marginTop: 24 }}>
                <CardBody style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div><h3 className="dp-h3">注销账号</h3><p className="dp-muted" style={{ margin: 0 }}>个人数据将在 30 天后永久删除。这是少数需要二次确认的操作。</p></div>
                  <Button variant="danger" onClick={() => setConfirm(true)}>注销账号…</Button>
                </CardBody>
              </Card>
            </>
          )}
          {tab === 'keys' && (
            <>
              <h2 className="dp-h2">快捷键</h2>
              <p className="dp-muted" style={{ margin: '2px 0 12px' }}>常用操作都有快捷键；按钮和工具提示上也会显示。</p>
              <ShortcutList />
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="注销账号？"
        description="你的个人数据将在 30 天后永久删除，无法恢复。30 天内重新登录可撤销。"
        confirmWord="注销"
        actionLabel="确认注销"
        onConfirm={() => toast({ message: '已提交注销申请，30 天内登录可撤销' })}
      />
    </>
  );
}
