/**
 * Apaga as contas de aluno criadas por scripts/criar-alunos.mjs, para que cada
 * advogado possa criar a própria conta com o mesmo e-mail sem conflito.
 *
 * Uso:
 *   npm run apagar:alunos                → só LISTA o que seria apagado (não apaga nada)
 *   npm run apagar:alunos -- --confirmar → apaga de verdade (definitivo)
 *
 * Lê os e-mails de scripts/alunos.csv (nome;email;senha).
 * Segurança: só apaga contas com papel "student" e sem nenhuma aula concluída
 * nem tentativa de quiz. Contas de admin/instrutor ou já usadas são puladas.
 * Junto com a conta saem perfil e matrícula (on delete cascade).
 *
 * Precisa no .env (NÃO commitar): SUPABASE_SERVICE_ROLE_KEY=eyJ...
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const CSV = resolve(ROOT, 'scripts/alunos.csv')
const confirm = process.argv.includes('--confirmar')

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY no .env (ou VITE_SUPABASE_URL).')
  process.exit(1)
}
if (!existsSync(CSV)) {
  console.error(`Não achei ${CSV}`)
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

const rows = readFileSync(CSV, 'utf8')
  .replace(/^﻿/, '')
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(/[;,]/))
  .filter((c) => c[1]?.includes('@'))
  .map(([nome, email]) => ({ nome: nome.trim(), email: email.trim().toLowerCase() }))

async function allUsers() {
  const out = []
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(error.message)
    out.push(...data.users)
    if (data.users.length < 200) break
  }
  return out
}

async function main() {
  const users = await allUsers()
  let toDelete = 0
  let deleted = 0
  console.log(confirm ? 'Apagando contas (definitivo):\n' : 'Só listando (nada é apagado). Rode com --confirmar para apagar.\n')

  for (const { nome, email } of rows) {
    const user = users.find((u) => u.email?.toLowerCase() === email)
    if (!user) {
      console.log(`  · ${nome}: não existe (nada a fazer)`)
      continue
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const { count: lessons } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    const { count: quizzes } = await supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (profile?.role && profile.role !== 'student') {
      console.log(`  ✗ ${nome}: pulada (papel ${profile.role})`)
      continue
    }
    if ((lessons ?? 0) > 0 || (quizzes ?? 0) > 0) {
      console.log(`  ✗ ${nome}: pulada (já tem ${lessons} aula(s) e ${quizzes} quiz(zes))`)
      continue
    }

    toDelete++
    if (!confirm) {
      console.log(`  → ${nome}: seria apagada`)
      continue
    }
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) console.log(`  ✗ ${nome}: erro ao apagar (${error.message})`)
    else {
      deleted++
      console.log(`  ✓ ${nome}: apagada`)
    }
  }

  console.log(
    confirm
      ? `\nPronto: ${deleted} de ${toDelete} conta(s) apagada(s). Os advogados já podem se cadastrar com o próprio e-mail.`
      : `\n${toDelete} conta(s) seriam apagadas. Para apagar: npm run apagar:alunos -- --confirmar`
  )
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
