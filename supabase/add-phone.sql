-- Adiciona telefone ao perfil (opcional). Rode no SQL Editor se quiser o campo no app.
alter table public.profiles
  add column if not exists phone text;
