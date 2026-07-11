-- Ejecutar en el SQL Editor de CADA nuevo proyecto Supabase
-- (Dashboard de Supabase -> SQL Editor -> pegar y correr)

create table if not exists productos (
  id bigint generated always as identity primary key,
  nombre text not null,
  categoria text not null,
  subcategoria text default 'General',
  precio numeric not null,          -- precio en USD
  disponible boolean default true,
  img text,
  descripcion text,
  created_at timestamp with time zone default now()
);

-- Solo necesaria si la tienda usa tasa de cambio (STORE_SHOW_EXCHANGE_RATE=true)
create table if not exists exchange_rates (
  rate_date date primary key,
  rate numeric not null
);

-- Categorías: el admin las crea desde el panel ("+ Nueva categoría").
-- STORE_CATEGORIES del .env solo se usa para poblar esta tabla la primera
-- vez que arranca la tienda, si está vacía.
create table if not exists categorias (
  id text primary key,       -- slug generado del nombre, ej: "alimentos"
  nombre text not null
);

-- Bucket de imágenes: créalo desde Dashboard -> Storage -> New bucket
-- usando el mismo nombre que pongas en SUPABASE_BUCKET del .env.local,
-- marcado como "Public bucket".

-- Row Level Security: por simplicidad estas tablas se acceden con la
-- anon key en modo lectura pública. Si quieres bloquear escritura desde
-- el navegador (recomendado), activa RLS y solo permite SELECT al rol anon.
-- Las políticas se crean solo si no existen ya (útil si estás migrando una
-- tienda que ya tenía RLS configurado, para no chocar con lo que ya existe).

alter table productos enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'productos' and policyname = 'Lectura pública de productos') then
    create policy "Lectura pública de productos" on productos for select using (true);
  end if;
end $$;

alter table exchange_rates enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'exchange_rates' and policyname = 'Lectura pública de tasa') then
    create policy "Lectura pública de tasa" on exchange_rates for select using (true);
  end if;
end $$;

alter table categorias enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'categorias' and policyname = 'Lectura pública de categorias') then
    create policy "Lectura pública de categorias" on categorias for select using (true);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN: si estás pasando una tienda YA EXISTENTE (con productos reales)
-- a esta plantilla, corre también estas líneas. Son seguras de ejecutar
-- aunque las columnas ya existan (no tocan datos, solo agregan lo que falte).
-- ─────────────────────────────────────────────────────────────────────────

-- Si tu tabla productos no tenía "disponible", se agrega con "true" por
-- defecto, así ningún producto existente desaparece de golpe del catálogo.
alter table productos add column if not exists disponible boolean not null default true;
alter table productos add column if not exists subcategoria text default 'General';
alter table productos add column if not exists descripcion text;

-- Crea la tabla categorias a partir de las categorías que YA usan tus
-- productos actuales (en vez de las de STORE_CATEGORIES del .env), para
-- que coincidan exactamente y ningún producto viejo quede "huérfano" de
-- categoría. El nombre queda igual al valor guardado; lo puedes renombrar
-- después desde Supabase si quieres un texto más prolijo.
insert into categorias (id, nombre)
select distinct categoria, categoria from productos
where categoria is not null
on conflict (id) do nothing;

-- Recordatorio: las escrituras (insert/update/delete) del panel admin DEBEN
-- pasar por rutas del backend que usen supabaseService (SUPABASE_SERVICE_ROLE),
-- nunca el cliente `supabase` (anon key). Con RLS activo, un insert/update
-- hecho con la anon key será rechazado por Supabase con un error de política.
