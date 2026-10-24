'use client';

import { useEffect, useState, useTransition } from 'react';
import { states } from '@/lib/data';
import * as acoes from '@/lib/acoes';
import { beginCheckout } from '@/lib/checkout-actions';
import { usarPortal, type PropsVista } from './contexto';
import { Formulario } from './formulario';
import { ESTADO_PAGAMENTO, ESTADO_PROCESSO, dataHora, editavel, euros, eurosDecimal } from './apresentar';
import e from './portal.module.css';

const lista = <T,>(dados: PropsVista['dados'], chave: string): T[] =>
  Array.isArray(dados[chave]) ? (dados[chave] as T[]) : [];

// --------------------------------------------------------------- mensagens

type Mensagem = { id: string; body: string; minha: boolean; created_at: string };

export function Mensagens({ dados }: PropsVista) {
  const { gabinete } = usarPortal();
  // A base devolve as mais recentes primeiro; na conversa lemos de cima para baixo.
  const mensagens = [...lista<Mensagem>(dados, 'mensagens')].reverse();

  return (
    <div className="pilha pilha-5">
      <div className={e.tituloVista}>
        <h1>Mensagens</h1>
        <p>
          {gabinete
            ? 'Conversa deste processo. O cliente recebe aqui o que escrever.'
            : 'Fale diretamente comigo sobre este processo. Fica tudo registado.'}
        </p>
      </div>

      {mensagens.length === 0 ? (
        <div className="vazio">
          <strong>Ainda sem mensagens</strong>
          <p>Escreva a primeira. Respondo assim que puder.</p>
        </div>
      ) : (
        <div className={e.conversa}>
          {mensagens.map((mensagem) => (
            <article className={`${e.balao} ${mensagem.minha ? e.balaoMeu : ''}`} key={mensagem.id}>
              <p>{mensagem.body}</p>
              <time dateTime={mensagem.created_at}>{dataHora(mensagem.created_at)}</time>
            </article>
          ))}
        </div>
      )}

      <Formulario acao={acoes.enviarMensagem} limpar className={`${e.escrever} pilha pilha-3`}>
        {(pendente) => (
          <>
            <label className="campo">
              <span className="so-leitor">Mensagem</span>
              <textarea
                name="corpo"
                className="entrada"
                required
                maxLength={5000}
                rows={3}
                placeholder="Escreva aqui…"
              />
            </label>
            <button className="btn" disabled={pendente} style={{ justifySelf: 'start' }}>
              {pendente ? 'A enviar…' : 'Enviar mensagem'}
            </button>
          </>
        )}
      </Formulario>
    </div>
  );
}

// ---------------------------------------------------------------- andamento

type Evento = { id: string; title: string; body: string; created_at: string };

export function Progresso({ dados }: PropsVista) {
  const { gabinete, estado } = usarPortal();
  const eventos = lista<Evento>(dados, 'eventos');

  return (
    <div className="pilha pilha-6">
      <div className={e.tituloVista}>
        <h1>Andamento</h1>
        <p>
          {gabinete
            ? 'Publique aqui o que o cliente deve saber. Cada publicação pode mudar o estado do processo.'
            : 'O histórico do que já aconteceu com a sua declaração.'}
        </p>
      </div>

      {gabinete && (
        <section className="cartao pilha pilha-4">
          <h2 className="pequeno maiusc suave">Publicar atualização</h2>
          <Formulario acao={acoes.publicarProgresso} limpar className="pilha pilha-4">
            {(pendente) => (
              <>
                <div className="grelha grelha-auto">
                  <label className="campo">
                    <span>Título</span>
                    <input name="titulo" className="entrada" required maxLength={200} />
                  </label>
                  <label className="campo">
                    <span>Novo estado</span>
                    <select name="estado" className="entrada" required defaultValue={estado}>
                      {Object.entries(states).map(([chave, nome]) => (
                        <option value={chave} key={chave}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="campo">
                  <span>Texto para o cliente</span>
                  <textarea name="corpo" className="entrada" required maxLength={5000} rows={3} />
                </label>
                <button className="btn" disabled={pendente} style={{ justifySelf: 'start' }}>
                  {pendente ? 'A publicar…' : 'Publicar'}
                </button>
              </>
            )}
          </Formulario>
        </section>
      )}

      {eventos.length === 0 ? (
        <div className="vazio">
          <strong>Sem registos</strong>
          <p>Assim que houver novidades sobre o processo, aparecem aqui.</p>
        </div>
      ) : (
        <div className={e.registos}>
          {eventos.map((evento) => (
            <article className={`${e.registo} pilha pilha-2`} key={evento.id} style={{ display: 'grid' }}>
              <strong>{evento.title}</strong>
              <p className="suave">{evento.body}</p>
              <time className="micro tenue" dateTime={evento.created_at}>
                {dataHora(evento.created_at)}
              </time>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- pagamento

type Tentativa = {
  id: string; state: string; amount_cents: number; discount_cents: number;
  checkout_url: string | null; paid_at: string | null; created_at: string;
};
type Fatura = {
  id: string; reference: string; issued_at: string; due_at: string | null;
  total: number | string; currency: string; pago: number | string;
};

export function Pagamento({ dados }: PropsVista) {
  const { alvo, gabinete, estado } = usarPortal();
  const tentativas = lista<Tentativa>(dados, 'tentativas');
  const faturas = lista<Fatura>(dados, 'faturas');

  const [codigo, definirCodigo] = useState('');
  const [orcamento, definirOrcamento] = useState<acoes.Orcamento | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [aCalcular, calcular] = useTransition();

  const pedirOrcamento = (cupao: string) => {
    if (!alvo.processo) return;
    calcular(async () => {
      const resposta = await acoes.calcularOrcamento(alvo.conta, alvo.processo!, cupao);
      definirOrcamento(resposta.orcamento);
      definirErro(resposta.erro ?? null);
    });
  };

  // Primeiro cálculo assim que o separador abre.
  useEffect(() => {
    pedirOrcamento('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo.processo]);

  const pago = tentativas.some((tentativa) => tentativa.state === 'paid');

  return (
    <div className="pilha pilha-6">
      <div className={e.tituloVista}>
        <h1>Pagamento</h1>
        <p>
          O preço é calculado a partir do que registou. Vê as rubricas todas antes de confirmar — nada é cobrado
          sem o seu aceite.
        </p>
      </div>

      {pago && (
        <p className="aviso aviso-positivo">
          Este processo está pago. Vou tratar da submissão e aviso-o no andamento.
        </p>
      )}

      {!pago && !gabinete && (
        <section className="cartao pilha pilha-5">
          <h2 className="pequeno maiusc suave">O seu orçamento</h2>

          {erro && <p className="aviso aviso-critico">{erro}</p>}

          {orcamento ? (
            <>
              <div className="pilha pilha-2">
                {orcamento.items.map((rubrica) => (
                  <div className="linha-entre" key={rubrica.code}>
                    <span className="suave">{rubrica.label}</span>
                    <strong className="numero sem-quebra">{euros(rubrica.amount_cents)}</strong>
                  </div>
                ))}
                {orcamento.discount_cents > 0 && (
                  <div className="linha-entre" style={{ color: 'var(--positivo)' }}>
                    <span>Desconto {orcamento.discount_code ? `· ${orcamento.discount_code}` : ''}</span>
                    <strong className="numero sem-quebra">− {euros(orcamento.discount_cents)}</strong>
                  </div>
                )}
              </div>

              <div
                className="linha-entre"
                style={{ borderBlockStart: '1px solid var(--linha)', paddingBlockStart: 'var(--e-4)' }}
              >
                <strong>Total com IVA</strong>
                <strong className="numero" style={{ fontSize: 'var(--t-2xl)', letterSpacing: '-.03em' }}>
                  {euros(orcamento.total_cents)}
                </strong>
              </div>

              <div className="linha" style={{ alignItems: 'flex-end' }}>
                <label className="campo cresce">
                  <span>Código de desconto</span>
                  <input
                    className="entrada"
                    value={codigo}
                    maxLength={40}
                    onChange={(evento) => definirCodigo(evento.target.value.toUpperCase())}
                    placeholder="Se tiver um"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-secundario"
                  disabled={aCalcular}
                  onClick={() => pedirOrcamento(codigo)}
                >
                  {aCalcular ? 'A calcular…' : 'Aplicar'}
                </button>
              </div>

              {editavel(estado) && (
                <p className="aviso aviso-atencao">
                  O processo ainda está aberto para recolha. Confirme que não falta nada antes de pagar.
                </p>
              )}

              <form action={beginCheckout} className="pilha pilha-4">
                <input type="hidden" name="account" value={alvo.conta} />
                <input type="hidden" name="process" value={alvo.processo ?? ''} />
                <input type="hidden" name="coupon" value={codigo} />
                <input type="hidden" name="expected_total" value={orcamento.total_cents} />
                <label className="caixa">
                  <input type="checkbox" name="confirmed" required />
                  <span className="pequeno">
                    Confirmo que os dados, os rendimentos e os documentos estão completos e que aceito o preço de{' '}
                    <strong>{euros(orcamento.total_cents)}</strong>.
                  </span>
                </label>
                <button className="btn btn-lg" style={{ justifySelf: 'start' }}>
                  Pagar e submeter
                </button>
                <p className="micro tenue">
                  O pagamento é feito na Revolut: cartão, Apple Pay, Google Pay ou conta Revolut.
                </p>
              </form>
            </>
          ) : (
            <div className="pilha pilha-2" aria-hidden="true">
              {[0, 1, 2].map((indice) => (
                <span className="esqueleto" key={indice} style={{ blockSize: '1.5rem' }} />
              ))}
            </div>
          )}
        </section>
      )}

      {tentativas.length > 0 && (
        <section className="pilha pilha-3">
          <h2 className="pequeno maiusc suave">Tentativas de pagamento</h2>
          <div className={e.registos}>
            {tentativas.map((tentativa) => (
              <article className={e.registo} key={tentativa.id}>
                <div className={e.registoTexto}>
                  <strong className="numero">{euros(tentativa.amount_cents)}</strong>
                  <span>{dataHora(tentativa.paid_at ?? tentativa.created_at)}</span>
                </div>
                <span className={`etiqueta ${ESTADO_PAGAMENTO[tentativa.state]?.classe ?? ''}`}>
                  {ESTADO_PAGAMENTO[tentativa.state]?.rotulo ?? tentativa.state}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {faturas.length > 0 && (
        <section className="pilha pilha-3">
          <h2 className="pequeno maiusc suave">Faturas</h2>
          <div className={e.registos}>
            {faturas.map((fatura) => (
              <article className={e.registo} key={fatura.id}>
                <div className={e.registoTexto}>
                  <strong>{fatura.reference}</strong>
                  <span>Emitida em {dataHora(fatura.issued_at)}</span>
                </div>
                <div className={e.registoAcoes}>
                  <strong className="numero">{eurosDecimal(fatura.total)}</strong>
                  <span
                    className={`etiqueta ${Number(fatura.pago) >= Number(fatura.total) ? 'etiqueta-positivo' : 'etiqueta-atencao'}`}
                  >
                    {Number(fatura.pago) >= Number(fatura.total) ? 'Paga' : 'Por pagar'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
