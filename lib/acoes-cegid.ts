'use server';
import { gabinete, session } from './auth';
import { supabase } from './supabase';
import { adminClient } from './admin-client';
import {
  criarFichaCliente, emitirFaturaRecibo, guardarCredenciais, origemDasCredenciais,
  temCredenciais, testarLigacao,
} from './cegid';

type Resposta = { ok: boolean; erro?: string; aviso?: string; detalhe?: string };

export async function estadoCegid() {
  await gabinete();
  return { configurado: await temCredenciais(), origem: await origemDasCredenciais() };
}

export async function guardarCredenciaisCegid(form: FormData): Promise<Resposta> {
  await gabinete();
  const id = String(form.get('identificador') || '').trim();
  const segredo = String(form.get('segredo') || '').trim();
  if (id.length < 8 || segredo.length < 8) {
    return { ok: false, erro: 'Indique o identificador e o segredo.' };
  }
  await guardarCredenciais(id, segredo);
  const prova = await testarLigacao();
  if (!prova.ok) return { ok: false, erro: `Guardado, mas a ligação falhou: ${prova.erro}` };
  return { ok: true, aviso: 'Credenciais guardadas e ligação confirmada.' };
}

export async function testarCegid(): Promise<Resposta> {
  await gabinete();
  const r = await testarLigacao();
  return r.ok ? { ok: true, aviso: 'Ligação ao Cegid confirmada.' } : { ok: false, erro: r.erro };
}

/** Dados do titular de um processo, para a ficha e para a fatura. */
async function titularDoProcesso(processo: string) {
  const admin = adminClient();
  const { data: caso } = await admin
    .from('irs_cases')
    .select('account_id, client_accounts(name)')
    .eq('id', processo)
    .maybeSingle();
  if (!caso) return null;
  const { data: perfil } = await admin
    .from('profiles')
    .select('full_name, nif, email, phone, tax_residence, birth_date, street, postal_code, locality')
    .in('id', (
      await admin.from('account_access').select('user_id').eq('account_id', caso.account_id)
    ).data?.map((a) => a.user_id) || [])
    .not('nif', 'is', null)
    .limit(1)
    .maybeSingle();
  const nome = perfil?.full_name
    || (caso as { client_accounts?: { name?: string } }).client_accounts?.name
    || 'Cliente';
  return { conta: caso.account_id, nome, perfil };
}

export async function criarFichaCegid(processo: string): Promise<Resposta> {
  await gabinete();
  const alvo = await titularDoProcesso(processo);
  if (!alvo) return { ok: false, erro: 'Processo não encontrado.' };
  if (!alvo.perfil?.nif) return { ok: false, erro: 'O cliente ainda não tem NIF no perfil.' };

  const r = await criarFichaCliente({
    nome: alvo.nome,
    nif: alvo.perfil.nif,
    email: alvo.perfil.email,
    telefone: alvo.perfil.phone,
    residencia: alvo.perfil.tax_residence,
    nascimento: alvo.perfil.birth_date,
    rua: alvo.perfil.street,
    codigoPostal: alvo.perfil.postal_code,
    localidade: alvo.perfil.locality,
  });
  if (!r.ok) {
    return {
      ok: false,
      erro: r.nifInvalido
        ? `O Cegid recusou o NIF ${alvo.perfil.nif}. Confirme-o com o cliente antes de seguir.`
        : r.erro,
    };
  }
  const id = (r.dados as { data?: { id?: string }; id?: string }).data?.id
    || (r.dados as { id?: string }).id;
  return { ok: true, aviso: 'Ficha de cliente criada no Cegid.', detalhe: id ? `ID ${id}` : undefined };
}

export async function emitirFaturaCegid(processo: string): Promise<Resposta> {
  await gabinete();
  const alvo = await titularDoProcesso(processo);
  if (!alvo) return { ok: false, erro: 'Processo não encontrado.' };
  if (!alvo.perfil?.nif) return { ok: false, erro: 'O cliente ainda não tem NIF no perfil.' };

  const admin = adminClient();
  const { data: pago } = await admin
    .from('irs_checkouts')
    .select('amount_cents, state')
    .eq('case_id', processo)
    .eq('state', 'paid')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Em teste ainda não há pagamento: emite-se o mínimo para provar a API.
  const total = pago?.amount_cents ?? 100;

  const r = await emitirFaturaRecibo({
    nif: alvo.perfil.nif,
    nome: alvo.nome,
    descricao: 'IRS 2026',
    totalCents: total,
  });
  if (!r.ok) {
    return {
      ok: false,
      erro: r.nifInvalido
        ? `O Cegid recusou o NIF ${alvo.perfil.nif}.`
        : r.erro,
    };
  }
  return {
    ok: true,
    aviso: pago
      ? 'Fatura-recibo criada no Cegid, em preparação.'
      : `Fatura-recibo de teste criada (${(total / 100).toFixed(2)} €), em preparação.`,
  };
}

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
