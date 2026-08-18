import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL?.trim()
const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim()
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!url || !anon) {
  console.error('Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env')
  process.exit(1)
}

const email = process.env.TEST_USER_EMAIL ?? 'aluno.teste@athenas.app'
const password = process.env.TEST_USER_PASSWORD ?? 'AthenasTeste123'
const fullName = process.env.TEST_USER_NAME ?? 'Aluno Teste'
const meta = { full_name: fullName, role: 'student' }

async function confirmWithAdmin() {
  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  })

  if (!created.error) {
    return created.data.user?.id ?? null
  }

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (listError) throw new Error(listError.message)

  const existing = listed.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existing) throw new Error(created.error.message)

  const updated = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: meta,
  })
  if (updated.error) throw new Error(updated.error.message)
  return existing.id
}

if (serviceRole) {
  const userId = await confirmWithAdmin()
  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: signedIn, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })
  console.log(
    JSON.stringify(
      {
        email,
        password,
        name: fullName,
        userId: signedIn?.user?.id ?? userId,
        confirmed: Boolean(signedIn?.session),
        signInNote: signInError?.message ?? null,
      },
      null,
      2
    )
  )
  if (!signedIn?.session) process.exit(2)
  process.exit(0)
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: { data: meta, emailRedirectTo: 'http://localhost:5173/login' },
})

if (signUpError && !/already|registered|exists/i.test(signUpError.message)) {
  console.error(signUpError.message)
  process.exit(1)
}

const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
})

console.log(
  JSON.stringify(
    {
      email,
      password,
      name: fullName,
      userId: signedIn?.user?.id ?? signedUp?.user?.id ?? null,
      confirmed: Boolean(signedIn?.session),
      signUpNote: signUpError?.message ?? null,
      signInNote: signInError?.message ?? null,
    },
    null,
    2
  )
)
if (!signedIn?.session) process.exit(2)
