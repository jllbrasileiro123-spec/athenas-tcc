import type { Language } from '../contexts/LanguageContext'

type ReplyKey =
  | 'enroll'
  | 'password'
  | 'lessons'
  | 'instructor'
  | 'account'
  | 'athena'
  | 'price'
  | 'default'

const patterns: { key: ReplyKey; keys: string[] }[] = [
  { key: 'enroll', keys: ['matricul', 'inscri', 'enroll'] },
  { key: 'password', keys: ['senha', 'password', 'esqueci', 'forgot'] },
  { key: 'lessons', keys: ['curso', 'aula', 'video', 'assistir', 'lesson', 'watch'] },
  { key: 'instructor', keys: ['instrutor', 'publicar', 'criar', 'instructor', 'publish'] },
  { key: 'account', keys: ['conta', 'email', 'cadastr', 'account', 'sign up'] },
  { key: 'athena', keys: ['ia', 'athena', 'assistente', 'assistant'] },
  { key: 'price', keys: ['preço', 'preco', 'gratis', 'grátis', 'pago', 'price', 'free'] },
]

const replies: Record<Language, Record<ReplyKey, string>> = {
  pt: {
    enroll: 'Para se matricular, abra a formação e clique em "Matricular-se". Você precisa estar logado.',
    password: 'No menu do avatar: "Esqueci / alterar senha". Ou na tela de login: "Esqueceu a senha?".',
    lessons: 'Depois de matriculado, abra a formação e clique em "Assistir". Aulas com "Prévia" são gratuitas.',
    instructor: 'Instrutores publicam em Ensinar → Novo curso. Cadastre-se como instrutor se ainda for aluno.',
    account: 'Use Entrar ou Cadastrar na tela inicial. Confirme o e-mail se o Supabase pedir.',
    athena: 'Sou a Athena. Para suporte humano, use Ajuda no menu do avatar (envia para WhatsApp).',
    price: 'O preço aparece na página da formação. Valor zero = "Grátis".',
    default:
      'Posso ajudar com matrícula, senha, aulas e publicação. Use as sugestões ou seja mais específico.',
  },
  en: {
    enroll: 'Open a program and click "Enroll". You must be signed in.',
    password: 'Avatar menu → "Forgot / change password", or use the link on the sign-in page.',
    lessons: 'After enrolling, open the program and click "Watch". Lessons marked "Preview" are free.',
    instructor: 'Instructors publish via Teach → New course. Sign up as instructor if you are a student.',
    account: 'Use Sign in or Sign up on the home screen. Confirm your email if required.',
    athena: 'I am Athena. For human support, use Help in the avatar menu (sends to WhatsApp).',
    price: 'Price is shown on the program page. Zero means "Free".',
    default: 'I can help with enrollment, passwords, lessons, and publishing. Try the suggestions or be specific.',
  },
}

export function getAssistantReply(text: string, lang: Language): string {
  const q = text.toLowerCase()
  for (const { key, keys } of patterns) {
    if (keys.some((k) => q.includes(k))) return replies[lang][key]
  }
  return replies[lang].default
}
