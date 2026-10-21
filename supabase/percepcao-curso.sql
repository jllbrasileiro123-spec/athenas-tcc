-- ============================================================
-- ATHENAS — Percepção dos alunos sobre o curso
-- O pop-up de avaliação (fim da trilha) pergunta, de 1 a 5, em dois grupos:
--   Avaliação do curso
--     P4 O conteúdo foi claro e bem explicado
--     P5 O tempo de dedicação foi adequado à minha rotina
--     P6 Os vídeos, exercícios e materiais ajudaram no meu aprendizado
--   Percepção do próprio aprendizado
--     P1 Avancei nos meus conhecimentos sobre IA no Direito
--     P2 Aprendi coisas que eu nem imaginava que poderia aprender
--     P3 Consigo aplicar o que aprendi na minha rotina de trabalho
--     P7 Hoje me sinto mais seguro(a) para usar IA no trabalho com responsabilidade
-- além da nota (estrelas), da recomendação e do comentário.
-- O tempo para concluir é calculado sozinho (matrícula → última aula).
-- Cole no SQL Editor do Supabase e rode. Pode rodar mais de uma vez.
-- Depende de: feedback-relatorios.sql e instructor-applications.sql.
-- ============================================================

alter table public.course_feedback
  add column if not exists perception jsonb;


-- Progresso e tempo de conclusão de cada matriculado
create or replace function public.course_completion_times(p_course_id uuid)
returns table (
  user_id uuid,
  enrolled_at timestamptz,
  done int,
  total int,
  completed_at timestamptz,
  days_to_complete numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with total as (
    select count(*)::int as n from public.lessons where course_id = p_course_id
  ),
  prog as (
    select e.user_id, e.enrolled_at,
           count(lp.lesson_id) filter (where lp.completed)::int as done,
           max(lp.completed_at) filter (where lp.completed) as last_done
    from public.enrollments e
    left join public.lessons l on l.course_id = e.course_id
    left join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = e.user_id
    where e.course_id = p_course_id
    group by e.user_id, e.enrolled_at
  )
  select
    p.user_id,
    p.enrolled_at,
    p.done,
    t.n,
    case when t.n > 0 and p.done >= t.n then p.last_done end,
    case when t.n > 0 and p.done >= t.n
         then round(extract(epoch from (p.last_done - p.enrolled_at)) / 86400.0, 1) end
  from prog p cross join total t;
$$;

revoke all on function public.course_completion_times(uuid) from public, anon, authenticated;


-- Relatório de percepção (só admin)
create or replace function public.admin_course_perception(p_course_id uuid)
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
    'enrolled', (select count(*)::int from public.course_completion_times(p_course_id)),
    'completed', (select count(*)::int from public.course_completion_times(p_course_id) c where c.completed_at is not null),
    'median_days', (
      select percentile_cont(0.5) within group (order by c.days_to_complete)
      from public.course_completion_times(p_course_id) c
      where c.days_to_complete is not null
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'full_name', p.full_name,
        'rating', f.rating,
        'would_recommend', f.would_recommend,
        'perception', coalesce(f.perception, '{}'::jsonb),
        'comment', f.comment,
        'updated_at', f.updated_at,
        'days_to_complete', c.days_to_complete,
        'progress_pct', case when c.total > 0 then round(100.0 * c.done / c.total) end
      ) order by f.updated_at desc)
      from public.course_feedback f
      left join public.profiles p on p.id = f.user_id
      left join public.course_completion_times(p_course_id) c on c.user_id = f.user_id
      where f.course_id = p_course_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_course_perception(uuid) from public;
grant execute on function public.admin_course_perception(uuid) to authenticated;


-- API para o Power BI: uma linha por avaliação (anônima)
-- Usa a mesma chave de api-powerbi.sql (rode os dois arquivos).
drop function if exists public.api_percepcao(text);
create or replace function public.api_percepcao(p_key text)
returns table (
  avaliacao_id uuid,
  curso text,
  avaliado_em timestamptz,
  nota int,
  recomenda boolean,
  p1_avancei int,
  p2_aprendi_novo int,
  p3_aplico_rotina int,
  p4_conteudo_claro int,
  p5_tempo_adequado int,
  p6_materiais_ajudaram int,
  p7_mais_seguro int,
  dias_para_concluir numeric,
  progresso_pct numeric,
  comentario text
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.report_api_key_ok(p_key) then
    raise exception 'invalid api key' using errcode = '42501';
  end if;

  return query
  select
    f.id,
    co.title,
    f.updated_at,
    f.rating,
    f.would_recommend,
    (f.perception ->> 'P1')::int,
    (f.perception ->> 'P2')::int,
    (f.perception ->> 'P3')::int,
    (f.perception ->> 'P4')::int,
    (f.perception ->> 'P5')::int,
    (f.perception ->> 'P6')::int,
    (f.perception ->> 'P7')::int,
    c.days_to_complete,
    case when c.total > 0 then round(100.0 * c.done / c.total) end,
    f.comment
  from public.course_feedback f
  join public.courses co on co.id = f.course_id
  left join lateral (
    select * from public.course_completion_times(f.course_id) t where t.user_id = f.user_id
  ) c on true
  order by f.updated_at;
end;
$$;

revoke all on function public.api_percepcao(text) from public;
grant execute on function public.api_percepcao(text) to anon, authenticated;

notify pgrst, 'reload schema';
