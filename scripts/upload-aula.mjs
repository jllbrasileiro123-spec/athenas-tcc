/**
 * Publica uma aula (= um módulo) do curso "IA no Cotidiano Jurídico":
 * cria/atualiza o módulo, a aula de explicação com o vídeo e o material de apoio.
 *
 * Uso:
 *   npm run upload:aula -- --modulo 2 --titulo "Prompts no Direito" \
 *     --video "C:/caminho/aula2.mp4" --material "C:/caminho/Modulo2.docx" \
 *     [--descricao "..."] [--duracao 15] [--nivel iniciante|intermediario|avancado]
 *
 *   --video aceita arquivo local (sobe para o Storage) ou link do YouTube.
 *   --material é opcional e pode ser repetido (Word, PDF, PPTX...).
 *
 * Precisa no .env (NÃO commitar):
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Project Settings → API Keys → service_role)
 *
 * Plano Free do Supabase: cada arquivo até 50 MB. Vídeo maior → comprima ou use YouTube.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, basename, extname } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const COURSE_ID = 'e952fa43-8221-4964-b89e-f875212f53aa' // IA no Cotidiano Jurídico

function loadEnvFile(name) {
  const path = resolve(ROOT, name)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 0) continue
    const key = trimmed.slice(0, i).trim()
    let val = trimmed.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

function parseArgs(argv) {
  const args = { material: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const val = argv[i + 1]
    i++
    if (key === 'material') args.material.push(val)
    else args[key] = val
  }
  return args
}

const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

const MAX_FREE_MB = 50

loadEnvFile('.env')
loadEnvFile('.env.local')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error(`
Falta SUPABASE_SERVICE_ROLE_KEY no .env (ou VITE_SUPABASE_URL).

1. Supabase → Project Settings → API Keys → Legacy → service_role (secret)
2. Cole no .env:  SUPABASE_SERVICE_ROLE_KEY=eyJ...
`)
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function uploadFile(bucket, path, filePath) {
  const mb = statSync(filePath).size / (1024 * 1024)
  if (mb > MAX_FREE_MB) {
    console.warn(`Aviso: ${basename(filePath)} tem ${mb.toFixed(1)} MB (limite do plano Free: ${MAX_FREE_MB} MB).`)
  }
  const contentType = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, readFileSync(filePath), { upsert: true, contentType })
  if (error) throw new Error(`${bucket}/${path}: ${error.message}`)
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const n = Number(args.modulo)
  if (!n || !args.titulo || !args.video) {
    console.error('Uso: npm run upload:aula -- --modulo 2 --titulo "..." --video <arquivo|youtube> [--material <arquivo>]')
    process.exit(1)
  }
  const isYoutube = /youtu\.?be/i.test(args.video)
  if (!isYoutube && !existsSync(args.video)) throw new Error(`Vídeo não encontrado: ${args.video}`)
  for (const m of args.material) {
    if (!existsSync(m)) throw new Error(`Material não encontrado: ${m}`)
  }

  const sortOrder = n - 1
  const moduleTitle = `Módulo ${n} — ${args.titulo}`

  // Módulo: reaproveita o que já ocupa essa posição, senão cria
  const { data: existing, error: findErr } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', COURSE_ID)
    .eq('sort_order', sortOrder)
    .maybeSingle()
  if (findErr) throw new Error(findErr.message)

  const modFields = {
    course_id: COURSE_ID,
    title: moduleTitle,
    description: args.descricao ?? null,
    level: args.nivel ?? 'iniciante',
    sort_order: sortOrder,
    unlocked_by_default: n === 1,
  }
  let moduleId = existing?.id
  if (moduleId) {
    const { error } = await supabase.from('course_modules').update(modFields).eq('id', moduleId)
    if (error) throw new Error(error.message)
  } else {
    const { data, error } = await supabase.from('course_modules').insert(modFields).select('id').single()
    if (error) throw new Error(error.message)
    moduleId = data.id
  }
  console.log(`Módulo: ${moduleTitle}`)

  const videoUrl = isYoutube
    ? args.video
    : await uploadFile('course-videos', `tcc/modulo${n}/explicacao${extname(args.video).toLowerCase()}`, args.video)
  console.log('Vídeo:', videoUrl)

  // Aula de explicação (uma por módulo)
  const lessonFields = {
    course_id: COURSE_ID,
    module_id: moduleId,
    title: `Aula ${n} — ${args.titulo}`,
    description: args.descricao ?? `Aula ${n} com vídeo e material de apoio.`,
    video_url: isYoutube ? videoUrl : `${videoUrl}?t=${Date.now()}`,
    duration_minutes: Number(args.duracao) || 15,
    sort_order: 0,
    is_preview: true,
    content_type: 'lesson',
    item_kind: 'explicacao',
    xp_reward: 10,
  }
  const { data: lesson, error: lFindErr } = await supabase
    .from('lessons')
    .select('id')
    .eq('module_id', moduleId)
    .eq('item_kind', 'explicacao')
    .order('sort_order')
    .limit(1)
    .maybeSingle()
  if (lFindErr) throw new Error(lFindErr.message)
  const { error: lErr } = lesson
    ? await supabase.from('lessons').update(lessonFields).eq('id', lesson.id)
    : await supabase.from('lessons').insert(lessonFields)
  if (lErr) throw new Error(lErr.message)
  console.log(`Aula: ${lessonFields.title}`)

  // Materiais de apoio
  if (args.material.length) {
    await supabase.from('module_materials').delete().eq('module_id', moduleId)
    for (const [i, filePath] of args.material.entries()) {
      const name = basename(filePath)
      const materialUrl = await uploadFile('course-materials', `tcc/modulo${n}/${name}`, filePath)
      const ext = extname(name).toLowerCase()
      const { error } = await supabase.from('module_materials').insert({
        module_id: moduleId,
        title: `Material de apoio — Módulo ${n} (${ext === '.pdf' ? 'PDF' : ext === '.pptx' ? 'Slides' : 'Word'})`,
        url: materialUrl,
        kind: ext === '.pdf' ? 'pdf' : 'apostila',
        sort_order: i,
      })
      if (error) throw new Error(error.message)
      console.log('Material:', materialUrl)
    }
  }

  console.log(`\nPronto. Módulo ${n} publicado no curso "IA no Cotidiano Jurídico".`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
