'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import { useUi } from '@/components/Providers';
import { supabase } from '@/lib/supabase';
import { useQueryParams } from '@/lib/hooks';
import { money, loanTitle } from '@/lib/format';
import { luhn, expiryOk } from '@/lib/luhn';
import { Loading, ErrorBox } from '@/components/ui';

const PROVIDERS = ['bKash', 'Nagad', 'Rocket', 'Upay'];

function Gateway() {
  const q = useQueryParams();
  const router = useRouter();
  const { toast } = useUi();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [anon, setAnon] = useState(false);
  const [method, setMethod] = useState('card');
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', holder: '' });
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  const type = q?.get('type');
  const id = q?.get('id');

  useEffect(() => {
    if (!q) return;
    (async () => {
      if (!['loan', 'repayment', 'funding'].includes(type) || !id) return setError('Invalid payment link.');
      if (type === 'loan') {
        const { data: o } = await supabase.from('loan_offers').select('*').eq('id', id).maybeSingle();
        if (!o || o.status !== 'accepted' || o.paid) return setError('This offer cannot be paid (already paid or not accepted).');
        const { data: l } = await supabase.from('loan_cards').select('*').eq('id', o.loan_id).maybeSingle();
        setInfo({ title: 'Fund a loan', subtitle: l ? `${loanTitle(l)} · ${l.borrower_name}` : '', amount: Number(o.amount), fixed: true, back: `/loans/${o.loan_id}` });
      } else if (type === 'repayment') {
        const { data: r } = await supabase.from('repayments').select('*').eq('id', id).maybeSingle();
        if (!r || r.status !== 'pending') return setError('This installment cannot be paid (already paid?).');
        setInfo({ title: 'Repay an installment', subtitle: `Installment ${r.installment_no} of ${r.total_installments} · due ${r.due_date}`, amount: Number(r.amount), fixed: true, back: '/profile' });
      } else {
        const { data: f } = await supabase.from('fundraiser_cards').select('*').eq('id', id).maybeSingle();
        if (!f || f.status !== 'approved') return setError('This fundraiser is not accepting contributions.');
        const remaining = Number(f.amount_needed) - Number(f.amount_raised);
        setInfo({ title: 'Contribute', subtitle: f.title, amount: null, fixed: false, remaining, back: `/fundraisers/${id}` });
      }
    })();
  }, [q, type, id]);

  async function submit(e) {
    e.preventDefault(); setFormErr('');
    const value = info.fixed ? info.amount : Number(amount);
    if (!info.fixed && !(value >= 1 && value <= info.remaining)) return setFormErr(`Enter an amount between ৳1 and ${money(info.remaining)}.`);
    if (method === 'card') {
      if (!luhn(card.number)) return setFormErr('Card number is not valid. Demo card: 4242 4242 4242 4242');
      if (!expiryOk(card.expiry)) return setFormErr('Card expiry must be a future date in MM/YY format.');
      if (!/^\d{3,4}$/.test(card.cvc)) return setFormErr('CVC must be 3 or 4 digits.');
      if (card.holder.trim().length < 2) return setFormErr('Enter the card holder name.');
    }
    setBusy(true);
    const label = method === 'card' ? 'card' : provider.toLowerCase();   // only the method name is sent, never card data
    let res;
    if (type === 'loan') res = await supabase.rpc('pay_offer', { p_offer: id, p_method: label });
    else if (type === 'repayment') res = await supabase.rpc('pay_repayment', { p_repayment: id, p_method: label });
    else res = await supabase.rpc('contribute', { p_fund: id, p_amount: value, p_method: label, p_anon: anon });
    setBusy(false);
    if (res.error) return setFormErr(res.error.message);
    toast(`Demo payment successful · ref ${res.data}`, 'success');
    router.replace(info.back);
  }

  if (error) return <div className="container section narrow"><ErrorBox message={error} /><p style={{ textAlign: 'center' }}><Link href="/profile" className="btn btn-outline">Back to profile</Link></p></div>;
  if (!info) return <div className="container section"><Loading /></div>;
  return (
    <div className="container section narrow">
      <h1 className="page-title">{info.title}</h1>
      <p className="muted">{info.subtitle}</p>
      <div className="notice"><strong>Demo payment</strong> – no real money is charged and card details never leave your browser.</div>
      <form className="card" onSubmit={submit}>
        {info.fixed ? <p>Amount: <span className="amount">{money(info.amount)}</span></p> : (
          <div className="field"><label htmlFor="amt">Amount (৳) — up to {money(info.remaining)}</label><input id="amt" type="number" min="1" max={info.remaining} step="1" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            <label style={{ display: 'flex', gap: '.5rem', fontWeight: 400, marginTop: '.6rem' }}><input type="checkbox" style={{ width: 'auto' }} checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Contribute anonymously</label></div>
        )}
        <div className="chips" style={{ marginBottom: '1rem' }} role="radiogroup" aria-label="Payment method">
          <button type="button" className={`chip ${method === 'card' ? 'on' : ''}`} onClick={() => setMethod('card')}>Card</button>
          <button type="button" className={`chip ${method === 'mobile' ? 'on' : ''}`} onClick={() => setMethod('mobile')}>Mobile banking</button>
        </div>
        {method === 'card' ? (
          <>
            <div className="field"><label htmlFor="cn">Card number</label><input id="cn" inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, '').slice(0, 23) })} /></div>
            <div className="row">
              <div className="field"><label htmlFor="ce">Expiry (MM/YY)</label><input id="ce" placeholder="12/30" autoComplete="off" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value.slice(0, 5) })} /></div>
              <div className="field"><label htmlFor="cc">CVC</label><input id="cc" inputMode="numeric" autoComplete="off" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></div>
            </div>
            <div className="field"><label htmlFor="ch">Name on card</label><input id="ch" autoComplete="off" value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} /></div>
          </>
        ) : (
          <div className="field"><label htmlFor="mp">Provider</label><select id="mp" value={provider} onChange={(e) => setProvider(e.target.value)}>{PROVIDERS.map((p) => <option key={p}>{p}</option>)}</select><p className="hint">In this demo no mobile number is needed.</p></div>
        )}
        {formErr && <p className="err" role="alert">{formErr}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Processing…' : `Pay ${info.fixed ? money(info.amount) : amount ? money(amount) : ''}`}</button>
      </form>
    </div>
  );
}
export default function Page() { return <Guard><Gateway /></Guard>; }
