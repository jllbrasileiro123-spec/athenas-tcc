-- Rode no SQL Editor (Storage → materiais: PDF, Word, apostilas)
-- Bucket público; upload na pasta do próprio usuário (instrutor).

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-materials', 'course-materials', true, 52428800)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800;

-- 52428800 bytes = 50 MB por arquivo (Word/PDF)

do $$ begin
  create policy "Materiais: leitura pública"
    on storage.objects for select
    using (bucket_id = 'course-materials');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Materiais: upload do instrutor"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'course-materials'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Materiais: atualizar próprio"
    on storage.objects for update to authenticated
    using (
      bucket_id = 'course-materials'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Materiais: apagar próprio"
    on storage.objects for delete to authenticated
    using (
      bucket_id = 'course-materials'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;
