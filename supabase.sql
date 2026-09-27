-- ============================================================
-- CHANGE UK WEBSITE DATABASE - V3
-- GitHub Pages + Supabase
-- Legacy-safe / rerunnable
-- Adds a working Member Hub: announcements, events + RSVPs,
-- policy briefings, resources and private member feedback.
-- ============================================================

create extension if not exists pgcrypto;

-- -----------------------------
-- EXISTING CORE TABLES
-- -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  dob date,
  membership_type text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists dob date;
alter table public.profiles add column if not exists membership_type text;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

create table if not exists public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  membership_type text not null,
  status text not null default 'active',
  joined_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text,
  summary text,
  detail text,
  quiz_question text,
  quiz_position int default 3,
  sort_order int not null default 0,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.policies add column if not exists slug text;
alter table public.policies add column if not exists category text;
alter table public.policies add column if not exists summary text;
alter table public.policies add column if not exists detail text;
alter table public.policies add column if not exists quiz_question text;
alter table public.policies add column if not exists quiz_position int default 3;
alter table public.policies add column if not exists sort_order int not null default 0;
alter table public.policies add column if not exists published boolean not null default false;
alter table public.policies add column if not exists updated_at timestamptz not null default now();
update public.policies set slug=trim(both '-' from regexp_replace(lower(coalesce(title,'policy')||'-'||left(id::text,8)),'[^a-z0-9]+','-','g')) where slug is null or btrim(slug)='';
alter table public.policies alter column slug set not null;
create unique index if not exists policies_slug_unique_idx on public.policies(slug);
alter table public.policies drop constraint if exists policies_quiz_position_check;
alter table public.policies add constraint policies_quiz_position_check check (quiz_position between 1 and 5);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  published boolean not null default false,
  published_at timestamptz default now()
);

-- -----------------------------
-- V3 MEMBER HUB TABLES
-- -----------------------------
create table if not exists public.member_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all','adult','youth')),
  pinned boolean not null default false,
  published boolean not null default false,
  published_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  event_type text,
  audience text not null default 'all' check (audience in ('all','adult','youth')),
  member_only boolean not null default true,
  published boolean not null default false,
  capacity int,
  created_at timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'going' check (status in ('going','not_going')),
  created_at timestamptz not null default now(),
  primary key(event_id,user_id)
);

create table if not exists public.policy_briefings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  topic text,
  summary text,
  body text not null,
  audience text not null default 'all' check (audience in ('all','adult','youth')),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.member_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text,
  resource_type text,
  audience text not null default 'all' check (audience in ('all','adult','youth')),
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.member_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'received' check (status in ('received','reviewed','closed')),
  created_at timestamptz not null default now()
);

-- -----------------------------
-- STARTER DATA
-- -----------------------------
insert into public.site_settings(key,value) values
 ('stats','{"mps":0,"councillors":0,"councils":0}'::jsonb),
 ('hero_notice','{"text":"A different kind of political website."}'::jsonb)
on conflict (key) do nothing;

insert into public.policies(slug,title,category,summary,detail,quiz_question,quiz_position,sort_order,published) values
 ('cost-of-living','Cost of Living','Economy','Reduce pressure on household costs through targeted affordability measures.','A policy area focused on household costs, affordability and everyday living expenses.','Government should take further targeted action to reduce household living costs.',5,1,true),
 ('bus-fares','Bus Fares','Transport','Lower and simplify local bus fares, with a focus on reliable everyday travel.','A transport policy focused on fare affordability and access to local bus services.','Local bus fares should be reduced and made simpler.',5,2,true),
 ('university-tuition-18-21','University Tuition 18–21','Education','Remove university tuition fees for eligible learners aged 18–21.','An education policy proposing no university tuition fees for eligible students aged 18 to 21.','Eligible students aged 18–21 should not pay university tuition fees.',5,3,true),
 ('managed-immigration','Managed Immigration','Immigration','Reduce the pace of immigration while maintaining managed legal routes.','An immigration policy focused on reducing overall pace while retaining managed legal routes.','The overall pace of immigration should be reduced.',5,4,true)
on conflict (slug) do update set title=excluded.title,category=excluded.category,summary=excluded.summary,detail=excluded.detail,quiz_question=excluded.quiz_question,quiz_position=excluded.quiz_position,sort_order=excluded.sort_order,published=excluded.published,updated_at=now();

insert into public.member_announcements(title,body,audience,pinned,published)
select 'Welcome to the Member Hub','This private area is where member announcements, events, policy briefings and resources will appear.','all',true,true
where not exists (select 1 from public.member_announcements where title='Welcome to the Member Hub');

insert into public.policy_briefings(title,topic,summary,body,audience,published)
select 'How policy briefings work','Member information','A short guide to the new member-only briefing area.','Policy briefings can be published by administrators from the Control Room. They can contain longer notes, background information and explanations connected with policy areas on the public website.','all',true
where not exists (select 1 from public.policy_briefings where title='How policy briefings work');

-- -----------------------------
-- SECURITY HELPERS
-- -----------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select is_admin from public.profiles where id=auth.uid()),false)
$$;

create or replace function public.has_active_membership()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.memberships m where m.user_id=auth.uid() and m.status='active')
$$;

create or replace function public.can_view_member_audience(requested text)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or (
    public.has_active_membership() and (
      requested='all' or requested=coalesce(
        (select p.membership_type from public.profiles p where p.id=auth.uid()),
        (select m.membership_type from public.memberships m where m.user_id=auth.uid())
      )
    )
  )
$$;

-- -----------------------------
-- RLS
-- -----------------------------
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.site_settings enable row level security;
alter table public.policies enable row level security;
alter table public.news enable row level security;
alter table public.member_announcements enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.policy_briefings enable row level security;
alter table public.member_resources enable row level security;
alter table public.member_feedback enable row level security;

-- core policies
drop policy if exists "Public read settings" on public.site_settings;
drop policy if exists "Public read published policies" on public.policies;
drop policy if exists "Public read published news" on public.news;
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Users read own membership" on public.memberships;
drop policy if exists "Users insert own membership" on public.memberships;
drop policy if exists "Users update own membership" on public.memberships;
drop policy if exists "Admin manage settings" on public.site_settings;
drop policy if exists "Admin manage policies" on public.policies;
drop policy if exists "Admin manage news" on public.news;

create policy "Public read settings" on public.site_settings for select using (true);
create policy "Public read published policies" on public.policies for select using (published=true or public.is_admin());
create policy "Public read published news" on public.news for select using (published=true or public.is_admin());
create policy "Users read own profile" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "Users insert own profile" on public.profiles for insert with check (id=auth.uid());
create policy "Users update own profile" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());
create policy "Users read own membership" on public.memberships for select using (user_id=auth.uid() or public.is_admin());
create policy "Users insert own membership" on public.memberships for insert with check (user_id=auth.uid());
create policy "Users update own membership" on public.memberships for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "Admin manage settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin manage policies" on public.policies for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin manage news" on public.news for all using (public.is_admin()) with check (public.is_admin());

-- member hub policies
drop policy if exists "Members read announcements" on public.member_announcements;
drop policy if exists "Admin manage announcements" on public.member_announcements;
drop policy if exists "Read visible events" on public.events;
drop policy if exists "Admin manage events" on public.events;
drop policy if exists "Users manage own RSVP" on public.event_rsvps;
drop policy if exists "Admin read all RSVPs" on public.event_rsvps;
drop policy if exists "Members read briefings" on public.policy_briefings;
drop policy if exists "Admin manage briefings" on public.policy_briefings;
drop policy if exists "Members read resources" on public.member_resources;
drop policy if exists "Admin manage resources" on public.member_resources;
drop policy if exists "Users insert own feedback" on public.member_feedback;
drop policy if exists "Users read own feedback" on public.member_feedback;
drop policy if exists "Admin manage feedback" on public.member_feedback;

create policy "Members read announcements" on public.member_announcements for select using (published=true and public.can_view_member_audience(audience));
create policy "Admin manage announcements" on public.member_announcements for all using (public.is_admin()) with check (public.is_admin());

create policy "Read visible events" on public.events for select using (
  public.is_admin() or (published=true and ((member_only=false) or public.can_view_member_audience(audience)))
);
create policy "Admin manage events" on public.events for all using (public.is_admin()) with check (public.is_admin());

create policy "Users manage own RSVP" on public.event_rsvps for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "Admin read all RSVPs" on public.event_rsvps for select using (public.is_admin());

create policy "Members read briefings" on public.policy_briefings for select using (published=true and public.can_view_member_audience(audience));
create policy "Admin manage briefings" on public.policy_briefings for all using (public.is_admin()) with check (public.is_admin());

create policy "Members read resources" on public.member_resources for select using (published=true and public.can_view_member_audience(audience));
create policy "Admin manage resources" on public.member_resources for all using (public.is_admin()) with check (public.is_admin());

create policy "Users insert own feedback" on public.member_feedback for insert with check (user_id=auth.uid() and public.has_active_membership());
create policy "Users read own feedback" on public.member_feedback for select using (user_id=auth.uid() or public.is_admin());
create policy "Admin manage feedback" on public.member_feedback for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------
-- AUTH PROFILE CREATION
-- -----------------------------
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,first_name,last_name,dob,membership_type)
  values(new.id,new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'last_name',nullif(new.raw_user_meta_data->>'dob','')::date,new.raw_user_meta_data->>'membership_type')
  on conflict(id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- IMPORTANT: This file intentionally does not auto-promote any email to admin.
-- Keep admin promotion as a separate project-owner action.
