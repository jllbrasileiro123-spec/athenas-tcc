-- ============================================================
-- ATHENAS — Módulos com desbloqueio em cascata
-- Cole TODO este conteúdo no Supabase → SQL Editor → New query → Run
--
-- Pré-requisitos (nesta ordem): schema.sql, gamification.sql,
-- quiz-questions.sql, atividades-5-a-8.sql
--
-- O que este arquivo faz:
--   1) Cria módulos por formação (nível iniciante/intermediário/avançado)
--   2) Cada módulo agrupa: vídeo de explicação, vídeo de tutorial,
--      podcast (áudio), exercício de avaliação e materiais (PDF/links)
--   3) Desbloqueio: alguns módulos já vêm liberados; os demais abrem
--      quando o módulo anterior é concluído (exercício é obrigatório)
--   4) Nivelamento por módulo: acertar >= 70% das perguntas do módulo
--      conclui o módulo e já libera o seguinte (pula para o intermediário)
--   5) SEED — formação demo com 4 módulos completos
--
-- Rodar de novo é seguro (idempotente).
-- ============================================================


-- ============================================================
-- 1) ESTRUTURA
-- ============================================================

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  level text not null default 'iniciante'
    check (level in ('iniciante', 'intermediario', 'avancado')),
  sort_order int not null default 0,
  -- Módulos de entrada: já vêm liberados sem depender de nada
  unlocked_by_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists course_modules_course_idx
  on public.course_modules (course_id, sort_order);

-- Aula passa a pertencer a um módulo e a ter um papel dentro dele
alter table public.lessons
  add column if not exists module_id uuid references public.course_modules (id) on delete cascade;

alter table public.lessons
  add column if not exists item_kind text;

alter table public.lessons
  add column if not exists audio_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lessons_item_kind_check'
  ) then
    alter table public.lessons
      add constraint lessons_item_kind_check
      check (item_kind is null or item_kind in ('explicacao', 'tutorial', 'podcast', 'exercicio'));
  end if;
end $$;

create index if not exists lessons_module_idx
  on public.lessons (module_id, sort_order);

-- Materiais de apoio do módulo (apostilas, PDFs, links)
create table if not exists public.module_materials (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null,
  url text not null,
  kind text not null default 'link' check (kind in ('pdf', 'apostila', 'link', 'slide')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists module_materials_module_idx
  on public.module_materials (module_id, sort_order);


-- ============================================================
-- 2) RLS
-- ============================================================

alter table public.course_modules enable row level security;
alter table public.module_materials enable row level security;

drop policy if exists "Modulos de cursos visiveis" on public.course_modules;
create policy "Modulos de cursos visiveis"
  on public.course_modules for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id
        and (
          c.published = true
          or c.instructor_id = auth.uid()
          or exists (
            select 1 from public.enrollments e
            where e.course_id = c.id and e.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Instrutor gerencia modulos" on public.course_modules;
create policy "Instrutor gerencia modulos"
  on public.course_modules for all to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id and c.instructor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "Materiais visiveis" on public.module_materials;
create policy "Materiais visiveis"
  on public.module_materials for select
  using (
    exists (
      select 1
      from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_materials.module_id
        and (
          c.published = true
          or c.instructor_id = auth.uid()
          or exists (
            select 1 from public.enrollments e
            where e.course_id = c.id and e.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Instrutor gerencia materiais" on public.module_materials;
create policy "Instrutor gerencia materiais"
  on public.module_materials for all to authenticated
  using (
    exists (
      select 1
      from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_materials.module_id and c.instructor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_materials.module_id and c.instructor_id = auth.uid()
    )
  );


-- ============================================================
-- 3) LEITURA DOS MÓDULOS COM ESTADO DE DESBLOQUEIO
-- ============================================================

-- Itens obrigatórios para concluir um módulo: tudo menos o podcast,
-- que é reforço opcional (o exercício é sempre requisito).
create or replace function public.module_item_required(p_item_kind text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_item_kind, 'explicacao') <> 'podcast';
$$;

create or replace function public.get_course_modules(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec record;
  modules jsonb := '[]'::jsonb;
  prev_completed boolean := true;  -- o primeiro módulo não depende de ninguém
  v_unlocked boolean;
  v_completed boolean;
  v_next_item uuid;
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

  for rec in
    select
      m.id,
      m.title,
      m.description,
      m.level,
      m.sort_order,
      m.unlocked_by_default,
      (
        select count(*)::int
        from public.lessons l
        where l.module_id = m.id and public.module_item_required(l.item_kind)
      ) as required_total,
      (
        select count(*)::int
        from public.lessons l
        join public.lesson_progress p
          on p.lesson_id = l.id and p.user_id = uid and p.completed = true
        where l.module_id = m.id and public.module_item_required(l.item_kind)
      ) as required_done,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', x.id,
          'title', x.title,
          'description', x.description,
          'item_kind', coalesce(x.item_kind, 'explicacao'),
          'content_type', x.content_type,
          'video_url', x.video_url,
          'audio_url', x.audio_url,
          'duration_minutes', x.duration_minutes,
          'xp_reward', x.xp_reward,
          'sort_order', x.sort_order,
          'required', public.module_item_required(x.item_kind),
          'completed', x.completed,
          'via_placement_test', x.via_placement_test
        ) order by x.sort_order), '[]'::jsonb)
        from (
          select
            l.*,
            coalesce(p.completed, false) as completed,
            coalesce(p.via_placement_test, false) as via_placement_test
          from public.lessons l
          left join public.lesson_progress p
            on p.lesson_id = l.id and p.user_id = uid
          where l.module_id = m.id
        ) x
      ) as items,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', mm.id,
          'title', mm.title,
          'url', mm.url,
          'kind', mm.kind
        ) order by mm.sort_order), '[]'::jsonb)
        from public.module_materials mm
        where mm.module_id = m.id
      ) as materials
    from public.course_modules m
    where m.course_id = p_course_id
    order by m.sort_order
  loop
    -- Concluído: todos os itens obrigatórios feitos (módulo vazio não conta)
    v_completed := rec.required_total > 0 and rec.required_done >= rec.required_total;

    -- Liberado: entrada, ou o anterior concluído
    v_unlocked := rec.unlocked_by_default or prev_completed or v_completed;

    select l.id into v_next_item
    from public.lessons l
    left join public.lesson_progress p
      on p.lesson_id = l.id and p.user_id = uid
    where l.module_id = rec.id
      and coalesce(p.completed, false) = false
    order by l.sort_order
    limit 1;

    modules := modules || jsonb_build_object(
      'id', rec.id,
      'title', rec.title,
      'description', rec.description,
      'level', rec.level,
      'sort_order', rec.sort_order,
      'unlocked_by_default', rec.unlocked_by_default,
      'unlocked', v_unlocked,
      'completed', v_completed,
      'required_total', rec.required_total,
      'required_done', rec.required_done,
      'next_item_id', v_next_item,
      'items', rec.items,
      'materials', rec.materials
    );

    prev_completed := v_completed;
  end loop;

  return jsonb_build_object(
    'course_id', p_course_id,
    'modules', modules
  );
end;
$$;

revoke all on function public.get_course_modules(uuid) from public;
grant execute on function public.get_course_modules(uuid) to authenticated;


-- ============================================================
-- 4) TRILHA COM item_kind (podcast não bloqueia a próxima aula)
-- ============================================================

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
          l.module_id,
          coalesce(l.item_kind, 'explicacao') as item_kind,
          l.audio_url,
          coalesce(p.completed, false) as completed,
          p.completed_at,
          coalesce(p.via_placement_test, false) as via_placement_test
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

revoke all on function public.get_course_trail(uuid) from public;
grant execute on function public.get_course_trail(uuid) to authenticated;


-- ============================================================
-- 5) NIVELAMENTO POR MÓDULO
-- ============================================================

-- Perguntas do nivelamento passam a poder apontar direto para o módulo
alter table public.placement_questions
  add column if not exists module_id uuid references public.course_modules (id) on delete cascade;

alter table public.placement_questions
  alter column lesson_id drop not null;

create index if not exists placement_questions_module_idx
  on public.placement_questions (module_id);

-- Leitura do teste: agrupa por módulo quando a formação usa módulos
create or replace function public.get_placement_test(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_taken boolean;
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

  select exists (
    select 1 from public.placement_results r
    where r.user_id = uid and r.course_id = p_course_id
  ) into v_taken;

  return jsonb_build_object(
    'course_id', p_course_id,
    'already_taken', v_taken,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'lesson_id', q.lesson_id,
        'lesson_title', coalesce(l.title, ''),
        'module_id', coalesce(q.module_id, l.module_id),
        'module_title', coalesce(m.title, lm.title, ''),
        'module_level', coalesce(m.level, lm.level, ''),
        'prompt', q.prompt,
        'choices', q.choices,
        'sort_order', q.sort_order
      ) order by coalesce(m.sort_order, lm.sort_order, 0), coalesce(l.sort_order, 0), q.sort_order)
      from public.placement_questions q
      left join public.lessons l on l.id = q.lesson_id
      left join public.course_modules m on m.id = q.module_id
      left join public.course_modules lm on lm.id = l.module_id
      where q.course_id = p_course_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_placement_test(uuid) from public;
grant execute on function public.get_placement_test(uuid) to authenticated;

-- Envio: >= 70% no módulo conclui o módulo inteiro (libera o próximo);
-- em formações sem módulos, mantém a regra por aula.
create or replace function public.submit_placement_test(
  p_course_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec record;
  unlocked uuid[] := '{}';
  unlocked_modules uuid[] := '{}';
  total_correct int := 0;
  total_questions int := 0;
  has_modules boolean;
  v_next_id uuid;
  v_next_title text;
  v_next_module text;
  v_module_total int;
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

  select count(*)::int into total_questions
  from public.placement_questions
  where course_id = p_course_id;

  if total_questions = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'no_questions',
      'unlocked_count', 0,
      'lesson_count', 0
    );
  end if;

  select exists (
    select 1 from public.course_modules where course_id = p_course_id
  ) into has_modules;

  if has_modules then
    -- ---------- Regra por módulo ----------
    for rec in
      select
        coalesce(q.module_id, l.module_id) as module_id,
        count(*)::int as total,
        count(*) filter (
          where nullif(p_answers ->> q.id::text, '')::int = q.correct_index
        )::int as hits
      from public.placement_questions q
      left join public.lessons l on l.id = q.lesson_id
      where q.course_id = p_course_id
      group by coalesce(q.module_id, l.module_id)
    loop
      total_correct := total_correct + rec.hits;

      if rec.module_id is not null
         and rec.total > 0
         and (rec.hits::numeric / rec.total::numeric) >= 0.7
      then
        unlocked_modules := unlocked_modules || rec.module_id;

        -- Conclui os itens obrigatórios do módulo dominado
        insert into public.lesson_progress (user_id, lesson_id, completed, completed_at, via_placement_test)
        select uid, l.id, true, now(), true
        from public.lessons l
        where l.module_id = rec.module_id
          and public.module_item_required(l.item_kind)
        on conflict (user_id, lesson_id) do update
          set completed = true,
              completed_at = coalesce(lesson_progress.completed_at, now()),
              via_placement_test = true;

        unlocked := unlocked || array(
          select l.id from public.lessons l
          where l.module_id = rec.module_id
            and public.module_item_required(l.item_kind)
        );
      end if;
    end loop;

    select count(*)::int into v_module_total
    from public.course_modules
    where course_id = p_course_id;
  else
    -- ---------- Regra por aula (formações sem módulos) ----------
    for rec in
      select
        q.lesson_id,
        count(*)::int as total,
        count(*) filter (
          where nullif(p_answers ->> q.id::text, '')::int = q.correct_index
        )::int as hits
      from public.placement_questions q
      where q.course_id = p_course_id
      group by q.lesson_id
    loop
      total_correct := total_correct + rec.hits;

      if rec.lesson_id is not null
         and rec.total > 0
         and (rec.hits::numeric / rec.total::numeric) >= 0.7
      then
        unlocked := unlocked || rec.lesson_id;

        insert into public.lesson_progress (user_id, lesson_id, completed, completed_at, via_placement_test)
        values (uid, rec.lesson_id, true, now(), true)
        on conflict (user_id, lesson_id) do update
          set completed = true,
              completed_at = coalesce(lesson_progress.completed_at, now()),
              via_placement_test = true;
      end if;
    end loop;

    v_module_total := 0;
  end if;

  insert into public.placement_results (user_id, course_id, answers, unlocked_lessons, correct_count, total_count)
  values (uid, p_course_id, p_answers, unlocked, total_correct, total_questions)
  on conflict (user_id, course_id) do update
    set answers = excluded.answers,
        unlocked_lessons = excluded.unlocked_lessons,
        correct_count = excluded.correct_count,
        total_count = excluded.total_count,
        created_at = now();

  -- Onde o aluno começa agora
  select l.id, l.title, coalesce(m.title, '')
    into v_next_id, v_next_title, v_next_module
  from public.lessons l
  left join public.course_modules m on m.id = l.module_id
  left join public.lesson_progress p
    on p.lesson_id = l.id and p.user_id = uid
  where l.course_id = p_course_id
    and coalesce(p.completed, false) = false
    and public.module_item_required(l.item_kind)
  order by coalesce(m.sort_order, 0), l.sort_order
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'correct_count', total_correct,
    'total_count', total_questions,
    'unlocked_lessons', to_jsonb(unlocked),
    'unlocked_count', coalesce(array_length(unlocked, 1), 0),
    'unlocked_modules', to_jsonb(unlocked_modules),
    'unlocked_module_count', coalesce(array_length(unlocked_modules, 1), 0),
    'module_count', v_module_total,
    'lesson_count', (
      select count(*)::int
      from public.lessons l
      where l.course_id = p_course_id
        and public.module_item_required(l.item_kind)
    ),
    'next_lesson_id', v_next_id,
    'next_lesson_title', v_next_title,
    'next_module_title', v_next_module
  );
end;
$$;

revoke all on function public.submit_placement_test(uuid, jsonb) from public;
grant execute on function public.submit_placement_test(uuid, jsonb) to authenticated;


-- ============================================================
-- 6) SEED — FORMAÇÃO DEMO COM 4 MÓDULOS
-- ============================================================

do $$
declare
  instructor uuid;
  curso uuid;
  mod1 uuid; mod2 uuid; mod3 uuid; mod4 uuid;
  ex1 uuid; ex2 uuid; ex3 uuid; ex4 uuid;
  demo_video text := '/demo/athenas-demo.mp4';
  demo_audio text := '/demo/athenas-podcast.m4a';
begin
  select id into instructor from public.profiles where role = 'admin' order by created_at limit 1;
  if instructor is null then
    select id into instructor from public.profiles where role = 'instructor' order by created_at limit 1;
  end if;
  if instructor is null then
    select id into instructor from public.profiles order by created_at limit 1;
  end if;
  if instructor is null then
    raise exception 'Nenhum usuário em profiles. Crie sua conta no app e rode este SQL de novo.';
  end if;

  update public.profiles set role = 'instructor'
  where id = instructor and role = 'student';

  -- Idempotência: refaz a formação demo deste arquivo
  delete from public.courses where title = 'ATHENAS · Trilha por módulos';

  insert into public.courses (instructor_id, title, description, price, level, published, review_status)
  values (
    instructor,
    'ATHENAS · Trilha por módulos',
    'Formação demo em 4 módulos. Cada módulo tem vídeo de explicação, vídeo de tutorial, podcast, exercício de avaliação e materiais. Só o Módulo 1 começa liberado: os outros abrem ao concluir o anterior — ou direto pelo teste de nivelamento.',
    0, 'iniciante', true, 'approved'
  )
  returning id into curso;

  -- ---------- Módulos ----------
  insert into public.course_modules (course_id, title, description, level, sort_order, unlocked_by_default)
  values (curso, 'Módulo 1 — Primeiros passos', 'Como a plataforma funciona e o que conta como aula concluída.', 'iniciante', 0, true)
  returning id into mod1;

  insert into public.course_modules (course_id, title, description, level, sort_order, unlocked_by_default)
  values (curso, 'Módulo 2 — Trilha e gamificação', 'XP, sequência de estudos e moedas na prática.', 'iniciante', 1, false)
  returning id into mod2;

  insert into public.course_modules (course_id, title, description, level, sort_order, unlocked_by_default)
  values (curso, 'Módulo 3 — Automação intermediária', 'Do processo manual ao fluxo automático, com tratamento de erro.', 'intermediario', 2, false)
  returning id into mod3;

  insert into public.course_modules (course_id, title, description, level, sort_order, unlocked_by_default)
  values (curso, 'Módulo 4 — Projeto final', 'Integração completa: publicar, medir e corrigir.', 'avancado', 3, false)
  returning id into mod4;

  -- ---------- Módulo 1 ----------
  insert into public.lessons (course_id, module_id, title, description, video_url, audio_url, duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values
    (curso, mod1, 'M1 · Explicação — Como o ATHENAS funciona', 'Conteúdo teórico: matrícula, trilha e conclusão de aula.', demo_video, null, 1, 0, true, 'lesson', 'explicacao', 10),
    (curso, mod1, 'M1 · Tutorial — Assistindo sua primeira aula', 'Passo a passo no player até a aula contar como concluída.', demo_video, null, 1, 1, true, 'lesson', 'tutorial', 10),
    (curso, mod1, 'M1 · Podcast — Resumo em áudio', 'Áudio da explicação + tutorial para ouvir no trajeto (opcional).', null, demo_audio, 1, 2, true, 'lesson', 'podcast', 10);

  insert into public.lessons (course_id, module_id, title, description, duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values (curso, mod1, 'M1 · Exercício de avaliação', 'Acerte 70% para concluir o módulo e liberar o Módulo 2.', 5, 3, true, 'quiz', 'exercicio', 15)
  returning id into ex1;

  insert into public.quiz_questions (lesson_id, prompt, choices, correct_index, sort_order) values
    (ex1, 'Quanto do vídeo precisa ser assistido para a aula contar como concluída?',
     '["50%","70%","90% ou mais","100% exatos"]'::jsonb, 2, 0),
    (ex1, 'Qual item é obrigatório para concluir um módulo?',
     '["O podcast","O exercício de avaliação","Os materiais","Nenhum"]'::jsonb, 1, 1),
    (ex1, 'O que acontece ao concluir um módulo?',
     '["Nada","O próximo módulo é desbloqueado","O curso é encerrado","A matrícula é cancelada"]'::jsonb, 1, 2);

  insert into public.module_materials (module_id, title, url, kind, sort_order) values
    (mod1, 'Apostila — Guia de primeiros passos (PDF)', '/demo/athenas-demo.mp4', 'apostila', 0),
    (mod1, 'Link — Termos de uso da plataforma', '/termos', 'link', 1);

  -- ---------- Módulo 2 ----------
  insert into public.lessons (course_id, module_id, title, description, video_url, audio_url, duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values
    (curso, mod2, 'M2 · Explicação — XP, sequência e moedas', 'Como a gamificação mede seu avanço.', demo_video, null, 1, 4, true, 'lesson', 'explicacao', 10),
    (curso, mod2, 'M2 · Tutorial — Ganhando XP na prática', 'Concluindo aula e quiz para ver o XP subir.', demo_video, null, 1, 5, true, 'lesson', 'tutorial', 10),
    (curso, mod2, 'M2 · Podcast — Gamificação em 3 minutos', 'Versão em áudio do módulo (opcional).', null, demo_audio, 1, 6, true, 'lesson', 'podcast', 10);

  insert into public.lessons (course_id, module_id, title, description, duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values (curso, mod2, 'M2 · Exercício de avaliação', 'Acerte 70% para liberar o Módulo 3 (intermediário).', 5, 7, true, 'quiz', 'exercicio', 15)
  returning id into ex2;

  insert into public.quiz_questions (lesson_id, prompt, choices, correct_index, sort_order) values
    (ex2, 'Quanto XP vale um quiz aprovado?',
     '["5 XP","10 XP","15 XP","30 XP"]'::jsonb, 2, 0),
    (ex2, 'Para que servem as moedas?',
     '["Comprar o congelador de sequência","Pagar imposto","Trocar por dinheiro","Não existem"]'::jsonb, 0, 1),
    (ex2, 'A sequência de estudos aumenta quando você:',
     '["Abre o app","Conclui uma aula no dia","Compra moedas","Troca de curso"]'::jsonb, 1, 2);

  insert into public.module_materials (module_id, title, url, kind, sort_order) values
    (mod2, 'PDF — Tabela de XP e limiares', '/demo/athenas-demo.mp4', 'pdf', 0),
    (mod2, 'Link — Novidades da plataforma', '/novidades', 'link', 1);

  -- ---------- Módulo 3 (intermediário) ----------
  insert into public.lessons (course_id, module_id, title, description, video_url, audio_url, duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values
    (curso, mod3, 'M3 · Explicação — Do manual ao automático', 'Como mapear o processo antes de automatizar.', demo_video, null, 1, 8, true, 'lesson', 'explicacao', 10),
    (curso, mod3, 'M3 · Tutorial — Montando o fluxo', 'Demonstração prática com tratamento de erro.', demo_video, null, 1, 9, true, 'lesson', 'tutorial', 10),
    (curso, mod3, 'M3 · Podcast — Automação sem susto', 'Resumo em áudio do módulo intermediário (opcional).', null, demo_audio, 1, 10, true, 'lesson', 'podcast', 10);

  insert into public.lessons (course_id, module_id, title, description, duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values (curso, mod3, 'M3 · Exercício de avaliação', 'Acerte 70% para liberar o Módulo 4 (avançado).', 8, 11, true, 'quiz', 'exercicio', 15)
  returning id into ex3;

  insert into public.quiz_questions (lesson_id, prompt, choices, correct_index, sort_order) values
    (ex3, 'Qual é o primeiro passo antes de automatizar?',
     '["Comprar uma ferramenta","Mapear o fluxo manual","Escrever o código","Contratar equipe"]'::jsonb, 1, 0),
    (ex3, 'Um fluxo automático confiável precisa de:',
     '["Nenhum tratamento de erro","Tratamento de erro e registro do que rodou","Somente boa intenção","Execução manual diária"]'::jsonb, 1, 1),
    (ex3, 'Qual tarefa é a melhor candidata a automação?',
     '["Repetitiva, frequente e com regra clara","Feita uma vez por ano","Que exige decisão subjetiva","Que ninguém entende"]'::jsonb, 0, 2);

  insert into public.module_materials (module_id, title, url, kind, sort_order) values
    (mod3, 'Apostila — Checklist de automação', '/demo/athenas-demo.mp4', 'apostila', 0);

  -- ---------- Módulo 4 (avançado) ----------
  insert into public.lessons (course_id, module_id, title, description, video_url, audio_url, duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values
    (curso, mod4, 'M4 · Explicação — Projeto de ponta a ponta', 'Planejando a entrega final.', demo_video, null, 1, 12, true, 'lesson', 'explicacao', 10),
    (curso, mod4, 'M4 · Tutorial — Publicando e medindo', 'Publicação, métricas e correção do que quebrou.', demo_video, null, 1, 13, true, 'lesson', 'tutorial', 10),
    (curso, mod4, 'M4 · Podcast — Fechando o projeto', 'Áudio de encerramento (opcional).', null, demo_audio, 1, 14, true, 'lesson', 'podcast', 10);

  insert into public.lessons (course_id, module_id, title, description, duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values (curso, mod4, 'M4 · Simulado final', 'Simulado de encerramento: 30 XP ao aprovar.', 10, 15, true, 'simulado', 'exercicio', 30)
  returning id into ex4;

  insert into public.quiz_questions (lesson_id, prompt, choices, correct_index, sort_order) values
    (ex4, 'Ao concluir 100% da formação, o aluno pode:',
     '["Emitir o certificado com código de verificação","Nada","Refazer a matrícula","Perder o XP"]'::jsonb, 0, 0),
    (ex4, 'O certificado do ATHENAS pode ser conferido:',
     '["Só por e-mail","Na página pública de verificação","Em cartório","Não pode"]'::jsonb, 1, 1),
    (ex4, 'Qual é a nota mínima de aprovação nos exercícios?',
     '["50%","60%","70%","100%"]'::jsonb, 2, 2);

  insert into public.module_materials (module_id, title, url, kind, sort_order) values
    (mod4, 'Link — Verificar certificado', '/verificar', 'link', 0),
    (mod4, 'Link — Roteiro de teste com usuários', '/roteiro-teste', 'link', 1);

  -- ---------- Nivelamento por módulo (2 perguntas por módulo) ----------
  -- Acertar as duas do módulo (100% >= 70%) conclui o módulo e libera o seguinte.
  insert into public.placement_questions (course_id, module_id, prompt, choices, correct_index, sort_order) values
    (curso, mod1, 'Uma aula em vídeo conta como concluída quando:',
     '["O aluno abre a página","O vídeo é assistido até 90% ou mais","O instrutor aprova","Nunca"]'::jsonb, 1, 0),
    (curso, mod1, 'O que é obrigatório para concluir um módulo?',
     '["O podcast","O exercício de avaliação","Baixar os materiais","Nada"]'::jsonb, 1, 1),

    (curso, mod2, 'Quanto XP vale uma aula em vídeo concluída?',
     '["5 XP","10 XP","15 XP","30 XP"]'::jsonb, 1, 0),
    (curso, mod2, 'O congelador de sequência serve para:',
     '["Perdoar um dia perdido de estudo","Zerar o XP","Trocar de curso","Cancelar a matrícula"]'::jsonb, 0, 1),

    (curso, mod3, 'Antes de automatizar um processo você deve:',
     '["Mapear o fluxo manual","Apagar a documentação","Pular direto para o código","Trocar de time"]'::jsonb, 0, 0),
    (curso, mod3, 'Automação bem feita deve:',
     '["Aumentar o retrabalho","Reduzir esforço repetitivo","Esconder os erros","Depender de uma só pessoa"]'::jsonb, 1, 1),

    (curso, mod4, 'O certificado é liberado quando:',
     '["A trilha chega a 100%","A matrícula é feita","O primeiro vídeo termina","O aluno pede ao suporte"]'::jsonb, 0, 0),
    (curso, mod4, 'A nota mínima de aprovação no simulado é:',
     '["50%","60%","70%","90%"]'::jsonb, 2, 1);

  -- ---------- Matricula todos os usuários existentes ----------
  insert into public.enrollments (user_id, course_id)
  select p.id, curso from public.profiles p
  on conflict (user_id, course_id) do nothing;

  raise notice 'Seed de módulos OK. Curso=% | Módulos: % % % %', curso, mod1, mod2, mod3, mod4;
end $$;

notify pgrst, 'reload schema';
