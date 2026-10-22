-- Larry Fried Chicken — commandes en ligne (à confirmer par téléphone). Idempotent. Dépend de schema.sql (larryfc.is_admin, site_content).
create table if not exists larryfc.orders (
  id bigint generated always as identity primary key,
  ref text not null check (ref ~ '^[A-Z0-9]{4,8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'en attente d''appel' check (status in ('en attente d''appel','confirmée','annulée')),
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  phone text not null check (phone ~ '^0[1-9][0-9]{8}$'),
  fulfillment text not null check (fulfillment in ('emporter','livraison')),
  address text check (address is null or char_length(address) <= 300),
  slot text not null check (char_length(slot) <= 40),
  note text check (note is null or char_length(note) <= 500),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 40 and octet_length(items::text) <= 16000),
  total_cents integer not null default 0 check (total_cents between 0 and 100000000),
  constraint orders_address_if_delivery check (fulfillment <> 'livraison' or char_length(btrim(coalesce(address,''))) >= 5)
);
create index if not exists orders_created_idx on larryfc.orders (created_at desc);

-- À l'insertion : statut forcé, prix recalculés depuis la carte en ligne (site_content), anti-abus.
create or replace function larryfc.orders_before_insert() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_menu jsonb; v_opts jsonb; v_it jsonb; v_out jsonb := '[]'::jsonb; v_price numeric; v_qty int; v_total numeric := 0; v_ex jsonb; v_exp numeric; v_extras jsonb;
begin
  new.status := 'en attente d''appel'; new.created_at := now(); new.updated_at := now();
  new.phone := regexp_replace(new.phone, '[^0-9]', '', 'g');
  if (select count(*) from larryfc.orders where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Trop de commandes en ce moment, réessayez dans une minute.' using errcode = 'P0001'; end if;
  if (select count(*) from larryfc.orders where phone = new.phone and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Plusieurs commandes déjà envoyées avec ce numéro : merci d''appeler le snack.' using errcode = 'P0001'; end if;
  select data->'menu', coalesce(data->'order_options','{}'::jsonb) into v_menu, v_opts from larryfc.site_content where id = 1;
  for v_it in select * from jsonb_array_elements(new.items) loop
    select nullif(replace(btrim(i->>'price'), ',', '.'), '')::numeric into v_price
      from jsonb_array_elements(v_menu) c, jsonb_array_elements(c->'items') i
      where i->>'name' = v_it->>'name' and coalesce((i->>'hidden')::boolean, false) = false limit 1;
    if not found then raise exception 'Article indisponible : %', v_it->>'name' using errcode = 'P0001'; end if;
    v_qty := greatest(1, least(20, coalesce((v_it->>'qty')::int, 1)));
    v_extras := '[]'::jsonb;
    for v_ex in select * from jsonb_array_elements(coalesce(v_it->'extras','[]'::jsonb)) loop
      select nullif(replace(btrim(e->>'price'), ',', '.'), '')::numeric into v_exp from jsonb_array_elements(coalesce(v_opts->'extras','[]'::jsonb)) e where e->>'name' = v_ex->>'name' limit 1;
      if not found then continue; end if;
      v_price := coalesce(v_price,0) + coalesce(v_exp,0);
      v_extras := v_extras || jsonb_build_object('name', v_ex->>'name', 'price', v_exp);
    end loop;
    v_total := v_total + coalesce(v_price,0) * v_qty;
    v_out := v_out || (v_it || jsonb_build_object('qty', v_qty, 'unit', v_price, 'extras', v_extras));
  end loop;
  new.items := v_out; new.total_cents := round(v_total * 100);
  return new;
end; $$;
drop trigger if exists trg_orders_before_insert on larryfc.orders;
create trigger trg_orders_before_insert before insert on larryfc.orders for each row execute function larryfc.orders_before_insert();

create or replace function larryfc.orders_before_update() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists trg_orders_before_update on larryfc.orders;
create trigger trg_orders_before_update before update on larryfc.orders for each row execute function larryfc.orders_before_update();

alter table larryfc.orders enable row level security;
drop policy if exists "commandes: envoi public" on larryfc.orders;
create policy "commandes: envoi public" on larryfc.orders for insert to anon, authenticated with check (status = 'en attente d''appel');
drop policy if exists "commandes: lecture admin" on larryfc.orders;
create policy "commandes: lecture admin" on larryfc.orders for select to authenticated using (larryfc.is_admin());
drop policy if exists "commandes: statut admin" on larryfc.orders;
create policy "commandes: statut admin" on larryfc.orders for update to authenticated using (larryfc.is_admin()) with check (larryfc.is_admin());

revoke all on larryfc.orders from anon, authenticated;
grant insert (ref, customer_name, phone, fulfillment, address, slot, note, items) on larryfc.orders to anon, authenticated;
grant select on larryfc.orders to authenticated;
grant update (status) on larryfc.orders to authenticated;
