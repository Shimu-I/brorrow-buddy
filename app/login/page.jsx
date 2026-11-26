'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isConfigured } from '@/lib/supabase';
import { useAuth, useUi } from '@/components/Providers';
import { useQueryParams } from '@/lib/hooks';
import { safeNext } from '@/lib/format';
import { SetupNotice } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useUi();
  const q = useQueryParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const next = safeNext(q?.get('next'));

  useEffect(() => { if (user && q) router.replace(next); }, [user, q, next, router]);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) { setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message); return; }
    toast('Welcome back!', 'success');
    router.replace(next);
  }
  if (!isConfigured) return <SetupNotice />;
  return (
    <div className="container auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1 className="page-title">Log in</h1>
        <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="pw">Password</label><input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="small" style={{ marginTop: '1rem', textAlign: 'center' }}><Link href="/forgot-password">Forgot password?</Link> · <Link href="/signup">Create an account</Link></p>
      </form>
    </div>
  );
}
