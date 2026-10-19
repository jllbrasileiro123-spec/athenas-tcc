/**
 * Publica o vídeo de resolução do exercício prático de um módulo
 * (criado por supabase/exercicios-praticos.sql).
 *
 * Uso:
 *   npm run upload:exercicio -- --modulo 2 --video "C:/caminho/resolucao2.mp4" [--duracao 8]
 *
 *   --video aceita arquivo local (sobe para o Storage) ou link do YouTube.
 *
 * Precisa no .env (NÃO commitar): SUPABASE_SERVICE_ROLE_KEY=eyJ...
 * Plano Free do Supabase: cada arquivo até 50 MB. Vídeo maior → comprima ou use YouTube.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, basename, extname } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const COURSE_ID = 'e952fa43-8221-4964-b89e-f875212f53aa' // IA no Cotidiano Jurídico
const MAX_FREE_MB = 50
const MIME = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' }

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
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i]
  }
  return args
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY no .env (ou VITE_SUPABASE_URL).')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const n = Number(args.modulo)
  if (!n || !args.video) {
    console.error('Uso: npm run upload:exercicio -- --modulo 2 --video <arquivo|youtube> [--duracao 8]')
    process.exit(1)
  }
  const isYoutube = /youtu\.?be/i.test(args.video)
  if (!isYoutube && !existsSync(args.video)) throw new Error(`Vídeo não encontrado: ${args.video}`)

  const { data: mod, error: mErr } = await supabase
    .from('course_modules')
    .select('id, title')
    .eq('course_id', COURSE_ID)
    .eq('sort_order', n - 1)
    .maybeSingle()
  if (mErr) throw new Error(mErr.message)
  if (!mod) throw new Error(`Módulo ${n} não encontrado.`)

  const { data: lesson, error: lErr } = await supabase
    .from('lessons')
    .select('id, title')
    .eq('module_id', mod.id)
    .eq('item_kind', 'tutorial')
    .maybeSingle()
  if (lErr) throw new Error(lErr.message)
  if (!lesson) throw new Error(`O Módulo ${n} ainda não tem exercício prático. Rode supabase/exercicios-praticos.sql antes.`)

  let videoUrl = args.video
  if (!isYoutube) {
    const mb = statSync(args.video).size / (1024 * 1024)
    if (mb > MAX_FREE_MB) {
      console.warn(`Aviso: ${basename(args.video)} tem ${mb.toFixed(1)} MB (limite do plano Free: ${MAX_FREE_MB} MB).`)
    }
    const ext = extname(args.video).toLowerCase()
    const path = `tcc/modulo${n}/resolucao-exercicio${ext}`
    const { error } = await supabase.storage
      .from('course-videos')
      .upload(path, readFileSync(args.video), { upsert: true, contentType: MIME[ext] ?? 'video/mp4' })
    if (error) throw new Error(`course-videos/${path}: ${error.message}`)
    videoUrl = `${supabase.storage.from('course-videos').getPublicUrl(path).data.publicUrl}?t=${Date.now()}`
  }

  const fields = { video_url: videoUrl }
  if (Number(args.duracao)) fields.duration_minutes = Number(args.duracao)
  const { error: uErr } = await supabase.from('lessons').update(fields).eq('id', lesson.id)
  if (uErr) throw new Error(uErr.message)

  console.log(`Pronto. Vídeo de resolução publicado em "${lesson.title}" (${mod.title}).`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
