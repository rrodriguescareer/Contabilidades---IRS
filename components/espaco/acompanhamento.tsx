'use client';
import { useState, useTransition } from 'react';
import { submeterProcesso } from '@/lib/acoes-espaco';
import { FASES, LINHA, QUEM, eDesvio, estadoDe, posicao, type Prontidao } from '@/lib/fluxo';
import type { Dados } from './espaco';
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
export function Acompanhamento({ dados, processo }: { dados: Dados; processo: string }) {
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

      {/* 3. O que falta da parte do cliente, e a submissão. */}
      {meus.length > 0 && (
        <ParaSubmeter
          processo={processo}
          itens={meus}
          podeSubmeter={podeSubmeter}
          devolvido={proc?.estado === 'returned'}
        />
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

/* A lista de prontidão é a mesma que eu vejo no gabinete. Aqui serve para o
   cliente saber exactamente o que o separa de submeter. */
function ParaSubmeter({
  processo, itens, podeSubmeter, devolvido,
}: { processo: string; itens: Prontidao[]; podeSubmeter: boolean; devolvido: boolean }) {
  const [erro, setErro] = useState<string | null>(null);
  const [faltas, setFaltas] = useState<string[]>([]);
  const [feito, setFeito] = useState(false);
  const [aEnviar, enviar] = useTransition();

  const bloqueios = itens.filter((p) => p.bloqueia && p.estado === 'falta');

  const submeter = () =>
    enviar(async () => {
      setErro(null); setFaltas([]);
      const r = await submeterProcesso(processo);
      if (!r.ok) {
        setErro(r.erro || 'Não foi possível submeter.');
        setFaltas(r.faltas || []);
        return;
      }
      setFeito(true);
    });

  return (
    <section className={e.cartao}>
      <h2>{podeSubmeter ? 'Antes de submeter' : 'A sua parte do processo'}</h2>
      {devolvido && (
        <p className="aviso-atencao">
          Devolvi-lhe o processo para completar. Veja a nota no percurso, corrija o que falta e
          submeta outra vez.
        </p>
      )}

      <ul className="prontidao">
        {itens.map((p) => (
          <li key={p.chave} data-estado={p.estado}>
            <span className="marca-pronto" aria-hidden="true" />
            <div>
              <strong>{p.rotulo}</strong>
              <p className="suave">{p.detalhe}</p>
            </div>
          </li>
        ))}
      </ul>

      {podeSubmeter && (
        <>
          {bloqueios.length > 0 ? (
            <p className="aviso-atencao">
              Falta {bloqueios.map((b) => b.rotulo.toLowerCase()).join(', ')} para poder submeter.
            </p>
          ) : (
            <p className="suave">
              Ao submeter, o processo entra na minha fila e deixa de poder ser alterado até eu o
              devolver ou aceitar.
            </p>
          )}
          {erro && (
            <p className="aviso-critico">
              {erro}
              {faltas.length > 0 ? ` Em falta: ${faltas.join(', ')}.` : ''}
            </p>
          )}
          {feito && <p className="aviso-positivo">Processo submetido. Aviso-o quando o aceitar.</p>}
          <div className="acoes-membro">
            <button
              type="button"
              className="btn"
              disabled={aEnviar || bloqueios.length > 0 || feito}
              onClick={submeter}
            >
              {aEnviar ? 'A submeter…' : 'Submeter o processo'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
