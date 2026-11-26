'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Guard from '@/components/Guard';
import { useUi } from '@/components/Providers';
import { supabase } from '@/lib/supabase';
import { money, date, loanTitle } from '@/lib/format';
import { Badge, Empty, Loading } from '@/components/ui';

const TABS = [['stats', 'Overview'], ['loans', 'Loan requests'], ['funds', 'Fundraisers'], ['verify', 'Verification'], ['users', 'Users'], ['msgs', 'Messages']];

function Admin() {
  const { toast, confirm } = useUi();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(null);
    if (tab === 'stats') { const { data, error } = await supabase.rpc('admin_stats'); if (error) toast(error.message, 'error'); setStats(data); setRows([]); return; }
    let res;
    if (tab === 'loans') res = await supabase.from('loan_cards').select('*').order('created_at', { ascending: false }).limit(200);
    if (tab === 'funds') res = await supabase.from('fundraiser_cards').select('*').order('created_at', { ascending: false }).limit(200);
    if (tab === 'verify') res = await supabase.from('profiles').select('id,full_name,email,student_id,university,verification_doc').eq('verification_status', 'pending');
    if (tab === 'users') res = await supabase.from('profiles').select('id,full_name,username,email,role,verification_status,created_at').order('created_at', { ascending: false }).limit(300);
    if (tab === 'msgs') res = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
    if (res?.error) toast(res.error.message, 'error');
    setRows(res?.data || []);
  }, [tab, toast]);
  useEffect(() => { load(); }, [load]);

  async function run(fn, ok) {
    setBusy(true); const { error } = await fn(); setBusy(false);
    if (error) return toast(error.message, 'error');
    toast(ok, 'success'); load();
  }
  const review = (type, id, action) => run(() => supabase.rpc('admin_review', { p_type: type, p_id: id, p_action: action }), action === 'approve' ? 'Approved.' : 'Rejected.');
  async function del(type, id) {
    if (await confirm('Delete this permanently? This cannot be undone.', { okText: 'Delete', danger: true })) run(() => supabase.rpc('admin_delete', { p_type: type, p_id: id }), 'Deleted.');
  }
  async function openDocs(kind, id, userPath) {
    let paths = [];
    if (userPath) paths = [userPath];
    else {
      const table = kind === 'loan' ? 'loan_documents' : 'fundraiser_documents';
      const col = kind === 'loan' ? 'loan_id' : 'fundraiser_id';
      const { data } = await supabase.from(table).select('path').eq(col, id); paths = (data || []).map((d) => d.path);
    }
    if (!paths.length) return toast('No documents attached.', 'info');
    for (const p of paths) { const { data } = await supabase.storage.from('proofs').createSignedUrl(p, 300); if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener'); }
  }

  return (
    <div className="container section">
      <h1 className="page-title">Admin</h1>
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {rows === null && <Loading />}

      {tab === 'stats' && stats && (
        <div className="stat-grid">
          {[['Users', stats.total_users], ['Verified users', stats.verified_users], ['Pending ID checks', stats.pending_verifications], ['Loan requests', stats.total_loans], ['Pending loans', stats.pending_loans], ['Funded loans', stats.funded_loans], ['Fundraisers', stats.total_fundraisers], ['Pending fundraisers', stats.pending_funding], ['Loan money paid in', money(stats.total_disbursed)], ['Repaid so far', money(stats.total_repaid)], ['Donations raised', money(stats.total_donated)], ['Messages', stats.messages]]
            .map(([l, v]) => <div key={l} className="stat"><b>{v}</b><span>{l}</span></div>)}
        </div>
      )}

      {tab === 'loans' && rows && (rows.length === 0 ? <Empty title="No loan requests" /> : <div className="list">{rows.map((l) => (
        <div key={l.id} className="item"><div><Link href={`/loans/${l.id}`}><strong>{loanTitle(l)}</strong></Link> · {money(l.amount)} · {l.duration_months} mo<br /><span className="small muted">{l.borrower_name} · {date(l.created_at)}</span></div>
          <div className="item-actions"><Badge status={l.status} /><button className="btn btn-ghost btn-sm" onClick={() => openDocs('loan', l.id)}>Docs</button>
            {l.status === 'pending' && <><button className="btn btn-primary btn-sm" disabled={busy} onClick={() => review('loan', l.id, 'approve')}>Approve</button><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => review('loan', l.id, 'reject')}>Reject</button></>}
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => del('loan', l.id)}>Delete</button></div></div>))}</div>)}

      {tab === 'funds' && rows && (rows.length === 0 ? <Empty title="No fundraisers" /> : <div className="list">{rows.map((f) => (
        <div key={f.id} className="item"><div><Link href={`/fundraisers/${f.id}`}><strong>{f.title}</strong></Link> · {money(f.amount_raised)} / {money(f.amount_needed)}<br /><span className="small muted">{f.creator_name} · {date(f.created_at)}</span></div>
          <div className="item-actions"><Badge status={f.status} /><button className="btn btn-ghost btn-sm" onClick={() => openDocs('fundraiser', f.id)}>Docs</button>
            {f.status === 'pending' && <><button className="btn btn-primary btn-sm" disabled={busy} onClick={() => review('fundraiser', f.id, 'approve')}>Approve</button><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => review('fundraiser', f.id, 'reject')}>Reject</button></>}
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => del('fundraiser', f.id)}>Delete</button></div></div>))}</div>)}

      {tab === 'verify' && rows && (rows.length === 0 ? <Empty title="No pending verifications" /> : <div className="list">{rows.map((u) => (
        <div key={u.id} className="item"><div><strong>{u.full_name}</strong><br /><span className="small muted">{u.email} · ID {u.student_id || '—'} · {u.university || '—'}</span></div>
          <div className="item-actions"><button className="btn btn-ghost btn-sm" onClick={() => openDocs('', '', u.verification_doc)}>View ID</button>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(() => supabase.rpc('admin_set_verification', { p_user: u.id, p_action: 'approve' }), 'Verified.')}>Approve</button>
            <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(() => supabase.rpc('admin_set_verification', { p_user: u.id, p_action: 'reject' }), 'Rejected.')}>Reject</button></div></div>))}</div>)}

      {tab === 'users' && rows && (<div className="table-wrap"><table className="tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Verification</th><th>Joined</th><th /></tr></thead><tbody>{rows.map((u) => (
        <tr key={u.id}><td><Link href={`/u/${u.id}`}>{u.full_name}</Link></td><td>{u.email}</td><td>{u.role}</td><td>{u.verification_status}</td><td>{date(u.created_at)}</td>
          <td>{u.role !== 'admin' && <button className="link-btn" onClick={async () => { if (await confirm(`Delete ${u.full_name}? Users with payment history cannot be deleted.`, { okText: 'Delete', danger: true })) run(() => supabase.rpc('admin_delete_user', { p_user: u.id }), 'User deleted.'); }}>Delete</button>}</td></tr>))}</tbody></table></div>)}

      {tab === 'msgs' && rows && (rows.length === 0 ? <Empty title="No messages yet" /> : <div className="list">{rows.map((m) => <div key={m.id} className="item"><div><strong>{m.name}</strong> · <a href={`mailto:${m.email}`}>{m.email}</a> <small className="muted">{date(m.created_at)}</small><p style={{ margin: '.3rem 0 0', whiteSpace: 'pre-wrap' }}>{m.message}</p></div></div>)}</div>)}
    </div>
  );
}
export default function Page() { return <Guard admin><Admin /></Guard>; }
