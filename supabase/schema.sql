-- Path reports (see src/data/campusReports.js for the shape).
-- If you ran an earlier version of this file, the old route_reports and
-- route_segment_statuses tables are no longer used and can be dropped.
create table if not exists public.path_reports (
  id uuid primary key,
  path_id text not null,
  type text not null check (type in ('maintenance', 'blocked', 'damaged', 'ramp', 'stairs', 'obstruction', 'other')),
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'resolved', 'expired')),
  reported_at timestamptz not null default now(),
  expires_at timestamptz,
  resolved_at timestamptz,
  reported_by text,
  verification text not null default 'unverified' check (verification in ('unverified', 'verified', 'rejected')),
  confirmations integer not null default 0,
  photos jsonb not null default '[]'::jsonb
);

alter table public.path_reports enable row level security;

drop policy if exists "Anyone can read path reports" on public.path_reports;
create policy "Anyone can read path reports"
  on public.path_reports for select to anon, authenticated using (true);

drop policy if exists "Anyone can add path reports" on public.path_reports;
create policy "Anyone can add path reports"
  on public.path_reports for insert to anon, authenticated with check (true);

-- Prototype only: anyone can mark a report resolved. Restrict this once there are user accounts.
drop policy if exists "Anyone can update path reports" on public.path_reports;
create policy "Anyone can update path reports"
  on public.path_reports for update to anon, authenticated using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'path_reports'
  ) then
    alter publication supabase_realtime add table public.path_reports;
  end if;
end $$;
