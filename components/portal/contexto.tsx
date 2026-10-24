'use client';

import { createContext, useContext } from 'react';
import type { Espaco } from '@/lib/espaco';

export type Alvo = { conta: string; processo: string | null };

export type Portal = {
  alvo: Alvo;
  gabinete: boolean;
  /** Estado do processo aberto, para saber o que ainda é editável. */
  estado: string;
  /** Volta a pedir a vista atual depois de uma gravação. */
  recarregar: () => void;
  /** Salta para outro separador. */
  irPara: (vista: string) => void;
  anunciar: (resultado: { mensagem?: string; erro?: string }) => void;
};

const ContextoPortal = createContext<Portal | null>(null);

export const FornecedorPortal = ContextoPortal.Provider;

export function usarPortal() {
  const valor = useContext(ContextoPortal);
  if (!valor) throw new Error('usarPortal fora do portal');
  return valor;
}

export type PropsVista = { dados: Espaco };
