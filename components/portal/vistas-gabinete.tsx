'use client';

import Link from 'next/link';
import * as acoes from '@/lib/acoes';
import { type PropsVista } from './contexto';
import { Formulario } from './formulario';
import { ESTADO_PAGAMENTO, ESTADO_PROCESSO, dataHora } from './apresentar';
import e from './portal.module.css';

const lista = <T,>(dados: PropsVista['dados'], chave: string): T[] =>
  Array.isArray(dados[chave]) ? (dados[chave] as T[]) : [];

type Processo = {
  id: string; account_id: string; cliente: string; status: string; created_at: string;
  por_rever: number; mensagens_cliente: number; ultima_mensagem: string | null; pagamento: string | null;
};

export function Fila({ dados }: PropsVista) {
  const processos = lista<Processo>(dados, 'processos');
  const resumo = (dados.resumo ?? {}) as Record<string, number>;

  return (
    <div className="pilha pilha-6">
      <div className={e.tituloVista}>
        <h1>Campanha IRS 2026</h1>
        <p>Os processos aparecem por urgência: primeiro os que esperam por si.</p>
      </div>

      <div className={e.medidores}>
        {[
          ['A rever', resumo.a_rever],
          ['Em recolha', resumo.em_recolha],
          ['Submetidos', resumo.submetidos],
          ['Alertas', resumo.alertas],
          ['Total', resumo.total],
        ].map(([rotulo, valor]) => (
          <div className={e.medidor} key={rotulo as string}>
            <span className={e.medidorValor}>{(valor as number) ?? 0}</span>
            <span className={e.medidorRotulo}>{rotulo as string}</span>
          </div>
        ))}
      </div>

      {processos.length === 0 ? (
        <div className="vazio">
          <strong>Ainda não há processos de 2026</strong>
          <p>Os processos aparecem aqui assim que abrir o ano na plataforma de gestão de clientes.</p>
        </div>
      ) : (
        <div className={e.fila}>
          {processos.map((processo) => (
            <Link className={e.processo} href={`/gabinete/${processo.id}`} key={processo.id}>
              <span className="pilha" style={{ gap: '.125rem' }}>
                <span className={e.processoNome}>{processo.cliente}</span>
                <span className={e.processoDetalhe}>
                  Aberto em {dataHora(processo.created_at)}
                  {processo.ultima_mensagem ? ` · última mensagem ${dataHora(processo.ultima_mensagem)}` : ''}
                </span>
              </span>
              <span className={e.processoSinais}>
                {processo.por_rever > 0 && (
                  <span className="etiqueta etiqueta-atencao">{processo.por_rever} por rever</span>
                )}
                {processo.pagamento && (
                  <span className={`etiqueta ${ESTADO_PAGAMENTO[processo.pagamento]?.classe ?? ''}`}>
                    {ESTADO_PAGAMENTO[processo.pagamento]?.rotulo ?? processo.pagamento}
                  </span>
                )}
                <span className={`etiqueta ${ESTADO_PROCESSO[processo.status]?.classe ?? ''}`}>
                  {ESTADO_PROCESSO[processo.status]?.rotulo ?? processo.status}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

type Alerta = { id: string; kind: string; created_at: string; pessoa: string; cliente: string };

export function Alertas({ dados }: PropsVista) {
  const alertas = lista<Alerta>(dados, 'alertas');

  return (
    <div className="pilha pilha-5">
      <div className={e.tituloVista}>
        <h1>Alertas</h1>
        <p>
          Avisos levantados pelos clientes. A autenticação de dois fatores no Portal das Finanças obriga a
          combinar o acesso com a pessoa.
        </p>
      </div>

      {alertas.length === 0 ? (
        <div className="vazio">
          <strong>Nada pendente</strong>
          <p>Não há alertas por resolver.</p>
        </div>
      ) : (
        <div className={e.registos}>
          {alertas.map((alerta) => (
            <article className={e.registo} key={alerta.id}>
              <div className={e.registoTexto}>
                <strong>{alerta.pessoa}</strong>
                <span>
                  {alerta.cliente} · dois fatores no Portal das Finanças · {dataHora(alerta.created_at)}
                </span>
              </div>
              <Formulario acao={acoes.resolverAlerta}>
                {(pendente) => (
                  <>
                    <input type="hidden" name="alerta" value={alerta.id} />
                    <button className="btn btn-secundario btn-sm" disabled={pendente}>
                      Resolver
                    </button>
                  </>
                )}
              </Formulario>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
