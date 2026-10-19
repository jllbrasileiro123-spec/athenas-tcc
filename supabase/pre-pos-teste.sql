-- ============================================================
-- ATHENAS — Pré-teste × Pós-teste da pesquisa (relatório do admin)
-- Cole TODO este arquivo no Supabase: SQL Editor → New query → Run
-- Pode rodar mais de uma vez.
-- Depende de: schema.sql e instructor-applications.sql (is_admin)
--
-- • post_test_responses: pós-teste respondido dentro do app (fim do Módulo 4)
-- • pre_test_responses:  pré-teste do Google Forms, importado pelo admin (CSV)
-- As respostas ficam em jsonb com as chaves das perguntas (A1, B1, ..., C7),
-- definidas em src/lib/prePostSurvey.ts.
-- ============================================================

create table if not exists public.post_test_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists post_test_responses_course_idx
  on public.post_test_responses (course_id, created_at desc);

alter table public.post_test_responses enable row level security;

drop policy if exists "Aluno ve proprio pos-teste, admin ve todos" on public.post_test_responses;
create policy "Aluno ve proprio pos-teste, admin ve todos"
  on public.post_test_responses for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Só quem está matriculado responde, e só em nome próprio
drop policy if exists "Aluno matriculado envia pos-teste" on public.post_test_responses;
create policy "Aluno matriculado envia pos-teste"
  on public.post_test_responses for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid() and e.course_id = post_test_responses.course_id
    )
  );

drop policy if exists "Aluno edita proprio pos-teste" on public.post_test_responses;
create policy "Aluno edita proprio pos-teste"
  on public.post_test_responses for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- Pré-teste importado (anônimo: não tem user_id)
create table if not exists public.pre_test_responses (
  id uuid primary key default gen_random_uuid(),
  answers jsonb not null,
  submitted_at timestamptz,
  imported_at timestamptz not null default now(),
  imported_by uuid references public.profiles (id) on delete set null
);

alter table public.pre_test_responses enable row level security;

drop policy if exists "Admin gerencia pre-teste" on public.pre_test_responses;
create policy "Admin gerencia pre-teste"
  on public.pre_test_responses for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

notify pgrst, 'reload schema';
