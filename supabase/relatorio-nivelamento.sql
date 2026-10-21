-- ============================================================
-- ATHENAS — Relatório do nivelamento (aba "Nivelamento" em Relatórios)
-- Mostra, para o admin, o resultado de cada aluno no teste diagnóstico:
-- acertos por módulo, "Não sei", módulos dispensados e tópicos a revisar.
-- Rode depois de supabase/nivelamento-modulos-1a4.sql.
-- Pode rodar mais de uma vez.
-- ============================================================

create or replace function public.admin_placement_report(p_course_id uuid)
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
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title) order by m.sort_order)
      from public.course_modules m
      where m.course_id = p_course_id
        and exists (select 1 from public.placement_questions q where q.module_id = m.id)
    ), '[]'::jsonb),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', r.user_id,
        'full_name', p.full_name,
        'email', u.email,
        'taken_at', r.created_at,
        'correct_count', r.correct_count,
        'total_count', r.total_count,
        'dont_know_count', coalesce((r.details ->> 'dont_know_count')::int, 0),
        'modules', coalesce(r.details -> 'modules', '[]'::jsonb)
      ) order by p.full_name nulls last)
      from public.placement_results r
      left join public.profiles p on p.id = r.user_id
      left join auth.users u on u.id = r.user_id
      where r.course_id = p_course_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_placement_report(uuid) from public;
grant execute on function public.admin_placement_report(uuid) to authenticated;
