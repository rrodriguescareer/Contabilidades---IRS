import 'server-only';
import { supabase } from './supabase';

/* Um separador, um pedido.
   As funções espaco_irs / espaco_gabinete devolvem o ecrã inteiro num só JSON,
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

/* A consola não espelha os separadores do cliente: tem os seus. */
export const VISTAS_GABINETE = ['fila', 'mensagens', 'pagamentos', 'alertas', 'processo'] as const;

export type VistaCliente = (typeof VISTAS_CLIENTE)[number];
export type VistaGabinete = (typeof VISTAS_GABINETE)[number];

export type Espaco = Record<string, unknown> & { vista: string; processo?: string | null };

export function vistaValida(valor: unknown, gabinete = false): string {
  const lista: readonly string[] = gabinete ? VISTAS_GABINETE : VISTAS_CLIENTE;
  const texto = typeof valor === 'string' ? valor : '';
  if (lista.includes(texto)) return texto;
  return gabinete ? 'fila' : 'agregado';
}

export async function carregarEspaco(vista: string, processo: string | null, gabinete = false) {
  const cliente = await supabase();
  const { data, error } = await cliente.rpc(gabinete ? 'espaco_gabinete' : 'espaco_irs', {
    vista,
    processo,
  });
  if (error) return { dados: null, erro: error.message };
  return { dados: (data || { vista }) as Espaco, erro: null };
}
