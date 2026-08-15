/**
 * Gera o Secret Key (JWT) para Apple Sign In no Supabase.
 *
 * Uso (na pasta athenas):
 *   npm install jose
 *   node scripts/generate-apple-secret.mjs --team-id SEU_TEAM_ID --key-id SEU_KEY_ID --p8 ./AuthKey_XXXXX.p8
 *
 * Opcional: --client-id tcc  (padrão: tcc)
 *
 * Cole o JWT impresso em: Supabase → Authentication → Providers → Apple → Secret Key
 */

import { readFileSync } from 'fs'
import { importPKCS8, SignJWT } from 'jose'

function arg(name) {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : null
}

const teamId = arg('--team-id') || process.env.APPLE_TEAM_ID
const keyId = arg('--key-id') || process.env.APPLE_KEY_ID
const clientId = arg('--client-id') || process.env.APPLE_CLIENT_ID || 'tcc'
const p8Path = arg('--p8') || process.env.APPLE_P8_PATH

if (!teamId || !keyId || !p8Path) {
  console.error(`
Faltam dados. Exemplo:

  node scripts/generate-apple-secret.mjs \\
    --team-id AB12CD34EF \\
    --key-id XYZ123ABC0 \\
    --p8 ./AuthKey_XYZ123ABC0.p8 \\
    --client-id tcc

Onde achar:
  Team ID  → developer.apple.com → Membership
  Key ID   → Keys → sua chave Sign in with Apple
  .p8      → arquivo baixado ao criar a Key (só baixa 1 vez)
  client-id → mesmo Services ID do Supabase (ex: tcc)

NÃO use sua senha de Apple ou do Supabase aqui.
`)
  process.exit(1)
}

const privateKeyPem = readFileSync(p8Path, 'utf8')
const privateKey = await importPKCS8(privateKeyPem, 'ES256')

const now = Math.floor(Date.now() / 1000)
const exp = now + 86400 * 180 // 180 dias (máx. ~6 meses)

const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: keyId })
  .setIssuer(teamId)
  .setAudience('https://appleid.apple.com')
  .setSubject(clientId)
  .setIssuedAt(now)
  .setExpirationTime(exp)
  .sign(privateKey)

console.log('\n--- Cole isto no Supabase (Secret Key) ---\n')
console.log(jwt)
console.log('\n--- Válido por ~6 meses; depois gere de novo ---\n')
