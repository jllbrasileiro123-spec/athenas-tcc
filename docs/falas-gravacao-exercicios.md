# Falas para gravação — Vídeos de resolução dos exercícios

Texto corrido para ler na gravação (ou colar num teleprompter), baseado em [roteiros-videos-exercicios.md](roteiros-videos-exercicios.md).
Cada vídeo tem de 4 a 6 minutos, lendo em ritmo calmo.

**Legenda:** `[TELA: ...]` = o que mostrar na tela naquele momento. `(pausa)` = respire, dê tempo para o aluno ler.

## Antes de gravar

- [ ] Abra o exercício do módulo na plataforma, para mostrar o enunciado na tela.
- [ ] Deixe abertos os sites que vai mostrar: pesquisa de jurisprudência do STJ, site do CNJ, Planalto (leis).
- [ ] Feche notificações (WhatsApp, e-mail) e esconda abas pessoais.
- [ ] Grave em 1080p. Se o arquivo passar de 50 MB, comprima (HandBrake, preset "Fast 1080p30") ou suba no YouTube como "não listado".
- [ ] Não afirme que um julgado "existe" ou "não existe" sem ter conferido ao vivo. Os casos dos enunciados são fictícios de propósito.

Depois de gravar, publique cada vídeo:

```bash
npm run upload:exercicio -- --modulo 1 --video "C:/caminho/resolucao-modulo1.mp4" --duracao 6
```

---

## Módulo 1 — Encontre a alucinação (~5 min)

[TELA: enunciado do exercício do Módulo 1]

Olá! Neste exercício você recebeu um parágrafo que parece perfeito: tem número de processo, nome de relator, data e até resolução do CNJ. Vamos ver juntos por que ele não poderia ir para a peça do jeito que está.

Relembrando o caso: um estagiário pediu a um chatbot gratuito um parágrafo sobre responsabilidade civil e colou o resultado direto na minuta. (pausa)

**Pergunta 1: que tecnologia é esse chatbot?**

Pense nas camadas que vimos na aula. A Inteligência Artificial é o guarda-chuva maior. Dentro dela está o Machine Learning, que aprende com dados. Dentro do Machine Learning está o Deep Learning, que usa redes neurais profundas. E dentro do Deep Learning estão os LLMs, os grandes modelos de linguagem. O chatbot do caso é um LLM.

E o ponto mais importante: um LLM gera texto calculando qual é a próxima palavra mais provável. Ele não abre uma base de jurisprudência para responder. Ele escreve o que parece certo, e isso é diferente de ser certo.

**Pergunta 2: sinais de alerta.**

[TELA: destaque cada trecho do enunciado conforme fala]

Primeiro sinal: um precedente com número, relator e data muito específicos, sem link e sem fonte. Esse é exatamente o formato de uma alucinação: plausível, detalhado e confiante.

Segundo sinal: "Resolução CNJ nº 332/2020, em vigor". Essa resolução foi substituída pela Resolução CNJ nº 615 de 2025. Então a norma citada está desatualizada.

Terceiro sinal: "o ChatGPT consulta em tempo real a base oficial de jurisprudência". Isso é falso para a ferramenta generalista. Ela responde a partir do que aprendeu no treinamento.

E um quarto, de bônus: "pacificado pelo STJ". É uma afirmação forte e conveniente demais para o argumento, e veio sem nenhuma fonte. Quando a IA te entrega exatamente o que você queria ouvir, desconfie em dobro. (pausa)

**Pergunta 3: o que conferir, e onde.**

[TELA: site do STJ, pesquisa de jurisprudência]

O número do recurso especial a gente busca aqui, na pesquisa de jurisprudência do site do STJ. Conferimos se o processo existe, se o relator realmente compõe a Corte e lemos a ementa original.

[TELA: site do CNJ]

A norma, a gente confere no site do CNJ, para ver o que está em vigor hoje.

E a regra é simples: se não encontrou, o trecho sai da minuta.

**Pergunta 4: a norma da OAB.**

É a Recomendação OAB nº 001 de 2024. Ela pede que o profissional entenda as limitações da ferramenta, verifique com rigor tudo o que ela gera e não delegue à IA atos privativos da advocacia sem supervisão.

**O erro mais comum** nesse exercício é achar que um texto bem escrito é um texto verdadeiro.

Para fechar: a IA ajuda a escrever, não a provar. Quem prova é você, na fonte. Até o próximo módulo!

---

## Módulo 2 — Do prompt vago à minuta revisada (~6 min)

[TELA: enunciado do exercício do Módulo 2]

Olá! Neste exercício o problema não é a IA, é o pedido. Vamos transformar uma frase solta em um prompt profissional.

Relembrando: uma colega digitou só "escreva uma petição de indenização por voo cancelado" e recebeu um texto genérico, com dois julgados que ela não conseguiu localizar. Os fatos: a Cliente X teve o voo São Paulo–Recife cancelado sem aviso, foi realocada 26 horas depois, perdeu uma diária de hotel já paga e não recebeu assistência da companhia. (pausa)

**Pergunta 1: reescrever o prompt.**

Vamos usar o framework do Módulo 2: contexto, tarefa, formato e restrições.

[TELA: mostre o prompt abaixo, de preferência digitando ou revelando parte por parte]

> Aja como assistente jurídico especializado em Direito do Consumidor. **Contexto:** a Cliente X comprou passagem São Paulo–Recife; o voo foi cancelado sem aviso prévio; ela foi realocada 26 horas depois, perdeu uma diária de hotel já paga e não recebeu assistência material. **Tarefa:** redija uma minuta de petição inicial de indenização por danos materiais e morais. **Formato:** qualificação (com campos em branco), dos fatos, do direito, dos pedidos; linguagem técnica e formal. **Restrições:** use apenas os fatos acima; cite somente dispositivos legais, sem inventar jurisprudência; se precisar de um precedente, deixe a marcação [PESQUISAR PRECEDENTE]; sinalize qualquer ponto em que não tiver certeza.

Repare em duas coisas. Primeiro: o prompt já está anonimizado. Não tem nome da cliente, tem "Cliente X". Segundo: ele proíbe a IA de inventar jurisprudência e pede uma marcação no lugar. Assim, a lacuna fica visível em vez de ser preenchida com algo falso.

Os fundamentos que o advogado vai conferir na fonte são o artigo 14 do Código de Defesa do Consumidor, sobre a responsabilidade do fornecedor de serviços, e a Resolução ANAC nº 400 de 2016, que trata de assistência material e reacomodação.

**Pergunta 2: como pesquisar jurisprudência.**

Para isso, use uma ferramenta jurídica especializada, como Jus IA, Turivius ou a própria pesquisa dos tribunais. Essas ferramentas buscam em bases reais e mostram de onde veio cada decisão.

Isso é a rastreabilidade: você consegue abrir o acórdão original e ler. Mas atenção: a ferramenta facilita a conferência, ela não substitui a conferência. (pausa)

**Pergunta 3: os dois julgados não localizados.**

Saem da peça. Não se "ajusta" um julgado que não foi encontrado, trocando um número aqui ou um nome ali. Se você precisa de um precedente, pesquise do zero, na ferramenta especializada.

**Pergunta 4: o que só o advogado decide.**

Pelo menos duas coisas. Primeiro, o valor e a estratégia do pedido de danos morais. E aqui vale cuidado: a jurisprudência não presume dano moral em todo atraso de voo, então é preciso mostrar o abalo concreto que a cliente sofreu.

Segundo, quais fatos destacar na narrativa. E, claro, a conferência final de cada citação e a assinatura, que são responsabilidade do advogado, como diz a Recomendação 001 de 2024 da OAB.

Para fechar: a IA entrega um rascunho. A peça é sua. Até o próximo módulo!

---

## Módulo 3 — Onde o colega errou? (~6 min)

[TELA: enunciado do exercício do Módulo 3]

Olá! Este caso reúne três erros num pedido só. Vamos separar um por um.

Relembrando: um advogado colou num chatbot gratuito o nome completo do cliente, o CPF, o número do processo e o diagnóstico de depressão, e pediu a petição com jurisprudência favorável. Protocolou sem revisar. Um dos precedentes não existia e o juiz aplicou multa. (pausa)

**Pergunta 1: proteção de dados e sigilo.**

[TELA: destaque nome, CPF, número do processo e diagnóstico no enunciado]

Nome, CPF e número do processo foram colados numa ferramenta gratuita, que pode reaproveitar as conversas para treinar o modelo. Ou seja: esses dados saíram do controle do escritório.

Pior ainda: o diagnóstico de saúde é dado pessoal sensível, pela LGPD, a Lei 13.709 de 2018, no artigo 5º, inciso II. Ele exige um cuidado ainda maior.

E além da LGPD, há quebra do sigilo profissional, previsto no Código de Ética e Disciplina da OAB.

**Pergunta 2: quem responde pelo precedente inexistente?**

O advogado. A ferramenta não assina a peça e não tem responsabilidade processual.

O artigo 77 do CPC traz os deveres de boa-fé, lealdade e veracidade. Apresentar jurisprudência inventada pode configurar ato atentatório à dignidade da justiça, com multa de até 20% do valor da causa. Pode haver também condenação por litigância de má-fé, pelos artigos 80 e 81.

E o artigo 8º do Código de Ética lembra o dever de informar o cliente, de forma clara, sobre os riscos. (pausa)

**Pergunta 3: o prompt seguro.**

[TELA: mostre o prompt abaixo]

> Aja como assistente jurídico trabalhista. Caso: o Empregado A foi dispensado logo após apresentar atestado de tratamento de saúde. Redija a estrutura de uma petição inicial (fatos, direito, pedidos). Indique a fonte de cada dispositivo legal citado. Não cite jurisprudência; marque [PESQUISAR PRECEDENTE] onde ela for necessária. Se não tiver certeza sobre algum ponto, diga isso claramente em vez de inventar.

Veja o que mudou: sem nome, sem CPF, sem número de processo e sem o diagnóstico específico. "Tratamento de saúde" já basta para a IA entender o caso. E o prompt pede a fonte de cada dispositivo e autoriza a IA a dizer "não sei".

**Pergunta 4: checklist de cinco passos.**

[TELA: mostre a lista aparecendo item por item]

Um: anonimizar os dados antes de usar a IA.
Dois: usar uma ferramenta com contrato que impede o reaproveitamento dos dados.
Três: conferir cada citação na fonte original.
Quatro: verificar se as normas citadas estão em vigor.
Cinco: reler a peça inteira perguntando: "eu assinaria isso com o meu nome?"

Para fechar: verificar não é desconfiança. É rotina profissional. Até o último módulo!

---

## Módulo 4 — Revisão crítica de uma minuta (~6 min)

[TELA: enunciado do exercício do Módulo 4]

Olá! Este é o exercício final, e agora você é o revisor. Vamos usar o checklist do Módulo 3, linha por linha.

Relembrando: um colega te mandou uma minuta feita com apoio de IA e um bilhete dizendo que colou o contrato inteiro da cliente, com nome e CPF, no chatbot gratuito. (pausa)

**Perguntas 1 e 2: problemas, classificação e correção.**

[TELA: tabela abaixo, ou destaque cada trecho da minuta conforme fala]

| Trecho | Tipo | Como corrigir e onde conferir |
| --- | --- | --- |
| "Súmula 999 do STJ" | Citação inexistente | Buscar na página de súmulas do STJ. Se não existir, remover e pesquisar um fundamento real. |
| "Resolução CNJ nº 332/2020" | Norma desatualizada | Substituída pela Resolução CNJ nº 615/2025, que trata de IA no Judiciário e nem tem relação com o pedido. Remover. |
| "Multa por rescisão é vedada em qualquer hipótese" | Interpretação simplificada | Cláusula penal é admitida e pode ser reduzida se excessiva (art. 413 do Código Civil). |
| "Indenização devida independentemente de prova" | Afirmação conveniente demais | Sem fonte. Só fica se houver fundamento verificado. |
| Bilhete: contrato com nome e CPF no chatbot | Dado sensível exposto | Refazer com dados anonimizados, em ferramenta com contrato, e avisar o responsável. |

Vamos por partes.

"Súmula 999 do STJ". A gente busca na página de súmulas do STJ. Se ela não existir, é citação inexistente: sai da peça, e você pesquisa um fundamento real.

"Resolução CNJ 332 de 2020". É norma desatualizada, substituída pela 615 de 2025. E repare: ela trata de IA no Judiciário, não tem nada a ver com um contrato de prestação de serviços. Sai.

"Multa por rescisão é vedada em qualquer hipótese". Isso é interpretação simplificada. O Código Civil admite a cláusula penal, e o artigo 413 permite que o juiz reduza a multa se ela for excessiva. A tese correta não é "é proibida", é "é excessiva no caso concreto".

"Indenização devida independentemente de prova". Afirmação conveniente demais, sem fonte. Só fica se você encontrar fundamento verificado.

E o bilhete: dado sensível exposto. Contrato com nome e CPF num chatbot gratuito é quebra de sigilo e risco à LGPD. O certo é refazer com dados anonimizados, numa ferramenta com contrato empresarial, e avisar o responsável do escritório. (pausa)

**Pergunta 3: o primeiro parágrafo reescrito.**

[TELA: mostre o parágrafo abaixo]

> "A autora firmou com a ré contrato de prestação de serviços (doc. X). A cláusula 7ª estabelece multa rescisória que, no caso concreto, mostra-se manifestamente excessiva, cabendo sua redução equitativa nos termos do art. 413 do Código Civil."

Sem súmula inventada, sem resolução fora de contexto, e com o argumento certo.

**Pergunta 4: reflexão.**

Agora eu te convido a comparar a sua resposta com o que você pensava lá no Módulo 1. Quem usa IA para fazer o rascunho ganha produtividade. Quem nunca pula a verificação ganha segurança. O objetivo é ter as duas coisas.

Para fechar: esse é o profissional que esta capacitação quer formar, que usa IA com proveito, mas sem soltar as rédeas. Parabéns por chegar até aqui, e não esquece de responder o pós-teste!
