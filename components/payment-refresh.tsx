'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/* A Revolut confirma por webhook, mas o cliente volta do checkout antes disso.
   Aqui perguntamos o estado diretamente, para não deixar o ecrã em suspenso. */
export default function ConfirmarPagamento({ id, automatico = false }: { id: string; automatico?: boolean }) {
  const [ocupado, definirOcupado] = useState(false);
  const [mensagem, definirMensagem] = useState('');
  const router = useRouter();

  const verificar = useCallback(async () => {
    definirOcupado(true);
    try {
      const resposta = await fetch('/api/revolut/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!resposta.ok) throw new Error();
      const dados = await resposta.json();
      definirMensagem(dados.state === 'paid' ? 'Pagamento confirmado.' : 'O pagamento continua por confirmar.');
      if (['paid', 'failed', 'cancelled'].includes(dados.state)) router.refresh();
    } catch {
      definirMensagem('Não foi possível confirmar agora. Tente novamente ou contacte o contabilista.');
    } finally {
      definirOcupado(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (automatico) void verificar();
  }, [automatico, verificar]);

  return (
    <div className="pilha pilha-3">
      <button className="btn btn-secundario" disabled={ocupado} onClick={verificar}>
        {ocupado ? 'A confirmar…' : 'Atualizar estado do pagamento'}
      </button>
      {mensagem && <p role="status" className="suave">{mensagem}</p>}
    </div>
  );
}
