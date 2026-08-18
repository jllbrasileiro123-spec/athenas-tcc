-- Solicitações para virar instrutor + revisão de cursos (modelo curado)
-- Rode no Supabase: SQL Editor → New query → Run

-- ========== Solicitações de instrutor ==========
create table if not exists public.instructor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expertise text not null,
  bio text not null,
  portfolio_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists instructor_applications_one_pending
  on public.instructor_applications (user_id)
  where status = 'pending';

create index if not exists instructor_applications_status_idx
  on public.instructor_applications (status, created_at desc);

alter table public.instructor_applications enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Usuário vê só as próprias solicitações
create policy "Usuário vê próprias solicitações"
  on public.instructor_applications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Usuário cria solicitação"
  on public.instructor_applications for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  );

-- Só admin atualiza status
create policy "Admin atualiza solicitações"
  on public.instructor_applications for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Impedir aluno de se promover a instrutor no próprio perfil
-- (atualizações pelo SQL Editor / service_role, sem auth.uid(), continuam permitidas)
create or replace function public.prevent_role_self_escalate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- Sem sessão (SQL Editor) ou já admin: ok
    if auth.uid() is null or public.is_admin() then
      return new;
    end if;
    -- Usuário autenticado não-admin não pode mudar o próprio role
    if auth.uid() = old.id then
      raise exception 'Não é permitido alterar o próprio papel (role).';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalate on public.profiles;
create trigger profiles_prevent_role_escalate
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalate();

-- Aprovar / recusar solicitação (atualiza role se aprovado)
create or replace function public.review_instructor_application(
  application_id uuid,
  new_status text,
  note text default null
)
returns public.instructor_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.instructor_applications;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin pode revisar solicitações';
  end if;
  if new_status not in ('approved', 'rejected') then
    raise exception 'Status inválido';
  end if;

  update public.instructor_applications
  set
    status = new_status,
    admin_note = note,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = application_id and status = 'pending'
  returning * into app;

  if app.id is null then
    raise exception 'Solicitação não encontrada ou já revisada';
  end if;

  if new_status = 'approved' then
    update public.profiles set role = 'instructor' where id = app.user_id;
  end if;

  return app;
end;
$$;

grant execute on function public.review_instructor_application(uuid, text, text) to authenticated;

-- ========== Revisão de cursos (publicação curada) ==========
alter table public.courses
  add column if not exists review_status text not null default 'draft'
  check (review_status in ('draft', 'pending_review', 'approved', 'rejected'));

alter table public.courses
  add column if not exists review_note text;

-- Cursos só ficam no catálogo se published=true (continua); instrutor envia para revisão
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
    review_status = 'pending_review',
    published = false,
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

create or replace function public.review_course(
  course_id uuid,
  new_status text,
  note text default null
)
returns public.courses
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.courses;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin pode revisar cursos';
  end if;
  if new_status not in ('approved', 'rejected') then
    raise exception 'Status inválido';
  end if;

  update public.courses
  set
    review_status = new_status,
    published = (new_status = 'approved'),
    review_note = note,
    updated_at = now()
  where id = course_id and review_status = 'pending_review'
  returning * into c;

  if c.id is null then
    raise exception 'Curso não encontrado ou não está em revisão';
  end if;
  return c;
end;
$$;

grant execute on function public.submit_course_for_review(uuid) to authenticated;
grant execute on function public.review_course(uuid, text, text) to authenticated;

-- Admin vê cursos em revisão
create policy "Admin vê todos os cursos"
  on public.courses for select to authenticated
  using (public.is_admin());

-- Depois de rodar este script, promova pelo menos um usuário a admin:
-- update public.profiles set role = 'admin' where id = '<uuid-do-seu-usuario>';
