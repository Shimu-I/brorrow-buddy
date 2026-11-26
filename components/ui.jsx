import { STATUS_LABEL } from '@/lib/format';

export function Loading({ text = 'Loading…' }) {
  return <div className="state"><span className="spinner" aria-hidden="true" /><p>{text}</p></div>;
}
export function Empty({ title, text, children }) {
  return <div className="state"><h3>{title}</h3>{text && <p>{text}</p>}{children}</div>;
}
export function ErrorBox({ message }) {
  return <div className="state state-error" role="alert"><p>{message || 'Something went wrong. Please try again.'}</p></div>;
}
export function Badge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status] || status}</span>;
}
export function Progress({ value }) {
  return <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${value}%` }} /></div>;
}
export function Avatar({ name, size = 40 }) {
  const ch = (name || '?').trim().charAt(0).toUpperCase();
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">{ch}</span>;
}
export function Verified({ status }) {
  return status === 'verified' ? <span className="verified" title="Student ID verified">✓ Verified</span> : null;
}
export function SetupNotice() {
  return (
    <div className="container section">
      <div className="state state-error">
        <h2>Almost there – connect your database</h2>
        <p>Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment (see README) and redeploy.</p>
      </div>
    </div>
  );
}
