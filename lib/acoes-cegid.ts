'use server';
import { session } from './auth';
import { supabase } from './supabase';
import { adminClient } from './admin-client';
import { criarFichaCliente, temCredenciais } from './cegid';

type Resposta = { ok: boolean; erro?: string; aviso?: string; detalhe?: string };

/* A rotina automática depois do onboarding. Falhar aqui não pode travar o
   cliente: o processo segue e o aviso fica para o gabinete resolver. */
export async function criarFichaAposOnboarding(): Promise<{ aviso?: string }> {
  const { context } = await session();
  const perfil = context.profile;
  if (!perfil?.nif) return {};
  if (!(await temCredenciais())) return {};

  /* Só o titular tem ficha no Cegid. Os membros do agregado não são clientes
     do escritório — passam a ser se um dia saírem para conta própria, e aí é
     esse onboarding que lhes abre a ficha. */
  const p = perfil as unknown as Record<string, string | null | undefined>;
  const r = await criarFichaCliente({
    nome: perfil.full_name || context.email,
    nif: perfil.nif,
    email: context.email,
    telefone: perfil.phone,
    residencia: p.tax_residence,
    nascimento: p.birth_date,
    rua: p.street,
    codigoPostal: p.postal_code,
    localidade: p.locality,
  });
  if (r.ok) return {};
  if (r.nifInvalido) {
    const cliente = await supabase();
    await cliente.from('task_alerts').insert({
      account_id: context.accounts?.[0]?.id,
      kind: 'nif_recusado',
    });
    return {
      aviso:
        'O NIF indicado não foi aceite pela Autoridade Tributária através do Cegid. Confirme-o em "A minha conta" — sem um NIF válido não consigo submeter a declaração.',
    };
  }
  return {};
}

/* --------------------------------------------------------- modo de teste */
/* Enquanto a plataforma não está divulgada, ela própria serve de banco de
   ensaio. Estes atalhos só existem com MODO_TESTE ligado: quando abrires ao
   público, apagas a variável e eles desaparecem — sem mexer em código. */
export async function modoDeTeste() {
  return process.env.MODO_TESTE === 'true';
}

/** Emitir a fatura a partir do espaço do cliente, para testar a API. */
export async function emitirFaturaDoMeuProcesso(processo: string): Promise<Resposta> {
  if (process.env.MODO_TESTE !== 'true') {
    return { ok: false, erro: 'A emissão manual está desligada.' };
  }
  const { context } = await session();
  const meu = context.cases?.some((c: { id: string }) => c.id === processo);
  if (!meu) return { ok: false, erro: 'Sem acesso a este processo.' };

  const perfil = context.profile;
  if (!perfil?.nif) return { ok: false, erro: 'Preencha o NIF em "A minha conta" primeiro.' };

  const admin = adminClient();
  const { data: pago } = await admin
    .from('irs_checkouts')
    .select('amount_cents')
    .eq('case_id', processo)
    .eq('state', 'paid')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const total = pago?.amount_cents ?? 100;
  const { emitirFaturaRecibo } = await import('./cegid');
  const r = await emitirFaturaRecibo({
    nif: perfil.nif,
    nome: perfil.full_name || context.email,
    descricao: 'IRS 2026',
    totalCents: total,
  });
  if (!r.ok) {
    return {
      ok: false,
      erro: r.nifInvalido ? `O Cegid recusou o NIF ${perfil.nif}.` : r.erro,
    };
  }
  return {
    ok: true,
    aviso: `Fatura-recibo de ${(total / 100).toFixed(2)} € criada no Cegid, em preparação.`,
  };
}
