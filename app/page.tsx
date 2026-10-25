import Link from 'next/link';
import type { Metadata } from 'next';
import { Narrativa } from '@/components/narrativa';
import { Configurador } from '@/components/configurador';
import e from './page.module.css';

export const metadata: Metadata = {
  title: 'IRS 2026 — entregue com acompanhamento de um contabilista certificado',
  description:
    'Recolha, revisão e submissão do seu IRS de 2026 numa plataforma própria. Preço transparente desde 18,50 € com IVA incluído.',
  robots: { index: true, follow: true },
};

const CONFIANCA = [
  {
    titulo: 'Contabilista certificado',
    texto: 'Rúben Miguel da Silva Duarte Meirinho Rodrigues, cédula profissional n.º 145854. O seu processo é tratado por quem assina.',
  },
  {
    titulo: 'Os seus dados ficam seus',
    texto: 'Cada processo está isolado na base de dados por regras de acesso ao nível da linha. Ninguém vê o que não lhe pertence.',
  },
  {
    titulo: 'Documentos sem duplicados',
    texto: 'Cada ficheiro é identificado pelo seu conteúdo. Envia duas vezes o mesmo documento e ele conta como um só.',
  },
  {
    titulo: 'Instale como aplicação',
    texto: 'Adicione o IRS 2026 ao ecrã inicial do iPhone ou do Android e abra como qualquer outra aplicação.',
  },
];

export default function Pagina() {
  const ano = new Date().getFullYear();

  return (
    <div className={e.pagina}>
      <header className={e.nav}>
        <nav className={`${e.navInterior} envolve`} aria-label="Principal">
          <Link href="/" className={e.logo}>
            <img src="/rr-branco.svg" alt="RR. — Rúben Meirinho Rodrigues" width={294} height={195} />
            <span className={e.logoNome}>
              Contabilidade · Fiscalidade
              <small>Consultoria &amp; Estratégia</small>
            </span>
          </Link>
          <div className={e.navAcoes}>
            <Link href="/entrar" className={e.navLink}>
              Entrar
            </Link>
            <Link href="/registar" className={`btn btn-sm ${e.btnClaro}`}>
              Criar conta
            </Link>
          </div>
        </nav>
      </header>

      <main id="principal">
        <section className={e.heroi}>
          <div className={e.heroiLuz} aria-hidden="true" />
          <div className={e.heroiGrelha} aria-hidden="true" />

          <div className={`${e.heroiInterior} envolve`}>
            <div className={e.heroiTexto2}>
              <p className={e.selo}>
                <span aria-hidden="true" />
                Campanha IRS 2026 · entrega em 2027
              </p>
              <h1 className={e.heroiTitulo}>
                O seu IRS, <em>feito como deve ser.</em>
              </h1>
              <p className={e.heroiTexto}>
                Reúna os documentos ao seu ritmo. Eu trato do resto — reviso, pergunto o que falta e submeto.
                Vê o estado do processo a qualquer hora, no telemóvel ou no computador.
              </p>

              <div className={e.linhaValor}>
                <span className={e.valorGrupo}>
                  <span className={`${e.valorNumero} numero`}>18,50 €</span>
                  <span className={e.valorRotulo}>Desde, com IVA</span>
                </span>
                <span className={e.separadorValor} aria-hidden="true" />
                <span className={e.valorGrupo}>
                  <span className={e.valorNumero}>100% online</span>
                  <span className={e.valorRotulo}>Sem deslocações</span>
                </span>
                <Link href="/registar" className={`btn btn-lg ${e.btnClaro}`}>
                  Submeter o meu IRS
                </Link>
              </div>
            </div>

            <div className={e.atomo} aria-hidden="true">
              <div className={e.orbita} />
              <div className={`${e.orbita} ${e.dois}`} />
              <div className={e.atomoNumero}>
                IRS<span>.</span>
              </div>
              <div className={`${e.atomoEtiqueta} ${e.atomoA}`}>01 / ANALISAR</div>
              <div className={`${e.atomoEtiqueta} ${e.atomoB}`}>02 / DECLARAR</div>
              <div className={`${e.atomoEtiqueta} ${e.atomoC}`}>03 / ACOMPANHAR</div>
            </div>
          </div>
        </section>

        <section className={`${e.seccao} ${e.seccaoClara}`} id="como-funciona">
          <div className="envolve">
            <div className={e.cabecalho}>
              <p className={e.olho}>Como funciona</p>
              <h2 className={e.seccaoTitulo}>Cinco passos, do registo à submissão.</h2>
              <p className={e.seccaoTexto}>
                Cada passo fica guardado. Pode parar a meio e voltar quando quiser — nada se perde.
              </p>
            </div>
            <Narrativa />
          </div>
        </section>

        <section className={e.seccao} id="precos">
          <div className="envolve">
            <div className={e.cabecalho}>
              <p className={e.olho}>Preços</p>
              <h2 className={e.seccaoTitulo}>Calcule o seu IRS antes de começar.</h2>
              <p className={e.seccaoTexto}>
                Diga o que recebeu em 2026 e veja o preço montar-se, rubrica a rubrica. Sem registo e sem
                compromisso.
              </p>
            </div>
            <Configurador />
          </div>
        </section>

        <section className={`${e.seccao} ${e.seccaoClara}`}>
          <div className="envolve">
            <div className={e.cabecalho}>
              <p className={e.olho}>Confiança</p>
              <h2 className={e.seccaoTitulo}>Rigor em cada detalhe.</h2>
            </div>
            <div className={e.confianca}>
              {CONFIANCA.map((item) => (
                <article className={e.confiancaItem} key={item.titulo}>
                  <h3>{item.titulo}</h3>
                  <p>{item.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={e.final}>
          <div className={`${e.finalInterior} envolve`}>
            <h2 className={e.finalTitulo}>Comece hoje. Submeta sem stress.</h2>
            <p className={e.finalTexto}>
              Criar a conta não o compromete a nada. Só paga quando o processo estiver completo e quiser que eu
              submeta.
            </p>
            <Link href="/registar" className={`btn btn-lg ${e.btnClaro}`}>
              Criar a minha conta
            </Link>
          </div>
        </section>
      </main>

      <footer className={e.rodape}>
        <div className={`${e.rodapeInterior} envolve`}>
          <div className={e.rodapeIdentidade}>
            <Link href="/" className={e.rodapeMarca}>
              <img src="/rr-branco.svg" alt="RR. — Início" width={294} height={195} />
            </Link>
            <p>
              <span className={e.rodapeNome}>Rúben Miguel da Silva Duarte Meirinho Rodrigues</span>
              <span>
                Contabilista Certificado com a cédula n.º 145854 · Domicílio Profissional na Rua Augusto Simões
                845 4470-147 Maia
              </span>
            </p>
          </div>

          <div className={e.rodapeContactos}>
            <a href="mailto:contabilidade.rubenrodrigues@gmail.com">Email ↗</a>
            <a href="tel:+351936432519">+351 936 432 519</a>
            <a href="https://www.linkedin.com/in/ruben-m-rodrigues/" rel="noopener noreferrer" target="_blank">
              LinkedIn ↗
            </a>
          </div>

          <div className={e.rodapeBase}>
            <span>© {ano} Rúben Meirinho Rodrigues · Maia, Porto, Portugal</span>
            <nav className={e.rodapeLegal} aria-label="Informação legal">
              <Link href="/privacidade">Privacidade</Link>
              <Link href="/termos">Termos e Condições</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
