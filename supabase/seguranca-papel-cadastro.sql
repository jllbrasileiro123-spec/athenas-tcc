-- ============================================================
-- ATHENAS — Cadastro nunca cria administrador
--
-- Antes, o papel (role) do novo usuário vinha dos dados enviados pelo
-- próprio navegador no cadastro. Como a chave pública do Supabase fica no
-- site, alguém poderia se cadastrar pela API já como 'admin' e ver os
-- relatórios com nomes, e-mails e telefones dos alunos.
--
-- Agora o cadastro só aceita 'student' ou 'instructor'. Administrador só
-- é definido por quem tem acesso ao banco (SQL Editor).
-- Pode rodar mais de uma vez.
-- ============================================================

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
    case when new.raw_user_meta_data->>'role' = 'instructor' then 'instructor' else 'student' end,
    nullif(trim(new.raw_user_meta_data->>'phone'), '')
  );
  return new;
end;
$$;

-- Confere se alguém já virou admin pelo cadastro: a lista deve ter só vocês.
select p.full_name, u.email, u.created_at::date as cadastro
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin'
order by u.created_at;
