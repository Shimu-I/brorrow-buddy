'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { money, loanTitle, LOAN_CATEGORIES, pct } from '@/lib/format';
import { Avatar, Badge, Empty, ErrorBox, Loading, Progress, SetupNotice, Verified } from '@/components/ui';

export default function Loans() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');

  useEffect(() => {
    if (!isConfigured) return;
    supabase.from('loan_cards').select('*').in('status', ['approved', 'funded', 'repaid']).order('created_at', { ascending: false }).limit(200)
      .then(({ data, error: e }) => { if (e) setError(e.message); else setRows(data); });
  }, []);

  const shown = useMemo(() => (rows || []).filter((l) => {
    if (cat && l.category !== cat) return false;
    const s = search.trim().toLowerCase();
    return !s || [l.reason, l.category, l.custom_category, l.borrower_name].some((x) => (x || '').toLowerCase().includes(s));
  }), [rows, search, cat]);

  if (!isConfigured) return <SetupNotice />;
  return (
    <div className="container section">
      <div className="page-head">
        <div><h1 className="page-title">Loan requests</h1><p className="muted">Browse requests from verified students and make an offer.</p></div>
        <Link href="/loans/new" className="btn btn-primary">Request a loan</Link>
      </div>
      <div className="toolbar">
        <input aria-label="Search loans" placeholder="Search by reason, category or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>{LOAN_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      {error && <ErrorBox message={error} />}
      {!rows && !error && <Loading />}
      {rows && shown.length === 0 && <Empty title="No loan requests found" text="Try another search, or be the first to post one." />}
      <div className="grid">
        {shown.map((l) => (
          <Link key={l.id} href={`/loans/${l.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="person" style={{ marginBottom: '.8rem' }}>
              <Avatar name={l.borrower_name} /><div><strong>{l.borrower_name}</strong><br /><Verified status={l.borrower_verification} />{l.avg_rating && <span className="small muted"> ★ {l.avg_rating} ({l.rating_count})</span>}</div>
            </div>
            <h3>{loanTitle(l)}</h3>
            <div className="amount">{money(l.amount)}</div>
            <div className="meta"><span>{l.duration_months} mo</span><span>{l.repayment_option === 'installments' ? 'Installments' : 'One-time'}</span><span>{l.offer_count} offer{l.offer_count === 1 ? '' : 's'}</span></div>
            <p className="muted small" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.reason}</p>
            <Progress value={pct(l.amount_funded, l.amount)} />
            <div className="meta" style={{ justifyContent: 'space-between' }}><span>{money(l.amount_funded)} funded</span><Badge status={l.status} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
