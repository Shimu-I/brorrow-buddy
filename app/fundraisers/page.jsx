'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { money, coverUrl, pct, FUND_CATEGORIES } from '@/lib/format';
import { Badge, Empty, ErrorBox, Loading, Progress, SetupNotice } from '@/components/ui';

export default function Fundraisers() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  useEffect(() => {
    if (!isConfigured) return;
    supabase.from('fundraiser_cards').select('*').in('status', ['approved', 'funded']).order('created_at', { ascending: false }).limit(200)
      .then(({ data, error: e }) => { if (e) setError(e.message); else setRows(data); });
  }, []);
  const shown = useMemo(() => (rows || []).filter((f) => {
    if (cat && f.category !== cat) return false;
    const s = search.trim().toLowerCase();
    return !s || [f.title, f.summary, f.creator_name].some((x) => (x || '').toLowerCase().includes(s));
  }), [rows, search, cat]);
  if (!isConfigured) return <SetupNotice />;
  return (
    <div className="container section">
      <div className="page-head">
        <div><h1 className="page-title">Fundraisers</h1><p className="muted">Support a student or community cause.</p></div>
        <Link href="/fundraisers/new" className="btn btn-primary">Start a fundraiser</Link>
      </div>
      <div className="toolbar">
        <input aria-label="Search fundraisers" placeholder="Search fundraisers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{FUND_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {error && <ErrorBox message={error} />}
      {!rows && !error && <Loading />}
      {rows && shown.length === 0 && <Empty title="No fundraisers found" text="Check back soon or start one yourself." />}
      <div className="grid">
        {shown.map((f) => (
          <Link key={f.id} href={`/fundraisers/${f.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            {f.cover_path ? <img className="cover" src={coverUrl(f.cover_path)} alt="" loading="lazy" /> : <div className="cover cover-fallback">{f.category}</div>}
            <h3>{f.title}</h3>
            <p className="muted small">by {f.creator_name}</p>
            <Progress value={pct(f.amount_raised, f.amount_needed)} />
            <div className="meta" style={{ justifyContent: 'space-between' }}><span><b>{money(f.amount_raised)}</b> of {money(f.amount_needed)}</span><Badge status={f.status} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
