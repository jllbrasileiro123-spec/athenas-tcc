import type { Language } from '../contexts/LanguageContext'
import { supabase } from './supabase'
import type { Course } from '../types/database'

export type AssistantAction =
  | { kind: 'navigate'; label: string; to: string }
  | { kind: 'password_form' }
  | { kind: 'support' }
  | { kind: 'course_cards'; courses: Pick<Course, 'id' | 'title' | 'price'>[] }

export type AssistantResult = {
  text: string
  topic: string | null
  actions: AssistantAction[]
  followups: string[]
}

type ReplyKey =
  | 'greeting'
  | 'howAreYou'
  | 'thanks'
  | 'bye'
  | 'help'
  | 'enroll'
  | 'password'
  | 'lessons'
  | 'instructor'
  | 'account'
  | 'athena'
  | 'price'
  | 'progress'
  | 'deadline'
  | 'search'
  | 'default'

type TurnContext = {
  lang: Language
  lastTopic: string | null
  pathname: string
  userId: string | null
}

const patterns: { key: ReplyKey; keys: string[] }[] = [
  {
    key: 'greeting',
    keys: ['oi', 'olá', 'ola', 'oie', 'eai', 'e aí', 'e ai', 'hey', 'hi', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'salve'],
  },
  {
    key: 'howAreYou',
    keys: ['tudo bem', 'td bem', 'tudo bom', 'como vai', 'como está', 'como esta', 'beleza', 'how are you', 'whats up', "what's up"],
  },
  { key: 'thanks', keys: ['obrigad', 'valeu', 'vlw', 'thanks', 'thank you', 'brigad'] },
  { key: 'bye', keys: ['tchau', 'até logo', 'ate logo', 'flw', 'bye', 'goodbye', 'até mais', 'ate mais'] },
  { key: 'help', keys: ['ajuda', 'help', 'socorro', 'o que voce faz', 'o que você faz', 'what can you'] },
  { key: 'progress', keys: ['progresso', 'quanto falta', 'ultima aula', 'última aula', 'porcento', '%', 'completei', 'progress'] },
  { key: 'deadline', keys: ['prazo', 'deadline', 'atras', 'perdi', 'expir'] },
  { key: 'enroll', keys: ['matricul', 'inscri', 'enroll'] },
  { key: 'password', keys: ['senha', 'password', 'esqueci', 'forgot'] },
  { key: 'search', keys: ['tem curso', 'buscar', 'procuro', 'quero aprender', 'curso de', 'formação de', 'search', 'find course'] },
  { key: 'lessons', keys: ['assistir', 'aula', 'video', 'lesson', 'watch'] },
  { key: 'instructor', keys: ['instrutor', 'publicar', 'criar curso', 'instructor', 'publish', 'tornar'] },
  { key: 'account', keys: ['conta', 'cadastr', 'account', 'sign up'] },
  { key: 'athena', keys: ['athena', 'assistente', 'assistant'] },
  { key: 'price', keys: ['preço', 'preco', 'gratis', 'grátis', 'pago', 'price', 'free', 'pagamento', 'payment'] },
]

const copy: Record<
  Language,
  Record<
    ReplyKey,
    { text: string; followups: string[]; navigate?: { label: string; to: string }; passwordForm?: boolean; support?: boolean }
  >
> = {
  pt: {
    greeting: {
      text: 'Oi! Sou a Athena, sua guia por aqui. Posso matricular, buscar cursos, ver seu progresso ou recuperar senha.',
      followups: ['Como me matricular?', 'Tem curso de Python?', 'Esqueci minha senha'],
    },
    howAreYou: {
      text: 'Tudo bem por aqui — pronta para te orientar. Quer explorar cursos ou continuar de onde parou?',
      followups: ['Ver meu progresso', 'Explorar cursos', 'Como assistir às aulas?'],
      navigate: { label: 'Abrir Meu aprendizado', to: '/meus-cursos' },
    },
    thanks: { text: 'Por nada! Se precisar, é só chamar.', followups: ['Ver meu progresso', 'Buscar um curso'] },
    bye: { text: 'Até logo! Quando voltar, continuo de onde paramos.', followups: [] },
    help: {
      text: 'Posso explicar e também agir: recuperar senha aqui no chat, buscar formações no catálogo e mostrar seu progresso.',
      followups: ['Esqueci minha senha', 'Tem curso de automação?', 'Quanto falta no meu curso?'],
    },
    enroll: {
      text: 'Para se matricular, abra a formação e use Matricular-se. Posso te levar ao catálogo agora.',
      followups: ['Tem curso de IA?', 'Como assistir depois?', 'Falar com o suporte'],
      navigate: { label: 'Explorar formações', to: '/explorar' },
    },
    password: {
      text: 'Sem problema — posso iniciar a recuperação de senha aqui mesmo. Informe o e-mail abaixo.',
      followups: ['Não recebi o e-mail', 'Falar com o suporte'],
      passwordForm: true,
    },
    lessons: {
      text: 'Depois de matriculado, abra a formação e clique em Assistir. Aulas com Prévia são grátis.',
      followups: ['Abrir Meu aprendizado', 'E se eu perder o prazo?', 'Como me matricular?'],
      navigate: { label: 'Ir para Meu aprendizado', to: '/meus-cursos' },
    },
    deadline: {
      text: 'Na ATHENAS as aulas matriculadas ficam disponíveis no seu ritmo — não há prazo de expiração por aula. Se algo sumiu, pode ser filtro ou curso não publicado.',
      followups: ['Ver meu progresso', 'Falar com o suporte', 'Como assistir às aulas?'],
      navigate: { label: 'Abrir Meu aprendizado', to: '/meus-cursos' },
    },
    instructor: {
      text: 'Para ensinar, peça em Conta → Tornar-se instrutor. Depois de aprovado, crie a formação e envie para revisão da curadoria.',
      followups: ['Quero ser instrutor', 'Como criar um curso?', 'Falar com o suporte'],
      navigate: { label: 'Tornar-se instrutor', to: '/tornar-se-instrutor' },
    },
    account: {
      text: 'Use Entrar ou Cadastre-se na tela inicial. Se precisar confirmar e-mail, olhe a caixa de entrada.',
      followups: ['Esqueci minha senha', 'Como me matricular?'],
      navigate: { label: 'Ir para Entrar', to: '/' },
    },
    athena: {
      text: 'Sou a Athena: oriento e executo ações rápidas (senha, busca, progresso). Para casos complexos, escalo ao suporte humano.',
      followups: ['Ver meu progresso', 'Falar com o suporte'],
      support: true,
    },
    price: {
      text: 'O preço aparece na página da formação. Zero = Grátis. Dúvidas de pagamento podem ir ao suporte.',
      followups: ['Explorar cursos', 'Falar com o suporte'],
      navigate: { label: 'Ver catálogo', to: '/explorar' },
    },
    progress: {
      text: 'Vou consultar suas matrículas e o andamento das aulas.',
      followups: ['Como assistir às aulas?', 'Explorar mais cursos'],
    },
    search: {
      text: 'Vou buscar no catálogo com base no que você pediu.',
      followups: ['Como me matricular?', 'Ver Meu aprendizado'],
    },
    default: {
      text: 'Não consegui resolver isso só com o que sei da plataforma. Quer tentar de outro jeito ou falar com o suporte humano?',
      followups: ['Como me matricular?', 'Esqueci minha senha', 'Falar com o suporte'],
      support: true,
    },
  },
  en: {
    greeting: {
      text: "Hi! I'm Athena, your guide here. I can help enroll, search courses, check progress, or reset your password.",
      followups: ['How do I enroll?', 'Any Python courses?', 'I forgot my password'],
    },
    howAreYou: {
      text: "I'm doing well — ready to help. Want to explore courses or continue where you left off?",
      followups: ['Check my progress', 'Explore courses', 'How do I watch lessons?'],
      navigate: { label: 'Open My learning', to: '/meus-cursos' },
    },
    thanks: { text: "You're welcome! Ask anytime.", followups: ['Check my progress', 'Find a course'] },
    bye: { text: 'See you later! I will pick up where we left off.', followups: [] },
    help: {
      text: 'I can explain and act: reset password in chat, search the catalog, and show your progress.',
      followups: ['I forgot my password', 'Any automation courses?', 'How much is left in my course?'],
    },
    enroll: {
      text: 'Open a program and click Enroll. I can take you to the catalog now.',
      followups: ['Any AI courses?', 'How do I watch after?', 'Talk to support'],
      navigate: { label: 'Explore programs', to: '/explorar' },
    },
    password: {
      text: 'I can start password recovery right here. Enter your email below.',
      followups: ["I didn't get the email", 'Talk to support'],
      passwordForm: true,
    },
    lessons: {
      text: 'After enrolling, open the program and click Watch. Preview lessons are free.',
      followups: ['Open My learning', 'What if I miss a deadline?', 'How do I enroll?'],
      navigate: { label: 'Go to My learning', to: '/meus-cursos' },
    },
    deadline: {
      text: 'Enrolled lessons stay available at your pace — there is no per-lesson expiry. If something is missing, check filters or unpublished courses.',
      followups: ['Check my progress', 'Talk to support', 'How do I watch lessons?'],
      navigate: { label: 'Open My learning', to: '/meus-cursos' },
    },
    instructor: {
      text: 'To teach, apply via Account → Become an instructor. After approval, create a program and submit it for curation review.',
      followups: ['I want to be an instructor', 'How do I create a course?', 'Talk to support'],
      navigate: { label: 'Become an instructor', to: '/tornar-se-instrutor' },
    },
    account: {
      text: 'Use Sign in or Sign up on the home screen. Confirm email if required.',
      followups: ['I forgot my password', 'How do I enroll?'],
      navigate: { label: 'Go to Sign in', to: '/' },
    },
    athena: {
      text: 'I am Athena: I guide and run quick actions (password, search, progress). For complex cases I escalate to human support.',
      followups: ['Check my progress', 'Talk to support'],
      support: true,
    },
    price: {
      text: 'Price is on the program page. Zero means Free. Payment issues can go to support.',
      followups: ['Explore courses', 'Talk to support'],
      navigate: { label: 'View catalog', to: '/explorar' },
    },
    progress: {
      text: 'I will check your enrollments and lesson progress.',
      followups: ['How do I watch lessons?', 'Explore more courses'],
    },
    search: {
      text: 'I will search the catalog for what you asked.',
      followups: ['How do I enroll?', 'Open My learning'],
    },
    default: {
      text: "I couldn't solve that with platform knowledge alone. Try another way or talk to human support?",
      followups: ['How do I enroll?', 'I forgot my password', 'Talk to support'],
      support: true,
    },
  },
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function matchesKey(question: string, key: string) {
  const k = normalize(key)
  if (k.length <= 3) {
    return new RegExp(`(?:^|\\s|[!.?,;:])${k}(?:$|\\s|[!.?,;:])`).test(` ${question} `)
  }
  return question.includes(k)
}

function detectIntent(text: string, lastTopic: string | null): ReplyKey {
  const q = normalize(text)

  if (/^(oi+|ola+|oie+|eai+|hey+|hi+|hello+)[\s!.?]*$/i.test(q)) return 'greeting'

  // Memória de sessão: follow-ups curtos sobre o tópico anterior
  if (lastTopic === 'lessons' && (q.includes('prazo') || q.includes('deadline') || q.includes('e se'))) {
    return 'deadline'
  }
  if (lastTopic === 'enroll' && (q.includes('depois') || q.includes('e ai') || q.includes('e aí'))) {
    return 'lessons'
  }

  for (const { key, keys } of patterns) {
    if (keys.some((k) => matchesKey(q, k))) return key
  }

  // Busca implícita: "python", "automação", etc. com curso/formação
  if (/(curso|formacao|formação|aprender|aula)/.test(q) && q.length > 8) return 'search'

  return 'default'
}

function extractSearchTerms(text: string) {
  return normalize(text)
    .replace(
      /\b(tem|curso|cursos|formacao|formação|de|da|do|quero|aprender|buscar|procuro|sobre|com|em|um|uma|any|course|courses|of|about|with)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
}

async function searchCatalog(query: string): Promise<Pick<Course, 'id' | 'title' | 'price'>[]> {
  const terms = extractSearchTerms(query).replace(/[%_,.()]/g, ' ').trim()
  if (!terms) return []

  const { data } = await supabase
    .from('courses')
    .select('id, title, price')
    .eq('published', true)
    .or(`title.ilike.%${terms}%,description.ilike.%${terms}%`)
    .limit(5)

  return (data as Pick<Course, 'id' | 'title' | 'price'>[] | null) ?? []
}

async function loadProgressSummary(userId: string, lang: Language): Promise<string> {
  const { data: enrolls } = await supabase
    .from('enrollments')
    .select('course_id, courses ( id, title, lessons ( id ) )')
    .eq('user_id', userId)

  if (!enrolls?.length) {
    return lang === 'pt'
      ? 'Você ainda não tem matrículas. Quer que eu te leve ao catálogo?'
      : 'You have no enrollments yet. Want me to open the catalog?'
  }

  type EnrollRow = {
    courses: { id: string; title: string; lessons: { id: string }[] | null } | null
  }

  const lines: string[] = []
  for (const row of enrolls.slice(0, 4) as unknown as EnrollRow[]) {
    const course = row.courses
    if (!course) continue
    const lessonIds = Array.isArray(course.lessons) ? course.lessons.map((l) => l.id) : []
    let done = 0
    if (lessonIds.length) {
      const { data: prog } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('completed', true)
        .in('lesson_id', lessonIds)
      done = prog?.length ?? 0
    }
    const total = lessonIds.length || 0
    const pct = total ? Math.round((done / total) * 100) : 0
    lines.push(
      lang === 'pt'
        ? `• ${course.title}: ${done}/${total} aulas (${pct}%)`
        : `• ${course.title}: ${done}/${total} lessons (${pct}%)`
    )
  }

  return lang === 'pt'
    ? `Aqui está seu andamento:\n${lines.join('\n')}`
    : `Here is your progress:\n${lines.join('\n')}`
}

function buildResult(
  key: ReplyKey,
  lang: Language,
  extras?: { text?: string; courses?: Pick<Course, 'id' | 'title' | 'price'>[] }
): AssistantResult {
  const base = copy[lang][key]
  const actions: AssistantAction[] = []
  if (base.navigate) actions.push({ kind: 'navigate', label: base.navigate.label, to: base.navigate.to })
  if (base.passwordForm) actions.push({ kind: 'password_form' })
  if (base.support) actions.push({ kind: 'support' })
  if (extras?.courses?.length) actions.push({ kind: 'course_cards', courses: extras.courses })

  return {
    text: extras?.text ?? base.text,
    topic: key === 'default' ? null : key,
    actions,
    followups: base.followups,
  }
}

export async function resolveAssistantTurn(text: string, ctx: TurnContext): Promise<AssistantResult> {
  const intent = detectIntent(text, ctx.lastTopic)

  if (intent === 'search') {
    const courses = await searchCatalog(text)
    if (courses.length) {
      return buildResult('search', ctx.lang, {
        text:
          ctx.lang === 'pt'
            ? `Encontrei ${courses.length} formação(ões) relacionadas. Abra um card para ver detalhes ou se matricular.`
            : `I found ${courses.length} related program(s). Open a card to view details or enroll.`,
        courses,
      })
    }
    return buildResult('search', ctx.lang, {
      text:
        ctx.lang === 'pt'
          ? 'Não achei formações com esses termos. Tente outro nome ou explore o catálogo.'
          : 'No programs matched those terms. Try another name or browse the catalog.',
    })
  }

  if (intent === 'progress') {
    if (!ctx.userId) {
      return buildResult('progress', ctx.lang, {
        text:
          ctx.lang === 'pt'
            ? 'Para ver seu progresso, faça login. Depois pergunte de novo.'
            : 'Sign in to see your progress, then ask again.',
      })
    }
    const summary = await loadProgressSummary(ctx.userId, ctx.lang)
    const result = buildResult('progress', ctx.lang, { text: summary })
    result.actions.unshift({
      kind: 'navigate',
      label: ctx.lang === 'pt' ? 'Abrir Meu aprendizado' : 'Open My learning',
      to: '/meus-cursos',
    })
    return result
  }

  return buildResult(intent, ctx.lang)
}

/** Sugestões iniciais conforme a rota atual */
export function getContextualSuggestions(pathname: string, lang: Language): string[] {
  if (pathname.startsWith('/assistir')) {
    return lang === 'pt'
      ? ['Quanto falta neste curso?', 'Como marco aula como vista?', 'Falar com o suporte']
      : ['How much is left in this course?', 'How do I mark a lesson done?', 'Talk to support']
  }
  if (pathname.startsWith('/curso/')) {
    return lang === 'pt'
      ? ['Como me matricular?', 'Como funciona o preço?', 'Tem prévia grátis?']
      : ['How do I enroll?', 'How does pricing work?', 'Is there a free preview?']
  }
  if (pathname.startsWith('/meus-cursos')) {
    return lang === 'pt'
      ? ['Quanto falta pra eu terminar?', 'Como assistir às aulas?', 'Explorar mais cursos']
      : ['How much is left to finish?', 'How do I watch lessons?', 'Explore more courses']
  }
  if (pathname.startsWith('/explorar') || pathname === '/') {
    return lang === 'pt'
      ? ['Tem curso de automação?', 'Como me matricular?', 'Esqueci minha senha']
      : ['Any automation courses?', 'How do I enroll?', 'I forgot my password']
  }
  return lang === 'pt'
    ? ['Como me matricular em um curso?', 'Esqueci minha senha', 'Como assistir às aulas?']
    : ['How do I enroll in a course?', 'I forgot my password', 'How do I watch lessons?']
}

export function saveAssistantFeedback(entry: {
  messageId: string
  vote: 'up' | 'down'
  text: string
}) {
  try {
    const key = 'athenas_athena_feedback'
    const prev = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]
    prev.push({ ...entry, at: new Date().toISOString() })
    localStorage.setItem(key, JSON.stringify(prev.slice(-100)))
  } catch {
    /* ignore */
  }
}
