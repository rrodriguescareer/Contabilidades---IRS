'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import type { Espaco } from '@/lib/espaco';
import { FornecedorPortal, type Portal as ValorPortal } from './contexto';
import { ICONES } from './icones';
import { VISTAS } from './vistas';
import e from './portal.module.css';

type Props = {
  gabinete: boolean;
  conta: string;
  processo: string | null;
  estado: string;
  rotulo: string;
  nome: string;
  separadores: readonly string[];
  vistaInicial: string;
  dadosIniciais: Espaco;
};

const NOMES: Record<string, string> = {
  resumo: 'Resumo',
  agregado: 'Agregado',
  rendimentos: 'Rendimentos',
  documentos: 'Documentos',
  mensagens: 'Mensagens',
  progresso: 'Andamento',
  pagamento: 'Pagamento',
  fila: 'Processos',
  alertas: 'Alertas',
};

/* No telemóvel a barra inferior só mostra cinco destinos. Mais do que isso
   deixa de se conseguir tocar com o polegar. */
const BARRA_TELEMOVEL = 5;

export function Portal(props: Props) {
  const { gabinete, conta, processo, estado, separadores, vistaInicial, dadosIniciais } = props;

  const [vista, definirVista] = useState(vistaInicial);
  const [aviso, definirAviso] = useState<{ mensagem?: string; erro?: string } | null>(null);
  const [aCarregar, iniciarTransicao] = useTransition();

  // Cada separador visitado fica em memória: voltar atrás é instantâneo.
  const memoria = useRef(new Map<string, Espaco>([[vistaInicial, dadosIniciais]]));
  const [dados, definirDados] = useState<Espaco>(dadosIniciais);

  const pedir = useCallback(
    async (alvo: string, forcar = false) => {
      if (!forcar) {
        const guardado = memoria.current.get(alvo);
        if (guardado) {
          definirDados(guardado);
          return;
        }
      }
      const procura = new URLSearchParams({ vista: alvo });
      if (processo) procura.set('processo', processo);
      if (gabinete) procura.set('gabinete', '1');

      const resposta = await fetch(`/api/espaco?${procura}`, { cache: 'no-store' });
      if (!resposta.ok) {
        definirAviso({ erro: 'Não foi possível carregar este separador.' });
        return;
      }
      const corpo = (await resposta.json()) as Espaco;
      memoria.current.set(alvo, corpo);
      definirDados(corpo);
    },
    [gabinete, processo],
  );

  const irPara = useCallback(
    (alvo: string) => {
      if (alvo === vista) return;
      definirVista(alvo);
      definirAviso(null);
      // O endereço acompanha o separador, para o botão de voltar funcionar.
      const url = new URL(window.location.href);
      url.searchParams.set('separador', alvo);
      window.history.replaceState(null, '', url);
      iniciarTransicao(() => void pedir(alvo));
    },
    [pedir, vista],
  );

  const recarregar = useCallback(() => {
    iniciarTransicao(() => void pedir(vista, true));
  }, [pedir, vista]);

  // Mudanças noutros separadores ficam desatualizadas assim que gravamos algo.
  const anunciar = useCallback((resultado: { mensagem?: string; erro?: string }) => {
    definirAviso(resultado);
    if (resultado.mensagem) memoria.current.clear();
  }, []);

  useEffect(() => {
    if (!aviso?.mensagem) return;
    const relogio = setTimeout(() => definirAviso(null), 6000);
    return () => clearTimeout(relogio);
  }, [aviso]);

  const valor = useMemo<ValorPortal>(
    () => ({ alvo: { conta, processo }, gabinete, estado, recarregar, irPara, anunciar }),
    [conta, processo, gabinete, estado, recarregar, irPara, anunciar],
  );

  const Vista = VISTAS[vista] ?? VISTAS.resumo;
  const naBarra = separadores.slice(0, BARRA_TELEMOVEL);

  return (
    <FornecedorPortal value={valor}>
      <div className={`${e.aplicacao} ${gabinete ? e.gabinete : ''}`}>
        <header className={e.cabecalho}>
          <div className={`${e.cabecalhoInterior} envolve`}>
            <Link href={gabinete ? '/gabinete' : '/app'} className={e.marca} aria-label="Início">
              <img src={gabinete ? '/rr-branco.svg' : '/rr.svg'} alt="RR." width={294} height={195} />
            </Link>
            <div className={e.contexto}>
              <span className={e.contextoRotulo}>{props.rotulo}</span>
              <span className={e.contextoNome}>{props.nome}</span>
            </div>
            <div className={e.acoesCabecalho}>
              <Link href="/perfil" className="btn btn-discreto btn-sm">
                Conta
              </Link>
            </div>
          </div>
        </header>

        <nav className={e.separadores} aria-label="Separadores">
          <div className={`${e.separadoresInterior} envolve`}>
            {separadores.map((alvo) => (
              <button
                key={alvo}
                type="button"
                className={e.separador}
                aria-current={alvo === vista ? 'page' : undefined}
                onClick={() => irPara(alvo)}
              >
                {NOMES[alvo] ?? alvo}
              </button>
            ))}
          </div>
        </nav>

        <main id="principal" className={e.conteudo} data-carregar={aCarregar || undefined}>
          <div className="envolve">
            {aviso?.erro && (
              <p className={`aviso aviso-critico ${e.alerta}`} role="alert">
                {aviso.erro}
              </p>
            )}
            {aviso?.mensagem && (
              <p className={`aviso aviso-positivo ${e.alerta}`} role="status">
                {aviso.mensagem}
              </p>
            )}
            <Vista dados={dados} />
          </div>
        </main>

        <nav className={e.barraInferior} aria-label="Navegação">
          {naBarra.map((alvo) => (
            <button
              key={alvo}
              type="button"
              className={e.botaoInferior}
              aria-current={alvo === vista ? 'page' : undefined}
              onClick={() => irPara(alvo)}
            >
              {ICONES[alvo]}
              <span>{NOMES[alvo] ?? alvo}</span>
            </button>
          ))}
        </nav>
      </div>
    </FornecedorPortal>
  );
}
