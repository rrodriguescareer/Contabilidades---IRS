import 'server-only';
import { supabase } from './supabase';

/* Um separador, um pedido.
   A função espaco_irs devolve o ecrã inteiro num só JSON,
   em vez das quatro a onze chamadas PostgREST que cada vista fazia antes. */

/* Pela ordem do menu lateral. O primeiro é o destino por omissão. */
export const VISTAS_CLIENTE = [
  'agregado',
  'rendimentos',
  'documentos',
  'progresso',
  'pagamento',
  'mensagens',
] as const;

export type VistaCliente = (typeof VISTAS_CLIENTE)[number];

export type Espaco = Record<string, unknown> & { vista: string; processo?: string | null };

export function vistaValida(valor: unknown): string {
  const lista: readonly string[] = VISTAS_CLIENTE;
  const texto = typeof valor === 'string' ? valor : '';
  return lista.includes(texto) ? texto : 'agregado';
}

/* Só o espaço do cliente: o gabinete vive na plataforma de gestão. */
export async function carregarEspaco(vista: string, processo: string | null) {
  const cliente = await supabase();

  /* O acompanhamento tem a sua função: precisa da prontidão, das contagens e
     do pagamento, que o espaco_irs não traz — e aquela já serve sete vistas. */
  if (vista === 'progresso') {
    const { data, error } = await cliente.rpc('espaco_progresso', { processo });
    if (error) return { dados: null, erro: error.message };
    return { dados: { ...(data || {}), vista, processo } as Espaco, erro: null };
  }

  const { data, error } = await cliente.rpc('espaco_irs', { vista, processo });
  if (error) return { dados: null, erro: error.message };
  return { dados: (data || { vista }) as Espaco, erro: null };
}
