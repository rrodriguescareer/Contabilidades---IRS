'use client';
import { FASES, QUEM, estadoDe, posicao, type Prontidao } from '@/lib/fluxo';
import type { Dados, Vista } from './espaco';
import e from './espaco.module.css';

const euros = (c: number) => (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/* Para onde leva cada item da prontidão: quem vê que falta a senha vai direto
   ao sítio onde a indica. */
const DESTINO: Record<string, { vista: Vista; acao: string }> = {
  titular: { vista: 'agregado', acao: 'Completar' },
  senha: { vista: 'agregado', acao: 'Indicar a senha' },
  rendimentos: { vista: 'rendimentos', acao: 'Declarar' },
  documentos: { vista: 'rendimentos', acao: 'Enviar' },
  pagamento: { vista: 'pagamento', acao: 'Pagar' },
};

/* O Início. Quem entra percebe, sem procurar, em que etapa está o processo, o
   que falta da sua parte e qual é o passo seguinte. Em ecrãs largos, o que
   falta e as mensagens ficam numa coluna ao lado; no telemóvel, tudo numa
   coluna, sem os números repetidos do menu. */
export function Inicio({ dados, ir }: { dados: Dados; ir: (v: Vista) => void }) {
  const proc = (dados.processo as { estado: string; desde: string; valor_final: number | null; sentido: string | null }) || null;
  const prontidao = ((dados.prontidao as Prontidao[]) || []).filter((p) => p.de === 'cliente');
  const contagens = (dados.contagens as Record<string, number>) || {};
  const checkout = (dados.checkout as { estado: string; total: number } | null) || null;
  const ultima = (dados.ultima_do_gabinete as { corpo: string; em: string } | null) || null;
  const eventos = ((dados.eventos as { id: string; titulo: string; corpo: string; em: string }[]) || []).slice(0, 3);

  const estado = estadoDe(proc?.estado);
  const { etapa, etapas } = posicao(proc?.estado);
  const emRecolha = proc?.estado === 'collecting' || proc?.estado === 'returned';
  const faltas = prontidao.filter((p) => p.bloqueia && p.estado === 'falta');
  const pago = checkout?.estado === 'paid';
  // Submetido sem pagar: o pagamento continua disponível até ao fecho.
  const porPagar = !emRecolha && !pago && checkout?.estado !== 'pending' && proc?.estado !== 'closed';

  // O passo seguinte, numa frase e num botão.
  const seguinte: { titulo: string; texto: string; vista: Vista; botao: string } = !emRecolha
    ? porPagar
      ? { titulo: 'Pagamento em falta', texto: 'O processo já está em revisão. O pagamento pode ser feito a qualquer momento.', vista: 'pagamento', botao: 'Pagar' }
      : { titulo: estado?.titulo || 'Processo em curso', texto: estado?.nota || 'Cada avanço fica registado no acompanhamento.', vista: 'progresso', botao: 'Ver o acompanhamento' }
    : faltas.length > 0
      ? { titulo: proc?.estado === 'returned' ? 'Processo devolvido para correção' : 'Falta pouco para submeter',
          texto: `Em falta: ${faltas.map((f) => f.rotulo.toLowerCase()).join(', ')}.`,
          vista: DESTINO[faltas[0].chave]?.vista || 'agregado', botao: DESTINO[faltas[0].chave]?.acao || 'Completar' }
      : pago
        ? { titulo: 'Pronto para voltar a submeter', texto: 'O pagamento já está feito. Reveja o que foi pedido e volte a submeter.', vista: 'pagamento', botao: 'Voltar a submeter' }
        : { titulo: 'Pronto para submeter', texto: 'Reveja o preço e pague, ou submeta já e pague depois.', vista: 'pagamento', botao: 'Rever e submeter' };

  return (
    <div className={e.inicio}>
      <div className={e.inicioPrincipal}>
        <section className={`${e.cartao} ${e.destaque}`}>
          <div className={e.destaqueTopo}>
            <span className={e.etapaRotulo}>Etapa {etapa + 1} de {etapas} · {FASES[etapa]?.titulo}</span>
            <span className="selo-espera" data-espera={estado?.espera}>{QUEM[estado?.espera || 'cliente']}</span>
          </div>
          <h2>{seguinte.titulo}</h2>
          <p>{seguinte.texto}</p>
          <div>
            <button type="button" className="btn" onClick={() => ir(seguinte.vista)}>{seguinte.botao}</button>
          </div>
          <ol className={e.fasesInicio} aria-label="Etapas do processo">
            {FASES.map((f, i) => (
              <li key={f.id} data-estado={i < etapa ? 'feito' : i === etapa ? 'atual' : 'por-vir'}>
                <span />
                <strong>{f.titulo}</strong>
              </li>
            ))}
          </ol>
          {proc?.valor_final != null && proc.sentido && (
            <p className={proc.sentido === 'refund' ? 'aviso-positivo' : 'aviso-atencao'}>
              {proc.sentido === 'refund' ? 'Reembolso apurado' : 'Imposto a pagar'}: {euros(proc.valor_final)}
            </p>
          )}
        </section>

        <div className={e.numeros}>
          <button type="button" onClick={() => ir('agregado')}>
            <strong>{contagens.membros ?? 0}</strong><span>No agregado</span>
          </button>
          <button type="button" onClick={() => ir('rendimentos')}>
            <strong>{contagens.rendimentos ?? 0}</strong><span>Rendimentos</span>
          </button>
          <button type="button" onClick={() => ir('documentos')}>
            <strong>{contagens.documentos ?? 0}</strong><span>Documentos</span>
          </button>
          <button type="button" onClick={() => ir('pagamento')}>
            <strong>{pago ? 'Pago' : checkout?.estado === 'pending' ? 'A confirmar' : porPagar ? 'Em falta' : '—'}</strong>
            <span>{pago && checkout ? euros(checkout.total) : 'Pagamento'}</span>
          </button>
        </div>

        {eventos.length > 0 && (
          <section className={`${e.cartao} ${e.inicioUltimas}`}>
            <div className="linha-entre">
              <h3 className={e.tituloCartao}>Últimas atualizações</h3>
              <button type="button" className="btn-texto" onClick={() => ir('progresso')}>Ver tudo</button>
            </div>
            <ul className={e.atualizacoes}>
              {eventos.map((ev) => (
                <li key={ev.id}>
                  <strong>{ev.titulo}</strong>
                  <span>{ev.corpo}</span>
                  <time>{quando(ev.em)}</time>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className={e.inicioLado}>
        <section className={e.cartao}>
          <h3 className={e.tituloCartao}>A sua parte</h3>
          <ul className={`prontidao ${e.listaFalta}`}>
            {prontidao.map((p) => {
              const d = DESTINO[p.chave];
              return (
                <li key={p.chave} data-estado={p.estado}>
                  <span className="marca-pronto" aria-hidden="true" />
                  <div>
                    <strong>{p.rotulo}</strong>
                    <span>{p.detalhe}</span>
                  </div>
                  {d && p.estado !== 'ok' && emRecolha && (
                    <button type="button" className={e.botaoLinha} onClick={() => ir(d.vista)}>{d.acao}</button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className={e.cartao}>
          <h3 className={e.tituloCartao}>Mensagens</h3>
          {ultima ? (
            <button type="button" className={e.ultimaMensagem} onClick={() => ir('mensagens')}>
              <img src="/ruben-rodrigues.webp" alt="Rúben Meirinho Rodrigues" width={96} height={96} className={e.avatarPequeno} />
              <span>
                <strong>Rúben Rodrigues · {quando(ultima.em)}</strong>
                <span>{ultima.corpo}</span>
              </span>
            </button>
          ) : (
            <p className="suave">Tem alguma dúvida? Envie uma mensagem ao contabilista: a resposta fica registada no processo.</p>
          )}
          <div>
            <button type="button" className="btn btn-secundario" onClick={() => ir('mensagens')}>
              {ultima ? 'Abrir a conversa' : 'Escrever uma mensagem'}
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
