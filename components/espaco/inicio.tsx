'use client';
import { FASES, QUEM, estadoDe, posicao, type Prontidao } from '@/lib/fluxo';
import type { Dados, Vista } from './espaco';
import e from './espaco.module.css';

const euros = (c: number) => (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/* Para onde leva cada item da prontidão: quem vê que falta a senha vai direto
   ao sítio onde a põe. */
const DESTINO: Record<string, { vista: Vista; acao: string }> = {
  titular: { vista: 'agregado', acao: 'Completar' },
  senha: { vista: 'agregado', acao: 'Indicar a senha' },
  rendimentos: { vista: 'rendimentos', acao: 'Declarar' },
  documentos: { vista: 'rendimentos', acao: 'Enviar' },
  pagamento: { vista: 'pagamento', acao: 'Pagar' },
};

/* O Início. O cliente chega aqui depois de entrar e percebe, sem procurar,
   três coisas: em que fase está o processo, o que falta da parte dele, e
   qual é o passo seguinte. */
export function Inicio({ dados, ir }: { dados: Dados; ir: (v: Vista) => void }) {
  const proc = (dados.processo as { estado: string; desde: string; valor_final: number | null; sentido: string | null }) || null;
  const prontidao = ((dados.prontidao as Prontidao[]) || []).filter((p) => p.de === 'cliente');
  const contagens = (dados.contagens as Record<string, number>) || {};
  const checkout = (dados.checkout as { estado: string; total: number } | null) || null;
  const ultima = (dados.ultima_do_gabinete as { corpo: string; em: string } | null) || null;
  const eventos = ((dados.eventos as { id: string; titulo: string; corpo: string; em: string }[]) || []).slice(0, 3);

  const estado = estadoDe(proc?.estado);
  const { fase, indice, total } = posicao(proc?.estado);
  const faseAtual = FASES.findIndex((f) => f.id === fase);
  const emRecolha = proc?.estado === 'collecting' || proc?.estado === 'returned';
  const faltas = prontidao.filter((p) => p.bloqueia && p.estado === 'falta');
  const pago = checkout?.estado === 'paid';

  // O passo seguinte, numa frase e num botão.
  const seguinte: { titulo: string; texto: string; vista: Vista; botao: string } = !emRecolha
    ? { titulo: 'Está tudo comigo.', texto: estado?.nota || 'Aviso-o a cada passo.', vista: 'progresso', botao: 'Ver o acompanhamento' }
    : faltas.length > 0
      ? { titulo: 'Falta pouco.', texto: `Antes de submeter: ${faltas.map((f) => f.rotulo.toLowerCase()).join(', ')}.`,
          vista: DESTINO[faltas[0].chave]?.vista || 'agregado', botao: DESTINO[faltas[0].chave]?.acao || 'Completar' }
      : pago
        ? { titulo: 'Pode submeter outra vez.', texto: 'Já está pago. Reveja o que lhe pedi e submeta.', vista: 'pagamento', botao: 'Submeter' }
        : { titulo: 'Está pronto a submeter.', texto: 'Reveja o preço e pague: o processo entra logo na minha fila.', vista: 'pagamento', botao: 'Rever e pagar' };

  return (
    <div className={e.inicio}>
      <section className={`${e.cartao} ${e.destaque}`}>
        <div className={e.destaqueTopo}>
          <span className="selo-espera" data-espera={estado?.espera}>{QUEM[estado?.espera || 'cliente']}</span>
          <span className={e.passo}>Passo {indice + 1} de {total} · {estado?.titulo}</span>
        </div>
        <h2>{seguinte.titulo}</h2>
        <p>{seguinte.texto}</p>
        <div>
          <button type="button" className="btn" onClick={() => ir(seguinte.vista)}>{seguinte.botao}</button>
        </div>
        <ol className={e.fasesInicio}>
          {FASES.map((f, i) => (
            <li key={f.id} data-estado={i < faseAtual ? 'feito' : i === faseAtual ? 'atual' : 'por-vir'}>
              <span />
              <strong>{f.titulo}</strong>
            </li>
          ))}
        </ol>
        {proc?.valor_final != null && proc.sentido && (
          <p className={proc.sentido === 'refund' ? 'aviso-positivo' : 'aviso-atencao'}>
            {proc.sentido === 'refund' ? 'Valor a reembolsar' : 'Valor a pagar'}: {euros(proc.valor_final)}
          </p>
        )}
      </section>

      <div className={e.grelhaInicio}>
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
              <span className={e.avatarPequeno}>RR</span>
              <span>
                <strong>Rúben Rodrigues · {quando(ultima.em)}</strong>
                <span>{ultima.corpo}</span>
              </span>
            </button>
          ) : (
            <p className="suave">Tem alguma dúvida? Escreva-me — respondo aqui.</p>
          )}
          <div>
            <button type="button" className="btn btn-secundario" onClick={() => ir('mensagens')}>
              {ultima ? 'Abrir a conversa' : 'Escrever uma mensagem'}
            </button>
          </div>
        </section>
      </div>

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
          <strong>{pago ? 'Pago' : checkout?.estado === 'pending' ? 'A aguardar' : '—'}</strong>
          <span>{pago && checkout ? euros(checkout.total) : 'Pagamento'}</span>
        </button>
      </div>

      {eventos.length > 0 && (
        <section className={e.cartao}>
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
  );
}
