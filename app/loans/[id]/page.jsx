'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { useAuth, useUi } from '@/components/Providers';
import { money, date, loanTitle, pct } from '@/lib/format';
import { Avatar, Badge, Empty, ErrorBox, Loading, Progress, SetupNotice, Verified } from '@/components/ui';

export default function LoanDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { toast, confirm } = useUi();
  const [loan, setLoan] = useState(undefined);
  const [offers, setOffers] = useState([]);
  const [names, setNames] = useState({});
  const [reviews, setReviews] = useState([]);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState({ amount: '', interest_rate: '5', terms: '' });
  const [rating, setRating] = useState({ score: 5, review: '', recommend: true });

  const load = useCallback(async () => {
    const { data } = await supabase.from('loan_cards').select('*').eq('id', id).maybeSingle();
    setLoan(data || null);
    if (!data) return;
    const { data: rv } = await supabase.from('public_ratings').select('*').eq('borrower_id', data.borrower_id).order('created_at', { ascending: false }).limit(5);
    setReviews(rv || []);
    if (user) {
      const { data: o } = await supabase.from('loan_offers').select('*').eq('loan_id', id).order('created_at', { ascending: false });
      setOffers(o || []);
      const ids = [...new Set((o || []).map((x) => x.lender_id))];
      if (ids.length) {
        const { data: p } = await supabase.from('public_profiles').select('id,full_name,verification_status').in('id', ids);
        setNames(Object.fromEntries((p || []).map((x) => [x.id, x])));
      }
      if (data.borrower_id === user.id || profile?.role === 'admin') {
        const { data: d } = await supabase.from('loan_documents').select('*').eq('loan_id', id);
        const signed = [];
        for (const doc of d || []) {
          const { data: s } = await supabase.storage.from('proofs').createSignedUrl(doc.path, 600);
          if (s?.signedUrl) signed.push({ name: doc.file_name || 'Document', url: s.signedUrl });
        }
        setDocs(signed);
      }
    }
  }, [id, user, profile?.role]);
  useEffect(() => { if (isConfigured) load(); }, [load]);

  async function rpc(name, args, okMsg) {
    setBusy(true);
    const { error } = await supabase.rpc(name, args);
    setBusy(false);
    if (error) { toast(error.message, 'error'); return false; }
    toast(okMsg, 'success'); await load(); return true;
  }
  async function makeOffer(e) {
    e.preventDefault();
    const ok = await rpc('make_offer', { p_loan: id, p_amount: Number(offer.amount), p_rate: Number(offer.interest_rate), p_terms: offer.terms }, 'Offer sent to the borrower.');
    if (ok) setOffer({ amount: '', interest_rate: '5', terms: '' });
  }
  async function respond(o, action) {
    if (!(await confirm(action === 'accept' ? `Accept the offer of ${money(o.amount)}? The lender will be asked to pay.` : 'Decline this offer?', { okText: action === 'accept' ? 'Accept' : 'Decline', danger: action === 'reject' }))) return;
    rpc('respond_offer', { p_offer: o.id, p_action: action }, action === 'accept' ? 'Offer accepted. The lender has been notified.' : 'Offer declined.');
  }
  async function rate(e) {
    e.preventDefault();
    rpc('rate_borrower', { p_loan: id, p_score: Number(rating.score), p_review: rating.review, p_recommend: rating.recommend }, 'Thanks for your rating!');
  }

  if (!isConfigured) return <SetupNotice />;
  if (loan === undefined) return <div className="container section"><Loading /></div>;
  if (loan === null) return <div className="container section"><Empty title="Loan not found" text="It may be pending review or removed."><Link href="/loans" className="btn btn-outline">Back to loans</Link></Empty></div>;

  const isBorrower = user?.id === loan.borrower_id;
  const remaining = Number(loan.amount) - Number(loan.amount_matched);
  const myOffer = offers.find((o) => o.lender_id === user?.id);
  const myPaid = offers.some((o) => o.lender_id === user?.id && o.paid);
  const canOffer = user && !isBorrower && loan.status === 'approved' && remaining >= 100 && !(myOffer && ['pending', 'accepted'].includes(myOffer.status));

  return (
    <div className="container section">
      <p><Link href="/loans">← All loans</Link></p>
      <div className="detail-grid">
        <div className="card">
          <div className="page-head" style={{ marginBottom: '.5rem' }}><h1 className="page-title" style={{ margin: 0 }}>{loanTitle(loan)}</h1><Badge status={loan.status} /></div>
          <div className="person" style={{ marginBottom: '1rem' }}><Avatar name={loan.borrower_name} /><div><Link href={`/u/${loan.borrower_id}`}><strong>{loan.borrower_name}</strong></Link><br /><Verified status={loan.borrower_verification} />{loan.avg_rating && <span className="small muted"> ★ {loan.avg_rating} ({loan.rating_count})</span>}</div></div>
          <div className="amount">{money(loan.amount)}</div>
          <Progress value={pct(loan.amount_funded, loan.amount)} />
          <div className="meta"><span>{money(loan.amount_funded)} paid in</span><span>{money(remaining)} still unmatched</span><span>{loan.duration_months} months</span><span>{loan.repayment_option === 'installments' ? 'Monthly installments' : 'One-time repayment'}</span><span>Posted {date(loan.created_at)}</span></div>
          <h3>Reason</h3><p style={{ whiteSpace: 'pre-wrap' }}>{loan.reason}</p>
          {docs.length > 0 && (<><h3>Proof documents</h3><ul>{docs.map((d) => <li key={d.url}><a href={d.url} target="_blank" rel="noopener noreferrer">{d.name}</a></li>)}</ul></>)}
          {reviews.length > 0 && (<><h3>Lender reviews of this borrower</h3><div className="list">{reviews.map((r) => <div key={r.id} className="item"><div><strong>{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</strong> <span className="small muted">by {r.lender_name}</span>{r.review && <p className="small" style={{ margin: '.3rem 0 0' }}>{r.review}</p>}</div></div>)}</div></>)}
        </div>

        <div style={{ display: 'grid', gap: '1.2rem' }}>
          {!user && <div className="card"><p>Log in to make an offer or manage offers.</p><Link className="btn btn-primary" href={`/login?next=/loans/${id}`}>Log in</Link></div>}

          {canOffer && (
            <form className="card" onSubmit={makeOffer}>
              <h3>Make an offer</h3>
              <div className="field"><label htmlFor="oa">Amount (৳) — up to {money(remaining)}</label><input id="oa" type="number" min="100" max={remaining} required value={offer.amount} onChange={(e) => setOffer({ ...offer, amount: e.target.value })} /></div>
              <div className="field"><label htmlFor="or">Interest (flat %, 0–50)</label><input id="or" type="number" min="0" max="50" step="0.5" required value={offer.interest_rate} onChange={(e) => setOffer({ ...offer, interest_rate: e.target.value })} /></div>
              <div className="field"><label htmlFor="ot">Message / terms (optional)</label><textarea id="ot" maxLength={1000} value={offer.terms} onChange={(e) => setOffer({ ...offer, terms: e.target.value })} /></div>
              <button className="btn btn-primary btn-block" disabled={busy}>Send offer</button>
            </form>
          )}

          {myOffer && !isBorrower && (
            <div className="card"><h3>Your offer</h3><p>{money(myOffer.amount)} at {myOffer.interest_rate}% · <Badge status={myOffer.status} /></p>
              {myOffer.status === 'accepted' && !myOffer.paid && loan.status === 'approved' && <Link className="btn btn-primary btn-block" href={`/pay?type=loan&id=${myOffer.id}`}>Pay {money(myOffer.amount)} now</Link>}
              {myOffer.paid && <p className="muted">Paid ✓ — repayments appear in your profile.</p>}
            </div>
          )}

          {myPaid && ['funded', 'repaid'].includes(loan.status) && (
            <form className="card" onSubmit={rate}>
              <h3>Rate this borrower</h3>
              <div className="field"><label htmlFor="rs">Score</label><select id="rs" value={rating.score} onChange={(e) => setRating({ ...rating, score: e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}</select></div>
              <div className="field"><label htmlFor="rr">Review</label><textarea id="rr" maxLength={1000} value={rating.review} onChange={(e) => setRating({ ...rating, review: e.target.value })} /></div>
              <label style={{ display: 'flex', gap: '.5rem', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={rating.recommend} onChange={(e) => setRating({ ...rating, recommend: e.target.checked })} /> I recommend this borrower</label>
              <button className="btn btn-outline btn-block" style={{ marginTop: '.8rem' }} disabled={busy}>Submit rating</button>
            </form>
          )}

          {isBorrower && (
            <div className="card">
              <h3>Offers received</h3>
              {offers.length === 0 && <p className="muted">No offers yet. Lenders will appear here.</p>}
              <div className="list">
                {offers.map((o) => (
                  <div key={o.id} className="item">
                    <div><strong>{names[o.lender_id]?.full_name || 'Lender'}</strong> <Verified status={names[o.lender_id]?.verification_status} /><br />
                      <span className="amount" style={{ fontSize: '1.2rem' }}>{money(o.amount)}</span> <span className="muted">at {o.interest_rate}% · total {money(o.amount * (1 + o.interest_rate / 100))}</span>
                      {o.terms && <p className="small muted" style={{ margin: '.3rem 0 0' }}>“{o.terms}”</p>}
                      <div style={{ marginTop: '.3rem' }}><Badge status={o.status} />{o.status === 'accepted' && <span className="small muted"> {o.paid ? 'paid ✓' : 'waiting for payment'}</span>}</div>
                    </div>
                    {o.status === 'pending' && loan.status === 'approved' && (
                      <div className="item-actions"><button className="btn btn-primary btn-sm" disabled={busy} onClick={() => respond(o, 'accept')}>Accept</button><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => respond(o, 'reject')}>Decline</button></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
