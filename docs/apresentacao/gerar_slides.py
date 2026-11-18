"""Slides da defesa (estilo editorial, cores do ATHENAS) -> HTML -> PDF."""
import os, sys

OUT = os.path.dirname(os.path.abspath(__file__))
LOGO = os.environ.get("LOGO")  # caminho de um PNG da UNIPÊ, se houver
TOTAL = 20
AUTH = "João Lucas Luna Brasileiro &amp; Gilverson Rodrigues da Silva"

CSS = """
:root{--bg:#F1F0EE;--ink:#141311;--muted:#6B6760;--line:#D9D6D0;--gold:#8A6A24;--gold2:#C9A24D;--card:#FFFFFF;--dark:#141311}
*{box-sizing:border-box;margin:0;padding:0}
@page{size:1920px 1080px;margin:0}
body{font-family:'Inter',Arial,sans-serif;color:var(--ink);background:#999}
section{width:1920px;height:1080px;background:var(--bg);position:relative;overflow:hidden;page-break-after:always;padding:0 96px}
.top{position:absolute;left:96px;right:96px;top:44px;display:grid;grid-template-columns:1fr auto 1fr;font-size:17px;letter-spacing:3px;text-transform:uppercase;color:var(--muted)}
.top .c{text-align:center}.top .r{text-align:right}
.foot{position:absolute;left:96px;right:96px;bottom:40px;display:flex;justify-content:space-between;font-size:17px;color:var(--muted)}
.foot b{color:var(--ink);font-weight:700}
.kick{position:absolute;left:96px;top:136px;font-size:18px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:var(--gold)}
h2{position:absolute;left:96px;top:172px;font-size:64px;font-weight:300;letter-spacing:-1.5px;line-height:1.08;width:1500px}
h2 b,.big b{font-weight:800}
.src{position:absolute;left:96px;bottom:92px;font-size:17px;color:var(--muted)}
.card{background:var(--card);border-radius:22px;box-shadow:0 10px 30px rgba(20,19,17,.07)}
.num{font-weight:300;color:var(--gold);letter-spacing:-1px}
.list{display:flex;flex-direction:column}
.list .row{display:grid;grid-template-columns:72px 1fr;gap:20px;border-top:1.5px solid var(--line);padding:22px 0;align-items:baseline}
.list .row:last-child{border-bottom:1.5px solid var(--line)}
.list .row .num{font-size:24px}
.list .row p{font-size:27px;font-weight:600;line-height:1.3}
.list .row span{display:block;font-size:22px;font-weight:400;color:var(--muted);margin-top:6px}
.shot{border-radius:18px;box-shadow:0 18px 50px rgba(20,19,17,.16);object-fit:cover;object-position:top left;background:#fff}
.chip{display:inline-block;background:var(--card);border-radius:999px;padding:12px 24px;font-size:20px;font-weight:600;box-shadow:0 6px 18px rgba(20,19,17,.06)}
.chip.on{background:var(--ink);color:#F1F0EE}
.cap{font-size:18px;color:var(--muted);margin-top:14px}
.badge{display:inline-flex;align-items:center;gap:10px;background:var(--ink);color:#F1F0EE;border-radius:12px;padding:12px 20px;font-size:20px;font-weight:800;letter-spacing:2px}
.badge i{width:14px;height:14px;border-radius:50%;background:var(--gold2);display:inline-block}
"""

def page(n, section, body, src="", head=True):
    top = f"""<div class="top"><span>ATHENAS · IA no Direito</span><span class="c">{section}</span><span class="r">TCC · 2026</span></div>""" if head else ""
    foot = f"""<div class="foot"><span>{AUTH}</span><span><b>{n:02d}</b> / {TOTAL}</span></div>""" if head else ""
    s = f'<div class="src">{src}</div>' if src else ""
    return f"<section>{top}{body}{s}{foot}</section>"

def kh(kick, title):
    return f'<div class="kick">{kick}</div><h2>{title}</h2>'

def badge():
    if LOGO:
        return f'<img src="{LOGO}" style="height:64px">'
    return '<span class="badge"><i></i>UNIPÊ</span>'

S = []
I = "01 · Introdução"; M = "02 · Método"; P = "03 · Plataforma"; R = "04 · Resultados"; F = "05 · Considerações finais"

# 1 Capa
S.append(f"""<section>
<div style="position:absolute;left:96px;right:96px;top:44px;display:flex;justify-content:space-between;align-items:center;font-size:17px;letter-spacing:3px;color:var(--muted);text-transform:uppercase">
{badge()}<span>Trabalho de Conclusão de Curso</span><span>Ciência da Computação · 2026</span></div>
<div style="position:absolute;left:90px;top:190px;font-size:180px;font-weight:200;letter-spacing:-7px;line-height:.95">IA NO</div>
<div style="position:absolute;left:250px;top:365px;font-size:190px;font-weight:900;letter-spacing:-8px;line-height:.95">DIREITO</div>
<img class="shot" src="image3.png" style="position:absolute;right:96px;top:170px;width:640px;height:389px;transform:rotate(2deg)">
<div class="card" style="position:absolute;right:520px;top:520px;padding:22px 28px;width:330px">
<p style="font-size:20px;font-weight:700;color:var(--gold)">Plataforma ATHENAS</p>
<p style="font-size:18px;color:var(--muted);margin-top:6px;line-height:1.35">Capacitação gratuita, ética e LGPD na prática</p></div>
<div style="position:absolute;left:96px;bottom:110px;width:760px;font-size:24px;line-height:1.4">
<b>Capacitação no uso de Inteligência Artificial no cotidiano jurídico:</b><br>desenvolvimento da plataforma ATHENAS</div>
<div style="position:absolute;right:96px;bottom:110px;text-align:right;font-size:22px;line-height:1.45">
<b>João Lucas Luna Brasileiro</b><br><b>Gilverson Rodrigues da Silva</b><br>
<span style="color:var(--muted)">Orientador: Prof. José Raul de Brito Andrade</span></div>
</section>""")

# 2 Problema
S.append(page(2, I, kh("Introdução", "A IA já chegou à advocacia; <b>o preparo, ainda não</b>") + """
<div class="list" style="position:absolute;left:96px;top:380px;width:880px">
<div class="row"><span class="num">01</span><p>Mais de 55% dos advogados usam IA de forma diária ou semanal<span>Pesquisa, redação de peças e análise de contratos</span></p></div>
<div class="row"><span class="num">02</span><p>LLMs preveem a palavra mais provável, não consultam fatos<span>Por isso podem “alucinar”: texto plausível, mas falso</span></p></div>
<div class="row"><span class="num">03</span><p>Tribunais já aplicam multas por jurisprudência inventada<span>E oficiam a OAB e o Ministério Público</span></p></div>
</div>
<div class="card" style="position:absolute;left:1100px;top:380px;width:724px;padding:56px 56px 48px">
<p style="font-size:18px;font-weight:700;letter-spacing:3px;color:var(--gold)">MARÇO DE 2026 · TST</p>
<p style="font-family:Georgia,serif;font-style:italic;font-size:38px;line-height:1.3;margin-top:24px">A 6ª Turma condenou uma empresa e seu advogado por citarem <b>precedentes inexistentes</b>, atribuídos a ministros da própria Corte.</p>
<p style="font-size:18px;color:var(--muted);margin-top:28px">Migalhas (2026)</p></div>
""", "Preâmbulo Tech (2026); Ji et al. (2023); Conjur (2026); Migalhas (2026)."))

# 3 Normas
cards = [("OAB", "Recomendação nº 001/2024", "Diretrizes éticas: legislação, sigilo, prática ética e comunicação ao cliente"),
         ("CNJ", "Resolução nº 615/2025", "IA no Judiciário com supervisão humana, transparência e mitigação de vieses"),
         ("LGPD", "Lei nº 13.709/2018", "Dados de clientes em ferramentas sem garantia de sigilo ficam expostos"),
         ("CPC", "Arts. 77, 80 e 81", "Quem assina a peça responde por ela, mesmo que o erro venha da IA")]
h = "".join(f"""<div class="card" style="padding:40px 36px;height:430px;display:flex;flex-direction:column">
<span class="num" style="font-size:44px">0{i+1}</span>
<p style="font-size:34px;font-weight:800;color:var(--gold);margin-top:22px">{a}</p>
<p style="font-size:22px;font-weight:600;margin-top:6px">{b}</p>
<p style="font-size:22px;color:var(--muted);line-height:1.4;margin-top:20px">{c}</p></div>""" for i, (a, b, c) in enumerate(cards))
S.append(page(3, I, kh("Regulamentação", "Usar IA é permitido, <b>com supervisão humana</b>") +
  f'<div style="position:absolute;left:96px;right:96px;top:380px;display:grid;grid-template-columns:repeat(4,1fr);gap:28px">{h}</div>',
  "OAB (2024); CNJ (2025); Brasil (2015; 2018). O PL nº 2.338/2023 ainda tramita na Câmara."))

# 4 Diagnóstico
st = [("84,6%", "usam o ChatGPT"), ("61,5%", "já receberam informação incorreta da IA"),
      ("38,5%", "não conhecem a Recomendação OAB nº 001/2024"), ("53,8%", "verificam sempre o que a IA gera")]
h = "".join(f"""<div style="border-top:1.5px solid var(--line);padding-top:26px">
<p style="font-size:110px;font-weight:200;letter-spacing:-4px;line-height:1">{a}</p>
<p style="font-size:24px;color:var(--muted);line-height:1.35;margin-top:14px">{b}</p></div>""" for a, b in st)
S.append(page(4, I, kh("Diagnóstico · 13 respondentes · maio de 2026", "O público usa IA, <b>mas conhece pouco as regras</b>") +
  f'<div style="position:absolute;left:96px;right:96px;top:390px;display:grid;grid-template-columns:repeat(4,1fr);gap:40px">{h}</div>' +
  """<div style="position:absolute;left:96px;top:760px;display:flex;gap:16px;align-items:center">
<span style="font-size:22px;color:var(--muted);margin-right:8px">O curso priorizou:</span>
<span class="chip on">Regulamentação</span><span class="chip on">Verificação de resultados</span><span class="chip">Conteúdo curto e assíncrono</span></div>""",
  "Dados da pesquisa (2026). Questionário com 20 perguntas, aplicado em 28 e 29 de maio de 2026."))

# 5 Questão norteadora
S.append(page(5, I, """<div class="kick">Questão norteadora</div>
<div style="position:absolute;left:96px;top:200px;width:1300px;border-top:1.5px solid var(--line);padding-top:36px;display:grid;grid-template-columns:110px 1fr;gap:10px">
<span class="num" style="font-size:64px">01</span>
<p style="font-size:52px;font-weight:300;line-height:1.2;letter-spacing:-1px">Como capacitar profissionais do Direito para usar IA de forma <b>responsável</b>, considerando a <b>pouca disponibilidade de tempo</b>?</p></div>
<div style="position:absolute;right:120px;top:150px;font-size:520px;font-weight:200;color:#E2D5B8;line-height:1">?</div>
<div style="position:absolute;left:96px;right:96px;top:640px">
<p style="font-size:18px;font-weight:700;letter-spacing:4px;color:var(--gold)">JUSTIFICATIVA</p>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:22px">
<div class="card" style="padding:30px 32px"><p style="font-size:26px;font-weight:800">Prática</p><p style="font-size:21px;color:var(--muted);margin-top:8px;line-height:1.4">Jurisprudência inventada já gera multas e sanções</p></div>
<div class="card" style="padding:30px 32px"><p style="font-size:26px;font-weight:800">Profissional</p><p style="font-size:21px;color:var(--muted);margin-top:8px;line-height:1.4">OAB e CNJ permitem a IA, mas exigem supervisão e sigilo</p></div>
<div class="card" style="padding:30px 32px"><p style="font-size:26px;font-weight:800">Acadêmica</p><p style="font-size:21px;color:var(--muted);margin-top:8px;line-height:1.4">Estudos nacionais são teóricos e não propõem formação</p></div>
</div></div>"""))

# 6 Objetivos
ob = [("Diagnosticar", "conhecimento, uso de IA e tempo do público"), ("Selecionar", "conteúdos e ferramentas para o cotidiano forense"),
      ("Elaborar", "a capacitação em módulos progressivos"), ("Desenvolver", "e publicar a plataforma web"), ("Avaliar", "a percepção dos participantes")]
h = "".join(f"""<div class="card" style="padding:36px 30px;height:330px">
<span class="num" style="font-size:44px">0{i+1}</span>
<p style="font-size:30px;font-weight:800;color:var(--gold);margin-top:18px">{a}</p>
<p style="font-size:22px;color:var(--ink);line-height:1.4;margin-top:10px">{b}</p></div>""" for i, (a, b) in enumerate(ob))
S.append(page(6, I, kh("Objetivos", "O que o estudo <b>propõe</b>") + """
<div style="position:absolute;left:96px;top:330px;width:1500px;border-top:1.5px solid var(--line);padding-top:24px;display:grid;grid-template-columns:260px 1fr;gap:20px">
<p style="font-size:18px;font-weight:700;letter-spacing:4px;color:var(--gold);padding-top:8px">OBJETIVO GERAL</p>
<p style="font-size:30px;line-height:1.35">Desenvolver e disponibilizar uma plataforma web de capacitação, a <b>ATHENAS</b>, para o uso responsável de IA por profissionais do Direito.</p></div>""" +
  f'<div style="position:absolute;left:96px;right:96px;top:560px;display:grid;grid-template-columns:repeat(5,1fr);gap:24px">{h}</div>',
  ))

# 7 Método
mc = [("Tipo de pesquisa", "Aplicada, exploratória e descritiva (Gil, 2017)"), ("Abordagem", "Quali-quantitativa, com estatística descritiva (Prodanov e Freitas, 2013)"),
      ("Instrumentos", "Questionário diagnóstico (n = 13) e questionário de percepção com escala Likert (n = 15)"),
      ("Desenvolvimento", "Ciclos curtos inspirados no Scrum, de abril a outubro de 2026")]
h = "".join(f"""<div class="card" style="padding:34px 36px"><p style="font-size:26px;font-weight:800">{a}</p>
<p style="font-size:22px;color:var(--muted);line-height:1.4;margin-top:10px">{b}</p></div>""" for a, b in mc)
steps = ["Diagnóstico", "Conteúdo e ferramentas", "Material didático", "Plataforma", "Aplicação e avaliação"]
sh = "".join(f"""<div style="text-align:left"><div style="width:22px;height:22px;border-radius:50%;background:{'var(--ink)' if i==3 else 'var(--gold2)'};position:relative;z-index:1"></div>
<p class="num" style="font-size:22px;margin-top:16px">Etapa 0{i+1}</p><p style="font-size:22px;font-weight:700;margin-top:4px">{s}</p></div>""" for i, s in enumerate(steps))
S.append(page(7, M, kh("Método", "Desenho <b>do estudo</b>") +
  f'<div style="position:absolute;left:96px;right:96px;top:350px;display:grid;grid-template-columns:1fr 1fr;gap:24px">{h}</div>' +
  f"""<div style="position:absolute;left:96px;right:96px;top:770px"><div style="position:absolute;left:0;right:0;top:10px;height:2px;background:var(--line)"></div>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:20px">{sh}</div></div>""",
  "Elaborado pelos autores (2026)."))

# 8 Trabalhos relacionados
rows = [("Fernandes e Meira (2023)", "Revisão de literatura e de legislação", "Não propõe nem oferece capacitação", False),
        ("Queiroz, Bueno e Lisbino (2024)", "Pesquisa bibliográfica", "Não investiga o público nem oferece formação prática", False),
        ("Este trabalho", "Diagnóstico, desenvolvimento e avaliação com usuários", "Plataforma aberta, aplicada e avaliada", True)]
h = "".join(f"""<div style="display:grid;grid-template-columns:480px 560px 1fr;gap:30px;padding:24px {'28px' if on else '0'};border-top:1.5px solid var(--line);{'background:#fff;border-radius:16px;border-top:none;box-shadow:0 10px 30px rgba(20,19,17,.07);margin-top:8px' if on else ''}">
<p style="font-size:25px;font-weight:{800 if on else 600};{'color:var(--gold)' if on else ''}">{a}</p><p style="font-size:23px;color:var(--muted)">{b}</p><p style="font-size:23px">{c}</p></div>""" for a, b, c, on in rows)
S.append(page(8, M, kh("Trabalhos relacionados", "O que a literatura <b>ainda não faz</b>") +
  f"""<div style="position:absolute;left:96px;right:96px;top:350px">
<div style="display:grid;grid-template-columns:480px 560px 1fr;gap:30px;padding-bottom:12px;font-size:17px;letter-spacing:3px;color:var(--muted);text-transform:uppercase"><span>Trabalho</span><span>Método</span><span>Lacuna</span></div>{h}</div>
<div style="position:absolute;left:96px;top:760px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;width:1700px">
<span style="font-size:22px;color:var(--muted);margin-right:8px">Base teórica do curso:</span>
<span class="chip">Andragogia · Knowles et al. (2009)</span><span class="chip">EaD · Moore e Kearsley (2007)</span>
<span class="chip">Multimídia · Mayer (2009)</span><span class="chip">Gamificação · Deterding et al. (2011)</span></div>""",
  "Elaborado pelos autores (2026)."))

# 9 Módulos
md = [("Fundamentos de IA e o cenário jurídico", "LLMs, alucinações, OAB, CNJ, LGPD e PL 2.338", "Encontre a alucinação"),
      ("Ferramentas práticas para o cotidiano forense", "Pesquisa, redação assistida e contratos, com o Gemini", "Do prompt vago à minuta revisada"),
      ("Ética, boas práticas e responsabilidade", "Responsabilidade, sigilo, dados e anonimização", "Onde o colega errou?"),
      ("Aplicação supervisionada e avaliação final", "Simulações e revisão crítica de resultados", "Revisão crítica de uma minuta")]
h = "".join(f"""<div class="card" style="padding:38px 34px;height:520px;display:flex;flex-direction:column">
<span class="num" style="font-size:52px">0{i+1}</span>
<p style="font-size:28px;font-weight:800;line-height:1.2;margin-top:20px">{a}</p>
<p style="font-size:22px;color:var(--muted);line-height:1.4;margin-top:14px">{b}</p>
<div style="margin-top:auto;border-top:1.5px solid var(--line);padding-top:18px"><p style="font-size:16px;letter-spacing:3px;font-weight:700;color:var(--gold)">EXERCÍCIO</p>
<p style="font-size:21px;margin-top:6px">“{c}”</p></div></div>""" for i, (a, b, c) in enumerate(md))
S.append(page(9, M, kh("A capacitação · 3 horas", "Quatro módulos, <b>do fundamento à prática</b>") +
  f'<div style="position:absolute;left:96px;right:96px;top:350px;display:grid;grid-template-columns:repeat(4,1fr);gap:28px">{h}</div>',
  "Elaborado pelos autores (2026)."))

# 10 Como funciona
S.append(page(10, M, kh("Cada módulo", "Uma trilha <b>curta e prática</b>") + """
<div class="list" style="position:absolute;left:96px;top:360px;width:820px">
<div class="row"><span class="num">01</span><p>Aprender<span>Videoaula de até 15 min, podcast e material de apoio</span></p></div>
<div class="row"><span class="num">02</span><p>Praticar<span>Exercício com caso real e vídeo de resolução com a IA na tela</span></p></div>
<div class="row"><span class="num">03</span><p>Comprovar<span>Quiz com gabarito: 70% de acerto libera o próximo módulo</span></p></div>
</div>
<div style="position:absolute;left:96px;top:790px;display:flex;gap:14px">
<span class="chip on">Nivelamento com “Não sei”</span><span class="chip">Julgados fictícios de propósito</span></div>
<div style="position:absolute;left:1000px;top:340px;width:824px">
<img class="shot" src="image5.png" style="width:824px;height:383px">
<p class="cap">Trilha com progresso e módulos liberados no nivelamento</p></div>""", "Elaborado pelos autores (2026)."))

# 11 Arquitetura
S.append(page(11, P, kh("Plataforma", "Arquitetura <b>da ATHENAS</b>") + """
<div class="card" style="position:absolute;left:96px;top:350px;width:1080px;height:560px;padding:30px;display:flex;align-items:center;justify-content:center">
<img src="image2.png" style="width:1020px;height:400px;object-fit:contain"></div>
<div class="list" style="position:absolute;left:1240px;top:350px;width:584px">
<div class="row"><span class="num">01</span><p>Front-end<span>React, TypeScript, Vite e Tailwind; PWA no GitHub Pages</span></p></div>
<div class="row"><span class="num">02</span><p>Back-end<span>Supabase: PostgreSQL, autenticação, storage e RLS</span></p></div>
<div class="row"><span class="num">03</span><p>Assistente Athena<span>Edge Function com Gemini e respostas locais de reserva</span></p></div>
</div>""", "Elaborada pelos autores (2026)."))

# 12 Requisitos
rf = [("Autenticação", "E-mail ou conta Google"), ("Catálogo e matrícula", "Busca e filtros"), ("Nivelamento", "Dispensa módulos dominados"),
      ("Trilha modular", "Desbloqueio sequencial"), ("Conteúdo e avaliações", "Vídeos, áudios e quizzes"), ("Gamificação", "Pontos, sequência e moedas"),
      ("Assistente e dúvidas", "Athena e dúvidas ao instrutor"), ("Certificado", "Código único e verificável"), ("Gestão e relatórios", "Moderação e exportação")]
h = "".join(f"""<div class="card" style="padding:26px 30px;display:grid;grid-template-columns:96px 1fr;align-items:center">
<span class="num" style="font-size:34px">RF{i+1:02d}</span><div><p style="font-size:25px;font-weight:800">{a}</p><p style="font-size:20px;color:var(--muted);margin-top:4px">{b}</p></div></div>""" for i, (a, b) in enumerate(rf))
S.append(page(12, P, kh("Requisitos funcionais · aluno, instrutor e administrador", "O que a ATHENAS <b>entrega</b>") +
  f'<div style="position:absolute;left:96px;right:96px;top:350px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px">{h}</div>',
  "Elaborado pelos autores (2026)."))

# 13 Telas
S.append(page(13, P, kh("Na prática", "A plataforma <b>em uso</b>") + """
<div style="position:absolute;left:96px;top:340px;width:840px"><img class="shot" src="image3.png" style="width:840px;height:430px"><p class="cap">Página inicial: proposta, normas e cadastro gratuito</p></div>
<div style="position:absolute;left:984px;top:340px;width:840px"><img class="shot" src="image6.png" style="width:840px;height:430px"><p class="cap">Exercício “Encontre a alucinação” com a assistente Athena</p></div>
<div style="position:absolute;left:96px;top:880px"><span class="chip on">jllbrasileiro123-spec.github.io/athenas-tcc</span></div>
""", ""))

# 14 Resultados
st = [("88,2%", "concluíram o curso (15 de 17)"), ("4,73", "nota geral média, de 1 a 5"), ("100%", "recomendariam o curso"), ("0", "respostas de discordância")]
h = "".join(f"""<div style="border-top:1.5px solid var(--line);padding-top:26px">
<p style="font-size:130px;font-weight:200;letter-spacing:-5px;line-height:1;{'color:var(--gold)' if i==1 else ''}">{a}</p>
<p style="font-size:24px;color:var(--muted);line-height:1.35;margin-top:14px">{b}</p></div>""" for i, (a, b) in enumerate(st))
S.append(page(14, R, kh("Resultados · 17 participantes · out.–nov. de 2026", "Avaliação <b>amplamente positiva</b>") +
  f'<div style="position:absolute;left:96px;right:96px;top:420px;display:grid;grid-template-columns:repeat(4,1fr);gap:40px">{h}</div>',
  "Dados da pesquisa (2026). Questionário de percepção integrado à plataforma."))

# 15 Likert
lk = [("P3", "Consigo aplicar na rotina de trabalho", 4.87), ("P5", "Tempo adequado à minha rotina", 4.53), ("P7", "Mais seguro para usar IA", 4.53),
      ("P4", "Conteúdo claro e bem explicado", 4.40), ("P2", "Aprendi o que nem imaginava", 4.33), ("P1", "Avancei em IA no Direito", 4.27),
      ("P6", "Vídeos, exercícios e materiais ajudaram", 4.13)]
h = "".join(f"""<div style="display:grid;grid-template-columns:60px 500px 1fr 90px;gap:20px;align-items:center;padding:13px 0;border-top:1.5px solid var(--line)">
<span class="num" style="font-size:22px">{c}</span><p style="font-size:23px;{'font-weight:800' if i==0 else ''}">{t}</p>
<div style="height:18px;background:#E4E1DB;border-radius:9px"><div style="height:18px;width:{v/5*100:.1f}%;border-radius:9px;background:{'var(--gold)' if i==0 else '#7A766E'}"></div></div>
<p style="font-size:26px;font-weight:{800 if i==0 else 600};text-align:right">{str(v).replace('.',',').ljust(4,'0')}</p></div>""" for i, (c, t, v) in enumerate(lk))
S.append(page(15, R, kh("Percepção · média de 1 a 5 · n = 15", "Aplicar na rotina foi <b>o mais bem avaliado</b>") +
  f'<div style="position:absolute;left:96px;top:330px;width:1200px">{h}</div>' + """
<div class="card" style="position:absolute;left:1370px;top:330px;width:454px;padding:40px">
<p style="font-size:80px;font-weight:200;letter-spacing:-3px;line-height:1">80–100%</p><p style="font-size:21px;color:var(--muted);margin-top:12px;line-height:1.4">de concordância (notas 4 ou 5) em todas as afirmações</p>
<div style="border-top:1.5px solid var(--line);margin-top:30px;padding-top:26px"><p style="font-size:44px;font-weight:300">4,50 <span style="color:var(--muted);font-size:28px">×</span> 4,36</p>
<p style="font-size:21px;color:var(--muted);margin-top:10px;line-height:1.4">aprendizagem percebida × desenho do curso</p></div></div>""",
  "Dados da pesquisa (2026). Nenhuma resposta 1 ou 2."))

# 16 Comentários
qs = [("Os vídeos curtos ajudam muito na rotina corrida.", "A14"), ("A parte da Resolução do CNJ eu não conhecia.", "A8"), ("A gamificação me fez voltar todo dia.", "A6")]
h = "".join(f"""<div class="card" style="padding:30px 36px"><p style="font-family:Georgia,serif;font-style:italic;font-size:30px;line-height:1.3">“{q}”</p>
<p style="font-size:18px;color:var(--muted);margin-top:10px">Participante {a}</p></div>""" for q, a in qs)
S.append(page(16, R, kh("Comentários abertos", "O que <b>os participantes</b> disseram") +
  f'<div style="position:absolute;left:96px;top:340px;width:880px;display:flex;flex-direction:column;gap:20px">{h}</div>' + """
<div style="position:absolute;left:1060px;top:340px;width:764px">
<p style="font-size:18px;font-weight:700;letter-spacing:4px;color:var(--gold);margin-bottom:12px">SUGESTÕES DE MELHORIA</p>
<div class="list">
<div class="row"><span class="num">01</span><p>Melhorar o áudio dos vídeos<span>Participante A3</span></p></div>
<div class="row"><span class="num">02</span><p>Revisar acertos e erros do quiz<span>Participante A3</span></p></div>
<div class="row"><span class="num">03</span><p>Material em PDF para consulta<span>Participante A9</span></p></div>
<div class="row"><span class="num">04</span><p>Mais exemplos e ferramentas<span>Participantes A1 e A10</span></p></div>
</div></div>""", "Dados da pesquisa (2026)."))

# 17 Discussão e limitações
S.append(page(17, R, kh("Discussão", "Resultados <b>e literatura</b>") + """
<div class="list" style="position:absolute;left:96px;top:340px;width:1000px">
<div class="row"><span class="num">01</span><p>P3 é a maior média (4,87)<span>Adultos aprendem com problemas reais (Knowles et al., 2009)</span></p></div>
<div class="row"><span class="num">02</span><p>Tempo adequado e vídeos curtos<span>Conteúdo segmentado (Mayer, 2009) e flexível (Moore e Kearsley, 2007)</span></p></div>
<div class="row"><span class="num">03</span><p>88,2% de conclusão<span>A gamificação favorece a regularidade (Deterding et al., 2011)</span></p></div>
<div class="row"><span class="num">04</span><p>P6 é a menor média (4,13)<span>Converge com as críticas ao áudio e à falta de PDF</span></p></div>
</div>
<div class="card" style="position:absolute;left:1180px;top:340px;width:644px;padding:40px">
<p style="font-size:18px;font-weight:700;letter-spacing:4px;color:var(--gold)">LIMITAÇÕES</p>
<p style="font-size:24px;line-height:1.45;margin-top:18px">Amostras <b>pequenas e por conveniência</b></p>
<p style="font-size:24px;line-height:1.45;margin-top:14px">Percepção <b>autodeclarada</b></p>
<p style="font-size:24px;line-height:1.45;margin-top:14px"><b>Sem medida objetiva</b> de ganho de conhecimento</p></div>""",
  "Elaborado pelos autores (2026)."))

# 18 Conclusão
S.append(page(18, F, kh("Considerações finais", "O que o trabalho <b>mostra</b>") + """
<div class="list" style="position:absolute;left:96px;top:340px;width:1000px">
<div class="row"><span class="num">01</span><p>Objetivo alcançado<span>Plataforma desenvolvida, publicada e usada por 17 profissionais</span></p></div>
<div class="row"><span class="num">02</span><p>Ferramenta gratuita e aberta<span>Normas éticas e regulatórias transformadas em prática</span></p></div>
<div class="row"><span class="num">03</span><p>Resposta à pergunta<span>Curso curto, prático e gamificado: 88,2% de conclusão e nota 4,73</span></p></div>
</div>
<div class="card" style="position:absolute;left:1180px;top:340px;width:644px;padding:40px">
<p style="font-size:18px;font-weight:700;letter-spacing:4px;color:var(--gold)">TRABALHOS FUTUROS</p>
<p style="font-size:24px;line-height:1.4;margin-top:18px">Implementar as melhorias: áudio, revisão do quiz e PDF</p>
<p style="font-size:24px;line-height:1.4;margin-top:14px">Medir o impacto com pré e pós-teste</p>
<p style="font-size:24px;line-height:1.4;margin-top:14px">Ampliar a amostra para outros estados</p>
<p style="font-size:24px;line-height:1.4;margin-top:14px">Criar trilhas por área de atuação</p></div>""",
  "Knowles et al. (2009); Mayer (2009); Deterding et al. (2011)."))

# 19 Referências
refs = [("BRASIL.", "Lei nº 13.105/2015. Código de Processo Civil."), ("BRASIL.", "Lei nº 13.709/2018. LGPD."),
        ("CNJ.", "Resolução nº 615, de 11 mar. 2025."), ("DETERDING, S. et al.", "From game design elements to gamefulness. ACM, 2011."),
        ("FERNANDES, A. C. O.; MEIRA, T. M.", "Impactos da IA na advocacia brasileira. 2023."), ("GIL, A. C.", "Como elaborar projetos de pesquisa. Atlas, 2017."),
        ("JI, Z. et al.", "Survey of hallucination in NLG. ACM Computing Surveys, 2023."), ("KNOWLES, M. S. et al.", "Aprendizagem de resultados. Elsevier, 2009."),
        ("MAYER, R. E.", "Multimedia learning. Cambridge, 2009."), ("MIGALHAS.", "TST condena empresa e advogado por citações falsas. 2026."),
        ("MOORE, M. G.; KEARSLEY, G.", "Educação a distância. Cengage, 2007."), ("OAB.", "Recomendações para uso de IA na prática jurídica. 2024."),
        ("PRODANOV, C. C.; FREITAS, E. C.", "Metodologia do trabalho científico. Feevale, 2013."), ("QUEIROZ, A. M. et al.", "O impacto da IA na advocacia brasileira. 2024.")]
h = "".join(f'<div style="border-top:1.5px solid var(--line);padding:14px 0"><p style="font-size:20px;font-weight:800">{a}</p><p style="font-size:20px;color:var(--muted);margin-top:3px">{b}</p></div>' for a, b in refs)
S.append(page(19, "Referências", kh("Referências", "Referências <b>principais</b>") +
  f'<div style="position:absolute;left:96px;right:96px;top:330px;display:grid;grid-template-columns:1fr 1fr;column-gap:60px">{h}</div>',
  "A lista completa, em ABNT, está no artigo."))

# 20 Encerramento
S.append(f"""<section>
<div class="top"><span>ATHENAS · IA no Direito</span><span class="c"></span><span class="r">Perguntas e considerações da banca</span></div>
<div style="position:absolute;left:96px;top:150px">{badge()}</div>
<div style="position:absolute;left:90px;top:300px;font-size:180px;font-weight:200;letter-spacing:-7px;line-height:.95">Obrigado</div>
<div style="position:absolute;left:96px;top:475px;font-size:180px;font-weight:900;letter-spacing:-7px;line-height:.95">pela atenção</div>
<img class="shot" src="image6.png" style="position:absolute;right:96px;top:150px;width:560px;height:290px;transform:rotate(-2deg)">
<div style="position:absolute;left:96px;right:96px;bottom:110px;display:grid;grid-template-columns:1fr 1fr 1fr 1.2fr;gap:30px;border-top:1.5px solid var(--line);padding-top:26px;font-size:21px;line-height:1.45">
<div><b>João Lucas Luna Brasileiro</b><br><span style="color:var(--muted)">Ciência da Computação · UNIPÊ</span></div>
<div><b>Gilverson Rodrigues da Silva</b><br><span style="color:var(--muted)">Ciência da Computação · UNIPÊ</span></div>
<div><b>Orientador</b><br><span style="color:var(--muted)">Prof. José Raul de Brito Andrade</span></div>
<div><b>Plataforma</b><br><span style="color:var(--muted)">jllbrasileiro123-spec.github.io/athenas-tcc</span></div></div>
</section>""")

html = f"""<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Defesa TCC — ATHENAS</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;600;700;800;900&display=swap">
<style>{CSS}</style><body>{''.join(S)}</body></html>"""
open(os.path.join(OUT, "deck.html"), "w", encoding="utf-8").write(html)
print(len(S), "slides")
