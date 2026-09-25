// 页面配方：登录页。居中窄表单；第三方登录在前，邮箱在后；↵ 提交；错误就地显示。
import { useState } from 'react';
import { Alert, Button, Field, Input } from '../react';

export function LoginPage({ failed, onSuccess }: { failed?: boolean; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); if (failed) setError(true); else onSuccess(); }, 700);
  };
  const showError = failed && error;
  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: '40px 16px' }}>
      <form onSubmit={submit} noValidate style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span className="dp-brand-mark" style={{ width: 32, height: 32, fontSize: 16 }}>T</span>
          <h1 className="dp-h2" style={{ fontSize: 18 }}>登录到 Tasko</h1>
        </div>
        <Button size="lg" block>使用飞书登录</Button>
        <Button size="lg" block>使用企业微信登录</Button>
        <div className="dp-faint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <hr style={{ flex: 1, border: 0, borderTop: '1px solid var(--dp-border)' }} />或使用邮箱<hr style={{ flex: 1, border: 0, borderTop: '1px solid var(--dp-border)' }} />
        </div>
        {showError && <Alert tone="danger" title="邮箱或密码错误">还可以尝试 4 次</Alert>}
        <Field label="邮箱"><Input defaultValue="siyuan.chen@tasko.cn" autoComplete="off" /></Field>
        <Field label="密码" error={showError ? '密码错误' : undefined}><Input type="password" defaultValue="password123" /></Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}><a className="dp-link dp-faint" href="#login">忘记密码？</a></div>
        <Button type="submit" variant="primary" size="lg" block loading={loading} shortcut={loading ? undefined : '↵'}>{loading ? '登录中' : '登录'}</Button>
        <p className="dp-faint" style={{ textAlign: 'center', margin: 0 }}>还没有账号？<a className="dp-link" href="#login">申请试用</a></p>
      </form>
    </div>
  );
}
