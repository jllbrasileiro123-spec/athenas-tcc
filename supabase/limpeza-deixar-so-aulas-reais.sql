-- ============================================================
-- ATHENAS — Deixa no banco só o conteúdo real do TCC
-- (IA no cotidiano jurídico). Rode no SQL Editor do Supabase.
--
-- FICA:
--   Curso  e952fa43… → renomeado para o curso do TCC
--   Módulo 1 → "Fundamentos de IA e o Cenário Jurídico Brasileiro"
--     • Aula 1 (vídeo no Storage: course-videos/seed/modulo1/explicacao.mp4)
--     • Material de apoio — Módulo 1 (Word, no Storage)
--
-- SAI (dados de teste/demo):
--   Cursos "kinmdfvsfsf", "Fundamentos de IA" (demo), "Produtividade com
--   automações", "Nivelamento grátis (teste do popup)"; Módulos 2–4;
--   tutorial/podcast/exercício demo do Módulo 1; materiais falsos.
--   Aulas, matrículas, progresso, quizzes e materiais ligados a esses
--   itens caem junto (on delete cascade).
-- ============================================================

begin;

-- 1. Cursos de teste/demo
delete from public.courses
where id in (
  '6f15ef40-6232-48b8-a5d6-a4081a2f1063', -- kinmdfvsfsf
  '96b67794-19f8-4ec4-8e80-49128b1befca'  -- Nivelamento grátis (teste do popup)
)
or title in (
  'ATHENAS · Fundamentos de IA',
  'ATHENAS · Produtividade com automações'
);

-- 2. Módulos 2, 3 e 4 do curso que fica
delete from public.course_modules
where course_id = 'e952fa43-8221-4964-b89e-f875212f53aa'
  and id <> 'f824ddc7-3e2f-4809-854e-dea17fd405b0';

-- 3. Tutorial, podcast e exercício demo do Módulo 1
delete from public.lessons
where id in (
  '43538113-7c64-49ec-a8c9-3ae950e3712b', -- M1 · Tutorial (vídeo demo)
  '6dc3ffd2-aea5-4f26-8794-e46aac15724f', -- M1 · Podcast (áudio demo)
  'd04b51c8-aca6-4c07-a7d0-7dfc44ff459b'  -- M1 · Exercício (perguntas demo)
);

-- 4. Materiais falsos do Módulo 1 (fica só o Word real)
delete from public.module_materials
where module_id = 'f824ddc7-3e2f-4809-854e-dea17fd405b0'
  and id <> '6d652175-e738-4894-86b0-afd256c8ae14';

-- 5. Renomeia para o conteúdo real do TCC
update public.courses
set title = 'IA no Cotidiano Jurídico',
    description = 'Capacitação em uso responsável de Inteligência Artificial na prática jurídica: fundamentos, limitações, casos reais e regulamentação no Brasil.'
where id = 'e952fa43-8221-4964-b89e-f875212f53aa';

update public.course_modules
set title = 'Módulo 1 — Fundamentos de IA e o Cenário Jurídico Brasileiro',
    description = 'O que é IA, ML, Deep Learning e LLM; alucinações e vieses; casos reais no Judiciário; OAB 001/2024, CNJ 615/2025, LGPD e PL 2.338/2023.'
where id = 'f824ddc7-3e2f-4809-854e-dea17fd405b0';

update public.lessons
set title = 'Aula 1 — Fundamentos de IA e o Cenário Jurídico Brasileiro',
    description = 'Teste de Turing, IA × Machine Learning × Deep Learning × LLM, alucinações, vieses e o panorama regulatório brasileiro. Veja o material de apoio em Word.'
where id = 'c0bb26a7-1c08-4966-b001-0896048bc48c';

commit;

-- Conferência: deve sobrar 1 curso, 1 módulo, 1 aula e 1 material
select c.title as curso, m.title as modulo, l.title as aula
from public.courses c
join public.course_modules m on m.course_id = c.id
join public.lessons l on l.module_id = m.id;
