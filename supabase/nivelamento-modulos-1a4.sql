-- ============================================================
-- ATHENAS — Avaliação diagnóstica (nivelamento) dos Módulos 1 a 4
-- Fonte: Avaliacao_Diagnostica_Modulos1a4.docx (questões, gabarito e regras).
--
-- 20 questões, 5 por módulo, cada uma com a alternativa "Não sei".
-- Regras para dispensar (pular) um módulo:
--   • Módulos 1 e 2: 4 ou 5 acertos de 5.
--   • Módulo 2: só se o Módulo 1 também tiver 4 ou mais.
--   • Módulo 3 (ética, sigilo, LGPD): só com 5 de 5.
--   • Módulo 4: 5 de 5 e pelo menos 4 em cada um dos outros. Dispensa só
--     a aula e o exercício prático; o quiz final continua obrigatório.
-- O resultado mostra, por módulo, os tópicos das questões erradas.
--
-- Cursos sem regras próprias continuam na regra de 70% por módulo.
-- Pode rodar mais de uma vez: recria as perguntas do zero.
-- ============================================================

-- 1. Regras de dispensa por módulo (vazias = regra antiga de 70%)
alter table public.course_modules
  add column if not exists placement_min_hits int,
  add column if not exists placement_prereq_module_id uuid references public.course_modules (id) on delete set null,
  add column if not exists placement_prereq_min_hits int,
  add column if not exists placement_others_min_hits int,
  add column if not exists placement_keep_kinds text[] not null default '{}';

comment on column public.course_modules.placement_min_hits is
  'Acertos mínimos no nivelamento para dispensar o módulo (null = 70%).';
comment on column public.course_modules.placement_prereq_module_id is
  'Módulo que também precisa de placement_prereq_min_hits acertos para dispensar este.';
comment on column public.course_modules.placement_others_min_hits is
  'Acertos mínimos exigidos em cada um dos outros módulos para dispensar este.';
comment on column public.course_modules.placement_keep_kinds is
  'Tipos de item (item_kind) que continuam obrigatórios mesmo com o módulo dispensado.';

-- 2. Tópico a revisar quando a questão é errada + detalhe do resultado
alter table public.placement_questions
  add column if not exists review_topic text;

alter table public.placement_results
  add column if not exists details jsonb;

-- 3. Envio do teste com as regras por módulo
create or replace function public.submit_placement_test(
  p_course_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec record;
  unlocked uuid[] := '{}';
  unlocked_modules uuid[] := '{}';
  total_correct int := 0;
  total_questions int := 0;
  total_dont_know int := 0;
  has_modules boolean;
  v_stats jsonb := '{}'::jsonb;
  v_modules jsonb := '[]'::jsonb;
  v_pass boolean;
  v_partial boolean;
  v_next_id uuid;
  v_next_title text;
  v_next_module text;
  v_module_total int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and (
        c.published = true
        or c.instructor_id = uid
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.user_id = uid
        )
      )
  ) then
    raise exception 'course not found';
  end if;

  select count(*)::int into total_questions
  from public.placement_questions
  where course_id = p_course_id;

  if total_questions = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'no_questions',
      'unlocked_count', 0,
      'lesson_count', 0
    );
  end if;

  select exists (
    select 1 from public.course_modules where course_id = p_course_id
  ) into has_modules;

  if has_modules then
    -- ---------- Acertos, "Não sei" e tópicos errados por módulo ----------
    for rec in
      select
        coalesce(q.module_id, l.module_id) as module_id,
        count(*)::int as total,
        count(*) filter (
          where nullif(p_answers ->> q.id::text, '')::int = q.correct_index
        )::int as hits,
        count(*) filter (
          where q.choices ->> nullif(p_answers ->> q.id::text, '')::int = 'Não sei'
        )::int as dont_know,
        coalesce(jsonb_agg(distinct q.review_topic) filter (
          where q.review_topic is not null
            and nullif(p_answers ->> q.id::text, '')::int is distinct from q.correct_index
        ), '[]'::jsonb) as review_topics
      from public.placement_questions q
      left join public.lessons l on l.id = q.lesson_id
      where q.course_id = p_course_id
      group by coalesce(q.module_id, l.module_id)
    loop
      total_correct := total_correct + rec.hits;
      total_dont_know := total_dont_know + rec.dont_know;
      if rec.module_id is not null then
        v_stats := v_stats || jsonb_build_object(rec.module_id::text, jsonb_build_object(
          'total', rec.total,
          'hits', rec.hits,
          'dont_know', rec.dont_know,
          'review_topics', rec.review_topics
        ));
      end if;
    end loop;

    -- ---------- Decide quais módulos são dispensados ----------
    for rec in
      select m.*
      from public.course_modules m
      where m.course_id = p_course_id
        and v_stats ? m.id::text
      order by m.sort_order
    loop
      v_pass := case
        when rec.placement_min_hits is null then
          (v_stats -> rec.id::text ->> 'hits')::numeric
            / greatest((v_stats -> rec.id::text ->> 'total')::numeric, 1) >= 0.7
        else (v_stats -> rec.id::text ->> 'hits')::int >= rec.placement_min_hits
      end;

      if v_pass and rec.placement_prereq_module_id is not null then
        v_pass := coalesce(
          (v_stats -> rec.placement_prereq_module_id::text ->> 'hits')::int, 0
        ) >= coalesce(rec.placement_prereq_min_hits, 0);
      end if;

      if v_pass and rec.placement_others_min_hits is not null then
        v_pass := not exists (
          select 1 from jsonb_each(v_stats) s
          where s.key <> rec.id::text
            and (s.value ->> 'hits')::int < rec.placement_others_min_hits
        );
      end if;

      v_partial := v_pass and exists (
        select 1 from public.lessons l
        where l.module_id = rec.id
          and public.module_item_required(l.item_kind)
          and coalesce(l.item_kind, 'explicacao') = any (rec.placement_keep_kinds)
      );

      if v_pass then
        if not v_partial then
          unlocked_modules := unlocked_modules || rec.id;
        end if;

        -- Conclui os itens obrigatórios do módulo dominado (menos os mantidos)
        insert into public.lesson_progress (user_id, lesson_id, completed, completed_at, via_placement_test)
        select uid, l.id, true, now(), true
        from public.lessons l
        where l.module_id = rec.id
          and public.module_item_required(l.item_kind)
          and not (coalesce(l.item_kind, 'explicacao') = any (rec.placement_keep_kinds))
        on conflict (user_id, lesson_id) do update
          set completed = true,
              completed_at = coalesce(lesson_progress.completed_at, now()),
              via_placement_test = true;

        unlocked := unlocked || array(
          select l.id from public.lessons l
          where l.module_id = rec.id
            and public.module_item_required(l.item_kind)
            and not (coalesce(l.item_kind, 'explicacao') = any (rec.placement_keep_kinds))
        );
      end if;

      v_modules := v_modules || jsonb_build_array(
        (v_stats -> rec.id::text) || jsonb_build_object(
          'module_id', rec.id,
          'module_title', rec.title,
          'skipped', v_pass,
          'partial', v_partial
        )
      );
    end loop;

    select count(*)::int into v_module_total
    from public.course_modules
    where course_id = p_course_id;
  else
    -- ---------- Regra por aula (formações sem módulos) ----------
    for rec in
      select
        q.lesson_id,
        count(*)::int as total,
        count(*) filter (
          where nullif(p_answers ->> q.id::text, '')::int = q.correct_index
        )::int as hits
      from public.placement_questions q
      where q.course_id = p_course_id
      group by q.lesson_id
    loop
      total_correct := total_correct + rec.hits;

      if rec.lesson_id is not null
         and rec.total > 0
         and (rec.hits::numeric / rec.total::numeric) >= 0.7
      then
        unlocked := unlocked || rec.lesson_id;

        insert into public.lesson_progress (user_id, lesson_id, completed, completed_at, via_placement_test)
        values (uid, rec.lesson_id, true, now(), true)
        on conflict (user_id, lesson_id) do update
          set completed = true,
              completed_at = coalesce(lesson_progress.completed_at, now()),
              via_placement_test = true;
      end if;
    end loop;

    v_module_total := 0;
  end if;

  insert into public.placement_results (user_id, course_id, answers, unlocked_lessons, correct_count, total_count, details)
  values (uid, p_course_id, p_answers, unlocked, total_correct, total_questions,
          jsonb_build_object('modules', v_modules, 'dont_know_count', total_dont_know))
  on conflict (user_id, course_id) do update
    set answers = excluded.answers,
        unlocked_lessons = excluded.unlocked_lessons,
        correct_count = excluded.correct_count,
        total_count = excluded.total_count,
        details = excluded.details,
        created_at = now();

  -- Onde o aluno começa agora
  select l.id, l.title, coalesce(m.title, '')
    into v_next_id, v_next_title, v_next_module
  from public.lessons l
  left join public.course_modules m on m.id = l.module_id
  left join public.lesson_progress p
    on p.lesson_id = l.id and p.user_id = uid
  where l.course_id = p_course_id
    and coalesce(p.completed, false) = false
    and public.module_item_required(l.item_kind)
  order by coalesce(m.sort_order, 0), l.sort_order
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'correct_count', total_correct,
    'total_count', total_questions,
    'dont_know_count', total_dont_know,
    'modules', v_modules,
    'unlocked_lessons', to_jsonb(unlocked),
    'unlocked_count', coalesce(array_length(unlocked, 1), 0),
    'unlocked_modules', to_jsonb(unlocked_modules),
    'unlocked_module_count', coalesce(array_length(unlocked_modules, 1), 0),
    'module_count', v_module_total,
    'lesson_count', (
      select count(*)::int
      from public.lessons l
      where l.course_id = p_course_id
        and public.module_item_required(l.item_kind)
    ),
    'next_lesson_id', v_next_id,
    'next_lesson_title', v_next_title,
    'next_module_title', v_next_module
  );
end;
$$;

revoke all on function public.submit_placement_test(uuid, jsonb) from public;
grant execute on function public.submit_placement_test(uuid, jsonb) to authenticated;

-- 4. Regras e perguntas do curso do TCC
do $$
declare
  v_course uuid := 'e952fa43-8221-4964-b89e-f875212f53aa'; -- IA no Cotidiano Jurídico
  v_mod1 uuid;
  v_mod2 uuid;
  v_mod3 uuid;
  v_mod4 uuid;
  v_nao_sei text := 'Não sei';
begin
  select id into v_mod1 from public.course_modules where course_id = v_course and sort_order = 0;
  select id into v_mod2 from public.course_modules where course_id = v_course and sort_order = 1;
  select id into v_mod3 from public.course_modules where course_id = v_course and sort_order = 2;
  select id into v_mod4 from public.course_modules where course_id = v_course and sort_order = 3;

  if v_mod1 is null or v_mod2 is null or v_mod3 is null or v_mod4 is null then
    raise exception 'O curso precisa ter os Módulos 1 a 4 antes do nivelamento.';
  end if;

  update public.course_modules
  set placement_min_hits = 4,
      placement_prereq_module_id = null,
      placement_prereq_min_hits = null,
      placement_others_min_hits = null,
      placement_keep_kinds = '{}'
  where id = v_mod1;

  update public.course_modules
  set placement_min_hits = 4,
      placement_prereq_module_id = v_mod1,
      placement_prereq_min_hits = 4,
      placement_others_min_hits = null,
      placement_keep_kinds = '{}'
  where id = v_mod2;

  update public.course_modules
  set placement_min_hits = 5,
      placement_prereq_module_id = null,
      placement_prereq_min_hits = null,
      placement_others_min_hits = null,
      placement_keep_kinds = '{}'
  where id = v_mod3;

  update public.course_modules
  set placement_min_hits = 5,
      placement_prereq_module_id = null,
      placement_prereq_min_hits = null,
      placement_others_min_hits = 4,
      placement_keep_kinds = '{exercicio}'
  where id = v_mod4;

  delete from public.placement_questions where course_id = v_course;

  insert into public.placement_questions
    (course_id, module_id, prompt, choices, correct_index, sort_order, review_topic)
  values
  -- ---------- Módulo 1 ----------
  (v_course, v_mod1,
   'Quando um modelo de linguagem (LLM) gera uma resposta em texto, o que ele faz essencialmente?',
   jsonb_build_array(
     'Consulta um banco de dados de fatos verificados e copia a resposta',
     'Calcula, estatisticamente, qual sequência de palavras é a mais provável a seguir',
     'Raciocina como uma pessoa e confere cada informação antes de responder',
     'Pesquisa na internet em tempo real a cada pergunta',
     v_nao_sei),
   1, 0, '1.0 — LLM'),
  (v_course, v_mod1,
   'Um sistema que responde apenas por regras fixas programadas ("se o cliente disser X, responda Y"), sem nenhum aprendizado, pode ser considerado IA?',
   jsonb_build_array(
     'Não, porque IA exige sempre aprendizado a partir de dados',
     'Só se usar redes neurais',
     'Sim, é considerado IA, ainda que sem aprendizado',
     'Só se for capaz de gerar texto',
     v_nao_sei),
   2, 1, '1.0 — IA, o guarda-chuva'),
  (v_course, v_mod1,
   'Uma ferramenta de IA cita, com total segurança, um acórdão com número, relator e ementa que não existem. Esse fenômeno é conhecido como:',
   jsonb_build_array(
     'Alucinação',
     'Viés de treinamento',
     'Falha de conexão',
     'Criptografia de dados',
     v_nao_sei),
   0, 2, '1.1 — Alucinações'),
  (v_course, v_mod1,
   'Por que ferramentas de IA generalistas costumam errar mais em questões jurídicas brasileiras?',
   jsonb_build_array(
     'Porque são proibidas de tratar de temas de Direito',
     'Porque não conseguem processar textos em português',
     'Porque sempre respondem mais devagar que ferramentas especializadas',
     'Porque podem não ter acesso a bases atualizadas nem à jurisprudência local dos tribunais',
     v_nao_sei),
   3, 3, '1.1 — Por que a IA generalista erra no Direito'),
  (v_course, v_mod1,
   'A Recomendação do Conselho Federal da OAB sobre o uso de IA generativa na prática jurídica estabelece, entre outros pontos:',
   jsonb_build_array(
     'A proibição de qualquer uso de IA por advogados',
     'A obrigatoriedade de usar apenas ferramentas desenvolvidas no Brasil',
     'A vedação à delegação de atos privativos da profissão sem supervisão qualificada',
     'A dispensa de revisão quando a ferramenta é paga',
     v_nao_sei),
   2, 4, '1.3 — Regulamentação'),

  -- ---------- Módulo 2 ----------
  (v_course, v_mod2,
   'Na pesquisa de jurisprudência, qual é a principal diferença entre uma IA generalista e uma ferramenta jurídica especializada?',
   jsonb_build_array(
     'A generalista cita sempre a fonte, e a especializada nunca',
     'A especializada consulta bases reais de decisões no momento da busca e costuma apresentar a fonte junto da resposta',
     'Não existe diferença prática relevante entre elas',
     'A especializada dispensa a conferência da decisão',
     v_nao_sei),
   1, 5, '2.0 — Pesquisa jurisprudencial'),
  (v_course, v_mod2,
   'Qual conjunto de elementos torna um prompt para uma tarefa jurídica mais eficaz?',
   jsonb_build_array(
     'Apenas o tipo de peça desejada, para não confundir a ferramenta',
     'Título, introdução, desenvolvimento e conclusão',
     'Contexto do caso, tarefa a ser feita, formato esperado e restrições do que evitar',
     'Uma pergunta curta e genérica, para dar liberdade à IA',
     v_nao_sei),
   2, 6, '2.1 — Redação assistida'),
  (v_course, v_mod2,
   'Ao pedir a uma IA a minuta de uma petição, qual instrução ajuda a reduzir o risco de citações inventadas?',
   jsonb_build_array(
     'Pedir que a peça seja a mais persuasiva possível',
     'Pedir que cite o maior número possível de precedentes',
     'Pedir que escreva em tom bem formal',
     'Pedir que não invente jurisprudência nem fundamentos não fornecidos e que sinalize o que não souber',
     v_nao_sei),
   3, 7, '2.1 — Redação assistida'),
  (v_course, v_mod2,
   'Na análise de contratos com apoio de IA, qual tarefa continua exigindo, principalmente, julgamento humano?',
   jsonb_build_array(
     'Definir a estratégia de negociação a partir do contexto do negócio e da intenção das partes',
     'Sinalizar cláusulas de risco para uma primeira leitura',
     'Extrair datas, valores e obrigações espalhados pelo texto',
     'Comparar duas versões do mesmo contrato',
     v_nao_sei),
   0, 8, '2.2 — Análise de contratos'),
  (v_course, v_mod2,
   'Na triagem de grandes volumes de documentos com apoio de IA, o que mais ajuda na qualidade do resultado?',
   jsonb_build_array(
     'Usar sempre a ferramenta mais cara do mercado',
     'Colocar todos os arquivos numa única pasta, sem organização',
     'Adotar um padrão simples de nomenclatura (data, tipo de documento, parte envolvida)',
     'Evitar resumos automáticos',
     v_nao_sei),
   2, 9, '2.3 — Organização documental'),

  -- ---------- Módulo 3 ----------
  (v_course, v_mod3,
   'Antes de usar em uma peça um trecho de jurisprudência sugerido por uma IA, qual é a conduta mais adequada?',
   jsonb_build_array(
     'Confiar, se o texto estiver bem redigido e coerente',
     'Conferir a decisão na fonte original, verificando se existe e se corresponde ao que foi dito',
     'Pedir à própria IA que confirme se a decisão existe',
     'Citar e só conferir se a parte contrária questionar',
     v_nao_sei),
   1, 10, '3.0 — Verificação de outputs'),
  (v_course, v_mod3,
   'Quando uma peça elaborada com apoio de IA é protocolada com erros, quem responde pelo conteúdo?',
   jsonb_build_array(
     'A empresa que desenvolveu a ferramenta',
     'A própria ferramenta de IA',
     'Ninguém, porque o erro foi gerado automaticamente',
     'O profissional que assina a peça e representa a parte',
     v_nao_sei),
   3, 11, '3.1 — Responsabilidade'),
  (v_course, v_mod3,
   'O Código de Processo Civil (art. 77) impõe às partes e aos seus procuradores deveres de boa-fé, lealdade e veracidade. Uma petição com jurisprudência inventada por IA:',
   jsonb_build_array(
     'Não se enquadra, porque o erro veio da ferramenta',
     'Só é problema se a parte contrária perceber',
     'Pode violar esses deveres, mesmo que o erro tenha origem na IA',
     'Só é problema quando a ferramenta usada é gratuita',
     v_nao_sei),
   2, 12, '3.1 — Responsabilidade (art. 77 do CPC)'),
  (v_course, v_mod3,
   'Qual é o principal risco de colar o nome do cliente e detalhes do caso em uma ferramenta de IA generalista gratuita?',
   jsonb_build_array(
     'Os termos de uso podem permitir reaproveitar a conversa para treinar o modelo, o que pode ferir o sigilo e a LGPD',
     'A resposta fica um pouco mais lenta',
     'A ferramenta deixa de funcionar com nomes próprios',
     'Nenhum, porque dados de clientes são protegidos automaticamente',
     v_nao_sei),
   0, 13, '3.2 — Proteção de dados'),
  (v_course, v_mod3,
   'Ao instruir a IA a "sinalizar incerteza em vez de inventar", o que se pode esperar?',
   jsonb_build_array(
     'Que o risco de alucinação seja totalmente eliminado',
     'Que o risco diminua, mas sem eliminar a necessidade de verificar',
     'Que a conferência das fontes se torne desnecessária',
     'Que isso funcione apenas em ferramentas pagas',
     v_nao_sei),
   1, 14, '3.3 — Prompts eficazes'),

  -- ---------- Módulo 4 ----------
  (v_course, v_mod4,
   'A IA afirma que um contrato tem uma "cláusula abusiva de multa". Qual é o cuidado mais importante antes de aceitar essa afirmação?',
   jsonb_build_array(
     'Pedir que a IA repita a afirmação com mais firmeza',
     'Localizar a cláusula no texto e conferir se ela realmente diz o que a IA afirma',
     'Aceitar, porque a IA leu o contrato inteiro',
     'Resumir o contrato e remover esse trecho',
     v_nao_sei),
   1, 15, '4.0 — Simulação de contrato'),
  (v_course, v_mod4,
   'A IA sugere três decisões como precedentes para o seu caso. O que fazer antes de citá-las?',
   jsonb_build_array(
     'Citar as três, porque vieram de uma ferramenta jurídica',
     'Citar apenas a que tiver a ementa mais favorável',
     'Abrir cada uma no site do tribunal, conferir número, tribunal, relator e data, e descartar a que não bater',
     'Pedir que a IA reescreva as ementas',
     v_nao_sei),
   2, 16, '4.0 — Simulação de pesquisa'),
  (v_course, v_mod4,
   'Ao revisar o prompt usado por um colega, você nota o nome completo e o CPF do cliente. O que fazer?',
   jsonb_build_array(
     'Nada, porque a revisão deve olhar apenas o resultado final',
     'Considerar aceitável se a ferramenta for conhecida',
     'Apagar o CPF, mas manter o nome completo',
     'Apontar o problema: os dados devem ser anonimizados (por exemplo, Parte A e Parte B) antes de entrar na ferramenta',
     v_nao_sei),
   3, 17, '4.1 — Revisão crítica (dados)'),
  (v_course, v_mod4,
   'Uma minuta gerada por IA afirma que determinada decisão reconhece dano moral "em todos os casos". Como tratar essa afirmação?',
   jsonb_build_array(
     'Com atenção redobrada: afirmações absolutas merecem desconfiança e devem ser conferidas na fonte e comparadas aos fatos',
     'Como um bom sinal, porque mostra segurança do modelo',
     'Como correta, desde que a redação seja técnica',
     'Como irrelevante para a revisão',
     v_nao_sei),
   0, 18, '4.1 — Revisão crítica (certeza demais)'),
  (v_course, v_mod4,
   'Ao revisar um texto gerado por IA, qual abordagem é mais eficaz?',
   jsonb_build_array(
     'Conferir apenas ortografia e formatação',
     'Ler como se fosse o trabalho de outra pessoa, conferindo fontes, fatos do caso e dados sensíveis',
     'Refazer tudo do zero, sem usar a IA',
     'Confiar no texto se a redação estiver clara',
     v_nao_sei),
   1, 19, '4.1 — Revisão crítica e revisão entre colegas');
end $$;
