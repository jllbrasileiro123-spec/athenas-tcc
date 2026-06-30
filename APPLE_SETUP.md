# Login com Apple — passo a passo (ATHENAS)

O botão **Apple** no app já está no código. Para funcionar, você configura **Apple Developer** + **Supabase**.  
É preciso conta **Apple Developer Program** (paga, ~US$ 99/ano).

---

## Antes de começar

1. Anote o **ID do projeto Supabase** (está na URL do painel):  
   `https://supabase.com/dashboard/project/XXXXXXXX` → o `XXXXXXXX` é o **Project Ref**.

2. URL de callback do Supabase (use seu Project Ref):

   ```
   https://XXXXXXXX.supabase.co/auth/v1/callback
   ```

3. URLs do seu site (Redirect no Supabase → URL Configuration):

   ```
   http://localhost:5173/**
   https://athenas-tcc-production.up.railway.app/**
   http://localhost:5173/auth/callback
   https://athenas-tcc-production.up.railway.app/auth/callback
   ```

   (Troque o domínio Railway se o seu for outro.)

---

## Parte A — Apple Developer (developer.apple.com)

### A1. Identifiers → App ID

1. **Certificates, Identifiers & Profiles** → **Identifiers** → **+**
2. **App IDs** → Continue
3. Description: `ATHENAS`
4. Bundle ID: `com.athenas.tcc` (ou outro único)
5. Marque **Sign in with Apple** → Continue → Register

### A2. Services ID (é o “Client ID” do Supabase)

1. **Identifiers** → **+** → **Services IDs** → Continue
2. Description: `ATHENAS Web`
3. Identifier: `com.athenas.tcc.web` ← **anote este valor**
4. Register → clique no Services ID criado
5. Marque **Sign in with Apple** → **Configure**
6. **Primary App ID:** escolha o App ID do passo A1
7. **Domains and Subdomains:**  
   `XXXXXXXX.supabase.co` (só o ref, sem `https://`)
8. **Return URLs:**  
   `https://XXXXXXXX.supabase.co/auth/v1/callback`
9. Save → Continue → Save

### A3. Key (.p8)

1. **Keys** → **+**
2. Nome: `ATHENAS Sign in with Apple`
3. Marque **Sign in with Apple** → Configure → escolha o App ID A1
4. Register → **Download** o arquivo `.p8` (só baixa **uma vez**)
5. Anote o **Key ID**

### A4. Team ID

**Membership** → copie o **Team ID** (10 caracteres).

---

## Parte B — Gerar Secret Key (JWT) para o Supabase

Na pasta `athenas`, com o arquivo `.p8` salvo (ex.: `AuthKey_ABC123.p8`):

```powershell
cd "c:\Users\jllbr\OneDrive\Desktop\trabalho tcc\athenas"
node scripts/generate-apple-secret.mjs `
  --team-id SEU_TEAM_ID `
  --key-id SEU_KEY_ID `
  --p8 .\AuthKey_XXXXX.p8 `
  --client-id com.athenas.tcc.web
```

`--client-id` deve ser **igual** ao **Services ID** (passo A2).

Copie o JWT que aparecer no terminal (válido ~6 meses).

---

## Parte C — Supabase

1. **Authentication** → **Providers** → **Apple** → Enable
2. Preencha:
   - **Client IDs (for OAuth):** `com.athenas.tcc.web` (seu Services ID)
   - **Secret Key (for OAuth):** cole o JWT gerado
3. **Authentication** → **URL Configuration**
   - Site URL: seu link Railway com `https://`
   - Redirect URLs: lista da seção “Antes de começar”
4. Save

---

## Parte D — Testar

1. Local: `npm run dev` → http://localhost:5173 → botão **Apple**
2. Produção: abra o site Railway → **Apple**
3. Fluxo: Apple → Supabase → `/auth/callback` → **Explorar**

Se falhar, a mensagem de erro aparece na tela de login.

---

## Erros comuns

| Erro | Solução |
|------|---------|
| `invalid_client` | Services ID no Supabase ≠ Services ID na Apple |
| `redirect_uri` | Return URL na Apple deve ser exatamente `https://REF.supabase.co/auth/v1/callback` |
| Secret expirado | Rode de novo `npm run apple:secret` e cole no Supabase |
| Botão não abre nada | Ative Apple no Supabase; confira Redirect URLs |
| Funciona no PC, não no Railway | Adicione URL do Railway nas Redirect URLs |

---

## Renovar o JWT (a cada ~6 meses)

```powershell
npm run apple:secret -- --team-id ... --key-id ... --p8 .\AuthKey_XXX.p8 --client-id com.athenas.tcc.web
```

Cole o novo JWT em Supabase → Apple → Secret Key.
