'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/Providers';
import { Loading, SetupNotice } from '@/components/ui';
import { isConfigured } from '@/lib/supabase';

// <Guard>...</Guard> = must be logged in; <Guard admin> = must be admin
export default function Guard({ admin = false, children }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!loading && isConfigured && !user) router.replace(`/login?next=${encodeURIComponent((window.location.pathname || '/') + window.location.search)}`);
  }, [loading, user, router, path]);
  if (!isConfigured) return <SetupNotice />;
  if (loading || !user) return <div className="container section"><Loading /></div>;
  if (admin) {
    if (!profile) return <div className="container section"><Loading /></div>;
    if (profile.role !== 'admin') return <div className="container section"><div className="state state-error"><h2>Admins only</h2><p>You do not have access to this page.</p></div></div>;
  }
  return children;
}
