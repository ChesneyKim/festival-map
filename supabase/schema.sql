-- Apply once to the chosen Supabase project. Demo fixtures must never be imported here.
create schema if not exists private;
create table public.festivals (
 content_id text primary key, start_date date not null, end_date date not null,
 region_code text, latitude double precision, longitude double precision,
 data jsonb not null, source_modified text not null default '', detail_synced_at timestamptz,
 visible boolean not null default true, check(end_date>=start_date)
);
create index festivals_dates on public.festivals(start_date,end_date);
create index festivals_region on public.festivals(region_code,start_date);
create index festivals_coordinates on public.festivals(latitude,longitude);
create table public.regions(code text not null,name text not null,district_code text not null,district_name text not null,primary key(code,district_code));
create table private.sync_runs(id uuid primary key default gen_random_uuid(),started_at timestamptz not null default now(),finished_at timestamptz,status text not null,count integer,error text);
create table private.api_budget(day date primary key,calls integer not null);
alter table private.api_budget enable row level security;
create function public.reserve_tour_call() returns boolean language plpgsql security definer set search_path='' as $$
declare used integer;
begin
 insert into private.api_budget(day,calls) values((now() at time zone 'Asia/Seoul')::date,1)
 on conflict(day) do update set calls=private.api_budget.calls+1 where private.api_budget.calls<800 returning calls into used;
 return used is not null;
end;$$;
revoke all on function public.reserve_tour_call() from public,anon,authenticated;
grant execute on function public.reserve_tour_call() to service_role;
alter table public.festivals enable row level security;
alter table public.regions enable row level security;
alter table private.sync_runs enable row level security;
revoke all on public.festivals,public.regions from anon,authenticated;
grant select on public.festivals,public.regions to anon,authenticated;
grant all on public.festivals,public.regions to service_role;
create policy read_festivals on public.festivals for select to anon,authenticated using(visible);
create policy read_regions on public.regions for select to anon,authenticated using(true);
-- Narrow server-only RPCs access private logs without exposing the private schema.
create function public.begin_festival_sync() returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(918723);
 if exists(select 1 from private.sync_runs where status='running' and started_at>now()-interval '10 minutes') then return null;end if;
 update private.sync_runs set status='failed',finished_at=now(),error='Execution expired' where status='running';
 insert into private.sync_runs(status) values('running') returning id into result;return result;
end;$$;
create function public.commit_festival_sync(run_id uuid, records jsonb,region_records jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(918723);
 if not exists(select 1 from private.sync_runs where id=run_id and status='running') then raise exception 'Invalid sync';end if;
 insert into public.festivals(content_id,start_date,end_date,region_code,latitude,longitude,data,source_modified)
 select x.content_id,x.start_date,x.end_date,x.region_code,x.latitude,x.longitude,x.data,x.source_modified from jsonb_to_recordset(records) as x(content_id text,start_date date,end_date date,region_code text,latitude double precision,longitude double precision,data jsonb,source_modified text)
 on conflict(content_id) do update set start_date=excluded.start_date,end_date=excluded.end_date,region_code=excluded.region_code,latitude=excluded.latitude,longitude=excluded.longitude,data=public.festivals.data||excluded.data,source_modified=excluded.source_modified,detail_synced_at=case when public.festivals.source_modified=excluded.source_modified then public.festivals.detail_synced_at else null end;
 insert into public.regions select * from jsonb_to_recordset(region_records) as x(code text,name text,district_code text,district_name text) on conflict(code,district_code) do update set name=excluded.name,district_name=excluded.district_name;
 update private.sync_runs set status='success',finished_at=now(),count=jsonb_array_length(records) where id=run_id;
end;$$;
create function public.fail_festival_sync(run_id uuid) returns void language sql security definer set search_path='' as $$update private.sync_runs set status='failed',finished_at=now(),error='Upstream or storage failure' where id=run_id and status='running';$$;
revoke all on function public.begin_festival_sync(),public.commit_festival_sync(uuid,jsonb,jsonb),public.fail_festival_sync(uuid) from public,anon,authenticated;
grant execute on function public.begin_festival_sync(),public.commit_festival_sync(uuid,jsonb,jsonb),public.fail_festival_sync(uuid) to service_role;
