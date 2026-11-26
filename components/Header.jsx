'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/Providers';
import { supabase } from '@/lib/supabase';
import { date } from '@/lib/format';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/loans', label: 'Loans' },
  { href: '/fundraisers', label: 'Fundraisers' },
  { href: '/contact', label: 'Contact' }
];

function Bell({ userId }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = items.filter((n) => !n.is_read).length;

  async function load() {
    const { data } = await supabase.from('notifications').select('id,title,message,link,is_read,created_at').order('created_at', { ascending: false }).limit(8);
    setItems(data || []);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [userId]);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  async function markAll() {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    load();
  }
  return (
    <div className="bell" ref={ref}>
      <button className="bell-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} onClick={() => { setOpen(!open); if (!open) load(); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" /></svg>
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="bell-menu">
          <div className="bell-head"><strong>Notifications</strong><button className="link-btn" onClick={markAll}>Mark all read</button></div>
          {items.length === 0 && <p className="muted pad">You're all caught up.</p>}
          {items.map((n) => (
            <Link key={n.id} href={n.link && n.link.startsWith('/') ? n.link : '/notifications'} className={`bell-item ${n.is_read ? '' : 'unread'}`} onClick={() => setOpen(false)}>
              <strong>{n.title}</strong>
              {n.message && <span>{n.message}</span>}
              <small>{date(n.created_at)}</small>
            </Link>
          ))}
          <Link href="/notifications" className="bell-all" onClick={() => setOpen(false)}>View all</Link>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); }, [path]);

  const active = (href) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  async function logout() { await signOut(); router.push('/'); }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="BorrowBuddy home">
          <Image src="/logo.svg" alt="" width={36} height={36} priority />
          <span>BorrowBuddy</span>
        </Link>
        <button className="menu-toggle" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          <span /><span /><span />
        </button>
        <div className={`header-menu ${menu ? 'open' : ''}`}>
          <nav aria-label="Main">
            {NAV.map((n) => <Link key={n.href} href={n.href} className={active(n.href) ? 'active' : ''}>{n.label}</Link>)}
            {user && <Link href="/profile" className={active('/profile') ? 'active' : ''}>Profile</Link>}
            {profile?.role === 'admin' && <Link href="/admin" className={active('/admin') ? 'active' : ''}>Admin</Link>}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <Bell userId={user.id} />
                <button className="btn btn-outline btn-sm" onClick={logout}>Log out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-primary btn-sm">Log in</Link>
                <Link href="/signup" className="btn btn-outline btn-sm">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
