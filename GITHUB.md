# Subir o ATHENAS no GitHub

O Git já está inicializado nesta pasta. O arquivo `.env` **não** vai para o GitHub (fica só no seu PC).

## 1. Criar o repositório no site

1. Entre em [github.com](https://github.com) e faça login.
2. Clique no **+** (canto superior direito) → **New repository**.
3. **Repository name:** `athenas` (ou `athenas-tcc`).
4. Deixe **Public** ou **Private** (como preferir).
5. **Não** marque "Add a README" nem ".gitignore" (já existem no projeto).
6. Clique em **Create repository**.

## 2. Enviar o código do seu PC

No PowerShell, na pasta do projeto:

```powershell
cd "c:\Users\jllbr\OneDrive\Desktop\trabalho tcc\athenas"
```

Troque `SEU_USUARIO` pelo seu usuário do GitHub:

```powershell
git remote add origin https://github.com/SEU_USUARIO/athenas.git
git push -u origin main
```

O GitHub vai pedir login. Use sua conta ou um **Personal Access Token** (Settings → Developer settings → Tokens).

## 3. Conectar no Railway

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub**.
2. Autorize o GitHub e escolha o repositório **athenas**.
3. **Root Directory:** deixe vazio (o código já está na raiz do repo).
4. Em **Variables**, cadastre:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPPORT_WHATSAPP`
5. **Generate Domain** e atualize as URLs no Supabase (Authentication).

## Atualizar depois

```powershell
git add .
git commit -m "Descrição da mudança"
git push
```

O Railway faz redeploy automático após cada `git push`.
