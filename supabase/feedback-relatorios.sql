-- ============================================================
-- ATHENAS — Feedback do curso + Relatório de desempenho (admin)
-- Cole TODO este arquivo no Supabase: SQL Editor → New query → Run
-- Pode rodar mais de uma vez.
-- Depende de: schema.sql, quiz-questions.sql, exercicio-modulo1.sql,
--             instructor-applications.sql (is_admin) e atividades-5-a-8.sql
-- ============================================================


-- ============================================================
-- 1) HISTÓRICO DE TENTATIVAS DOS QUIZZES
--    Antes o submit_quiz só corrigia; agora cada envio fica gravado
--    para o relatório mostrar os acertos de cada advogado.
-- ============================================================

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  correct int not null,
  total int not null,
  percent int not null,
  passed boolean not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_course_user_idx
  on public.quiz_attempts (course_id, user_id);
create index if not exists quiz_attempts_lesson_idx
  on public.quiz_attempts (lesson_id);

alter table public.quiz_attempts enable row level security;

-- Aluno vê só as próprias tentativas; admin vê todas.
-- Não há policy de insert: só o submit_quiz (security definer) grava.
drop policy if exists "Aluno ve proprias tentativas, admin ve todas" on public.quiz_attempts;
create policy "Aluno ve proprias tentativas, admin ve todas"
  on public.quiz_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- submit_quiz: mesma lógica de exercicio-modulo1.sql + grava a tentativa
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
  pct int;
  completion jsonb;
  review jsonb := '[]'::jsonb;
  v_course uuid;
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
  pct := round((correct::numeric / total::numeric) * 100);

  select course_id into v_course from public.lessons where id = p_lesson_id;

  insert into public.quiz_attempts
    (user_id, lesson_id, course_id, correct, total, percent, passed, answers)
  values
    (auth.uid(), p_lesson_id, v_course, correct, total, pct, passed, coalesce(p_answers, '{}'::jsonb));

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'is_correct', nullif(p_answers ->> q.id::text, '')::int = q.correct_index
    )
    || case when passed then jsonb_build_object(
         'correct_index', q.correct_index,
         'explanation', q.explanation
       ) else '{}'::jsonb end
    order by q.sort_order
  ), '[]'::jsonb)
  into review
  from public.quiz_questions q
  where q.lesson_id = p_lesson_id;

  if passed then
    completion := public.complete_lesson(p_lesson_id, p_timezone);
  end if;

  return jsonb_build_object(
    'ok', true,
    'passed', passed,
    'correct', correct,
    'total', total,
    'percent', pct,
    'completion', completion,
    'review', review
  );
end;
$$;

revoke all on function public.submit_quiz(uuid, jsonb, text) from public;
grant execute on function public.submit_quiz(uuid, jsonb, text) to authenticated;


-- ============================================================
-- 2) FEEDBACK DO CURSO (popup ao concluir a trilha)
-- ============================================================

create table if not exists public.course_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  would_recommend boolean,
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists course_feedback_course_idx
  on public.course_feedback (course_id, created_at desc);

alter table public.course_feedback enable row level security;

drop policy if exists "Aluno ve proprio feedback, admin ve todos" on public.course_feedback;
create policy "Aluno ve proprio feedback, admin ve todos"
  on public.course_feedback for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Só quem está matriculado avalia, e só em nome próprio
drop policy if exists "Aluno matriculado envia feedback" on public.course_feedback;
create policy "Aluno matriculado envia feedback"
  on public.course_feedback for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid() and e.course_id = course_feedback.course_id
    )
  );

drop policy if exists "Aluno edita proprio feedback" on public.course_feedback;
create policy "Aluno edita proprio feedback"
  on public.course_feedback for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================
-- 3) RELATÓRIOS — SÓ CONTA ADMIN
--    As funções conferem is_admin() no próprio banco: mesmo que
--    alguém chame a RPC direto, sem ser admin recebe erro.
-- ============================================================

-- Cursos disponíveis no relatório (inclui não publicados)
create or replace function public.admin_report_courses()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin only';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'students', (select count(*)::int from public.enrollments e where e.course_id = c.id),
      'feedbacks', (select count(*)::int from public.course_feedback f where f.course_id = c.id)
    ) order by c.created_at desc)
    from public.courses c
  ), '[]'::jsonb);
end;
$$;

-- Desempenho de cada aluno matriculado no curso
create or replace function public.admin_course_report(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_quizzes jsonb;
  v_students jsonb;
  v_total_lessons int;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin only';
  end if;

  select count(*)::int into v_total_lessons
  from public.lessons where course_id = p_course_id;

  -- Quizzes do curso, na ordem da trilha
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id,
      'title', l.title,
      'questions', (select count(*)::int from public.quiz_questions q where q.lesson_id = l.id)
    ) order by m.sort_order nulls last, l.sort_order), '[]'::jsonb)
  into v_quizzes
  from public.lessons l
  left join public.course_modules m on m.id = l.module_id
  where l.course_id = p_course_id
    and exists (select 1 from public.quiz_questions q where q.lesson_id = l.id);

  with quiz_ids as (
    select l.id
    from public.lessons l
    where l.course_id = p_course_id
      and exists (select 1 from public.quiz_questions q where q.lesson_id = l.id)
  ),
  -- Melhor tentativa de cada aluno em cada quiz (maior %, depois a mais antiga)
  best as (
    select distinct on (a.user_id, a.lesson_id)
      a.user_id, a.lesson_id, a.correct, a.total, a.percent, a.passed
    from public.quiz_attempts a
    where a.course_id = p_course_id
    order by a.user_id, a.lesson_id, a.percent desc, a.created_at asc
  ),
  stats as (
    select a.user_id, a.lesson_id,
      count(*)::int as attempts,
      (array_agg(a.percent order by a.created_at asc))[1] as first_percent
    from public.quiz_attempts a
    where a.course_id = p_course_id
    group by a.user_id, a.lesson_id
  ),
  per_student as (
    select
      e.user_id,
      e.enrolled_at,
      p.full_name,
      u.email,
      (
        select count(*)::int
        from public.lessons l
        join public.lesson_progress lp on lp.lesson_id = l.id
        where l.course_id = p_course_id and lp.user_id = e.user_id and lp.completed
      ) as completed_count,
      (
        select max(lp.completed_at)
        from public.lessons l
        join public.lesson_progress lp on lp.lesson_id = l.id
        where l.course_id = p_course_id and lp.user_id = e.user_id and lp.completed
      ) as last_activity,
      (
        select coalesce(jsonb_object_agg(qi.id, jsonb_build_object(
          'correct', b.correct,
          'total', b.total,
          'percent', b.percent,
          'passed', coalesce(b.passed, lp.completed, false),
          'attempts', coalesce(s.attempts, 0),
          'first_percent', s.first_percent,
          -- concluiu antes de existir o histórico de tentativas
          'legacy_completed', b.user_id is null and coalesce(lp.completed, false)
        )), '{}'::jsonb)
        from quiz_ids qi
        left join best b on b.lesson_id = qi.id and b.user_id = e.user_id
        left join stats s on s.lesson_id = qi.id and s.user_id = e.user_id
        left join public.lesson_progress lp on lp.lesson_id = qi.id and lp.user_id = e.user_id
      ) as quizzes,
      (select coalesce(sum(b.correct), 0)::int from best b where b.user_id = e.user_id) as total_correct,
      (select coalesce(sum(b.total), 0)::int from best b where b.user_id = e.user_id) as total_questions,
      -- Desempenho final: média da melhor nota em TODOS os quizzes (não feito = 0)
      (
        select case when count(*) = 0 then null
          else round(avg(coalesce(b.percent, 0)))::int end
        from quiz_ids qi
        left join best b on b.lesson_id = qi.id and b.user_id = e.user_id
      ) as final_score,
      ct.code as certificate_code,
      ct.issued_at as certificate_issued_at,
      f.rating as feedback_rating
    from public.enrollments e
    left join public.profiles p on p.id = e.user_id
    left join auth.users u on u.id = e.user_id
    left join public.certificates ct on ct.user_id = e.user_id and ct.course_id = p_course_id
    left join public.course_feedback f on f.user_id = e.user_id and f.course_id = p_course_id
    where e.course_id = p_course_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', ps.user_id,
      'full_name', ps.full_name,
      'email', ps.email,
      'enrolled_at', ps.enrolled_at,
      'last_activity', ps.last_activity,
      'completed_count', ps.completed_count,
      'total_lessons', v_total_lessons,
      'progress_pct', case when v_total_lessons = 0 then 0
        else round(ps.completed_count::numeric * 100 / v_total_lessons)::int end,
      'quizzes', ps.quizzes,
      'total_correct', ps.total_correct,
      'total_questions', ps.total_questions,
      'final_score', ps.final_score,
      'certificate_code', ps.certificate_code,
      'certificate_issued_at', ps.certificate_issued_at,
      'feedback_rating', ps.feedback_rating
    ) order by ps.full_name nulls last), '[]'::jsonb)
  into v_students
  from per_student ps;

  return jsonb_build_object(
    'course_id', p_course_id,
    'total_lessons', v_total_lessons,
    'quizzes', v_quizzes,
    'students', v_students
  );
end;
$$;

-- Feedbacks do curso com o nome de quem enviou
create or replace function public.admin_course_feedback(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin only';
  end if;

  return jsonb_build_object(
    'summary', (
      select jsonb_build_object(
        'count', count(*)::int,
        'avg_rating', round(avg(f.rating)::numeric, 1),
        'recommend_yes', count(*) filter (where f.would_recommend)::int,
        'recommend_no', count(*) filter (where f.would_recommend = false)::int,
        'by_rating', jsonb_build_object(
          '1', count(*) filter (where f.rating = 1)::int,
          '2', count(*) filter (where f.rating = 2)::int,
          '3', count(*) filter (where f.rating = 3)::int,
          '4', count(*) filter (where f.rating = 4)::int,
          '5', count(*) filter (where f.rating = 5)::int
        )
      )
      from public.course_feedback f
      where f.course_id = p_course_id
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'full_name', p.full_name,
        'rating', f.rating,
        'would_recommend', f.would_recommend,
        'comment', f.comment,
        'created_at', f.created_at,
        'updated_at', f.updated_at
      ) order by f.updated_at desc)
      from public.course_feedback f
      left join public.profiles p on p.id = f.user_id
      where f.course_id = p_course_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_report_courses() from public;
revoke all on function public.admin_course_report(uuid) from public;
revoke all on function public.admin_course_feedback(uuid) from public;
grant execute on function public.admin_report_courses() to authenticated;
grant execute on function public.admin_course_report(uuid) to authenticated;
grant execute on function public.admin_course_feedback(uuid) to authenticated;

notify pgrst, 'reload schema';
