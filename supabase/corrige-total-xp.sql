-- ============================================================
-- ATHENAS — Corrige "column reference "total_xp" is ambiguous"
-- ao concluir aula ou passar no quiz.
-- No UPDATE de user_xp, total_xp batia tanto na coluna quanto na
-- variável da função; agora a coluna vai qualificada.
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- ============================================================

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
      set total_xp = public.user_xp.total_xp + v_xp, updated_at = now()
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

revoke all on function public.complete_lesson(uuid, text) from public;
grant execute on function public.complete_lesson(uuid, text) to authenticated;
