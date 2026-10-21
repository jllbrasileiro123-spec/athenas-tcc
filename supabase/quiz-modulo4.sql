-- ============================================================
-- ATHENAS — Quiz do Módulo 4
-- Fonte: Modulo4_Quiz.docx (perguntas + gabarito).
--
-- Acertar 70% (6 de 8) conclui o Módulo 4. O quiz continua obrigatório
-- mesmo para quem dispensou o módulo no nivelamento.
-- Pode rodar mais de uma vez: recria o quiz do zero.
-- ============================================================

do $$
declare
  v_course uuid := 'e952fa43-8221-4964-b89e-f875212f53aa'; -- IA no Cotidiano Jurídico
  v_mod4 uuid;
  v_aula int;
  v_lesson uuid;
begin
  select id into v_mod4 from public.course_modules
  where course_id = v_course and sort_order = 3;

  if v_mod4 is null then
    raise exception 'O curso ainda não tem o Módulo 4.';
  end if;

  delete from public.lessons
  where module_id = v_mod4 and item_kind = 'exercicio';

  -- Ordem global: aula (30) → exercício prático (31) → quiz (32)
  select coalesce(min(sort_order), 30) into v_aula
  from public.lessons where module_id = v_mod4 and item_kind = 'explicacao';

  insert into public.lessons
    (course_id, module_id, title, description, video_url, audio_url,
     duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values
    (v_course, v_mod4, 'Quiz — Aplicação Supervisionada e Avaliação Final',
     'Acerte 70% (6 de 8) para concluir o Módulo 4.',
     null, null, 10, v_aula + 2, true, 'quiz', 'exercicio', 15)
  returning id into v_lesson;

  insert into public.quiz_questions (lesson_id, prompt, choices, correct_index, sort_order, explanation) values
  (v_lesson,
   'Na simulação de petição, o que entra na parte de RESTRIÇÕES do prompt?',
   '["O tipo de peça que será redigida","Os fatos do caso, usando Parte A e Parte B","Indicar o dispositivo legal de cada fundamento, sinalizar quando não tiver certeza e não inventar jurisprudência","A estrutura da peça: qualificação, dos fatos, do direito e dos pedidos"]'::jsonb,
   2, 0,
   'As restrições trazem as travas do Módulo 3. O tipo de peça faz parte da tarefa, os fatos fazem parte do contexto e a estrutura da peça faz parte do formato.'),
  (v_lesson,
   'O que deve ser entregue ao final da simulação de petição?',
   '["O prompt usado, a minuta gerada e as anotações do que foi corrigido","Apenas a minuta gerada pela IA","Somente a lista de correções, sem a minuta","A minuta e a lista de ferramentas testadas"]'::jsonb,
   0, 1,
   'São três itens: o prompt, a minuta e as anotações. A última parte é a mais valiosa, porque mostra o olhar crítico sobre o rascunho.'),
  (v_lesson,
   'Qual é a regra de ouro da simulação de contrato?',
   '["Pedir sempre uma segunda opinião a outra ferramenta","Nunca enviar o contrato inteiro para a IA","Pedir à IA que resuma o contrato em poucas linhas","Toda afirmação sobre o contrato precisa apontar para uma cláusula que você consiga localizar no texto"]'::jsonb,
   3, 2,
   'Se a afirmação da IA não aponta para uma cláusula localizável, ela não vale. É isso que impede que a ferramenta invente ou simplifique demais.'),
  (v_lesson,
   'Na simulação de pesquisa, qual passo separa o uso responsável da IA do uso arriscado?',
   '["Escolher uma ferramenta generalista conhecida","Conferir a decisão abrindo-a no site do próprio tribunal","Escrever a pergunta jurídica do caso","Pedir à IA que repita a busca"]'::jsonb,
   1, 3,
   'Número do processo, tribunal, relator e data precisam bater com a fonte oficial. Se um deles não bater, aquela decisão não entra.'),
  (v_lesson,
   'Sobre as informações sensíveis na revisão crítica, o que vale lembrar?',
   '["Basta revisar o resultado final gerado pela IA","Só importam se aparecerem na peça protocolada","Também devem ser revisadas no prompt, e não só no resultado","Só se aplicam a documentos impressos"]'::jsonb,
   2, 4,
   'O dado que entra no prompt já foi para a ferramenta. Por isso a revisão de dados precisa acontecer antes do envio, e não apenas no resultado.'),
  (v_lesson,
   'Por que trocar as simulações entre colegas ajuda na revisão?',
   '["Porque lemos o próprio texto com a cabeça de quem escreveu, e é aí que o erro se esconde","Porque o colega sempre tem mais experiência","Porque a revisão fica mais rápida","Porque dispensa o uso do checklist"]'::jsonb,
   0, 5,
   'Revisar o resultado de outra pessoa costuma revelar erros que passariam batidos na nossa própria produção. O colega aplica o checklist, marca os erros e os dois conversam sobre o que passou despercebido.'),
  (v_lesson,
   'Qual é o objetivo do questionário pós-teste da pesquisa?',
   '["Atribuir uma nota final a cada participante","Substituir o quiz consolidado","Testar se a pessoa decorou as definições dos módulos","Comparar com o pré-teste para medir o que mudou na produtividade e na segurança"]'::jsonb,
   3, 6,
   'Ele é aplicado nos mesmos moldes do pré-teste, para comparar o antes e o depois. O objetivo não é nota, é medir o que mudou, por isso a resposta deve ser sincera.'),
  (v_lesson,
   'No checklist de verificação (fonte, existência, conveniência, comparação), qual é a pergunta final?',
   '["A ferramenta usada era gratuita?","Eu assinaria isso?","O texto ficou curto o bastante?","O cliente vai gostar do resultado?"]'::jsonb,
   1, 7,
   'Depois de conferir fonte, existência, conveniência e comparação, a pergunta final é se você assinaria aquele texto com o seu nome do jeito que está.');
end $$;
