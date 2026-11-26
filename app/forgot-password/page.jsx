'use client';
import Link from 'next/link';
import { useState } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { SetupNotice } from '@/components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/reset-password' });
    setBusy(false);
    if (err) setError(err.message); else setSent(true);
  }
  if (!isConfigured) return <SetupNotice />;
  return (
    <div className="container auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1 className="page-title">Reset password</h1>
        {sent ? <p>If an account exists for <strong>{email}</strong>, a reset link is on its way. <Link href="/login">Back to log in</Link></p> : (
          <>
            <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            {error && <p className="err" role="alert">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </>
        )}
      </form>
    </div>
  );
}
