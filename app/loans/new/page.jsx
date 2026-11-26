'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import { useAuth, useUi } from '@/components/Providers';
import { supabase } from '@/lib/supabase';
import { LOAN_CATEGORIES, fileOk, randomName } from '@/lib/format';

function Form() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useUi();
  const [f, setF] = useState({ category: LOAN_CATEGORIES[0], custom_category: '', amount: '', duration_months: 3, repayment_option: 'installments', reason: '', confirm: false });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function pick(e) {
    const list = Array.from(e.target.files || []);
    if (list.length > 6) { setError('You can attach at most 6 documents.'); return; }
    for (const file of list) { const m = fileOk(file); if (m) { setError(m); return; } }
    setError(''); setFiles(list);
  }

  async function submit(e) {
    e.preventDefault(); setError('');
    const amount = Number(f.amount), months = Number(f.duration_months);
    if (!(amount >= 100 && amount <= 500000)) return setError('Amount must be between ৳100 and ৳500,000.');
    if (!(months >= 1 && months <= 60)) return setError('Duration must be 1 to 60 months.');
    if (f.reason.trim().length < 10) return setError('Please explain why you need this loan (at least 10 characters).');
    if (files.length < 1) return setError('Attach at least one supporting document (photo or PDF).');
    if (!f.confirm) return setError('Please confirm the information is true.');
    setBusy(true);
    const { data: loan, error: e1 } = await supabase.from('loans').insert({
      borrower_id: user.id, category: f.category, custom_category: f.category === 'Other' ? f.custom_category.trim() || null : null,
      amount, duration_months: months, repayment_option: f.repayment_option, reason: f.reason.trim()
    }).select('id').single();
    if (e1) { setBusy(false); return setError(e1.message); }
    try {
      for (const file of files) {
        const path = `${user.id}/${randomName(file)}`;
        const up = await supabase.storage.from('proofs').upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        const ins = await supabase.from('loan_documents').insert({ loan_id: loan.id, path, file_name: file.name.slice(0, 120), doc_type: 'proof' });
        if (ins.error) throw ins.error;
      }
    } catch (err) {
      await supabase.from('loans').delete().eq('id', loan.id);
      setBusy(false);
      return setError('Upload failed: ' + (err.message || 'please try again'));
    }
    toast('Request submitted! An admin will review it shortly.', 'success');
    router.replace('/profile');
  }

  return (
    <div className="container section narrow">
      <h1 className="page-title">Request a loan</h1>
      <p className="muted">Admins review every request before it goes public.</p>
      <form className="card" onSubmit={submit}>
        <div className="field"><label htmlFor="cat">Category</label><select id="cat" value={f.category} onChange={set('category')}>{LOAN_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        {f.category === 'Other' && <div className="field"><label htmlFor="cc">Describe the category</label><input id="cc" maxLength={60} value={f.custom_category} onChange={set('custom_category')} /></div>}
        <div className="row">
          <div className="field"><label htmlFor="amt">Amount needed (৳)</label><input id="amt" type="number" min="100" max="500000" step="1" required value={f.amount} onChange={set('amount')} /></div>
          <div className="field"><label htmlFor="dur">Duration (months)</label><input id="dur" type="number" min="1" max="60" required value={f.duration_months} onChange={set('duration_months')} /></div>
        </div>
        <div className="field"><label htmlFor="rep">Repayment</label><select id="rep" value={f.repayment_option} onChange={set('repayment_option')}><option value="installments">Monthly installments</option><option value="one_time">One payment at the end</option></select></div>
        <div className="field"><label htmlFor="why">Why do you need this loan?</label><textarea id="why" required minLength={10} maxLength={2000} value={f.reason} onChange={set('reason')} /></div>
        <div className="field"><label htmlFor="docs">Proof documents (required)</label><input id="docs" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pick} /><p className="hint">E.g. hospital invoice, fee notice, registration paper. JPG / PNG / PDF, max 5 MB each, up to 6 files.</p></div>
        <label style={{ display: 'flex', gap: '.6rem', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={f.confirm} onChange={set('confirm')} /> I confirm all the information I provided is true.</label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" style={{ marginTop: '1rem' }} disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button>
      </form>
    </div>
  );
}
export default function Page() { return <Guard><Form /></Guard>; }
