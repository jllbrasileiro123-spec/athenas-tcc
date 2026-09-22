import { supabase } from './supabase'
import { uploadLessonVideo } from './videoStorage'
import { uploadCourseMaterial } from './materialStorage'
import type { CourseLevel } from '../types/database'

export type NewModuleInput = {
  courseId: string
  userId: string
  title: string
  description: string
  level: CourseLevel
  /** Índice do módulo (0 = primeiro). Define sort_order e se já vem liberado. */
  moduleIndex: number
  /** sort_order da próxima aula no curso */
  nextLessonSort: number
  explicacaoFile?: File | null
  tutorialFile?: File | null
  podcastFile?: File | null
  materialFile?: File | null
  materialTitle?: string
  quizQuestions?: Array<{
    prompt: string
    choices: string[]
    correctIndex: number
  }>
}

export type NewModuleResult = {
  moduleId: string | null
  error: string | null
}

/**
 * Cria um módulo no formato da tela do aluno:
 * Explicação · Tutorial · Podcast (opcional) · Exercício + material opcional.
 */
export async function createCourseModule(input: NewModuleInput): Promise<NewModuleResult> {
  const title = input.title.trim()
  if (!title) return { moduleId: null, error: 'emptyTitle' }

  const { data: mod, error: modErr } = await supabase
    .from('course_modules')
    .insert({
      course_id: input.courseId,
      title,
      description: input.description.trim() || null,
      level: input.level,
      sort_order: input.moduleIndex,
      unlocked_by_default: input.moduleIndex === 0,
    })
    .select('id')
    .single()

  if (modErr || !mod) {
    return { moduleId: null, error: modErr?.message ?? 'moduleInsert' }
  }

  const n = input.moduleIndex + 1
  const base = input.nextLessonSort
  const rows = [
    {
      course_id: input.courseId,
      module_id: mod.id,
      title: `M${n} · Explicação`,
      description: 'Vídeo de explicação do módulo.',
      sort_order: base,
      is_preview: true,
      content_type: 'lesson',
      item_kind: 'explicacao',
      xp_reward: 10,
      duration_minutes: 10,
      video_url: null as string | null,
      audio_url: null as string | null,
    },
    {
      course_id: input.courseId,
      module_id: mod.id,
      title: `M${n} · Tutorial`,
      description: 'Vídeo de tutorial prático.',
      sort_order: base + 1,
      is_preview: true,
      content_type: 'lesson',
      item_kind: 'tutorial',
      xp_reward: 10,
      duration_minutes: 10,
      video_url: null,
      audio_url: null,
    },
    {
      course_id: input.courseId,
      module_id: mod.id,
      title: `M${n} · Podcast`,
      description: 'Áudio opcional do módulo.',
      sort_order: base + 2,
      is_preview: true,
      content_type: 'lesson',
      item_kind: 'podcast',
      xp_reward: 10,
      duration_minutes: 5,
      video_url: null,
      audio_url: null,
    },
    {
      course_id: input.courseId,
      module_id: mod.id,
      title: `M${n} · Exercício`,
      description: 'Acerte 70% para concluir o módulo e liberar o próximo.',
      sort_order: base + 3,
      is_preview: true,
      content_type: 'quiz',
      item_kind: 'exercicio',
      xp_reward: 15,
      duration_minutes: 5,
      video_url: null,
      audio_url: null,
    },
  ]

  const { data: lessons, error: lesErr } = await supabase.from('lessons').insert(rows).select('id, item_kind')
  if (lesErr || !lessons?.length) {
    await supabase.from('course_modules').delete().eq('id', mod.id)
    return { moduleId: null, error: lesErr?.message ?? 'lessonsInsert' }
  }

  const byKind = Object.fromEntries(lessons.map((l) => [l.item_kind, l.id])) as Record<
    string,
    string
  >

  const questions =
    input.quizQuestions?.filter((q) => q.prompt.trim() && q.choices.some((c) => c.trim())) ?? []
  if (questions.length === 0) {
    questions.push({
      prompt: `Pergunta de avaliação do Módulo ${n} (edite depois se quiser).`,
      choices: ['Opção A', 'Opção B (correta)', 'Opção C', 'Opção D'],
      correctIndex: 1,
    })
  }

  if (byKind.exercicio) {
    const { error: qErr } = await supabase.from('quiz_questions').insert(
      questions.map((q, i) => ({
        lesson_id: byKind.exercicio,
        prompt: q.prompt.trim(),
        choices: q.choices.map((c) => c.trim()).filter(Boolean),
        correct_index: q.correctIndex,
        sort_order: i,
      }))
    )
    if (qErr) {
      return { moduleId: mod.id, error: qErr.message }
    }
  }

  if (input.explicacaoFile && byKind.explicacao) {
    const { url, error } = await uploadLessonVideo(
      input.userId,
      input.courseId,
      byKind.explicacao,
      input.explicacaoFile
    )
    if (error) return { moduleId: mod.id, error }
    if (url) await supabase.from('lessons').update({ video_url: url }).eq('id', byKind.explicacao)
  }

  if (input.tutorialFile && byKind.tutorial) {
    const { url, error } = await uploadLessonVideo(
      input.userId,
      input.courseId,
      byKind.tutorial,
      input.tutorialFile
    )
    if (error) return { moduleId: mod.id, error }
    if (url) await supabase.from('lessons').update({ video_url: url }).eq('id', byKind.tutorial)
  }

  if (input.podcastFile && byKind.podcast) {
    const ext = input.podcastFile.name.split('.').pop()?.toLowerCase() || 'm4a'
    const path = `${input.userId}/${input.courseId}/${byKind.podcast}.${ext}`
    const { error: upErr } = await supabase.storage.from('course-videos').upload(path, input.podcastFile, {
      upsert: true,
      contentType: input.podcastFile.type || 'audio/mp4',
    })
    if (upErr) {
      return {
        moduleId: mod.id,
        error: upErr.message.includes('Bucket not found') ? 'noBucket' : upErr.message,
      }
    }
    const { data } = supabase.storage.from('course-videos').getPublicUrl(path)
    await supabase
      .from('lessons')
      .update({ audio_url: `${data.publicUrl}?t=${Date.now()}` })
      .eq('id', byKind.podcast)
  }

  if (input.materialFile) {
    const { url, error } = await uploadCourseMaterial(
      input.userId,
      input.courseId,
      input.materialFile
    )
    if (error) return { moduleId: mod.id, error: error === 'noBucket' ? 'noMaterialBucket' : error }
    if (url) {
      await supabase.from('module_materials').insert({
        module_id: mod.id,
        title: (input.materialTitle || input.materialFile.name).trim(),
        url,
        kind: input.materialFile.name.match(/\.pdf$/i) ? 'pdf' : 'apostila',
        sort_order: 0,
      })
    }
  }

  return { moduleId: mod.id, error: null }
}
