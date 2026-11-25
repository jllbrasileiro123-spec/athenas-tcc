import { CONTATO_PESQUISA, SECOES_TERMO } from '../lib/consentimento'

/** Corpo do TCLE, usado na tela de aceite e na página pública do termo. */
export function TermoTexto() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-neutral-700">
      {SECOES_TERMO.map((secao) => (
        <section key={secao.titulo}>
          <h2 className="font-bold text-neutral-900 mb-1.5">{secao.titulo}</h2>
          <div className="space-y-2">
            {secao.paragrafos.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
      ))}
      {CONTATO_PESQUISA ? (
        <p>
          E-mail:{' '}
          <a href={`mailto:${CONTATO_PESQUISA}`} className="link-athenas">
            {CONTATO_PESQUISA}
          </a>
        </p>
      ) : null}
    </div>
  )
}
