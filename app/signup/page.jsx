'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isConfigured } from '@/lib/supabase';
import { useUi } from '@/components/Providers';
import { SetupNotice } from '@/components/ui';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useUi();
  const [f, setF] = useState({ full_name: '', username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    const username = f.username.trim().toLowerCase();
    if (f.full_name.trim().length < 2) return setError('Please enter your full name.');
    if (!/^[a-z0-9._]{3,30}$/.test(username)) return setError('Username: 3-30 characters, letters, numbers, dot or underscore.');
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) return setError('Password needs 8+ characters with a letter and a number.');
    setBusy(true);
    const { data: taken } = await supabase.from('public_profiles').select('id').eq('username', username).maybeSingle();
    if (taken) { setBusy(false); return setError('That username is already taken.'); }
    const { data, error: err } = await supabase.auth.signUp({
      email: f.email.trim(), password: f.password,
      options: { data: { full_name: f.full_name.trim(), username }, emailRedirectTo: window.location.origin + '/login' }
    });
    setBusy(false);
    if (err) return setError(err.message);
    if (data.session) { toast('Account created – welcome to BorrowBuddy!', 'success'); router.replace('/profile'); }
    else { toast('Check your email to confirm your account, then log in.', 'success'); router.replace('/login'); }
  }
  if (!isConfigured) return <SetupNotice />;
  return (
    <div className="container auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1 className="page-title">Create your account</h1>
        <div className="field"><label htmlFor="fn">Full name</label><input id="fn" autoComplete="name" required value={f.full_name} onChange={set('full_name')} /></div>
        <div className="field"><label htmlFor="un">Username</label><input id="un" autoComplete="username" required value={f.username} onChange={set('username')} /></div>
        <div className="field"><label htmlFor="em">Email</label><input id="em" type="email" autoComplete="email" required value={f.email} onChange={set('email')} /></div>
        <div className="field"><label htmlFor="pw">Password</label><input id="pw" type="password" autoComplete="new-password" required value={f.password} onChange={set('password')} /><p className="hint">At least 8 characters, with a letter and a number.</p></div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
        <p className="small" style={{ marginTop: '1rem', textAlign: 'center' }}>Already have an account? <Link href="/login">Log in</Link></p>
      </form>
    </div>
  );
}
