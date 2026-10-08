import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BrandMark } from '../components/BrandMark'
import { AthenaMark } from '../components/AthenaMark'

const base = import.meta.env.BASE_URL

/* ------------------------------------------------------------------ */
/* Conteúdo                                                            */
/* ------------------------------------------------------------------ */

const NAV = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#recursos', label: 'Recursos' },
  { href: '#conteudo', label: 'Conteúdo' },
  { href: '#escritorios', label: 'Para escritórios' },
  { href: '#faq', label: 'FAQ' },
]

const NORMS = [
  'Recomendação OAB nº 001/2024',
  'Resolução CNJ nº 615/2025',
  'LGPD · Lei 13.709/2018',
  'PL 2.338/2023',
]

const STEPS = [
  {
    n: '01',
    title: 'Nivelamento',
    body: 'Um teste rápido mede o que você já sabe e libera os módulos que você já domina. Ninguém perde tempo com o básico.',
  },
  {
    n: '02',
    title: 'Trilha em módulos',
    body: 'Vídeo, podcast e material de apoio em cada módulo. O próximo só abre quando o anterior está concluído.',
  },
  {
    n: '03',
    title: 'Quiz com gabarito comentado',
    body: '10 perguntas por módulo e 70% para avançar. Ao passar, cada resposta vem explicada.',
  },
  {
    n: '04',
    title: 'Certificado verificável',
    body: 'Certificado em imagem com seu nome completo e código único que qualquer pessoa confere online.',
  },
]

const MODULES = [
  {
    title: 'Fundamentos de IA e o Cenário Jurídico Brasileiro',
    topics: ['IA, Machine Learning, Deep Learning e LLM', 'Alucinações e vieses', 'OAB 001/2024, CNJ 615/2025 e LGPD'],
  },
  {
    title: 'Ferramentas Práticas para o Cotidiano Forense',
    topics: ['Pesquisa jurisprudencial', 'Redação assistida', 'Análise de contratos', 'Organização documental'],
  },
  {
    title: 'Ética, Boas Práticas e Responsabilidade Profissional',
    topics: ['Verificação de outputs', 'Responsabilidade', 'Proteção de dados', 'Prompts eficazes'],
  },
  {
    title: 'Aplicação Supervisionada e Avaliação Final',
    topics: ['Simulações de petição, contrato e pesquisa', 'Revisão crítica', 'Avaliação final'],
  },
]

const FAQ = [
  {
    q: 'Preciso saber programar ou entender de tecnologia?',
    a: 'Não. O curso foi feito para advogados. Os conceitos técnicos são explicados com exemplos do dia a dia do escritório, sem código.',
  },
  {
    q: 'Quanto custa?',
    a: 'O cadastro é gratuito e você começa a trilha na hora, direto do navegador ou instalando o app no celular.',
  },
  {
    q: 'O certificado tem validade?',
    a: 'Cada certificado tem um código único. Qualquer pessoa confere a autenticidade na página de verificação, sem precisar de login.',
  },
  {
    q: 'Posso usar a IA para peças e pareceres depois do curso?',
    a: 'O curso ensina justamente o uso responsável: onde a IA ajuda, onde ela erra e o que as normas da OAB e do CNJ exigem de supervisão humana.',
  },
  {
    q: 'Meu escritório consegue acompanhar a equipe?',
    a: 'Sim. A conta administradora vê o desempenho de cada advogado em todos os quizzes, a nota final, os certificados emitidos e o feedback da turma.',
  },
]

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export function Landing({ alwaysShow = false }: { alwaysShow?: boolean }) {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Quem já está logado (ex.: abriu o app instalado) vai direto para a plataforma
  if (user && !alwaysShow) return <Navigate to="/explorar" replace />

  const primaryCta = user
    ? { to: '/explorar', label: 'Ir para a plataforma' }
    : { to: '/cadastro', label: 'Começar grátis' }

  return (
    <div className="landing min-h-screen bg-brand-cream text-neutral-900 antialiased selection:bg-brand-gold-soft selection:text-neutral-950">
      {/* ---------------- Header ---------------- */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled || menuOpen
            ? 'bg-brand-cream/85 backdrop-blur-xl border-b border-brand-gold/20'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMenuOpen(false)}>
            <BrandMark framed className="h-9 w-9" alt="" />
            <span className="text-sm font-bold tracking-[0.3em]">ATHENAS</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-sm text-neutral-600">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 transition-colors hover:text-neutral-900"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {!user && (
              <Link
                to="/login"
                className="hidden sm:inline-flex rounded-full px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:text-neutral-900"
              >
                Entrar
              </Link>
            )}
            <Link to={primaryCta.to} className="landing-btn-primary !py-2 !px-4 text-sm whitespace-nowrap">
              {primaryCta.label}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-neutral-800"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                {menuOpen ? (
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="lg:hidden border-t border-brand-gold/20 px-4 pb-5 pt-2">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-base text-neutral-700 hover:bg-brand-gold-soft/40 hover:text-neutral-900"
              >
                {item.label}
              </a>
            ))}
            {!user && (
              <Link
                to="/login"
                className="mt-2 block rounded-xl px-3 py-3 text-base font-semibold text-[#8a6a12] hover:bg-brand-gold-soft/40"
              >
                Entrar
              </Link>
            )}
          </nav>
        )}
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 lg:pb-28">
        <div className="landing-grid absolute inset-0" aria-hidden />
        <div className="landing-glow absolute left-1/2 top-24 -translate-x-1/2" aria-hidden />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
          <div className="landing-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold-soft/50 px-3 py-1 text-xs font-semibold text-[#8a6a12]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-gold opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-gold" />
              </span>
              IA no cotidiano jurídico
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              A advocacia que usa IA{' '}
              <span className="landing-text-gold">com responsabilidade</span> começa aqui.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">
              Uma trilha prática para advogados entenderem o que a inteligência artificial faz, onde ela
              erra e como usá-la no escritório dentro das regras da OAB, do CNJ e da LGPD.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to={primaryCta.to} className="landing-btn-primary group">
                {primaryCta.label}
                <Arrow />
              </Link>
              <a href="#como-funciona" className="landing-btn-ghost">
                Ver como funciona
              </a>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500">
              {['Cadastro gratuito', 'Sem precisar programar', 'Certificado verificável'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroMockup />
        </div>
      </section>

      {/* ---------------- Faixa de normas ---------------- */}
      <section className="border-y border-brand-gold/20 bg-white/60 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
            Conteúdo alinhado às normas que regem a IA no Direito brasileiro
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {NORMS.map((n) => (
              <span
                key={n}
                className="rounded-full border border-brand-gold/20 bg-white px-4 py-2 text-sm font-medium text-neutral-700"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Problema ---------------- */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <Eyebrow>O desafio</Eyebrow>
            <h2 className="landing-h2">
              A IA já chegou ao escritório. <span className="text-neutral-500">O preparo, ainda não.</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-neutral-600">
              Ferramentas como ChatGPT, Claude e Gemini escrevem com segurança mesmo quando inventam
              jurisprudência. Sem entender como elas funcionam, o advogado assume um risco que é
              dele, não da máquina.
            </p>
          </Reveal>
          <Reveal className="grid gap-4 sm:grid-cols-2" delay={120}>
            <RiskCard
              title="Alucinações"
              body="O modelo prevê a palavra mais provável, não a verdade. Uma citação falsa vem com a mesma confiança de uma correta."
            />
            <RiskCard
              title="Sigilo e LGPD"
              body="Colar dados de cliente em uma ferramenta aberta pode expor informações protegidas."
            />
            <RiskCard
              title="Atos privativos"
              body="A OAB veda delegar à IA atos da profissão sem supervisão qualificada."
            />
            <RiskCard
              title="Contexto brasileiro"
              body="Ferramentas generalistas não conhecem a jurisprudência local e erram em questões do nosso Direito."
            />
          </Reveal>
        </div>
      </Section>

      {/* ---------------- Como funciona ---------------- */}
      <Section id="como-funciona" className="bg-white/60 border-y border-brand-gold/20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Como funciona</Eyebrow>
          <h2 className="landing-h2">Do primeiro conceito ao certificado, em uma trilha guiada.</h2>
        </Reveal>
        <div className="mt-14 grid overflow-hidden rounded-3xl border border-brand-gold/20 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 90} className="group relative border-brand-gold/20 bg-white p-7 transition-colors hover:bg-brand-cream max-lg:border-b max-lg:last:border-b-0 md:max-lg:odd:border-r md:max-lg:[&:nth-child(3)]:border-b-0 lg:border-r lg:last:border-r-0">
              <span className="font-mono text-sm text-[#8a6a12]">{step.n}</span>
              <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">{step.body}</p>
              <span className="absolute inset-x-7 bottom-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-brand-gold to-transparent transition-transform duration-500 group-hover:scale-x-100" />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---------------- Recursos (bento) ---------------- */}
      <Section id="recursos">
        <Reveal className="max-w-2xl">
          <Eyebrow>Recursos</Eyebrow>
          <h2 className="landing-h2">Feito para quem aprende entre uma audiência e outra.</h2>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-6">
          <Reveal className="landing-card md:col-span-4 md:row-span-2 flex flex-col">
            <div className="flex items-center gap-3">
              <AthenaMark framed variant="header" className="h-12 w-12" alt="" />
              <div>
                <h3 className="text-xl font-semibold">Athena, sua assistente</h3>
                <p className="text-sm text-neutral-600">Tira dúvidas da aula a qualquer hora.</p>
              </div>
            </div>
            <div className="mt-8 space-y-3 text-sm">
              <ChatBubble from="user">Posso usar o ChatGPT para pesquisar jurisprudência?</ChatBubble>
              <ChatBubble from="athena">
                Pode usar como ponto de partida, mas sempre confira cada decisão na fonte oficial. LLMs
                podem citar acórdãos que não existem, e a responsabilidade pela peça continua sendo sua.
              </ChatBubble>
            </div>
            <p className="mt-auto pt-8 text-sm text-neutral-500">
              E quando a dúvida é mais específica, ela vai direto para o instrutor dentro da aula.
            </p>
          </Reveal>

          <Reveal delay={80} className="landing-card md:col-span-2">
            <div className="flex items-center gap-2">
              <img src={`${base}icons/streak-flame.png`} alt="" className="h-9 w-9" />
              <img src={`${base}icons/coin-a.png`} alt="" className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">Gamificação</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              XP por aula, sequência de dias estudando e moedas para proteger a sequência.
            </p>
          </Reveal>

          <Reveal delay={140} className="landing-card md:col-span-2">
            <IconBox>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </IconBox>
            <h3 className="mt-5 text-lg font-semibold">Vídeo, podcast e material</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Assista no escritório, ouça no trânsito, revise pelo material de apoio.
            </p>
          </Reveal>

          <Reveal delay={60} className="landing-card md:col-span-3">
            <IconBox>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </IconBox>
            <h3 className="mt-5 text-lg font-semibold">App no celular</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Instale direto do navegador, sem loja de aplicativos. Seu progresso acompanha você.
            </p>
          </Reveal>

          <Reveal delay={120} className="landing-card md:col-span-3">
            <IconBox>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </IconBox>
            <h3 className="mt-5 text-lg font-semibold">Certificado com código</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Baixe em imagem, compartilhe no LinkedIn e deixe qualquer pessoa conferir a autenticidade.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ---------------- Conteúdo ---------------- */}
      <Section id="conteudo" className="bg-white/60 border-y border-brand-gold/20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal>
            <Eyebrow>Conteúdo</Eyebrow>
            <h2 className="landing-h2">Quatro módulos, do conceito à prática supervisionada.</h2>
            <p className="mt-5 text-lg leading-relaxed text-neutral-600">
              Começa pelo que a IA realmente é, passa pelas ferramentas do dia a dia forense e pela ética
              profissional, e termina com simulações de casos reais e uma avaliação final.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <Pill>4 módulos</Pill>
              <Pill>Vídeo-aulas</Pill>
              <Pill>Material de apoio</Pill>
              <Pill>Avaliação final</Pill>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <ol className="landing-card divide-y divide-brand-gold/15 !p-0">
              {MODULES.map((mod, i) => (
                <li key={mod.title} className="flex gap-4 px-6 py-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 font-mono text-xs font-bold text-brand-gold">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="font-semibold text-neutral-900">{mod.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-600">{mod.topics.join(' · ')}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </Section>

      {/* ---------------- Escritórios ---------------- */}
      <Section id="escritorios">
        <div className="relative overflow-hidden rounded-[2rem] border border-brand-gold/20 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-950 p-8 text-white shadow-xl shadow-black/10 sm:p-12 lg:p-16">
          <div className="landing-glow-sm absolute -right-20 -top-20" aria-hidden />
          <div className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <Eyebrow dark>Para escritórios</Eyebrow>
              <h2 className="landing-h2">Saiba quem da equipe está pronto para usar IA.</h2>
              <p className="mt-5 text-lg leading-relaxed text-neutral-400">
                O painel do administrador mostra o desempenho de cada advogado em todos os quizzes, a
                nota final, quem já tem certificado e o que a turma achou do curso. Exporta tudo para
                planilha.
              </p>
              <ul className="mt-8 space-y-3 text-neutral-300">
                {[
                  'Acertos por quiz e número de tentativas',
                  'Desempenho final e média da turma',
                  'Feedback e avaliação do curso',
                  'Acesso restrito à conta administradora',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <Check dark />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120}>
              <ReportMockup />
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section id="faq" className="bg-white/60 border-y border-brand-gold/20">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <Eyebrow>Perguntas frequentes</Eyebrow>
            <h2 className="landing-h2">Ficou alguma dúvida?</h2>
            <p className="mt-5 text-neutral-600">
              Depois de entrar, a Athena e o instrutor respondem dentro de cada aula.
            </p>
          </Reveal>
          <Reveal delay={80} className="divide-y divide-brand-gold/15 border-y border-brand-gold/20">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-medium text-neutral-900 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-[#8a6a12] transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 pr-12 leading-relaxed text-neutral-600">{item.a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </Section>

      {/* ---------------- CTA final ---------------- */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="landing-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="landing-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
        <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <BrandMark framed className="mx-auto h-16 w-16" alt="" />
          <h2 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl">
            Use a IA a seu favor, <span className="landing-text-gold">sem abrir mão da ética.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-600">
            Crie sua conta gratuita e comece o Módulo 1 agora.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={primaryCta.to} className="landing-btn-primary group">
              {primaryCta.label}
              <Arrow />
            </Link>
            <Link to="/verificar" className="landing-btn-ghost">
              Verificar um certificado
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-brand-gold/20 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 text-sm text-neutral-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark framed className="h-7 w-7" alt="" />
            <span className="font-bold tracking-[0.3em] text-neutral-700">ATHENAS</span>
            <span className="hidden sm:inline">· IA no cotidiano jurídico</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to="/login" className="hover:text-neutral-900">Entrar</Link>
            <Link to="/cadastro" className="hover:text-neutral-900">Criar conta</Link>
            <Link to="/verificar" className="hover:text-neutral-900">Verificar certificado</Link>
          </nav>
          <p>© {new Date().getFullYear()} ATHENAS</p>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mockups                                                             */
/* ------------------------------------------------------------------ */

function HeroMockup() {
  return (
    <div className="landing-fade-up relative mx-auto w-full max-w-lg [animation-delay:150ms] lg:max-w-none">
      <div className="landing-mock relative rounded-3xl border border-brand-gold/20 bg-white p-5 shadow-2xl shadow-black/10 backdrop-blur sm:p-6">
        {/* barra do "app" */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark framed className="h-7 w-7" alt="" />
            <span className="text-xs font-bold tracking-[0.25em] text-neutral-700">ATHENAS</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-orange-600">
              <img src={`${base}icons/streak-flame.png`} alt="" className="h-4 w-4" />7
            </span>
            <span className="flex items-center gap-1 text-[#8a6a12]">
              <img src={`${base}icons/coin-a.png`} alt="" className="h-4 w-4" />120
            </span>
          </div>
        </div>

        {/* módulo */}
        <div className="mt-5 rounded-2xl border border-brand-gold/20 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Módulo 1</p>
          <p className="mt-1 font-semibold leading-snug">Fundamentos de IA e o Cenário Jurídico Brasileiro</p>
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-600">
            <span>Progresso</span>
            <span className="text-[#8a6a12]">75%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-gold-soft/60">
            <div className="landing-bar h-full rounded-full bg-gradient-to-r from-brand-gold/70 to-brand-gold" />
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <MockItem done>Vídeo-aula</MockItem>
            <MockItem done>Material de apoio</MockItem>
            <MockItem done>Podcast</MockItem>
            <MockItem>Quiz — 10 questões</MockItem>
          </ul>
        </div>

        {/* quiz */}
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-700">Aprovado · 9/10 acertos</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600">
            Alucinação é quando o modelo produz uma informação falsa com total aparência de verdade.
          </p>
        </div>
      </div>

      {/* cartões flutuantes */}
      <div className="landing-float absolute left-[40%] -top-8 hidden rounded-2xl border border-brand-gold/20 bg-white px-4 py-3 shadow-xl backdrop-blur sm:block">
        <p className="text-[10px] uppercase tracking-widest text-neutral-500">XP ganho</p>
        <p className="text-lg font-bold text-[#8a6a12]">+15 XP</p>
      </div>
      <div className="landing-float-slow absolute -bottom-8 -right-3 hidden w-56 rounded-2xl border border-brand-gold/30 bg-brand-cream p-4 text-neutral-900 shadow-2xl sm:block">
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#8a6a12]">Certificado</p>
        <p className="mt-1 font-serif text-base font-bold leading-tight">Maria F. de Souza</p>
        <p className="mt-1 text-[11px] text-neutral-500">IA no Cotidiano Jurídico</p>
        <p className="mt-2 font-mono text-[11px] font-bold tracking-wider">ATH-7F3A-91C2</p>
      </div>
    </div>
  )
}

function ReportMockup() {
  const rows = [
    { name: 'Ana Ribeiro', q: [90, 80], final: 85 },
    { name: 'Bruno Lima', q: [70, 90], final: 80 },
    { name: 'Carla Mendes', q: [100, 60], final: 80 },
    { name: 'Diego Prado', q: [60, null], final: 30 },
  ]
  const tone = (n: number | null) =>
    n === null ? 'text-neutral-600' : n >= 70 ? 'text-emerald-300' : n >= 50 ? 'text-amber-300' : 'text-red-300'
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950/80 p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Relatório da turma</p>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-neutral-400">
          Exportar CSV
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Matriculados" value="12" />
        <MiniStat label="Concluíram" value="8" />
        <MiniStat label="Média final" value="78%" gold />
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Advogado</th>
              <th className="px-3 py-2 font-semibold">Quiz 1</th>
              <th className="px-3 py-2 font-semibold">Quiz 2</th>
              <th className="px-3 py-2 font-semibold">Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-3 py-2.5 text-neutral-200">{r.name}</td>
                {r.q.map((v, i) => (
                  <td key={i} className={`px-3 py-2.5 font-semibold ${tone(v)}`}>
                    {v === null ? '—' : `${v}%`}
                  </td>
                ))}
                <td className={`px-3 py-2.5 font-bold ${tone(r.final)}`}>{r.final}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-neutral-600">Dados ilustrativos.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

/** Revela o bloco quando entra na tela (respeita "reduzir movimento" via CSS). */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`landing-reveal ${visible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

function Section({ id, className = '', children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-16 py-20 sm:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
    </section>
  )
}

function Eyebrow({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`mb-4 font-mono text-xs font-semibold uppercase tracking-[0.25em] ${dark ? 'text-brand-gold' : 'text-[#8a6a12]'}`}>
      {children}
    </p>
  )
}

function RiskCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="landing-card">
      <span className="inline-block h-1.5 w-8 rounded-full bg-brand-gold" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{body}</p>
    </div>
  )
}

function ChatBubble({ from, children }: { from: 'user' | 'athena'; children: ReactNode }) {
  return from === 'user' ? (
    <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand-gold-soft/60 px-4 py-3 text-neutral-900">
      {children}
    </div>
  ) : (
    <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-brand-gold/25 bg-brand-gold-soft/50 px-4 py-3 leading-relaxed text-neutral-800">
      {children}
    </div>
  )
}

function MockItem({ done, children }: { done?: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
          done ? 'bg-brand-gold text-neutral-950' : 'border border-neutral-300 text-neutral-500'
        }`}
      >
        {done ? '✓' : ''}
      </span>
      <span className={done ? 'text-neutral-700' : 'text-neutral-900 font-medium'}>{children}</span>
    </li>
  )
}

function MiniStat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3">
      <p className={`text-lg font-bold ${gold ? 'text-brand-gold' : 'text-white'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
    </div>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-brand-gold/20 bg-white px-3.5 py-1.5 text-neutral-700">
      {children}
    </span>
  )
}

function IconBox({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-gold/30 bg-brand-gold-soft/50 text-[#8a6a12]">
      {children}
    </span>
  )
}

function Check({ dark }: { dark?: boolean }) {
  return (
    <svg className={`h-4 w-4 shrink-0 ${dark ? 'text-brand-gold' : 'text-[#8a6a12]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function Arrow() {
  return (
    <svg
      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5M21 12H3" />
    </svg>
  )
}
