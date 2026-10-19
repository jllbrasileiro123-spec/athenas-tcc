import { supabase } from './supabase'

/**
 * Pré-teste (Google Forms, anônimo) × Pós-teste (no app, fim do Módulo 4).
 * Bloco A = perfil, B = perguntas repetidas do pré (comparação), C = só no pós.
 * O texto e as alternativas do bloco B são idênticos ao pré-teste.
 */

export type SurveyKind = 'single' | 'multi' | 'scale' | 'nps' | 'text'
export type SurveyBlock = 'A' | 'B' | 'C'

export type SurveyQuestion = {
  id: string
  block: SurveyBlock
  text: string
  kind: SurveyKind
  options?: string[]
  /** Rótulos das pontas da escala 1–5 */
  scaleLabels?: [string, string]
  /** Aceita "Outro" com texto livre (como no Google Forms) */
  other?: boolean
  required?: boolean
  /** Alternativa correta (perguntas de conhecimento) */
  correct?: string
  /** Alternativa acompanhada como indicador (ex.: "Sim, conheço bem") */
  target?: string
  /** As alternativas formam uma escala ordenada (média de 1 a N) */
  ordinal?: boolean
}

export const OTHER = 'Outro'

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'A1', block: 'A', kind: 'single', required: true,
    text: 'Qual é a sua faixa etária?',
    options: ['Menos de 25 anos', '25 a 34 anos', '35 a 44 anos', '45 a 54 anos', '55 anos ou mais'],
  },
  {
    id: 'A2', block: 'A', kind: 'single', required: true,
    text: 'Há quanto tempo você atua na área jurídica?',
    options: ['Menos de 1 ano', '1 a 3 anos', '4 a 7 anos', '8 a 15 anos', 'Mais de 15 anos'],
  },
  {
    id: 'A3', block: 'A', kind: 'multi', required: true, other: true,
    text: 'Como você atua profissionalmente atualmente?',
    options: [
      'Advogado(a) autônomo(a)',
      'Advogado(a) em escritório',
      'Estagiário(a) de Direito',
      'Técnico(a) judiciário(a)',
      'Servidor(a) do Poder Judiciário',
    ],
  },
  {
    id: 'B1', block: 'B', kind: 'scale', required: true,
    text: 'Como você avalia seu conhecimento atual sobre ferramentas de Inteligência Artificial?',
    scaleLabels: ['Nenhum conhecimento', 'Conhecimento avançado'],
  },
  {
    id: 'B2', block: 'B', kind: 'scale', required: true,
    text: 'Como você avalia seu conhecimento sobre ferramentas de IA voltadas para o Direito?',
    scaleLabels: ['Nenhum conhecimento', 'Conhecimento avançado'],
  },
  {
    id: 'B3', block: 'B', kind: 'scale', required: true,
    text: 'Com que frequência você utiliza ferramentas de Inteligência Artificial em sua rotina profissional?',
    scaleLabels: ['Nunca utilizo', 'Sempre utilizo'],
  },
  {
    id: 'B4', block: 'B', kind: 'multi', required: true, other: true,
    text: 'Quais ferramentas de Inteligência Artificial você mais utiliza?',
    options: [
      'ChatGPT',
      'Claude',
      'Gemini',
      'Ferramentas jurídicas específicas',
      'Copilot',
      'Não utilizo ferramentas de IA',
    ],
  },
  {
    id: 'B5', block: 'B', kind: 'multi', required: true, other: true,
    text: 'Para quais finalidades você utiliza ou utilizaria ferramentas de Inteligência Artificial no trabalho',
    options: [
      'Pesquisa jurisprudencial',
      'Elaboração de peças processuais',
      'Análise e revisão de contratos',
      'Triagem e organização de documentos',
      'Resumo de processos ou documentos extensos',
      'Atendimento inicial a clientes',
      'Gestão de prazos e agenda',
    ],
  },
  {
    id: 'B6', block: 'B', kind: 'single', required: true, target: 'Sim, conheço bem',
    text: 'Você conhece a Recomendação OAB nº 001/2024 sobre o uso de Inteligência Artificial na advocacia?',
    options: ['Sim, conheço bem', 'Já ouvi falar, mas conheço pouco', 'Não conheço', 'Não se aplica à minha atuação'],
  },
  {
    id: 'B7', block: 'B', kind: 'single', required: true, target: 'Sim, conheço bem',
    text: 'Você conhece a Resolução do Conselho Nacional de Justiça (CNJ) nº 615/2025 sobre o uso de Inteligência Artificial no Poder Judiciário?',
    options: ['Sim, conheço bem', 'Já ouvi falar, mas conheço pouco', 'Não conheço', 'Não se aplica à minha atuação'],
  },
  {
    id: 'B8', block: 'B', kind: 'single', required: true,
    correct: 'Quando a IA gera informações falsas apresentadas como verdadeiras',
    text: 'O que você entende por "alucinação de IA"?',
    options: [
      'Não sei o que é',
      'Quando a IA fica lenta ou trava',
      'Quando a IA gera informações falsas apresentadas como verdadeiras',
      'Quando a IA não entende o que foi pedido',
      'Quando a IA repete o mesmo conteúdo várias vezes',
    ],
  },
  {
    id: 'B9', block: 'B', kind: 'single', required: true, other: true,
    text: 'Qual é sua maior preocupação ao usar IA no trabalho jurídico?',
    options: [
      'Geração de informações incorretas (alucinações)',
      'Violação de sigilo/privacidade do cliente',
      'Responsabilidade profissional por erros da IA',
      'Falta de conhecimento para usar corretamente',
      'Não tenho preocupações significativas',
    ],
  },
  {
    id: 'B10', block: 'B', kind: 'single', required: true, target: 'Sempre verifico antes de usar', ordinal: true,
    text: 'Você verifica o conteúdo gerado pela IA antes de utilizá-lo em peças ou documentos?',
    options: ['Nunca utilizei IA para isso', 'Não costumo verificar', 'Verifico às vezes', 'Sempre verifico antes de usar'],
  },
  {
    id: 'B11', block: 'B', kind: 'single', required: true, ordinal: true,
    text: 'Você acredita que a IA pode impactar positivamente sua produtividade?',
    options: ['Não acredito', 'Acredito pouco', 'Neutro', 'Acredito bastante', 'Tenho certeza que sim'],
  },
  {
    id: 'C1', block: 'C', kind: 'scale', required: true,
    text: 'Depois da capacitação, quanto você se sente seguro(a) para usar IA no trabalho jurídico?',
    scaleLabels: ['Nada seguro(a)', 'Muito seguro(a)'],
  },
  {
    id: 'C2', block: 'C', kind: 'single', required: true, ordinal: true,
    text: 'Em relação ao início da capacitação, sua segurança para usar IA...',
    options: ['Diminuiu', 'Continuou igual', 'Aumentou um pouco', 'Aumentou muito'],
  },
  {
    id: 'C3', block: 'C', kind: 'single', required: true, ordinal: true,
    text: 'Quanto tempo por semana você estima que a IA, usada como no curso, pode economizar na sua rotina?',
    options: ['Nenhum', 'Até 1 hora', '1 a 3 horas', '3 a 5 horas', 'Mais de 5 horas'],
  },
  {
    id: 'C4', block: 'C', kind: 'single', required: true,
    text: 'Em qual atividade a capacitação mais vai ajudar sua produtividade?',
    options: [
      'Pesquisa jurisprudencial',
      'Redação de peças processuais',
      'Análise e revisão de contratos',
      'Organização e gestão de documentos',
      'Atendimento a clientes',
    ],
  },
  {
    id: 'C5', block: 'C', kind: 'scale', required: true,
    text: 'A capacitação atendeu às suas expectativas?',
    scaleLabels: ['Não atendeu', 'Superou'],
  },
  {
    id: 'C6', block: 'C', kind: 'nps', required: true,
    text: 'De 0 a 10, quanto você recomendaria esta capacitação a um colega?',
  },
  {
    id: 'C7', block: 'C', kind: 'text',
    text: 'Caso queira, comente o que mais mudou na sua forma de usar IA no trabalho.',
  },
]

export type SurveyAnswer = string | string[] | number
export type SurveyAnswers = Record<string, SurveyAnswer>

export function isAnswered(a: SurveyAnswer | undefined): boolean {
  if (a === undefined || a === null) return false
  if (Array.isArray(a)) return a.length > 0
  if (typeof a === 'string') return a.trim().length > 0
  return true
}

/* ---------------- Banco ---------------- */

export function isMissingPrePost(message: string | undefined | null): boolean {
  if (!message) return false
  return message.includes('post_test_responses') || message.includes('pre_test_responses') || message.includes('schema cache')
}

export async function fetchMyPostTest(courseId: string, userId: string) {
  const { data, error } = await supabase
    .from('post_test_responses')
    .select('answers, updated_at')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle()
  return { response: data as { answers: SurveyAnswers; updated_at: string } | null, error: error?.message ?? null }
}

export async function savePostTest(courseId: string, userId: string, answers: SurveyAnswers) {
  const { error } = await supabase
    .from('post_test_responses')
    .upsert(
      { course_id: courseId, user_id: userId, answers, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,course_id' }
    )
  return { error: error?.message ?? null }
}

export async function fetchPrePostData(courseId: string) {
  const [pre, post] = await Promise.all([
    supabase.from('pre_test_responses').select('answers, submitted_at'),
    supabase.from('post_test_responses').select('answers, created_at').eq('course_id', courseId),
  ])
  return {
    pre: ((pre.data ?? []) as { answers: SurveyAnswers }[]).map((r) => r.answers),
    post: ((post.data ?? []) as { answers: SurveyAnswers }[]).map((r) => r.answers),
    error: pre.error?.message ?? post.error?.message ?? null,
  }
}

/** Substitui todo o pré-teste importado pelas linhas novas. */
export async function replacePreTest(rows: { answers: SurveyAnswers; submitted_at: string | null }[], userId: string) {
  const del = await supabase.from('pre_test_responses').delete().not('id', 'is', null)
  if (del.error) return { error: del.error.message }
  if (rows.length === 0) return { error: null }
  const { error } = await supabase
    .from('pre_test_responses')
    .insert(rows.map((r) => ({ ...r, imported_by: userId })))
  return { error: error?.message ?? null }
}

/* ---------------- Importação do CSV do Google Forms ---------------- */

/** CSV com aspas (RFC 4180). Detecta "," ou ";" pela primeira linha. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.slice(0, src.indexOf('\n') >>> 0)
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim()))
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

function parseCell(q: SurveyQuestion, raw: string): SurveyAnswer | undefined {
  const cell = raw.trim()
  if (!cell) return undefined
  if (q.kind === 'scale' || q.kind === 'nps') {
    const n = Number(cell.replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
  }
  if (q.kind === 'text') return cell
  const options = q.options ?? []
  if (q.kind === 'single') {
    const hit = options.find((o) => norm(o) === norm(cell))
    return hit ?? (q.other ? OTHER : undefined)
  }
  // Múltipla escolha: o Forms junta as marcadas com ", "
  let rest = norm(cell)
  const picked: string[] = []
  for (const o of [...options].sort((a, b) => b.length - a.length)) {
    const key = norm(o)
    if (rest.includes(key)) {
      picked.push(o)
      rest = rest.replace(key, '')
    }
  }
  if (q.other && rest.replace(/[,;\s]/g, '').length > 0) picked.push(OTHER)
  return picked.length ? picked : undefined
}

/** "19/10/2026 14:40:00" (Forms em pt-BR) → ISO */
function parseFormsDate(raw: string | undefined): string | null {
  const m = raw?.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (!m) return null
  const [, d, mo, y, h = '0', mi = '0', s = '0'] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export type PreImport = {
  rows: { answers: SurveyAnswers; submitted_at: string | null }[]
  matched: string[]
  missing: string[]
}

/** Lê o CSV de respostas do pré-teste e mapeia as colunas para as perguntas A e B. */
export function importPreTestCsv(text: string): PreImport {
  const table = parseCsv(text)
  if (table.length < 2) return { rows: [], matched: [], missing: SURVEY_QUESTIONS.filter((q) => q.block !== 'C').map((q) => q.id) }
  const header = table[0].map(norm)
  const columns: Record<string, number> = {}
  for (const q of SURVEY_QUESTIONS) {
    if (q.block === 'C') continue
    // Compara pelo começo do texto: o Forms pode trazer "(Selecione mais de uma...)" no fim
    const key = norm(q.text).slice(0, 60)
    const idx = header.findIndex((h) => h.length > 10 && (h.startsWith(key) || key.startsWith(h.slice(0, 60))))
    if (idx >= 0) columns[q.id] = idx
  }
  const dateIdx = header.findIndex((h) => h.startsWith('carimbo de data') || h.startsWith('timestamp'))
  const rows = table.slice(1).map((r) => {
    const answers: SurveyAnswers = {}
    for (const q of SURVEY_QUESTIONS) {
      const idx = columns[q.id]
      if (idx === undefined) continue
      const v = parseCell(q, r[idx] ?? '')
      if (v !== undefined) answers[q.id] = v
    }
    return { answers, submitted_at: dateIdx >= 0 ? parseFormsDate(r[dateIdx]) : null }
  })
  const ids = SURVEY_QUESTIONS.filter((q) => q.block !== 'C').map((q) => q.id)
  return {
    rows: rows.filter((r) => Object.keys(r.answers).length > 0),
    matched: ids.filter((id) => id in columns),
    missing: ids.filter((id) => !(id in columns)),
  }
}

/* ---------------- Comparação ---------------- */

export type OptionStat = { option: string; count: number; pct: number }

export type QuestionStats = {
  n: number
  mean: number | null
  options: OptionStat[]
  /** % que marcou a alternativa correta / indicador (correct ou target) */
  keyPct: number | null
  /** NPS (-100 a 100), só para kind 'nps' */
  nps: number | null
  comments: string[]
}

const round1 = (x: number) => Math.round(x * 10) / 10

export function questionStats(q: SurveyQuestion, list: SurveyAnswers[]): QuestionStats {
  const answers = list.map((a) => a[q.id]).filter((a) => isAnswered(a))
  const n = answers.length
  const pct = (c: number) => (n ? round1((c / n) * 100) : 0)

  if (q.kind === 'text') {
    return { n, mean: null, options: [], keyPct: null, nps: null, comments: answers.map(String) }
  }

  if (q.kind === 'scale' || q.kind === 'nps') {
    const nums = answers.map(Number).filter((x) => Number.isFinite(x))
    const values = q.kind === 'nps' ? Array.from({ length: 11 }, (_, i) => i) : [1, 2, 3, 4, 5]
    const options = values.map((v) => {
      const count = nums.filter((x) => x === v).length
      return { option: String(v), count, pct: pct(count) }
    })
    const mean = nums.length ? round1(nums.reduce((s, x) => s + x, 0) / nums.length) : null
    const nps =
      q.kind === 'nps' && nums.length
        ? Math.round(((nums.filter((x) => x >= 9).length - nums.filter((x) => x <= 6).length) / nums.length) * 100)
        : null
    return { n, mean, options, keyPct: null, nps, comments: [] }
  }

  const opts = [...(q.options ?? []), ...(q.other ? [OTHER] : [])]
  const options = opts.map((o) => {
    const count = answers.filter((a) => (Array.isArray(a) ? a.includes(o) : a === o)).length
    return { option: o, count, pct: pct(count) }
  })
  const key = q.correct ?? q.target
  const keyPct = key ? (options.find((o) => o.option === key)?.pct ?? 0) : null
  let mean: number | null = null
  if (q.ordinal && n) {
    const pos = answers.map((a) => (q.options ?? []).indexOf(String(a)) + 1).filter((x) => x > 0)
    mean = pos.length ? round1(pos.reduce((s, x) => s + x, 0) / pos.length) : null
  }
  return { n, mean, options, keyPct, nps: null, comments: [] }
}

/** Linhas do CSV de comparação, prontas para downloadCsv */
export function comparisonCsvRows(pre: SurveyAnswers[], post: SurveyAnswers[]): (string | number | null)[][] {
  const rows: (string | number | null)[][] = [
    ['Bloco', 'Pergunta', 'Alternativa / indicador', 'Antes (n)', 'Antes (%)', 'Depois (n)', 'Depois (%)', 'Diferença (p.p.)'],
  ]
  for (const q of SURVEY_QUESTIONS) {
    if (q.kind === 'text') continue
    const a = q.block === 'C' ? null : questionStats(q, pre)
    const b = questionStats(q, post)
    if (b.mean !== null || a?.mean != null) {
      rows.push([q.block, q.text, 'Média', a?.mean ?? '', '', b.mean ?? '', '', a?.mean != null && b.mean !== null ? round1(b.mean - a.mean) : ''])
    }
    if (b.nps !== null) rows.push([q.block, q.text, 'NPS', '', '', b.nps, '', ''])
    for (const ob of b.options) {
      const oa = a?.options.find((o) => o.option === ob.option)
      rows.push([
        q.block,
        q.text,
        ob.option,
        oa?.count ?? '',
        oa?.pct ?? '',
        ob.count,
        ob.pct,
        oa ? round1(ob.pct - oa.pct) : '',
      ])
    }
  }
  return rows
}
