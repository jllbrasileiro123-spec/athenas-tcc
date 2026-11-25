import { supabase } from './supabase'

/**
 * Versão do texto do TCLE. Mudou o texto? Suba a versão: quem aceitou a
 * anterior vê o termo de novo no próximo acesso.
 */
export const VERSAO_TERMO = '2026-11'

/** E-mail dos pesquisadores para dúvidas sobre a pesquisa. Vazio esconde a linha. */
export const CONTATO_PESQUISA = ''

export type SecaoTermo = { titulo: string; paragrafos: string[] }

export const TITULO_TERMO = 'Termo de Consentimento Livre e Esclarecido (TCLE)'

export const SECOES_TERMO: SecaoTermo[] = [
  {
    titulo: 'Sobre a pesquisa',
    paragrafos: [
      'Você está sendo convidado(a) a participar da pesquisa "Capacitação no uso de Inteligência Artificial no cotidiano jurídico: desenvolvimento da plataforma ATHENAS", Trabalho de Conclusão de Curso de Ciência da Computação do Centro Universitário de João Pessoa (UNIPÊ), realizado por João Lucas Luna Brasileiro e Gilverson Rodrigues da Silva, sob orientação do Prof. José Raul de Brito Andrade.',
      'O objetivo é avaliar se a plataforma ATHENAS ajuda profissionais e estudantes do Direito a usar ferramentas de inteligência artificial de forma responsável, com atenção ao sigilo profissional, à LGPD e às orientações da OAB e do CNJ.',
    ],
  },
  {
    titulo: 'O que será feito',
    paragrafos: [
      'Ao participar, você usa a plataforma normalmente: assiste às aulas, faz o teste de nivelamento, os exercícios e os quizzes e, ao final, responde a um questionário sobre a sua experiência e o seu perfil profissional.',
      'Para a pesquisa, serão usados os dados que a plataforma já registra durante o uso: nota do teste de nivelamento, notas e número de tentativas nos quizzes, módulos dispensados pelo nivelamento, tempo de uso, progresso nas aulas e as respostas ao questionário final.',
    ],
  },
  {
    titulo: 'Sigilo e uso dos dados',
    paragrafos: [
      'Como o questionário é respondido com a sua conta, os pesquisadores conseguem saber quem respondeu. Por isso, os dados serão analisados e publicados somente de forma agregada e anônima (totais, médias e percentuais). Seu nome, e-mail, telefone ou qualquer informação que permita identificá-lo(a) não aparecerão no trabalho, em apresentações ou em publicações.',
      'Os dados ficam armazenados no banco da plataforma (Supabase), com acesso restrito aos pesquisadores, e serão usados apenas para esta pesquisa, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
      'A assistente Athena usa uma IA externa (Google Gemini). Seu nome não é enviado a ela, mas o texto que você digita no chat é. Não escreva no chat dados sigilosos de clientes ou de processos.',
    ],
  },
  {
    titulo: 'Riscos e benefícios',
    paragrafos: [
      'Os riscos são mínimos: possível cansaço ou desconforto ao responder perguntas, e o risco, comum a qualquer sistema on-line, de acesso indevido aos dados, reduzido pelas medidas de segurança da plataforma. Você pode pular perguntas e parar quando quiser.',
      'Como benefício, você recebe gratuitamente a capacitação em uso responsável de IA no Direito e o certificado ao concluir a trilha. Os resultados também ajudam a melhorar a formação de outros profissionais.',
    ],
  },
  {
    titulo: 'Participação voluntária',
    paragrafos: [
      'A participação é voluntária e não tem custo nem pagamento. Você pode recusar agora, ou retirar o consentimento a qualquer momento na página deste termo, sem nenhum prejuízo: a plataforma continua disponível do mesmo jeito para quem não participa da pesquisa, e os dados de quem recusar ou retirar o consentimento não entram na análise.',
      'Você pode ler este termo a qualquer momento no link "Termo de consentimento" da plataforma e pedir uma cópia aos pesquisadores.',
    ],
  },
  {
    titulo: 'Contato',
    paragrafos: [
      'Dúvidas sobre a pesquisa podem ser enviadas aos pesquisadores pelo suporte da plataforma (botão de ajuda).',
    ],
  },
]

export type Consentimento = {
  versao: string
  aceita_termos: boolean
  participa_pesquisa: boolean
  respondido_em: string
}

const CACHE_KEY = 'athenas_consentimento_v1'

function lerCache(userId: string): Consentimento | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { userId: string; dados: Consentimento }
    return parsed.userId === userId ? parsed.dados : null
  } catch {
    return null
  }
}

function gravarCache(userId: string, dados: Consentimento) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, dados }))
  } catch {
    /* modo privado — só busca de novo */
  }
}

/** Já respondeu a versão atual do termo? Usa o cache para não piscar a tela. */
export function consentimentoEmCache(userId: string): Consentimento | null {
  const c = lerCache(userId)
  return c && c.versao === VERSAO_TERMO ? c : null
}

/**
 * Busca o registro do aluno. `indisponivel` = tabela ainda não criada
 * (termo-consentimento.sql não rodou): nesse caso o site não trava.
 */
export async function buscarConsentimento(
  userId: string
): Promise<{ dados: Consentimento | null; indisponivel: boolean }> {
  const { data, error } = await supabase
    .from('consentimentos')
    .select('versao, aceita_termos, participa_pesquisa, respondido_em')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[ATHENAS] consentimentos indisponível — rode supabase/termo-consentimento.sql', error.message)
    return { dados: null, indisponivel: true }
  }

  const dados = (data as Consentimento | null) ?? null
  if (dados) gravarCache(userId, dados)
  return { dados, indisponivel: false }
}

export async function salvarConsentimento(
  userId: string,
  participaPesquisa: boolean
): Promise<{ dados: Consentimento | null; error: string | null }> {
  const dados: Consentimento = {
    versao: VERSAO_TERMO,
    aceita_termos: true,
    participa_pesquisa: participaPesquisa,
    respondido_em: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('consentimentos')
    .upsert({ user_id: userId, ...dados }, { onConflict: 'user_id' })

  if (error) return { dados: null, error: error.message }
  gravarCache(userId, dados)
  return { dados, error: null }
}
