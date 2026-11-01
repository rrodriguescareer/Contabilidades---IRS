'use server';
import { session } from './auth';

/* O que mudou desde a última visita a cada separador: os números do menu. */

export type Novidades = { progresso?: number; pagamento?: number; documentos?: number; desistencia?: string | null };

export async function novidadesDoProcesso(processo: string): Promise<Novidades> {
  const { client, context } = await session();
  if (!context.cases?.some((c: { id: string }) => c.id === processo)) return {};
  const { data } = await client.rpc('novidades_irs', { processo });
  return (data || {}) as Novidades;
}

export async function marcarVisto(area: 'progresso' | 'pagamento', processo: string) {
  const { client, context } = await session();
  if (!['progresso', 'pagamento'].includes(area) || !context.cases?.some((c: { id: string }) => c.id === processo)) return;
  await client.rpc('marcar_visto', { p_area: `irs:${area}:${processo}` });
}
