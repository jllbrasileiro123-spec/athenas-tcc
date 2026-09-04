-- ============================================================
-- ATHENAS — Atividades 4 a 8 do plano do TCC, em um único arquivo
-- Cole TODO este conteúdo no Supabase → SQL Editor → New query → Run
--
-- O que este arquivo faz:
--   1) Atividade 4/5 — teste de nivelamento (tabelas, RLS, RPCs)
--   2) Atividade 7   — dúvidas por aula respondidas pelo instrutor
--   3) Atividade 6   — certificado de conclusão com código de verificação
--   4) Atividade 8   — respostas do questionário SUS
--   5) SEED          — publica as formações demo com aulas, quizzes,
--                      perguntas de nivelamento e dúvidas de exemplo,
--                      e matricula todos os usuários existentes
--
-- Pré-requisitos: schema.sql, gamification.sql e quiz-questions.sql aplicados.
-- Rodar de novo é seguro (idempotente); o seed refaz as formações demo.
-- ============================================================


-- ============================================================
-- 1) ATIVIDADE 4/5 — TESTE DE NIVELAMENTO
-- ============================================================

-- Conclusão via teste x conclusão orgânica (Atividade 4)
alter table public.lesson_progress
  add column if not exists via_placement_test boolean not null default false;

create table if not exists public.placement_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  prompt text not null,
  choices jsonb not null,
  correct_index int not null check (correct_index >= 0 and correct_index <= 3),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists placement_questions_course_idx
  on public.placement_questions (course_id, sort_order);

create index if not exists placement_questions_lesson_idx
  on public.placement_questions (lesson_id);

create table if not exists public.placement_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  answers jsonb not null,
  unlocked_lessons uuid[] not null default '{}',
  correct_count int not null default 0,
  total_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.placement_questions enable row level security;
alter table public.placement_results enable row level security;

drop policy if exists "Instrutor gerencia perguntas de nivelamento" on public.placement_questions;
create policy "Instrutor gerencia perguntas de nivelamento"
  on public.placement_questions for all to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = placement_questions.course_id
        and c.instructor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = placement_questions.course_id
        and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "Usuario ve e cria proprio resultado" on public.placement_results;
create policy "Usuario ve e cria proprio resultado"
  on public.placement_results for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Leitura do teste sem expor a resposta correta
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
        'lesson_title', l.title,
        'prompt', q.prompt,
        'choices', q.choices,
        'sort_order', q.sort_order
      ) order by l.sort_order, q.sort_order)
      from public.placement_questions q
      join public.lessons l on l.id = q.lesson_id
      where q.course_id = p_course_id
    ), '[]'::jsonb)
  );
end;
$$;

-- Envio do teste: libera a aula com >= 70% de acerto nas perguntas dela
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
  total_correct int := 0;
  total_questions int := 0;
  v_next_id uuid;
  v_next_title text;
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

    if rec.total > 0 and (rec.hits::numeric / rec.total::numeric) >= 0.7 then
      unlocked := unlocked || rec.lesson_id;

      insert into public.lesson_progress (user_id, lesson_id, completed, completed_at, via_placement_test)
      values (uid, rec.lesson_id, true, now(), true)
      on conflict (user_id, lesson_id) do update
        set completed = true,
            completed_at = coalesce(lesson_progress.completed_at, now()),
            via_placement_test = true;
    end if;
  end loop;

  insert into public.placement_results (user_id, course_id, answers, unlocked_lessons, correct_count, total_count)
  values (uid, p_course_id, p_answers, unlocked, total_correct, total_questions)
  on conflict (user_id, course_id) do update
    set answers = excluded.answers,
        unlocked_lessons = excluded.unlocked_lessons,
        correct_count = excluded.correct_count,
        total_count = excluded.total_count,
        created_at = now();

  select l.id, l.title into v_next_id, v_next_title
  from public.lessons l
  left join public.lesson_progress p
    on p.lesson_id = l.id and p.user_id = uid
  where l.course_id = p_course_id
    and coalesce(p.completed, false) = false
  order by l.sort_order
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'correct_count', total_correct,
    'total_count', total_questions,
    'unlocked_lessons', to_jsonb(unlocked),
    'unlocked_count', coalesce(array_length(unlocked, 1), 0),
    'lesson_count', (
      select count(distinct lesson_id)::int
      from public.placement_questions
      where course_id = p_course_id
    ),
    'next_lesson_id', v_next_id,
    'next_lesson_title', v_next_title
  );
end;
$$;

revoke all on function public.get_placement_test(uuid) from public;
revoke all on function public.submit_placement_test(uuid, jsonb) from public;
grant execute on function public.get_placement_test(uuid) to authenticated;
grant execute on function public.submit_placement_test(uuid, jsonb) to authenticated;


-- ============================================================
-- 2) ATIVIDADE 7 — DÚVIDAS DA AULA (o instrutor do curso responde)
-- ============================================================

create table if not exists public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  answer text,
  answered_by uuid references public.profiles (id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists lesson_questions_course_idx
  on public.lesson_questions (course_id, created_at desc);

create index if not exists lesson_questions_lesson_idx
  on public.lesson_questions (lesson_id, created_at desc);

alter table public.lesson_questions enable row level security;

-- Autor vê a própria dúvida; instrutor vê as do curso dele;
-- dúvidas já respondidas ficam visíveis para quem está matriculado.
drop policy if exists "Ver duvidas relevantes" on public.lesson_questions;
create policy "Ver duvidas relevantes"
  on public.lesson_questions for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.courses c
      where c.id = lesson_questions.course_id
        and c.instructor_id = auth.uid()
    )
    or (
      answered_at is not null
      and exists (
        select 1 from public.enrollments e
        where e.course_id = lesson_questions.course_id
          and e.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Aluno cria propria duvida" on public.lesson_questions;
create policy "Aluno cria propria duvida"
  on public.lesson_questions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Instrutor responde duvida do curso" on public.lesson_questions;
create policy "Instrutor responde duvida do curso"
  on public.lesson_questions for update to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = lesson_questions.course_id
        and c.instructor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = lesson_questions.course_id
        and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "Autor apaga propria duvida" on public.lesson_questions;
create policy "Autor apaga propria duvida"
  on public.lesson_questions for delete to authenticated
  using (user_id = auth.uid());

-- Fila de dúvidas do instrutor, com nome do aluno e da aula
create or replace function public.instructor_questions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', q.id,
      'course_id', q.course_id,
      'course_title', c.title,
      'lesson_id', q.lesson_id,
      'lesson_title', l.title,
      'student_name', coalesce(p.full_name, 'Aluno'),
      'body', q.body,
      'answer', q.answer,
      'answered_at', q.answered_at,
      'created_at', q.created_at
    ) order by (q.answered_at is not null), q.created_at desc)
    from public.lesson_questions q
    join public.courses c on c.id = q.course_id
    left join public.lessons l on l.id = q.lesson_id
    left join public.profiles p on p.id = q.user_id
    where c.instructor_id = uid
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.instructor_questions() from public;
grant execute on function public.instructor_questions() to authenticated;


-- ============================================================
-- 3) ATIVIDADE 6 — CERTIFICADO COM CÓDIGO DE VERIFICAÇÃO
-- ============================================================

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  code text not null unique,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.certificates enable row level security;

drop policy if exists "Usuario ve proprio certificado" on public.certificates;
create policy "Usuario ve proprio certificado"
  on public.certificates for select to authenticated
  using (user_id = auth.uid());

-- Emite (ou devolve) o certificado quando 100% da trilha está concluída
create or replace function public.issue_certificate(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_total int;
  v_done int;
  v_code text;
  v_issued timestamptz;
  v_course text;
  v_name text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select c.title into v_course from public.courses c where c.id = p_course_id;
  if v_course is null then
    raise exception 'course not found';
  end if;

  select count(*)::int into v_total
  from public.lessons where course_id = p_course_id;

  select count(*)::int into v_done
  from public.lessons l
  join public.lesson_progress p on p.lesson_id = l.id
  where l.course_id = p_course_id and p.user_id = uid and p.completed;

  if v_total = 0 or v_done < v_total then
    return jsonb_build_object(
      'ok', false,
      'error', 'incomplete',
      'completed_count', v_done,
      'total_lessons', v_total
    );
  end if;

  select code, issued_at into v_code, v_issued
  from public.certificates
  where user_id = uid and course_id = p_course_id;

  if v_code is null then
    v_code := 'ATH-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
      || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

    insert into public.certificates (user_id, course_id, code)
    values (uid, p_course_id, v_code)
    on conflict (user_id, course_id) do update set code = certificates.code
    returning code, issued_at into v_code, v_issued;
  end if;

  select full_name into v_name from public.profiles where id = uid;

  return jsonb_build_object(
    'ok', true,
    'code', v_code,
    'issued_at', v_issued,
    'course_title', v_course,
    'holder_name', coalesce(v_name, 'Aluno ATHENAS'),
    'completed_count', v_done,
    'total_lessons', v_total
  );
end;
$$;

-- Verificação pública pelo código (não exige login)
create or replace function public.verify_certificate(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'ok', true,
    'code', ct.code,
    'issued_at', ct.issued_at,
    'course_title', c.title,
    'holder_name', coalesce(p.full_name, 'Aluno ATHENAS'),
    'total_lessons', (select count(*)::int from public.lessons where course_id = c.id)
  ) into result
  from public.certificates ct
  join public.courses c on c.id = ct.course_id
  left join public.profiles p on p.id = ct.user_id
  where upper(trim(ct.code)) = upper(trim(p_code));

  return coalesce(result, jsonb_build_object('ok', false, 'error', 'not_found'));
end;
$$;

revoke all on function public.issue_certificate(uuid) from public;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.issue_certificate(uuid) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;


-- ============================================================
-- 4) ATIVIDADE 8 — QUESTIONÁRIO SUS DO TESTE COM PÚBLICO-ALVO
-- ============================================================

create table if not exists public.sus_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  participant text,
  answers int[] not null,
  score numeric(5, 2) not null,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.sus_responses enable row level security;

drop policy if exists "Qualquer autenticado responde SUS" on public.sus_responses;
create policy "Qualquer autenticado responde SUS"
  on public.sus_responses for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Autor e admin veem SUS" on public.sus_responses;
create policy "Autor e admin veem SUS"
  on public.sus_responses for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );


-- ============================================================
-- 5) SEED — FORMAÇÕES DEMO JÁ POSTADAS E PRONTAS PARA TESTE
-- ============================================================

do $$
declare
  instructor uuid;
  asker uuid;
  c1 uuid;
  c2 uuid;
  l1 uuid; l2 uuid; l3 uuid; l4 uuid;
  m1 uuid; m2 uuid; m3 uuid;
  demo_video text := '/demo/athenas-demo.mp4';
begin
  -- Instrutor: admin > instrutor > primeiro perfil criado
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

  -- Quem vai responder as dúvidas precisa ser instrutor
  update public.profiles
  set role = 'instructor'
  where id = instructor and role = 'student';

  -- Idempotência: refaz as formações demo deste arquivo
  delete from public.courses where title like 'ATHENAS · %';

  -- ---------- Formação 1 ----------
  insert into public.courses (instructor_id, title, description, price, level, published, review_status)
  values (
    instructor,
    'ATHENAS · Fundamentos de IA',
    'Formação demo com vídeo hospedado no próprio app, quiz, teste de nivelamento e dúvidas respondidas pelo instrutor.',
    0, 'iniciante', true, 'approved'
  )
  returning id into c1;

  insert into public.lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_preview, content_type, xp_reward)
  values (c1, 'Aula 1 — O que é a plataforma ATHENAS', 'Vídeo MP4 hospedado. Assista até o fim para concluir.', demo_video, 1, 0, true, 'lesson', 10)
  returning id into l1;

  insert into public.lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_preview, content_type, xp_reward)
  values (c1, 'Aula 2 — Player e conclusão de aula', 'Como o progresso é registrado ao assistir 90% do vídeo.', demo_video, 1, 1, true, 'lesson', 10)
  returning id into l2;

  insert into public.lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_preview, content_type, xp_reward)
  values (c1, 'Aula 3 — Trilha, XP e sequência', 'A trilha gamificada e o que cada conclusão gera.', demo_video, 1, 2, true, 'lesson', 10)
  returning id into l3;

  insert into public.lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_preview, content_type, xp_reward)
  values (c1, 'Checkpoint — Quiz de Fundamentos', 'Acerte 70% para concluir e ganhar 15 XP.', null, 5, 3, true, 'quiz', 15)
  returning id into l4;

  insert into public.quiz_questions (lesson_id, prompt, choices, correct_index, sort_order) values
    (l4, 'Quanto do vídeo precisa ser assistido para a aula contar como concluída?',
     '["50%","70%","90% ou mais","100% exatos"]'::jsonb, 2, 0),
    (l4, 'O que uma conclusão de aula dispara na plataforma?',
     '["Nada","Ganho de XP e atualização da sequência","Cobrança no cartão","Troca de instrutor"]'::jsonb, 1, 1),
    (l4, 'Qual é a nota mínima de aprovação nos quizzes?',
     '["50%","60%","70%","100%"]'::jsonb, 2, 2);

  insert into public.placement_questions (course_id, lesson_id, prompt, choices, correct_index, sort_order) values
    (c1, l1, 'O que é a plataforma ATHENAS?',
     '["Uma rede social de fotos","Uma plataforma de formações em tecnologia e IA","Um editor de planilhas","Um jogo de corrida"]'::jsonb, 1, 0),
    (c1, l1, 'Para acompanhar uma formação, o aluno precisa:',
     '["Se matricular na formação","Instalar um antivírus","Comprar um servidor","Nada, o acesso vem por carta"]'::jsonb, 0, 1),
    (c1, l2, 'O player de aulas do ATHENAS aceita:',
     '["Somente DVD","Somente fita VHS","Vídeo hospedado (MP4) e YouTube","Somente áudio"]'::jsonb, 2, 0),
    (c1, l2, 'Uma aula em vídeo conta como concluída quando:',
     '["O vídeo é assistido até quase o fim (90% ou mais)","O aluno abre a página","O instrutor manda um e-mail","Nunca é concluída"]'::jsonb, 0, 1),
    (c1, l3, 'Na trilha gamificada, concluir uma aula gera:',
     '["Nada","XP e atualização da sequência de estudos","Desconto no mercado","Um novo instrutor"]'::jsonb, 1, 0),
    (c1, l3, 'Para que servem as moedas do ATHENAS?',
     '["Comprar o congelador de sequência","Pagar imposto","Trocar por dinheiro real","Não existem moedas"]'::jsonb, 0, 1);

  -- ---------- Formação 2 ----------
  insert into public.courses (instructor_id, title, description, price, level, published, review_status)
  values (
    instructor,
    'ATHENAS · Produtividade com automações',
    'Segunda formação demo: mais aulas em vídeo hospedado, simulado e nivelamento próprio.',
    0, 'iniciante', true, 'approved'
  )
  returning id into c2;

  insert into public.lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_preview, content_type, xp_reward)
  values (c2, 'Aula 1 — Rotinas que valem automatizar', 'Critérios para escolher o que automatizar primeiro.', demo_video, 1, 0, true, 'lesson', 10)
  returning id into m1;

  insert into public.lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_preview, content_type, xp_reward)
  values (c2, 'Aula 2 — Do manual ao fluxo automático', 'Como desenhar o fluxo antes de escrever qualquer código.', demo_video, 1, 1, true, 'lesson', 10)
  returning id into m2;

  insert into public.lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_preview, content_type, xp_reward)
  values (c2, 'Simulado — Automação na prática', 'Simulado de 3 questões: 30 XP ao aprovar.', null, 10, 2, true, 'simulado', 30)
  returning id into m3;

  insert into public.quiz_questions (lesson_id, prompt, choices, correct_index, sort_order) values
    (m3, 'Qual tarefa é a melhor candidata a automação?',
     '["Repetitiva, frequente e com regra clara","Feita uma vez por ano","Que exige decisão subjetiva","Que ninguém entende"]'::jsonb, 0, 0),
    (m3, 'Qual é o primeiro passo antes de automatizar?',
     '["Comprar uma ferramenta","Mapear o fluxo manual","Escrever o código","Contratar equipe"]'::jsonb, 1, 1),
    (m3, 'Automação bem feita deve:',
     '["Aumentar o retrabalho","Reduzir esforço repetitivo","Esconder os erros","Depender de uma só pessoa"]'::jsonb, 1, 2);

  insert into public.placement_questions (course_id, lesson_id, prompt, choices, correct_index, sort_order) values
    (c2, m1, 'Uma boa candidata a automação é uma tarefa:',
     '["Rara e imprevisível","Repetitiva e com regra clara","Que muda todo dia","Que exige julgamento humano"]'::jsonb, 1, 0),
    (c2, m1, 'O maior ganho de automatizar é:',
     '["Gastar mais tempo","Liberar tempo para trabalho de decisão","Aumentar o número de erros","Complicar o processo"]'::jsonb, 1, 1),
    (c2, m2, 'Antes de automatizar um processo você deve:',
     '["Mapear o fluxo manual","Apagar a documentação","Trocar de time","Pular direto para o código"]'::jsonb, 0, 0),
    (c2, m2, 'Um fluxo automático confiável precisa de:',
     '["Nenhum tratamento de erro","Tratamento de erro e registro do que rodou","Somente boa intenção","Execução manual diária"]'::jsonb, 1, 1);

  -- ---------- Matricula todos os usuários existentes ----------
  insert into public.enrollments (user_id, course_id)
  select p.id, c.id
  from public.profiles p
  cross join (select c1 as id union all select c2) c
  on conflict (user_id, course_id) do nothing;

  -- ---------- Dúvidas de exemplo (uma respondida, uma na fila) ----------
  -- Autor: outro usuário, se existir; senão o próprio instrutor
  select id into asker
  from public.profiles
  where id <> instructor
  order by created_at
  limit 1;
  asker := coalesce(asker, instructor);

  insert into public.lesson_questions (course_id, lesson_id, user_id, body, answer, answered_by, answered_at)
  values (
    c1, l2, asker,
    'A aula conta como concluída se eu pular o vídeo direto para o final?',
    'Não. O player só marca a conclusão quando você realmente assiste 90% ou mais da duração — pular para o fim não conta.',
    instructor, now()
  );

  insert into public.lesson_questions (course_id, lesson_id, user_id, body)
  values (
    c1, l3, asker,
    'Se eu perder um dia de estudo, perco todo o XP acumulado?'
  );

  raise notice 'Seed OK. Instrutor=% | Curso 1=% | Curso 2=%', instructor, c1, c2;
end $$;

notify pgrst, 'reload schema';
