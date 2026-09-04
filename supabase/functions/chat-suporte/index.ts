// Athena com IA — Atividade 7 do plano do TCC
//
// Recebe a pergunta do aluno, monta o contexto com as formações em que ele
// está matriculado (título, descrição e aulas) e pede a resposta ao modelo.
//
// A chave da IA vive só aqui, como secret da função. Nunca em VITE_*, que
// ficaria visível no navegador de qualquer visitante.
//
// Deploy:
//   supabase functions deploy chat-suporte
//   supabase secrets set GEMINI_API_KEY=...      (ou OPENAI_API_KEY / ANTHROPIC_API_KEY)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ChatTurn = { role: 'user' | 'assistant'; content: string }

type LessonRow = { title: string; content_type: string | null; sort_order: number }
type CourseRow = { id: string; title: string; description: string | null; lessons: LessonRow[] | null }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function lessonLabel(type: string | null) {
  if (type === 'quiz') return 'quiz'
  if (type === 'simulado') return 'simulado'
  return 'aula em vídeo'
}

function describeCourses(courses: CourseRow[]) {
  return courses
    .map((course) => {
      const lessons = [...(course.lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      const outline = lessons.length
        ? lessons.map((l, i) => `    ${i + 1}. ${l.title} (${lessonLabel(l.content_type)})`).join('\n')
        : '    (sem aulas cadastradas)'
      return `- Formação "${course.title}"\n  Descrição: ${course.description ?? 'sem descrição'}\n  Conteúdo:\n${outline}`
    })
    .join('\n\n')
}

function buildSystemPrompt(params: {
  studentName: string
  courses: CourseRow[]
  focusedCourseId: string | null
  progress: string
}) {
  const { studentName, courses, focusedCourseId, progress } = params
  const focused = courses.find((c) => c.id === focusedCourseId)

  const base = `Você é a Athena, assistente de estudos da plataforma ATHENAS.
Fale em português do Brasil, em tom próximo e direto, como uma monitora que conhece o aluno.
Responda em no máximo 2 parágrafos curtos. Não use emojis nem markdown de título.

Aluno: ${studentName}.

Você é uma monitora de estudos completa: além do conteúdo das formações, responda
dúvidas acadêmicas gerais (matemática, português, física, química, história,
redação, lógica, programação e afins), porque o público da plataforma são
estudantes se preparando para vestibular e concurso. Explique o conceito com
clareza e, quando ajudar, dê um exemplo curto ou a fórmula.`

  const extra = Deno.env.get('ATHENA_EXTRA_PROMPT')
  const tail = extra ? `\n\nInstruções adicionais:\n${extra}` : ''

  if (!courses.length) {
    return `${base}

O aluno ainda não está matriculado em nenhuma formação.
Responda a dúvida de estudo dele normalmente e, quando fizer sentido, ajude com o uso da plataforma (matrícula, senha, trilha, XP, quizzes, teste de nivelamento, certificado) e convide-o a escolher uma formação no catálogo.${tail}`
  }

  const focusLine = focused
    ? `\nO aluno está agora dentro da formação "${focused.title}". Priorize esse contexto.`
    : ''

  return `${base}

Formações em que ele está matriculado, com o conteúdo real de cada uma:

${describeCourses(courses)}
${focusLine}

Progresso dele: ${progress}

Regras:
- Use o conteúdo acima para responder dúvidas sobre os cursos. Cite o nome da aula quando fizer sentido.
- Se a pergunta for sobre um assunto que a aula cobre, explique o conceito de verdade, não apenas onde encontrá-lo.
- Se a pergunta for de estudo em geral, responda mesmo que não esteja nas aulas. Só avise que o tema não faz parte das formações dele quando ele parecer estar procurando isso no material do curso.
- Regras da plataforma que você conhece: aula em vídeo conclui com 90% assistido (+10 XP), quiz aprova com 70% (+15 XP), simulado aprova com 70% (+30 XP), o teste de nivelamento libera a aula com 70% de acerto nas perguntas dela, e o certificado com código de verificação sai ao concluir 100% da trilha.
- Quando a dúvida for sobre o material específico do instrutor e você não tiver essa informação, sugira enviar a pergunta ao instrutor pelo botão de dúvidas da aula.
- Nunca invente aulas, notas ou prazos que não estejam acima.${tail}`
}

async function callGemini(key: string, system: string, history: ChatTurn[], question: string) {
  const contents = [
    ...history.map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    })),
    { role: 'user', parts: [{ text: question }] },
  ]

  // Modelos do Gemini são aposentados de tempo em tempo. Para trocar sem
  // republicar a função, defina o secret GEMINI_MODEL.
  const primary = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'

  // Quando o modelo principal está lotado (503), tenta os alias "latest", que
  // apontam para a versão disponível no momento e raramente saem do ar juntos.
  const fallbacks = (Deno.env.get('GEMINI_FALLBACK_MODELS') ?? 'gemini-flash-latest,gemini-flash-lite-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)

  const models = [primary, ...fallbacks.filter((m) => m !== primary)]

  // Os modelos novos gastam parte do orçamento "pensando" antes de escrever.
  // Sem folga aqui, a resposta chega cortada no meio da frase.
  const maxOutputTokens = Number(Deno.env.get('GEMINI_MAX_TOKENS') ?? '2048')

  const payload: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      maxOutputTokens,
      temperature: 0.4,
      // Chat de suporte não precisa de raciocínio longo: desliga para o
      // orçamento inteiro virar texto útil.
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  async function attempt(model: string, body: Record<string, unknown>) {
    // Chave vai no cabeçalho, nunca na URL: aceita os dois formatos de chave do
    // AI Studio e evita que a credencial apareça em log de proxy.
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      return { status: res.status, error: await res.text(), text: '', finishReason: '' }
    }

    const data = await res.json()
    const candidate = data?.candidates?.[0]
    const text = String(
      candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
    ).trim()

    return {
      status: res.status,
      error: '',
      text,
      finishReason: String(candidate?.finishReason ?? ''),
    }
  }

  // 429/500/503 são "tente de novo mais tarde", não erro de código: a fila do
  // Google costuma liberar em menos de um segundo, então vale insistir.
  const isBusy = (status: number) => status === 429 || status === 500 || status === 503
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  let result = { status: 0, error: 'gemini não chamado', text: '', finishReason: '' }
  let usedModel = models[0]
  let primeiraFalha = ''

  for (const model of models) {
    usedModel = model

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      if (tentativa > 0) {
        const espera = 400 * 2 ** (tentativa - 1)
        console.warn(`gemini ${result.status} em ${model}; tentando de novo em ${espera}ms`)
        await sleep(espera)
      }

      result = await attempt(model, payload)

      // Modelos antigos não conhecem thinkingConfig e rejeitam o campo.
      if (result.status === 400) {
        result = await attempt(model, {
          ...payload,
          generationConfig: { maxOutputTokens, temperature: 0.4 },
        })
      }

      // Guarda o primeiro erro: se tudo falhar, ele explica a causa real
      // melhor que o erro do último fallback da lista.
      if (result.error && !primeiraFalha) primeiraFalha = `gemini ${result.status}: ${result.error}`

      if (!isBusy(result.status)) break
    }

    // Só troca de modelo quando o problema é do modelo: lotado ou aposentado.
    if (!isBusy(result.status) && result.status !== 404) break
  }

  // Resposta cortada no meio: o raciocínio comeu o orçamento. Repete com folga.
  if (result.finishReason === 'MAX_TOKENS') {
    console.warn(`gemini truncou em ${maxOutputTokens} tokens; repetindo com mais espaço`)
    result = await attempt(usedModel, {
      ...payload,
      generationConfig: {
        maxOutputTokens: Math.min(maxOutputTokens * 4, 8192),
        temperature: 0.4,
        thinkingConfig: { thinkingBudget: 0 },
      },
    })
  }

  if (result.error) throw new Error(primeiraFalha || `gemini ${result.status}: ${result.error}`)

  if (!result.text) {
    throw new Error(`gemini sem texto (finishReason: ${result.finishReason || 'desconhecido'})`)
  }

  return result.text
}

async function callOpenAi(key: string, system: string, history: ChatTurn[], question: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      max_tokens: 600,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        ...history,
        { role: 'user', content: question },
      ],
    }),
  })

  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return String(data?.choices?.[0]?.message?.content ?? '').trim()
}

async function callAnthropic(key: string, system: string, history: ChatTurn[], question: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-3-5-haiku-latest',
      max_tokens: 600,
      system,
      messages: [...history, { role: 'user', content: question }],
    }),
  })

  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data?.content?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  return String(text).trim()
}

/** Usa o provedor cuja chave estiver configurada como secret. */
async function askModel(system: string, history: ChatTurn[], question: string) {
  const gemini = Deno.env.get('GEMINI_API_KEY')
  if (gemini) return { text: await callGemini(gemini, system, history, question), provider: 'gemini' }

  const openai = Deno.env.get('OPENAI_API_KEY')
  if (openai) return { text: await callOpenAi(openai, system, history, question), provider: 'openai' }

  const anthropic = Deno.env.get('ANTHROPIC_API_KEY')
  if (anthropic) {
    return { text: await callAnthropic(anthropic, system, history, question), provider: 'anthropic' }
  }

  return { text: '', provider: 'none' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'not_authenticated' }, 401)

  // Cliente com o token do próprio aluno: só enxerga o que a RLS dele permite
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return json({ error: 'not_authenticated' }, 401)

  let payload: { pergunta?: string; historico?: ChatTurn[]; curso_id?: string | null } = {}
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }

  const question = (payload.pergunta ?? '').trim()
  if (!question) return json({ error: 'empty_question' }, 400)

  const history = (payload.historico ?? [])
    .filter((t) => t && typeof t.content === 'string' && t.content.trim())
    .slice(-6)
    .map((t) => ({ role: t.role === 'assistant' ? 'assistant' : 'user', content: t.content.trim() }))

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('courses ( id, title, description, lessons ( id, title, content_type, sort_order ) )')
    .eq('user_id', user.id)

  const courses = ((enrollments ?? []) as { courses: CourseRow | null }[])
    .map((row) => row.courses)
    .filter((c): c is CourseRow => !!c)

  // Progresso real, para a resposta saber onde o aluno parou
  const lessonIds = courses.flatMap((c) => (c.lessons ?? []).map((l) => (l as unknown as { id: string }).id))
  let progress = 'sem aulas concluídas ainda'

  if (lessonIds.length) {
    const { data: done } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('completed', true)
      .in('lesson_id', lessonIds)

    const doneIds = new Set((done ?? []).map((d: { lesson_id: string }) => d.lesson_id))
    progress = courses
      .map((c) => {
        const ls = (c.lessons ?? []) as unknown as { id: string }[]
        const count = ls.filter((l) => doneIds.has(l.id)).length
        return `${c.title}: ${count}/${ls.length} aulas concluídas`
      })
      .join('; ')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const system = buildSystemPrompt({
    studentName: (profile as { full_name?: string } | null)?.full_name ?? 'aluno',
    courses,
    focusedCourseId: payload.curso_id ?? null,
    progress,
  })

  try {
    const { text, provider } = await askModel(system, history, question)
    if (!text) return json({ error: 'no_api_key' }, 503)
    return json({ resposta: text, provider })
  } catch (err) {
    console.error('chat-suporte', err)
    return json({ error: 'model_failed', detail: String(err) }, 502)
  }
})
