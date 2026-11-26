'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { date } from '@/lib/format';
import { Avatar, Empty, Loading, SetupNotice, Verified } from '@/components/ui';

export default function PublicProfile() {
  const { id } = useParams();
  const [p, setP] = useState(undefined);
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    if (!isConfigured) return;
    (async () => {
      const { data } = await supabase.from('public_profiles').select('*').eq('id', id).maybeSingle();
      setP(data || null);
      const { data: r } = await supabase.from('public_ratings').select('*').eq('borrower_id', id).order('created_at', { ascending: false }).limit(20);
      setReviews(r || []);
    })();
  }, [id]);
  if (!isConfigured) return <SetupNotice />;
  if (p === undefined) return <div className="container section"><Loading /></div>;
  if (p === null) return <div className="container section"><Empty title="Profile not found" /></div>;
  const avg = reviews.length ? (reviews.reduce((a, b) => a + b.score, 0) / reviews.length).toFixed(1) : null;
  return (
    <div className="container section narrow">
      <div className="card">
        <div className="person"><Avatar name={p.full_name} size={64} /><div><h1 className="page-title" style={{ margin: 0 }}>{p.full_name}</h1><span className="muted">@{p.username || '—'}{p.university ? ` · ${p.university}` : ''}</span><br /><Verified status={p.verification_status} /><span className="small muted"> Member since {date(p.created_at)}</span></div></div>
        <h3 style={{ marginTop: '1.5rem' }}>Reputation {avg && `· ★ ${avg} (${reviews.length})`}</h3>
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        <div className="list">{reviews.map((r) => <div key={r.id} className="item"><div><strong>{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</strong> <span className="small muted">by {r.lender_name} · {date(r.created_at)}</span>{r.review && <p className="small" style={{ margin: '.3rem 0 0' }}>{r.review}</p>}</div></div>)}</div>
      </div>
    </div>
  );
}
