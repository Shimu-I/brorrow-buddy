'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Guard from '@/components/Guard';
import { useAuth, useUi } from '@/components/Providers';
import { supabase } from '@/lib/supabase';
import { money, date, loanTitle, fileOk, randomName } from '@/lib/format';
import { Avatar, Badge, Empty, Loading } from '@/components/ui';

const TABS = [['overview', 'Overview'], ['loans', 'My loans'], ['offers', 'My offers'], ['repay', 'Repayments'], ['funds', 'My fundraisers']];

function Profile() {
  const { user, profile, refresh } = useAuth();
  const { toast } = useUi();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ full_name: '', student_id: '', university: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (profile) setForm({ full_name: profile.full_name || '', student_id: profile.student_id || '', university: profile.university || '' }); }, [profile]);

  const load = useCallback(async () => {
    const [loans, offers, funds, rep, rating] = await Promise.all([
      supabase.from('loan_cards').select('*').eq('borrower_id', user.id).order('created_at', { ascending: false }),
      supabase.from('loan_offers').select('*, loans(id,category,custom_category,status,amount)').eq('lender_id', user.id).order('created_at', { ascending: false }),
      supabase.from('fundraiser_cards').select('*').eq('creator_id', user.id).order('created_at', { ascending: false }),
      supabase.from('repayments').select('*, loans(category,custom_category,borrower_id)').order('due_date', { ascending: true }),
      supabase.from('public_ratings').select('score').eq('borrower_id', user.id)
    ]);
    const scores = (rating.data || []).map((r) => r.score);
    setData({
      loans: loans.data || [], offers: offers.data || [], funds: funds.data || [], repayments: rep.data || [],
      avg: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null, ratingCount: scores.length
    });
  }, [user.id]);
  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from('profiles').update({ full_name: form.full_name.trim(), student_id: form.student_id.trim() || null, university: form.university.trim() || null }).eq('id', user.id);
    setBusy(false);
    if (error) return toast(error.message, 'error');
    toast('Profile saved.', 'success'); refresh();
  }
  async function uploadId(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const m = fileOk(file, { types: ['image/jpeg', 'image/png', 'image/webp'] }); if (m) return toast(m, 'error');
    setBusy(true);
    const path = `${user.id}/id-${randomName(file)}`;
    const up = await supabase.storage.from('proofs').upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); return toast(up.error.message, 'error'); }
    const { error } = await supabase.rpc('request_verification', { p_path: path });
    setBusy(false);
    if (error) return toast(error.message, 'error');
    toast('Submitted! An admin will review your ID.', 'success'); refresh();
    e.target.value = '';
  }

  if (!profile || !data) return <div className="container section"><Loading /></div>;
  const myRepay = data.repayments.filter((r) => r.loans?.borrower_id === user.id);
  const incoming = data.repayments.filter((r) => r.loans?.borrower_id !== user.id);
  const firstUnpaidByOffer = {};
  for (const r of myRepay) if (r.status === 'pending' && !firstUnpaidByOffer[r.offer_id]) firstUnpaidByOffer[r.offer_id] = r.id;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container section">
      <div className="page-head"><div className="person"><Avatar name={profile.full_name} size={56} /><div><h1 className="page-title" style={{ margin: 0 }}>{profile.full_name}</h1><span className="muted small">@{profile.username || '—'} · {profile.email}</span></div></div><Badge status={profile.verification_status} /></div>
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'overview' && (
        <>
          <div className="stat-grid">
            <div className="stat"><b>{data.loans.length}</b><span>Loan requests</span></div>
            <div className="stat"><b>{data.offers.length}</b><span>Offers made</span></div>
            <div className="stat"><b>{data.funds.length}</b><span>Fundraisers</span></div>
            <div className="stat"><b>{data.avg ? `★ ${data.avg}` : '—'}</b><span>{data.ratingCount} rating{data.ratingCount === 1 ? '' : 's'}</span></div>
          </div>
          <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <form className="card" onSubmit={save}>
              <h3>Edit profile</h3>
              <div className="field"><label htmlFor="fn">Full name</label><input id="fn" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="field"><label htmlFor="sid">Student ID</label><input id="sid" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} /></div>
              <div className="field"><label htmlFor="uni">University</label><input id="uni" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></div>
              <button className="btn btn-primary" disabled={busy}>Save</button>
            </form>
            <div className="card">
              <h3>Student ID verification</h3>
              {profile.verification_status === 'verified' && <p className="verified">✓ You are verified.</p>}
              {profile.verification_status === 'pending' && <p>Your ID is waiting for admin review.</p>}
              {['unverified', 'rejected'].includes(profile.verification_status) && (
                <>
                  {profile.verification_status === 'rejected' && <p className="err">Your last upload was rejected. Please try a clearer photo.</p>}
                  <p className="muted">Upload a photo of your student ID card. Only admins can view it.</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadId} disabled={busy} aria-label="Student ID photo" />
                </>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'loans' && (data.loans.length === 0 ? <Empty title="No loan requests yet"><Link className="btn btn-primary" href="/loans/new">Request a loan</Link></Empty> :
        <div className="list">{data.loans.map((l) => <div key={l.id} className="item"><div><Link href={`/loans/${l.id}`}><strong>{loanTitle(l)}</strong></Link> · {money(l.amount)}<br /><span className="small muted">{l.offer_count} offer(s) · {money(l.amount_funded)} funded · {date(l.created_at)}</span></div><Badge status={l.status} /></div>)}</div>)}

      {tab === 'offers' && (data.offers.length === 0 ? <Empty title="You haven't made any offers" text="Browse loan requests to help a fellow student."><Link className="btn btn-primary" href="/loans">Browse loans</Link></Empty> :
        <div className="list">{data.offers.map((o) => (
          <div key={o.id} className="item"><div><Link href={`/loans/${o.loan_id}`}><strong>{o.loans ? loanTitle(o.loans) : 'Loan'}</strong></Link><br /><span className="small muted">{money(o.amount)} at {o.interest_rate}% · {date(o.created_at)}</span></div>
            <div className="item-actions"><Badge status={o.status} />{o.status === 'accepted' && !o.paid && o.loans?.status === 'approved' && <Link className="btn btn-primary btn-sm" href={`/pay?type=loan&id=${o.id}`}>Pay now</Link>}{o.paid && <span className="verified">Paid ✓</span>}</div></div>
        ))}</div>)}

      {tab === 'repay' && (
        <>
          <h3>Installments I owe</h3>
          {myRepay.length === 0 ? <p className="muted">Nothing to repay.</p> : <div className="list">{myRepay.map((r) => {
            const overdue = r.status === 'pending' && r.due_date < today;
            return <div key={r.id} className="item"><div><strong>{r.loans ? loanTitle(r.loans) : 'Loan'}</strong> · installment {r.installment_no}/{r.total_installments}<br /><span className="small muted">{money(r.amount)} · due {date(r.due_date)}{overdue && <b className="err"> · overdue</b>}</span></div>
              <div className="item-actions">{r.status === 'paid' ? <span className="verified">Paid ✓</span> : firstUnpaidByOffer[r.offer_id] === r.id ? <Link className="btn btn-primary btn-sm" href={`/pay?type=repayment&id=${r.id}`}>Pay now</Link> : <span className="small muted">Pay earlier ones first</span>}</div></div>;
          })}</div>}
          <h3 style={{ marginTop: '2rem' }}>Repayments I will receive</h3>
          {incoming.length === 0 ? <p className="muted">No incoming repayments yet.</p> : <div className="table-wrap"><table className="tbl"><thead><tr><th>Loan</th><th>#</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>{incoming.map((r) => <tr key={r.id}><td>{r.loans ? loanTitle(r.loans) : ''}</td><td>{r.installment_no}/{r.total_installments}</td><td>{money(r.amount)}</td><td>{date(r.due_date)}</td><td>{r.status}</td></tr>)}</tbody></table></div>}
        </>
      )}

      {tab === 'funds' && (data.funds.length === 0 ? <Empty title="No fundraisers yet"><Link className="btn btn-primary" href="/fundraisers/new">Start a fundraiser</Link></Empty> :
        <div className="list">{data.funds.map((f) => <div key={f.id} className="item"><div><Link href={`/fundraisers/${f.id}`}><strong>{f.title}</strong></Link><br /><span className="small muted">{money(f.amount_raised)} of {money(f.amount_needed)}</span></div><Badge status={f.status} /></div>)}</div>)}
    </div>
  );
}
export default function Page() { return <Guard><Profile /></Guard>; }
