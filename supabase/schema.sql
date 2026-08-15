-- Cole TODO este arquivo no Supabase: SQL Editor → New query → Run
-- NÃO cole o caminho do arquivo — só o SQL abaixo.

-- Perfis ligados ao auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  role text not null default 'student' check (role in ('student', 'instructor', 'admin')),
  created_at timestamptz not null default now()
);

-- Cursos
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  thumbnail_url text,
  price numeric(10, 2) not null default 0,
  level text default 'iniciante' check (level in ('iniciante', 'intermediario', 'avancado')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Aulas / módulos
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  duration_minutes int default 0,
  sort_order int not null default 0,
  is_preview boolean not null default false,
  created_at timestamptz not null default now()
);

-- Matrículas (aluno no curso)
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- Progresso por aula
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

-- Trigger: criar perfil ao registrar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

-- Profiles
create policy "Perfis visíveis para autenticados"
  on public.profiles for select to authenticated using (true);

create policy "Usuário edita próprio perfil"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- Courses: públicos se publicados
create policy "Cursos publicados visíveis"
  on public.courses for select
  using (published = true or instructor_id = auth.uid());

create policy "Instrutor cria curso"
  on public.courses for insert to authenticated
  with check (instructor_id = auth.uid());

create policy "Instrutor edita próprio curso"
  on public.courses for update to authenticated
  using (instructor_id = auth.uid());

create policy "Instrutor remove próprio curso"
  on public.courses for delete to authenticated
  using (instructor_id = auth.uid());

-- Lessons
create policy "Aulas de cursos publicados ou do instrutor"
  on public.lessons for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id
        and (c.published = true or c.instructor_id = auth.uid())
    )
  );

create policy "Instrutor gerencia aulas"
  on public.lessons for all to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.instructor_id = auth.uid()
    )
  );

-- Enrollments
create policy "Usuário vê próprias matrículas"
  on public.enrollments for select to authenticated
  using (user_id = auth.uid());

create policy "Usuário se matricula"
  on public.enrollments for insert to authenticated
  with check (user_id = auth.uid());

-- Progress
create policy "Usuário vê próprio progresso"
  on public.lesson_progress for select to authenticated
  using (user_id = auth.uid());

create policy "Usuário atualiza próprio progresso"
  on public.lesson_progress for all to authenticated
  using (user_id = auth.uid());

-- Índices
create index courses_instructor_idx on public.courses (instructor_id);
create index lessons_course_idx on public.lessons (course_id, sort_order);
create index enrollments_user_idx on public.enrollments (user_id);

-- Trilha, XP, sequência e moeda: rode também supabase/gamification.sql
