/**
 * Sobe vídeo + material da aula 1 para o Supabase Storage e atualiza as lessons.
 *
 * Uso:
 *   1) No .env local (NÃO commitar), acrescente:
 *        SUPABASE_SERVICE_ROLE_KEY=sua_service_role_do_dashboard
 *   2) Rode no SQL Editor: storage-course-videos.sql e storage-course-materials.sql
 *   3) npm run upload:aula1
 *
 * Prefira o arquivo comprimido (modulo1-explicacao-web.mp4). Para aulas futuras:
 *   - MP4 até 512 MB no Storage, OU
 *   - link YouTube (ilimitado, melhor quando forem muitas aulas longas).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

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

loadEnvFile('.env')
loadEnvFile('.env.local')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(`
Falta SUPABASE_SERVICE_ROLE_KEY no .env (ou VITE_SUPABASE_URL).

1. Abra Supabase → Project Settings → API → service_role (secret)
2. Cole no .env:
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
3. Rode de novo: npm run upload:aula1
`)
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const VIDEO_CANDIDATES = [
  resolve(ROOT, 'public/demo/modulo1-explicacao-web.mp4'),
  resolve(ROOT, 'public/demo/modulo1-explicacao.mp4'),
]
const DOC_PATH = resolve(ROOT, 'public/demo/Modulo1_Material_de_Apoio.docx')

const COURSE_TITLES = [
  'ATHENAS · Trilha por módulos',
  'ATHENAS · Nivelamento grátis (teste do popup)',
]

async function uploadFile(bucket, path, filePath, contentType) {
  const body = readFileSync(filePath)
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    upsert: true,
    contentType,
  })
  if (error) throw new Error(`${bucket}/${path}: ${error.message}`)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

async function main() {
  const videoPath = VIDEO_CANDIDATES.find((p) => existsSync(p))
  if (!videoPath) {
    console.error('Vídeo não encontrado em public/demo/ (modulo1-explicacao-web.mp4 ou .mp4)')
    process.exit(1)
  }
  if (!existsSync(DOC_PATH)) {
    console.error('Documento não encontrado:', DOC_PATH)
    process.exit(1)
  }

  const videoMb = (statSync(videoPath).size / (1024 * 1024)).toFixed(1)
  console.log(`Vídeo: ${basename(videoPath)} (${videoMb} MB)`)
  console.log(`Doc:   ${basename(DOC_PATH)}`)

  const videoUrl = await uploadFile(
    'course-videos',
    `seed/modulo1/explicacao.mp4`,
    videoPath,
    'video/mp4'
  )
  console.log('Vídeo no Storage:', videoUrl)

  const materialUrl = await uploadFile(
    'course-materials',
    `seed/modulo1/Modulo1_Material_de_Apoio.docx`,
    DOC_PATH,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
  console.log('Material no Storage:', materialUrl)

  for (const title of COURSE_TITLES) {
    const { data: course, error: cErr } = await supabase
      .from('courses')
      .select('id')
      .eq('title', title)
      .maybeSingle()
    if (cErr) throw new Error(cErr.message)
    if (!course) {
      console.warn(`Curso não encontrado (pule): ${title}`)
      continue
    }

    const { data: mods, error: mErr } = await supabase
      .from('course_modules')
      .select('id, sort_order')
      .eq('course_id', course.id)
      .order('sort_order')
      .limit(1)
    if (mErr) throw new Error(mErr.message)
    const mod1 = mods?.[0]
    if (!mod1) {
      console.warn(`Sem módulo 1 em: ${title}`)
      continue
    }

    const { data: lessons, error: lErr } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', course.id)
      .eq('module_id', mod1.id)
      .eq('item_kind', 'explicacao')
      .order('sort_order')
      .limit(1)
    if (lErr) throw new Error(lErr.message)
    const lesson = lessons?.[0]
    if (!lesson) {
      console.warn(`Sem aula explicação em: ${title}`)
      continue
    }

    const { error: uErr } = await supabase
      .from('lessons')
      .update({
        video_url: `${videoUrl}?t=${Date.now()}`,
        description: 'Aula 1 com vídeo hospedado no Supabase Storage e material de apoio.',
        duration_minutes: 15,
      })
      .eq('id', lesson.id)
    if (uErr) throw new Error(uErr.message)

    await supabase
      .from('module_materials')
      .delete()
      .eq('module_id', mod1.id)
      .or(
        'title.ilike.%Material de apoio%Módulo 1%,url.eq./demo/Modulo1_Material_de_Apoio.docx,url.ilike.%Modulo1_Material_de_Apoio%'
      )

    const { error: matErr } = await supabase.from('module_materials').insert({
      module_id: mod1.id,
      title: 'Material de apoio — Módulo 1 (Word)',
      url: materialUrl,
      kind: 'apostila',
      sort_order: 0,
    })
    if (matErr) throw new Error(matErr.message)

    console.log(`OK → ${title}`)
  }

  console.log('\nPronto. O player usa a URL pública do Supabase (funciona no GitHub Pages e local).')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
