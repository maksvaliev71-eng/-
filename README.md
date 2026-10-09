# СтройМаркет — интернет-магазин стройматериалов

React + Vite, база данных и хранилище фото — Supabase, хостинг — Vercel.

## Демо-режим
Без настройки базы сайт работает в демо-режиме: данные хранятся в браузере,
вход в админку (`#/admin`) — PIN `1234`.

## Подключение базы (Supabase)
1. Создать проект на supabase.com.
2. SQL Editor → вставить `supabase/schema.sql` → Run.
3. Authentication → Users → Add user → создать администратора (почта + пароль).
4. Authentication → Sign In / Providers → отключить «Allow new users to sign up».
5. Project Settings → API → скопировать Project URL и anon public key.
6. В Vercel: Settings → Environment Variables → добавить
   `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` → Redeploy.

## Админка
`#/admin`: товары (фото, цены, остатки), заказы со статусами, тариф доставки, импорт CSV
(образец — `price-example.csv`).

## Под 1С
В таблице `products` уже есть `sku` (артикул/код 1С), `external_id` (GUID), `stock` (остаток);
в `orders` — `external_id` (номер документа в 1С). Обмен подключается позже поверх этих полей.
