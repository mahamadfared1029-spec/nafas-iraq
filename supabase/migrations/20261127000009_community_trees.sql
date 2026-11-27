-- NAFAS Forest ("غابة نَفَس"): 1 Tree Per User on Iraq 3D Terrain Map
create table if not exists public.community_trees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  author_name text not null check (char_length(trim(author_name)) between 1 and 40),
  governorate_id text not null,
  tree_type text not null check (tree_type in ('palm', 'sidr', 'oak', 'orange')),
  message text not null check (char_length(trim(message)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_trees_governorate
  on public.community_trees (governorate_id);

create index if not exists idx_community_trees_created_at
  on public.community_trees (created_at desc);

alter table public.community_trees enable row level security;

-- Everyone can view planted community trees on the 3D map
drop policy if exists "community_trees_public_read" on public.community_trees;
create policy "community_trees_public_read"
  on public.community_trees
  for select
  using (true);

-- Authenticated users can plant their own single tree
drop policy if exists "community_trees_authenticated_insert" on public.community_trees;
create policy "community_trees_authenticated_insert"
  on public.community_trees
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Authenticated users can update only their own tree
drop policy if exists "community_trees_authenticated_update" on public.community_trees;
create policy "community_trees_authenticated_update"
  on public.community_trees
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
