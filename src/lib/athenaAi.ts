import { supabase } from './supabase'

export type AiTurn = { role: 'user' | 'assistant'; content: string }

/**
 * Chama a Edge Function chat-suporte (Atividade 7). Devolve null sempre que a
 * IA não estiver disponível — função não publicada, sem chave ou erro do
 * provedor — para o chat cair no FAQ local sem quebrar.
 */
/**
 * Depois de falhar, espera um pouco antes de tentar de novo, para não atrasar
 * cada mensagem. A janela é curta de propósito: durante a configuração da
 * função, uma espera longa faz parecer que o conserto não funcionou.
 */
let unavailableUntil = 0

/** Função não publicada, sem chave, token inválido: insistir não resolve. */
const RETRY_CONFIG_MS = 45 * 1000

/** Modelo lotado ou instável: a próxima pergunta já pode dar certo. */
const RETRY_BUSY_MS = 5 * 1000

/**
 * O fallback é silencioso para o aluno, mas o motivo tem que ficar visível no
 * console — sem isso não há como saber se faltou deploy, chave ou token.
 *
 * Devolve quanto tempo esperar antes da próxima tentativa.
 */
async function logFailure(reason: unknown) {
  const ctx = (reason as { context?: unknown })?.context
  let detail = ''
  let body = ''
  let status = 0

  if (ctx instanceof Response) {
    status = ctx.status
    detail = ` | HTTP ${status}`
    try {
      body = await ctx.clone().text()
      detail += ` | ${body}`
    } catch {
      /* corpo já consumido */
    }
  }

  const message = (reason as { message?: string })?.message ?? String(reason)
  console.warn(`[Athena IA] indisponível: ${message}${detail}`)

  // O provedor lotado chega como 502 model_failed com 429/503 dentro do detalhe.
  const busy = status === 502 && /\b(429|503|500|UNAVAILABLE|overload)/i.test(body)
  return busy ? RETRY_BUSY_MS : RETRY_CONFIG_MS
}

export async function askAthenaAi(input: {
  question: string
  history: AiTurn[]
  courseId: string | null
}): Promise<string | null> {
  if (Date.now() < unavailableUntil) {
    const seconds = Math.ceil((unavailableUntil - Date.now()) / 1000)
    console.warn(`[Athena IA] tentativa pulada: aguardando ${seconds}s após a última falha`)
    return null
  }

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) return null

  try {
    const { data, error } = await supabase.functions.invoke('chat-suporte', {
      body: {
        pergunta: input.question,
        historico: input.history.slice(-6),
        curso_id: input.courseId,
      },
    })

    if (error) {
      unavailableUntil = Date.now() + (await logFailure(error))
      return null
    }

    const answer = (data as { resposta?: string } | null)?.resposta
    if (typeof answer === 'string' && answer.trim()) return answer.trim()

    console.warn('[Athena IA] resposta vazia da função', data)
    unavailableUntil = Date.now() + RETRY_CONFIG_MS
    return null
  } catch (err) {
    unavailableUntil = Date.now() + (await logFailure(err))
    return null
  }
}
