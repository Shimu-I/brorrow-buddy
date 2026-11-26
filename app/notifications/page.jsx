'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Guard from '@/components/Guard';
import { supabase } from '@/lib/supabase';
import { date } from '@/lib/format';
import { Empty, Loading } from '@/components/ui';

function List() {
  const [items, setItems] = useState(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
    setItems(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function markAll() { await supabase.from('notifications').update({ is_read: true }).eq('is_read', false); load(); }
  async function markOne(id) { await supabase.from('notifications').update({ is_read: true }).eq('id', id); load(); }
  if (!items) return <div className="container section"><Loading /></div>;
  return (
    <div className="container section narrow">
      <div className="page-head"><h1 className="page-title">Notifications</h1>{items.some((n) => !n.is_read) && <button className="btn btn-outline btn-sm" onClick={markAll}>Mark all read</button>}</div>
      {items.length === 0 && <Empty title="You're all caught up" text="New activity will show up here." />}
      <div className="list">{items.map((n) => (
        <div key={n.id} className="item" style={n.is_read ? {} : { borderLeft: '4px solid var(--slate)' }}>
          <div><strong>{n.title}</strong>{n.message && <p className="small" style={{ margin: '.2rem 0' }}>{n.message}</p>}<small className="muted">{date(n.created_at)}</small></div>
          <div className="item-actions">{n.link?.startsWith('/') && <Link className="btn btn-outline btn-sm" href={n.link} onClick={() => markOne(n.id)}>Open</Link>}{!n.is_read && <button className="link-btn small" onClick={() => markOne(n.id)}>Mark read</button>}</div>
        </div>))}</div>
    </div>
  );
}
export default function Page() { return <Guard><List /></Guard>; }
