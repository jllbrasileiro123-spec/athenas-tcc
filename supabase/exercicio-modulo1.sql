-- ============================================================
-- ATHENAS — Exercício de avaliação do Módulo 1
-- (Fundamentos de IA e o Cenário Jurídico Brasileiro)
-- Fonte: Modulo1.Quiz.teste.docx (perguntas + gabarito comentado).
-- Acertar 70% conclui o módulo e libera o Módulo 2.
-- Pode rodar mais de uma vez: recria o exercício do zero.
-- ============================================================

-- 1. Explicação do gabarito por pergunta
alter table public.quiz_questions
  add column if not exists explanation text;

-- 2. submit_quiz devolve a correção de cada pergunta.
--    Aprovado: mostra a alternativa certa + explicação.
--    Reprovado: só indica quais errou (para não entregar o gabarito).
create or replace function public.submit_quiz(
  p_lesson_id uuid,
  p_answers jsonb,
  p_timezone text default 'America/Sao_Paulo'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  correct int := 0;
  rec record;
  chosen int;
  passed boolean;
  completion jsonb;
  review jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_access_lesson(p_lesson_id) then
    raise exception 'not enrolled';
  end if;

  select count(*)::int into total
  from public.quiz_questions
  where lesson_id = p_lesson_id;

  if total = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'no_questions',
      'passed', false,
      'correct', 0,
      'total', 0,
      'percent', 0
    );
  end if;

  for rec in
    select id, correct_index
    from public.quiz_questions
    where lesson_id = p_lesson_id
  loop
    chosen := nullif(p_answers ->> rec.id::text, '')::int;
    if chosen is not null and chosen = rec.correct_index then
      correct := correct + 1;
    end if;
  end loop;

  passed := (correct::numeric / total::numeric) >= 0.7;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'is_correct', nullif(p_answers ->> q.id::text, '')::int = q.correct_index
    )
    || case when passed then jsonb_build_object(
         'correct_index', q.correct_index,
         'explanation', q.explanation
       ) else '{}'::jsonb end
    order by q.sort_order
  ), '[]'::jsonb)
  into review
  from public.quiz_questions q
  where q.lesson_id = p_lesson_id;

  if passed then
    completion := public.complete_lesson(p_lesson_id, p_timezone);
  end if;

  return jsonb_build_object(
    'ok', true,
    'passed', passed,
    'correct', correct,
    'total', total,
    'percent', round((correct::numeric / total::numeric) * 100),
    'completion', completion,
    'review', review
  );
end;
$$;

revoke all on function public.submit_quiz(uuid, jsonb, text) from public;
grant execute on function public.submit_quiz(uuid, jsonb, text) to authenticated;

-- 3. Exercício e perguntas
do $$
declare
  v_course uuid := 'e952fa43-8221-4964-b89e-f875212f53aa';
  v_mod1 uuid := 'f824ddc7-3e2f-4809-854e-dea17fd405b0';
  v_lesson uuid;
begin
  delete from public.lessons
  where module_id = v_mod1 and item_kind = 'exercicio';

  insert into public.lessons
    (course_id, module_id, title, description, video_url, audio_url,
     duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values
    (v_course, v_mod1, 'Quiz — Fundamentos de IA e o Cenário Jurídico Brasileiro',
     'Acerte 70% (7 de 10) para concluir o Módulo 1 e liberar o próximo.',
     null, null, 10, 1, true, 'quiz', 'exercicio', 15)
  returning id into v_lesson;

  insert into public.quiz_questions (lesson_id, prompt, choices, correct_index, sort_order, explanation) values
  (v_lesson,
   'Sobre a relação entre IA, Machine Learning, Deep Learning e LLM, é correto dizer que:',
   '["São quatro tecnologias totalmente separadas e independentes","São camadas cada vez mais específicas, uma dentro da outra","LLM é o termo mais amplo e IA é o mais específico","Machine Learning e Deep Learning são exatamente a mesma coisa"]'::jsonb,
   1, 0,
   'IA é o guarda-chuva mais amplo. Dentro dela está o Machine Learning, dentro do ML está o Deep Learning, e dentro do Deep Learning está o LLM, especializado em linguagem.'),
  (v_lesson,
   'Um sistema baseado só em regras fixas ("se o cliente disser X, responda Y"), sem nenhum aprendizado envolvido, pode ser considerado IA?',
   '["Não, porque IA exige sempre algum tipo de aprendizado","Sim, isso já é considerado IA, mesmo sem aprendizado","Só se o sistema usar redes neurais","Só se o sistema for capaz de gerar texto"]'::jsonb,
   1, 1,
   'Um sistema com regras fixas já é, tecnicamente, Inteligência Artificial, mesmo sem nenhum tipo de aprendizado envolvido. Muita gente acha que "IA" é sinônimo de "a máquina aprendeu sozinha", e essa é apenas parte da história.'),
  (v_lesson,
   'No Machine Learning tradicional, quem decide quais características a máquina deve observar (cor, forma, tamanho)?',
   '["A máquina decide isso sozinha, sem intervenção humana","Um humano ainda escolhe onde a máquina deve prestar atenção","Isso só é possível com Deep Learning","É definido aleatoriamente pelo sistema"]'::jsonb,
   1, 2,
   'É um aprendizado guiado: a máquina aprende os padrões a partir de exemplos, mas ainda é um humano que escolhe as características relevantes a observar.'),
  (v_lesson,
   'O que diferencia o Deep Learning do Machine Learning mais tradicional?',
   '["O Deep Learning não precisa de dados de treinamento","A rede neural aprende sozinha quais características importam, em camadas sucessivas","O Deep Learning é usado apenas para texto","O Machine Learning é sempre mais preciso que o Deep Learning"]'::jsonb,
   1, 3,
   'No Deep Learning, cada camada da rede neural aprende sozinha uma característica cada vez mais complexa, como na analogia da linha de montagem de reconhecimento facial, sem que um humano precise indicar o que procurar.'),
  (v_lesson,
   'O que exatamente um LLM está calculando quando gera uma resposta em texto?',
   '["Ele busca a resposta correta em um banco de dados verificado","Ele calcula, estatisticamente, qual é a palavra mais provável de vir a seguir","Ele consulta a jurisprudência atualizada em tempo real","Ele copia trechos literais de sua base de treinamento"]'::jsonb,
   1, 4,
   'O LLM não sabe fatos como um banco de dados sabe. Ele prevê, token por token, a sequência de palavras estatisticamente mais provável, com base em tudo que foi treinado.'),
  (v_lesson,
   'O que é uma alucinação no contexto de IA generativa?',
   '["Um erro de digitação no texto gerado","Quando o modelo se recusa a responder","Quando o modelo produz uma informação falsa com total aparência de verdade","Uma falha técnica que trava o sistema"]'::jsonb,
   2, 5,
   'Alucinação é o termo técnico para quando um modelo generativo produz uma informação falsa, mas com a mesma confiança de uma resposta correta, sem sinalizar nenhuma dúvida.'),
  (v_lesson,
   'De acordo com o material, qual ferramenta é destacada por lidar bem com documentos longos, sendo útil para revisão de contratos e autos?',
   '["ChatGPT (OpenAI)","Claude (Anthropic)","Gemini (Google)","Copilot (Microsoft)"]'::jsonb,
   1, 6,
   'O material destaca o Claude por costumar ser citado por maior cautela em respostas incertas e por lidar bem com documentos longos, úteis para revisão de contratos e autos.'),
  (v_lesson,
   'Por que ferramentas de IA generalistas costumam errar em questões jurídicas brasileiras?',
   '["Porque não são treinadas especificamente com jurisprudência local e bases atualizadas","Porque foram proibidas de responder sobre Direito","Porque não conseguem processar texto em português","Porque são mais lentas que ferramentas jurídicas especializadas"]'::jsonb,
   0, 7,
   'Faltam a essas ferramentas acesso a bases atualizadas, jurisprudência local dos tribunais brasileiros e sensibilidade às especificidades do Direito brasileiro.'),
  (v_lesson,
   'O que a Recomendação OAB nº 001/2024 veda expressamente?',
   '["O uso de qualquer ferramenta de IA por advogados","A delegação de atos privativos da profissão sem supervisão qualificada","A divulgação de decisões judiciais na internet","O uso de ferramentas de IA desenvolvidas fora do Brasil"]'::jsonb,
   1, 8,
   'A Recomendação estabelece diretrizes éticas para uso de IA generativa na prática jurídica, incluindo a vedação à delegação de atos privativos da profissão sem supervisão qualificada.'),
  (v_lesson,
   'Qual norma trata de governança, classificação de risco e supervisão humana obrigatória para IA no Poder Judiciário brasileiro?',
   '["Recomendação OAB nº 001/2024","LGPD (Lei nº 13.709/2018)","Resolução CNJ nº 615/2025","PL 2.338/2023"]'::jsonb,
   2, 9,
   'A Resolução CNJ nº 615/2025 trata da governança de IA dentro do Poder Judiciário, incluindo o uso de LLMs na fundamentação de decisões.');
end $$;

notify pgrst, 'reload schema';

-- Conferência
select l.title, count(q.*) as perguntas
from public.lessons l
left join public.quiz_questions q on q.lesson_id = l.id
where l.module_id = 'f824ddc7-3e2f-4809-854e-dea17fd405b0'
group by l.title, l.sort_order
order by l.sort_order;
