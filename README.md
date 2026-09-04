# Athenas — Plataforma de Formações Online

Aplicação web para publicação e consumo de cursos em vídeo, com trilha de progresso gamificada, matrícula de alunos, área de instrutores e autenticação real por e-mail.

**Stack:** React + Vite · Supabase (banco de dados, autenticação e API)

## Funcionalidades

- Cadastro e login com e-mail e senha (confirmação de conta por link)
- Login social via Google
- Catálogo de formações publicadas, com busca e filtros por categoria
- Matrícula em cursos e player de aulas em vídeo (YouTube)
- Trilha de progresso por curso, com sistema de XP, sequência de estudos e moedas
- Área do instrutor: criação de cursos, aulas e quizzes de avaliação
- Fluxo de curadoria: solicitação de instrutor e revisão de conteúdo antes da publicação
- Painel de moderação para aprovação de instrutores e formações

## Configuração do ambiente

### 1. Criar o projeto no Supabase

Crie um novo projeto em [supabase.com](https://supabase.com) dedicado a esta aplicação.

Utilize sempre um projeto Supabase **próprio** para este sistema. Reaproveitar o projeto de outra aplicação compartilha a mesma base de autenticação e não conterá as tabelas necessárias, exigindo a execução completa dos scripts abaixo mesmo assim.

### 2. Executar os scripts SQL

No SQL Editor do Supabase, execute os arquivos na seguinte ordem:

| Ordem | Arquivo | Responsabilidade |
| --- | --- | --- |
| 1 | `supabase/schema.sql` | Estrutura principal (cursos, aulas, matrículas) |
| 2 | `supabase/instructor-applications.sql` | Solicitações de instrutor e revisão de cursos |
| 3 | `supabase/gamification.sql` | Trilha, XP, sequência, moedas e congelador de sequência |
| 4 | `supabase/quiz-questions.sql` | Status de revisão de curso e banco de perguntas de quiz |
| 5 | `supabase/atividades-5-a-8.sql` | Nivelamento, dúvidas por aula, certificado e pesquisa SUS |

### 3. Conceder acesso de administrador

Para acessar o painel de Moderação, promova seu usuário a admin:

```sql
update public.profiles
set role = 'admin'
where id = '<seu-user-uuid>';
```

### 4. Configurar autenticação

Em **Authentication → Providers → Email**:

- Ative a opção **Confirm email**
- Defina a **Site URL** como `http://localhost:5173`
- Em **Redirect URLs**, adicione `http://localhost:5173/**`

### 5. Variáveis de ambiente

Copie a URL e a `anon key` do seu projeto Supabase para o arquivo `.env`:

```env
VITE_SUPABASE_URL=sua-url-aqui
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

## Executando o projeto

```bash
npm install
npm run dev
```

A aplicação estará disponível em [http://localhost:5173](http://localhost:5173).

## Demonstração no iPad (ou no celular)

O site publicado no GitHub Pages:

**https://jllbrasileiro123-spec.github.io/athenas-tcc/**

1. No iPad, abra o Safari e cole o link acima.
2. Faça login com a mesma conta que você usa no computador.
3. Para tela cheia: toque em **Compartilhar** → **Adicionar à Tela de Início**.

Toda alteração enviada para o `main` no GitHub atualiza esse link automaticamente (Actions → Deploy GitHub Pages).

No Supabase (**Authentication → URL Configuration**), inclua também:

- Site URL: `https://jllbrasileiro123-spec.github.io/athenas-tcc/`
- Redirect URLs: `https://jllbrasileiro123-spec.github.io/athenas-tcc/**`

## Usar no celular (desenvolvimento local)

O ATHENAS é um aplicativo web instalável (PWA). Em desenvolvimento:

1. Rode `npm run dev` no computador.
2. No celular da mesma rede Wi‑Fi, abra `http://<ip-do-computador>:5173`.
3. **iPhone/iPad:** Compartilhar → Adicionar à Tela de Início.
4. **Android:** aviso Instalar ou menu do Chrome → Adicionar à tela inicial.

O atalho abre em tela cheia, como um app.