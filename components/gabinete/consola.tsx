'use client';
import Link from 'next/link';
import { useCallback, useRef, useState, useTransition } from 'react';
import { pedirVistaGabinete } from '@/lib/acoes-espaco';
import { Processo } from './processo';
import { signOut } from '@/lib/auth-actions';
import { Integracoes } from './integracoes';
import { ALERTAS, ESTADOS, MEUS, PAGAMENTOS } from './estados';
import e from './gabinete.module.css';

type Dados = Record<string, unknown> & { vista: string };

const VISTAS = [
  { id: 'fila', rotulo: 'Processos' },
  { id: 'mensagens', rotulo: 'Mensagens' },
  { id: 'pagamentos', rotulo: 'Pagamentos' },
  { id: 'alertas', rotulo: 'Alertas' },
  { id: 'integracoes', rotulo: 'Integrações' },
] as const;


const data = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT') : '—';
const euros = (c: number | null) =>
  c == null ? '—' : (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

export function Consola({ vistaInicial, dadosIniciais, cegidConfigurado, cegidOrigem, processoInicial }:
  { vistaInicial: string; dadosIniciais: Dados; cegidConfigurado: boolean;
    cegidOrigem: 'ambiente' | 'gabinete' | 'nenhuma';
    processoInicial?: { id: string; dados: Dados } | null }) {
  const [vista, setVista] = useState(vistaInicial);
  const [dados, setDados] = useState(dadosIniciais);
  /* Abrir um processo não muda de página: troca o conteúdo da consola, como
     o menu faz. Assim não se perde o sítio onde se estava na fila. */
  const [aberto, setAberto] = useState<{ id: string; dados: Dados } | null>(processoInicial ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, comecar] = useTransition();
  const cache = useRef(new Map<string, Dados>([[dadosIniciais.vista, dadosIniciais]]));

  const abrir = useCallback((processo: string) => {
    setErro(null);
    comecar(async () => {
      const { dados: novos, erro: falha } = await pedirVistaGabinete('processo', processo);
      if (falha || !novos) { setErro(falha || 'Não foi possível abrir o processo.'); return; }
      setAberto({ id: processo, dados: novos as Dados });
      window.history.pushState(null, '', `/gabinete?processo=${processo}`);
    });
  }, []);

  const recarregarAberto = useCallback(() => {
    if (aberto) abrir(aberto.id);
  }, [aberto, abrir]);

  const fechar = useCallback(() => {
    setAberto(null);
    window.history.pushState(null, '', '/gabinete');
  }, []);

  const ir = useCallback((destino: string) => {
    setAberto(null);
    setVista(destino);
    setErro(null);
    // As integrações não vêm da base: são um ecrã de configuração.
    if (destino === 'integracoes') return;
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
      <header className={e.topo}>
        <div className={e.barra}>
          <span className={e.etiqueta}>Gabinete</span>
          <span className={e.contexto}>
            {aberto
              ? <><b>{String((aberto.dados.cabecalho as Record<string, string>)?.cliente || 'Processo')}</b> · IRS 2026</>
              : <><b>IRS 2026</b> · todos os processos</>}
          </span>
          <div className={e.fim}>
            <form action={signOut}>
              <button type="submit" className={e.sair}>Sair</button>
            </form>
          </div>
        </div>

        <nav className={e.vistas} aria-label="Vistas">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" className={e.vista} aria-current={v.id === vista}
                    onClick={() => ir(v.id)}>
              {v.rotulo}
              {v.id === 'alertas' && totais?.alertas ? (
                <span className={e.conta}>{totais.alertas}</span>
              ) : null}
            </button>
          ))}
        </nav>
      </header>

      <main id="principal" className={e.painel}>
        {erro && <p className="aviso-critico">{erro}</p>}
        {aCarregar && <p className="suave">A carregar…</p>}

        {aberto ? (
          <Processo dados={aberto.dados} processo={aberto.id}
                    aoFechar={fechar} aoMudar={recarregarAberto} />
        ) : (
        <>
        {vista === 'fila' && <Fila dados={dados} abrir={abrir} />}
        {vista === 'mensagens' && <Conversas dados={dados} />}
        {vista === 'pagamentos' && <Pagamentos dados={dados} />}
        {vista === 'alertas' && <Alertas dados={dados} />}
        {vista === 'integracoes' && <Integracoes configurado={cegidConfigurado} origem={cegidOrigem} />}
        </>
        )}
      </main>
    </div>
  );
}

function Fila({ dados, abrir }: { dados: Dados; abrir: (p: string) => void }) {
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
        <div className={e.quadro}>
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
                <td>
                  <button type="button" className={e.ligacao} onClick={() => abrir(String(p.id))}>
                    {String(p.cliente)}
                  </button>
                </td>
                <td>
                  <span className={e.selo} data-urgente={MEUS.includes(String(p.estado))}>
                    {ESTADOS[String(p.estado)] || String(p.estado)}
                  </span>
                </td>
                <td>{data(p.desde as unknown as string)}</td>
                <td className={e.numero}>{String(p.titulares)}</td>
                <td className={e.numero}>{String(p.rendimentos)}</td>
                <td className={e.numero}>
                  {String(p.documentos)}
                  {Number(p.por_rever) > 0 ? (
                    <> · <span className={e.selo} data-urgente="true">{String(p.por_rever)} por rever</span></>
                  ) : null}
                </td>
                <td className={e.numero}>{String(p.mensagens)}</td>
                <td>
                  {p.dois_fatores ? <span className={e.selo} data-urgente="true">2FA</span> : null}{' '}
                  {p.pago ? <span className={e.selo} data-pronto="true">Pago</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </>
  );
}

function Conversas({ dados }: { dados: Dados }) {
  const conversas = (dados.conversas as Record<string, never>[]) || [];
  if (conversas.length === 0) return <div className={e.vazio}>Sem conversas abertas.</div>;
  return (
    <div className={e.quadro}><table className={e.tabela}>
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
    </table></div>
  );
}

function Pagamentos({ dados }: { dados: Dados }) {
  const pagamentos = (dados.pagamentos as Record<string, never>[]) || [];
  if (pagamentos.length === 0) return <div className={e.vazio}>Ainda não há pagamentos.</div>;
  return (
    <div className={e.quadro}><table className={e.tabela}>
      <thead><tr><th>Cliente</th><th>Estado</th><th>Total</th><th>Desconto</th><th>Criado</th><th>Pago</th></tr></thead>
      <tbody>
        {pagamentos.map((p: Record<string, never>) => (
          <tr key={String(p.id)}>
            <td><Link href={`/gabinete/${p.processo}`}>{String(p.cliente)}</Link></td>
            <td>
              <span className={e.selo} data-pronto={String(p.estado) === 'paid'}>
                {PAGAMENTOS[String(p.estado)] || String(p.estado)}
              </span>
            </td>
            <td>{euros(p.total as unknown as number)}</td>
            <td>{euros(p.desconto as unknown as number)}</td>
            <td>{data(p.criado as unknown as string)}</td>
            <td>{data(p.pago_em as unknown as string)}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

function Alertas({ dados }: { dados: Dados }) {
  const alertas = (dados.alertas as Record<string, never>[]) || [];
  if (alertas.length === 0) return <div className={e.vazio}>Nada por resolver.</div>;
  return (
    <div className={e.quadro}><table className={e.tabela}>
      <thead><tr><th>Cliente</th><th>Pessoa</th><th>Alerta</th><th>Desde</th></tr></thead>
      <tbody>
        {alertas.map((a: Record<string, never>) => (
          <tr key={String(a.id)}>
            <td><Link href={`/gabinete/${a.processo}`}>{String(a.cliente)}</Link></td>
            <td>{String(a.pessoa || '—')}</td>
            <td>
              {(() => {
                const info = ALERTAS[String(a.tipo)];
                return info
                  ? <span className={e.selo} data-urgente={info.urgente}>{info.rotulo}</span>
                  : String(a.tipo);
              })()}
            </td>
            <td>{data(a.em as unknown as string)}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}
