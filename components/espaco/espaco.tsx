'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { pedirVista } from '@/lib/acoes-espaco';
import { signOut } from '@/lib/auth-actions';
import { Idioma, usarIdioma } from './idioma';
import { Agregado } from './agregado';
import { Rendimentos } from './rendimentos';
import { Documentos } from './documentos';
import { Acompanhamento } from './acompanhamento';
import { emRecolha } from '@/lib/fluxo';
import { Pagamento } from './pagamento';
import { Mensagens } from './mensagens';
import e from './espaco.module.css';

export type Dados = Record<string, unknown> & { vista: string };

const SEPARADORES = ['agregado', 'rendimentos', 'documentos', 'progresso', 'pagamento', 'mensagens'] as const;
type Vista = (typeof SEPARADORES)[number];

type Props = {
  processo: string;
  conta: string;
  nome: string;
  estado: string;
  vistaInicial: string;
  dadosIniciais: Dados;
  teste: boolean;
};

export function Espaco(props: Props) {
  return (
    <Idioma>
      <Painel {...props} />
    </Idioma>
  );
}

function Painel({ conta, processo, nome, estado, vistaInicial, dadosIniciais, teste }: Props) {
  const { t, lingua, trocar } = usarIdioma();
  const [vista, setVista] = useState<Vista>(
    (SEPARADORES as readonly string[]).includes(vistaInicial) ? (vistaInicial as Vista) : 'agregado',
  );
  const [dados, setDados] = useState<Dados>(dadosIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, comecar] = useTransition();

  /* O que já foi carregado fica guardado: voltar a um separador não repete o
     pedido. A recarga é explícita quando alguma coisa muda. */
  const cache = useRef<Map<string, Dados>>(new Map([[dadosIniciais.vista, dadosIniciais]]));

  const ir = useCallback(
    (destino: Vista, forcar = false) => {
      setVista(destino);
      setErro(null);
      const guardado = cache.current.get(destino);
      if (guardado && !forcar) {
        setDados(guardado);
        return;
      }
      comecar(async () => {
        const { dados: novos, erro: falha } = await pedirVista(destino, processo);
        if (falha || !novos) {
          setErro(falha || 'Não foi possível carregar.');
          return;
        }
        cache.current.set(destino, novos as Dados);
        setDados(novos as Dados);
      });
    },
    [processo],
  );

  const recarregar = useCallback(() => ir(vista, true), [ir, vista]);

  // O endereço acompanha o separador, para o botão de recuar funcionar e para
  // a ligação poder ser guardada — mas sem recarregar a página.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('separador') === vista) return;
    url.searchParams.set('separador', vista);
    window.history.replaceState(null, '', url);
  }, [vista]);

  return (
    <div className={e.espaco}>
      <aside className={e.lateral}>
        <Link href="/" className={e.marca} aria-label="RR.">
          <img src="/rr-branco.svg" alt="" width={259} height={142} />
        </Link>

        <nav className={e.menu} aria-label="Separadores">
          {SEPARADORES.map((s) => (
            <button
              key={s}
              type="button"
              className={e.item}
              aria-current={s === vista}
              onClick={() => ir(s)}
            >
              {t(s)}
            </button>
          ))}
        </nav>

        {/* Quem está em baixo não é o cliente — é quem trata do processo
            dele. Saber a quem ligar vale mais do que ver o próprio nome. */}
        <div className={e.rodapeLateral}>
          <strong>Rúben Meirinho Rodrigues</strong>
          <span>Contabilista Certificado</span>
          <span>Cédula n.º 145854</span>
          <a href="https://www.rr-contabilidade.com/contacto/" target="_blank" rel="noopener">
            Contactos
          </a>
        </div>
      </aside>

      <div>
        <header className={e.topo}>
          <h1 className={e.titulo}>{t(vista)}</h1>
          <div className={e.acoesTopo}>
            <button type="button" className={e.lingua} onClick={trocar} aria-label="Language">
              {lingua === 'pt' ? 'EN' : 'PT'}
            </button>
            <Link href="/perfil" className="btn btn-secundario">
              {t('conta')}
            </Link>
            <form action={signOut}>
              <button type="submit" className="btn btn-secundario">
                {t('sair')}
              </button>
            </form>
          </div>
        </header>

        <main id="principal" className={e.painel} data-ocupado={aCarregar}>
          {erro && <p className="aviso-critico">{erro}</p>}
          {aCarregar && !dados && <p className="suave">{t('carregar')}</p>}

          {vista === 'agregado' && (
            <Agregado dados={dados} processo={processo} aoMudar={recarregar} />
          )}
          {vista === 'rendimentos' && (
            <Rendimentos dados={dados} conta={conta} processo={processo} estado={estado}
                         aoMudar={recarregar} />
          )}
          {vista === 'documentos' && (
            <Documentos dados={dados} conta={conta} processo={processo}
                        aberto={emRecolha(estado)} aoMudar={recarregar} />
          )}
          {vista === 'progresso' && <Acompanhamento dados={dados} processo={processo} />}
          {vista === 'pagamento' && (
            <Pagamento dados={dados} conta={conta} processo={processo} teste={teste} />
          )}
          {vista === 'mensagens' && (
            <Mensagens dados={dados} conta={conta} processo={processo} aoMudar={recarregar} />
          )}
        </main>
      </div>
    </div>
  );
}
