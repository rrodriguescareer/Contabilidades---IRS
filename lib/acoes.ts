'use server';

import { createHash } from 'node:crypto';
import { identity } from './auth';
import { personError } from './validation';
import { uuid, categories, states, relations, documentKinds } from './data';
import { tiposDocumentaisDe } from '@/components/espaco/separadores';
import { comprimirDocumento, nomeGuardado } from './comprimir';

/* As ações devolvem um resultado em vez de redirecionarem.
   Quem chama volta a pedir só a vista afetada, o que mantém o ecrã no sítio
   e evita recarregar a aplicação inteira a cada gravação. */

export type Resultado = { ok: boolean; mensagem?: string; erro?: string; url?: string };

const falha = (erro: string): Resultado => ({ ok: false, erro });
const feito = (mensagem = 'Alteração guardada.'): Resultado => ({ ok: true, mensagem });

const texto = (form: FormData, chave: string, max = 5000) =>
  String(form.get(chave) || '')
    .trim()
    .slice(0, max);

/** Conta e processo vêm sempre do formulário; a RLS confirma que são desta sessão. */
function alvo(form: FormData) {
  return { conta: texto(form, 'conta'), processo: texto(form, 'processo') };
}

async function staff() {
  const atual = await identity();
  if (!atual.context.is_staff) return null;
  return atual;
}

// ---------------------------------------------------------------- agregado

export async function adicionarPessoa(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const { client } = await identity();
  const { conta, processo } = alvo(form);
  if (!uuid(conta) || !uuid(processo)) return falha('Selecione um processo.');

  const nome = texto(form, 'nome', 201);
  const nascimento = texto(form, 'nascimento');
  const nif = texto(form, 'nif');
  const parentesco = texto(form, 'parentesco');
  const email = texto(form, 'email', 255);

  const invalido = personError(nome, nascimento, nif, email);
  if (invalido) return falha(invalido);
  if (!Object.hasOwn(relations, parentesco) || parentesco === 'titular') {
    return falha('Escolha um parentesco válido.');
  }

  const { error } = await client.rpc('add_case_person', {
    account: conta,
    process: processo,
    person_name: nome,
    birth: nascimento,
    tax_id: nif,
    relation: parentesco,
    person_email: email,
    two_factor: form.has('dois_fatores'),
  });
  if (error) return falha('Não foi possível adicionar. Verifique duplicados e se o processo está aberto para recolha.');
  return feito('Pessoa adicionada ao agregado.');
}

export async function associarPessoa(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const { client } = await identity();
  const { conta, processo } = alvo(form);
  const pessoa = texto(form, 'pessoa');
  const parentesco = texto(form, 'parentesco');
  if (!uuid(conta) || !uuid(processo) || !uuid(pessoa)) return falha('Selecione a pessoa.');
  if (!Object.hasOwn(relations, parentesco) || parentesco === 'titular') return falha('Escolha um parentesco válido.');

  const { error } = await client.rpc('link_case_person', {
    account: conta,
    process: processo,
    person: pessoa,
    relation: parentesco,
  });
  if (error) return falha('Não foi possível associar. Confirme o parentesco e o estado do processo.');
  return feito('Pessoa associada a este ano. Rendimentos e documentos anteriores não são copiados.');
}

export async function alternarDoisFatores(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const { client } = await identity();
  const { conta } = alvo(form);
  const pessoa = texto(form, 'pessoa');
  if (!uuid(pessoa) || !uuid(conta)) return falha('Pessoa inválida.');

  const { error } = await client
    .from('people')
    .update({ tax_two_factor: form.has('dois_fatores') })
    .eq('id', pessoa)
    .eq('account_id', conta);
  if (error) return falha('Não foi possível atualizar.');
  return feito('Estado atualizado. A ativação gera um alerta para o contabilista.');
}

export async function pedirConvite(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const { client } = await identity();
  const { conta } = alvo(form);
  const pessoa = texto(form, 'pessoa');
  const email = texto(form, 'email', 254);
  if (!uuid(pessoa) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return falha('Indique um email válido.');

  const { error } = await client.from('invitation_requests').insert({ account_id: conta, person_id: pessoa, email });
  if (error) return falha('Não foi possível registar. Pode já existir um pedido pendente.');
  return feito('Pedido registado. O convite é enviado pelo contabilista.');
}

// ------------------------------------------------------------- rendimentos

export async function adicionarImovel(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const { client } = await identity();
  const { conta, processo } = alvo(form);
  const etiqueta = texto(form, 'etiqueta', 100);
  if (!etiqueta) return falha('Indique o nome do imóvel.');

  const { error } = await client.from('property_assets').insert({
    account_id: conta,
    case_id: processo,
    label: etiqueta,
    description: texto(form, 'descricao', 1000),
  });
  if (error) return falha('Não foi possível adicionar o imóvel.');
  return feito('Imóvel adicionado.');
}

export async function adicionarRendimento(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const { client } = await identity();
  const { conta, processo } = alvo(form);
  const categoria = texto(form, 'categoria');
  const titulo = texto(form, 'titulo', 200);
  const modo = texto(form, 'modo');
  const pessoa = texto(form, 'pessoa');
  const imovel = texto(form, 'imovel');

  if (!Object.hasOwn(categories, categoria) || !titulo || !['documents', 'manual'].includes(modo)) {
    return falha('Preencha os campos do rendimento.');
  }

  // Nas mais-valias e rendas o rendimento pertence ao imóvel, não a uma pessoa.
  const deImovel = ['property_sale', 'property_rent'].includes(categoria);
  if (deImovel && !uuid(imovel)) return falha('Escolha um imóvel.');
  if (!deImovel && categoria !== 'deduction' && !uuid(pessoa)) return falha('Escolha a pessoa do agregado.');

  const { error } = await client.from('income_records').insert({
    account_id: conta,
    case_id: processo,
    category: categoria,
    title: titulo,
    mode: modo,
    person_id: deImovel ? null : pessoa || null,
    property_id: deImovel ? imovel : null,
    details: texto(form, 'detalhes', 10000),
  });
  if (error) return falha('Não foi possível guardar. Confirme o estado do processo.');
  return feito('Rendimento registado.');
}

// -------------------------------------------------------------- documentos

/** Confirma que o ficheiro é mesmo o que diz ser, pela assinatura dos bytes. */
function tipoReal(bytes: Uint8Array): string {
  if (Buffer.from(bytes.slice(0, 5)).toString() === '%PDF-') return 'application/pdf';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  return '';
}

export async function enviarDocumento(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const { client } = await identity();
  const { conta, processo } = alvo(form);
  const rendimento = texto(form, 'rendimento');
  const tipo = texto(form, 'tipo', 150);
  // Novos no espaço do cliente: a que separador pertence, a que imóvel diz
  // respeito, e a descrição que o cliente escreve.
  const categoriaPedida = texto(form, 'categoria', 30);
  const imovel = texto(form, 'imovel');
  const descricao = texto(form, 'descricao', 200);
  const ficheiro = form.get('ficheiro');

  if (!(ficheiro instanceof File) || ficheiro.size < 1 || ficheiro.size > 10485760) {
    return falha('Selecione um PDF, JPEG ou PNG até 10 MB.');
  }

  let categoria = '';
  if (rendimento) {
    if (!uuid(rendimento)) return falha('Rendimento inválido.');
    const { data } = await client
      .from('income_records')
      .select('category')
      .eq('id', rendimento)
      .eq('case_id', processo)
      .eq('account_id', conta)
      .single();
    if (!data) return falha('Rendimento não autorizado.');
    categoria = data.category;
  }
  // Os tipos aceites vêm do separador onde o documento é enviado. Os antigos
  // continuam a valer para o que o gabinete já tinha.
  const aceites = tiposDocumentaisDe(categoriaPedida || categoria);
  if (!tipo || (aceites.length > 0 && !aceites.includes(tipo))) {
    return falha('Escolha um campo documental válido.');
  }

  const bytes = new Uint8Array(await ficheiro.arrayBuffer());
  const mime = tipoReal(bytes);
  if (!mime) return falha('O conteúdo do ficheiro não corresponde a PDF, JPEG ou PNG.');

  // O resumo é do ficheiro que a pessoa escolheu, não do convertido: assim o
  // mesmo original continua a ser reconhecido como repetido.
  const hash = createHash('sha256').update(bytes).digest('hex');
  const guardar = await comprimirDocumento(bytes, mime);

  const { data: preparado, error: metadados } = await client.rpc('prepare_irs_document', {
    account: conta,
    process: processo,
    record: rendimento || null,
    doc_kind: tipo,
    original_name: nomeGuardado(ficheiro.name, guardar.extensao),
    mime: guardar.mime,
    size_bytes: guardar.bytes.byteLength,
    hash,
  });
  if (metadados || !preparado) {
    const m = metadados?.message || '';
    if (m.includes('pending or rejected')) return falha('Este ficheiro já foi enviado e recusado. Envie outro ou fale comigo nas mensagens.');
    if (m.includes('Collection locked') || metadados?.code === '42501') return falha('O processo não pode ser alterado neste momento.');
    return falha('Não foi possível preparar o documento. Tente outra vez.');
  }

  const { id, path, reused } = preparado as { id: string; path: string; reused: boolean };
  if (!reused) {
    const { error: upload } = await client.storage
      .from('irs-documents')
      .upload(path, guardar.bytes, { contentType: guardar.mime, upsert: false });
    // Um envio retomado pode já ter o ficheiro lá: segue-se para a conclusão,
    // que confirma no Storage se ele chegou mesmo.
    const jaLa = upload && /exist|duplicate/i.test(upload.message);
    if (upload && !jaLa) return falha('O carregamento do ficheiro falhou. Tente outra vez.');
  }

  // A conclusão é da base: confirma que o ficheiro chegou e grava o
  // separador, o imóvel e a descrição. Só então o documento conta.
  const { error: terminado } = await client.rpc('concluir_documento', {
    p_documento: id,
    p_categoria: categoriaPedida || null,
    p_imovel: imovel && uuid(imovel) ? imovel : null,
    p_descricao: descricao || null,
  });
  if (terminado) {
    console.error(JSON.stringify({ event: 'rr_documento_por_concluir', documento: id, erro: terminado.message }));
    return falha(terminado.message.includes('File not received')
      ? 'O ficheiro não chegou ao servidor. Tente outra vez.'
      : 'Não foi possível concluir o envio. Tente outra vez.');
  }
  if (reused) return feito('Documento já existia e foi reaproveitado.');
  if (guardar.convertido) {
    const poupanca = Math.round((1 - guardar.bytes.byteLength / bytes.byteLength) * 100);
    return feito(`Documento recebido. Guardado em WebP, menos ${poupanca}% de espaço.`);
  }
  return feito('Documento recebido.');
}

// ------------------------------------------------- mensagens e andamento

export async function enviarMensagem(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const { client, user } = await identity();
  const { conta, processo } = alvo(form);
  const corpo = texto(form, 'corpo');
  if (!corpo) return falha('Escreva a mensagem.');

  const { error } = await client
    .from('messages')
    .insert({ account_id: conta, case_id: processo, body: corpo, author_id: user.id });
  if (error) return falha('Não foi possível enviar.');
  return feito('Mensagem enviada.');
}

export async function enviarParaRevisao(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const { client } = await identity();
  const { conta, processo } = alvo(form);
  const { error } = await client.rpc('submit_case', { account: conta, process: processo });
  if (error) return falha('Não foi possível enviar. Confirme os dados do titular e o estado do processo.');
  return feito('Processo enviado para revisão. A recolha fica bloqueada até o contabilista pedir correções.');
}

// ---------------------------------------------------------- só contabilista

export async function publicarProgresso(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const atual = await staff();
  if (!atual) return falha('Sem permissão.');

  const { conta, processo } = alvo(form);
  const titulo = texto(form, 'titulo', 200);
  const corpo = texto(form, 'corpo');
  const estado = texto(form, 'estado');
  if (!titulo || !corpo || !Object.hasOwn(states, estado)) return falha('Preencha a atualização.');

  const { error } = await atual.client.rpc('publish_case_progress', {
    account: conta,
    process: processo,
    event_title: titulo,
    event_body: corpo,
    new_status: estado,
  });
  if (error) return falha('Não foi possível publicar.');
  return feito('Atualização publicada para o cliente.');
}

export async function resolverAlerta(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const atual = await staff();
  if (!atual) return falha('Sem permissão.');

  const { error } = await atual.client
    .from('task_alerts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', texto(form, 'alerta'));
  if (error) return falha('Não foi possível resolver.');
  return feito('Alerta resolvido. A autenticação de dois fatores continua ativa.');
}

export async function marcarDocumento(_anterior: Resultado | null, form: FormData): Promise<Resultado> {
  const atual = await staff();
  if (!atual) return falha('Sem permissão.');

  const id = texto(form, 'documento');
  const estado = texto(form, 'estado');
  if (!uuid(id) || !['reviewed', 'rejected'].includes(estado)) return falha('Estado inválido.');

  const { error } = await atual.client.from('documents').update({ state: estado }).eq('id', id);
  if (error) return falha('Não foi possível marcar o documento.');
  return feito(estado === 'reviewed' ? 'Documento validado.' : 'Documento rejeitado.');
}

// ---------------------------------------------------------------- orçamento

export type Orcamento = {
  items: { code: string; label: string; amount_cents: number }[];
  subtotal_cents: number;
  discount_cents: number;
  discount_code?: string | null;
  total_cents: number;
  vat_included: boolean;
};

/** Recalcula o preço do processo, já com o código de desconto aplicado.
 *  Fica fora de `espaco_irs` porque a função de orçamento escreve contadores. */
export async function calcularOrcamento(
  conta: string,
  processo: string,
  codigo = '',
): Promise<{ orcamento: Orcamento | null; erro?: string }> {
  const { client } = await identity();
  if (!uuid(conta) || !uuid(processo)) return { orcamento: null, erro: 'Processo inválido.' };

  const { data, error } = await client.rpc('quote_irs_checkout', {
    account: conta,
    process: processo,
    coupon: codigo.trim().slice(0, 40),
  });
  if (error || !data) {
    return {
      orcamento: null,
      erro: 'Não foi possível calcular. Registe pelo menos um rendimento e confirme o código de desconto.',
    };
  }
  return { orcamento: data as Orcamento };
}
