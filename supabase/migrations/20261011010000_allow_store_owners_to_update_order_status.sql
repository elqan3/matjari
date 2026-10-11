grant update (status) on table public.orders to authenticated;

drop policy if exists orders_owner_update_status on public.orders;

create policy orders_owner_update_status
on public.orders
for update
to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = orders.store_id
      and s.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.stores s
    where s.id = orders.store_id
      and s.owner_id = (select auth.uid())
  )
);
