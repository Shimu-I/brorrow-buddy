'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isConfigured } from '@/lib/supabase';
import { useUi } from '@/components/Providers';
import { SetupNotice } from '@/components/ui';

export default function ResetPassword() {
  const router = useRouter();
  const { toast } = useUi();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setError('');
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setError('Password needs 8+ characters with a letter and a number.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(err.message);
    toast('Password updated.', 'success'); router.replace('/profile');
  }
  if (!isConfigured) return <SetupNotice />;
  return (
    <div className="container auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1 className="page-title">Choose a new password</h1>
        <div className="field"><label htmlFor="pw">New password</label><input id="pw" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </div>
  );
}
