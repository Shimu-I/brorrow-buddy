# BorrowBuddy 2.0 — students helping students

Peer-to-peer student loans + community fundraisers.
**Stack (all free tiers):** Next.js 16 (React 19, App Router) · Supabase (Postgres, Auth, Storage) · Vercel hosting.
Payments are a **demo** – no real money moves and card details never leave the browser.

## Deploy online in ~15 minutes (no server, no credit card)

### 1. Database – Supabase (free)
1. Create an account at <https://supabase.com> → **New project** (pick a region near your users, save the DB password).
2. Open **SQL Editor → New query**, paste the whole file `supabase/schema.sql`, press **Run**. (Safe to run again.)
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
4. **Authentication → URL Configuration**: set *Site URL* to your future Vercel URL (you can come back and edit it after step 3), and add `https://YOUR-APP.vercel.app/**` and `http://localhost:3000/**` to *Redirect URLs*.
5. (Optional, easier testing) **Authentication → Providers → Email**: turn off *Confirm email*. Leave it on for a real launch.

### 2. Code – GitHub (free)
Create a new GitHub repository and push this folder (`.env` files are git-ignored).

### 3. Hosting – Vercel (free Hobby plan)
1. <https://vercel.com> → **Add New → Project** → import your repo (framework is auto-detected as Next.js).
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
3. **Deploy.** Then put the Vercel URL into Supabase *Site URL* (step 1.4).

### 4. Make yourself admin
Sign up on the site, then in Supabase **SQL Editor** run:
```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```
Reload – an **Admin** link appears in the header.

## Try the whole flow (needs 3 accounts: borrower, lender, admin)
1. Borrower: **Request a loan** (attach any photo/PDF as proof).
2. Admin: **Admin → Loan requests → Approve**.
3. Lender: open the loan → **Make an offer**.
4. Borrower: open the loan → **Accept** the offer.
5. Lender: **Pay now** → card `4242 4242 4242 4242`, any future expiry (e.g. `12/30`), any 3-digit CVC.
6. Borrower: **Profile → Repayments → Pay now** (installments must be paid in order). Lender can rate the borrower.
Fundraisers work the same way: create → admin approves → anyone contributes.

## Run locally
```bash
cp .env.example .env.local   # fill in the two Supabase values
npm install
npm run dev                  # http://localhost:3000
```

## How security works (important)
- The anon key is public by design. **Row Level Security** in `schema.sql` decides who can read/write each row.
- Money logic (offers, payments, contributions, ratings, approvals) lives in database functions (`make_offer`, `pay_offer`, `pay_repayment`, `contribute`, …) that run atomically with row locks. Amounts are computed on the server – the browser cannot change a loan amount, installment or someone's role.
- Proof documents and student IDs are in a **private** storage bucket; only the owner and admins can open them (short-lived signed links). Fundraiser cover photos are public.
- Users cannot make themselves admin or verified (`protect_profile` trigger).
- Emails and private fields are never exposed through the public views.

## Free-tier limits to know
- Supabase free: 500 MB database, 1 GB file storage, and projects **pause after ~1 week of inactivity** (one click to resume).
- Vercel Hobby is for personal / non-commercial use.
- Supabase's built-in email sender is rate-limited; for many sign-ups add a free SMTP provider (e.g. Resend / Brevo) in Auth settings.
- Contact-form messages are stored in the database and shown in **Admin → Messages**.

## Project layout
```
app/            pages (home, loans, fundraisers, pay, profile, admin, auth…)
components/     header, footer, providers (auth + toasts + confirm), UI bits
lib/            supabase client, formatting, demo card validation
supabase/       schema.sql  ← run once in Supabase
```
