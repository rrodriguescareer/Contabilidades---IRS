'use client';
import { FASES, LINHA, QUEM, eDesvio, estadoDe, posicao, type Prontidao } from '@/lib/fluxo';
import type { Dados, Vista } from './espaco';
import e from './espaco.module.css';

const data = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const euros = (c: number) =>
  (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

type Evento = { id: string; titulo: string; corpo: string; em: string };

/* O acompanhamento tinha duas listas desencontradas: um percurso fixo de nove
   passos e, por baixo, as atualizações reais. Agora é uma linha só — o que já
   aconteceu são os eventos verdadeiros, o que falta são os passos por vir — com
   as quatro fases em cima e, quando é a vez do cliente, o que falta e o botão
   de submeter. */
export function Acompanhamento({ dados, ir }: { dados: Dados; ir: (v: Vista) => void }) {
  const proc = (dados.processo as {
    estado: string; desde: string; submetido_em: string | null; ano: number | null;
    valor_final: number | null; sentido: string | null;
  }) || null;
  const eventos = ((dados.eventos as Evento[]) || []).slice().reverse();
  const prontidao = (dados.prontidao as Prontidao[]) || [];
  const consultas = (dados.consultas_senha as { pessoa: string; em: string }[]) || [];
  const contagens = (dados.contagens as Record<string, number>) || {};

  const estado = estadoDe(proc?.estado);
  const { indice, fase } = posicao(proc?.estado);
  const porVir = LINHA.slice(indice + 1);
  const meus = prontidao.filter((p) => p.de === 'cliente');
  const podeSubmeter = proc?.estado === 'collecting' || proc?.estado === 'returned';

  return (
    <>
      {/* 1. Onde está, de quem se espera, e desde quando. */}
      <section className={e.cartao} data-espera={estado?.espera}>
        <div className="cabeca-estado">
          <span className="selo-espera" data-espera={estado?.espera}>
            {QUEM[estado?.espera || 'cliente']}
          </span>
          <h2>{estado?.titulo || 'Processo'}</h2>
          <p>{estado?.nota}</p>
          <p className="suave">
            Neste estado desde {proc?.desde ? data(proc.desde) : '—'}
            {proc?.ano ? ` · IRS de ${proc.ano}` : ''}
          </p>
        </div>

        {/* 2. As quatro fases. É o nível, não o passo. */}
        <ol className="fases">
          {FASES.map((f) => {
            const i = FASES.findIndex((x) => x.id === fase);
            const j = FASES.findIndex((x) => x.id === f.id);
            return (
              <li key={f.id} data-estado={j < i ? 'feito' : j === i ? 'atual' : 'por-vir'}>
                <strong>{f.titulo}</strong>
                <span>{f.nota}</span>
              </li>
            );
          })}
        </ol>

        {proc?.valor_final != null && proc.sentido && (
          <p className={proc.sentido === 'refund' ? 'aviso-positivo' : 'aviso-atencao'}>
            {proc.sentido === 'refund'
              ? `Valor a reembolsar: ${euros(proc.valor_final)}`
              : `Valor a pagar: ${euros(proc.valor_final)}`}
          </p>
        )}
      </section>

      {/* 3. O que falta da parte do cliente. Submeter é pagar: o botão leva lá. */}
      {podeSubmeter && meus.length > 0 && (
        <section className={e.cartao}>
          <h2>{proc?.estado === 'returned' ? 'Para submeter outra vez' : 'Antes de submeter'}</h2>
          {proc?.estado === 'returned' && (
            <p className="aviso-atencao">
              Devolvi-lhe o processo para completar. Veja a nota no percurso, corrija o que falta e submeta outra vez.
            </p>
          )}
          <ul className="prontidao">
            {meus.map((p) => (
              <li key={p.chave} data-estado={p.estado}>
                <span className="marca-pronto" aria-hidden="true" />
                <div>
                  <strong>{p.rotulo}</strong>
                  <p className="suave">{p.detalhe}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="acoes-membro">
            <button type="button" className="btn" onClick={() => ir('pagamento')}>
              {proc?.estado === 'returned' ? 'Submeter outra vez' : 'Rever o preço e submeter'}
            </button>
          </div>
        </section>
      )}

      {/* 4. Uma linha só: o que aconteceu e o que falta acontecer. */}
      <section className={e.cartao}>
        <h2>O percurso do processo</h2>
        <ol className="percurso">
          {eventos.map((ev, i) => (
            <li key={ev.id} data-estado={i === eventos.length - 1 ? 'atual' : 'feito'}
                data-tom={eDesvio(ev.titulo) ? 'desvio' : undefined}>
              <span className="marca-passo" aria-hidden="true" />
              <div>
                <strong>{ev.titulo}</strong>
                {ev.corpo && <p>{ev.corpo}</p>}
                <p className="suave">{data(ev.em)}</p>
              </div>
            </li>
          ))}

          {eventos.length === 0 && estado && (
            <li data-estado="atual">
              <span className="marca-passo" aria-hidden="true" />
              <div>
                <strong>{estado.titulo}</strong>
                <p>{estado.nota}</p>
              </div>
            </li>
          )}

          {porVir.map((passo) => (
            <li key={passo.id} data-estado="por-vir">
              <span className="marca-passo" aria-hidden="true" />
              <div>
                <strong>{passo.titulo}</strong>
                <p>{passo.nota}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. O registo prometido onde a senha é pedida. */}
      <section className={e.cartao}>
        <h2>Consultas à senha das Finanças</h2>
        <p className="suave">
          Cada vez que uso a senha de alguém do agregado, fica aqui registado com a data e a hora.
        </p>
        {consultas.length === 0 ? (
          <div className={e.vazio}>Ainda não consultei nenhuma senha.</div>
        ) : (
          <ul className="lista-simples">
            {consultas.map((c, i) => (
              <li key={i}>{c.pessoa} — {data(c.em)}</li>
            ))}
          </ul>
        )}
        {(contagens.rendimentos != null || contagens.documentos != null) && (
          <p className="suave">
            No processo: {contagens.membros || 0} no agregado ·{' '}
            {contagens.rendimentos || 0} rendimentos · {contagens.documentos || 0} documentos.
          </p>
        )}
      </section>
    </>
  );
}
