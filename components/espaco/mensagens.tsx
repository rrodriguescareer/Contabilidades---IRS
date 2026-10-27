'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { enviarMensagemAoGabinete, pedirVista } from '@/lib/acoes-espaco';
import type { Dados } from './espaco';
import e from './espaco.module.css';

type Mensagem = { id: string; corpo: string; em: string; do_gabinete: boolean; aEnviar?: boolean; falhou?: boolean };

const CHAVE = (processo: string) => `rr-lidas-${processo}`;

/** Até quando o cliente já leu as mensagens deste processo (neste browser). */
export function lidaAte(processo: string): string | null {
  try { return localStorage.getItem(CHAVE(processo)); } catch { return null; }
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
const dia = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
};

/* A conversa com o contabilista. Atualiza-se sozinha enquanto está aberta,
   a mensagem enviada aparece logo (e diz se falhou), e as respostas do
   gabinete ficam do lado esquerdo, com o nome de quem responde. */
export function Mensagens({
  dados, processo, aoLer,
}: { dados: Dados; conta: string; processo: string; aoLer: (em: string) => void }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>((dados.mensagens as Mensagem[]) || []);
  const [texto, setTexto] = useState('');
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  const atualizar = useCallback(async () => {
    const { dados: novos } = await pedirVista('mensagens', processo);
    const recebidas = (novos?.mensagens as Mensagem[] | undefined) || null;
    if (recebidas) setMensagens((atuais) => [...recebidas, ...atuais.filter((m) => m.falhou)]);
  }, [processo]);

  // Enquanto o separador está aberto e a janela à vista, pergunta a cada 15 s.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') atualizar();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [atualizar]);

  // A conversa lê-se de baixo: o mais recente fica à vista. Só a caixa da
  // conversa desce — a página não salta.
  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens.length]);

  // O que está à vista conta como lido.
  useEffect(() => {
    const ultima = [...mensagens].reverse().find((m) => m.do_gabinete);
    if (!ultima) return;
    try { localStorage.setItem(CHAVE(processo), ultima.em); } catch { /* sem armazenamento */ }
    aoLer(ultima.em);
  }, [mensagens, processo, aoLer]);

  const enviar = async (corpo: string, reenvio?: string) => {
    const limpo = corpo.trim();
    if (!limpo) return;
    const id = reenvio || `local-${Date.now()}`;
    const provisoria: Mensagem = { id, corpo: limpo, em: new Date().toISOString(), do_gabinete: false, aEnviar: true };
    setMensagens((m) => [...m.filter((x) => x.id !== id), provisoria]);
    if (!reenvio) setTexto('');
    const r = await enviarMensagemAoGabinete(processo, limpo);
    if (!r.ok) {
      setMensagens((m) => m.map((x) => (x.id === id ? { ...x, aEnviar: false, falhou: true } : x)));
      return;
    }
    setMensagens((m) => m.filter((x) => x.id !== id));
    await atualizar();
  };

  // Agrupadas por dia, para a conversa se ler como uma conversa.
  const grupos: { dia: string; itens: Mensagem[] }[] = [];
  for (const m of mensagens) {
    const d = dia(m.em);
    if (grupos.at(-1)?.dia !== d) grupos.push({ dia: d, itens: [] });
    grupos.at(-1)!.itens.push(m);
  }

  return (
    <section className={`${e.cartao} ${e.chat}`}>
      <header className={e.chatTopo}>
        <span className={e.avatar}>RR</span>
        <div>
          <strong>Rúben Meirinho Rodrigues</strong>
          <span>Contabilista Certificado · responde normalmente no mesmo dia útil</span>
        </div>
      </header>

      <div className={e.chatLista} ref={lista} aria-live="polite">
        {mensagens.length === 0 && (
          <div className={e.chatVazio}>
            <strong>Ainda não há mensagens.</strong>
            <span>Pergunte o que precisar sobre o seu IRS — respondo aqui, e fica tudo registado no processo.</span>
          </div>
        )}
        {grupos.map((g) => (
          <div key={g.dia} className={e.chatDia}>
            <span className={e.chatData}>{g.dia}</span>
            {g.itens.map((m) => (
              <article key={m.id} className={e.balao} data-meu={!m.do_gabinete} data-falhou={m.falhou}>
                <p>{m.corpo}</p>
                <span>
                  {m.do_gabinete ? 'Rúben · ' : ''}{hora(m.em)}
                  {m.aEnviar ? ' · a enviar…' : ''}
                </span>
                {m.falhou && (
                  <button type="button" onClick={() => enviar(m.corpo, m.id)}>Não foi enviada. Tentar outra vez</button>
                )}
              </article>
            ))}
          </div>
        ))}
      </div>

      <form className={e.chatCompor} onSubmit={(ev) => { ev.preventDefault(); enviar(texto); }}>
        <textarea ref={campo} value={texto} rows={1} maxLength={4000} aria-label="Escrever mensagem"
                  placeholder="Escreva a sua mensagem…"
                  onChange={(ev) => {
                    setTexto(ev.target.value);
                    ev.target.style.height = 'auto';
                    ev.target.style.height = `${Math.min(ev.target.scrollHeight, 180)}px`;
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); enviar(texto); }
                  }} />
        <button type="submit" className={e.enviar} disabled={!texto.trim()} aria-label="Enviar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" />
          </svg>
        </button>
      </form>
      <p className={e.chatNota}>Enter envia · Shift + Enter muda de linha</p>
    </section>
  );
}
