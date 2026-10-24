'use client';

import { useState } from 'react';
import { categories, documentKinds, relations } from '@/lib/data';
import * as acoes from '@/lib/acoes';
import { usarPortal, type PropsVista } from './contexto';
import { Formulario } from './formulario';
import {
  ESTADO_DOCUMENTO, ESTADO_PAGAMENTO, ESTADO_PROCESSO,
  data, dataHora, editavel, euros, eurosDecimal, tamanho,
} from './apresentar';
import e from './portal.module.css';

const lista = <T,>(dados: PropsVista['dados'], chave: string): T[] =>
  Array.isArray(dados[chave]) ? (dados[chave] as T[]) : [];

const numero = (dados: PropsVista['dados'], chave: string) => Number(dados[chave] ?? 0);

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="vazio">
      <strong>{titulo}</strong>
      <p>{texto}</p>
    </div>
  );
}

function Bloqueado() {
  const { estado } = usarPortal();
  if (editavel(estado)) return null;
  return (
    <p className="aviso aviso-atencao">
      O processo está em <strong>{ESTADO_PROCESSO[estado]?.rotulo.toLowerCase() ?? estado}</strong>. A recolha fica
      fechada até o contabilista pedir correções.
    </p>
  );
}

// ------------------------------------------------------------------ resumo

const ETAPAS = [
  { chave: 'agregado', titulo: 'Agregado familiar', texto: 'Quem entra na declaração deste ano.' },
  { chave: 'rendimentos', titulo: 'Rendimentos', texto: 'O que recebeu em 2026, por classe.' },
  { chave: 'documentos', titulo: 'Documentos', texto: 'Os comprovativos de cada rendimento.' },
  { chave: 'revisao', titulo: 'Revisão', texto: 'O contabilista verifica e pede o que falta.' },
  { chave: 'pagamento', titulo: 'Pagamento e submissão', texto: 'Paga e eu submeto.' },
];

export function Resumo({ dados }: PropsVista) {
  const { estado, irPara } = usarPortal();
  const pessoas = numero(dados, 'pessoas');
  const rendimentos = numero(dados, 'rendimentos');
  const documentos = numero(dados, 'documentos');
  const pagamento = dados.pagamento as { state?: string; amount_cents?: number } | null;
  const progresso = dados.ultimo_progresso as { title: string; body: string; created_at: string } | null;
  const mensagem = dados.ultima_mensagem as { body: string; minha: boolean; created_at: string } | null;

  const feitos = new Set<string>();
  if (pessoas > 0) feitos.add('agregado');
  if (rendimentos > 0) feitos.add('rendimentos');
  if (documentos > 0) feitos.add('documentos');
  if (!editavel(estado)) feitos.add('revisao');
  if (pagamento?.state === 'paid') feitos.add('pagamento');
  const atual = ETAPAS.find((etapa) => !feitos.has(etapa.chave));

  return (
    <div className="pilha pilha-6">
      <div className={e.tituloVista}>
        <h1>O seu IRS de 2026</h1>
        <p>
          Está <strong>{ESTADO_PROCESSO[estado]?.rotulo.toLowerCase() ?? estado}</strong>. Tudo o que gravar fica
          guardado — pode voltar quando quiser.
        </p>
      </div>

      <div className={e.medidores}>
        {[
          ['Pessoas', pessoas],
          ['Rendimentos', rendimentos],
          ['Despesas', numero(dados, 'despesas')],
          ['Documentos', documentos],
        ].map(([rotulo, valor]) => (
          <div className={e.medidor} key={rotulo as string}>
            <span className={e.medidorValor}>{valor as number}</span>
            <span className={e.medidorRotulo}>{rotulo as string}</span>
          </div>
        ))}
      </div>

      <section className="cartao pilha pilha-4">
        <h2 className="pequeno maiusc suave">Por onde vai</h2>
        <div className={e.percurso}>
          {ETAPAS.map((etapa, indice) => {
            const estadoEtapa = feitos.has(etapa.chave) ? 'feito' : etapa === atual ? 'atual' : 'futuro';
            return (
              <div className={e.etapa} key={etapa.chave} data-estado={estadoEtapa}>
                <span className={e.etapaMarca}>{estadoEtapa === 'feito' ? '✓' : indice + 1}</span>
                <span className={e.etapaTexto}>
                  <strong>{etapa.titulo}</strong>
                  <span>{etapa.texto}</span>
                </span>
              </div>
            );
          })}
        </div>
        {atual && atual.chave !== 'revisao' && (
          <button type="button" className="btn" style={{ justifySelf: 'start' }} onClick={() => irPara(atual.chave)}>
            Continuar em {atual.titulo.toLowerCase()}
          </button>
        )}
      </section>

      <div className="grelha grelha-2">
        <section className="cartao pilha pilha-3">
          <h2 className="pequeno maiusc suave">Última atualização</h2>
          {progresso ? (
            <>
              <strong>{progresso.title}</strong>
              <p className="suave">{progresso.body}</p>
              <time className="micro tenue">{dataHora(progresso.created_at)}</time>
            </>
          ) : (
            <p className="suave">Ainda não há novidades do contabilista.</p>
          )}
          <button type="button" className="btn btn-secundario btn-sm" style={{ justifySelf: 'start' }} onClick={() => irPara('progresso')}>
            Ver andamento
          </button>
        </section>

        <section className="cartao pilha pilha-3">
          <h2 className="pequeno maiusc suave">Mensagens</h2>
          {mensagem ? (
            <>
              <p className="suave">
                {mensagem.minha ? 'Você: ' : 'Contabilista: '}
                {mensagem.body.slice(0, 160)}
                {mensagem.body.length > 160 ? '…' : ''}
              </p>
              <time className="micro tenue">{dataHora(mensagem.created_at)}</time>
            </>
          ) : (
            <p className="suave">Ainda não trocaram mensagens neste processo.</p>
          )}
          <button type="button" className="btn btn-secundario btn-sm" style={{ justifySelf: 'start' }} onClick={() => irPara('mensagens')}>
            Abrir conversa
          </button>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- agregado

type Pessoa = {
  id: string; full_name: string; birth_date: string; nif: string;
  email: string | null; tax_two_factor: boolean; relationship: string;
};

export function Agregado({ dados }: PropsVista) {
  const { estado } = usarPortal();
  const pessoas = lista<Pessoa>(dados, 'pessoas');
  const disponiveis = lista<{ id: string; full_name: string; nif: string }>(dados, 'disponiveis');
  const convites = lista<{ id: string; person_id: string; email: string; state: string }>(dados, 'convites');
  const aberto = editavel(estado);

  return (
    <div className="pilha pilha-6">
      <div className={e.tituloVista}>
        <h1>Agregado familiar</h1>
        <p>
          Quem entra na declaração de 2026. Cada pessoa fica guardada para os anos seguintes — nos próximos anos
          só precisa de a associar.
        </p>
      </div>

      <Bloqueado />

      <section className="pilha pilha-3">
        <h2 className="pequeno maiusc suave">Neste processo</h2>
        {pessoas.length === 0 ? (
          <Vazio titulo="Ainda não há ninguém" texto="Comece por adicionar o titular e, se for o caso, o cônjuge e os dependentes." />
        ) : (
          <div className={e.registos}>
            {pessoas.map((pessoa) => (
              <article className={e.registo} key={pessoa.id}>
                <div className={e.registoTexto}>
                  <strong>{pessoa.full_name}</strong>
                  <span>
                    {relations[pessoa.relationship] ?? pessoa.relationship} · NIF {pessoa.nif} · {data(pessoa.birth_date)}
                  </span>
                </div>
                <div className={e.registoAcoes}>
                  {pessoa.tax_two_factor ? (
                    <span className="etiqueta etiqueta-positivo">2FA fiscal ativo</span>
                  ) : (
                    <Formulario acao={acoes.alternarDoisFatores}>
                      {(pendente) => (
                        <>
                          <input type="hidden" name="pessoa" value={pessoa.id} />
                          <input type="hidden" name="dois_fatores" value="1" />
                          <button className="btn btn-secundario btn-sm" disabled={pendente}>
                            Marcar 2FA ativo
                          </button>
                        </>
                      )}
                    </Formulario>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {aberto && disponiveis.length > 0 && (
        <section className="cartao pilha pilha-4">
          <h2 className="pequeno maiusc suave">Reutilizar pessoa de anos anteriores</h2>
          <Formulario acao={acoes.associarPessoa} className="pilha pilha-3">
            {(pendente) => (
              <>
                <div className="grelha grelha-auto">
                  <label className="campo">
                    <span>Pessoa</span>
                    <select name="pessoa" className="entrada" required>
                      <option value="">Escolher…</option>
                      {disponiveis.map((pessoa) => (
                        <option value={pessoa.id} key={pessoa.id}>
                          {pessoa.full_name} · {pessoa.nif}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Parentesco</span>
                    <select name="parentesco" className="entrada" required>
                      {Object.entries(relations)
                        .filter(([chave]) => chave !== 'titular')
                        .map(([chave, nome]) => (
                          <option value={chave} key={chave}>
                            {nome}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <button className="btn btn-secundario" disabled={pendente} style={{ justifySelf: 'start' }}>
                  {pendente ? 'A associar…' : 'Associar a 2026'}
                </button>
              </>
            )}
          </Formulario>
        </section>
      )}

      {aberto && (
        <section className="cartao pilha pilha-4">
          <h2 className="pequeno maiusc suave">Adicionar pessoa</h2>
          <Formulario acao={acoes.adicionarPessoa} limpar className="pilha pilha-4">
            {(pendente) => (
              <>
                <div className="grelha grelha-auto">
                  <label className="campo">
                    <span>Nome completo</span>
                    <input name="nome" className="entrada" required maxLength={200} autoComplete="off" />
                  </label>
                  <label className="campo">
                    <span>Data de nascimento</span>
                    <input name="nascimento" type="date" className="entrada" required />
                  </label>
                  <label className="campo">
                    <span>NIF</span>
                    <input name="nif" className="entrada" required inputMode="numeric" pattern="[0-9]{9}" maxLength={9} />
                  </label>
                  <label className="campo">
                    <span>Parentesco</span>
                    <select name="parentesco" className="entrada" required>
                      {Object.entries(relations)
                        .filter(([chave]) => chave !== 'titular')
                        .map(([chave, nome]) => (
                          <option value={chave} key={chave}>
                            {nome}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Email (opcional)</span>
                    <input name="email" type="email" className="entrada" maxLength={254} autoComplete="off" />
                    <small>Só é preciso se quiser convidar esta pessoa para a plataforma.</small>
                  </label>
                </div>
                <label className="caixa">
                  <input type="checkbox" name="dois_fatores" />
                  <span className="pequeno">
                    Tem autenticação de dois fatores ativa no Portal das Finanças.
                    <br />
                    <span className="tenue">Se marcar, sou avisado para combinar consigo o acesso.</span>
                  </span>
                </label>
                <button className="btn" disabled={pendente} style={{ justifySelf: 'start' }}>
                  {pendente ? 'A guardar…' : 'Adicionar ao agregado'}
                </button>
              </>
            )}
          </Formulario>
        </section>
      )}

      {convites.length > 0 && (
        <section className="pilha pilha-3">
          <h2 className="pequeno maiusc suave">Convites</h2>
          <div className={e.registos}>
            {convites.map((convite) => (
              <article className={e.registo} key={convite.id}>
                <div className={e.registoTexto}>
                  <strong>{convite.email}</strong>
                  <span>{pessoas.find((p) => p.id === convite.person_id)?.full_name ?? 'Membro do agregado'}</span>
                </div>
                <span className={`etiqueta ${convite.state === 'accepted' ? 'etiqueta-positivo' : 'etiqueta-atencao'}`}>
                  {convite.state === 'accepted' ? 'Aceite' : convite.state === 'sent' ? 'Enviado' : 'Por enviar'}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
