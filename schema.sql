-- СтройМаркет: схема базы данных
-- Вставьте целиком в Supabase -> SQL Editor -> New query -> Run

-- ============ ТАБЛИЦЫ ============

create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  sku          text unique,                 -- артикул / код товара (ключ для обмена с 1С)
  external_id  text unique,                 -- GUID товара из 1С (на будущее)
  name         text not null,
  category     text not null default 'Без категории',
  price        numeric(12,2) not null default 0,
  unit         text not null default 'шт',
  weight_kg    numeric(10,3) not null default 0,   -- вес единицы, для расчёта доставки
  stock        numeric(12,3),                      -- остаток (будет приходить из 1С)
  image_url    text,
  description  text,
  active       boolean not null default true,
  updated_at   timestamptz not null default now()
);

create table if not exists orders (
  id            bigint generated always as identity primary key,
  public_code   text not null,              -- номер заказа, который видит клиент
  created_at    timestamptz not null default now(),
  customer_name text not null,
  phone         text not null,
  comment       text,
  delivery_type text not null,              -- pickup | courier
  address       text,
  distance_km   numeric(8,1),
  pay_method    text not null,              -- card | receipt | invoice
  paid          boolean not null default false,
  items         jsonb not null,
  subtotal      numeric(12,2) not null,
  delivery_cost numeric(12,2) not null default 0,
  total         numeric(12,2) not null,
  status        text not null default 'new',  -- new | confirmed | shipped | done | canceled
  external_id   text                          -- номер документа в 1С (на будущее)
);

create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

-- ============ ПРАВА ДОСТУПА (RLS) ============
-- Клиенты (anon): смотрят каталог и настройки, создают заказ.
-- Администратор (authenticated): всё остальное.

alter table products enable row level security;
alter table orders   enable row level security;
alter table settings enable row level security;

drop policy if exists "products read"   on products;
drop policy if exists "products write"  on products;
drop policy if exists "orders create"   on orders;
drop policy if exists "orders read"     on orders;
drop policy if exists "orders update"   on orders;
drop policy if exists "settings read"   on settings;
drop policy if exists "settings write"  on settings;

create policy "products read" on products
  for select using (active = true or auth.role() = 'authenticated');
create policy "products write" on products
  for all to authenticated using (true) with check (true);

create policy "orders create" on orders
  for insert to anon, authenticated with check (true);
create policy "orders read" on orders
  for select to authenticated using (true);
create policy "orders update" on orders
  for update to authenticated using (true) with check (true);

create policy "settings read" on settings
  for select using (true);
create policy "settings write" on settings
  for all to authenticated using (true) with check (true);

-- ============ ХРАНИЛИЩЕ КАРТИНОК ============

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "images read"   on storage.objects;
drop policy if exists "images write"  on storage.objects;
drop policy if exists "images update" on storage.objects;
drop policy if exists "images delete" on storage.objects;

create policy "images read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "images write" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');
create policy "images update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images');
create policy "images delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');

-- ============ СТАРТОВЫЕ ДАННЫЕ ============

insert into settings (key, value) values ('shop', '{
  "shopName": "СтройМаркет",
  "tagline": "Склад · Доставка · Опт и розница",
  "phone": "[телефон]",
  "email": "",
  "address": "[адрес склада]",
  "hours": "[часы работы]",
  "base": 500, "perKm": 40, "heavyPerTon": 800,
  "freeFrom": 50000, "freeKm": 20, "maxKm": 150
}'::jsonb)
on conflict (key) do nothing;

insert into products (sku, name, category, price, unit, weight_kg, stock) values
  ('DEMO-001', 'Цемент М500, 50 кг',               'Сухие смеси',   480,  'мешок', 50,   200),
  ('DEMO-002', 'Кирпич красный полнотелый',        'Кирпич и блоки', 19,  'шт',    3.6,  5000),
  ('DEMO-003', 'Гипсокартон 12,5 мм, 1200×2500',   'Отделка',       520,  'лист',  29,   120),
  ('DEMO-004', 'Доска обрезная 50×150×6000',       'Пиломатериалы', 1150, 'шт',    32,   80),
  ('DEMO-005', 'Утеплитель минвата 100 мм',        'Утеплители',    1290, 'упак',  6,    60),
  ('DEMO-006', 'Краска фасадная белая, 10 л',      'Лакокраска',    2890, 'ведро', 14,   40),
  ('DEMO-007', 'Саморезы по дереву 4,2×70, 200 шт','Крепёж',        340,  'упак',  1.2,  300),
  ('DEMO-008', 'Песок строительный',               'Сыпучие',       2400, 'тонна', 1000, 25)
on conflict (sku) do nothing;
