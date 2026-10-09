/**
 * Cria contas de aluno (já confirmadas) e matricula no curso "IA no Cotidiano Jurídico".
 *
 * Uso:
 *   npm run criar:alunos -- scripts/alunos.csv
 *
 * Formato do CSV (cabeçalho obrigatório, separador , ou ;):
 *   nome;email;senha
 *   Dra. Maria Silva;maria@escritorio.com.br;
 *
 *   A senha é opcional: se ficar vazia, uma senha provisória é gerada.
 *   Contas que já existem não são recriadas, só matriculadas no curso.
 *   As credenciais criadas são salvas em scripts/alunos-credenciais.csv (não commitar).
 *
 * Precisa no .env (NÃO commitar):
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Project Settings → API Keys → service_role)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomInt } from 'node:crypto'

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

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  const sep = lines[0].includes(';') ? ';' : ','
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cols = line.split(sep).map((c) => c.trim())
    return Object.fromEntries(header.map((h, i) => [h, cols[i] ?? '']))
  })
}

function gerarSenha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[randomInt(chars.length)]
  return `Athenas@${s}`
}

async function buscarUsuarioPorEmail(supabase, email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const user = data.users.find((u) => u.email?.toLowerCase() === email)
    if (user) return user
    if (data.users.length < 1000) return null
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env')
  process.exit(1)
}

const csvPath = resolve(process.argv[2] ?? resolve(ROOT, 'scripts/alunos.csv'))
if (!existsSync(csvPath)) {
  console.error(`Arquivo não encontrado: ${csvPath}`)
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const alunos = parseCsv(readFileSync(csvPath, 'utf8'))
const credenciais = []

for (const aluno of alunos) {
  const nome = aluno.nome
  const email = aluno.email?.toLowerCase()
  if (!nome || !email) {
    console.warn(`Linha ignorada (nome/email vazio): ${JSON.stringify(aluno)}`)
    continue
  }

  let user = await buscarUsuarioPorEmail(supabase, email)
  let senha = '(conta já existia)'

  if (!user) {
    senha = aluno.senha || gerarSenha()
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { full_name: nome, role: 'student' },
    })
    if (error) {
      console.error(`✗ ${email}: ${error.message}`)
      continue
    }
    user = data.user
    console.log(`✓ Criado: ${nome} <${email}>`)
  } else {
    console.log(`• Já existia: ${email}`)
  }

  const { error: enrollError } = await supabase
    .from('enrollments')
    .upsert({ user_id: user.id, course_id: COURSE_ID }, { onConflict: 'user_id,course_id' })
  if (enrollError) console.error(`  ✗ matrícula: ${enrollError.message}`)
  else console.log('  ✓ Matriculado no curso')

  credenciais.push([nome, email, senha])
}

const outPath = resolve(ROOT, 'scripts/alunos-credenciais.csv')
writeFileSync(
  outPath,
  '﻿nome;email;senha\n' + credenciais.map((c) => c.join(';')).join('\n') + '\n',
)
console.log(`\nCredenciais salvas em ${outPath}`)
