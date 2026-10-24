'use client';

import { useActionState, useEffect, useRef } from 'react';
import type { Resultado } from '@/lib/acoes';
import { usarPortal } from './contexto';

type Acao = (anterior: Resultado | null, dados: FormData) => Promise<Resultado>;

type Props = {
  acao: Acao;
  /** Limpa os campos depois de gravar com sucesso. */
  limpar?: boolean;
  className?: string;
  children: (pendente: boolean) => React.ReactNode;
};

/* Todos os formulários do portal passam por aqui: injetam conta e processo,
   mostram o resultado no aviso do topo e voltam a pedir a vista afetada. */
export function Formulario({ acao, limpar, className, children }: Props) {
  const { alvo, anunciar, recarregar } = usarPortal();
  const [resultado, submeter, pendente] = useActionState(acao, null);
  const referencia = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!resultado) return;
    // Um documento devolve um endereço assinado em vez de uma mensagem.
    if (resultado.url) {
      window.open(resultado.url, '_blank', 'noopener');
      return;
    }
    anunciar(resultado);
    if (resultado.ok) {
      if (limpar) referencia.current?.reset();
      recarregar();
    }
  }, [resultado, anunciar, recarregar, limpar]);

  return (
    <form ref={referencia} action={submeter} className={className}>
      <input type="hidden" name="conta" value={alvo.conta} />
      <input type="hidden" name="processo" value={alvo.processo ?? ''} />
      {children(pendente)}
    </form>
  );
}
