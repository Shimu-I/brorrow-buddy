'use client';
import Image from 'next/image';
import { useState } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { useUi } from '@/components/Providers';

export default function Contact() {
  const { toast } = useUi();
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    if (!isConfigured) return toast('The site is not connected to its database yet.', 'error');
    setBusy(true);
    const { error } = await supabase.from('contact_messages').insert({ name: f.name.trim(), email: f.email.trim(), message: f.message.trim() });
    setBusy(false);
    if (error) return toast('Could not send your message. Please try again.', 'error');
    toast('Thanks! Your message was sent.', 'success');
    setF({ name: '', email: '', message: '' });
  }
  return (
    <div className="container section">
      <div className="hero-grid" style={{ alignItems: 'center' }}>
        <form className="card" onSubmit={submit}>
          <h1 className="page-title">Contact us</h1>
          <div className="field"><label htmlFor="n">Your name</label><input id="n" required value={f.name} onChange={set('name')} /></div>
          <div className="field"><label htmlFor="e">Your email</label><input id="e" type="email" required value={f.email} onChange={set('email')} /></div>
          <div className="field"><label htmlFor="m">Message</label><textarea id="m" required minLength={5} value={f.message} onChange={set('message')} /></div>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
        </form>
        <div style={{ textAlign: 'center' }}><Image src="/contact-img.png" alt="" width={420} height={383} style={{ height: 'auto', maxWidth: '100%' }} /></div>
      </div>
    </div>
  );
}
