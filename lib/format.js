export function money(n) {
  const v = Number(n || 0);
  return '৳' + v.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
export function date(d) {
  if (!d) return '';
  const x = new Date(d);
  return isNaN(x) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
export const LOAN_CATEGORIES = ['Tuition & fees', 'Books & supplies', 'Medical', 'Emergency', 'Housing', 'Business', 'Other'];
export const FUND_CATEGORIES = ['Education', 'Medical', 'Community', 'Emergency', 'Flood relief', 'Clothes distribution', 'Other'];
export const STATUS_LABEL = {
  pending: 'Pending review', approved: 'Open', rejected: 'Rejected', funded: 'Funded', repaid: 'Repaid',
  unverified: 'Not verified', verified: 'Verified', accepted: 'Accepted'
};
export function loanTitle(l) { return l.custom_category || l.category; }
export function pct(raised, needed) { return needed > 0 ? Math.min(100, Math.round((Number(raised) / Number(needed)) * 100)) : 0; }
export function coverUrl(path) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return path && base ? `${base}/storage/v1/object/public/covers/${path}` : '';
}
export function safeNext(n) { return typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/profile'; }
export function fileOk(file, { maxMB = 5, types = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] } = {}) {
  if (!file) return 'No file chosen.';
  if (!types.includes(file.type)) return 'Only JPG, PNG, WebP or PDF files are allowed.';
  if (file.size > maxMB * 1024 * 1024) return `Each file must be under ${maxMB} MB.`;
  return '';
}
export function randomName(file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  return `${crypto.randomUUID()}.${ext}`;
}
