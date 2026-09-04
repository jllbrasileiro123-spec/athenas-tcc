-- DEMO: formação com vídeo HOSPEDADO (MP4 no app) — sem YouTube
-- Pré-requisito: arquivo public/demo/athenas-demo.mp4 no projeto (já gerado)
-- Cole no Supabase → SQL Editor → Run
-- Depois: login → Explorar → "ATHENAS Demo — Player hospedado"

do $$
declare
  instructor uuid;
  course_id uuid;
begin
  select id into instructor
  from public.profiles
  where role = 'admin'
  order by created_at
  limit 1;

  if instructor is null then
    select id into instructor
    from public.profiles
    where role = 'instructor'
    order by created_at
    limit 1;
  end if;

  if instructor is null then
    select id into instructor
    from public.profiles
    order by created_at
    limit 1;
  end if;

  if instructor is null then
    raise exception 'Nenhum usuário em profiles. Crie uma conta no app e rode este SQL de novo.';
  end if;

  update public.profiles
  set role = case when role = 'admin' then 'admin' else 'instructor' end
  where id = instructor and role = 'student';

  delete from public.courses
  where title = 'ATHENAS Demo — Player hospedado'
    and instructor_id = instructor;

  -- remove título antigo da demo YouTube, se existir
  delete from public.courses
  where title = 'ATHENAS Demo — Player de vídeo'
    and instructor_id = instructor;

  insert into public.courses (
    instructor_id,
    title,
    description,
    price,
    level,
    published,
    review_status
  )
  values (
    instructor,
    'ATHENAS Demo — Player hospedado',
    'Formação de demonstração com MP4 servido pelo próprio ATHENAS (sem YouTube). A primeira aula é prévia.',
    0,
    'iniciante',
    true,
    'approved'
  )
  returning id into course_id;

  insert into public.lessons (
    course_id,
    title,
    description,
    video_url,
    duration_minutes,
    sort_order,
    is_preview,
    content_type,
    xp_reward
  )
  values
    (
      course_id,
      'Aula 1 — Prévia (MP4 hospedado)',
      'Vídeo HTML5 em /demo/athenas-demo.mp4. Assista sem matricular.',
      '/demo/athenas-demo.mp4',
      1,
      0,
      true,
      'lesson',
      10
    ),
    (
      course_id,
      'Aula 2 — Após matricular',
      'Mesmo arquivo hospedado; disponível após matrícula para testar progresso.',
      '/demo/athenas-demo.mp4',
      1,
      1,
      false,
      'lesson',
      10
    );

  raise notice 'Demo hospedada publicada. course_id=% instructor=%', course_id, instructor;
end $$;
