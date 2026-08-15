-- Trilha + XP + sequência + moeda + congelador
-- Rode no Supabase: SQL Editor → New query → Run
--
-- Mapeamento (nomes do spec → tabelas):
--   progresso_usuario_aula → lesson_progress (já existia)
--   xp_usuario             → user_xp + xp_events
--   sequencia_usuario      → user_streaks + user_streak_days
--   moedas_usuario         → user_coins
--   transacoes_moeda       → coin_transactions
--
-- Economia:
--   lição = 10 XP, quiz = 15 XP, simulado = 30 XP
--   1 XP = 1 moeda
--   congelador = 200 moedas (perdoa 1 dia perdido)

-- ========== Tipo e XP da aula ==========
alter table public.lessons
  add column if not exists content_type text;

update public.lessons
  set content_type = 'lesson'
  where content_type is null;

alter table public.lessons
  alter column content_type set default 'lesson';

alter table public.lessons
  alter column content_type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lessons_content_type_check'
  ) then
    alter table public.lessons
      add constraint lessons_content_type_check
      check (content_type in ('lesson', 'quiz', 'simulado'));
  end if;
end $$;

alter table public.lessons
  add column if not exists xp_reward int;

update public.lessons
  set xp_reward = case content_type
    when 'quiz' then 15
    when 'simulado' then 30
    else 10
  end
  where xp_reward is null;

alter table public.lessons
  alter column xp_reward set default 10;

alter table public.lessons
  alter column xp_reward set not null;

create or replace function public.sync_lesson_xp()
returns trigger
language plpgsql
as $$
begin
  new.xp_reward := case new.content_type
    when 'quiz' then 15
    when 'simulado' then 30
    else 10
  end;
  return new;
end;
$$;

drop trigger if exists lessons_sync_xp on public.lessons;
create trigger lessons_sync_xp
  before insert or update of content_type
  on public.lessons
  for each row execute function public.sync_lesson_xp();

-- ========== XP ==========
create table if not exists public.user_xp (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  total_xp int not null default 0 check (total_xp >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount > 0),
  reason text not null,
  lesson_id uuid references public.lessons (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ========== Sequência ==========
create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  timezone text not null default 'America/Sao_Paulo',
  freeze_count int not null default 0 check (freeze_count >= 0),
  broken_from int not null default 0 check (broken_from >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_streak_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  primary key (user_id, activity_date)
);

-- ========== Moeda ==========
create table if not exists public.user_coins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('earn', 'spend')),
  amount int not null check (amount > 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists xp_events_user_idx on public.xp_events (user_id, created_at desc);
create index if not exists coin_tx_user_idx on public.coin_transactions (user_id, created_at desc);
create index if not exists streak_days_user_idx on public.user_streak_days (user_id, activity_date desc);
create index if not exists lesson_progress_user_completed_idx
  on public.lesson_progress (user_id, completed)
  where completed = true;

alter table public.user_xp enable row level security;
alter table public.xp_events enable row level security;
alter table public.user_streaks enable row level security;
alter table public.user_streak_days enable row level security;
alter table public.user_coins enable row level security;
alter table public.coin_transactions enable row level security;

drop policy if exists "Usuário vê próprio XP" on public.user_xp;
create policy "Usuário vê próprio XP"
  on public.user_xp for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Usuário vê próprios eventos de XP" on public.xp_events;
create policy "Usuário vê próprios eventos de XP"
  on public.xp_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Usuário vê própria sequência" on public.user_streaks;
create policy "Usuário vê própria sequência"
  on public.user_streaks for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Usuário vê próprios dias de sequência" on public.user_streak_days;
create policy "Usuário vê próprios dias de sequência"
  on public.user_streak_days for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Usuário vê próprias moedas" on public.user_coins;
create policy "Usuário vê próprias moedas"
  on public.user_coins for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Usuário vê próprias transações de moeda" on public.coin_transactions;
create policy "Usuário vê próprias transações de moeda"
  on public.coin_transactions for select to authenticated
  using (user_id = auth.uid());

-- ========== Helpers ==========
create or replace function public.local_today(p_tz text)
returns date
language plpgsql
stable
as $$
declare
  tz text;
begin
  tz := coalesce(nullif(btrim(p_tz), ''), 'America/Sao_Paulo');
  begin
    return (timezone(tz, now()))::date;
  exception when others then
    return (timezone('America/Sao_Paulo', now()))::date;
  end;
end;
$$;

create or replace function public.ensure_gamification(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_xp (user_id) values (p_user_id) on conflict (user_id) do nothing;
  insert into public.user_streaks (user_id) values (p_user_id) on conflict (user_id) do nothing;
  insert into public.user_coins (user_id) values (p_user_id) on conflict (user_id) do nothing;
end;
$$;

create or replace function public.init_gamification_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_gamification(new.id);
  return new;
end;
$$;

drop trigger if exists on_profile_gamification on public.profiles;
create trigger on_profile_gamification
  after insert on public.profiles
  for each row execute function public.init_gamification_for_profile();

insert into public.user_xp (user_id)
  select id from public.profiles
  on conflict (user_id) do nothing;
insert into public.user_streaks (user_id)
  select id from public.profiles
  on conflict (user_id) do nothing;
insert into public.user_coins (user_id)
  select id from public.profiles
  on conflict (user_id) do nothing;

-- Avalia a sequência no fuso do usuário.
-- Congelador perdoa exatamente 1 dia perdido.
-- p_count_today = true quando uma aula está sendo concluída agora.
create or replace function public.apply_streak(
  p_user_id uuid,
  p_tz text,
  p_count_today boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date;
  yesterday date;
  rec public.user_streaks%rowtype;
  gap int;
  freeze_used boolean := false;
  streak_broken boolean := false;
  tz text;
begin
  tz := coalesce(nullif(btrim(p_tz), ''), 'America/Sao_Paulo');
  today := public.local_today(tz);
  yesterday := today - 1;

  perform public.ensure_gamification(p_user_id);

  select * into rec
  from public.user_streaks
  where user_id = p_user_id
  for update;

  rec.timezone := tz;

  if rec.last_activity_date is null then
    if p_count_today then
      rec.current_streak := 1;
      rec.longest_streak := greatest(rec.longest_streak, 1);
      rec.last_activity_date := today;
      insert into public.user_streak_days (user_id, activity_date)
        values (p_user_id, today)
        on conflict do nothing;
    end if;

  elsif rec.last_activity_date = today then
    null;

  elsif rec.last_activity_date = yesterday then
    if p_count_today then
      rec.current_streak := rec.current_streak + 1;
      rec.longest_streak := greatest(rec.longest_streak, rec.current_streak);
      rec.last_activity_date := today;
      insert into public.user_streak_days (user_id, activity_date)
        values (p_user_id, today)
        on conflict do nothing;
    end if;

  else
    gap := (today - rec.last_activity_date) - 1;

    if gap = 1 and rec.freeze_count > 0 then
      rec.freeze_count := rec.freeze_count - 1;
      freeze_used := true;
      insert into public.user_streak_days (user_id, activity_date)
        values (p_user_id, yesterday)
        on conflict do nothing;

      if p_count_today then
        rec.current_streak := rec.current_streak + 1;
        rec.longest_streak := greatest(rec.longest_streak, rec.current_streak);
        rec.last_activity_date := today;
        insert into public.user_streak_days (user_id, activity_date)
          values (p_user_id, today)
          on conflict do nothing;
      else
        rec.last_activity_date := yesterday;
      end if;
    else
      streak_broken := rec.current_streak > 1;
      rec.broken_from := case when streak_broken then rec.current_streak else rec.broken_from end;

      if p_count_today then
        rec.current_streak := 1;
        rec.longest_streak := greatest(rec.longest_streak, 1);
        rec.last_activity_date := today;
        insert into public.user_streak_days (user_id, activity_date)
          values (p_user_id, today)
          on conflict do nothing;
      else
        rec.current_streak := 0;
      end if;
    end if;
  end if;

  update public.user_streaks set
    current_streak = rec.current_streak,
    longest_streak = rec.longest_streak,
    last_activity_date = rec.last_activity_date,
    freeze_count = rec.freeze_count,
    broken_from = rec.broken_from,
    timezone = tz,
    updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'current_streak', rec.current_streak,
    'longest_streak', rec.longest_streak,
    'freeze_count', rec.freeze_count,
    'freeze_used', freeze_used,
    'streak_broken', streak_broken,
    'broken_from', rec.broken_from,
    'last_activity_date', rec.last_activity_date
  );
end;
$$;

-- Cruza aulas do curso com progresso do usuário logado
create or replace function public.get_course_trail(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and (
        c.published = true
        or c.instructor_id = uid
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.user_id = uid
        )
      )
  ) then
    raise exception 'course not found';
  end if;

  select jsonb_build_object(
    'course_id', p_course_id,
    'lessons', coalesce((
      select jsonb_agg(row_to_json(x) order by x.sort_order)
      from (
        select
          l.id,
          l.title,
          l.description,
          l.sort_order,
          l.content_type,
          l.xp_reward,
          l.is_preview,
          l.duration_minutes,
          coalesce(p.completed, false) as completed,
          p.completed_at
        from public.lessons l
        left join public.lesson_progress p
          on p.lesson_id = l.id and p.user_id = uid
        where l.course_id = p_course_id
      ) x
    ), '[]'::jsonb),
    'completed_count', (
      select count(*)::int
      from public.lessons l
      join public.lesson_progress p on p.lesson_id = l.id
      where l.course_id = p_course_id
        and p.user_id = uid
        and p.completed = true
    ),
    'total_lessons', (
      select count(*)::int from public.lessons where course_id = p_course_id
    )
  ) into result;

  return result;
end;
$$;

-- Marca aula concluída, soma XP/moeda e atualiza sequência (idempotente)
create or replace function public.complete_lesson(
  p_lesson_id uuid,
  p_timezone text default 'America/Sao_Paulo'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_lesson_id uuid;
  v_course_id uuid;
  v_title text;
  v_content_type text;
  v_xp int;
  v_preview boolean;
  v_instructor uuid;
  already boolean := false;
  streak jsonb;
  next_id uuid;
  next_title text;
  completed_count int;
  total_lessons int;
  coins_balance int;
  total_xp int;
  cur_streak int;
  long_streak int;
  freeze_n int;
  broken_n int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(842015, hashtext(uid::text));
  perform public.ensure_gamification(uid);

  select l.id, l.course_id, l.title, l.content_type, l.xp_reward, l.is_preview, c.instructor_id
    into v_lesson_id, v_course_id, v_title, v_content_type, v_xp, v_preview, v_instructor
  from public.lessons l
  join public.courses c on c.id = l.course_id
  where l.id = p_lesson_id;

  if v_lesson_id is null then
    raise exception 'lesson not found';
  end if;

  if v_instructor is distinct from uid
     and not v_preview
     and not exists (
       select 1 from public.enrollments e
       where e.user_id = uid and e.course_id = v_course_id
     ) then
    raise exception 'not enrolled';
  end if;

  select coalesce(p.completed, false) into already
  from public.lesson_progress p
  where p.user_id = uid and p.lesson_id = p_lesson_id
  for update;

  already := coalesce(already, false);

  select count(*)::int into total_lessons
  from public.lessons where course_id = v_course_id;

  select l.id, l.title into next_id, next_title
  from public.lessons l
  where l.course_id = v_course_id
    and l.sort_order > (select sort_order from public.lessons where id = p_lesson_id)
  order by l.sort_order
  limit 1;

  if already then
    select count(*)::int into completed_count
    from public.lessons l
    join public.lesson_progress p on p.lesson_id = l.id
    where l.course_id = v_course_id and p.user_id = uid and p.completed;

    select x.total_xp, c.balance, s.current_streak, s.longest_streak, s.freeze_count, s.broken_from
      into total_xp, coins_balance, cur_streak, long_streak, freeze_n, broken_n
    from public.user_xp x
    join public.user_coins c on c.user_id = x.user_id
    join public.user_streaks s on s.user_id = x.user_id
    where x.user_id = uid;

    return jsonb_build_object(
      'ok', true,
      'already_completed', true,
      'lesson_id', v_lesson_id,
      'lesson_title', v_title,
      'content_type', v_content_type,
      'xp_awarded', 0,
      'coins_awarded', 0,
      'total_xp', total_xp,
      'coin_balance', coins_balance,
      'current_streak', cur_streak,
      'longest_streak', long_streak,
      'freeze_count', freeze_n,
      'freeze_used', false,
      'streak_broken', false,
      'broken_from', broken_n,
      'course_id', v_course_id,
      'completed_count', completed_count,
      'total_lessons', total_lessons,
      'next_lesson_id', next_id,
      'next_lesson_title', next_title
    );
  end if;

  insert into public.lesson_progress (user_id, lesson_id, completed, completed_at)
  values (uid, p_lesson_id, true, now())
  on conflict (user_id, lesson_id) do update
    set completed = true,
        completed_at = coalesce(public.lesson_progress.completed_at, now());

  v_xp := greatest(coalesce(v_xp, 10), 0);

  if v_xp > 0 then
    update public.user_xp
      set total_xp = total_xp + v_xp, updated_at = now()
      where user_id = uid;

    insert into public.xp_events (user_id, amount, reason, lesson_id)
    values (uid, v_xp, 'aula concluída', p_lesson_id);

    update public.user_coins
      set balance = balance + v_xp, updated_at = now()
      where user_id = uid;

    insert into public.coin_transactions (user_id, kind, amount, reason)
    values (uid, 'earn', v_xp, 'aula concluída');
  end if;

  streak := public.apply_streak(uid, p_timezone, true);

  select count(*)::int into completed_count
  from public.lessons l
  join public.lesson_progress p on p.lesson_id = l.id
  where l.course_id = v_course_id and p.user_id = uid and p.completed;

  select x.total_xp, c.balance
    into total_xp, coins_balance
  from public.user_xp x
  join public.user_coins c on c.user_id = x.user_id
  where x.user_id = uid;

  return jsonb_build_object(
    'ok', true,
    'already_completed', false,
    'lesson_id', v_lesson_id,
    'lesson_title', v_title,
    'content_type', v_content_type,
    'xp_awarded', v_xp,
    'coins_awarded', v_xp,
    'total_xp', total_xp,
    'coin_balance', coins_balance,
    'current_streak', (streak->>'current_streak')::int,
    'longest_streak', (streak->>'longest_streak')::int,
    'freeze_count', (streak->>'freeze_count')::int,
    'freeze_used', (streak->>'freeze_used')::boolean,
    'streak_broken', (streak->>'streak_broken')::boolean,
    'broken_from', (streak->>'broken_from')::int,
    'course_id', v_course_id,
    'completed_count', completed_count,
    'total_lessons', total_lessons,
    'next_lesson_id', next_id,
    'next_lesson_title', next_title
  );
end;
$$;

create or replace function public.get_gamification_status(
  p_timezone text default 'America/Sao_Paulo'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  streak jsonb;
  total_xp int;
  coins_balance int;
  days jsonb;
  today date;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(842015, hashtext(uid::text));
  perform public.ensure_gamification(uid);

  streak := public.apply_streak(uid, p_timezone, false);
  today := public.local_today(p_timezone);

  select x.total_xp, c.balance
    into total_xp, coins_balance
  from public.user_xp x
  join public.user_coins c on c.user_id = x.user_id
  where x.user_id = uid;

  select coalesce(jsonb_agg(to_char(activity_date, 'YYYY-MM-DD') order by activity_date), '[]'::jsonb)
    into days
  from public.user_streak_days
  where user_id = uid
    and activity_date >= (date_trunc('month', today::timestamp) - interval '14 days')::date;

  return jsonb_build_object(
    'total_xp', total_xp,
    'coin_balance', coins_balance,
    'current_streak', (streak->>'current_streak')::int,
    'longest_streak', (streak->>'longest_streak')::int,
    'freeze_count', (streak->>'freeze_count')::int,
    'freeze_used', (streak->>'freeze_used')::boolean,
    'streak_broken', (streak->>'streak_broken')::boolean,
    'broken_from', (streak->>'broken_from')::int,
    'last_activity_date', streak->>'last_activity_date',
    'activity_dates', days,
    'freeze_cost', 200,
    'today', today
  );
end;
$$;

create or replace function public.buy_streak_freeze()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cost int := 200;
  bal int;
  freezes int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(842015, hashtext(uid::text));
  perform public.ensure_gamification(uid);

  select balance into bal from public.user_coins where user_id = uid for update;
  select freeze_count into freezes from public.user_streaks where user_id = uid for update;

  if bal < cost then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_coins',
      'coin_balance', bal,
      'freeze_count', freezes,
      'freeze_cost', cost
    );
  end if;

  update public.user_coins
    set balance = balance - cost, updated_at = now()
    where user_id = uid;

  insert into public.coin_transactions (user_id, kind, amount, reason)
  values (uid, 'spend', cost, 'compra de congelador');

  update public.user_streaks
    set freeze_count = freeze_count + 1, updated_at = now()
    where user_id = uid;

  select c.balance, s.freeze_count into bal, freezes
  from public.user_coins c
  join public.user_streaks s on s.user_id = c.user_id
  where c.user_id = uid;

  return jsonb_build_object(
    'ok', true,
    'coin_balance', bal,
    'freeze_count', freezes,
    'freeze_cost', cost
  );
end;
$$;

create or replace function public.ack_broken_streak()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.user_streaks
    set broken_from = 0, updated_at = now()
    where user_id = auth.uid();
end;
$$;

revoke all on function public.local_today(text) from public;
revoke all on function public.ensure_gamification(uuid) from public;
revoke all on function public.apply_streak(uuid, text, boolean) from public;
revoke all on function public.get_course_trail(uuid) from public;
revoke all on function public.complete_lesson(uuid, text) from public;
revoke all on function public.get_gamification_status(text) from public;
revoke all on function public.buy_streak_freeze() from public;
revoke all on function public.ack_broken_streak() from public;

grant execute on function public.get_course_trail(uuid) to authenticated;
grant execute on function public.complete_lesson(uuid, text) to authenticated;
grant execute on function public.get_gamification_status(text) to authenticated;
grant execute on function public.buy_streak_freeze() to authenticated;
grant execute on function public.ack_broken_streak() to authenticated;
