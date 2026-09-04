import type { Language } from '../contexts/LanguageContext'
import { supabase } from './supabase'
import { askAthenaAi, type AiTurn } from './athenaAi'
import type { Course } from '../types/database'

export type AssistantAction =
  | { kind: 'navigate'; label: string; to: string }
  | { kind: 'password_form' }
  | { kind: 'support' }
  | { kind: 'course_cards'; courses: Pick<Course, 'id' | 'title' | 'price'>[] }
  /** Envia a dúvida para o instrutor dono do curso, direto do chat */
  | { kind: 'ask_instructor'; courseId: string; lessonId: string | null }

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
  | 'whatsNew'
  | 'quiz'
  | 'demo'
  | 'doubt'
  | 'courseContent'
  | 'placement'
  | 'default'

type TurnContext = {
  lang: Language
  lastTopic: string | null
  pathname: string
  userId: string | null
  /** Últimos turnos da conversa, usados pela IA quando ela está publicada */
  history?: AiTurn[]
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
  { key: 'athena', keys: ['athena', 'assistente', 'assistant', 'chatbot', 'chat bot'] },
  { key: 'doubt', keys: ['dúvida', 'duvida', 'duvidas', 'dúvidas', 'pergunta', 'tire suas', 'tirar dúvida'] },
  { key: 'whatsNew', keys: ['novidade', 'novidades', 'o que foi adicionado', 'o que mudou', 'changelog', 'whats new'] },
  {
    key: 'placement',
    keys: [
      'nivelamento',
      'pre-teste',
      'pré-teste',
      'pre teste',
      'teste rapido',
      'teste rápido',
      'pular aula',
      'diagnostico',
      'diagnóstico',
      'placement',
    ],
  },
  {
    key: 'courseContent',
    keys: [
      'o que tem nesse curso',
      'o que tem neste curso',
      'conteudo do curso',
      'conteúdo do curso',
      'sobre esse curso',
      'sobre este curso',
      'sobre essa aula',
      'sobre esta aula',
      'o que vou aprender',
      'quais aulas',
      'de que trata',
      'ementa',
      'course content',
      'what is in this course',
      'which lessons',
    ],
  },
  { key: 'quiz', keys: ['quiz', 'simulado', 'responder', 'checkpoint', 'pergunta do quiz'] },
  { key: 'demo', keys: ['demo', 'vídeo demo', 'video demo', 'aula demo', 'publicar demo', 'ambiente demo'] },
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
    doubt: {
      text: 'Sobre a plataforma eu respondo na hora: matrícula, senha, progresso, quiz, nivelamento e certificado. Se a dúvida for do conteúdo de uma formação, abra a aula e eu encaminho a pergunta ao instrutor dono do curso.',
      followups: ['Como me matricular?', 'Ver meu progresso', 'Como funciona o nivelamento?'],
      navigate: { label: 'Ver minhas formações', to: '/meus-cursos' },
    },
    whatsNew: {
      text: 'As entregas recentes estão na página Novidades: PWA, curadoria, gamificação, Athena, Google, Termos e quizzes.',
      followups: ['Abrir ambiente demo', 'Como responder um quiz?', 'Falar com o suporte'],
      navigate: { label: 'Abrir Novidades', to: '/novidades' },
    },
    quiz: {
      text: 'Quizzes ficam na trilha da formação (tipo Checkpoint). Publique as aulas demo no seu perfil e abra o quiz para responder.',
      followups: ['Abrir ambiente demo', 'Ver meu progresso', 'O que foi adicionado recentemente?'],
      navigate: { label: 'Ambiente demo', to: '/demo-video' },
    },
    demo: {
      text: 'No Ambiente demo você publica várias aulas + quizzes no seu perfil (vídeo hospedado, sem YouTube) e testa tudo.',
      followups: ['O que foi adicionado recentemente?', 'Como me matricular?', 'Ver Meu aprendizado'],
      navigate: { label: 'Ir ao Ambiente demo', to: '/demo-video' },
    },
    placement: {
      text: 'O teste de nivelamento é opcional: acertando 70% ou mais das perguntas de uma aula, ela já entra como concluída na sua trilha. Abra a formação e escolha "Fazer teste rápido de nivelamento".',
      followups: ['O que tem nesse curso?', 'Ver meu progresso', 'Como me matricular?'],
    },
    courseContent: {
      text: 'Vou olhar o conteúdo desta formação para te responder.',
      followups: ['Quanto falta pra eu terminar?', 'Como funciona o nivelamento?', 'Falar com o suporte'],
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
    doubt: {
      text: 'Platform questions I answer right away: enrollment, password, progress, quizzes, placement test, and certificate. If the doubt is about a program content, open the lesson and I forward it to the instructor who owns the course.',
      followups: ['How do I enroll?', 'Check my progress', 'How does the placement test work?'],
      navigate: { label: 'Open My learning', to: '/meus-cursos' },
    },
    whatsNew: {
      text: 'Recent deliveries are on the Whats new page: PWA, curation, gamification, Athena, Google, Terms, and quizzes.',
      followups: ['Open demo lab', 'How do I answer a quiz?', 'Talk to support'],
      navigate: { label: "Open What's new", to: '/novidades' },
    },
    quiz: {
      text: 'Quizzes live on the course trail (Checkpoint). Publish the demo lessons on your profile, then open the quiz to answer.',
      followups: ['Open demo lab', 'Check my progress', 'What was added recently?'],
      navigate: { label: 'Demo lab', to: '/demo-video' },
    },
    demo: {
      text: 'In the Demo lab you publish several lessons + quizzes on your profile (hosted video, no YouTube) and try everything.',
      followups: ['What was added recently?', 'How do I enroll?', 'Open My learning'],
      navigate: { label: 'Go to Demo lab', to: '/demo-video' },
    },
    placement: {
      text: 'The placement test is optional: scoring 70% or more on a lesson marks it complete on your trail. Open the program and choose "Take the quick placement test".',
      followups: ['What is in this course?', 'Check my progress', 'How do I enroll?'],
    },
    courseContent: {
      text: 'Let me check this program content to answer you.',
      followups: ['How much is left to finish?', 'How does the placement test work?', 'Talk to support'],
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

  // Busca implícita: "python", "automação", etc. com curso/formação (inclui plural)
  if (/(curso|formaca|formaco|aprender|aula)/.test(q) && q.length > 8) return 'search'

  return 'default'
}

function extractSearchTerms(text: string) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(
      /\b(tem|curso|cursos|formacao|formacoes|de|da|do|quero|aprender|buscar|procuro|sobre|com|em|um|uma|duvida|duvidas|minha|minhas|meu|meus|any|course|courses|of|about|with|question)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Raiz aproximada da palavra, para "automação" casar com "automações".
 * Os acentos já saíram no normalize, então basta cortar a terminação.
 */
function stem(token: string) {
  return token.length >= 6 ? token.slice(0, Math.max(5, token.length - 3)) : token
}

function matchesTerms(haystack: string, tokens: string[]) {
  const hay = normalize(haystack)
  return tokens.some((token) => hay.includes(token) || hay.includes(stem(token)))
}

function searchTokens(text: string) {
  return extractSearchTerms(text)
    .split(' ')
    .filter((token) => token.length >= 3)
}

/**
 * Busca no catálogo comparando sem acento e por raiz da palavra — o `ilike`
 * do banco falhava em "automação" x "automações".
 */
async function searchCatalog(query: string): Promise<Pick<Course, 'id' | 'title' | 'price'>[]> {
  const tokens = searchTokens(query)
  if (!tokens.length) return []

  const { data } = await supabase
    .from('courses')
    .select('id, title, price, description')
    .eq('published', true)
    .limit(200)

  const rows = (data as (Pick<Course, 'id' | 'title' | 'price'> & { description: string | null })[] | null) ?? []

  return rows
    .filter((c) => matchesTerms(`${c.title} ${c.description ?? ''}`, tokens))
    .slice(0, 5)
    .map(({ id, title, price }) => ({ id, title, price }))
}

/** Curso em foco a partir da rota (/curso/:id, /assistir/:courseId/:lessonId, /nivelamento/:courseId) */
export function courseIdFromPath(pathname: string): string | null {
  const watch = pathname.match(/^\/assistir\/([0-9a-fA-F-]{36})\//)
  if (watch) return watch[1]
  const detail = pathname.match(/^\/(?:curso|nivelamento|certificado)\/([0-9a-fA-F-]{36})/)
  if (detail) return detail[1]
  return null
}

/** Aula em foco, quando o aluno está no player */
export function lessonIdFromPath(pathname: string): string | null {
  const watch = pathname.match(/^\/assistir\/[0-9a-fA-F-]{36}\/([0-9a-fA-F-]{36})/)
  return watch ? watch[1] : null
}

type CourseContextLesson = {
  title: string
  content_type: string | null
  sort_order: number
}

/**
 * Contexto de conteúdo do curso aberto: título, descrição e lista de aulas.
 * É a camada que faz a Athena responder sobre o conteúdo, não só o FAQ.
 */
async function loadCourseContext(
  courseId: string,
  lang: Language,
  userId: string | null
): Promise<string | null> {
  const [{ data: course }, { data: lessons }] = await Promise.all([
    supabase.from('courses').select('title, description').eq('id', courseId).maybeSingle(),
    supabase
      .from('lessons')
      .select('title, content_type, sort_order')
      .eq('course_id', courseId)
      .order('sort_order'),
  ])

  if (!course) return null

  const info = course as { title: string; description: string | null }
  const list = (lessons as CourseContextLesson[] | null) ?? []

  const typeLabel = (type: string | null) => {
    if (type === 'quiz') return lang === 'pt' ? 'quiz' : 'quiz'
    if (type === 'simulado') return lang === 'pt' ? 'simulado' : 'exam'
    return lang === 'pt' ? 'vídeo' : 'video'
  }

  const outline = list
    .slice(0, 10)
    .map((l, i) => `${i + 1}. ${l.title} (${typeLabel(l.content_type)})`)
    .join('\n')

  let progressLine = ''
  if (userId && list.length) {
    const { data: ids } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
    const lessonIds = (ids as { id: string }[] | null)?.map((l) => l.id) ?? []
    if (lessonIds.length) {
      const { data: prog } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('completed', true)
        .in('lesson_id', lessonIds)
      const done = prog?.length ?? 0
      progressLine =
        lang === 'pt'
          ? `\n\nSeu andamento aqui: ${done}/${lessonIds.length} aulas concluídas.`
          : `\n\nYour progress here: ${done}/${lessonIds.length} lessons completed.`
    }
  }

  if (lang === 'pt') {
    const desc = info.description ? `\n${info.description}` : ''
    const body = outline
      ? `\n\nAulas desta formação:\n${outline}`
      : '\n\nEsta formação ainda não tem aulas cadastradas.'
    return `Você está em "${info.title}".${desc}${body}${progressLine}`
  }

  const desc = info.description ? `\n${info.description}` : ''
  const body = outline
    ? `\n\nLessons in this program:\n${outline}`
    : '\n\nThis program has no lessons yet.'
  return `You are in "${info.title}".${desc}${body}${progressLine}`
}

type MyCourse = {
  id: string
  title: string
  description: string | null
  lessons: CourseContextLesson[]
  completed: number
}

/** Formações em que o usuário está matriculado, com aulas e progresso. */
async function loadMyCourses(userId: string): Promise<MyCourse[]> {
  const { data } = await supabase
    .from('enrollments')
    .select('course_id, courses ( id, title, description, lessons ( id, title, content_type, sort_order ) )')
    .eq('user_id', userId)

  type Row = {
    courses:
      | {
          id: string
          title: string
          description: string | null
          lessons: (CourseContextLesson & { id: string })[] | null
        }
      | null
  }

  const rows = (data as unknown as Row[] | null) ?? []
  const courses = rows
    .map((r) => r.courses)
    .filter((c): c is NonNullable<Row['courses']> => !!c)

  if (!courses.length) return []

  const allLessonIds = courses.flatMap((c) => (c.lessons ?? []).map((l) => l.id))
  const doneByCourse = new Map<string, number>()

  if (allLessonIds.length) {
    const { data: prog } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('lesson_id', allLessonIds)

    const doneIds = new Set((prog as { lesson_id: string }[] | null)?.map((p) => p.lesson_id) ?? [])
    for (const c of courses) {
      doneByCourse.set(c.id, (c.lessons ?? []).filter((l) => doneIds.has(l.id)).length)
    }
  }

  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    lessons: [...(c.lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    completed: doneByCourse.get(c.id) ?? 0,
  }))
}

/** Descobre a qual das formações do aluno a pergunta se refere. */
function pickCourseFromQuestion(text: string, courses: MyCourse[]): MyCourse | null {
  if (courses.length === 0) return null
  const tokens = searchTokens(text)
  if (!tokens.length) return null

  let best: { course: MyCourse; score: number } | null = null
  for (const course of courses) {
    const titleTokens = searchTokens(course.title)
    let score = 0
    for (const token of tokens) {
      const hit = titleTokens.some((tt) => {
        const a = stem(token)
        const b = stem(tt)
        return (a.length >= 4 && tt.includes(a)) || (b.length >= 4 && token.includes(b))
      })
      if (hit) score += 2
      else if (token.length >= 4 && matchesTerms(course.description ?? '', [token])) score += 1
    }
    if (score > 0 && (!best || score > best.score)) best = { course, score }
  }
  return best?.course ?? null
}

function describeCourse(course: MyCourse, lang: Language): string {
  const typeLabel = (type: string | null) => {
    if (type === 'quiz') return 'quiz'
    if (type === 'simulado') return lang === 'pt' ? 'simulado' : 'exam'
    return lang === 'pt' ? 'vídeo' : 'video'
  }

  const outline = course.lessons
    .slice(0, 12)
    .map((l, i) => `${i + 1}. ${l.title} (${typeLabel(l.content_type)})`)
    .join('\n')

  const total = course.lessons.length
  const nextLesson = course.lessons[course.completed]

  if (lang === 'pt') {
    const desc = course.description ? `\n${course.description}` : ''
    const body = outline ? `\n\nAulas:\n${outline}` : '\n\nEsta formação ainda não tem aulas.'
    const progress = total ? `\n\nSeu andamento: ${course.completed}/${total} aulas concluídas.` : ''
    const resume = nextLesson ? `\nPróxima aula sua: ${nextLesson.title}.` : ''
    return `Sobre "${course.title}":${desc}${body}${progress}${resume}`
  }

  const desc = course.description ? `\n${course.description}` : ''
  const body = outline ? `\n\nLessons:\n${outline}` : '\n\nThis program has no lessons yet.'
  const progress = total ? `\n\nYour progress: ${course.completed}/${total} lessons completed.` : ''
  const resume = nextLesson ? `\nYour next lesson: ${nextLesson.title}.` : ''
  return `About "${course.title}":${desc}${body}${progress}${resume}`
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
  const focusedCourseId = courseIdFromPath(ctx.pathname)
  const focusedLessonId = lessonIdFromPath(ctx.pathname)

  // Atividade 7 — resposta gerada por IA com o conteúdo das formações do aluno.
  // Só entra em dúvidas de conteúdo; o FAQ operacional continua instantâneo.
  const aiWorthy = intent === 'courseContent' || intent === 'doubt' || intent === 'default'
  if (ctx.userId && aiWorthy) {
    const answer = await askAthenaAi({
      question: text,
      history: ctx.history ?? [],
      courseId: focusedCourseId,
    })

    if (answer) {
      const result = buildResult('courseContent', ctx.lang, { text: answer })
      if (focusedCourseId) {
        result.actions.unshift({
          kind: 'ask_instructor',
          courseId: focusedCourseId,
          lessonId: focusedLessonId,
        })
      }
      result.followups =
        ctx.lang === 'pt'
          ? ['Explica de novo mais simples', 'Quanto falta pra eu terminar?', 'Falar com o suporte']
          : ['Explain it more simply', 'How much is left to finish?', 'Talk to support']
      return result
    }
  }

  // Atividade 7: dentro de uma formação, responde com o conteúdo do curso e
  // oferece encaminhar a dúvida ao instrutor. Fora dela, cai no FAQ geral.
  if (focusedCourseId && (intent === 'courseContent' || intent === 'doubt' || intent === 'default')) {
    const context = await loadCourseContext(focusedCourseId, ctx.lang, ctx.userId)
    if (context) {
      const intro =
        intent === 'default'
          ? ctx.lang === 'pt'
            ? 'Isso eu não sei responder sozinha, mas posso te mostrar o conteúdo desta formação e mandar sua dúvida para o instrutor.\n\n'
            : "I can't answer that on my own, but I can show this program's content and forward your question to the instructor.\n\n"
          : ''

      const result = buildResult('courseContent', ctx.lang, { text: intro + context })
      if (ctx.userId) {
        result.actions.unshift({
          kind: 'ask_instructor',
          courseId: focusedCourseId,
          lessonId: focusedLessonId,
        })
      }
      result.actions.push({
        kind: 'navigate',
        label: ctx.lang === 'pt' ? 'Ver a trilha' : 'View the trail',
        to: `/curso/${focusedCourseId}`,
      })
      return result
    }
  }

  // Fora da página do curso: responde sobre qualquer formação em que o aluno
  // está matriculado, identificando o curso pelo texto da pergunta.
  if (ctx.userId && (intent === 'courseContent' || intent === 'doubt' || intent === 'default')) {
    const myCourses = await loadMyCourses(ctx.userId)

    if (myCourses.length) {
      const named = pickCourseFromQuestion(text, myCourses)
      // Numa pergunta genérica ("tenho uma dúvida") assumimos a única formação;
      // em 'default' só respondemos se a pergunta citou a formação.
      const picked =
        named ?? (intent !== 'default' && myCourses.length === 1 ? myCourses[0] : null)

      if (picked) {
        const result = buildResult('courseContent', ctx.lang, {
          text: describeCourse(picked, ctx.lang),
        })
        result.actions.unshift({ kind: 'ask_instructor', courseId: picked.id, lessonId: null })
        result.actions.push({
          kind: 'navigate',
          label: ctx.lang === 'pt' ? 'Abrir a formação' : 'Open the program',
          to: `/curso/${picked.id}`,
        })
        result.followups =
          ctx.lang === 'pt'
            ? ['Quanto falta pra eu terminar?', 'Como funciona o nivelamento?', 'Falar com o suporte']
            : ['How much is left to finish?', 'How does the placement test work?', 'Talk to support']
        return result
      }

      if (intent === 'default') return buildResult('default', ctx.lang)

      // Várias formações: pergunta de qual delas é a dúvida
      const list = myCourses.map((c) => `· ${c.title}`).join('\n')
      const result = buildResult('courseContent', ctx.lang, {
        text:
          ctx.lang === 'pt'
            ? `Posso tirar dúvidas de qualquer uma das suas ${myCourses.length} formações. De qual delas é a sua dúvida?\n\n${list}`
            : `I can answer questions about any of your ${myCourses.length} programs. Which one is your question about?\n\n${list}`,
      })
      result.followups = myCourses
        .slice(0, 4)
        .map((c) => (ctx.lang === 'pt' ? `Dúvida sobre ${c.title}` : `Question about ${c.title}`))
      return result
    }
  }

  if (intent === 'courseContent') {
    const result = buildResult('courseContent', ctx.lang, {
      text:
        ctx.lang === 'pt'
          ? 'Você ainda não está matriculado em nenhuma formação. Escolha uma no catálogo e eu passo a responder dúvidas do conteúdo dela.'
          : 'You are not enrolled in any program yet. Pick one in the catalog and I will answer questions about its content.',
    })
    result.actions.push({
      kind: 'navigate',
      label: ctx.lang === 'pt' ? 'Ver catálogo' : 'Open catalog',
      to: '/explorar',
    })
    return result
  }

  if (intent === 'placement' && focusedCourseId) {
    const result = buildResult('placement', ctx.lang)
    result.actions.unshift({
      kind: 'navigate',
      label: ctx.lang === 'pt' ? 'Fazer teste de nivelamento' : 'Take placement test',
      to: `/nivelamento/${focusedCourseId}`,
    })
    return result
  }

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
    // Nada casou: em vez de um beco sem saída, mostra o que existe no catálogo
    const { data: available } = await supabase
      .from('courses')
      .select('id, title, price')
      .eq('published', true)
      .limit(4)

    const fallback = (available as Pick<Course, 'id' | 'title' | 'price'>[] | null) ?? []

    if (fallback.length) {
      return buildResult('search', ctx.lang, {
        text:
          ctx.lang === 'pt'
            ? 'Não achei formação com esse termo. Estas são as que já estão publicadas:'
            : 'No program matched that term. These are the ones already published:',
        courses: fallback,
      })
    }

    return buildResult('search', ctx.lang, {
      text:
        ctx.lang === 'pt'
          ? 'O catálogo ainda está vazio. Peça ao instrutor para publicar uma formação.'
          : 'The catalog is still empty. Ask the instructor to publish a program.',
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
  if (pathname.startsWith('/nivelamento/')) {
    return lang === 'pt'
      ? ['Como funciona o nivelamento?', 'O que tem nesse curso?', 'Falar com o suporte']
      : ['How does the placement test work?', 'What is in this course?', 'Talk to support']
  }
  if (pathname.startsWith('/assistir')) {
    return lang === 'pt'
      ? ['Tenho uma dúvida do conteúdo', 'O que tem nesse curso?', 'Quanto falta neste curso?']
      : ['I have a question about the content', 'What is in this course?', 'How much is left here?']
  }
  if (pathname.startsWith('/curso/')) {
    return lang === 'pt'
      ? ['O que tem nesse curso?', 'Como funciona o nivelamento?', 'Como me matricular?']
      : ['What is in this course?', 'How does the placement test work?', 'How do I enroll?']
  }
  if (pathname.startsWith('/meus-cursos')) {
    return lang === 'pt'
      ? ['Tenho uma dúvida sobre meus cursos', 'Quanto falta pra eu terminar?', 'Como assistir às aulas?']
      : ['I have a question about my courses', 'How much is left to finish?', 'How do I watch lessons?']
  }
  if (pathname.startsWith('/demo-video') || pathname.startsWith('/novidades')) {
    return lang === 'pt'
      ? ['O que foi adicionado recentemente?', 'Como responder um quiz?', 'Como me matricular?']
      : ['What was added recently?', 'How do I answer a quiz?', 'How do I enroll?']
  }
  if (pathname.startsWith('/explorar') || pathname === '/') {
    return lang === 'pt'
      ? ['Tenho uma dúvida sobre meus cursos', 'Quais formações existem?', 'Ver meu progresso']
      : ['I have a question about my courses', 'Which programs exist?', 'Check my progress']
  }
  return lang === 'pt'
    ? ['Tenho uma dúvida sobre meus cursos', 'Como me matricular em um curso?', 'Ver meu progresso']
    : ['I have a question about my courses', 'How do I enroll in a course?', 'Check my progress']
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
