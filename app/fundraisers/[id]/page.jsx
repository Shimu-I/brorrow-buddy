'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { useAuth, useUi } from '@/components/Providers';
import { money, date, coverUrl, pct } from '@/lib/format';
import { Avatar, Badge, Empty, Loading, Progress, SetupNotice, Verified } from '@/components/ui';

export default function FundraiserDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { toast } = useUi();
  const [f, setF] = useState(undefined);
  const [supporters, setSupporters] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [docs, setDocs] = useState([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('fundraiser_cards').select('*').eq('id', id).maybeSingle();
    setF(data || null);
    if (!data) return;
    const [s, u] = await Promise.all([
      supabase.from('fundraiser_supporters').select('*').eq('fundraiser_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('fundraiser_updates').select('*').eq('fundraiser_id', id).order('created_at', { ascending: false })
    ]);
    setSupporters(s.data || []); setUpdates(u.data || []);
    if (user && (data.creator_id === user.id || profile?.role === 'admin')) {
      const { data: d } = await supabase.from('fundraiser_documents').select('*').eq('fundraiser_id', id);
      const out = [];
      for (const doc of d || []) { const { data: sg } = await supabase.storage.from('proofs').createSignedUrl(doc.path, 600); if (sg?.signedUrl) out.push({ name: doc.file_name || 'Document', url: sg.signedUrl }); }
      setDocs(out);
    }
  }, [id, user, profile?.role]);
  useEffect(() => { if (isConfigured) load(); }, [load]);

  async function postUpdate(e) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from('fundraiser_updates').insert({ fundraiser_id: id, body: body.trim() });
    setBusy(false);
    if (error) return toast(error.message, 'error');
    setBody(''); toast('Update posted.', 'success'); load();
  }

  if (!isConfigured) return <SetupNotice />;
  if (f === undefined) return <div className="container section"><Loading /></div>;
  if (f === null) return <div className="container section"><Empty title="Fundraiser not found"><Link href="/fundraisers" className="btn btn-outline">Back</Link></Empty></div>;
  const mine = user?.id === f.creator_id;
  return (
    <div className="container section">
      <p><Link href="/fundraisers">← All fundraisers</Link></p>
      <div className="detail-grid">
        <div className="card">
          {f.cover_path ? <img className="cover" src={coverUrl(f.cover_path)} alt="" /> : <div className="cover cover-fallback">{f.category}</div>}
          <div className="page-head" style={{ marginBottom: '.5rem' }}><h1 className="page-title" style={{ margin: 0 }}>{f.title}</h1><Badge status={f.status} /></div>
          <div className="person" style={{ marginBottom: '1rem' }}><Avatar name={f.creator_name} /><div><Link href={`/u/${f.creator_id}`}><strong>{f.creator_name}</strong></Link><br /><Verified status={f.creator_verification} /></div></div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{f.summary}</p>
          {docs.length > 0 && (<><h3>Documents</h3><ul>{docs.map((d) => <li key={d.url}><a href={d.url} target="_blank" rel="noopener noreferrer">{d.name}</a></li>)}</ul></>)}
          <h3>Updates</h3>
          {updates.length === 0 && <p className="muted">No updates yet.</p>}
          <div className="list">{updates.map((u) => <div key={u.id} className="item"><div><small className="muted">{date(u.created_at)}</small><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{u.body}</p></div></div>)}</div>
          {mine && ['approved', 'funded'].includes(f.status) && (
            <form onSubmit={postUpdate} style={{ marginTop: '1rem' }}>
              <label htmlFor="up">Post an update for supporters</label><textarea id="up" required minLength={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
              <button className="btn btn-outline" style={{ marginTop: '.6rem' }} disabled={busy}>Post update</button>
            </form>
          )}
        </div>
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div className="card">
            <div className="amount">{money(f.amount_raised)}</div>
            <p className="muted">raised of {money(f.amount_needed)} · {f.supporter_count} supporter{f.supporter_count === 1 ? '' : 's'}</p>
            <Progress value={pct(f.amount_raised, f.amount_needed)} />
            {f.status === 'approved' && (user
              ? (mine ? <p className="muted small">This is your fundraiser.</p> : <Link className="btn btn-primary btn-block" href={`/pay?type=funding&id=${f.id}`}>Contribute</Link>)
              : <Link className="btn btn-primary btn-block" href={`/login?next=/fundraisers/${f.id}`}>Log in to contribute</Link>)}
            {f.status === 'funded' && <p className="verified">🎉 Goal reached – thank you!</p>}
            {f.status === 'pending' && <p className="muted small">Waiting for admin approval.</p>}
          </div>
          <div className="card">
            <h3>Recent supporters</h3>
            {supporters.length === 0 && <p className="muted">Be the first to contribute.</p>}
            {supporters.map((s) => <div key={s.id} className="person" style={{ marginBottom: '.5rem' }}><Avatar name={s.name} size={32} /><span>{s.name} <b>{money(s.amount)}</b></span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
