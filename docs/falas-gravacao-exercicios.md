# Falas para gravação — Vídeos práticos dos módulos

Um vídeo rápido por módulo (**~2 min cada**), mostrando na prática, com a IA aberta na tela, e terminando com uma tarefa curta para o aluno repetir sozinho.
Não é para resolver o exercício item por item: as perguntas de reflexão continuam no exercício e no quiz. O vídeo só mostra **um exemplo** e **como praticar**.

**Legenda:** `[TELA: ...]` = o que mostrar na tela naquele momento. `(pausa)` = respire, dê tempo para o aluno ler.

## Antes de gravar

- [ ] Deixe aberto um chatbot generalista (ChatGPT, Gemini ou Copilot) numa conversa nova, e a pesquisa de jurisprudência do site do STJ.
- [ ] Faça um teste antes de gravar: a resposta da IA muda a cada vez. Se ela não inventar nada no Módulo 2, peça de novo ou use um print de uma resposta anterior.
- [ ] Use só casos fictícios e anonimizados ("Cliente X"). Nunca cole dado real.
- [ ] Não afirme que um julgado "existe" ou "não existe" sem ter conferido ao vivo.
- [ ] Feche notificações e esconda abas pessoais. Grave em 1080p.

Depois de gravar, publique cada vídeo:

```bash
npm run upload:exercicio -- --modulo 1 --video "C:/caminho/pratica-modulo1.mp4" --duracao 2
```

---

## Módulo 1 — A IA na prática: ela prevê, não pesquisa (~2 min)

[TELA: chatbot aberto, conversa nova]

Olá! Antes de ir para as perguntas do exercício, vamos ver a IA funcionando de verdade.

[TELA: digite o pedido abaixo]

> Explique em um parágrafo o que é responsabilidade civil objetiva.

Olha a velocidade e a segurança do texto. Parece uma resposta de professor. (pausa)

Agora o ponto principal do módulo: esse chatbot é um LLM, um modelo de linguagem. Ele não abriu nenhum livro nem nenhuma base de tribunal. Ele escreveu a sequência de palavras mais provável. Às vezes isso coincide com a verdade, às vezes não.

[TELA: digite o pedido abaixo]

> De onde você tirou essa informação? Você consultou alguma fonte agora?

Repare na resposta: ele mesmo admite que gera texto a partir do que aprendeu no treinamento. Texto bem escrito não é texto verificado.

**Sua vez:** abra uma IA, peça para ela explicar um tema que você domina bem e leia procurando um erro ou uma simplificação. Depois responda as perguntas do exercício pensando nisso. Até o próximo módulo!

---

## Módulo 2 — Pegando a IA na mentira (~2 min)

[TELA: chatbot aberto, conversa nova]

Olá! Agora vamos provocar uma alucinação de propósito e aprender a reconhecer.

[TELA: digite o pedido vago abaixo]

> Escreva uma petição de indenização por voo cancelado com jurisprudência do STJ.

(pausa) Olha que bonito: número de recurso, nome de relator, data. Tudo muito específico e nenhum link. Esse é o formato clássico da alucinação: detalhado, confiante e sem fonte.

[TELA: copie o número de um julgado citado e cole na pesquisa de jurisprudência do STJ]

Vamos conferir. Copio o número e busco no site do STJ. [mostre o resultado real: não encontrado, ou um processo sobre outro assunto]

Pronto: ou o julgado não existe, ou existe e não diz nada disso. Os três sinais para ficar de olho: número e relator muito específicos sem link, frase do tipo "entendimento pacificado", e um texto que concorda perfeitamente com o que você queria ouvir.

[TELA: digite o pedido corrigido abaixo]

> Não cite jurisprudência. Onde precisar de precedente, escreva [PESQUISAR PRECEDENTE]. Se não tiver certeza de algo, diga.

Viu? Agora a lacuna aparece em vez de ser preenchida com algo falso.

**Sua vez:** peça para uma IA três julgados sobre um tema qualquer e confira cada um no site do tribunal. Anote quantos existem de verdade. Até o próximo módulo!

---

## Módulo 3 — O mesmo pedido, sem expor o cliente (~2 min)

[TELA: bloco de notas com o pedido errado abaixo — não cole no chatbot]

Olá! Neste módulo o risco não é só a IA errar, é você expor o cliente. Olha esse pedido:

> Meu cliente João Pereira da Silva, CPF 123.456.789-00, tem depressão e foi demitido. Escreva a petição.

Nome, CPF e um dado de saúde, que pela LGPD é dado sensível, colados numa ferramenta gratuita que pode reaproveitar a conversa. Isso eu não vou nem enviar. (pausa)

[TELA: apague nome, CPF e diagnóstico, e reescreva ao vivo]

Vamos limpar: o nome vira "Empregado A", o CPF sai, e "depressão" vira "tratamento de saúde". A IA não precisa de mais que isso para entender o caso.

[TELA: cole no chatbot]

> Aja como assistente jurídico trabalhista. O Empregado A foi dispensado logo após apresentar atestado de tratamento de saúde. Monte a estrutura de uma petição inicial (fatos, direito, pedidos). Indique a fonte de cada artigo citado. Não cite jurisprudência; marque [PESQUISAR PRECEDENTE]. Se não tiver certeza, diga.

O resultado é tão útil quanto antes, e nenhum dado do cliente saiu do escritório. E lembra: quem assina e responde pela peça é o advogado, não a ferramenta.

**Sua vez:** pegue um caso seu, reescreva o pedido trocando tudo que identifica o cliente e só então mande para a IA. Até o último módulo!

---

## Módulo 4 — Juntando tudo num prompt profissional (~2 min)

[TELA: chatbot aberto, conversa nova]

Olá! Último módulo. Vamos juntar tudo num fluxo só: prompt bem feito, dados protegidos e revisão.

[TELA: digite o prompt abaixo, parte por parte, falando cada etiqueta]

> **Contexto:** sou advogado; a Cliente X teve o voo São Paulo–Recife cancelado sem aviso, foi realocada 26 horas depois, perdeu uma diária de hotel paga e não recebeu assistência.
> **Tarefa:** redija uma minuta de petição inicial de indenização.
> **Formato:** fatos, direito, pedidos; linguagem formal.
> **Restrições:** use só esses fatos; cite apenas lei, com o artigo; nada de jurisprudência, marque [PESQUISAR PRECEDENTE]; avise quando não tiver certeza.

Contexto, tarefa, formato e restrições. Com essas quatro partes a resposta deixa de ser genérica. (pausa)

[TELA: role a minuta gerada, destacando os pontos de revisão]

E agora a parte que é sua: confiro cada artigo citado na fonte, procuro os precedentes numa ferramenta jurídica que mostra a origem, e decido o valor dos danos morais e a estratégia. A IA fez o rascunho em segundos. A peça continua sendo minha.

**Sua vez:** monte um prompt com as quatro partes para um caso fictício da sua área, gere a minuta e revise linha por linha, como se fosse assinar. Parabéns por chegar até aqui, e não esquece de responder o pós-teste!
