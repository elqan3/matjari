-- Allow authenticated store owners to update order status only.
-- Row-level security policies orders_owner_update_status and orders_owner_select
-- continue to restrict updates to orders belonging to the signed-in user's store.
GRANT UPDATE (status) ON TABLE public.orders TO authenticated;
