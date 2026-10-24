'use client';

import { useMemo, useState } from 'react';
import { categories, documentKinds } from '@/lib/data';
import * as acoes from '@/lib/acoes';
import { usarPortal, type PropsVista } from './contexto';
import { Formulario } from './formulario';
import { ESTADO_DOCUMENTO, ESTADO_PROCESSO, dataHora, editavel, tamanho } from './apresentar';
import e from './portal.module.css';

const lista = <T,>(dados: PropsVista['dados'], chave: string): T[] =>
  Array.isArray(dados[chave]) ? (dados[chave] as T[]) : [];

type Rendimento = {
  id: string; title: string; category: string; person_id: string | null;
  property_id: string | null; mode: string; details: string; documentos: number;
};
type Imovel = { id: string; label: string; description: string | null };
type PessoaCurta = { id: string; full_name: string; relationship: string };

/** Nestas categorias o rendimento pertence ao imóvel, não a uma pessoa. */
const DE_IMOVEL = ['property_sale', 'property_rent'];

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

// ------------------------------------------------------------- rendimentos

export function Rendimentos({ dados }: PropsVista) {
  const { estado, irPara } = usarPortal();
  const rendimentos = lista<Rendimento>(dados, 'rendimentos');
  const imoveis = lista<Imovel>(dados, 'imoveis');
  const pessoas = lista<PessoaCurta>(dados, 'pessoas');
  const aberto = editavel(estado);

  const [categoria, definirCategoria] = useState('');
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, Rendimento[]>();
    for (const registo of rendimentos) {
      const atual = mapa.get(registo.category) ?? [];
      atual.push(registo);
      mapa.set(registo.category, atual);
    }
    return mapa;
  }, [rendimentos]);

  const deImovel = DE_IMOVEL.includes(categoria);
  const precisaPessoa = Boolean(categoria) && !deImovel && categoria !== 'deduction';

  return (
    <div className="pilha pilha-6">
      <div className={e.tituloVista}>
        <h1>Rendimentos e despesas</h1>
        <p>
          Adicione uma linha por cada classe de rendimento que teve em 2026. Pode carregar os documentos ou
          preencher os valores à mão — o que lhe der mais jeito.
        </p>
      </div>

      <Bloqueado />

      {pessoas.length === 0 && (
        <p className="aviso">
          Comece pelo agregado: os rendimentos de trabalho, pensões e recibos verdes pertencem a uma pessoa.{' '}
          <button type="button" className="btn btn-discreto btn-sm" onClick={() => irPara('agregado')}>
            Ir ao agregado
          </button>
        </p>
      )}

      {rendimentos.length === 0 ? (
        <div className="vazio">
          <strong>Ainda não registou rendimentos</strong>
          <p>Escolha abaixo a primeira classe de rendimento. Pode acrescentar mais a qualquer altura.</p>
        </div>
      ) : (
        <div className="pilha pilha-5">
          {Object.entries(categories).map(([chave, nome]) => {
            const grupo = porCategoria.get(chave);
            if (!grupo?.length) return null;
            return (
              <section className="pilha pilha-3" key={chave}>
                <h2 className="pequeno maiusc suave">{nome}</h2>
                <div className={e.registos}>
                  {grupo.map((registo) => (
                    <article className={e.registo} key={registo.id}>
                      <div className={e.registoTexto}>
                        <strong>{registo.title}</strong>
                        <span>
                          {registo.property_id
                            ? imoveis.find((imovel) => imovel.id === registo.property_id)?.label ?? 'Imóvel'
                            : pessoas.find((pessoa) => pessoa.id === registo.person_id)?.full_name ?? 'Agregado'}
                          {' · '}
                          {registo.mode === 'manual' ? 'preenchido à mão' : 'por documentos'}
                        </span>
                      </div>
                      <span className={`etiqueta ${registo.documentos ? 'etiqueta-positivo' : 'etiqueta-atencao'}`}>
                        {registo.documentos} {registo.documentos === 1 ? 'documento' : 'documentos'}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {aberto && (
        <>
          <section className="cartao pilha pilha-4">
            <h2 className="pequeno maiusc suave">Adicionar rendimento ou despesa</h2>
            <Formulario acao={acoes.adicionarRendimento} limpar className="pilha pilha-4">
              {(pendente) => (
                <>
                  <div className="grelha grelha-auto">
                    <label className="campo">
                      <span>Classe</span>
                      <select
                        name="categoria"
                        className="entrada"
                        required
                        value={categoria}
                        onChange={(evento) => definirCategoria(evento.target.value)}
                      >
                        <option value="">Escolher…</option>
                        {Object.entries(categories).map(([chave, nome]) => (
                          <option value={chave} key={chave}>
                            {nome}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="campo">
                      <span>Identificação</span>
                      <input
                        name="titulo"
                        className="entrada"
                        required
                        maxLength={200}
                        placeholder="Ex.: Vencimento na empresa X"
                      />
                    </label>

                    {precisaPessoa && (
                      <label className="campo">
                        <span>Pessoa</span>
                        <select name="pessoa" className="entrada" required>
                          <option value="">Escolher…</option>
                          {pessoas.map((pessoa) => (
                            <option value={pessoa.id} key={pessoa.id}>
                              {pessoa.full_name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {deImovel && (
                      <label className="campo">
                        <span>Imóvel</span>
                        <select name="imovel" className="entrada" required>
                          <option value="">Escolher…</option>
                          {imoveis.map((imovel) => (
                            <option value={imovel.id} key={imovel.id}>
                              {imovel.label}
                            </option>
                          ))}
                        </select>
                        <small>As rendas e as mais-valias ficam ligadas ao imóvel, não a uma pessoa.</small>
                      </label>
                    )}

                    <label className="campo">
                      <span>Como quer preencher</span>
                      <select name="modo" className="entrada" required defaultValue="documents">
                        <option value="documents">Vou carregar os documentos</option>
                        <option value="manual">Prefiro escrever os valores</option>
                      </select>
                    </label>
                  </div>

                  <label className="campo">
                    <span>Notas (opcional)</span>
                    <textarea
                      name="detalhes"
                      className="entrada"
                      maxLength={10000}
                      placeholder="Valores, retenções, o que achar útil eu saber."
                    />
                  </label>

                  <button className="btn" disabled={pendente || !categoria} style={{ justifySelf: 'start' }}>
                    {pendente ? 'A guardar…' : 'Guardar rendimento'}
                  </button>
                </>
              )}
            </Formulario>
          </section>

          <section className="cartao pilha pilha-4">
            <h2 className="pequeno maiusc suave">Imóveis</h2>
            <p className="pequeno suave">
              Crie um imóvel por cada casa arrendada ou vendida. Depois associa-lhe as rendas ou a mais-valia.
            </p>
            {imoveis.length > 0 && (
              <div className={e.registos}>
                {imoveis.map((imovel) => (
                  <article className={e.registo} key={imovel.id}>
                    <div className={e.registoTexto}>
                      <strong>{imovel.label}</strong>
                      {imovel.description && <span>{imovel.description}</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
            <Formulario acao={acoes.adicionarImovel} limpar className="pilha pilha-3">
              {(pendente) => (
                <>
                  <div className="grelha grelha-auto">
                    <label className="campo">
                      <span>Nome</span>
                      <input name="etiqueta" className="entrada" required maxLength={100} placeholder="Imóvel 1" />
                    </label>
                    <label className="campo">
                      <span>Morada ou nota (opcional)</span>
                      <input name="descricao" className="entrada" maxLength={1000} />
                    </label>
                  </div>
                  <button className="btn btn-secundario" disabled={pendente} style={{ justifySelf: 'start' }}>
                    {pendente ? 'A guardar…' : 'Adicionar imóvel'}
                  </button>
                </>
              )}
            </Formulario>
          </section>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------- documentos

type Documento = {
  id: string; kind: string; file_name: string; state: string; income_id: string | null;
  file_size: number; created_at: string; meu: boolean; rendimento: string | null; category: string | null;
};

export function Documentos({ dados }: PropsVista) {
  const { estado, gabinete } = usarPortal();
  const documentos = lista<Documento>(dados, 'documentos');
  const rendimentos = lista<{ id: string; title: string; category: string }>(dados, 'rendimentos');
  const aberto = editavel(estado);

  const [rendimento, definirRendimento] = useState('');
  const categoria = rendimentos.find((registo) => registo.id === rendimento)?.category;
  const tipos = categoria ? documentKinds[categoria] ?? [] : [];

  return (
    <div className="pilha pilha-6">
      <div className={e.tituloVista}>
        <h1>Documentos</h1>
        <p>
          PDF, JPEG ou PNG até 10 MB. Se enviar duas vezes o mesmo ficheiro, ele é reconhecido e conta como um só.
        </p>
      </div>

      <Bloqueado />

      {aberto && (
        <section className="cartao pilha pilha-4">
          <h2 className="pequeno maiusc suave">Carregar documento</h2>
          {rendimentos.length === 0 ? (
            <p className="suave">Registe primeiro um rendimento para lhe associar documentos.</p>
          ) : (
            <Formulario acao={acoes.enviarDocumento} limpar className="pilha pilha-4">
              {(pendente) => (
                <>
                  <div className="grelha grelha-auto">
                    <label className="campo">
                      <span>Rendimento</span>
                      <select
                        name="rendimento"
                        className="entrada"
                        required
                        value={rendimento}
                        onChange={(evento) => definirRendimento(evento.target.value)}
                      >
                        <option value="">Escolher…</option>
                        {rendimentos.map((registo) => (
                          <option value={registo.id} key={registo.id}>
                            {registo.title} · {categories[registo.category]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="campo">
                      <span>Tipo de documento</span>
                      <select name="tipo" className="entrada" required disabled={!tipos.length}>
                        <option value="">{tipos.length ? 'Escolher…' : 'Escolha o rendimento primeiro'}</option>
                        {tipos.map((tipo) => (
                          <option value={tipo} key={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="campo">
                      <span>Ficheiro</span>
                      <input
                        name="ficheiro"
                        type="file"
                        className="entrada"
                        required
                        accept="application/pdf,image/jpeg,image/png"
                      />
                    </label>
                  </div>
                  <button className="btn" disabled={pendente || !rendimento} style={{ justifySelf: 'start' }}>
                    {pendente ? 'A enviar…' : 'Enviar documento'}
                  </button>
                </>
              )}
            </Formulario>
          )}
        </section>
      )}

      {documentos.length === 0 ? (
        <div className="vazio">
          <strong>Sem documentos</strong>
          <p>Assim que carregar o primeiro ficheiro, ele aparece aqui com o estado da revisão.</p>
        </div>
      ) : (
        <div className={e.registos}>
          {documentos.map((documento) => (
            <article className={e.registo} key={documento.id}>
              <div className={e.registoTexto}>
                <strong>{documento.file_name}</strong>
                <span>
                  {documento.kind}
                  {documento.rendimento ? ` · ${documento.rendimento}` : ''} · {tamanho(documento.file_size)} ·{' '}
                  {dataHora(documento.created_at)}
                </span>
              </div>
              <div className={e.registoAcoes}>
                <span className={`etiqueta ${ESTADO_DOCUMENTO[documento.state]?.classe ?? ''}`}>
                  {ESTADO_DOCUMENTO[documento.state]?.rotulo ?? documento.state}
                </span>
                <Formulario acao={acoes.abrirDocumento}>
                  {(pendente) => (
                    <>
                      <input type="hidden" name="documento" value={documento.id} />
                      <button className="btn btn-secundario btn-sm" disabled={pendente}>
                        Abrir
                      </button>
                    </>
                  )}
                </Formulario>
                {gabinete && documento.state === 'uploaded' && (
                  <Formulario acao={acoes.marcarDocumento}>
                    {(pendente) => (
                      <>
                        <input type="hidden" name="documento" value={documento.id} />
                        <input type="hidden" name="estado" value="reviewed" />
                        <button className="btn btn-sm" disabled={pendente}>
                          Validar
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
    </div>
  );
}
