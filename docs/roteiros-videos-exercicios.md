# Roteiros dos vídeos de resolução — Exercícios práticos

Um vídeo por módulo, de 4 a 7 minutos, respondendo ao exercício prático que aparece na plataforma (`supabase/exercicios-praticos.sql`).
Estrutura sugerida para todos: **abertura (20 s) → relembrar o caso (30 s) → resolver item por item → erro mais comum → fechamento (20 s)**.

Para publicar cada vídeo depois de gravado:

```bash
npm run upload:exercicio -- --modulo 1 --video "C:/caminho/resolucao-modulo1.mp4" --duracao 6
```

> Os julgados, ministros e súmulas que aparecem nos enunciados são **fictícios de propósito**: a ideia é o aluno treinar a verificação. Nos vídeos, nunca afirme "esse julgado existe" ou "não existe" sem ter conferido. Mostre o caminho da conferência.

---

## Módulo 1 — Encontre a alucinação

**Abertura:** "Neste exercício você recebeu um parágrafo que parece perfeito. Vamos ver por que ele não poderia ir para a peça do jeito que está."

**1. Que tecnologia é o chatbot?**
- É um **LLM**: um Deep Learning especializado em linguagem, que está dentro do Machine Learning, que por sua vez está dentro da IA.
- Ele gera texto calculando o próximo token mais provável. Ele **não consulta** uma base de jurisprudência para responder.

**2. Sinais de alerta (pelo menos três):**
- **Precedente com número, relator e data muito específicos**, entregue sem link nem fonte. É exatamente o formato de uma alucinação: plausível e confiante.
- **"Resolução CNJ nº 332/2020, em vigor"**: ela foi substituída pela **Resolução CNJ nº 615/2025**. A norma citada está desatualizada.
- **"O ChatGPT consulta em tempo real a base oficial"**: é falso para a ferramenta generalista. Ela responde a partir do que aprendeu no treinamento.
- **"Pacificado pelo STJ"**: é uma afirmação forte e conveniente demais para o argumento, sem nenhuma fonte.

**3. O que conferir, e onde:**
- Buscar o número do REsp na pesquisa de jurisprudência do site do STJ, conferir se o relator compõe a Corte e ler a ementa original.
- Conferir a norma vigente no site do CNJ.
- Se não encontrar, **o trecho sai da minuta**.

**4. Norma da OAB:** a **Recomendação OAB nº 001/2024** exige que o profissional entenda as limitações da ferramenta, verifique rigorosamente o que ela gera e não delegue atos privativos sem supervisão.

**Erro mais comum:** achar que um texto bem escrito é um texto verdadeiro.
**Fechamento:** "IA ajuda a escrever, não a provar. Quem prova é você, na fonte."

---

## Módulo 2 — Do prompt vago à minuta revisada

**Abertura:** "O problema aqui não é a IA, é o pedido. Vamos transformar uma frase solta em um prompt profissional."

**1. Prompt reescrito (contexto, tarefa, formato e restrições).** Mostre na tela:

> Aja como assistente jurídico especializado em Direito do Consumidor. **Contexto:** a Cliente X comprou passagem São Paulo–Recife; o voo foi cancelado sem aviso prévio; ela foi realocada 26 horas depois, perdeu uma diária de hotel já paga e não recebeu assistência material. **Tarefa:** redija uma minuta de petição inicial de indenização por danos materiais e morais. **Formato:** qualificação (com campos em branco), dos fatos, do direito, dos pedidos; linguagem técnica e formal. **Restrições:** use apenas os fatos acima; cite somente dispositivos legais, sem inventar jurisprudência; se precisar de um precedente, deixe a marcação [PESQUISAR PRECEDENTE]; sinalize qualquer ponto em que não tiver certeza.

- Comente que o prompt já está **anonimizado** ("Cliente X") e já proíbe inventar jurisprudência.
- Fundamentos que o advogado vai **conferir na fonte**: CDC, art. 14 (responsabilidade do fornecedor de serviços) e Resolução ANAC nº 400/2016 (assistência material e reacomodação).

**2. Pesquisa de jurisprudência:**
- Usar uma **ferramenta jurídica especializada** (como Jus IA, Turivius ou a pesquisa dos próprios tribunais), que busca em bases reais e mostra a fonte.
- A **rastreabilidade** permite abrir o acórdão original. Ainda assim, a ferramenta facilita a conferência, mas não substitui a conferência.

**3. Os dois julgados não localizados:** saem da peça. Não se "ajusta" um julgado que não foi encontrado. Se for preciso um precedente, pesquise do zero na ferramenta especializada.

**4. O que só o advogado decide (pelo menos dois):**
- O valor e a estratégia do pedido de danos morais. Vale comentar que o tema exige cuidado, porque a jurisprudência não presume dano moral em todo atraso e o advogado precisa provar o abalo concreto.
- A escolha de quais fatos destacar.
- A conferência final de cada citação e a assinatura (Recomendação OAB nº 001/2024).

**Fechamento:** "A IA entrega um rascunho. A peça é sua."

---

## Módulo 3 — Onde o colega errou?

**Abertura:** "Esse caso reúne três erros num pedido só. Vamos separar um por um."

**1. Proteção de dados e sigilo:**
- Nome completo, CPF e número do processo foram colados em **ferramenta gratuita**, que pode reaproveitar conversas para treinamento.
- O diagnóstico de saúde é **dado pessoal sensível** pela LGPD (Lei nº 13.709/2018, art. 5º, II).
- Há também quebra do **sigilo profissional** (Código de Ética e Disciplina da OAB, capítulo do sigilo profissional).

**2. Quem responde:** **o advogado**. A ferramenta não assina nem tem responsabilidade processual.
- **Art. 77 do CPC:** deveres de boa-fé, lealdade e veracidade. Jurisprudência inventada pode configurar ato atentatório à dignidade da justiça, com multa de até 20% do valor da causa.
- Pode haver também condenação por litigância de má-fé (arts. 80 e 81 do CPC).
- **Art. 8º do Código de Ética:** dever de informar o cliente, de forma clara, sobre os riscos.

**3. Prompt seguro.** Mostre na tela:

> Aja como assistente jurídico trabalhista. Caso: o Empregado A foi dispensado logo após apresentar atestado de tratamento de saúde. Redija a estrutura de uma petição inicial (fatos, direito, pedidos). Indique a fonte de cada dispositivo legal citado. Não cite jurisprudência; marque [PESQUISAR PRECEDENTE] onde ela for necessária. Se não tiver certeza sobre algum ponto, diga isso claramente em vez de inventar.

**4. Checklist de cinco passos antes de protocolar:**
1. Anonimizar os dados antes de usar a IA.
2. Usar ferramenta com contrato que impede o reaproveitamento de dados.
3. Conferir cada citação na fonte original.
4. Verificar se as normas estão em vigor.
5. Reler perguntando: "eu assinaria isso com meu nome?"

**Fechamento:** "Verificar não é desconfiança. É rotina profissional."

---

## Módulo 4 — Revisão crítica de uma minuta

**Abertura:** "Agora você é o revisor. Vamos usar o checklist do Módulo 3 linha por linha."

**1 e 2. Problemas, classificação e correção:**

| Trecho | Tipo | Como corrigir e onde conferir |
| --- | --- | --- |
| "Súmula 999 do STJ" | Citação inexistente | Buscar na página de súmulas do STJ. Se não existir, remover e pesquisar um fundamento real em ferramenta especializada. |
| "Resolução CNJ nº 332/2020" | Norma desatualizada (e fora de contexto) | Foi substituída pela Resolução CNJ nº 615/2025, que trata de IA no Judiciário e não tem relação com o pedido. Remover. |
| "Multa por rescisão é vedada em qualquer hipótese" | Interpretação simplificada | Cláusula penal é admitida no Código Civil e pode ser reduzida pelo juiz se for excessiva (art. 413). Ler a cláusula 7ª e analisar o caso concreto. |
| "Indenização devida independentemente de prova" | Afirmação conveniente demais | Sem fonte. Só se mantém se houver fundamento verificado. |
| Bilhete: contrato com nome e CPF no chatbot gratuito | Dado sensível exposto | Quebra de sigilo e risco à LGPD. Refazer com dados anonimizados, em ferramenta com contrato empresarial, e avisar o responsável do escritório. |

**3. Primeiro parágrafo reescrito.** Exemplo:

> "A autora firmou com a ré contrato de prestação de serviços (doc. X). A cláusula 7ª estabelece multa rescisória que, no caso concreto, mostra-se manifestamente excessiva, cabendo sua redução equitativa nos termos do art. 413 do Código Civil."

**4. Reflexão:** convide o aluno a comparar a resposta dele com o que pensava no Módulo 1. Ganha produtividade quem usa IA para o rascunho; ganha segurança quem nunca pula a verificação.

**Fechamento:** "Esse é o profissional que a capacitação quer formar: usa IA com proveito, mas sem soltar as rédeas."
