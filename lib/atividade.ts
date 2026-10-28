import 'server-only';
import { headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from './admin-client';

/* O registo de atividade: a prova numa contestação de pagamento. Guarda-se
   de onde veio cada passo (IP e browser), porque é isso que o Stripe pede
   para mostrar que foi o próprio titular do cartão a usar o serviço.
   Registar nunca pode fazer falhar o passo em si: os erros ficam no log. */

async function origem() {
  try {
    const h = await headers();
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || null;
    return { ip, agente: (h.get('user-agent') || '').slice(0, 400) || null };
  } catch {
    return { ip: null, agente: null };
  }
}

/** Um passo do próprio utilizador, com a sessão dele. */
export async function registar(cliente: SupabaseClient, tipo: string, detalhe?: string | null, processo?: string | null) {
  const { ip, agente } = await origem();
  const { error } = await cliente.rpc('registar_atividade', {
    p_tipo: tipo, p_detalhe: detalhe ?? null, p_case: processo ?? null, p_ip: ip, p_agente: agente,
  });
  if (error) console.error(JSON.stringify({ event: 'rr_registo_falhou', tipo, erro: error.message }));
}

/** Um passo do sistema (webhook, integração) ou de alguém ainda sem sessão. */
export async function registarComoSistema(
  tipo: string, detalhe: string | null,
  alvo: { user?: string | null; conta?: string | null; processo?: string | null },
  comOrigem = false,
) {
  const { ip, agente } = comOrigem ? await origem() : { ip: null, agente: null };
  try {
    const { error } = await adminClient().from('registo_atividade').insert({
      user_id: alvo.user ?? null, account_id: alvo.conta ?? null, case_id: alvo.processo ?? null,
      tipo, detalhe: detalhe?.slice(0, 2000) ?? null, ip, agente,
    });
    if (error) throw error;
  } catch (falha) {
    console.error(JSON.stringify({ event: 'rr_registo_falhou', tipo, erro: String((falha as Error)?.message || falha) }));
  }
}
