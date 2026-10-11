alter table public.stores
  add column if not exists theme_preset text not null default 'simple';

alter table public.stores
  drop constraint if exists stores_theme_preset_check;

alter table public.stores
  add constraint stores_theme_preset_check
  check (theme_preset in ('simple', 'terracotta', 'botanical', 'midnight', 'blush'));
