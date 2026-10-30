'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { pedirVista } from '@/lib/acoes-espaco';
import { signOut } from '@/lib/auth-actions';
import { emRecolha } from '@/lib/fluxo';
import { temPortalEmpresas } from '@/lib/outro-portal';
import { Chegada } from '@/components/chegada';
import { Idioma, usarIdioma } from './idioma';
import { Inicio } from './inicio';
import { Agregado } from './agregado';
import { Rendimentos } from './rendimentos';
import { Documentos } from './documentos';
import { Acompanhamento } from './acompanhamento';
import { Pagamento } from './pagamento';
import { Mensagens, lidaAte } from './mensagens';
import e from './espaco.module.css';

export type Dados = Record<string, unknown> & { vista: string };

const SEPARADORES = ['inicio', 'agregado', 'rendimentos', 'documentos', 'progresso', 'pagamento', 'mensagens'] as const;
export type Vista = (typeof SEPARADORES)[number];

const SUBTITULOS: Record<Vista, string> = {
  inicio: 'A etapa do processo e o que falta da sua parte.',
  agregado: 'Quem entra na declaração, com a senha do Portal das Finanças de cada pessoa.',
  rendimentos: 'Um separador por tipo de rendimento, com os respetivos documentos.',
  documentos: 'Todos os documentos enviados e quando foram abertos pelo contabilista.',
  progresso: 'As etapas do processo e o histórico de cada movimento.',
  pagamento: 'O preço discriminado e o pagamento da preparação.',
  mensagens: 'Fale comigo diretamente.',
};

type Props = {
  processo: string;
  conta: string;
  nome: string;
  estado: string;
  vistaInicial: string;
  dadosIniciais: Dados;
  teste: boolean;
  chegada?: boolean;
};

export function Espaco(props: Props) {
  return (
    <Idioma>
      <Chegada ativo={Boolean(props.chegada)} nome={props.nome} />
      <Painel {...props} />
    </Idioma>
  );
}

function Painel({ conta, processo, nome, estado: estadoInicial, vistaInicial, dadosIniciais, teste }: Props) {
  const { t, lingua, trocar } = usarIdioma();
  const inicial = (SEPARADORES as readonly string[]).includes(vistaInicial) ? (vistaInicial as Vista) : 'inicio';
  const [vista, setVista] = useState<Vista>(inicial);
  const [dados, setDados] = useState<Dados>(dadosIniciais);
  const [aCaminho, setACaminho] = useState<Vista | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [estado, setEstado] = useState(estadoInicial);
  // O botão para o portal Empresas só aparece a quem também o tem.
  const [comEmpresas, setComEmpresas] = useState(false);
  useEffect(() => { temPortalEmpresas().then(setComEmpresas).catch(() => {}); }, []);
  const [, comecar] = useTransition();

  /* O que já foi carregado fica guardado: voltar a um separador não repete o
     pedido. A recarga é explícita quando alguma coisa muda. */
  const cache = useRef<Map<string, Dados>>(new Map([[dadosIniciais.vista, dadosIniciais]]));

  const [ultima, setUltima] = useState<string | null>(
    (dadosIniciais.ultima_do_gabinete as { em?: string } | null)?.em || null,
  );

  // Cada leitura que traga o estado do processo atualiza-o: depois de pagar
  // ou de submeter, os separadores fecham a recolha sem recarregar a página.
  const absorver = useCallback((d: Dados) => {
    const p = d.processo as { estado?: string } | null | undefined;
    if (p && typeof p === 'object' && p.estado) setEstado(p.estado);
    if (d.ultima_do_gabinete !== undefined) {
      setUltima((d.ultima_do_gabinete as { em?: string } | null)?.em || null);
    }
  }, []);

  const [lida, setLida] = useState<string | null>(null);
  useEffect(() => setLida(lidaAte(processo)), [processo, vista]);
  const novaMensagem = Boolean(ultima && (!lida || ultima > lida)) && vista !== 'mensagens';

  /* Mudar de separador só troca o ecrã quando os dados chegam. Antes trocava
     logo, e durante um instante o separador novo desenhava-se com os dados do
     anterior. */
  const ir = useCallback(
    (destino: Vista, forcar = false) => {
      setErro(null);
      const guardado = cache.current.get(destino);
      if (guardado && !forcar) {
        setVista(destino);
        setDados(guardado);
        return;
      }
      setACaminho(destino);
      comecar(async () => {
        const { dados: novos, erro: falha } = await pedirVista(destino, processo);
        setACaminho(null);
        if (falha || !novos) {
          setErro(falha || 'Não foi possível carregar.');
          return;
        }
        cache.current.set(destino, novos as Dados);
        absorver(novos as Dados);
        setVista(destino);
        setDados(novos as Dados);
        window.scrollTo({ top: 0 });
      });
    },
    [processo, absorver],
  );

  /* Depois de uma alteração, o que estava guardado dos outros separadores
     pode estar desatualizado (contagens, prontidão, preço): esquece-se. */
  const recarregar = useCallback(() => {
    cache.current.clear();
    ir(vista, true);
  }, [ir, vista]);

  // No telemóvel o menu é uma faixa que desliza: o separador atual fica à vista.
  useEffect(() => {
    if (window.innerWidth > 900) return;
    document.querySelector(`.${e.menu} [aria-current="true"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [vista]);

  // O endereço acompanha o separador, para o botão de recuar funcionar e para
  // a ligação poder ser guardada — mas sem recarregar a página.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('separador') === vista) return;
    url.searchParams.set('separador', vista);
    window.history.replaceState(null, '', url);
  }, [vista]);

  const aberto = emRecolha(estado);
  const primeiro = (nome || '').trim().split(/\s+/)[0];

  return (
    <div className={e.espaco}>
      <aside className={e.lateral}>
        <Link href="/" className={e.marca} aria-label="RR.">
          <img src="/rr-branco.svg" alt="" width={259} height={142} />
        </Link>

        <nav className={e.menu} aria-label="Separadores">
          {SEPARADORES.map((s) => (
            <button key={s} type="button" className={e.item}
                    aria-current={s === vista} data-a-caminho={s === aCaminho}
                    onClick={() => ir(s)}>
              <Icone nome={s} />
              <span>{t(s)}</span>
              {s === 'mensagens' && novaMensagem && <span className={e.ponto} aria-label="Mensagem nova" />}
            </button>
          ))}
        </nav>

        {/* Quem está em baixo não é o cliente — é quem trata do processo
            dele. Saber a quem ligar vale mais do que ver o próprio nome. */}
        <div className={e.contabilista}>
          <img src="/ruben-rodrigues.webp" alt="Rúben Meirinho Rodrigues" width={96} height={96} className={e.avatar} />
          <div>
            <strong>Rúben Meirinho Rodrigues</strong>
            <span>Contabilista Certificado · Cédula 145854</span>
          </div>
          <div className={e.contactos}>
            <button type="button" onClick={() => ir('mensagens')}>Enviar mensagem</button>
            <a href="https://www.rr-contabilidade.com/contacto/" target="_blank" rel="noopener">Contactos</a>
          </div>
        </div>

        {comEmpresas && <PortalEmpresas className={e.outroPortal} />}
        <form action={signOut} className={e.sairForm}>
          <button type="submit" className={e.sair}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" />
            </svg>
            <span>{t('sair')}</span>
          </button>
        </form>
      </aside>

      <div className={e.principal}>
        <header className={e.topo}>
          <div className={e.tituloTopo}>
            <h1>{vista === 'inicio' ? `Olá${primeiro ? `, ${primeiro}` : ''}.` : t(vista)}</h1>
            <p>{SUBTITULOS[vista]}</p>
          </div>
          <div className={e.acoesTopo}>
            <button type="button" className={e.lingua} onClick={trocar} aria-label="Language">
              {lingua === 'pt' ? 'EN' : 'PT'}
            </button>
            {comEmpresas && <PortalEmpresas className={`${e.botaoTopo} ${e.soTelemovel}`} />}
            <Link href="/perfil" className={e.botaoTopo}>{t('conta')}</Link>
            <form action={signOut} className={e.sairTopo}>
              <button type="submit" className={e.botaoTopo}>{t('sair')}</button>
            </form>
          </div>
        </header>

        <main id="principal" className={e.painel} data-ocupado={Boolean(aCaminho)}>
          {erro && <p className="aviso-critico">{erro}</p>}

          {vista === 'inicio' && <Inicio dados={dados} ir={ir} />}
          {vista === 'agregado' && <Agregado dados={dados} processo={processo} aoMudar={recarregar} />}
          {vista === 'rendimentos' && (
            <Rendimentos dados={dados} conta={conta} processo={processo} estado={estado} aoMudar={recarregar} />
          )}
          {vista === 'documentos' && (
            <Documentos dados={dados} conta={conta} processo={processo} aberto={aberto} aoMudar={recarregar} />
          )}
          {vista === 'progresso' && <Acompanhamento dados={dados} ir={ir} />}
          {vista === 'pagamento' && (
            <Pagamento dados={dados} conta={conta} processo={processo} teste={teste} ir={ir} aoMudar={recarregar} />
          )}
          {vista === 'mensagens' && (
            <Mensagens dados={dados} conta={conta} processo={processo} aoLer={setLida} />
          )}
        </main>
      </div>
    </div>
  );
}

const EMPRESAS = (process.env.NEXT_PUBLIC_EMPRESAS_URL || 'https://portal.rr-contabilidade.com').replace(/\/$/, '');

/** Passar para o portal Empresas com a mesma sessão, depois de uma
    confirmação curta. */
function PortalEmpresas({ className }: { className: string }) {
  const caixa = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={className} onClick={() => caixa.current?.showModal()}>Portal Empresas</button>
      <dialog ref={caixa} className={e.confirmar} aria-labelledby="confirmar-empresas">
        <h2 id="confirmar-empresas">Mudar para o Portal Empresas?</h2>
        <p>A sessão mantém-se: não precisa de voltar a entrar. Pode regressar ao IRS pelo botão «Portal IRS».</p>
        <div className={e.confirmarAcoes}>
          <button type="button" className="btn btn-secundario" onClick={() => caixa.current?.close()}>Ficar no IRS</button>
          <a className="btn" href={`${EMPRESAS}/app`}>Mudar para o Portal Empresas</a>
        </div>
      </dialog>
    </>
  );
}

function Icone({ nome }: { nome: string }) {
  const p = {
    width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
  };
  switch (nome) {
    case 'inicio': return <svg {...p}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>;
    case 'agregado': return <svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></svg>;
    case 'rendimentos': return <svg {...p}><path d="M4 19V5M4 19h16" /><path d="M8 15l3-4 3 2 5-6" /></svg>;
    case 'documentos': return <svg {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></svg>;
    case 'progresso': return <svg {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5" /></svg>;
    case 'pagamento': return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>;
    case 'mensagens': return <svg {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>;
    default: return null;
  }
}
