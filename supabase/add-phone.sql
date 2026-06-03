-- Rode no SQL Editor se ainda não tiver a coluna de telefone
alter table public.profiles add column if not exists phone text;
