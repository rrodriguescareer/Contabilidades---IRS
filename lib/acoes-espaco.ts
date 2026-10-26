'use server';
import { session } from './auth';
import { carregarEspaco, vistaValida } from './espaco';

/* O menu lateral não muda de página: troca o conteúdo do contentor ao lado.
   Cada troca é um pedido só, com a sessão verificada do lado do servidor —
   o separador pedido pelo browser nunca é usado sem passar por vistaValida. */
export async function pedirVista(vista: string, processo: string) {
  const { context } = await session();
  const permitido = context.cases?.some((c: { id: string }) => c.id === processo);
  if (!permitido) return { dados: null, erro: 'Sem acesso a este processo.' };
  const { dados, erro } = await carregarEspaco(vistaValida(vista), processo);
  return { dados, erro };
}

/* ------------------------------------------------------------- escrita */
import { supabase } from './supabase';
import { encryptSecret } from './secret-crypto';
import { revalidatePath } from 'next/cache';

type Resposta = { ok: boolean; erro?: string; aviso?: string };

const texto = (f: FormData, c: string, max = 200) => String(f.get(c) || '').trim().slice(0, max);
const ligado = (f: FormData, c: string) => f.get(c) === 'on' || f.get(c) === 'true';
const inteiro = (f: FormData, c: string) => {
  const valor = String(f.get(c) || '').replace(',', '.').trim();
  if (!valor) return null;
  const n = Math.round(Number(valor) * 100);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const nulo = (v: string) => (v ? v : null);

async function doProcesso(processo: string) {
  const { context } = await session();
  const caso = context.cases?.find((c: { id: string }) => c.id === processo);
  if (!caso) return { erro: 'Sem acesso a este processo.' as const, conta: null, cliente: null };
  return { erro: null, conta: (caso as { account_id: string }).account_id, cliente: context.id };
}

/** Membro do agregado. Cria ou atualiza, e liga-o ao processo. */
export async function guardarMembro(processo: string, form: FormData): Promise<Resposta> {
  const { erro, conta } = await doProcesso(processo);
  if (erro || !conta) return { ok: false, erro: erro || 'Sem acesso.' };

  const nome = texto(form, 'nome');
  const nif = texto(form, 'nif', 9);
  const nascimento = texto(form, 'nascimento', 10);
  const relacao = texto(form, 'relacao', 20);
  const id = texto(form, 'id', 40);

  if (nome.length < 2) return { ok: false, erro: 'Indique o nome completo.' };
  if (!/^[0-9]{9}$/.test(nif)) return { ok: false, erro: 'O NIF tem nove dígitos.' };
  if (!['titular', 'conjuge', 'descendente', 'ascendente', 'outro'].includes(relacao))
    return { ok: false, erro: 'Escolha a relação de parentesco.' };

  const cliente = await supabase();
  const { data, error } = await cliente.rpc('guardar_membro_agregado', {
    processo,
    pessoa: id || null,
    nome,
    nif,
    nascimento: nulo(nascimento),
    relacao,
    dois_fatores: ligado(form, 'dois_fatores'),
  });
  if (error) return { ok: false, erro: error.message };

  // A senha é cifrada aqui e só sai daqui cifrada.
  const senha = String(form.get('senha') || '');
  if (senha) {
    const pessoa = String(data);
    const { error: falha } = await cliente.from('tax_credentials').upsert({
      person_id: pessoa,
      account_id: conta,
      encrypted_password: encryptSecret(senha, `financas:${pessoa}`),
      updated_at: new Date().toISOString(),
    });
    if (falha) return { ok: false, erro: falha.message };
  }

  revalidatePath('/app');
  return {
    ok: true,
    aviso: ligado(form, 'dois_fatores')
      ? 'Com autenticação de dois fatores ativa, entro em contacto para validar o acesso antes de submeter a declaração.'
      : undefined,
  };
}

export async function removerMembro(processo: string, pessoa: string): Promise<Resposta> {
  const { erro } = await doProcesso(processo);
  if (erro) return { ok: false, erro };
  const cliente = await supabase();
  const { error } = await cliente.rpc('remover_membro_agregado', { processo, pessoa });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/app');
  return { ok: true };
}

/** Um rendimento de qualquer separador. A categoria decide o que é lido. */
export async function guardarRendimento(processo: string, form: FormData): Promise<Resposta> {
  const { erro, conta } = await doProcesso(processo);
  if (erro || !conta) return { ok: false, erro: erro || 'Sem acesso.' };

  const categoria = texto(form, 'categoria', 30);
  const titular = texto(form, 'titular', 40);
  if (!titular) return { ok: false, erro: 'Todos os rendimentos têm de ter um titular.' };

  const titulo = texto(form, 'titulo') || texto(form, 'tipo') || 'Rendimento';
  const linha = {
    id: texto(form, 'id', 40) || undefined,
    account_id: conta,
    case_id: processo,
    category: categoria,
    person_id: titular,
    property_id: nulo(texto(form, 'imovel', 40)),
    kind: nulo(texto(form, 'tipo', 60)),
    title: titulo,
    mode: 'manual',
    details: texto(form, 'nota', 10000),
    amount_cents: inteiro(form, 'valor'),
    young_irs: ligado(form, 'irs_jovem'),
    studies_and_works: ligado(form, 'estuda_trabalha'),
    foreign_scope: nulo(texto(form, 'ambito', 30)),
    acquired_on: nulo(texto(form, 'compra_em', 10)),
    sold_on: nulo(texto(form, 'venda_em', 10)),
    acquisition_cents: inteiro(form, 'compra'),
    sale_cents: inteiro(form, 'venda'),
    expenses_cents: inteiro(form, 'despesas'),
    hpp_reinvestment: ligado(form, 'hpp'),
    hpp_credit_cents: inteiro(form, 'hpp_credito'),
    hpp_done: ligado(form, 'hpp_feito'),
  };

  const cliente = await supabase();
  const { error } = linha.id
    ? await cliente.from('income_records').update(linha).eq('id', linha.id)
    : await cliente.from('income_records').insert(linha);
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/app');
  return { ok: true };
}

export async function removerRendimento(processo: string, id: string): Promise<Resposta> {
  const { erro } = await doProcesso(processo);
  if (erro) return { ok: false, erro };
  const cliente = await supabase();
  const { error } = await cliente.from('income_records').delete().eq('id', id).eq('case_id', processo);
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/app');
  return { ok: true };
}

/** Imóvel, para os separadores das rendas e das mais-valias. */
export async function guardarImovel(processo: string, form: FormData): Promise<Resposta> {
  const { erro, conta } = await doProcesso(processo);
  if (erro || !conta) return { ok: false, erro: erro || 'Sem acesso.' };
  const nome = texto(form, 'nome', 100);
  if (nome.length < 2) return { ok: false, erro: 'Dê um nome ao imóvel.' };
  const cliente = await supabase();
  const { error } = await cliente.from('property_assets').insert({
    account_id: conta,
    case_id: processo,
    label: nome,
    kind: texto(form, 'tipo', 10) === 'sale' ? 'sale' : 'rent',
    description: texto(form, 'descricao', 500),
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/app');
  return { ok: true };
}

/** A nota de contexto que cada separador tem. */
export async function guardarNota(processo: string, aba: string, corpo: string): Promise<Resposta> {
  const { erro, conta } = await doProcesso(processo);
  if (erro || !conta) return { ok: false, erro: erro || 'Sem acesso.' };
  const cliente = await supabase();
  const { error } = await cliente
    .from('case_notes')
    .upsert(
      { account_id: conta, case_id: processo, tab: aba, body: corpo.slice(0, 5000), updated_at: new Date().toISOString() },
      { onConflict: 'case_id,tab' },
    );
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

/** Os interruptores do separador das deduções. */
export async function guardarDeducoes(processo: string, form: FormData): Promise<Resposta> {
  const { erro, conta } = await doProcesso(processo);
  if (erro || !conta) return { ok: false, erro: erro || 'Sem acesso.' };
  const arrendado = ligado(form, 'rented_home');
  const ppr = ligado(form, 'ppr');
  const cliente = await supabase();
  const { error } = await cliente.from('case_deductions').upsert({
    case_id: processo,
    account_id: conta,
    use_efatura: ligado(form, 'use_efatura'),
    rented_home: arrendado,
    // As perguntas encadeadas só existem com a de cima ligada.
    contract_reported: arrendado ? ligado(form, 'contract_reported') : null,
    rent_receipts: arrendado ? ligado(form, 'rent_receipts') : null,
    landlord_invoices: arrendado ? ligado(form, 'landlord_invoices') : null,
    ppr,
    ppr_person_id: ppr ? nulo(texto(form, 'ppr_person_id', 40)) : null,
    ascendant_expenses: ligado(form, 'ascendant_expenses'),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/app');
  return { ok: true };
}

/** O preço, descriminado, para o separador do pagamento. */
export async function orcamento(processo: string, cupao = '') {
  const { erro, conta } = await doProcesso(processo);
  if (erro || !conta) return { dados: null, erro: erro || 'Sem acesso.' };
  const cliente = await supabase();
  const { data, error } = await cliente.rpc('quote_irs_checkout', {
    account: conta,
    process: processo,
    coupon: cupao.trim().slice(0, 40),
  });
  if (error) return { dados: null, erro: error.message };
  return { dados: data as Record<string, unknown>, erro: null };
}
