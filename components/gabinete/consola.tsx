'use client';
import Link from 'next/link';
import { useCallback, useRef, useState, useTransition } from 'react';
import { pedirVistaGabinete } from '@/lib/acoes-espaco';
import { signOut } from '@/lib/auth-actions';
import e from './gabinete.module.css';

type Dados = Record<string, unknown> & { vista: string };

const VISTAS = [
  { id: 'fila', rotulo: 'Processos' },
  { id: 'mensagens', rotulo: 'Mensagens' },
  { id: 'pagamentos', rotulo: 'Pagamentos' },
  { id: 'alertas', rotulo: 'Alertas' },
] as const;

const ESTADOS: Record<string, string> = {
  collecting: 'Em recolha',
  submitted_by_client: 'Submetido',
  accepted: 'Aceite',
  validation: 'Em validação',
  approved: 'Aprovado',
  submitting: 'Em submissão',
  filed: 'Submetido na AT',
  monitoring: 'Acompanhamento',
  closed: 'Fechado',
};

/** Estes esperam por mim; o resto espera pelo cliente ou pela AT. */
const MEUS = ['submitted_by_client', 'accepted', 'validation', 'approved', 'submitting'];

const data = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT') : '—';
const euros = (c: number | null) =>
  c == null ? '—' : (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

export function Consola({ vistaInicial, dadosIniciais }: { vistaInicial: string; dadosIniciais: Dados }) {
  const [vista, setVista] = useState(vistaInicial);
  const [dados, setDados] = useState(dadosIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, comecar] = useTransition();
  const cache = useRef(new Map<string, Dados>([[dadosIniciais.vista, dadosIniciais]]));

  const ir = useCallback((destino: string) => {
    setVista(destino);
    setErro(null);
    const guardado = cache.current.get(destino);
    if (guardado) { setDados(guardado); return; }
    comecar(async () => {
      const { dados: novos, erro: falha } = await pedirVistaGabinete(destino, null);
      if (falha || !novos) { setErro(falha || 'Não foi possível carregar.'); return; }
      cache.current.set(destino, novos as Dados);
      setDados(novos as Dados);
    });
  }, []);

  const totais = (dados.totais as Record<string, number>) || null;

  return (
    <div className={e.consola}>
      <div className={e.faixa}>
        Gabinete
        <span className={e.cliente}>Vista do contabilista · todos os processos</span>
        <form action={signOut}>
          <button type="submit" className={e.item} style={{ padding: '.2rem .5rem' }}>Sair</button>
        </form>
      </div>

      <aside className={e.lateral}>
        {VISTAS.map((v) => (
          <button key={v.id} type="button" className={e.item} aria-current={v.id === vista}
                  onClick={() => ir(v.id)}>
            {v.rotulo}
            {v.id === 'alertas' && totais?.alertas ? (
              <span className={e.conta}>{totais.alertas}</span>
            ) : null}
          </button>
        ))}
      </aside>

      <main id="principal" className={e.painel}>
        {erro && <p className="aviso-critico">{erro}</p>}
        {aCarregar && <p style={{ color: '#7e95b8' }}>A carregar…</p>}

        {vista === 'fila' && <Fila dados={dados} />}
        {vista === 'mensagens' && <Conversas dados={dados} />}
        {vista === 'pagamentos' && <Pagamentos dados={dados} />}
        {vista === 'alertas' && <Alertas dados={dados} />}
      </main>
    </div>
  );
}

function Fila({ dados }: { dados: Dados }) {
  const processos = (dados.processos as Record<string, never>[]) || [];
  const totais = (dados.totais as Record<string, number>) || {};
  return (
    <>
      <div className={e.resumoTotais}>
        <div className={e.total}><strong>{totais.abertos ?? 0}</strong><span>Processos abertos</span></div>
        <div className={e.total}><strong>{totais.a_rever ?? 0}</strong><span>À minha espera</span></div>
        <div className={e.total}><strong>{totais.alertas ?? 0}</strong><span>Alertas por resolver</span></div>
      </div>

      {processos.length === 0 ? (
        <div className={e.vazio}>Ainda não há processos nesta campanha.</div>
      ) : (
        <table className={e.tabela}>
          <thead>
            <tr>
              <th>Cliente</th><th>Estado</th><th>Desde</th>
              <th>Agregado</th><th>Rend.</th><th>Docs</th><th>Msg</th><th>Sinais</th>
            </tr>
          </thead>
          <tbody>
            {processos.map((p: Record<string, never>) => (
              <tr key={String(p.id)}>
                <td><Link href={`/gabinete/${p.id}`}>{String(p.cliente)}</Link></td>
                <td>
                  <span className={e.selo} data-urgente={MEUS.includes(String(p.estado))}>
                    {ESTADOS[String(p.estado)] || String(p.estado)}
                  </span>
                </td>
                <td>{data(p.desde as unknown as string)}</td>
                <td>{String(p.titulares)}</td>
                <td>{String(p.rendimentos)}</td>
                <td>
                  {String(p.documentos)}
                  {Number(p.por_rever) > 0 ? ` (${p.por_rever} por rever)` : ''}
                </td>
                <td>{String(p.mensagens)}</td>
                <td>
                  {p.dois_fatores ? <span className={e.selo} data-urgente="true">2FA</span> : null}{' '}
                  {p.pago ? <span className={e.selo} data-pronto="true">Pago</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Conversas({ dados }: { dados: Dados }) {
  const conversas = (dados.conversas as Record<string, never>[]) || [];
  if (conversas.length === 0) return <div className={e.vazio}>Sem conversas abertas.</div>;
  return (
    <table className={e.tabela}>
      <thead><tr><th>Cliente</th><th>Mensagens</th><th>Última</th><th>Estado</th></tr></thead>
      <tbody>
        {conversas.map((c: Record<string, never>) => (
          <tr key={String(c.processo)}>
            <td><Link href={`/gabinete/${c.processo}?separador=mensagens`}>{String(c.cliente)}</Link></td>
            <td>{String(c.total)}</td>
            <td>{data(c.ultima as unknown as string)}</td>
            <td>
              {c.por_responder
                ? <span className={e.selo} data-urgente="true">Por responder</span>
                : <span className={e.selo} data-pronto="true">Respondido</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Pagamentos({ dados }: { dados: Dados }) {
  const pagamentos = (dados.pagamentos as Record<string, never>[]) || [];
  if (pagamentos.length === 0) return <div className={e.vazio}>Ainda não há pagamentos.</div>;
  return (
    <table className={e.tabela}>
      <thead><tr><th>Cliente</th><th>Estado</th><th>Total</th><th>Desconto</th><th>Criado</th><th>Pago</th></tr></thead>
      <tbody>
        {pagamentos.map((p: Record<string, never>) => (
          <tr key={String(p.id)}>
            <td><Link href={`/gabinete/${p.processo}`}>{String(p.cliente)}</Link></td>
            <td>
              <span className={e.selo} data-pronto={String(p.estado) === 'paid'}>{String(p.estado)}</span>
            </td>
            <td>{euros(p.total as unknown as number)}</td>
            <td>{euros(p.desconto as unknown as number)}</td>
            <td>{data(p.criado as unknown as string)}</td>
            <td>{data(p.pago_em as unknown as string)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Alertas({ dados }: { dados: Dados }) {
  const alertas = (dados.alertas as Record<string, never>[]) || [];
  if (alertas.length === 0) return <div className={e.vazio}>Nada por resolver.</div>;
  return (
    <table className={e.tabela}>
      <thead><tr><th>Cliente</th><th>Pessoa</th><th>Alerta</th><th>Desde</th></tr></thead>
      <tbody>
        {alertas.map((a: Record<string, never>) => (
          <tr key={String(a.id)}>
            <td><Link href={`/gabinete/${a.processo}`}>{String(a.cliente)}</Link></td>
            <td>{String(a.pessoa || '—')}</td>
            <td>{String(a.tipo)}</td>
            <td>{data(a.em as unknown as string)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
