'use client';
import { useActionState, useEffect, useRef } from 'react';
import { enviarMensagem } from '@/lib/acoes';
import type { Dados } from './espaco';
import e from './espaco.module.css';

type Mensagem = { id: string; corpo: string; em: string; do_gabinete: boolean };

const data = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

export function Mensagens({
  dados, conta, processo, aoMudar,
}: { dados: Dados; conta: string; processo: string; aoMudar: () => void }) {
  const mensagens = (dados.mensagens as Mensagem[]) || [];
  const [estado, accao, aEnviar] = useActionState(enviarMensagem, null);
  const forma = useRef<HTMLFormElement>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (estado?.ok) {
      forma.current?.reset();
      aoMudar();
    }
  }, [estado, aoMudar]);

  // A conversa lê-se de cima para baixo: o mais recente fica à vista.
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' });
  }, [mensagens.length]);

  return (
    <section className={e.cartao}>
      <h2>Mensagens</h2>
      <p className="suave">Fale comigo diretamente. Respondo aqui.</p>

      <div className="conversa">
        {mensagens.length === 0 && (
          <div className={e.vazio}>Ainda não há mensagens. Escreva a primeira.</div>
        )}
        {mensagens.map((m) => (
          <article key={m.id} className="balao" data-meu={!m.do_gabinete}>
            <p>{m.corpo}</p>
            <span className="suave">
              {m.do_gabinete ? 'Rúben Rodrigues' : 'Você'} · {data(m.em)}
            </span>
          </article>
        ))}
        <div ref={fim} />
      </div>

      <form ref={forma} action={accao} className="form-membro">
        <input type="hidden" name="conta" value={conta} />
        <input type="hidden" name="processo" value={processo} />
        <label>
          Mensagem
          <textarea name="corpo" rows={3} required maxLength={4000} />
        </label>
        {estado && !estado.ok && <p className="aviso-critico">{estado.erro}</p>}
        <button type="submit" className="btn" disabled={aEnviar}>
          {aEnviar ? 'A enviar…' : 'Enviar'}
        </button>
      </form>
    </section>
  );
}
