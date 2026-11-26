// Demo-only card checks. Card numbers never leave the browser.
export function luhn(num) {
  const s = String(num).replace(/\D/g, '');
  if (s.length < 12 || s.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = Number(s[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
export function expiryOk(v) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(v.trim());
  if (!m) return false;
  const mm = Number(m[1]), yy = 2000 + Number(m[2]);
  if (mm < 1 || mm > 12) return false;
  const end = new Date(yy, mm, 1);
  return end > new Date();
}
