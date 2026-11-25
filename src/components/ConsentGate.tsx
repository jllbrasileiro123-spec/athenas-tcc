import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  buscarConsentimento,
  consentimentoEmCache,
  salvarConsentimento,
  TITULO_TERMO,
  VERSAO_TERMO,
} from '../lib/consentimento'
import { BrandSplash } from './BrandSplash'
import { TermoTexto } from './TermoTexto'

/** Páginas que precisam abrir mesmo antes do aceite, para o aluno ler o que vai aceitar. */
const LIVRES = ['/termos', '/privacidade']

type Estado = 'carregando' | 'pendente' | 'ok'

/**
 * Antes de usar a plataforma, o aluno aceita os Termos de Uso e decide se
 * participa da pesquisa do TCC. Recusar a pesquisa não bloqueia nada.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  const [estado, setEstado] = useState<Estado>(() =>
    user && consentimentoEmCache(user.id) ? 'ok' : 'carregando'
  )

  useEffect(() => {
    if (!user) return
    let cancelado = false
    void buscarConsentimento(user.id).then(({ dados, indisponivel }) => {
      if (cancelado) return
      // Sem a tabela no banco o site não pode travar: segue sem pedir o aceite
      if (indisponivel) setEstado('ok')
      else setEstado(dados?.versao === VERSAO_TERMO && dados.aceita_termos ? 'ok' : 'pendente')
    })
    return () => {
      cancelado = true
    }
  }, [user])

  if (estado === 'ok' || LIVRES.includes(location.pathname)) return <>{children}</>
  if (estado === 'carregando') return <BrandSplash fullScreen />
  return <TelaAceite onAceito={() => setEstado('ok')} />
}

function TelaAceite({ onAceito }: { onAceito: () => void }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [leu, setLeu] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function responder(participa: boolean) {
    if (!user || !leu) return
    setSalvando(true)
    setErro(null)
    const { error } = await salvarConsentimento(user.id, participa)
    setSalvando(false)
    if (error) {
      setErro('Não foi possível salvar sua resposta. Tente de novo.')
      return
    }
    onAceito()
  }

  return (
    <div className="page-shell min-h-dvh">
      <div className="container-athenas py-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">Antes de começar</p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{TITULO_TERMO}</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Leia o termo abaixo. Ele explica como a plataforma usa seus dados na pesquisa do TCC.
        </p>

        <div className="mt-6 max-h-[50vh] overflow-y-auto scroll-thin bg-white border border-brand-gold/20 rounded-2xl p-5 shadow-sm">
          <TermoTexto />
        </div>

        <label className="mt-5 flex items-start gap-3 text-sm text-neutral-800 cursor-pointer">
          <input
            type="checkbox"
            checked={leu}
            onChange={(e) => setLeu(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#c9a227] shrink-0"
          />
          <span>
            Li e concordo com os{' '}
            <Link to="/termos" target="_blank" className="link-athenas">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link to="/privacidade" target="_blank" className="link-athenas">
              Política de Privacidade
            </Link>{' '}
            da plataforma.
          </span>
        </label>

        {erro && <p className="alert-error mt-4">{erro}</p>}

        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!leu || salvando}
            onClick={() => void responder(true)}
            className="btn-primary w-full !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aceito participar da pesquisa
          </button>
          <button
            type="button"
            disabled={!leu || salvando}
            onClick={() => void responder(false)}
            className="btn-secondary w-full !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Usar sem participar da pesquisa
          </button>
        </div>

        <p className="mt-3 text-xs text-neutral-500">
          As duas opções dão acesso completo à plataforma. Você pode mudar sua decisão depois em{' '}
          <Link to="/termo-de-consentimento" className="link-athenas">
            Termo de consentimento
          </Link>
          .
        </p>

        <button
          type="button"
          onClick={() => void signOut().finally(() => navigate('/', { replace: true }))}
          className="mt-6 text-xs text-neutral-500 underline hover:text-neutral-800"
        >
          Não concordo com os termos — sair da conta
        </button>
      </div>
    </div>
  )
}
