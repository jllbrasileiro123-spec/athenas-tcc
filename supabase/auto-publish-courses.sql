-- Publica formações na hora, sem fila de revisão.
-- Rode no SQL Editor do Supabase se algum curso continuar "Em revisão".

update public.courses
set
  published = true,
  review_status = 'approved',
  review_note = null,
  updated_at = now()
where review_status = 'pending_review';

create or replace function public.submit_course_for_review(course_id uuid)
returns public.courses
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.courses;
begin
  update public.courses
  set
    review_status = 'approved',
    published = true,
    review_note = null,
    updated_at = now()
  where id = course_id and instructor_id = auth.uid()
  returning * into c;

  if c.id is null then
    raise exception 'Curso não encontrado';
  end if;
  return c;
end;
$$;
