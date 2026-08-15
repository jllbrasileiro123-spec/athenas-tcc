-- Coluna de revisão (corrige o erro do schema cache) + perguntas de quiz
-- Rode no Supabase: SQL Editor → New query → Run
-- Depois: Settings → API → Reload schema (se o erro continuar)

-- ========== review_status em courses ==========
alter table public.courses
  add column if not exists review_status text;

update public.courses
  set review_status = 'draft'
  where review_status is null;

alter table public.courses
  alter column review_status set default 'draft';

alter table public.courses
  alter column review_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_review_status_check'
  ) then
    alter table public.courses
      add constraint courses_review_status_check
      check (review_status in ('draft', 'pending_review', 'approved', 'rejected'));
  end if;
end $$;

alter table public.courses
  add column if not exists review_note text;

-- ========== Perguntas do quiz ==========
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  prompt text not null,
  choices jsonb not null,
  correct_index int not null check (correct_index >= 0 and correct_index <= 3),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quiz_questions_lesson_idx
  on public.quiz_questions (lesson_id, sort_order);

alter table public.quiz_questions enable row level security;

drop policy if exists "Instrutor gerencia perguntas do quiz" on public.quiz_questions;
create policy "Instrutor gerencia perguntas do quiz"
  on public.quiz_questions for all to authenticated
  using (
    exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = quiz_questions.lesson_id
        and c.instructor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = quiz_questions.lesson_id
        and c.instructor_id = auth.uid()
    )
  );

-- Aluno não lê correct_index direto. Usa as funções abaixo.

create or replace function public.can_access_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = p_lesson_id
      and (
        c.instructor_id = auth.uid()
        or l.is_preview = true
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.get_quiz(p_lesson_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_access_lesson(p_lesson_id) then
    raise exception 'not enrolled';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', q.id,
      'prompt', q.prompt,
      'choices', q.choices,
      'sort_order', q.sort_order
    ) order by q.sort_order)
    from public.quiz_questions q
    where q.lesson_id = p_lesson_id
  ), '[]'::jsonb);
end;
$$;

-- Aprovado com 70% ou mais. Se passar, chama complete_lesson.
create or replace function public.submit_quiz(
  p_lesson_id uuid,
  p_answers jsonb,
  p_timezone text default 'America/Sao_Paulo'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  correct int := 0;
  rec record;
  chosen int;
  passed boolean;
  completion jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_access_lesson(p_lesson_id) then
    raise exception 'not enrolled';
  end if;

  select count(*)::int into total
  from public.quiz_questions
  where lesson_id = p_lesson_id;

  if total = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'no_questions',
      'passed', false,
      'correct', 0,
      'total', 0,
      'percent', 0
    );
  end if;

  for rec in
    select id, correct_index
    from public.quiz_questions
    where lesson_id = p_lesson_id
  loop
    chosen := nullif(p_answers ->> rec.id::text, '')::int;
    if chosen is not null and chosen = rec.correct_index then
      correct := correct + 1;
    end if;
  end loop;

  passed := (correct::numeric / total::numeric) >= 0.7;

  if passed then
    completion := public.complete_lesson(p_lesson_id, p_timezone);
  end if;

  return jsonb_build_object(
    'ok', true,
    'passed', passed,
    'correct', correct,
    'total', total,
    'percent', round((correct::numeric / total::numeric) * 100),
    'completion', completion
  );
end;
$$;

revoke all on function public.can_access_lesson(uuid) from public;
revoke all on function public.get_quiz(uuid) from public;
revoke all on function public.submit_quiz(uuid, jsonb, text) from public;

grant execute on function public.get_quiz(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
