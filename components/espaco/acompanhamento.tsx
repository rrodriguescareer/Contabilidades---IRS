'use client';
import type { Dados } from './espaco';
import e from './espaco.module.css';

/* O percurso que o cliente vê. A ordem é a do processo real: ele submete,
   eu aceito, valido, aprovo, submeto na AT e acompanho até fechar. */
const PERCURSO = [
  { id: 'collecting', titulo: 'Em recolha', nota: 'Está a reunir os dados e os documentos.' },
  { id: 'submitted_by_client', titulo: 'Submetido', nota: 'Recebi o processo.' },
  { id: 'accepted', titulo: 'Aceite', nota: 'Confirmei a receção e abri o processo.' },
  { id: 'validation', titulo: 'Em validação', nota: 'Estou a conferir rendimentos e documentos.' },
  { id: 'approved', titulo: 'Aprovado', nota: 'Está pronto para entrar na AT.' },
  { id: 'submitting', titulo: 'Em submissão', nota: 'A declaração está a ser entregue.' },
  { id: 'filed', titulo: 'Submetido na AT', nota: 'Entregue. Fica o valor apurado.' },
  { id: 'monitoring', titulo: 'Em acompanhamento', nota: 'À espera da validação da AT.' },
  { id: 'closed', titulo: 'Fechado', nota: 'Processo concluído.' },
];

const data = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const euros = (c: number) =>
  (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

export function Acompanhamento({ dados }: { dados: Dados }) {
  const processo = (dados.processo as {
    estado: string; desde: string; submetido_em: string | null;
    valor_final: number | null; sentido: string | null;
  }) || null;
  const eventos = (dados.eventos as { id: string; titulo: string; corpo: string; em: string }[]) || [];
  const consultas = (dados.consultas_senha as { pessoa: string; em: string }[]) || [];

  const atual = PERCURSO.findIndex((p) => p.id === processo?.estado);

  return (
    <>
      <section className={e.cartao}>
        <h2>O seu processo</h2>
        <ol className="percurso">
          {PERCURSO.map((passo, i) => (
            <li key={passo.id} data-estado={i < atual ? 'feito' : i === atual ? 'atual' : 'por-vir'}>
              <span className="marca-passo" aria-hidden="true" />
              <div>
                <strong>{passo.titulo}</strong>
                <p className="suave">{passo.nota}</p>
                {i === atual && processo?.desde && (
                  <p className="suave">Desde {data(processo.desde)}</p>
                )}
              </div>
            </li>
          ))}
        </ol>

        {processo?.valor_final != null && processo.sentido && (
          <p className={processo.sentido === 'refund' ? 'aviso-positivo' : 'aviso-atencao'}>
            {processo.sentido === 'refund'
              ? `Valor a reembolsar: ${euros(processo.valor_final)}`
              : `Valor a pagar: ${euros(processo.valor_final)}`}
          </p>
        )}
      </section>

      {eventos.length > 0 && (
        <section className={e.cartao}>
          <h2>Atualizações</h2>
          {eventos.map((ev) => (
            <div key={ev.id} className="linha-membro">
              <div>
                <strong>{ev.titulo}</strong>
                {ev.corpo && <p className="suave">{ev.corpo}</p>}
                <p className="suave">{data(ev.em)}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Prometido onde a senha é pedida: aqui está o registo completo. */}
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
              <li key={i}>
                {c.pessoa} — {data(c.em)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
