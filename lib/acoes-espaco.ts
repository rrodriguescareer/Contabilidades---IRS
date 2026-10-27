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
import { randomUUID } from 'node:crypto';
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

/** Membro do agregado. Cria ou atualiza, e liga-o ao processo — com a senha
    das Finanças na mesma transação. Ao criar, a senha é obrigatória. */
export async function guardarMembro(processo: string, form: FormData): Promise<Resposta> {
  const { erro, conta } = await doProcesso(processo);
  if (erro || !conta) return { ok: false, erro: erro || 'Sem acesso.' };

  const nome = texto(form, 'nome');
  const nif = texto(form, 'nif', 9);
  const nascimento = texto(form, 'nascimento', 10);
  /* O formulário do titular manda "titular" num campo escondido; o dos outros
     manda a escolha da lista. Havia os dois com o mesmo nome, e o browser
     entregava o escondido — vazio — e o servidor respondia "escolha a
     relação" mesmo com ela escolhida. */
  const relacao = texto(form, 'relacao', 20);
  const id = texto(form, 'id', 40);
  const senha = String(form.get('senha') || '').trim();

  if (nome.length < 2) return { ok: false, erro: 'Indique o nome completo.' };
  if (!/^[0-9]{9}$/.test(nif)) return { ok: false, erro: 'O NIF tem nove dígitos.' };
  if (!nascimento) return { ok: false, erro: 'Indique a data de nascimento: é dela que depende o IRS Jovem.' };
  if (!['titular', 'conjuge', 'descendente', 'ascendente', 'outro'].includes(relacao))
    return { ok: false, erro: 'Escolha a relação de parentesco.' };
  if (!id && !senha) return { ok: false, erro: 'Indique a senha do Portal das Finanças desta pessoa.' };
  if (senha.length > 60) return { ok: false, erro: 'A senha das Finanças tem no máximo 60 caracteres.' };

  const pessoa = id || randomUUID();
  let cifrada: string | null = null;
  if (senha) {
    try {
      cifrada = encryptSecret(senha, `financas:${pessoa}`);
    } catch (falha) {
      console.error(JSON.stringify({ event: 'rr_cifra_falhou', erro: String(falha) }));
      return { ok: false, erro: 'Não foi possível proteger a senha. Tente daqui a pouco.' };
    }
  }

  const cliente = await supabase();
  const { error } = await cliente.rpc('guardar_membro_agregado', {
    processo,
    p_pessoa: id || null,
    p_id_novo: id ? null : pessoa,
    p_nome: nome,
    p_nif: nif,
    p_nascimento: nascimento,
    p_relacao: relacao,
    p_dois_fatores: ligado(form, 'dois_fatores'),
    p_cifrada: cifrada,
  });
  if (error) {
    console.error(JSON.stringify({ event: 'rr_membro_falhou', codigo: error.code, erro: error.message }));
    return { ok: false, erro: mensagemDaBase(error) };
  }

  revalidatePath('/app');
  return {
    ok: true,
    aviso: ligado(form, 'dois_fatores')
      ? 'Com autenticação de dois fatores ativa, entro em contacto para validar o acesso antes de submeter a declaração.'
      : undefined,
  };
}

/* As validações da base levantam mensagens já escritas para o cliente, com o
   código 22023 ou 23505; o resto — erros internos, em inglês — não deve
   chegar ao ecrã cru. */
function mensagemDaBase(error: { code?: string; message: string }) {
  if (error.code === '22023' || error.code === '23505') return error.message;
  if (error.code === '42501') return 'O processo não pode ser alterado neste momento.';
  return 'Não foi possível guardar. Tente outra vez.';
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

/* ------------------------------------------------------------ gabinete */
import { gabinete } from './auth';

/** Uma vista da consola. Só para quem é do gabinete. */
export async function pedirVistaGabinete(vista: string, processo: string | null) {
  await gabinete();
  const { dados, erro } = await carregarEspaco(
    ['fila', 'mensagens', 'pagamentos', 'alertas', 'processo'].includes(vista) ? vista : 'fila',
    processo,
    true,
  );
  return { dados, erro };
}

/** Fazer o processo andar. As transições válidas são decididas na base. */
export async function avancarProcesso(
  processo: string,
  destino: string,
  nota = '',
  valor = '',
  sentido = '',
): Promise<Resposta> {
  await gabinete();
  const cliente = await supabase();
  const cents = valor ? Math.round(Number(valor.replace(',', '.')) * 100) : null;
  if (destino === 'filed' && (cents == null || !Number.isFinite(cents) || cents < 0)) {
    return { ok: false, erro: 'Indique o valor apurado.' };
  }
  const { error } = await cliente.rpc('avancar_processo', {
    processo,
    destino,
    nota: nota.slice(0, 5000),
    valor_cents: destino === 'filed' ? cents : null,
    sentido: destino === 'filed' ? sentido : null,
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/gabinete/${processo}`);
  revalidatePath('/gabinete');
  return { ok: true };
}

/* O cliente submete o seu processo. Era o primeiro passo do percurso e não
   existia: só o gabinete conseguia marcar um processo como submetido. Os
   pré-requisitos são verificados no servidor; aqui só se traduz a resposta. */
export async function submeterProcesso(
  processo: string,
): Promise<Resposta & { faltas?: string[] }> {
  const { erro } = await doProcesso(processo);
  if (erro) return { ok: false, erro };

  const cliente = await supabase();
  const { data, error } = await cliente.rpc('submeter_processo', { processo });
  if (error) {
    if (error.code === 'P0004') return { ok: false, erro: 'Este processo já foi submetido.' };
    return { ok: false, erro: error.message };
  }

  const r = (data || {}) as { ok?: boolean; faltas?: string[] };
  if (!r.ok) {
    return {
      ok: false,
      erro: 'Falta completar o processo antes de o submeter.',
      faltas: r.faltas || [],
    };
  }
  revalidatePath('/app');
  return { ok: true };
}

/* A mesma lista de prontidão que o cliente vê, para eu a ver antes de aprovar.
   Vem do servidor em vez de ser recontada no browser: uma fonte só. */
export async function prontidaoDoProcesso(processo: string) {
  await gabinete();
  const cliente = await supabase();
  const { data, error } = await cliente.rpc('prontidao_do_processo', { processo });
  if (error) return { dados: null, erro: error.message };
  return { dados: data as unknown[], erro: null };
}

/* ------------------------------------------------------- só o gabinete */

/** A senha das Finanças de uma pessoa, para eu entrar no Portal. A consulta
    fica registada na base antes de a senha sair de lá — é esse registo que o
    cliente vê no Acompanhamento. */
export async function verSenhaFinancas(pessoa: string) {
  await gabinete();
  if (!/^[0-9a-f-]{36}$/i.test(pessoa)) return { ok: false as const, erro: 'Pessoa inválida.' };
  const cliente = await supabase();
  const { data, error } = await cliente.rpc('consultar_senha_financas', { p_pessoa: pessoa });
  if (error || typeof data !== 'string') {
    return { ok: false as const, erro: error?.code === '22023' ? error.message : 'Não foi possível consultar a senha.' };
  }
  try {
    const { decryptSecret } = await import('./secret-crypto');
    return { ok: true as const, senha: decryptSecret(data, `financas:${pessoa}`) };
  } catch {
    return { ok: false as const, erro: 'A senha guardada não pôde ser decifrada. Peça-a outra vez ao cliente.' };
  }
}

/** Descarregar um documento do cliente. A descarga fica registada (o cliente
    vê a data e a hora) e o endereço assinado vale um minuto. */
export async function descarregarDocumento(documento: string) {
  await gabinete();
  if (!/^[0-9a-f-]{36}$/i.test(documento)) return { ok: false as const, erro: 'Documento inválido.' };
  const cliente = await supabase();
  const { data: caminho, error } = await cliente.rpc('registar_descarga', { documento });
  if (error || typeof caminho !== 'string') {
    return { ok: false as const, erro: error?.code === '22023' ? error.message : 'Documento indisponível.' };
  }
  const { data: assinado, error: semUrl } = await cliente.storage
    .from('irs-documents')
    .createSignedUrl(caminho, 60, { download: true });
  if (semUrl || !assinado) return { ok: false as const, erro: 'Não foi possível abrir o documento.' };
  return { ok: true as const, url: assinado.signedUrl };
}

/** Dar um alerta como resolvido, a partir da consola. */
export async function resolverAlertaDoGabinete(alerta: string) {
  await gabinete();
  if (!/^[0-9a-f-]{36}$/i.test(alerta)) return { ok: false, erro: 'Alerta inválido.' };
  const cliente = await supabase();
  const { error } = await cliente
    .from('task_alerts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', alerta);
  if (error) return { ok: false, erro: 'Não foi possível resolver.' };
  return { ok: true };
}
