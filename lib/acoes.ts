'use server';

import { createHash } from 'node:crypto';
import { identity } from './auth';
import { uuid } from './data';
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
