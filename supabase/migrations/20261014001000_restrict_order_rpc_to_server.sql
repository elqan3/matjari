-- Keep SECURITY DEFINER order RPCs server-only. The public storefront must go through
-- the server route, which validates the store subscription before creating an order.
revoke execute on function public.create_store_order(text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.create_store_order(text, text, text, text, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.create_store_order(text, text, text, text, text, jsonb) to service_role;
grant execute on function public.create_store_order(text, text, text, text, text, jsonb, uuid) to service_role;
