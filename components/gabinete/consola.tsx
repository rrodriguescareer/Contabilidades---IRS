'use client';
import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import { pedirVistaGabinete, resolverAlertaDoGabinete } from '@/lib/acoes-espaco';
import { signOut } from '@/lib/auth-actions';
import { FASES, estadoDe, posicao } from '@/lib/fluxo';
import { Pilula } from './pilula';
import { Chegada } from '@/components/chegada';
import { Processo } from './processo';
import { Integracoes } from './integracoes';
import { ALERTAS, PAGAMENTOS } from './estados';
import e from './gabinete.module.css';

type Dados = Record<string, unknown> & { vista: string };
type Linha = Record<string, unknown>;

/* A consola do contabilista. Não é uma réplica do espaço do cliente: o menu
   lateral é claro (o do cliente é azul-escuro), diz "Gabinete" em cima, e o
   que se vê são todos os processos. Abrir um processo não muda de página —
   troca o conteúdo, como o menu. */

const VISTAS = [
  { id: 'fila', rotulo: 'Processos', icone: 'pasta' },
  { id: 'mensagens', rotulo: 'Mensagens', icone: 'balao' },
  { id: 'pagamentos', rotulo: 'Pagamentos', icone: 'cartao' },
  { id: 'alertas', rotulo: 'Alertas', icone: 'sino' },
  { id: 'integracoes', rotulo: 'Integrações', icone: 'ficha' },
] as const;

const GESTAO = [
  { href: '/utilizadores', rotulo: 'Clientes e acessos', icone: 'pessoas' },
  { href: '/precos', rotulo: 'Preços e campanhas', icone: 'etiqueta' },
  { href: '/descontos', rotulo: 'Códigos de desconto', icone: 'percentagem' },
  { href: '/avisos', rotulo: 'Avisos', icone: 'megafone' },
];

const FILTROS = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'meus', rotulo: 'À minha espera' },
  ...FASES.map((f) => ({ id: f.id, rotulo: f.titulo })),
] as const;

const dia = (iso: unknown) => (iso ? new Date(String(iso)).toLocaleDateString('pt-PT') : '—');
const euros = (c: unknown) =>
  c == null ? '—' : (Number(c) / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const iniciais = (nome: string) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

export function Consola({ vistaInicial, dadosIniciais, cegidConfigurado, cegidOrigem, processoInicial, nome, gestao }:
  { vistaInicial: string; dadosIniciais: Dados; cegidConfigurado: boolean;
    cegidOrigem: 'ambiente' | 'gabinete' | 'nenhuma';
    processoInicial?: { id: string; dados: Dados; aba?: string } | null;
    nome?: string | null; gestao?: string | null }) {
  const [vista, setVista] = useState(vistaInicial);
  const [dados, setDados] = useState(dadosIniciais);
  const [aberto, setAberto] = useState<{ id: string; dados: Dados; aba?: string } | null>(processoInicial ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, comecar] = useTransition();
  const cache = useRef(new Map<string, Dados>([[dadosIniciais.vista, dadosIniciais]]));
  const [totais, setTotais] = useState<Record<string, number>>(
    (dadosIniciais.totais as Record<string, number>) || {},
  );

  const abrir = useCallback((processo: string, aba?: string) => {
    setErro(null);
    comecar(async () => {
      const { dados: novos, erro: falha } = await pedirVistaGabinete('processo', processo);
      if (falha || !novos) { setErro(falha || 'Não foi possível abrir o processo.'); return; }
      setAberto({ id: processo, dados: novos as Dados, aba });
      window.history.pushState(null, '', `/gabinete?processo=${processo}${aba ? `&aba=${aba}` : ''}`);
      window.scrollTo({ top: 0 });
    });
  }, []);

  const recarregarAberto = useCallback(() => {
    if (!aberto) return;
    comecar(async () => {
      const { dados: novos } = await pedirVistaGabinete('processo', aberto.id);
      if (novos) setAberto((a) => (a ? { ...a, dados: novos as Dados } : a));
    });
    // A fila tem de refletir o que mudou no processo.
    cache.current.delete('fila');
  }, [aberto]);

  const ir = useCallback((destino: string) => {
    setAberto(null);
    setVista(destino);
    setErro(null);
    window.history.pushState(null, '', destino === 'fila' ? '/gabinete' : `/gabinete?separador=${destino}`);
    if (destino === 'integracoes') return;
    const guardado = cache.current.get(destino);
    if (guardado) { setDados(guardado); return; }
    comecar(async () => {
      const { dados: novos, erro: falha } = await pedirVistaGabinete(destino, null);
      if (falha || !novos) { setErro(falha || 'Não foi possível carregar.'); return; }
      cache.current.set(destino, novos as Dados);
      setDados(novos as Dados);
      if ((novos as Dados).totais) setTotais((novos as Dados).totais as Record<string, number>);
    });
  }, []);

  const contagem: Record<string, number | undefined> = {
    fila: totais.a_rever || undefined,
    mensagens: totais.por_responder || undefined,
    alertas: totais.alertas || undefined,
  };

  const titulo = aberto
    ? String((aberto.dados.cabecalho as Linha | undefined)?.cliente || 'Processo')
    : VISTAS.find((v) => v.id === vista)?.rotulo || 'Gabinete';

  return (
    <div className={e.consola}>
      <Chegada nome={nome} />

      <aside className={e.lateral}>
        <div className={e.marca}>
          <img src="/rr.svg" alt="RR." width={259} height={142} />
          <span className={e.modo}>Gabinete</span>
        </div>

        <nav className={e.menu} aria-label="Gabinete">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" className={e.item}
                    aria-current={!aberto && v.id === vista}
                    onClick={() => ir(v.id)}>
              <Icone nome={v.icone} />
              <span>{v.rotulo}</span>
              {contagem[v.id] ? <span className={e.contagem}>{contagem[v.id]}</span> : null}
            </button>
          ))}
        </nav>

        {/* A outra metade da ótica do contabilista vive na gestão. Fica aqui
            no mesmo menu, com o mesmo desenho, para ser um sítio só. */}
        {gestao && (
          <nav className={e.menu} aria-label="Gestão">
            <p className={e.grupo}>Gestão</p>
            {GESTAO.map((g) => (
              <a key={g.href} className={e.item} href={`${gestao.replace(/\/$/, '')}${g.href}`}>
                <Icone nome={g.icone} />
                <span>{g.rotulo}</span>
              </a>
            ))}
          </nav>
        )}

        <div className={e.rodape}>
          <div className={e.eu}>
            <span className={e.avatar}>{iniciais(nome || 'Rúben Rodrigues')}</span>
            <div>
              <strong>{nome || 'Rúben Meirinho Rodrigues'}</strong>
              <span>Contabilista Certificado</span>
            </div>
          </div>
          <form action={signOut}>
            <button type="submit" className={e.sair}>Sair</button>
          </form>
        </div>
      </aside>

      <div className={e.principal}>
        <header className={e.topo}>
          {aberto ? (
            <button type="button" className={e.voltar} onClick={() => ir(vista === 'integracoes' ? 'fila' : vista)}>
              ← {VISTAS.find((v) => v.id === vista)?.rotulo || 'Processos'}
            </button>
          ) : null}
          <h1 className={e.titulo}>{titulo}</h1>
          <span className={e.ano}>IRS 2026</span>
          {aCarregar && <span className={e.carregar} aria-live="polite">A carregar…</span>}
        </header>

        <main id="principal" className={e.conteudo} data-ocupado={aCarregar}>
          {erro && <p className="aviso-critico">{erro}</p>}

          {aberto ? (
            <Processo key={aberto.id} dados={aberto.dados} processo={aberto.id}
                      abaInicial={aberto.aba} aoMudar={recarregarAberto} />
          ) : (
            <>
              {vista === 'fila' && <Fila dados={dados} totais={totais} abrir={abrir} />}
              {vista === 'mensagens' && <Conversas dados={dados} abrir={abrir} />}
              {vista === 'pagamentos' && <Pagamentos dados={dados} totais={totais} abrir={abrir} />}
              {vista === 'alertas' && <Alertas dados={dados} abrir={abrir} />}
              {vista === 'integracoes' && <Integracoes configurado={cegidConfigurado} origem={cegidOrigem} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- processos */

function Fila({ dados, totais, abrir }:
  { dados: Dados; totais: Record<string, number>; abrir: (p: string, aba?: string) => void }) {
  const processos = (dados.processos as Linha[]) || [];
  const [filtro, setFiltro] = useState<string>('todos');
  const [procura, setProcura] = useState('');

  const visiveis = useMemo(() => {
    const q = procura.trim().toLowerCase();
    return processos.filter((p) => {
      const est = estadoDe(String(p.estado));
      if (filtro === 'meus' && est?.espera !== 'gabinete') return false;
      if (filtro !== 'todos' && filtro !== 'meus' && est?.fase !== filtro) return false;
      if (!q) return true;
      return [p.cliente, p.nif, p.email, p.telefone].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [processos, filtro, procura]);

  return (
    <>
      <div className={e.indicadores}>
        <Indicador valor={totais.a_rever ?? 0} rotulo="À minha espera" destaque />
        <Indicador valor={totais.recolha ?? 0} rotulo="Em recolha pelo cliente" />
        <Indicador valor={totais.entregues ?? 0} rotulo="Entregues na AT" />
        <Indicador valor={totais.por_responder ?? 0} rotulo="Mensagens por responder" />
      </div>

      <section className={e.cartao}>
        <div className={e.barraFiltros}>
          <div className={e.filtros} role="tablist" aria-label="Filtrar por fase">
            {FILTROS.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filtro === f.id}
                      className={e.filtro} onClick={() => setFiltro(f.id)}>
                {f.rotulo}
              </button>
            ))}
          </div>
          <input className={`entrada ${e.procura}`} type="search" value={procura}
                 onChange={(ev) => setProcura(ev.target.value)}
                 placeholder="Procurar por nome, NIF, email ou telefone" aria-label="Procurar processos" />
        </div>

        {visiveis.length === 0 ? (
          <div className={e.vazio}>
            {processos.length === 0 ? 'Ainda não há processos nesta campanha.' : 'Nenhum processo com estes filtros.'}
          </div>
        ) : (
          <div className={e.quadro}>
            <table className={e.tabela}>
              <thead>
                <tr>
                  <th>Cliente</th><th>Estado</th><th className={e.esconderPequeno}>Progresso</th>
                  <th className={e.num}>Rend.</th><th className={e.num}>Docs</th>
                  <th className={e.num}>Msg</th><th>Pagamento</th><th>Desde</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => {
                  const est = estadoDe(String(p.estado));
                  const { indice, total } = posicao(String(p.estado));
                  return (
                    <tr key={String(p.id)} className={e.linhaClicavel} onClick={() => abrir(String(p.id))}>
                      <td>
                        <div className={e.cliente}>
                          <span className={e.avatarPequeno}>{iniciais(String(p.cliente || '?'))}</span>
                          <div>
                            <button type="button" className={e.nome}
                                    onClick={(ev) => { ev.stopPropagation(); abrir(String(p.id)); }}>
                              {String(p.cliente)}
                            </button>
                            <span className={e.sub}>NIF {String(p.nif || '—')}</span>
                          </div>
                        </div>
                      </td>
                      <td><Pilula estado={String(p.estado)} /></td>
                      <td className={e.esconderPequeno}>
                        <div className={e.progresso} title={`Passo ${indice + 1} de ${total}`}>
                          <span style={{ inlineSize: `${((indice + 1) / total) * 100}%` }} data-desvio={est?.desvio} />
                        </div>
                      </td>
                      <td className={e.num}>{String(p.rendimentos)}</td>
                      <td className={e.num}>
                        {String(p.documentos)}
                        {Number(p.por_rever) > 0 && <span className={e.ponto} title={`${p.por_rever} por abrir`} />}
                      </td>
                      <td className={e.num}>
                        {Number(p.por_responder) > 0
                          ? <button type="button" className={e.badgeAzul}
                                    onClick={(ev) => { ev.stopPropagation(); abrir(String(p.id), 'mensagens'); }}>
                              {String(p.por_responder)} nova{Number(p.por_responder) > 1 ? 's' : ''}
                            </button>
                          : String(p.mensagens)}
                      </td>
                      <td>
                        {p.pago
                          ? <span className={e.etiqueta} data-tom="ok">Pago</span>
                          : p.pagamento === 'pending'
                            ? <span className={e.etiqueta} data-tom="atencao">A aguardar</span>
                            : <span className={e.etiqueta}>—</span>}
                        {p.dois_fatores ? <span className={e.etiqueta} data-tom="atencao">2FA</span> : null}
                      </td>
                      <td className={e.sub}>{dia(p.desde)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Conversas({ dados, abrir }: { dados: Dados; abrir: (p: string, aba?: string) => void }) {
  const conversas = (dados.conversas as Linha[]) || [];
  if (conversas.length === 0) return <div className={e.vazio}>Ainda não há conversas.</div>;
  return (
    <section className={e.cartao}>
      <ul className={e.listaConversas}>
        {conversas.map((c) => (
          <li key={String(c.processo)}>
            <button type="button" className={e.conversa} onClick={() => abrir(String(c.processo), 'mensagens')}>
              <span className={e.avatarPequeno}>{iniciais(String(c.cliente || '?'))}</span>
              <span className={e.conversaTexto}>
                <strong>{String(c.cliente)}</strong>
                <span>{String(c.resumo || '')}</span>
              </span>
              <span className={e.conversaFim}>
                <span className={e.sub}>{dia(c.ultima)}</span>
                {c.por_responder
                  ? <span className={e.badgeAzul}>Por responder</span>
                  : <span className={e.etiqueta} data-tom="ok">Respondido</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pagamentos({ dados, totais, abrir }:
  { dados: Dados; totais: Record<string, number>; abrir: (p: string, aba?: string) => void }) {
  const pagamentos = (dados.pagamentos as Linha[]) || [];
  return (
    <>
      <div className={e.indicadores}>
        <Indicador valor={euros(totais.receita ?? 0)} rotulo="Recebido" destaque />
        <Indicador valor={totais.pagos ?? 0} rotulo="Processos pagos" />
        <Indicador valor={pagamentos.filter((p) => p.estado === 'pending').length} rotulo="A aguardar liquidação" />
        <Indicador valor={pagamentos.filter((p) => p.estado === 'failed').length} rotulo="Falhados" />
      </div>
      <section className={e.cartao}>
        {pagamentos.length === 0 ? <div className={e.vazio}>Ainda não há pagamentos.</div> : (
          <div className={e.quadro}>
            <table className={e.tabela}>
              <thead><tr><th>Cliente</th><th>Estado</th><th className={e.num}>Total</th>
                <th className={e.num}>Desconto</th><th>Criado</th><th>Pago</th></tr></thead>
              <tbody>
                {pagamentos.map((p) => (
                  <tr key={String(p.id)} className={e.linhaClicavel} onClick={() => abrir(String(p.processo), 'pagamento')}>
                    <td><span className={e.nomeSimples}>{String(p.cliente)}</span></td>
                    <td>
                      <span className={e.etiqueta}
                            data-tom={p.estado === 'paid' ? 'ok' : p.estado === 'failed' ? 'erro' : 'atencao'}>
                        {PAGAMENTOS[String(p.estado)] || String(p.estado)}
                      </span>
                    </td>
                    <td className={e.num}>{euros(p.total)}</td>
                    <td className={e.num}>{p.desconto ? euros(p.desconto) : '—'}</td>
                    <td className={e.sub}>{dia(p.criado)}</td>
                    <td className={e.sub}>{dia(p.pago_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Alertas({ dados, abrir }: { dados: Dados; abrir: (p: string, aba?: string) => void }) {
  const [resolvidos, setResolvidos] = useState<string[]>([]);
  const [, comecar] = useTransition();
  const alertas = ((dados.alertas as Linha[]) || []).filter((a) => !resolvidos.includes(String(a.id)));
  if (alertas.length === 0) return <div className={e.vazio}>Nada por resolver.</div>;
  return (
    <section className={e.cartao}>
      <ul className={e.listaAlertas}>
        {alertas.map((a) => {
          const info = ALERTAS[String(a.tipo)];
          return (
            <li key={String(a.id)} data-urgente={info?.urgente}>
              <div>
                <strong>{info?.rotulo || String(a.tipo)}</strong>
                <span className={e.sub}>
                  {String(a.cliente)}{a.pessoa ? ` · ${String(a.pessoa)}` : ''} · {dia(a.em)}
                </span>
              </div>
              <div className={e.acoesLinha}>
                {Boolean(a.processo) && (
                  <button type="button" className="btn btn-secundario" onClick={() => abrir(String(a.processo))}>
                    Abrir processo
                  </button>
                )}
                <button type="button" className="btn-texto"
                        onClick={() => comecar(async () => {
                          const r = await resolverAlertaDoGabinete(String(a.id));
                          if (r.ok) setResolvidos((x) => [...x, String(a.id)]);
                        })}>
                  Marcar como resolvido
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------ peças */

function Indicador({ valor, rotulo, destaque }: { valor: number | string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={e.indicador} data-destaque={destaque}>
      <strong>{valor}</strong>
      <span>{rotulo}</span>
    </div>
  );
}

function Icone({ nome }: { nome: string }) {
  const comum = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (nome) {
    case 'pasta': return <svg {...comum}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
    case 'balao': return <svg {...comum}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>;
    case 'cartao': return <svg {...comum}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>;
    case 'sino': return <svg {...comum}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;
    case 'pessoas': return <svg {...comum}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></svg>;
    case 'etiqueta': return <svg {...comum}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>;
    case 'percentagem': return <svg {...comum}><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></svg>;
    case 'megafone': return <svg {...comum}><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12" /></svg>;
    default: return <svg {...comum}><path d="M4 6h16M4 12h16M4 18h10" /></svg>;
  }
}
