-- ============================================================
-- ATHENAS — Exercício prático de cada módulo
-- Cada módulo passa a ter: Aula → Exercício prático → Quiz.
-- O exercício mostra o enunciado e, abaixo, o vídeo de resolução
-- (item_kind 'tutorial'). O vídeo entra depois com:
--   npm run upload:exercicio -- --modulo N --video "caminho.mp4"
-- O exercício é obrigatório: libera o quiz do módulo.
-- Pode rodar mais de uma vez: recria só os exercícios práticos.
-- ============================================================

do $$
declare
  v_course uuid := 'e952fa43-8221-4964-b89e-f875212f53aa'; -- IA no Cotidiano Jurídico
  v_mod record;
  v_aula int;
  v_title text;
  v_text text;
  v_min int;
begin
  for v_mod in
    select id, sort_order from public.course_modules
    where course_id = v_course order by sort_order
  loop
    -- Recria o exercício prático do módulo
    delete from public.lessons where module_id = v_mod.id and item_kind = 'tutorial';

    select coalesce(min(sort_order), v_mod.sort_order * 10) into v_aula
    from public.lessons where module_id = v_mod.id and item_kind = 'explicacao';

    -- Quiz vai para depois do exercício
    update public.lessons
    set sort_order = v_aula + 2
    where module_id = v_mod.id and item_kind = 'exercicio';

    if v_mod.sort_order = 0 then
      v_min := 15;
      v_title := 'Exercício prático — Encontre a alucinação';
      v_text := $txt$Caso: um estagiário do escritório pediu a um chatbot de IA generalista (versão gratuita) um parágrafo sobre responsabilidade civil e colou o resultado abaixo em uma minuta:

"Conforme pacificado pelo STJ no REsp 1.874.392/SP (Rel. Min. Paulo Andrade, j. 14/03/2023), a responsabilidade é objetiva. Ressalte-se ainda que a Resolução CNJ nº 332/2020, em vigor, autoriza o uso de IA na fundamentação, e que o ChatGPT consulta em tempo real a base oficial de jurisprudência dos tribunais."

Responda:
1. Que tipo de tecnologia é esse chatbot? Situe-o nas camadas IA → Machine Learning → Deep Learning → LLM.
2. Aponte pelo menos três sinais de alerta no trecho e explique por que cada um é um risco.
3. Antes de usar o texto, o que o estagiário precisa conferir, e onde?
4. Qual norma da OAB trata desse cuidado e o que ela exige do profissional?$txt$;

    elsif v_mod.sort_order = 1 then
      v_min := 20;
      v_title := 'Exercício prático — Do prompt vago à minuta revisada';
      v_text := $txt$Caso: uma colega digitou na IA apenas "escreva uma petição de indenização por voo cancelado" e recebeu um texto genérico, com dois julgados que ela não conseguiu localizar.

Fatos (fictícios e anonimizados): a Cliente X comprou passagem São Paulo–Recife; o voo foi cancelado sem aviso prévio, ela foi realocada só 26 horas depois, perdeu uma diária de hotel já paga e não recebeu assistência material da companhia.

Responda:
1. Reescreva o prompt usando o framework do Módulo 2: contexto, tarefa, formato e restrições.
2. Como você pesquisaria jurisprudência para esse caso? Diga que tipo de ferramenta usaria e por que a rastreabilidade da fonte importa.
3. O que fazer com os dois julgados que não foram localizados?
4. Na revisão da minuta gerada, cite duas coisas que só o advogado pode decidir.$txt$;

    elsif v_mod.sort_order = 2 then
      v_min := 20;
      v_title := 'Exercício prático — Onde o colega errou?';
      v_text := $txt$Caso: para ganhar tempo, um advogado colou em um chatbot gratuito o seguinte pedido:

"Meu cliente João Pereira da Silva, CPF 123.456.789-00, processo nº 0001234-56.2025.8.26.0100, tem diagnóstico de depressão e foi demitido. Escreva a petição e cite jurisprudência favorável."

Ele protocolou o texto gerado sem revisar. Um dos precedentes citados não existia, e o juiz aplicou multa.

Responda:
1. Liste os problemas de proteção de dados e de sigilo profissional nesse pedido. Que leis e deveres estão envolvidos?
2. Quem responde pelo erro do precedente inexistente: a ferramenta ou o advogado? Fundamente com o art. 77 do CPC e o art. 8º do Código de Ética e Disciplina da OAB.
3. Reescreva o prompt de forma segura: anonimizado, pedindo a fonte de cada informação e pedindo que a IA sinalize quando não tiver certeza.
4. Monte um checklist de cinco passos que o advogado deveria ter seguido antes de protocolar.$txt$;

    else
      v_min := 25;
      v_title := 'Exercício prático — Revisão crítica de uma minuta';
      v_text := $txt$Simulação final: você recebeu de um colega a minuta abaixo, gerada com apoio de IA. Revise como se fosse protocolá-la com o seu nome.

"A autora firmou contrato de prestação de serviços com a ré. A cláusula 7ª prevê multa por rescisão, o que é vedado em qualquer hipótese pelo ordenamento. Nos termos da Súmula 999 do STJ, a indenização é devida independentemente de prova. Requer-se, ainda, a aplicação da Resolução CNJ nº 332/2020."

Bilhete do colega: "Pra agilizar, colei o contrato inteiro da cliente, com nome e CPF, no chatbot gratuito e pedi a minuta."

Responda:
1. Encontre pelo menos quatro problemas (na minuta e no bilhete) e classifique cada um: citação inexistente, norma desatualizada, interpretação simplificada ou dado sensível exposto.
2. Para cada problema, diga como você o corrigiria e onde conferiria a informação.
3. Reescreva o primeiro parágrafo da forma correta.
4. Em poucas linhas: o que mudou na sua forma de usar IA desde o Módulo 1?$txt$;
    end if;

    insert into public.lessons
      (course_id, module_id, title, description, video_url, audio_url,
       duration_minutes, sort_order, is_preview, content_type, item_kind, xp_reward)
    values
      (v_course, v_mod.id, v_title, v_text, null, null,
       v_min, v_aula + 1, true, 'lesson', 'tutorial', 15);
  end loop;
end $$;

-- Conferência: Aula → Exercício prático → Quiz em cada módulo
select m.sort_order + 1 as modulo, l.sort_order, l.item_kind, l.title
from public.lessons l
join public.course_modules m on m.id = l.module_id
where l.course_id = 'e952fa43-8221-4964-b89e-f875212f53aa'
order by m.sort_order, l.sort_order;
