-- ============================================================
-- ATHENAS — Liga a aula 1 ao Storage (ou fallback local)
-- Prefira: npm run upload:aula1 (sobe pro Supabase e atualiza sozinho).
-- Este SQL só aponta para os arquivos locais se o upload ainda não rodou.
-- ============================================================

do $$
declare
  v_course uuid;
  v_mod1 uuid;
  v_lesson uuid;
  -- Depois do upload:aula1, as URLs passam a ser do Storage automaticamente.
  v_video text := '/demo/modulo1-explicacao-web.mp4';
  v_doc text := '/demo/Modulo1_Material_de_Apoio.docx';
begin
  -- ---- Trilha por módulos ----
  select id into v_course from public.courses where title = 'ATHENAS · Trilha por módulos' limit 1;
  if v_course is not null then
    select id into v_mod1
    from public.course_modules
    where course_id = v_course
    order by sort_order
    limit 1;

    select id into v_lesson
    from public.lessons
    where course_id = v_course
      and module_id = v_mod1
      and item_kind = 'explicacao'
    order by sort_order
    limit 1;

    if v_lesson is not null then
      update public.lessons
      set
        video_url = case
          when video_url like '%/course-videos/%' then video_url
          else v_video
        end,
        description = 'Aula 1 com vídeo e material de apoio do Módulo 1.',
        duration_minutes = 15
      where id = v_lesson;
    end if;

    if v_mod1 is not null then
      delete from public.module_materials
      where module_id = v_mod1
        and (
          title ilike '%Material de apoio%Módulo 1%'
          or title ilike '%Guia de primeiros passos%'
          or url = '/demo/athenas-demo.mp4'
          or url = '/demo/Modulo1_Material_de_Apoio.docx'
          or url = v_doc
        );

      insert into public.module_materials (module_id, title, url, kind, sort_order)
      values (v_mod1, 'Material de apoio — Módulo 1 (Word)', v_doc, 'apostila', 0);
    end if;
  end if;

  -- ---- Curso de teste do popup ----
  select id into v_course from public.courses where title = 'ATHENAS · Nivelamento grátis (teste do popup)' limit 1;
  if v_course is not null then
    select id into v_mod1
    from public.course_modules
    where course_id = v_course
    order by sort_order
    limit 1;

    select id into v_lesson
    from public.lessons
    where course_id = v_course
      and module_id = v_mod1
      and item_kind = 'explicacao'
    order by sort_order
    limit 1;

    if v_lesson is not null then
      update public.lessons
      set
        video_url = case
          when video_url like '%/course-videos/%' then video_url
          else v_video
        end,
        description = 'Aula 1 com vídeo e material de apoio do Módulo 1.',
        duration_minutes = 15
      where id = v_lesson;
    end if;

    if v_mod1 is not null then
      delete from public.module_materials
      where module_id = v_mod1
        and (
          title ilike '%Material de apoio%Módulo 1%'
          or url = '/demo/Modulo1_Material_de_Apoio.docx'
          or url = v_doc
        );

      insert into public.module_materials (module_id, title, url, kind, sort_order)
      values (v_mod1, 'Material de apoio — Módulo 1 (Word)', v_doc, 'apostila', 0);
    end if;
  end if;

  raise notice 'Aula 1: use npm run upload:aula1 para hospedar no Supabase (obrigatório no GitHub Pages).';
end $$;
