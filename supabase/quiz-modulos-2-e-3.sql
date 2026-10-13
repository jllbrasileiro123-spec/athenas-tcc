-- ============================================================
-- ATHENAS — Quizzes dos Módulos 2 e 3 + ordem global da trilha
-- Fonte: Modulo2_Quiz.docx e Modulo3_Quiz.docx (perguntas + gabarito).
--
-- Por que a ordem: a trilha sequencial ordena as aulas do curso só por
-- lessons.sort_order. Cada aula de módulo estava com sort_order 0 (e o
-- quiz do Módulo 1 com 1), então a trilha ficava Aula 1, 2, 3, 4 e só
-- depois o Quiz 1 — o aluno não conseguia avançar do Módulo 2 para o 3.
-- Agora sort_order é global: Módulo N usa a faixa (N-1)*10.
--
-- Acertar 70% (6 de 8) conclui o módulo e libera o próximo.
-- Pode rodar mais de uma vez: recria os exercícios do zero.
-- ============================================================

-- 1. Ordem global: aula de explicação = (N-1)*10, exercício = (N-1)*10 + 1
update public.lessons l
set sort_order = m.sort_order * 10
  + case when l.item_kind = 'exercicio' then 1 else 0 end
from public.course_modules m
where m.id = l.module_id
  and m.course_id = 'e952fa43-8221-4964-b89e-f875212f53aa';

-- 2. Exercícios e perguntas
do $$
declare
  v_course uuid := 'e952fa43-8221-4964-b89e-f875212f53aa';
  v_mod2 uuid := '4b245626-249b-4c84-8757-3a19da34aa98';
  v_mod3 uuid := '4ae68d96-0e40-42b1-ba28-1a2cb7df27e3';
  v_lesson uuid;
begin
  delete from public.lessons
  where module_id in (v_mod2, v_mod3) and item_kind = 'exercicio';

  -- Módulo 2
  insert into public.lessons
    (course_id, module_id, title, description, video_url, audio_url,
     duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values
    (v_course, v_mod2, 'Quiz — Ferramentas Práticas para o Cotidiano Forense',
     'Acerte 70% (6 de 8) para concluir o Módulo 2 e liberar o próximo.',
     null, null, 10, 11, true, 'quiz', 'exercicio', 15)
  returning id into v_lesson;

  insert into public.quiz_questions (lesson_id, prompt, choices, correct_index, sort_order, explanation) values
  (v_lesson,
   'Qual é a principal diferença entre uma IA generalista e uma ferramenta jurídica especializada na pesquisa de jurisprudência?',
   '["A generalista só funciona com textos em inglês","A especializada consulta bases reais no momento da busca e costuma apresentar a fonte junto da resposta","A generalista sempre cita a fonte, e a especializada nunca","Não existe diferença prática entre elas"]'::jsonb,
   1, 0,
   'A generalista responde principalmente a partir do que aprendeu no treinamento. Já boa parte das ferramentas especializadas consulta bases reais de jurisprudência, legislação e doutrina na hora da busca, e traz o link ou a referência da fonte. É essa rastreabilidade que faz diferença.'),
  (v_lesson,
   'Segundo o material, qual é o padrão que se repete nas sanções aplicadas por uso inadequado de IA em peças processuais?',
   '["A ferramenta se recusa a responder e o profissional inventa a citação","O tribunal descobre o uso de IA pela formatação do documento","A IA inventa um precedente, a citação vai para a peça sem checagem e o tribunal aplica a sanção","O cliente denuncia o advogado por usar tecnologia"]'::jsonb,
   2, 1,
   'O padrão é quase sempre o mesmo: o profissional usa uma ferramenta generalista, a IA inventa um precedente, a citação segue para a peça sem checagem, e a sanção vem quando o tribunal descobre.'),
  (v_lesson,
   'Sobre as ferramentas jurídicas especializadas, é correto afirmar que:',
   '["A rastreabilidade da fonte facilita a conferência, mas não substitui a conferência","Eliminam completamente o risco de erro","Dispensam a leitura do acórdão original antes de citar","Só podem ser usadas por tribunais"]'::jsonb,
   0, 2,
   'Nenhuma ferramenta, por mais especializada que seja, elimina 100% o risco de erro. O hábito de abrir o acórdão original antes de citar continua sendo do profissional.'),
  (v_lesson,
   'Quais são as quatro partes do framework de prompt estruturado apresentado no material?',
   '["Título, introdução, desenvolvimento e conclusão","Pergunta, resposta, exemplo e fonte","Fatos, direito, pedidos e assinatura","Contexto, tarefa, formato e restrições"]'::jsonb,
   3, 3,
   'O framework tem quatro partes: contexto (fatos e circunstâncias do caso), tarefa (o que precisa ser produzido), formato (estrutura, tamanho, tom) e restrições (o que não pode faltar ou deve ser evitado).'),
  (v_lesson,
   'No modelo de prompt reutilizável do material, qual instrução funciona como restrição para reduzir o risco de alucinação?',
   '["\"Use linguagem técnica e formal\"","\"Aja como assistente jurídico especializado\"","\"Não invente jurisprudência ou fundamentos que não tenham sido fornecidos\"","\"Redija uma minuta de [tipo de peça]\""]'::jsonb,
   2, 4,
   'A instrução para não inventar jurisprudência ou fundamentos é a restrição que protege contra alucinações. As demais definem o papel, o formato e a tarefa.'),
  (v_lesson,
   'Por que revisar e assumir a responsabilidade pelo conteúdo gerado por IA não é um passo opcional na redação assistida?',
   '["Porque a IA sempre erra a formatação do documento","Porque a Recomendação OAB nº 001/2024 veda a delegação de atos privativos da profissão sem supervisão qualificada","Porque a IA cobra por cada revisão adicional","Porque o uso de IA na advocacia é proibido"]'::jsonb,
   1, 5,
   'A IA gera um rascunho, não uma peça final. A Recomendação OAB nº 001/2024 veda a delegação de atos privativos da profissão sem supervisão qualificada, então revisar faz parte do próprio fluxo de trabalho.'),
  (v_lesson,
   'Na análise de contratos com apoio de IA, em qual tarefa o julgamento humano continua insubstituível?',
   '["Sinalizar cláusulas de risco para uma primeira leitura","Extrair obrigações, valores e datas espalhados pelo documento","Comparar versões de um mesmo contrato","Definir a estratégia de negociação e as prioridades da parte representada"]'::jsonb,
   3, 6,
   'A IA ajuda bastante em sinalizar riscos, extrair informações e comparar versões. Já a estratégia de negociação e a interpretação do contexto do negócio dependem de conhecimento do caso concreto e exigem julgamento humano.'),
  (v_lesson,
   'O que mais influencia a qualidade da triagem de documentos feita com apoio de IA?',
   '["Como os documentos estão nomeados e organizados na origem","O tamanho da tela do computador usado","O horário em que a triagem é feita","A quantidade de pessoas que leem o resultado depois"]'::jsonb,
   0, 7,
   'Um padrão simples de nomenclatura (data, tipo de documento, parte envolvida) facilita o trabalho posterior da ferramenta e economiza retrabalho.');

  -- Módulo 3
  insert into public.lessons
    (course_id, module_id, title, description, video_url, audio_url,
     duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
  values
    (v_course, v_mod3, 'Quiz — Ética, Boas Práticas e Responsabilidade Profissional',
     'Acerte 70% (6 de 8) para concluir o Módulo 3 e liberar o próximo.',
     null, null, 10, 21, true, 'quiz', 'exercicio', 15)
  returning id into v_lesson;

  insert into public.quiz_questions (lesson_id, prompt, choices, correct_index, sort_order, explanation) values
  (v_lesson,
   'Segundo o material, por que verificar o conteúdo gerado por IA deve ser tratado como rotina?',
   '["Porque toda ferramenta de IA é pouco confiável e deve ser evitada","Porque o cliente exige que a verificação seja feita por escrito","Porque é parte do fluxo de trabalho, do mesmo jeito que ninguém protocola uma petição sem reler antes de assinar","Porque a verificação só é necessária quando a resposta parece estranha"]'::jsonb,
   2, 0,
   'Verificar não é sinal de desconfiança na ferramenta. É parte do fluxo de trabalho, mesmo quando o conteúdo parece bem escrito, e vale para peças, pareceres e mensagens ao cliente.'),
  (v_lesson,
   'Qual destas ações faz parte do checklist de verificação apresentado no material?',
   '["Conferir cada citação de jurisprudência, doutrina ou dispositivo legal na fonte original","Confiar na resposta quando ela estiver bem redigida","Aceitar respostas convenientes para o argumento que se quer construir","Usar apenas uma ferramenta, para evitar respostas diferentes"]'::jsonb,
   0, 1,
   'O checklist pede para conferir as citações na fonte original, verificar se o precedente existe e se a norma está em vigor, desconfiar de respostas convenientes demais e comparar com outra ferramenta quando possível.'),
  (v_lesson,
   'Quando uma peça é protocolada com apoio de IA, quem continua sendo o responsável legal por ela?',
   '["A ferramenta de IA utilizada","A empresa que desenvolveu a ferramenta","Ninguém, porque o erro foi gerado automaticamente","O profissional que assina a peça e representa a parte"]'::jsonb,
   3, 2,
   'A ferramenta nunca é a responsável legal pelo que é protocolado. A responsabilidade de quem assina e representa a parte é intransferível, mesmo quando parte do trabalho foi feita com IA.'),
  (v_lesson,
   'De acordo com o material, o que o artigo 8º do Código de Ética e Disciplina da OAB estabelece?',
   '["O dever de usar sempre ferramentas de IA aprovadas pela OAB","O dever de informar o cliente, de forma clara e inequívoca, sobre os riscos de sua pretensão e as possíveis consequências da demanda","A proibição de qualquer uso de tecnologia na advocacia","O limite de valor para multas por litigância de má-fé"]'::jsonb,
   1, 3,
   'O artigo 8º trata da relação de confiança e transparência com o cliente. Usar IA sem entender suas limitações, e sem repassar ao cliente o que isso pode significar, vai contra esse dever básico.'),
  (v_lesson,
   'Sobre o artigo 77 do Código de Processo Civil, é correto afirmar que:',
   '["Só se aplica às partes, e nunca aos advogados","Permite que o erro seja atribuído à ferramenta de IA quando ela inventa uma citação","Estabelece deveres de boa-fé, lealdade e veracidade, e uma petição com jurisprudência inventada pode violá-los mesmo que o erro tenha vindo de uma IA","Trata exclusivamente da proteção de dados pessoais"]'::jsonb,
   2, 4,
   'O artigo 77 impõe às partes e aos seus procuradores deveres de boa-fé, lealdade e veracidade. Uma petição com jurisprudência inventada pode ser enquadrada como violação, ainda que o erro tenha origem na IA.'),
  (v_lesson,
   'Por que colar o nome do cliente ou detalhes sensíveis do caso em uma ferramenta de IA generalista é um risco?',
   '["Porque os termos de uso podem prever o reaproveitamento das conversas para treinar o modelo, o que pode configurar quebra de sigilo e esbarrar na LGPD","Porque a ferramenta não consegue processar nomes próprios","Porque isso deixa a resposta mais lenta","Porque o sigilo profissional só vale para documentos impressos"]'::jsonb,
   0, 5,
   'Muitas ferramentas generalistas, nos termos de uso padrão, preveem o reaproveitamento das conversas para treinamento. Inserir dados do cliente nelas pode configurar quebra de sigilo profissional e esbarrar na LGPD.'),
  (v_lesson,
   'Qual é uma boa prática de proteção de dados antes de usar uma ferramenta de IA?',
   '["Inserir o número do processo para a resposta ficar mais precisa","Usar apenas ferramentas gratuitas, para evitar contratos","Tratar a política de dados como irrelevante se o prompt for curto","Anonimizar os dados, trocando nomes reais por identificadores genéricos como Parte A ou Cliente X"]'::jsonb,
   3, 6,
   'Anonimizar antes de colar é a primeira boa prática. O material também recomenda verificar se há contrato empresarial que impeça o uso dos dados para treinamento e nunca inserir CPF, dados bancários ou informações médicas em ferramentas generalistas gratuitas.'),
  (v_lesson,
   'Sobre instruir a IA a sinalizar incerteza (por exemplo, "se não tiver certeza sobre algum ponto, diga isso claramente em vez de inventar"), o material afirma que:',
   '["Elimina completamente o risco de alucinação","Reduz, mas não elimina, o risco de alucinação","Torna a verificação das fontes desnecessária","Só funciona em ferramentas jurídicas especializadas"]'::jsonb,
   1, 7,
   'Esse tipo de instrução ajuda, mas não elimina o risco. Por isso a primeira resposta deve ser tratada como rascunho e passar sempre por revisão antes de qualquer uso.');
end $$;
