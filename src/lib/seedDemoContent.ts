import { supabase } from './supabase'

export const DEMO_VIDEO_PATH = '/demo/athenas-demo.mp4'
export const DEMO_TITLE_PREFIX = 'Demo ATHENAS'

export type SeededLesson = {
  id: string
  title: string
  contentType: 'lesson' | 'quiz'
}

export type SeededCourse = {
  id: string
  title: string
  lessons: SeededLesson[]
}

export type SeedDemoResult = {
  ok: boolean
  error?: string
  courses: SeededCourse[]
  /** false quando as tabelas do teste de nivelamento ainda não existem no banco */
  placementReady: boolean
}

type QuestionSeed = { prompt: string; choices: string[]; correct_index: number }

type LessonSeed = {
  title: string
  description: string
  sort_order: number
  is_preview: boolean
  content_type: 'lesson' | 'quiz'
  xp_reward: number
  video_url: string | null
  questions?: QuestionSeed[]
  /** Perguntas do teste de nivelamento que liberam esta aula */
  placement?: QuestionSeed[]
}

type CourseSeed = {
  title: string
  description: string
  lessons: LessonSeed[]
}

const COURSES: CourseSeed[] = [
  {
    title: `${DEMO_TITLE_PREFIX} · Fundamentos de IA`,
    description:
      'Pacote de demonstração no seu perfil: vídeos hospedados (sem YouTube) + quiz para responder.',
    lessons: [
      {
        title: 'Aula 1 — Boas-vindas',
        description: 'Vídeo MP4 hospedado no app. Assista direto.',
        sort_order: 0,
        is_preview: true,
        content_type: 'lesson',
        xp_reward: 10,
        video_url: DEMO_VIDEO_PATH,
        placement: [
          {
            prompt: 'O que é a plataforma ATHENAS?',
            choices: [
              'Uma rede social de fotos',
              'Uma plataforma de formações em tecnologia e IA',
              'Um editor de planilhas',
              'Um jogo de corrida',
            ],
            correct_index: 1,
          },
          {
            prompt: 'Para acompanhar uma formação, o aluno precisa:',
            choices: [
              'Se matricular na formação',
              'Instalar um antivírus',
              'Comprar um servidor',
              'Nada, o acesso é por carta',
            ],
            correct_index: 0,
          },
        ],
      },
      {
        title: 'Aula 2 — Player HTML5',
        description: 'Segunda aula com vídeo hospedado. Assista direto.',
        sort_order: 1,
        is_preview: true,
        content_type: 'lesson',
        xp_reward: 10,
        video_url: DEMO_VIDEO_PATH,
        placement: [
          {
            prompt: 'O player de vídeo do ATHENAS aceita:',
            choices: [
              'Somente DVD',
              'Somente fita VHS',
              'Vídeo hospedado (MP4) e YouTube',
              'Somente áudio',
            ],
            correct_index: 2,
          },
          {
            prompt: 'Uma aula em vídeo conta como concluída quando:',
            choices: [
              'O vídeo é assistido até quase o fim (≥90%)',
              'O aluno abre a página',
              'O instrutor manda um e-mail',
              'Nunca é concluída',
            ],
            correct_index: 0,
          },
        ],
      },
      {
        title: 'Aula 3 — Trilha e progresso',
        description: 'Use para marcar conclusão e ganhar XP/moedas.',
        sort_order: 2,
        is_preview: true,
        content_type: 'lesson',
        xp_reward: 10,
        video_url: DEMO_VIDEO_PATH,
        placement: [
          {
            prompt: 'Na trilha gamificada, concluir uma aula gera:',
            choices: [
              'Nada',
              'XP e atualização da sequência de estudos',
              'Desconto no mercado',
              'Um novo instrutor',
            ],
            correct_index: 1,
          },
          {
            prompt: 'Para que servem as moedas do ATHENAS?',
            choices: [
              'Comprar o congelador de sequência',
              'Pagar imposto',
              'Trocar por dinheiro real',
              'Não existem moedas',
            ],
            correct_index: 0,
          },
        ],
      },
      {
        title: 'Checkpoint — Quiz de IA',
        description: 'Responda as perguntas para interagir com o quiz.',
        sort_order: 3,
        is_preview: true,
        content_type: 'quiz',
        xp_reward: 15,
        video_url: null,
        questions: [
          {
            prompt: 'O que é um modelo de linguagem (LLM)?',
            choices: [
              'Um banco de dados SQL',
              'Um modelo treinado para gerar e entender texto',
              'Um antivírus',
              'Um cabo de rede',
            ],
            correct_index: 1,
          },
          {
            prompt: 'No ATHENAS, o que acontece ao concluir uma aula?',
            choices: [
              'Nada muda',
              'Só apaga o vídeo',
              'Atualiza progresso, XP e sequência',
              'Envia e-mail obrigatório',
            ],
            correct_index: 2,
          },
          {
            prompt: 'Onde tirar dúvidas rápidas no app?',
            choices: [
              'No chat da Athena',
              'Só por carta',
              'Apenas no terminal',
              'Não existe suporte',
            ],
            correct_index: 0,
          },
        ],
      },
    ],
  },
  {
    title: `${DEMO_TITLE_PREFIX} · Produtividade`,
    description: 'Segunda formação demo no seu perfil, com vídeo e quiz curto.',
    lessons: [
      {
        title: 'Aula 1 — Organização',
        description: 'Vídeo hospedado. Assista direto.',
        sort_order: 0,
        is_preview: true,
        content_type: 'lesson',
        xp_reward: 10,
        video_url: DEMO_VIDEO_PATH,
      },
      {
        title: 'Aula 2 — Rotina de estudos',
        description: 'Continue a trilha. Assista direto.',
        sort_order: 1,
        is_preview: true,
        content_type: 'lesson',
        xp_reward: 10,
        video_url: DEMO_VIDEO_PATH,
      },
      {
        title: 'Checkpoint — Quiz rápido',
        description: 'Perguntas curtas para testar o fluxo de quiz.',
        sort_order: 2,
        is_preview: true,
        content_type: 'quiz',
        xp_reward: 15,
        video_url: null,
        questions: [
          {
            prompt: 'Qual recurso do header mostra a sequência de estudos?',
            choices: ['O ícone de chama', 'O rodapé legal', 'O favicon', 'O CSS'],
            correct_index: 0,
          },
          {
            prompt: 'Onde ver o que foi adicionado recentemente?',
            choices: [
              'Página Novidades',
              'Somente no SQL Editor',
              'No Windows Update',
              'Não existe essa página',
            ],
            correct_index: 0,
          },
        ],
      },
    ],
  },
]

/** Publica várias aulas/quizzes no perfil do usuário logado (instrutor/admin). */
export async function seedDemoContentForUser(userId: string): Promise<SeedDemoResult> {
  const courses: SeededCourse[] = []
  let placementReady = true

  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('instructor_id', userId)
    .like('title', `${DEMO_TITLE_PREFIX}%`)

  if (existing?.length) {
    const ids = existing.map((c) => c.id)
    await supabase.from('courses').delete().in('id', ids)
  }

  for (const course of COURSES) {
    const { data: created, error: courseErr } = await supabase
      .from('courses')
      .insert({
        instructor_id: userId,
        title: course.title,
        description: course.description,
        price: 0,
        level: 'iniciante',
        published: true,
        review_status: 'approved',
      })
      .select('id')
      .single()

    if (courseErr || !created) {
      return {
        ok: false,
        error: courseErr?.message ?? 'Falha ao criar curso demo',
        courses,
        placementReady,
      }
    }

    const seeded: SeededCourse = { id: created.id, title: course.title, lessons: [] }
    courses.push(seeded)

    const { data: lessons, error: lessonsErr } = await supabase
      .from('lessons')
      .insert(
        course.lessons.map((l) => ({
          course_id: created.id,
          title: l.title,
          description: l.description,
          video_url: l.video_url,
          duration_minutes: l.content_type === 'quiz' ? 5 : 1,
          sort_order: l.sort_order,
          is_preview: l.is_preview,
          content_type: l.content_type,
          xp_reward: l.xp_reward,
        }))
      )
      .select('id, sort_order, content_type, is_preview')

    if (lessonsErr || !lessons) {
      return {
        ok: false,
        error: lessonsErr?.message ?? 'Falha ao criar aulas',
        courses,
        placementReady,
      }
    }

    for (let i = 0; i < course.lessons.length; i++) {
      const draft = course.lessons[i]
      const row = lessons.find((l) => l.sort_order === draft.sort_order) ?? lessons[i]
      if (!row) continue

      seeded.lessons.push({
        id: row.id,
        title: draft.title,
        contentType: draft.content_type,
      })

      if (draft.questions?.length) {
        const { error: qErr } = await supabase.from('quiz_questions').insert(
          draft.questions.map((q, qi) => ({
            lesson_id: row.id,
            prompt: q.prompt,
            choices: q.choices,
            correct_index: q.correct_index,
            sort_order: qi,
          }))
        )
        if (qErr) {
          return { ok: false, error: qErr.message, courses, placementReady }
        }
      }

      if (draft.placement?.length && placementReady) {
        const { error: pErr } = await supabase.from('placement_questions').insert(
          draft.placement.map((q, qi) => ({
            course_id: created.id,
            lesson_id: row.id,
            prompt: q.prompt,
            choices: q.choices,
            correct_index: q.correct_index,
            sort_order: qi,
          }))
        )
        // Tabela ainda não criada no banco: segue sem nivelamento em vez de falhar tudo
        if (pErr) placementReady = false
      }
    }

    await supabase.from('enrollments').insert({ user_id: userId, course_id: created.id })
  }

  return { ok: true, courses, placementReady }
}
