'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import { useAuth, useUi } from '@/components/Providers';
import { supabase } from '@/lib/supabase';
import { FUND_CATEGORIES, fileOk, randomName } from '@/lib/format';

function Form() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useUi();
  const [f, setF] = useState({ title: '', category: FUND_CATEGORIES[0], amount_needed: '', summary: '' });
  const [cover, setCover] = useState(null);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function pickCover(e) {
    const file = e.target.files?.[0]; if (!file) return setCover(null);
    const m = fileOk(file, { types: ['image/jpeg', 'image/png', 'image/webp'] }); if (m) { setError(m); return; }
    setError(''); setCover(file);
  }
  function pickDocs(e) {
    const list = Array.from(e.target.files || []);
    if (list.length > 8) return setError('At most 8 documents.');
    for (const file of list) { const m = fileOk(file, { maxMB: 10 }); if (m) return setError(m); }
    setError(''); setFiles(list);
  }
  async function submit(e) {
    e.preventDefault(); setError('');
    const amount = Number(f.amount_needed);
    if (f.title.trim().length < 5) return setError('Give your fundraiser a clear title (5+ characters).');
    if (!(amount >= 100)) return setError('Target must be at least ৳100.');
    if (f.summary.trim().length < 20) return setError('Please describe the situation (20+ characters).');
    if (files.length < 1) return setError('Attach at least one supporting document.');
    setBusy(true);
    let cover_path = null;
    if (cover) {
      cover_path = `${user.id}/${randomName(cover)}`;
      const up = await supabase.storage.from('covers').upload(cover_path, cover, { contentType: cover.type });
      if (up.error) { setBusy(false); return setError('Cover upload failed: ' + up.error.message); }
    }
    const { data: fund, error: e1 } = await supabase.from('fundraisers').insert({
      creator_id: user.id, title: f.title.trim(), category: f.category, summary: f.summary.trim(), amount_needed: amount, cover_path
    }).select('id').single();
    if (e1) { setBusy(false); return setError(e1.message); }
    try {
      for (const file of files) {
        const path = `${user.id}/${randomName(file)}`;
        const up = await supabase.storage.from('proofs').upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        const ins = await supabase.from('fundraiser_documents').insert({ fundraiser_id: fund.id, path, file_name: file.name.slice(0, 120) });
        if (ins.error) throw ins.error;
      }
    } catch (err) {
      await supabase.from('fundraisers').delete().eq('id', fund.id);
      setBusy(false); return setError('Upload failed: ' + (err.message || 'try again'));
    }
    toast('Fundraiser submitted for admin review.', 'success');
    router.replace('/profile');
  }
  return (
    <div className="container section narrow">
      <h1 className="page-title">Start a fundraiser</h1>
      <form className="card" onSubmit={submit}>
        <div className="field"><label htmlFor="t">Title</label><input id="t" required maxLength={120} value={f.title} onChange={set('title')} /></div>
        <div className="row">
          <div className="field"><label htmlFor="c">Category</label><select id="c" value={f.category} onChange={set('category')}>{FUND_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="a">Target (৳)</label><input id="a" type="number" min="100" required value={f.amount_needed} onChange={set('amount_needed')} /></div>
        </div>
        <div className="field"><label htmlFor="s">The situation</label><textarea id="s" required minLength={20} maxLength={3000} value={f.summary} onChange={set('summary')} /></div>
        <div className="field"><label htmlFor="cv">Cover photo (optional)</label><input id="cv" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickCover} /></div>
        <div className="field"><label htmlFor="d">Supporting documents (required)</label><input id="d" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pickDocs} /><p className="hint">Only admins can see these. JPG / PNG / PDF, up to 10 MB each.</p></div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
      </form>
    </div>
  );
}
export default function Page() { return <Guard><Form /></Guard>; }
