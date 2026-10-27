import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { configuration, supabase } from './supabase';
import { portalContext } from './portal-context';

const erro = (mensagem: string) => `/entrar?erro=${encodeURIComponent(mensagem)}`;

/** O gabinete do contabilista vive na gestão. Sem o endereço configurado,
    não há para onde o mandar — e diz-se isso em vez de o deixar num ecrã vazio. */
export function gabineteNaGestao(caminho = '/irs') {
  const base = (process.env.NEXT_PUBLIC_GESTAO_URL || '').replace(/\/$/, '');
  return /^https:\/\//.test(base) ? `${base}${caminho}` : erro('O gabinete está na plataforma de gestão.');
}

/** Quem está autenticado, sem decidir para onde vai. */
export const identity = cache(async function identity() {
  if (!configuration()) redirect('/entrar');
  const client = await supabase();

  // getSession só lê o token. É o PostgREST que valida assinatura e validade,
  // e get_portal_context deriva a identidade de auth.uid(), nunca do cookie.
  const { data: guardado, error } = await client.auth.getSession();
  if (error || !guardado.session?.access_token) redirect('/entrar');

  const { data: contexto, error: falhaContexto } = await portalContext(client);
  if (falhaContexto || !contexto) redirect(erro('Não foi possível carregar a conta.'));
  if (contexto.profile.disabled_at || contexto.profile.deleted_at) {
    redirect(erro('Acesso bloqueado. Contacte o contabilista.'));
  }
  if (!contexto.email_confirmed) redirect(erro('Confirme o seu email para continuar.'));

  return { client, user: { id: contexto.id, email: contexto.email }, context: contexto };
});

/** Área do cliente. O contabilista tem um espaço próprio e é levado para lá. */
export const session = cache(async function session() {
  const atual = await identity();
  if (atual.context.is_staff) redirect(gabineteNaGestao());
  if (!atual.context.legal_accepted) redirect('/aceitar-termos');
  if (!atual.context.profile.onboarding_completed_at) redirect('/onboarding');
  return atual;
});
