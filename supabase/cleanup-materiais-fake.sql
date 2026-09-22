-- Remove apostilas/PDFs de demo que apontavam para vídeo (placeholders antigos)
delete from public.module_materials
where url = '/demo/athenas-demo.mp4'
   or title ilike '%Guia de primeiros passos%'
   or title ilike '%Tabela de XP%'
   or title ilike '%Checklist de automação%';
