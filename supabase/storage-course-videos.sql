-- Rode no SQL Editor DEPOIS do schema.sql (Storage → vídeos das aulas)
-- Bucket público para o player HTML5; upload só na pasta do próprio usuário.

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-videos', 'course-videos', true, 157286400)
on conflict (id) do update set
  public = true,
  file_size_limit = 157286400;

-- 157286400 bytes = 150 MB por arquivo

create policy "Vídeos: leitura pública"
  on storage.objects for select
  using (bucket_id = 'course-videos');

create policy "Vídeos: upload do instrutor"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'course-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Vídeos: atualizar próprio"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'course-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Vídeos: apagar próprio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'course-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
