import Link from 'next/link';
import type { Metadata } from 'next';
import { Narrativa } from '@/components/narrativa';
import e from './page.module.css';

export const metadata: Metadata = {
  title: 'IRS 2026 — entregue com acompanhamento de um contabilista certificado',
  description:
    'Recolha, revisão e submissão do seu IRS de 2026 numa plataforma própria. Preço transparente desde 18,50 € com IVA incluído.',
  robots: { index: true, follow: true },
};

const RUBRICAS = [
  { nome: 'Preparação do IRS', detalhe: 'Primeiro tipo de rendimento', valor: '18,50 €' },
  { nome: 'Várias pessoas com trabalho ou pensões', detalhe: 'Independentemente do número de pessoas', valor: '+ 5,00 €' },
  { nome: 'Acumulação de categorias A e B', detalhe: 'Trabalho dependente com recibos verdes', valor: '+ 15,00 €' },
  { nome: 'Rendas de imóveis', detalhe: 'Até 2 imóveis · 3 a 5 · mais de 5', valor: '+ 5 / 10 / 20 €' },
  { nome: 'Mais-valias de ações e títulos', detalhe: 'Categoria G, valor único', valor: '+ 10,00 €' },
  { nome: 'Mais-valias de imóveis', detalhe: 'Por cada imóvel vendido', valor: '+ 10,00 €' },
];

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
  return (
    <div className={e.pagina}>
      <header className={e.nav}>
        <nav className={`${e.navInterior} envolve`} aria-label="Principal">
          <Link href="/" className={e.logo}>
            <img src="/rr-branco.svg" alt="RR." width={294} height={195} />
            <span className={e.logoNome}>Contabilidade e consultoria</span>
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
            <div className={e.heroiAcoes}>
              <Link href="/registar" className={`btn btn-lg ${e.btnClaro}`}>
                Começar o meu IRS
              </Link>
              <Link href="/entrar" className={`btn btn-lg ${e.btnContorno}`}>
                Já tenho conta
              </Link>
            </div>
            <div className={e.provas}>
              <div className={e.prova}>
                <span className={`${e.provaValor} numero`}>18,50 €</span>
                <span className={e.provaRotulo}>Desde, com IVA</span>
              </div>
              <div className={e.prova}>
                <span className={`${e.provaValor} numero`}>145854</span>
                <span className={e.provaRotulo}>Cédula profissional</span>
              </div>
              <div className={e.prova}>
                <span className={e.provaValor}>100% online</span>
                <span className={e.provaRotulo}>Sem deslocações</span>
              </div>
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
              <h2 className={e.seccaoTitulo}>Sabe quanto paga antes de pagar.</h2>
              <p className={e.seccaoTexto}>
                O valor depende do que declarou. A plataforma mostra-lhe o cálculo rubrica a rubrica antes de
                avançar para o pagamento.
              </p>
            </div>

            <div className={e.precario}>
              <div className={e.precoBase}>
                <div className={e.precoValor}>
                  <span className={`${e.precoNumero} numero`}>18,50</span>
                  <span className={e.precoMoeda}>€</span>
                </div>
                <p className={e.precoNota}>
                  Preparação do IRS com o primeiro tipo de rendimento. IVA incluído. Acrescem apenas as rubricas
                  que se aplicarem ao seu caso.
                </p>
                <Link href="/registar" className={`btn ${e.btnClaro}`} style={{ position: 'relative', zIndex: 1, width: 'fit-content' }}>
                  Calcular o meu IRS
                </Link>
              </div>

              <div className={e.rubricas}>
                {RUBRICAS.map((rubrica) => (
                  <div className={e.rubrica} key={rubrica.nome}>
                    <div className={e.rubricaTexto}>
                      <strong>{rubrica.nome}</strong>
                      <span>{rubrica.detalhe}</span>
                    </div>
                    <span className={`${e.rubricaValor} numero`}>{rubrica.valor}</span>
                  </div>
                ))}
              </div>
            </div>
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
          <div className={e.rodapeMarca}>
            <img src="/rr-branco.svg" alt="" width={294} height={195} />
            <strong>Rúben Miguel da Silva Duarte Meirinho Rodrigues</strong>
            <span>Contabilista Certificado com a cédula n.º 145854</span>
            <span>Domicílio profissional na Rua Augusto Simões 845, 4470-147 Maia</span>
          </div>
          <div className={e.rodapeLegal}>
            <Link href="/termos">Termos e condições</Link>
            <Link href="/privacidade">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
