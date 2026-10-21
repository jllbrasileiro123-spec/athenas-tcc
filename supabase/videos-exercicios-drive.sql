-- ============================================================
-- ATHENAS — Vídeos práticos dos exercícios (links do Google Drive)
-- Coloca o vídeo de cada módulo no "Exercício prático" (item_kind 'tutorial').
-- Os arquivos precisam estar compartilhados como
-- "Qualquer pessoa com o link" no Drive.
-- Pode rodar mais de uma vez.
-- ============================================================

update public.lessons l
set video_url = v.url,
    duration_minutes = 2
from public.course_modules m,
  (values
    (0, 'https://drive.google.com/file/d/1woFLLgkkgKQjGuSeTeEOdN6PXPgxNjW_/view'),
    (1, 'https://drive.google.com/file/d/1Dowe6UOBDOUUBm54UurqwGrY1v4iXpwa/view'),
    (2, 'https://drive.google.com/file/d/1oiyHk_lxSBefv7cNGGwBXZoQXCZu0DxU/view'),
    (3, 'https://drive.google.com/file/d/1bt_hxMOTwPQ6ADywzzkn2uVcljJdqvCw/view')
  ) as v(modulo, url)
where m.id = l.module_id
  and m.course_id = 'e952fa43-8221-4964-b89e-f875212f53aa' -- IA no Cotidiano Jurídico
  and m.sort_order = v.modulo
  and l.item_kind = 'tutorial';

-- Confere: deve listar os 4 exercícios práticos com o link
select m.sort_order + 1 as modulo, l.title, l.video_url
from public.lessons l
join public.course_modules m on m.id = l.module_id
where m.course_id = 'e952fa43-8221-4964-b89e-f875212f53aa'
  and l.item_kind = 'tutorial'
order by m.sort_order;
