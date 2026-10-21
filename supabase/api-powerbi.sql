-- ============================================================
-- ATHENAS — API de resultados (pré × pós-teste) para Power BI
-- Cole TODO este arquivo no Supabase: SQL Editor → New query → Run
-- Pode rodar mais de uma vez. Depende de: pre-pos-teste.sql,
-- relatorio-nivelamento.sql e instructor-applications.sql (is_admin).
--
-- Endpoints (GET, JSON), protegidos por chave:
--   /rest/v1/rpc/api_pre_pos_respostas?p_key=CHAVE&apikey=ANON_KEY
--   /rest/v1/rpc/api_pre_pos_comparativo?p_key=CHAVE&apikey=ANON_KEY
-- O link pronto aparece para o admin em Relatórios → Antes × depois →
-- "Conectar ao Power BI". Os dados são anônimos (sem nome nem e-mail).
-- ============================================================


-- ============================================================
-- 1) Nivelamento: ignora respostas do teste antigo de demonstração
--    (só conta quem respondeu perguntas do teste atual)
-- ============================================================

create or replace function public.admin_placement_report(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin only';
  end if;

  return jsonb_build_object(
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title) order by m.sort_order)
      from public.course_modules m
      where m.course_id = p_course_id
        and exists (select 1 from public.placement_questions q where q.module_id = m.id)
    ), '[]'::jsonb),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', r.user_id,
        'full_name', p.full_name,
        'email', u.email,
        'taken_at', r.created_at,
        'correct_count', r.correct_count,
        'total_count', r.total_count,
        'dont_know_count', coalesce((r.details ->> 'dont_know_count')::int, 0),
        'modules', coalesce(r.details -> 'modules', '[]'::jsonb)
      ) order by p.full_name nulls last)
      from public.placement_results r
      left join public.profiles p on p.id = r.user_id
      left join auth.users u on u.id = r.user_id
      where r.course_id = p_course_id
        and exists (
          select 1 from public.placement_questions q
          where q.course_id = r.course_id and r.answers ? q.id::text
        )
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_placement_report(uuid) from public;
grant execute on function public.admin_placement_report(uuid) to authenticated;


-- ============================================================
-- 2) Perguntas do pré/pós-teste (espelho de src/lib/prePostSurvey.ts)
-- ============================================================

create table if not exists public.survey_questions (
  id text primary key,
  bloco text not null,
  ordem int not null,
  texto text not null,
  tipo text not null,
  alternativas jsonb,
  correta text,
  alvo text,
  ordinal boolean not null default false
);

alter table public.survey_questions enable row level security;

insert into public.survey_questions (id, bloco, ordem, texto, tipo, alternativas, correta, alvo, ordinal) values
  ('A1', 'A', 0, 'Qual é a sua faixa etária?', 'single', '["Menos de 25 anos","25 a 34 anos","35 a 44 anos","45 a 54 anos","55 anos ou mais"]'::jsonb, null, null, false),
  ('A2', 'A', 1, 'Há quanto tempo você atua na área jurídica?', 'single', '["Menos de 1 ano","1 a 3 anos","4 a 7 anos","8 a 15 anos","Mais de 15 anos"]'::jsonb, null, null, false),
  ('A3', 'A', 2, 'Como você atua profissionalmente atualmente?', 'multi', '["Advogado(a) autônomo(a)","Advogado(a) em escritório","Estagiário(a) de Direito","Técnico(a) judiciário(a)","Servidor(a) do Poder Judiciário"]'::jsonb, null, null, false),
  ('B1', 'B', 3, 'Como você avalia seu conhecimento atual sobre ferramentas de Inteligência Artificial?', 'scale', null, null, null, false),
  ('B2', 'B', 4, 'Como você avalia seu conhecimento sobre ferramentas de IA voltadas para o Direito?', 'scale', null, null, null, false),
  ('B3', 'B', 5, 'Com que frequência você utiliza ferramentas de Inteligência Artificial em sua rotina profissional?', 'scale', null, null, null, false),
  ('B4', 'B', 6, 'Quais ferramentas de Inteligência Artificial você mais utiliza?', 'multi', '["ChatGPT","Claude","Gemini","Ferramentas jurídicas específicas","Copilot","Não utilizo ferramentas de IA"]'::jsonb, null, null, false),
  ('B5', 'B', 7, 'Para quais finalidades você utiliza ou utilizaria ferramentas de Inteligência Artificial no trabalho', 'multi', '["Pesquisa jurisprudencial","Elaboração de peças processuais","Análise e revisão de contratos","Triagem e organização de documentos","Resumo de processos ou documentos extensos","Atendimento inicial a clientes","Gestão de prazos e agenda"]'::jsonb, null, null, false),
  ('B6', 'B', 8, 'Você conhece a Recomendação OAB nº 001/2024 sobre o uso de Inteligência Artificial na advocacia?', 'single', '["Sim, conheço bem","Já ouvi falar, mas conheço pouco","Não conheço","Não se aplica à minha atuação"]'::jsonb, null, 'Sim, conheço bem', false),
  ('B7', 'B', 9, 'Você conhece a Resolução do Conselho Nacional de Justiça (CNJ) nº 615/2025 sobre o uso de Inteligência Artificial no Poder Judiciário?', 'single', '["Sim, conheço bem","Já ouvi falar, mas conheço pouco","Não conheço","Não se aplica à minha atuação"]'::jsonb, null, 'Sim, conheço bem', false),
  ('B8', 'B', 10, 'O que você entende por "alucinação de IA"?', 'single', '["Não sei o que é","Quando a IA fica lenta ou trava","Quando a IA gera informações falsas apresentadas como verdadeiras","Quando a IA não entende o que foi pedido","Quando a IA repete o mesmo conteúdo várias vezes"]'::jsonb, 'Quando a IA gera informações falsas apresentadas como verdadeiras', null, false),
  ('B9', 'B', 11, 'Qual é sua maior preocupação ao usar IA no trabalho jurídico?', 'single', '["Geração de informações incorretas (alucinações)","Violação de sigilo/privacidade do cliente","Responsabilidade profissional por erros da IA","Falta de conhecimento para usar corretamente","Não tenho preocupações significativas"]'::jsonb, null, null, false),
  ('B10', 'B', 12, 'Você verifica o conteúdo gerado pela IA antes de utilizá-lo em peças ou documentos?', 'single', '["Nunca utilizei IA para isso","Não costumo verificar","Verifico às vezes","Sempre verifico antes de usar"]'::jsonb, null, 'Sempre verifico antes de usar', true),
  ('B11', 'B', 13, 'Você acredita que a IA pode impactar positivamente sua produtividade?', 'single', '["Não acredito","Acredito pouco","Neutro","Acredito bastante","Tenho certeza que sim"]'::jsonb, null, null, true),
  ('C1', 'C', 14, 'Depois da capacitação, quanto você se sente seguro(a) para usar IA no trabalho jurídico?', 'scale', null, null, null, false),
  ('C2', 'C', 15, 'Em relação ao início da capacitação, sua segurança para usar IA...', 'single', '["Diminuiu","Continuou igual","Aumentou um pouco","Aumentou muito"]'::jsonb, null, null, true),
  ('C3', 'C', 16, 'Quanto tempo por semana você estima que a IA, usada como no curso, pode economizar na sua rotina?', 'single', '["Nenhum","Até 1 hora","1 a 3 horas","3 a 5 horas","Mais de 5 horas"]'::jsonb, null, null, true),
  ('C4', 'C', 17, 'Em qual atividade a capacitação mais vai ajudar sua produtividade?', 'single', '["Pesquisa jurisprudencial","Redação de peças processuais","Análise e revisão de contratos","Organização e gestão de documentos","Atendimento a clientes"]'::jsonb, null, null, false),
  ('C5', 'C', 18, 'A capacitação atendeu às suas expectativas?', 'scale', null, null, null, false),
  ('C6', 'C', 19, 'De 0 a 10, quanto você recomendaria esta capacitação a um colega?', 'nps', null, null, null, false),
  ('C7', 'C', 20, 'Caso queira, comente o que mais mudou na sua forma de usar IA no trabalho.', 'text', null, null, null, false)
on conflict (id) do update set
  bloco = excluded.bloco,
  ordem = excluded.ordem,
  texto = excluded.texto,
  tipo = excluded.tipo,
  alternativas = excluded.alternativas,
  correta = excluded.correta,
  alvo = excluded.alvo,
  ordinal = excluded.ordinal;


-- ============================================================
-- 3) Chave da API (só o banco e o admin enxergam)
-- ============================================================

create table if not exists public.report_api_keys (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  ativa boolean not null default true,
  criada_em timestamptz not null default now()
);

alter table public.report_api_keys enable row level security;

insert into public.report_api_keys (chave)
select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where not exists (select 1 from public.report_api_keys where ativa);

create or replace function public.report_api_key_ok(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.report_api_keys where chave = p_key and ativa);
$$;

revoke all on function public.report_api_key_ok(text) from public, anon, authenticated;

-- Admin vê a chave ativa (para montar o link do Power BI)
create or replace function public.admin_report_api_key()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin only';
  end if;
  return (select chave from public.report_api_keys where ativa order by criada_em desc limit 1);
end;
$$;

-- Admin troca a chave (o link antigo para de funcionar)
create or replace function public.admin_rotate_report_api_key()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin only';
  end if;
  update public.report_api_keys set ativa = false where ativa;
  insert into public.report_api_keys (chave) values (v_key);
  return v_key;
end;
$$;

revoke all on function public.admin_report_api_key() from public;
revoke all on function public.admin_rotate_report_api_key() from public;
grant execute on function public.admin_report_api_key() to authenticated;
grant execute on function public.admin_rotate_report_api_key() to authenticated;


-- ============================================================
-- 4) API: uma linha por resposta marcada (formato ideal para BI)
-- ============================================================

create or replace function public.api_pre_pos_respostas(p_key text)
returns table (
  fase text,
  resposta_id uuid,
  respondido_em timestamptz,
  curso text,
  pergunta_id text,
  bloco text,
  ordem int,
  pergunta text,
  resposta text,
  valor_numerico numeric,
  correta boolean,
  indicador boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.report_api_key_ok(p_key) then
    raise exception 'invalid api key' using errcode = '42501';
  end if;

  return query
  with resp as (
    select 'pre'::text as f, r.id as rid, coalesce(r.submitted_at, r.imported_at) as quando,
           null::text as curso_titulo, r.answers as ans
    from public.pre_test_responses r
    union all
    select 'pos', r.id, r.created_at, c.title, r.answers
    from public.post_test_responses r
    join public.courses c on c.id = r.course_id
  )
  select
    resp.f,
    resp.rid,
    resp.quando,
    resp.curso_titulo,
    q.id,
    q.bloco,
    q.ordem,
    q.texto,
    v.val,
    case
      when q.tipo in ('scale', 'nps') and v.val ~ '^-?[0-9]+(\.[0-9]+)?$' then v.val::numeric
      when q.ordinal and q.alternativas is not null then (
        select o.idx::numeric
        from jsonb_array_elements_text(q.alternativas) with ordinality as o(txt, idx)
        where o.txt = v.val
      )
    end,
    case when q.correta is not null then v.val = q.correta end,
    v.val = coalesce(q.correta, q.alvo)
  from resp
  join public.survey_questions q on resp.ans ? q.id
  cross join lateral (
    select x as val
    from jsonb_array_elements_text(
      case when jsonb_typeof(resp.ans -> q.id) = 'array' then resp.ans -> q.id
           else jsonb_build_array(resp.ans ->> q.id) end
    ) as x
  ) v
  where coalesce(v.val, '') <> ''
  order by resp.f desc, resp.quando, q.ordem;
end;
$$;


-- ============================================================
-- 5) API: comparativo pronto (% antes × % depois por alternativa)
-- ============================================================

create or replace function public.api_pre_pos_comparativo(p_key text)
returns table (
  pergunta_id text,
  bloco text,
  ordem int,
  pergunta text,
  alternativa text,
  antes_n int,
  antes_total int,
  antes_pct numeric,
  depois_n int,
  depois_total int,
  depois_pct numeric,
  diferenca_pp numeric,
  indicador boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.report_api_key_ok(p_key) then
    raise exception 'invalid api key' using errcode = '42501';
  end if;

  return query
  with base as (
    select b.fase as f, b.resposta_id as rid, b.pergunta_id as pid, b.resposta as alt
    from public.api_pre_pos_respostas(p_key) b
  ),
  totais as (
    select base.f, base.pid, count(distinct base.rid)::int as total
    from base group by 1, 2
  ),
  contagem as (
    select base.f, base.pid, base.alt, count(distinct base.rid)::int as n
    from base
    join public.survey_questions q on q.id = base.pid and q.tipo <> 'text'
    group by 1, 2, 3
  ),
  chaves as (select distinct contagem.pid, contagem.alt from contagem)
  select
    q.id,
    q.bloco,
    q.ordem,
    q.texto,
    k.alt,
    coalesce(a.n, 0),
    coalesce(ta.total, 0),
    case when coalesce(ta.total, 0) > 0 then round(100.0 * coalesce(a.n, 0) / ta.total, 1) end,
    coalesce(d.n, 0),
    coalesce(td.total, 0),
    case when coalesce(td.total, 0) > 0 then round(100.0 * coalesce(d.n, 0) / td.total, 1) end,
    case when coalesce(ta.total, 0) > 0 and coalesce(td.total, 0) > 0
         then round(100.0 * coalesce(d.n, 0) / td.total - 100.0 * coalesce(a.n, 0) / ta.total, 1) end,
    k.alt = coalesce(q.correta, q.alvo)
  from chaves k
  join public.survey_questions q on q.id = k.pid
  left join contagem a on a.f = 'pre' and a.pid = k.pid and a.alt = k.alt
  left join contagem d on d.f = 'pos' and d.pid = k.pid and d.alt = k.alt
  left join totais ta on ta.f = 'pre' and ta.pid = k.pid
  left join totais td on td.f = 'pos' and td.pid = k.pid
  order by q.ordem, k.alt;
end;
$$;

-- Power BI chama sem login (com a anon key); a chave da API protege os dados
revoke all on function public.api_pre_pos_respostas(text) from public;
revoke all on function public.api_pre_pos_comparativo(text) from public;
grant execute on function public.api_pre_pos_respostas(text) to anon, authenticated;
grant execute on function public.api_pre_pos_comparativo(text) to anon, authenticated;

notify pgrst, 'reload schema';

-- Conferência: 21 perguntas cadastradas e 1 chave ativa
select (select count(*) from public.survey_questions) as perguntas,
       (select count(*) from public.report_api_keys where ativa) as chaves_ativas;
