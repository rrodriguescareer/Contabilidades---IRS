'use client';
import { QUEM, estadoDe, roteiro, type Prontidao } from '@/lib/fluxo';
import type { Vista } from './espaco';
import e from './espaco.module.css';

/* O roteiro do processo: sete marcos numa estrada, do agregado ao reembolso.
   Em ecrãs largos a estrada é horizontal; no telemóvel desce na vertical.
   Na versão completa, o marco atual abre-se por baixo com o que está a
   acontecer, de quem se espera o passo seguinte e o que falta. */

const PRONTIDAO_DO_MARCO: Record<string, string[]> = {
  agregado: ['titular', 'senha'],
  rendimentos: ['rendimentos', 'documentos'],
  submissao: ['pagamento'],
};

const ACAO_DO_MARCO: Record<string, { vista: Vista; rotulo: string }> = {
  agregado: { vista: 'agregado', rotulo: 'Completar o agregado' },
  rendimentos: { vista: 'rendimentos', rotulo: 'Declarar rendimentos' },
  submissao: { vista: 'pagamento', rotulo: 'Rever e submeter' },
};

const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });

export function Roteiro({ estado, prontidao = [], eventos = [], compacto = false, ir }: {
  estado: string | null | undefined;
  prontidao?: Prontidao[];
  eventos?: { titulo: string; em: string }[];
  compacto?: boolean;
  ir?: (v: Vista) => void;
}) {
  const { passos, atual } = roteiro(estado, prontidao, eventos);
  const agora = passos[atual];
  const est = estadoDe(estado);
  const emFalta = (PRONTIDAO_DO_MARCO[agora.id] ?? [])
    .map((k) => prontidao.find((p) => p.chave === k))
    .filter((p): p is Prontidao => Boolean(p));
  const acao = ACAO_DO_MARCO[agora.id];
  const progresso = passos.length > 1 ? atual / (passos.length - 1) : 0;

  return (
    <div className={e.roteiro} data-compacto={compacto}>
      <ol className={e.estrada} style={{ '--progresso': progresso } as React.CSSProperties} aria-label="Roteiro do processo">
        {passos.map((p, i) => (
          <li key={p.id} className={e.marco} data-situacao={p.situacao} data-desvio={p.desvio || undefined}
              aria-current={p.situacao === 'atual' ? 'step' : undefined}>
            <span className={e.no} aria-hidden="true">
              {p.situacao === 'feito' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                     strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              ) : p.desvio ? '!' : i + 1}
            </span>
            <span className={e.marcoTexto}>
              <strong>{p.titulo}</strong>
              <small>
                {p.situacao === 'feito' ? (p.em ? `Feito a ${dia(p.em)}` : 'Feito')
                  : p.situacao === 'atual' ? (p.desvio ? 'Precisa de atenção' : 'Agora') : p.id === 'fecho' ? 'No fim' : 'A seguir'}
              </small>
              {!compacto && <span className={e.marcoNota}>{p.descricao}</span>}
            </span>
          </li>
        ))}
      </ol>

      {!compacto && (
        <section className={e.marcoAtual} data-desvio={agora.desvio || undefined} aria-live="polite">
          <div className={e.marcoAtualTopo}>
            <span className={e.etapaRotulo}>Marco {atual + 1} de {passos.length} · {agora.titulo}</span>
            <span className="selo-espera" data-espera={est?.espera ?? agora.quem}>{QUEM[est?.espera ?? agora.quem]}</span>
          </div>
          <h3>{est?.titulo ?? agora.titulo}</h3>
          <p>{est?.nota ?? agora.descricao}</p>
          {emFalta.length > 0 && estado !== 'closed' && (
            <ul className={`prontidao ${e.listaFalta}`}>
              {emFalta.map((p) => (
                <li key={p.chave} data-estado={p.estado}>
                  <span className="marca-pronto" aria-hidden="true" />
                  <div><strong>{p.rotulo}</strong><span>{p.detalhe}</span></div>
                </li>
              ))}
            </ul>
          )}
          {acao && ir && (estado === 'collecting' || estado === 'returned' || !estado) && (
            <div><button type="button" className="btn" onClick={() => ir(acao.vista)}>{acao.rotulo}</button></div>
          )}
        </section>
      )}
    </div>
  );
}
