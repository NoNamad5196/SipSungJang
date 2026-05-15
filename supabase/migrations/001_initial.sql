-- games 테이블
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text,
  intensity text not null default 'sub'
    check (intensity in ('main', 'sub', 'login-only', 'frozen', 'abandoned')),
  current_goal text
    check (current_goal in ('story', 'gear-farming', 'character-leveling', 'currency-saving', 'event-only', 'rest')),
  weekly_tasks text[] not null default '{}',
  next_goal text,
  urgency text not null default 'medium'
    check (urgency in ('high', 'medium', 'low')),
  last_access date,
  party_memo text,
  memo text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- characters 테이블
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games on delete cascade not null,
  name text not null,
  priority_rank text not null default 'priority1'
    check (priority_rank in ('priority1', 'priority2', 'on-hold', 'favorite', 'bad-investment')),
  notes text,
  created_at timestamptz not null default now()
);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists games_updated_at on public.games;
create trigger games_updated_at
  before update on public.games
  for each row execute function public.set_updated_at();

-- RLS 활성화
alter table public.games enable row level security;
alter table public.characters enable row level security;

-- games RLS 정책
create policy "users can manage own games"
  on public.games for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- characters RLS 정책 (game 소유자 기준)
create policy "users can manage characters of own games"
  on public.characters for all
  using (
    exists (
      select 1 from public.games
      where games.id = characters.game_id
        and games.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.games
      where games.id = characters.game_id
        and games.user_id = auth.uid()
    )
  );
