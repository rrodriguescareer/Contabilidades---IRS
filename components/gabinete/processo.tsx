'use client';
import { useActionState, useEffect, useRef } from 'react';
import { enviarMensagem } from '@/lib/acoes';
import { SEPARADORES, DEDUCOES } from '@/components/espaco/separadores';
import { ESTADOS, PAGAMENTOS } from './estados';
import { Avanco } from './avanco';
import { TestesCegid } from './integracoes';
import e from './gabinete.module.css';

type Dados = Record<string, unknown>;
type Membro = {
  id: string; nome: string; nascimento: string | null; nif: string | null;
  relacao: string; dois_fatores: boolean; tem_senha: boolean; consultas: number;
};
type Rendimento = {
  id: string; categoria: string; tipo: string | null; titular: string | null;
  imovel: string | null; valor: number | null; nota: string; irs_jovem: boolean;
  estuda_trabalha: boolean; ambito: string | null; venda_em: string | null;
  compra: number | null; venda: number | null; despesas: number | null; hpp: boolean;
};
type Documento = {
  id: string; tipo: string; descricao: string | null; categoria: string | null;
  nome: string; estado: string; em: string; imovel: string | null; descargas: number;
};

const euros = (c: number | null) =>
  c == null ? '—' : (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const dia = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-PT') : '—');

/* O cliente vê um separador de cada vez. Aqui está tudo na mesma página, em
   colunas: é assim que se confere um processo sem andar para trás e para a
   frente — e é outra disposição, não uma réplica. */
export function Processo({
  dados, processo, aoFechar, aoMudar,
}: { dados: Dados; processo: string; aoFechar: () => void; aoMudar: () => void }) {
  const cab = (dados.cabecalho as Record<string, never>) || {};
  const membros = (dados.membros as Membro[]) || [];
  const rendimentos = (dados.rendimentos as Rendimento[]) || [];
  const documentos = (dados.documentos as Documento[]) || [];
  const imoveis = (dados.imoveis as { id: string; nome: string }[]) || [];
  const notas = (dados.notas as Record<string, string>) || {};
  const deducoes = (dados.deducoes as Record<string, unknown>) || {};
  const mensagens = (dados.mensagens as { id: string; corpo: string; em: string; do_gabinete: boolean }[]) || [];
  const checkout = (dados.checkout as Record<string, never>) || null;

  const nome = (id: string | null) => membros.find((m) => m.id === id)?.nome || '—';
  const imovel = (id: string | null) => imoveis.find((i) => i.id === id)?.nome || '—';

  return (
    <>
      <div className={e.voltar}>
        <button type="button" className={e.sair} onClick={aoFechar}>← Voltar à fila</button>
        <a className={e.sair} href={`/gabinete/${processo}/relatorio`} target="_blank" rel="noopener">
          Relatório
        </a>
      </div>

      <div className={e.resumoTotais}>
          <div className={e.total}>
            <strong>{ESTADOS[String(cab.estado || '')] || String(cab.estado || '—')}</strong>
            <span>Estado · desde {dia(cab.desde as unknown as string)}</span>
          </div>
          <div className={e.total}><strong>{membros.length}</strong><span>No agregado</span></div>
          <div className={e.total}><strong>{rendimentos.length}</strong><span>Rendimentos</span></div>
          <div className={e.total}><strong>{documentos.length}</strong><span>Documentos</span></div>
          {checkout && (
            <div className={e.total}>
              <strong>{euros(checkout.total as unknown as number)}</strong>
              <span>Pagamento · {PAGAMENTOS[String(checkout.estado)] || String(checkout.estado)}</span>
            </div>
          )}
        </div>

        <Avanco processo={processo} estado={String(cab.estado || '')} aoMudar={aoMudar} />

        <TestesCegid processo={processo} />

        <div className={e.colunas}>
          <section className={e.bloco}>
            <h2>Agregado</h2>
            <div className={e.quadro}>
            <table className={e.tabela}>
              <thead><tr><th>Nome</th><th>NIF</th><th>Nasc.</th><th>Relação</th><th>Senha</th></tr></thead>
              <tbody>
                {membros.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nome}</td>
                    <td>{m.nif || '—'}</td>
                    <td>{dia(m.nascimento)}</td>
                    <td>{m.relacao}</td>
                    <td>
                      {m.tem_senha ? `Sim (${m.consultas} consultas)` : 'Não'}
                      {m.dois_fatores ? ' · 2FA' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {membros.some((m) => m.dois_fatores) && (
              <p>Há membros com dois fatores: é preciso contactar antes de submeter.</p>
            )}
          </section>

          <section className={e.bloco}>
            <h2>Deduções e benefícios</h2>
            {Object.keys(deducoes).length === 0 ? (
              <p>Nada declarado.</p>
            ) : (
              <ul className="lista-simples">
                <li>e-fatura: {deducoes.use_efatura === false ? 'não considerar' : 'considerar'}</li>
                {deducoes.rented_home ? (
                  <li>
                    Imóvel arrendado · contrato {deducoes.contract_reported ? 'comunicado' : 'não comunicado'}
                    {' · '}recibos {deducoes.rent_receipts ? 'sim' : 'não'}
                    {deducoes.rent_receipts === false
                      ? ` · faturas ${deducoes.landlord_invoices ? 'sim' : 'não'}`
                      : ''}
                  </li>
                ) : null}
                {deducoes.ppr ? <li>PPR · {nome(String(deducoes.ppr_person_id || ''))}</li> : null}
                {deducoes.ascendant_expenses ? <li>Despesas com ascendentes</li> : null}
              </ul>
            )}
            {notas.deduction && <p>Nota: {notas.deduction}</p>}
          </section>
        </div>

        {/* Um bloco por separador, na mesma ordem do cliente, para ser fácil
            conferir contra o que ele preencheu. */}
        {[...SEPARADORES, { id: DEDUCOES.id, categoria: 'deduction', titulo: DEDUCOES.titulo }].map((s) => {
          const meus = rendimentos.filter((r) => r.categoria === s.categoria);
          const docs = documentos.filter((d) => d.categoria === s.categoria);
          if (meus.length === 0 && docs.length === 0 && !notas[s.categoria]) return null;
          return (
            <section key={s.id} className={e.bloco}>
              <h2>{s.titulo}</h2>
              {meus.length > 0 && (
                <div className={e.quadro}>
                <table className={e.tabela}>
                  <thead>
                    <tr><th>Titular</th><th>Tipo</th><th>Valor</th><th>Compra/Venda</th><th>Sinais</th></tr>
                  </thead>
                  <tbody>
                    {meus.map((r) => (
                      <tr key={r.id}>
                        <td>{nome(r.titular)}{r.imovel ? ` · ${imovel(r.imovel)}` : ''}</td>
                        <td>{r.tipo || r.ambito || '—'}</td>
                        <td>{euros(r.valor)}</td>
                        <td>
                          {r.venda_em
                            ? `${euros(r.compra)} → ${euros(r.venda)} (${dia(r.venda_em)})`
                            : '—'}
                          {r.despesas ? ` · despesas ${euros(r.despesas)}` : ''}
                        </td>
                        <td>
                          {r.irs_jovem ? <span className={e.selo}>IRS Jovem</span> : null}{' '}
                          {r.estuda_trabalha ? <span className={e.selo}>Estuda+trabalha</span> : null}{' '}
                          {r.hpp ? <span className={e.selo}>HPP</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
              {docs.length > 0 && (
                <>
                  <h3>Documentos</h3>
                  <div className={e.quadro}>
                  <table className={e.tabela}>
                    <thead><tr><th>Tipo</th><th>Descrição</th><th>Imóvel</th><th>Enviado</th><th>Descargas</th></tr></thead>
                    <tbody>
                      {docs.map((d) => (
                        <tr key={d.id}>
                          <td>{d.tipo}</td>
                          <td>{d.descricao || d.nome}</td>
                          <td>{d.imovel || '—'}</td>
                          <td>{dia(d.em)}</td>
                          <td>{d.descargas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
              {notas[s.categoria] && <p>Nota do cliente: {notas[s.categoria]}</p>}
            </section>
          );
        })}

        <Conversa processo={processo} conta={String(cab.conta || '')}
                  mensagens={mensagens} aoMudar={aoMudar} />
    </>
  );
}

/* A conversa vive dentro do processo: responder sem sair daqui é metade do
   trabalho de acompanhar um cliente. */
function Conversa({
  processo, conta, mensagens, aoMudar,
}: {
  processo: string; conta: string;
  mensagens: { id: string; corpo: string; em: string; do_gabinete: boolean }[];
  aoMudar: () => void;
}) {
  return (
    <section className={e.bloco}>
      <h2>Mensagens</h2>
      {mensagens.length === 0 ? (
        <p>Ainda não há mensagens neste processo.</p>
      ) : (
        <div className={e.conversa}>
          {mensagens.map((m) => (
            <article key={m.id} className={e.balao} data-meu={m.do_gabinete}>
              <p>{m.corpo}</p>
              <span>
                {m.do_gabinete ? 'Eu' : 'Cliente'} ·{' '}
                {new Date(m.em).toLocaleString('pt-PT', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </article>
          ))}
        </div>
      )}
      <Responder processo={processo} conta={conta} aoMudar={aoMudar} />
    </section>
  );
}

function Responder({
  processo, conta, aoMudar,
}: { processo: string; conta: string; aoMudar: () => void }) {
  const [estado, accao, aEnviar] = useActionState(enviarMensagem, null);
  const forma = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) {
      forma.current?.reset();
      aoMudar();
    }
  }, [estado, aoMudar]);

  return (
    <form ref={forma} action={accao} className="pilha pilha-2">
      <input type="hidden" name="conta" value={conta} />
      <input type="hidden" name="processo" value={processo} />
      <label className="campo">
        <span className="rotulo">Responder ao cliente</span>
        <textarea name="corpo" rows={3} required maxLength={4000} className="entrada" />
      </label>
      {estado && !estado.ok && <p className="aviso-critico">{estado.erro}</p>}
      <div className="acoes-membro">
        <button type="submit" className="btn" disabled={aEnviar}>
          {aEnviar ? 'A enviar…' : 'Enviar'}
        </button>
      </div>
    </form>
  );
}
