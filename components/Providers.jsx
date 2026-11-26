'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';

const AuthCtx = createContext({ user: null, profile: null, loading: true, refresh: async () => {}, signOut: async () => {} });
const UiCtx = createContext({ toast: () => {}, confirm: async () => false });
export const useAuth = () => useContext(AuthCtx);
export const useUi = () => useContext(UiCtx);

export default function Providers({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const loadProfile = useCallback(async (u) => {
    if (!u) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      const u = data.session?.user || null;
      setUser(u); await loadProfile(u); setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user || null;
      setUser(u);
      // never call supabase inside this callback directly (can deadlock) - defer
      setTimeout(() => loadProfile(u), 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const refresh = useCallback(async () => { if (user) await loadProfile(user); }, [user, loadProfile]);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); }, []);

  const toast = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const confirm = useCallback((message, opts = {}) => new Promise((resolve) => {
    setDialog({ message, okText: opts.okText || 'Confirm', danger: !!opts.danger, resolve });
  }), []);
  const closeDialog = (v) => { dialog?.resolve(v); setDialog(null); };

  return (
    <AuthCtx.Provider value={{ user, profile, loading, refresh, signOut }}>
      <UiCtx.Provider value={{ toast, confirm }}>
        {children}
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`} role="status" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>{t.message}</div>
          ))}
        </div>
        {dialog && (
          <div className="modal-back" role="dialog" aria-modal="true" onClick={() => closeDialog(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <p>{dialog.message}</p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => closeDialog(false)}>Cancel</button>
                <button className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`} autoFocus onClick={() => closeDialog(true)}>{dialog.okText}</button>
              </div>
            </div>
          </div>
        )}
      </UiCtx.Provider>
    </AuthCtx.Provider>
  );
}
