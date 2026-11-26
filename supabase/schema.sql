-- =====================================================================
-- BorrowBuddy - Supabase (Postgres) schema, security rules and money logic
-- Run this ONCE in: Supabase dashboard -> SQL Editor -> New query -> Run
-- Payments are a DEMO: no card data is ever sent to or stored in the database.
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text unique,
  email text,
  role text not null default 'student' check (role in ('student','admin')),
  student_id text,
  university text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  verification_doc text,
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  custom_category text,
  amount numeric(12,2) not null check (amount between 100 and 500000),
  duration_months int not null check (duration_months between 1 and 60),
  repayment_option text not null default 'installments' check (repayment_option in ('installments','one_time')),
  reason text not null check (char_length(reason) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','funded','repaid')),
  created_at timestamptz not null default now()
);

create table if not exists public.loan_documents (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  doc_type text,
  path text not null,
  file_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_offers (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  lender_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 100),
  interest_rate numeric(5,2) not null check (interest_rate between 0 and 50),
  terms text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists loan_offers_loan_idx on public.loan_offers(loan_id);
create index if not exists loan_offers_lender_idx on public.loan_offers(lender_id);

create table if not exists public.repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  offer_id uuid not null references public.loan_offers(id) on delete cascade,
  installment_no int not null,
  total_installments int not null,
  amount numeric(12,2) not null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  paid_at timestamptz,
  unique (offer_id, installment_no)
);

create table if not exists public.fundraisers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  category text not null,
  summary text not null check (char_length(summary) between 20 and 3000),
  amount_needed numeric(12,2) not null check (amount_needed >= 100),
  amount_raised numeric(12,2) not null default 0,
  cover_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','funded')),
  created_at timestamptz not null default now()
);

create table if not exists public.fundraiser_documents (
  id uuid primary key default gen_random_uuid(),
  fundraiser_id uuid not null references public.fundraisers(id) on delete cascade,
  path text not null,
  file_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.fundraiser_contributions (
  id uuid primary key default gen_random_uuid(),
  fundraiser_id uuid not null references public.fundraisers(id) on delete cascade,
  contributor_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 1),
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.fundraiser_updates (
  id uuid primary key default gen_random_uuid(),
  fundraiser_id uuid not null references public.fundraisers(id) on delete cascade,
  body text not null check (char_length(body) between 3 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('loan_funding','repayment','contribution')),
  ref_id uuid,
  amount numeric(12,2) not null,
  method text,
  reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  message text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  lender_id uuid not null references public.profiles(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score between 1 and 5),
  review text,
  recommend boolean not null default true,
  created_at timestamptz not null default now(),
  unique (loan_id, lender_id)
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200),
  message text not null check (char_length(message) between 5 and 3000),
  created_at timestamptz not null default now()
);

-- ---------- helper functions ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.notify(p_user uuid, p_type text, p_title text, p_msg text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, type, title, message, link) values (p_user, p_type, p_title, p_msg, p_link)
$$;
revoke all on function public.notify(uuid,text,text,text,text) from public, anon, authenticated;

-- new auth user -> profile (role is ALWAYS student here)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into public.profiles(id, full_name, username, email)
    values (new.id,
            coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
            nullif(lower(trim(new.raw_user_meta_data->>'username')), ''),
            new.email);
  exception when unique_violation then
    insert into public.profiles(id, full_name, email)
    values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)), new.email);
  end;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- users cannot promote themselves or fake verification
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.id := old.id; new.role := old.role; new.email := old.email; new.created_at := old.created_at;
    if not (new.verification_status = 'pending' and old.verification_status in ('unverified','rejected')) then
      new.verification_status := old.verification_status;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_trg on public.profiles;
create trigger protect_profile_trg before update on public.profiles for each row execute function public.protect_profile();

-- ---------- public views (no emails, no private data) ----------
create or replace view public.public_profiles as
  select id, full_name, username, university, verification_status, created_at from public.profiles;
grant select on public.public_profiles to anon, authenticated;

create or replace view public.loan_cards as
select l.id, l.borrower_id, l.category, l.custom_category, l.amount, l.duration_months, l.repayment_option,
       l.reason, l.status, l.created_at,
       p.full_name as borrower_name, p.verification_status as borrower_verification,
       (select count(*) from public.loan_offers o where o.loan_id = l.id)::int as offer_count,
       coalesce((select sum(o.amount) from public.loan_offers o where o.loan_id = l.id and o.status = 'accepted'), 0) as amount_matched,
       coalesce((select sum(o.amount) from public.loan_offers o where o.loan_id = l.id and o.status = 'accepted' and o.paid), 0) as amount_funded,
       (select round(avg(r.score), 1) from public.ratings r where r.borrower_id = l.borrower_id) as avg_rating,
       (select count(*) from public.ratings r where r.borrower_id = l.borrower_id)::int as rating_count
from public.loans l join public.profiles p on p.id = l.borrower_id
where l.status in ('approved','funded','repaid') or l.borrower_id = auth.uid() or public.is_admin();
grant select on public.loan_cards to anon, authenticated;

create or replace view public.fundraiser_cards as
select f.id, f.creator_id, f.title, f.category, f.summary, f.amount_needed, f.amount_raised, f.cover_path, f.status, f.created_at,
       p.full_name as creator_name, p.verification_status as creator_verification,
       (select count(*) from public.fundraiser_contributions c where c.fundraiser_id = f.id)::int as supporter_count
from public.fundraisers f join public.profiles p on p.id = f.creator_id
where f.status in ('approved','funded') or f.creator_id = auth.uid() or public.is_admin();
grant select on public.fundraiser_cards to anon, authenticated;

create or replace view public.fundraiser_supporters as
select c.id, c.fundraiser_id, c.amount, c.created_at,
       case when c.is_anonymous then 'Anonymous' else p.full_name end as name
from public.fundraiser_contributions c join public.profiles p on p.id = c.contributor_id
join public.fundraisers f on f.id = c.fundraiser_id
where f.status in ('approved','funded');
grant select on public.fundraiser_supporters to anon, authenticated;

create or replace view public.public_ratings as
select r.id, r.borrower_id, r.score, r.review, r.recommend, r.created_at, p.full_name as lender_name
from public.ratings r join public.profiles p on p.id = r.lender_id;
grant select on public.public_ratings to anon, authenticated;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.loans enable row level security;
alter table public.loan_documents enable row level security;
alter table public.loan_offers enable row level security;
alter table public.repayments enable row level security;
alter table public.fundraisers enable row level security;
alter table public.fundraiser_documents enable row level security;
alter table public.fundraiser_contributions enable row level security;
alter table public.fundraiser_updates enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.ratings enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists loans_select on public.loans;
create policy loans_select on public.loans for select using (status in ('approved','funded','repaid') or borrower_id = auth.uid() or public.is_admin());
drop policy if exists loans_insert on public.loans;
create policy loans_insert on public.loans for insert to authenticated with check (borrower_id = auth.uid() and status = 'pending');

drop policy if exists loan_docs_select on public.loan_documents;
create policy loan_docs_select on public.loan_documents for select to authenticated
  using (public.is_admin() or exists (select 1 from public.loans l where l.id = loan_id and l.borrower_id = auth.uid()));
drop policy if exists loan_docs_insert on public.loan_documents;
create policy loan_docs_insert on public.loan_documents for insert to authenticated
  with check (exists (select 1 from public.loans l where l.id = loan_id and l.borrower_id = auth.uid() and l.status = 'pending'));

drop policy if exists offers_select on public.loan_offers;
create policy offers_select on public.loan_offers for select to authenticated
  using (lender_id = auth.uid() or public.is_admin() or exists (select 1 from public.loans l where l.id = loan_id and l.borrower_id = auth.uid()));

drop policy if exists repay_select on public.repayments;
create policy repay_select on public.repayments for select to authenticated
  using (public.is_admin()
         or exists (select 1 from public.loans l where l.id = loan_id and l.borrower_id = auth.uid())
         or exists (select 1 from public.loan_offers o where o.id = offer_id and o.lender_id = auth.uid()));

drop policy if exists fund_select on public.fundraisers;
create policy fund_select on public.fundraisers for select using (status in ('approved','funded') or creator_id = auth.uid() or public.is_admin());
drop policy if exists fund_insert on public.fundraisers;
create policy fund_insert on public.fundraisers for insert to authenticated
  with check (creator_id = auth.uid() and status = 'pending' and amount_raised = 0);

drop policy if exists fund_docs_select on public.fundraiser_documents;
create policy fund_docs_select on public.fundraiser_documents for select to authenticated
  using (public.is_admin() or exists (select 1 from public.fundraisers f where f.id = fundraiser_id and f.creator_id = auth.uid()));
drop policy if exists fund_docs_insert on public.fundraiser_documents;
create policy fund_docs_insert on public.fundraiser_documents for insert to authenticated
  with check (exists (select 1 from public.fundraisers f where f.id = fundraiser_id and f.creator_id = auth.uid() and f.status = 'pending'));

drop policy if exists contrib_select on public.fundraiser_contributions;
create policy contrib_select on public.fundraiser_contributions for select to authenticated
  using (contributor_id = auth.uid() or public.is_admin() or exists (select 1 from public.fundraisers f where f.id = fundraiser_id and f.creator_id = auth.uid()));

drop policy if exists fupd_select on public.fundraiser_updates;
create policy fupd_select on public.fundraiser_updates for select using (
  exists (select 1 from public.fundraisers f where f.id = fundraiser_id and (f.status in ('approved','funded') or f.creator_id = auth.uid() or public.is_admin())));
drop policy if exists fupd_insert on public.fundraiser_updates;
create policy fupd_insert on public.fundraiser_updates for insert to authenticated
  with check (exists (select 1 from public.fundraisers f where f.id = fundraiser_id and f.creator_id = auth.uid() and f.status in ('approved','funded')));

drop policy if exists tx_select on public.transactions;
create policy tx_select on public.transactions for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists ratings_select on public.ratings;
create policy ratings_select on public.ratings for select to authenticated using (lender_id = auth.uid() or borrower_id = auth.uid() or public.is_admin());

drop policy if exists contact_insert on public.contact_messages;
create policy contact_insert on public.contact_messages for insert to anon, authenticated with check (true);
drop policy if exists contact_select on public.contact_messages;
create policy contact_select on public.contact_messages for select to authenticated using (public.is_admin());

-- ---------- money & workflow functions (all amounts decided on the server) ----------
create or replace function public.make_offer(p_loan uuid, p_amount numeric, p_rate numeric, p_terms text)
returns uuid language plpgsql security definer set search_path = public as $$
declare l public.loans; remaining numeric; new_id uuid;
begin
  if auth.uid() is null then raise exception 'Please log in first.'; end if;
  select * into l from public.loans where id = p_loan for update;
  if not found or l.status <> 'approved' then raise exception 'This loan is not open for offers.'; end if;
  if l.borrower_id = auth.uid() then raise exception 'You cannot make an offer on your own loan.'; end if;
  if p_rate is null or p_rate < 0 or p_rate > 50 then raise exception 'Interest rate must be between 0 and 50 percent.'; end if;
  select l.amount - coalesce(sum(amount), 0) into remaining from public.loan_offers where loan_id = p_loan and status = 'accepted';
  if p_amount is null or p_amount < 100 then raise exception 'Minimum offer is 100.'; end if;
  if p_amount > remaining then raise exception 'The borrower only still needs % - lower your offer.', remaining; end if;
  if exists (select 1 from public.loan_offers where loan_id = p_loan and lender_id = auth.uid() and status in ('pending','accepted')) then
    raise exception 'You already have an active offer on this loan.';
  end if;
  insert into public.loan_offers(loan_id, lender_id, amount, interest_rate, terms)
  values (p_loan, auth.uid(), p_amount, p_rate, left(coalesce(p_terms, ''), 1000)) returning id into new_id;
  perform public.notify(l.borrower_id, 'loan_offer', 'New loan offer', 'You received an offer of ' || p_amount || ' at ' || p_rate || '%.', '/loans/' || p_loan);
  return new_id;
end $$;

create or replace function public.respond_offer(p_offer uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.loan_offers; l public.loans; remaining numeric;
begin
  select * into o from public.loan_offers where id = p_offer for update;
  if not found then raise exception 'Offer not found.'; end if;
  select * into l from public.loans where id = o.loan_id for update;
  if l.borrower_id <> auth.uid() then raise exception 'Only the borrower can respond to offers.'; end if;
  if o.status <> 'pending' or l.status <> 'approved' then raise exception 'This offer can no longer be changed.'; end if;
  if p_action = 'accept' then
    select l.amount - coalesce(sum(amount), 0) into remaining from public.loan_offers where loan_id = l.id and status = 'accepted';
    if o.amount > remaining then raise exception 'Accepting this would exceed the amount you asked for.'; end if;
    update public.loan_offers set status = 'accepted' where id = p_offer;
    perform public.notify(o.lender_id, 'loan_accepted', 'Offer accepted - please pay', 'Your offer of ' || o.amount || ' was accepted. Pay to release the funds.', '/pay?type=loan&id=' || p_offer);
  elsif p_action = 'reject' then
    update public.loan_offers set status = 'rejected' where id = p_offer;
    perform public.notify(o.lender_id, 'loan_offer', 'Offer declined', 'Your offer of ' || o.amount || ' was declined.', '/loans/' || l.id);
  else raise exception 'Unknown action.'; end if;
end $$;

create or replace function public.pay_offer(p_offer uuid, p_method text)
returns text language plpgsql security definer set search_path = public as $$
declare o public.loan_offers; l public.loans; n int; total numeric; per numeric; i int; amt numeric; ref text; funded numeric;
begin
  select * into o from public.loan_offers where id = p_offer for update;
  if not found or o.lender_id <> auth.uid() then raise exception 'Offer not found.'; end if;
  select * into l from public.loans where id = o.loan_id for update;
  if o.status <> 'accepted' or o.paid then raise exception 'This offer cannot be paid.'; end if;
  if l.status <> 'approved' then raise exception 'This loan is no longer open.'; end if;
  ref := 'DEMO-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
  update public.loan_offers set paid = true, paid_at = now() where id = p_offer;
  insert into public.transactions(user_id, kind, ref_id, amount, method, reference) values (auth.uid(), 'loan_funding', p_offer, o.amount, left(p_method, 30), ref);
  n := case when l.repayment_option = 'installments' then l.duration_months else 1 end;
  total := round(o.amount * (1 + o.interest_rate / 100), 2);
  per := round(total / n, 2);
  for i in 1..n loop
    amt := case when i = n then total - per * (n - 1) else per end;
    insert into public.repayments(loan_id, offer_id, installment_no, total_installments, amount, due_date)
    values (l.id, p_offer, i, n, amt, (current_date + make_interval(months => i))::date);
  end loop;
  select coalesce(sum(amount), 0) into funded from public.loan_offers where loan_id = l.id and status = 'accepted' and paid;
  if funded >= l.amount then
    update public.loans set status = 'funded' where id = l.id;
    update public.loan_offers set status = 'rejected' where loan_id = l.id and status = 'pending';
  end if;
  perform public.notify(l.borrower_id, 'contribution', 'Loan funded', 'A lender paid ' || o.amount || '. Repayments are now scheduled in your profile.', '/profile');
  return ref;
end $$;

create or replace function public.pay_repayment(p_repayment uuid, p_method text)
returns text language plpgsql security definer set search_path = public as $$
declare r public.repayments; l public.loans; o public.loan_offers; ref text;
begin
  select * into r from public.repayments where id = p_repayment for update;
  if not found then raise exception 'Installment not found.'; end if;
  select * into l from public.loans where id = r.loan_id;
  select * into o from public.loan_offers where id = r.offer_id;
  if l.borrower_id <> auth.uid() then raise exception 'Installment not found.'; end if;
  if r.status <> 'pending' then raise exception 'This installment is already paid.'; end if;
  if exists (select 1 from public.repayments where offer_id = r.offer_id and installment_no < r.installment_no and status = 'pending') then
    raise exception 'Please pay the earlier installments first.';
  end if;
  ref := 'DEMO-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
  update public.repayments set status = 'paid', paid_at = now() where id = p_repayment;
  insert into public.transactions(user_id, kind, ref_id, amount, method, reference) values (auth.uid(), 'repayment', p_repayment, r.amount, left(p_method, 30), ref);
  perform public.notify(o.lender_id, 'repayment', 'Repayment received', 'Installment ' || r.installment_no || ' of ' || r.total_installments || ' (' || r.amount || ') was paid.', '/profile');
  if l.status = 'funded' and not exists (select 1 from public.repayments where loan_id = l.id and status = 'pending') then
    update public.loans set status = 'repaid' where id = l.id;
    perform public.notify(l.borrower_id, 'repayment', 'Loan fully repaid', 'You have repaid this loan in full. Thank you!', '/profile');
  end if;
  return ref;
end $$;

create or replace function public.contribute(p_fund uuid, p_amount numeric, p_method text, p_anon boolean)
returns text language plpgsql security definer set search_path = public as $$
declare f public.fundraisers; ref text;
begin
  if auth.uid() is null then raise exception 'Please log in first.'; end if;
  select * into f from public.fundraisers where id = p_fund for update;
  if not found or f.status <> 'approved' then raise exception 'This fundraiser is not accepting contributions.'; end if;
  if p_amount is null or p_amount < 1 then raise exception 'Minimum contribution is 1.'; end if;
  if p_amount > f.amount_needed - f.amount_raised then raise exception 'Only % is still needed.', f.amount_needed - f.amount_raised; end if;
  ref := 'DEMO-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
  insert into public.fundraiser_contributions(fundraiser_id, contributor_id, amount, is_anonymous) values (p_fund, auth.uid(), p_amount, coalesce(p_anon, false));
  insert into public.transactions(user_id, kind, ref_id, amount, method, reference) values (auth.uid(), 'contribution', p_fund, p_amount, left(p_method, 30), ref);
  update public.fundraisers set amount_raised = amount_raised + p_amount,
         status = case when amount_raised + p_amount >= amount_needed then 'funded' else status end where id = p_fund;
  perform public.notify(f.creator_id, 'contribution', 'New contribution', 'Someone contributed ' || p_amount || ' to "' || f.title || '".', '/fundraisers/' || p_fund);
  return ref;
end $$;

create or replace function public.rate_borrower(p_loan uuid, p_score int, p_review text, p_recommend boolean)
returns void language plpgsql security definer set search_path = public as $$
declare l public.loans;
begin
  select * into l from public.loans where id = p_loan;
  if not found or l.status not in ('funded','repaid') then raise exception 'You can rate a borrower once the loan is funded.'; end if;
  if not exists (select 1 from public.loan_offers where loan_id = p_loan and lender_id = auth.uid() and paid) then
    raise exception 'Only lenders who paid on this loan can rate the borrower.';
  end if;
  if p_score < 1 or p_score > 5 then raise exception 'Score must be 1 to 5.'; end if;
  insert into public.ratings(loan_id, lender_id, borrower_id, score, review, recommend)
  values (p_loan, auth.uid(), l.borrower_id, p_score, left(coalesce(p_review, ''), 1000), coalesce(p_recommend, true))
  on conflict (loan_id, lender_id) do update set score = excluded.score, review = excluded.review, recommend = excluded.recommend;
  perform public.notify(l.borrower_id, 'rating', 'You received a rating', 'A lender rated you ' || p_score || '/5.', '/profile');
end $$;

create or replace function public.request_verification(p_path text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_path is null or split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'Invalid upload.'; end if;
  update public.profiles set verification_doc = p_path, verification_status = 'pending'
   where id = auth.uid() and verification_status in ('unverified','rejected');
  if not found then raise exception 'Verification is already pending or approved.'; end if;
end $$;

create or replace function public.admin_review(p_type text, p_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare new_status text; owner uuid; label text;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  new_status := case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else null end;
  if new_status is null then raise exception 'Unknown action.'; end if;
  if p_type = 'loan' then
    update public.loans set status = new_status where id = p_id and status = 'pending' returning borrower_id into owner;
    label := 'loan request'; if owner is not null then perform public.notify(owner, case when new_status='approved' then 'approval' else 'rejection' end, 'Your ' || label || ' was ' || new_status, null, '/loans/' || p_id); end if;
  elsif p_type = 'fundraiser' then
    update public.fundraisers set status = new_status where id = p_id and status = 'pending' returning creator_id into owner;
    label := 'fundraiser'; if owner is not null then perform public.notify(owner, case when new_status='approved' then 'approval' else 'rejection' end, 'Your ' || label || ' was ' || new_status, null, '/fundraisers/' || p_id); end if;
  else raise exception 'Unknown type.'; end if;
  if owner is null then raise exception 'Nothing to review (already handled?).'; end if;
end $$;

create or replace function public.admin_delete(p_type text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_type = 'loan' then
    if exists (select 1 from public.loan_offers where loan_id = p_id and paid) then raise exception 'Money was already paid on this loan - it cannot be deleted.'; end if;
    delete from public.loans where id = p_id;
  elsif p_type = 'fundraiser' then
    if exists (select 1 from public.fundraisers where id = p_id and amount_raised > 0) then raise exception 'This fundraiser already received contributions - it cannot be deleted.'; end if;
    delete from public.fundraisers where id = p_id;
  else raise exception 'Unknown type.'; end if;
end $$;

create or replace function public.admin_set_verification(p_user uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.profiles set verification_status = case p_action when 'approve' then 'verified' else 'rejected' end
   where id = p_user and verification_status = 'pending';
  if not found then raise exception 'No pending verification for this user.'; end if;
  perform public.notify(p_user, 'verification', case when p_action = 'approve' then 'You are verified' else 'Verification rejected' end,
                        case when p_action = 'approve' then 'Your student ID was approved.' else 'Please upload a clearer document and try again.' end, '/profile');
end $$;

create or replace function public.admin_delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_user = auth.uid() then raise exception 'You cannot delete yourself.'; end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then raise exception 'Admins cannot be deleted here.'; end if;
  if exists (select 1 from public.transactions where user_id = p_user) then raise exception 'This user has payment history and cannot be deleted.'; end if;
  delete from auth.users where id = p_user;
end $$;

create or replace function public.admin_stats() returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return json_build_object(
    'total_users', (select count(*) from public.profiles),
    'verified_users', (select count(*) from public.profiles where verification_status = 'verified'),
    'pending_verifications', (select count(*) from public.profiles where verification_status = 'pending'),
    'total_loans', (select count(*) from public.loans),
    'pending_loans', (select count(*) from public.loans where status = 'pending'),
    'funded_loans', (select count(*) from public.loans where status in ('funded','repaid')),
    'total_fundraisers', (select count(*) from public.fundraisers),
    'pending_funding', (select count(*) from public.fundraisers where status = 'pending'),
    'total_disbursed', (select coalesce(sum(amount),0) from public.loan_offers where paid),
    'total_repaid', (select coalesce(sum(amount),0) from public.repayments where status = 'paid'),
    'total_donated', (select coalesce(sum(amount_raised),0) from public.fundraisers),
    'messages', (select count(*) from public.contact_messages)
  );
end $$;

-- ---------- storage (file uploads) ----------
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false) on conflict (id) do nothing;

drop policy if exists "covers upload own" on storage.objects;
create policy "covers upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "proofs upload own" on storage.objects;
create policy "proofs upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "proofs read own or admin" on storage.objects;
create policy "proofs read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- To make someone an admin AFTER they signed up, run (replace the email):
--   update public.profiles set role = 'admin' where email = 'you@example.com';

-- owners may withdraw their own request while it is still pending (also used to clean up failed uploads)
drop policy if exists loans_delete_own on public.loans;
create policy loans_delete_own on public.loans for delete to authenticated using (borrower_id = auth.uid() and status = 'pending');
drop policy if exists fund_delete_own on public.fundraisers;
create policy fund_delete_own on public.fundraisers for delete to authenticated using (creator_id = auth.uid() and status = 'pending');
