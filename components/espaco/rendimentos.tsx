'use client';
import { useMemo, useState, useTransition } from 'react';
import {
  guardarDeducoes, guardarImovel, guardarNota, guardarRendimento, removerRendimento,
} from '@/lib/acoes-espaco';
import { AMBITOS, DEDUCOES, SEPARADORES, type Separador, temIdadeParaIrsJovem } from './separadores';
import { EnvioDocumento, type Documento } from './documentos';
import type { Dados } from './espaco';
import { emRecolha } from '@/lib/fluxo';
import e from './espaco.module.css';

type Membro = { id: string; nome: string; nascimento: string | null; relacao: string };
type Imovel = { id: string; nome: string; tipo: string };
type Rendimento = {
  id: string; categoria: string; tipo: string | null; titulo: string;
  titular: string | null; imovel: string | null; valor: number | null; nota: string;
  irs_jovem: boolean; estuda_trabalha: boolean; ambito: string | null;
  compra_em: string | null; venda_em: string | null;
  compra: number | null; venda: number | null; despesas: number | null;
  hpp: boolean; hpp_credito: number | null; hpp_feito: boolean;
};

const euros = (c: number | null) =>
  c == null ? '—' : (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

/* As mais-valias de ações e o separador dos capitais partilham a mesma
   categoria na base de dados. Distinguem-se por terem, ou não, data de venda. */
const pertence = (r: Rendimento, s: Separador) => {
  if (s.id === 'capital') return r.categoria === 'securities' && !r.venda_em;
  if (s.id === 'securities_sale') return r.categoria === 'securities' && !!r.venda_em;
  return r.categoria === s.categoria;
};

export function Rendimentos({
  dados, conta, processo, estado, aoMudar,
}: {
  dados: Dados; conta: string; processo: string; estado: string; aoMudar: () => void;
}) {
  const [aba, setAba] = useState<string>(SEPARADORES[0].id);
  const membros = (dados.membros as Membro[]) || [];
  const imoveis = (dados.imoveis as Imovel[]) || [];
  const rendimentos = (dados.rendimentos as Rendimento[]) || [];
  const notas = (dados.notas as Record<string, string>) || {};
  const aberto = emRecolha(estado);

  const separador = useMemo(() => SEPARADORES.find((s) => s.id === aba), [aba]);

  return (
    <>
      <div className={e.abas} role="tablist">
        {SEPARADORES.map((s) => (
          <button key={s.id} role="tab" className={e.aba} aria-selected={s.id === aba}
                  onClick={() => setAba(s.id)} type="button">
            {s.titulo}
          </button>
        ))}
        <button role="tab" className={e.aba} aria-selected={aba === DEDUCOES.id}
                onClick={() => setAba(DEDUCOES.id)} type="button">
          {DEDUCOES.titulo}
        </button>
      </div>

      {!aberto && (
        <p className="aviso-atencao">
          O processo já foi submetido: a recolha está fechada. Fale comigo nas mensagens se faltar alguma coisa.
        </p>
      )}

      {separador ? (
        <Aba separador={separador} conta={conta} processo={processo} membros={membros} imoveis={imoveis}
             documentos={(dados.documentos as Documento[]) || []}
             rendimentos={rendimentos.filter((r) => pertence(r, separador))}
             nota={notas[separador.categoria] || ''} aberto={aberto} aoMudar={aoMudar} />
      ) : (
        <Deducoes dados={dados} conta={conta} processo={processo} membros={membros}
                  nota={notas.deduction || ''} aberto={aberto} aoMudar={aoMudar} />
      )}
    </>
  );
}

function Aba({
  separador, conta, processo, membros, imoveis, documentos, rendimentos, nota, aberto, aoMudar,
}: {
  separador: Separador; conta: string; processo: string; membros: Membro[]; imoveis: Imovel[];
  documentos: Documento[]; rendimentos: Rendimento[]; nota: string;
  aberto: boolean; aoMudar: () => void;
}) {
  const [novo, setNovo] = useState(false);
  const meus = separador.porImovel
    ? imoveis.filter((i) => i.tipo === (separador.maisValias ? 'sale' : 'rent'))
    : [];

  return (
    <>
      <section className={e.cartao}>
        <h2>{separador.titulo}</h2>
        <p className="suave">{separador.ajuda}</p>

        {separador.porImovel && (
          <Imoveis processo={processo} tipo={separador.maisValias ? 'sale' : 'rent'}
                   imoveis={meus} aberto={aberto} aoMudar={aoMudar} />
        )}

        {rendimentos.length === 0 && (
          <div className={e.vazio}>Ainda não há nada neste separador.</div>
        )}

        {rendimentos.map((r) => (
          <div key={r.id} className="linha-membro">
            <div>
              <strong>{r.tipo || r.titulo}</strong>
              <p className="suave">
                {membros.find((m) => m.id === r.titular)?.nome || 'Sem titular'}
                {r.imovel ? ` · ${imoveis.find((i) => i.id === r.imovel)?.nome || 'Imóvel'}` : ''}
                {r.valor != null ? ` · ${euros(r.valor)}` : ''}
                {r.venda_em ? ` · vendido em ${new Date(r.venda_em).toLocaleDateString('pt-PT')}` : ''}
              </p>
              {r.irs_jovem && <p className="suave">IRS Jovem</p>}
              {r.nota && <p className="suave">{r.nota}</p>}
            </div>
            {aberto && (
              <button type="button" className="btn btn-texto"
                      onClick={async () => {
                        if (!confirm('Remover este rendimento?')) return;
                        const x = await removerRendimento(processo, r.id);
                        if (x.ok) aoMudar(); else alert(x.erro);
                      }}>
                Remover
              </button>
            )}
          </div>
        ))}

        {aberto &&
          (novo ? (
            <FormularioRendimento separador={separador} processo={processo} membros={membros}
                                  imoveis={meus} aoFechar={() => setNovo(false)} aoMudar={aoMudar} />
          ) : (
            <button type="button" className="btn btn-secundario" onClick={() => setNovo(true)}
                    disabled={separador.porImovel && meus.length === 0}>
              Adicionar rendimento
            </button>
          ))}
        {separador.porImovel && meus.length === 0 && (
          <p className="suave">Adicione primeiro um imóvel.</p>
        )}
      </section>

      <section className={e.cartao}>
        <h2>Documentos</h2>
        <p className="suave">{separador.documentos.nota}</p>
        {(() => {
          const meus = documentos.filter((d) => d.categoria === separador.categoria);
          return meus.length === 0 ? (
            <div className={e.vazio}>Ainda não enviou documentos neste separador.</div>
          ) : (
            meus.map((d) => (
              <div key={d.id} className="linha-membro">
                <div>
                  <strong>{d.tipo}</strong>
                  <p className="suave">{d.descricao || d.nome}</p>
                </div>
              </div>
            ))
          );
        })()}
        <EnvioDocumento conta={conta} processo={processo} categoria={separador.categoria}
                        tipos={separador.documentos.tipos}
                        imoveis={separador.porImovel ? meus : undefined}
                        aberto={aberto} aoEnviar={aoMudar} />
      </section>

      <Nota processo={processo} aba={separador.categoria} inicial={nota} aberto={aberto} />
    </>
  );
}

function Imoveis({
  processo, tipo, imoveis, aberto, aoMudar,
}: { processo: string; tipo: string; imoveis: Imovel[]; aberto: boolean; aoMudar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="bloco-imoveis">
      <h3>Imóveis</h3>
      {imoveis.length === 0 && <p className="suave">Nenhum imóvel adicionado.</p>}
      <ul className="lista-simples">
        {imoveis.map((i) => <li key={i.id}>{i.nome}</li>)}
      </ul>
      {aberto && (
        <form action={async (form) => {
          form.set('tipo', tipo);
          const r = await guardarImovel(processo, form);
          if (r.ok) aoMudar(); else setErro(r.erro || 'Não foi possível guardar.');
        }}>
          <label>
            Nome do imóvel
            <input name="nome" required maxLength={100} placeholder="Ex.: Apartamento da Maia" />
          </label>
          {erro && <p className="aviso-critico">{erro}</p>}
          <button type="submit" className="btn btn-secundario">Adicionar imóvel</button>
        </form>
      )}
    </div>
  );
}

function FormularioRendimento({
  separador, processo, membros, imoveis, aoFechar, aoMudar,
}: {
  separador: Separador; processo: string; membros: Membro[]; imoveis: Imovel[];
  aoFechar: () => void; aoMudar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [titular, setTitular] = useState(membros[0]?.id || '');
  const [hpp, setHpp] = useState(false);
  const [aGuardar, comecar] = useTransition();

  const pessoa = membros.find((m) => m.id === titular);
  const mostraIrsJovem =
    separador.interruptores.includes('irs_jovem') && temIdadeParaIrsJovem(pessoa?.nascimento);
  const mostraEstuda =
    separador.interruptores.includes('estuda_trabalha') && pessoa?.relacao === 'descendente';

  return (
    <form className="form-membro" action={(form) => comecar(async () => {
      setErro(null);
      form.set('categoria', separador.categoria);
      const r = await guardarRendimento(processo, form);
      if (!r.ok) { setErro(r.erro || 'Não foi possível guardar.'); return; }
      aoMudar(); aoFechar();
    })}>
      <label>
        Titular
        <select name="titular" value={titular} onChange={(ev) => setTitular(ev.target.value)} required>
          <option value="" disabled>Escolher</option>
          {membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </label>

      {separador.porImovel && (
        <label>
          Imóvel
          <select name="imovel" required>
            <option value="" disabled>Escolher</option>
            {imoveis.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
        </label>
      )}

      {separador.porAmbito ? (
        <label>
          Tipo de rendimento
          <select name="ambito" required>
            <option value="" disabled>Escolher</option>
            {AMBITOS.map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
          </select>
        </label>
      ) : (
        <label>
          Tipo
          <select name="tipo" required>
            <option value="" disabled>Escolher</option>
            {separador.tipos.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
      )}

      <label>
        Descrição
        <input name="titulo" maxLength={200} placeholder="Opcional" />
      </label>

      {!separador.maisValias && (
        <label>
          Valor (opcional)
          <input name="valor" inputMode="decimal" placeholder="0,00" />
        </label>
      )}

      {separador.maisValias && (
        <>
          <label>Data de compra<input type="date" name="compra_em" required /></label>
          <label>Data de venda<input type="date" name="venda_em" required /></label>
          <label>Valor de compra<input name="compra" inputMode="decimal" required /></label>
          <label>Valor de venda<input name="venda" inputMode="decimal" required /></label>
          <label>Despesas (opcional)<input name="despesas" inputMode="decimal" /></label>
        </>
      )}

      {separador.reinvestimento && (
        <>
          <label className="interruptor">
            <input type="checkbox" name="hpp" checked={hpp} onChange={(ev) => setHpp(ev.target.checked)} />
            Reinvestimento em habitação própria permanente
          </label>
          {hpp && (
            <>
              <label>
                Crédito à habitação amortizado na venda
                <input name="hpp_credito" inputMode="decimal" />
              </label>
              <label className="interruptor">
                <input type="checkbox" name="hpp_feito" />
                Reinvestimento já realizado
              </label>
            </>
          )}
        </>
      )}

      {mostraIrsJovem && (
        <label className="interruptor">
          <input type="checkbox" name="irs_jovem" /> IRS Jovem
        </label>
      )}
      {mostraEstuda && (
        <label className="interruptor">
          <input type="checkbox" name="estuda_trabalha" /> Estuda e trabalha
        </label>
      )}

      <label>
        Nota (opcional)
        <textarea name="nota" rows={2} maxLength={10000} />
      </label>

      {erro && <p className="aviso-critico">{erro}</p>}
      <div className="acoes-membro">
        <button type="submit" className="btn" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : 'Guardar'}
        </button>
        <button type="button" className="btn btn-texto" onClick={aoFechar}>Cancelar</button>
      </div>
    </form>
  );
}

function Nota({ processo, aba, inicial, aberto }:
  { processo: string; aba: string; inicial: string; aberto: boolean }) {
  const [corpo, setCorpo] = useState(inicial);
  const [estado, setEstado] = useState<'' | 'a guardar' | 'guardada'>('');
  return (
    <section className={e.cartao}>
      <h2>Notas</h2>
      <p className="suave">Contexto, informação adicional, o que achar útil eu saber.</p>
      <textarea rows={4} maxLength={5000} value={corpo} disabled={!aberto}
                onChange={(ev) => { setCorpo(ev.target.value); setEstado(''); }} />
      {aberto && (
        <div className="acoes-membro">
          <button type="button" className="btn btn-secundario"
                  onClick={async () => {
                    setEstado('a guardar');
                    const r = await guardarNota(processo, aba, corpo);
                    setEstado(r.ok ? 'guardada' : '');
                  }}>
            Guardar nota
          </button>
          {estado && <span className="suave">{estado === 'guardada' ? 'Guardada.' : 'A guardar…'}</span>}
        </div>
      )}
    </section>
  );
}

function Deducoes({
  dados, conta, processo, membros, nota, aberto, aoMudar,
}: {
  dados: Dados; conta: string; processo: string; membros: Membro[]; nota: string;
  aberto: boolean; aoMudar: () => void;
}) {
  const atual = (dados.deducoes as Record<string, unknown>) || {};
  const [arrendado, setArrendado] = useState(Boolean(atual.rented_home));
  const [recibos, setRecibos] = useState(atual.rent_receipts !== false);
  const [ppr, setPpr] = useState(Boolean(atual.ppr));
  const [erro, setErro] = useState<string | null>(null);

  return (
    <>
      <section className={e.cartao}>
        <h2>{DEDUCOES.titulo}</h2>
        <p className="suave">{DEDUCOES.ajuda}</p>
        <form className="form-membro" action={async (form) => {
          const r = await guardarDeducoes(processo, form);
          if (r.ok) aoMudar(); else setErro(r.erro || 'Não foi possível guardar.');
        }}>
          <label className="interruptor">
            <input type="checkbox" name="use_efatura" defaultChecked={atual.use_efatura !== false} />
            Considerar as despesas registadas no e-fatura
          </label>

          <label className="interruptor">
            <input type="checkbox" name="rented_home" checked={arrendado}
                   onChange={(ev) => setArrendado(ev.target.checked)} />
            Vivo em imóvel arrendado
          </label>
          {arrendado && (
            <div className="bloco-encadeado">
              <label className="interruptor">
                <input type="checkbox" name="contract_reported"
                       defaultChecked={Boolean(atual.contract_reported)} />
                O contrato está comunicado no Portal das Finanças
              </label>
              <label className="interruptor">
                <input type="checkbox" name="rent_receipts" checked={recibos}
                       onChange={(ev) => setRecibos(ev.target.checked)} />
                Recebo recibos de renda eletrónicos
              </label>
              {!recibos && (
                <label className="interruptor">
                  <input type="checkbox" name="landlord_invoices"
                         defaultChecked={Boolean(atual.landlord_invoices)} />
                  O senhorio emite faturas normais
                </label>
              )}
            </div>
          )}

          <label className="interruptor">
            <input type="checkbox" name="ppr" checked={ppr} onChange={(ev) => setPpr(ev.target.checked)} />
            PPR (Plano Poupança-Reforma)
          </label>
          {ppr && (
            <div className="bloco-encadeado">
              <label>
                Titular do PPR
                <select name="ppr_person_id" defaultValue={String(atual.ppr_person_id || '')} required>
                  <option value="" disabled>Escolher</option>
                  {membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </label>
              <p className="suave">O comprovativo é obrigatório.</p>
            </div>
          )}

          <label className="interruptor">
            <input type="checkbox" name="ascendant_expenses"
                   defaultChecked={Boolean(atual.ascendant_expenses)} />
            Despesas com ascendentes
          </label>

          {erro && <p className="aviso-critico">{erro}</p>}
          {aberto && <button type="submit" className="btn">Guardar</button>}
        </form>
      </section>

      <section className={e.cartao}>
        <h2>Documentos</h2>
        <p className="suave">{DEDUCOES.documentos.nota}</p>
        <EnvioDocumento conta={conta} processo={processo} categoria="deduction"
                        tipos={DEDUCOES.documentos.tipos} aberto={aberto} aoEnviar={aoMudar} />
      </section>

      <Nota processo={processo} aba="deduction" inicial={nota} aberto={aberto} />
    </>
  );
}
