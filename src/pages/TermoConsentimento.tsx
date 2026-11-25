import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { TermoTexto } from '../components/TermoTexto'
import {
  buscarConsentimento,
  salvarConsentimento,
  TITULO_TERMO,
  VERSAO_TERMO,
  type Consentimento,
} from '../lib/consentimento'

/**
 * Página pública do TCLE: qualquer pessoa (inclusive a banca) lê o termo sem
 * login. Logado, o aluno vê a própria decisão e pode retirá-la ou dá-la.
 */
export function TermoConsentimento() {
  const { user } = useAuth()
  const [registro, setRegistro] = useState<Consentimento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    void buscarConsentimento(user.id).then(({ dados }) => setRegistro(dados))
  }, [user])

  async function mudar(participa: boolean) {
    if (!user) return
    setSalvando(true)
    setErro(null)
    const { dados, error } = await salvarConsentimento(user.id, participa)
    setSalvando(false)
    if (error) setErro('Não foi possível salvar. Tente de novo.')
    else setRegistro(dados)
  }

  return (
    <div className="page-shell min-h-dvh">
      <div className="container-athenas py-10 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">
          Pesquisa ATHENAS · versão {VERSAO_TERMO}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">{TITULO_TERMO}</h1>

        <div className="bg-white border border-brand-gold/20 rounded-2xl p-6 shadow-sm">
          <TermoTexto />
        </div>

        {user && registro && (
          <div className="mt-6 bg-white border border-brand-gold/20 rounded-2xl p-5 space-y-3">
            <p className="text-sm text-neutral-800">
              Sua resposta em {new Date(registro.respondido_em).toLocaleDateString('pt-BR')}:{' '}
              <strong>
                {registro.participa_pesquisa ? 'você participa da pesquisa.' : 'você não participa da pesquisa.'}
              </strong>
            </p>
            {erro && <p className="alert-error">{erro}</p>}
            <button
              type="button"
              disabled={salvando}
              onClick={() => void mudar(!registro.participa_pesquisa)}
              className="btn-secondary !py-2 disabled:opacity-50"
            >
              {registro.participa_pesquisa ? 'Retirar meu consentimento' : 'Quero participar da pesquisa'}
            </button>
          </div>
        )}

        <Link to={user ? '/explorar' : '/'} className="link-athenas inline-block mt-6 text-sm">
          ← Voltar
        </Link>
      </div>
    </div>
  )
}
