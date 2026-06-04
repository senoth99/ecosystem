-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drops
create table if not exists drops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null default 'collection' check (type in ('single', 'collection')),
  drop_date timestamptz,
  status text not null default 'ideation' check (status in ('ideation', 'development', 'finalization', 'dropped')),
  created_at timestamptz default now()
);

-- Items (positions within a drop)
create table if not exists items (
  id uuid primary key default uuid_generate_v4(),
  drop_id uuid references drops(id) on delete cascade not null,
  name text not null,
  stage text not null default 'ideation' check (stage in ('ideation', 'development', 'finalization')),
  created_at timestamptz default now()
);

-- Moments (text fields per stage)
create table if not exists moments (
  id uuid primary key default uuid_generate_v4(),
  scope_id uuid not null,
  stage text not null,
  key text not null,
  value text default '',
  updated_at timestamptz default now(),
  unique(scope_id, stage, key)
);

-- Tasks
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  scope text not null check (scope in ('drop', 'item')),
  scope_id uuid not null,
  stage text not null,
  title text not null,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists items_drop_id_idx on items(drop_id);
create index if not exists tasks_scope_id_idx on tasks(scope_id);
create index if not exists moments_scope_id_idx on moments(scope_id);

-- RLS
alter table drops enable row level security;
alter table items enable row level security;
alter table moments enable row level security;
alter table tasks enable row level security;

-- Allow all with anon key (password auth handled in frontend)
create policy "allow_all_drops" on drops for all using (true) with check (true);
create policy "allow_all_items" on items for all using (true) with check (true);
create policy "allow_all_moments" on moments for all using (true) with check (true);
create policy "allow_all_tasks" on tasks for all using (true) with check (true);
