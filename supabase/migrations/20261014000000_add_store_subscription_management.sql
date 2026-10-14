create table if not exists public.store_subscriptions (
  store_id uuid primary key references public.stores(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial', 'active', 'suspended')),
  plan_code text check (plan_code is null or plan_code in ('basic', 'pro', 'professional')),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  started_at timestamptz,
  ends_at timestamptz,
  admin_note text,
  updated_at timestamptz not null default now(),
  constraint store_subscriptions_active_plan_check
    check (status <> 'active' or plan_code is not null),
  constraint store_subscriptions_dates_check
    check (ends_at is null or started_at is null or ends_at > started_at)
);

create table if not exists public.subscription_plan_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  requested_plan text not null check (requested_plan in ('basic', 'pro', 'professional')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists subscription_plan_requests_one_pending_per_store
  on public.subscription_plan_requests(store_id) where status = 'pending';

create index if not exists store_subscriptions_status_ends_at_idx
  on public.store_subscriptions(status, ends_at);

alter table public.store_subscriptions enable row level security;
alter table public.subscription_plan_requests enable row level security;

revoke all on public.store_subscriptions from anon, authenticated;
grant select on public.store_subscriptions to authenticated;
drop policy if exists "store owners can read their subscription" on public.store_subscriptions;
create policy "store owners can read their subscription"
  on public.store_subscriptions for select to authenticated
  using (exists (
    select 1 from public.stores s
    where s.id = store_subscriptions.store_id
      and s.owner_id = (select auth.uid())
  ));

revoke all on public.subscription_plan_requests from anon, authenticated;
grant select, insert on public.subscription_plan_requests to authenticated;
drop policy if exists "store owners can read their plan requests" on public.subscription_plan_requests;
create policy "store owners can read their plan requests"
  on public.subscription_plan_requests for select to authenticated
  using (exists (
    select 1 from public.stores s
    where s.id = subscription_plan_requests.store_id
      and s.owner_id = (select auth.uid())
  ));
drop policy if exists "store owners can request a plan" on public.subscription_plan_requests;
create policy "store owners can request a plan"
  on public.subscription_plan_requests for insert to authenticated
  with check (
    status = 'pending'
    and reviewed_at is null
    and exists (
      select 1 from public.stores s
      where s.id = subscription_plan_requests.store_id
        and s.owner_id = (select auth.uid())
    )
  );

create or replace function public.initialize_store_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.store_subscriptions (store_id, status, plan_code, trial_ends_at)
  values (new.id, 'trial', null, new.created_at + interval '30 days')
  on conflict (store_id) do nothing;
  return new;
end;
$$;

revoke all on function public.initialize_store_subscription() from public, anon, authenticated;

drop trigger if exists initialize_store_subscription_after_insert on public.stores;
create trigger initialize_store_subscription_after_insert
after insert on public.stores
for each row execute function public.initialize_store_subscription();

insert into public.store_subscriptions (store_id, status, plan_code, trial_ends_at)
select s.id, 'trial', null, s.created_at + interval '30 days'
from public.stores s
on conflict (store_id) do nothing;