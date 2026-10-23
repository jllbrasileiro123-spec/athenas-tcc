-- ============================================================
-- ATHENAS — Telefone dos usuários
-- • Coluna phone na tabela profiles (perfil de cada usuário)
-- • O cadastro passa a pedir o telefone e ele já entra no perfil
-- • O aluno pode editar o telefone no menu do perfil
-- Ver os telefones: Supabase → Table Editor → profiles (coluna phone)
-- Cole no SQL Editor do Supabase e rode. Pode rodar mais de uma vez.
-- ============================================================

alter table public.profiles
  add column if not exists phone text;

-- Perfil criado no cadastro já recebe o telefone informado
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    nullif(trim(new.raw_user_meta_data->>'phone'), '')
  );
  return new;
end;
$$;

-- Quem se cadastrou antes desta mudança e informou telefone nos dados da conta
update public.profiles p
set phone = nullif(trim(u.raw_user_meta_data->>'phone'), '')
from auth.users u
where u.id = p.id
  and p.phone is null
  and nullif(trim(u.raw_user_meta_data->>'phone'), '') is not null;

notify pgrst, 'reload schema';

-- Conferência: usuários e telefones
select p.full_name, u.email, p.phone, p.role, u.created_at::date as cadastro
from public.profiles p
join auth.users u on u.id = p.id
order by u.created_at desc;
