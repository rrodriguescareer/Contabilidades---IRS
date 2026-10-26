'use client';
import Link from 'next/link';
import { SEPARADORES, DEDUCOES } from '@/components/espaco/separadores';
import { Avanco } from './avanco';
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
export function Processo({ dados, processo }: { dados: Dados; processo: string }) {
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
    <div className={e.consola} style={{ gridTemplateColumns: '1fr' }}>
      <div className={e.faixa}>
        Gabinete
        <span className={e.cliente}>
          {String(cab.cliente || 'Processo')}
          {cab.nif ? ` · NIF ${cab.nif}` : ''}
          {cab.residencia ? ` · ${cab.residencia}` : ''}
        </span>
        <Link href="/gabinete">← Voltar à fila</Link>
      </div>

      <main id="principal" className={e.painel}>
        <div className={e.resumoTotais}>
          <div className={e.total}><strong>{String(cab.estado || '—')}</strong><span>Estado · desde {dia(cab.desde as unknown as string)}</span></div>
          <div className={e.total}><strong>{membros.length}</strong><span>No agregado</span></div>
          <div className={e.total}><strong>{rendimentos.length}</strong><span>Rendimentos</span></div>
          <div className={e.total}><strong>{documentos.length}</strong><span>Documentos</span></div>
          {checkout && (
            <div className={e.total}>
              <strong>{euros(checkout.total as unknown as number)}</strong>
              <span>Pagamento · {String(checkout.estado)}</span>
            </div>
          )}
        </div>

        <Avanco processo={processo} estado={String(cab.estado || '')} />

        <p>
          <a className="btn" href={`/gabinete/${processo}/relatorio`} target="_blank" rel="noopener">
            Relatório do processo
          </a>
        </p>

        <div className={e.colunas}>
          <section className={e.bloco}>
            <h2>Agregado</h2>
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
              )}
              {docs.length > 0 && (
                <>
                  <h3>Documentos</h3>
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
                </>
              )}
              {notas[s.categoria] && <p>Nota do cliente: {notas[s.categoria]}</p>}
            </section>
          );
        })}

        {mensagens.length > 0 && (
          <section className={e.bloco}>
            <h2>Conversa</h2>
            {mensagens.slice(-6).map((m) => (
              <p key={m.id}>
                <strong>{m.do_gabinete ? 'Eu' : 'Cliente'}:</strong> {m.corpo}
              </p>
            ))}
            <Link href={`/app?separador=mensagens`} style={{ display: 'none' }} />
          </section>
        )}
      </main>
    </div>
  );
}
