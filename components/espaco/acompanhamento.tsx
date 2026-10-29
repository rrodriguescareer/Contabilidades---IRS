'use client';
import { FASES, QUEM, eDesvio, estadoDe, posicao, type Prontidao } from '@/lib/fluxo';
import type { Dados, Vista } from './espaco';
import e from './espaco.module.css';

const data = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
const dia = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

const euros = (c: number) =>
  (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

type Evento = { id: string; titulo: string; corpo: string; em: string };

/* O acompanhamento, em cinco etapas. Em cima, onde está o processo e o que
   isso quer dizer; ao meio, o caminho inteiro, com o estado exato dentro da
   etapa atual; por baixo, o que depende do cliente, o pagamento em falta e o
   histórico real do processo. */
export function Acompanhamento({ dados, ir }: { dados: Dados; ir: (v: Vista) => void }) {
  const proc = (dados.processo as {
    estado: string; desde: string; submetido_em: string | null; ano: number | null;
    valor_final: number | null; sentido: string | null;
  }) || null;
  const eventos = ((dados.eventos as Evento[]) || []).slice();
  const prontidao = (dados.prontidao as Prontidao[]) || [];
  const consultas = (dados.consultas_senha as { pessoa: string; em: string }[]) || [];

  const estado = estadoDe(proc?.estado);
  const { etapa, etapas } = posicao(proc?.estado);
  const meus = prontidao.filter((p) => p.de === 'cliente');
  const podeSubmeter = proc?.estado === 'collecting' || proc?.estado === 'returned';
  const checkout = (dados.checkout as { estado: string } | null) || null;
  // Submetido sem pagar: o pagamento continua disponível até ao fecho.
  const porPagar = !podeSubmeter && proc?.estado !== 'closed'
    && checkout?.estado !== 'paid' && checkout?.estado !== 'pending';
  const faltam = meus.filter((p) => p.bloqueia && p.estado === 'falta').length;

  return (
    <div className={e.acompanhamento}>
      <section className={`${e.cartao} ${e.estadoAtual}`} data-espera={estado?.espera}>
        <div className={e.estadoTopo}>
          <span className={e.etapaRotulo}>Etapa {etapa + 1} de {etapas} · {FASES[etapa]?.titulo}</span>
          <span className="selo-espera" data-espera={estado?.espera}>{QUEM[estado?.espera || 'cliente']}</span>
        </div>
        <h2>{estado?.titulo || 'Processo'}</h2>
        <p className={e.estadoNota}>{estado?.nota}</p>
        <p className="suave">
          {proc?.desde ? `Desde ${dia(proc.desde)}` : ''}{proc?.ano ? ` · IRS de ${proc.ano}` : ''}
        </p>
        {proc?.valor_final != null && proc.sentido && (
          <div className={e.resultado} data-sentido={proc.sentido}>
            <span>{proc.sentido === 'refund' ? 'Reembolso apurado' : 'Imposto a pagar'}</span>
            <strong>{euros(proc.valor_final)}</strong>
          </div>
        )}
      </section>

      <section className={e.cartao}>
        <h3 className={e.tituloCartao}>As etapas do processo</h3>
        <ol className={e.etapas}>
          {FASES.map((f, i) => {
            const situacao = i < etapa ? 'feito' : i === etapa ? 'atual' : 'por-vir';
            return (
              <li key={f.id} data-estado={situacao} data-desvio={i === etapa && estado?.desvio ? 'true' : undefined}>
                <span className={e.etapaMarca} aria-hidden="true">
                  {situacao === 'feito' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                         strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  ) : i + 1}
                </span>
                <div>
                  <strong>{f.titulo}</strong>
                  <span>{situacao === 'atual' && estado ? estado.titulo : f.nota}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {podeSubmeter && meus.length > 0 && (
        <section className={e.cartao}>
          <div className="linha-entre">
            <h3 className={e.tituloCartao}>{proc?.estado === 'returned' ? 'Para voltar a submeter' : 'Antes de submeter'}</h3>
            {faltam > 0 && <span className={e.obrigatorio}>{faltam} em falta</span>}
          </div>
          {proc?.estado === 'returned' && (
            <p className="aviso-atencao">
              O processo foi devolvido para correção. Consulte a nota no histórico, complete o que falta e volte a submeter.
            </p>
          )}
          <ul className={`prontidao ${e.listaFalta}`}>
            {meus.map((p) => (
              <li key={p.chave} data-estado={p.estado}>
                <span className="marca-pronto" aria-hidden="true" />
                <div><strong>{p.rotulo}</strong><span>{p.detalhe}</span></div>
              </li>
            ))}
          </ul>
          <div>
            <button type="button" className="btn" onClick={() => ir('pagamento')}>
              {proc?.estado === 'returned' ? 'Voltar a submeter' : 'Rever e submeter'}
            </button>
          </div>
        </section>
      )}

      {porPagar && (
        <section className={e.cartao}>
          <h3 className={e.tituloCartao}>Pagamento em falta</h3>
          <p className="suave">O processo já está em revisão. O pagamento pode ser feito a qualquer momento.</p>
          <div><button type="button" className="btn" onClick={() => ir('pagamento')}>Pagar</button></div>
        </section>
      )}

      <section className={e.cartao}>
        <h3 className={e.tituloCartao}>Histórico</h3>
        {eventos.length === 0 ? (
          <div className={e.vazio}>Ainda não há movimentos no processo.</div>
        ) : (
          <ol className={e.historico}>
            {eventos.map((ev) => (
              <li key={ev.id} data-tom={eDesvio(ev.titulo) ? 'desvio' : undefined}>
                <time>{data(ev.em)}</time>
                <strong>{ev.titulo}</strong>
                {ev.corpo && <p>{ev.corpo}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={e.cartao}>
        <h3 className={e.tituloCartao}>Consultas à senha das Finanças</h3>
        <p className="suave">Cada consulta do contabilista à senha de um membro do agregado fica registada aqui, com data e hora.</p>
        {consultas.length === 0 ? (
          <div className={e.vazio}>Nenhuma senha foi consultada até ao momento.</div>
        ) : (
          <ul className="lista-simples">
            {consultas.map((c, i) => <li key={i}>{c.pessoa} — {data(c.em)}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
