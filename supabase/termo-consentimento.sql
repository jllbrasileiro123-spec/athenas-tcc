-- ============================================================
-- ATHENAS — Termo de Consentimento Livre e Esclarecido (TCLE)
-- • Guarda o aceite dos Termos de Uso e a decisão de participar
--   (ou não) da pesquisa do TCC, com a versão do termo e a data
-- • Registro eletrônico do consentimento (Resolução CNS 510/2016, art. 15)
-- • O aluno só vê e altera o próprio registro; o admin vê todos
-- Ver quem consentiu: Supabase → Table Editor → consentimentos
-- Depende de: instructor-applications.sql (is_admin)
-- Cole no SQL Editor do Supabase e rode. Pode rodar mais de uma vez.
-- ============================================================

create table if not exists public.consentimentos (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  versao text not null,
  aceita_termos boolean not null default false,
  participa_pesquisa boolean not null default false,
  respondido_em timestamptz not null default now()
);

alter table public.consentimentos enable row level security;

drop policy if exists "Aluno vê o próprio consentimento" on public.consentimentos;
create policy "Aluno vê o próprio consentimento"
  on public.consentimentos for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Aluno registra o próprio consentimento" on public.consentimentos;
create policy "Aluno registra o próprio consentimento"
  on public.consentimentos for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Aluno altera o próprio consentimento" on public.consentimentos;
create policy "Aluno altera o próprio consentimento"
  on public.consentimentos for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Resumo para o texto do TCC: quantos aceitaram participar da pesquisa
--   select participa_pesquisa, count(*) from public.consentimentos group by 1;

notify pgrst, 'reload schema';
