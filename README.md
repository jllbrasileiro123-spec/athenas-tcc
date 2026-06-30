# ATHENAS — Plataforma de cursos (estilo Udemy)

Aplicação React + Supabase para publicar cursos, aulas em vídeo, matrícula de alunos e login com **e-mail real** (confirmação por link).

## IMPORTANTE — não use o Supabase da clínica (MED FÁCIL)

Se você colar no `.env` a **mesma URL e chave** do outro sistema:

- Os **mesmos e-mails e senhas** vão funcionar aqui (é o mesmo banco `auth.users`).
- Você **não** terá tabelas de cursos até rodar o `schema.sql` no projeto certo.

**Solução:** crie um **projeto Supabase novo** só para o TCC de cursos. Copie URL e `anon key` desse projeto novo para o `.env`.

## Funcionalidades

- Cadastro com e-mail e senha (Supabase envia link de confirmação)
- Login com e-mail/senha (layout em cartão dividido)
- Login social: Google, Facebook, Apple (configurar no Supabase)
- Catálogo de cursos publicados
- Matrícula e player de aulas (YouTube embed)
- Área do instrutor: criar curso + aulas
- Progresso por aula

## 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto.
2. Em **SQL Editor**, execute o arquivo `supabase/schema.sql`.
3. Em **Authentication → Providers → Email**:
   - Ative **Confirm email** (obrigatório para aceitar e-mails reais).
   - Configure **Site URL**: `http://localhost:5173`
   - Em **Redirect URLs**, adicione: `http://localhost:5173/**`
4. (Opcional) Login social: Google no Supabase; **Apple** → guia completo em **[APPLE_SETUP.md](./APPLE_SETUP.md)**.
5. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public` key

## 2. Configurar o React

Na pasta `athenas`:

```bash
npm install
```

Crie o arquivo `.env` (copie de `.env.example`):

```env
VITE_SUPABASE_URL=https://SEU_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

A senha que você criou (ex.: para login no app) **não** vai no `.env` — só URL e chave **anon public** do painel.

Pacotes instalados: `@supabase/supabase-js` e `@supabase/ssr` (cliente no navegador via `createBrowserClient`).

Inicie:

```bash
npm run dev
```

Abra `http://localhost:5173`.

## Deploy no Railway

O app é um site estático (Vite). O Railway faz `npm run build` e sobe com `serve` na porta `PORT`.

### Passo a passo

1. Crie conta em [railway.com](https://railway.com) e **New Project → Deploy from GitHub** (ou CLI).
2. Se o repositório for a pasta pai (`trabalho tcc`), em **Settings → Root Directory** coloque: `athenas`.
3. Em **Variables**, adicione (obrigatório **antes** do deploy — o Vite embute isso no build):

   | Variável | Exemplo |
   |----------|---------|
   | `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | chave `anon public` |
   | `VITE_SUPPORT_WHATSAPP` | `5583999163606` |

4. Gere um domínio: **Settings → Networking → Generate Domain**.
5. No **Supabase** → **Authentication → URL Configuration**:
   - **Site URL:** `https://SEU-DOMINIO.up.railway.app`
   - **Redirect URLs:** `https://SEU-DOMINIO.up.railway.app/**`
6. Faça **Redeploy** depois de mudar variáveis `VITE_*` (elas só entram no build).

### CLI (opcional)

```bash
npm i -g @railway/cli
cd athenas
railway login
railway init
railway variables set VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... VITE_SUPPORT_WHATSAPP=...
railway up
```

### Testar produção localmente

```bash
npm run build
npm start
# http://localhost:3000
```

## 3. Fluxo de teste

1. **Cadastrar** → use um e-mail real → confirme pelo link no e-mail.
2. **Entrar** com e-mail e senha.
3. Cadastre-se como **Instrutor** (ou crie outra conta) → **Área do instrutor** → **Novo curso**.
4. Marque **Publicar curso** e adicione aulas com URL do YouTube.
5. Com conta de **Aluno**, matricule-se e assista em **Assistir**.

## Estrutura

```
src/
  components/   Layout, CourseCard, AuthLayout, SocialLogin
  contexts/     AuthContext (Supabase Auth)
  pages/        Home, Login, Signup, CourseDetail, ...
  lib/          supabase.ts
supabase/
  schema.sql    Tabelas + RLS + trigger de perfil
```

## Tecnologias

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Supabase (Auth + PostgreSQL + RLS)
- React Router 7

## TCC

Documente no trabalho: modelo de dados, políticas RLS, fluxo de confirmação de e-mail e comparação com plataformas como Udemy.
