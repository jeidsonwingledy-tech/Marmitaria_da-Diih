-- Habilitar a extensão uuid-ossp se ainda não estiver habilitada
create extension if not exists "uuid-ossp";

-- Tabela de Categorias
create table if not exists categories (
  id text primary key default uuid_generate_v4(),
  name text not null,
  active boolean default true
);

-- Tabela de Itens do Menu
create table if not exists "menuItems" (
  id text primary key default uuid_generate_v4(),
  "categoryId" text references categories(id),
  name text not null,
  description text,
  price numeric,
  images text[],
  "optionGroups" jsonb,
  available boolean default true
);

-- Tabela de Configurações (Singleton - ID fixo 'info')
create table if not exists settings (
  id text primary key,
  name text,
  phone text,
  "whatsappNumber" text,
  address text,
  logo text,
  banner text,
  "instagramUrl" text,
  "facebookUrl" text,
  "adminPassword" text,
  "pixKey" text,
  "pixKeyType" text,
  "pixName" text,
  "pixCity" text,
  "businessHours" text,
  delivery jsonb,
  style jsonb,
  notice jsonb
);

-- Tabela de Pedidos
create table if not exists orders (
  id text primary key default uuid_generate_v4(),
  "customerName" text,
  items jsonb,
  total numeric,
  status text,
  "createdAt" timestamptz default now(),
  "paymentMethod" text,
  address text,
  neighborhood text,
  number text,
  "changeFor" text,
  notes text,
  "needCutlery" text,
  "deliveryFee" numeric
);

-- Habilitar Realtime para todas as tabelas
alter publication supabase_realtime add table categories, "menuItems", settings, orders;

-- Políticas de Segurança (RLS) - Opcional para começar (Permitir tudo)
-- Para produção, você deve restringir isso.
alter table categories enable row level security;
create policy "Public Access Categories" on categories for all using (true);

alter table "menuItems" enable row level security;
create policy "Public Access MenuItems" on "menuItems" for all using (true);

alter table settings enable row level security;
create policy "Public Access Settings" on settings for all using (true);

alter table orders enable row level security;
create policy "Public Access Orders" on orders for all using (true);
