'use server';

import { adminClient, adminConfigured } from './admin-client';
import { identity } from './auth';
import { tipoReal } from './carregar';
import { uuid } from './data';
import { tiposDocumentaisDe } from '@/components/espaco/separadores';

/* As ações devolvem um resultado em vez de redirecionarem.
   Quem chama volta a pedir só a vista afetada, o que mantém o ecrã no sítio
   e evita recarregar a aplicação inteira a cada gravação. */

export type Resultado = { ok: boolean; mensagem?: string; erro?: string; url?: string };

const falha = (erro: string): Resultado => ({ ok: false, erro });
const feito = (mensagem = 'Alteração guardada.'): Resultado => ({ ok: true, mensagem });

// -------------------------------------------------------------- documentos

/* Os documentos vão do browser diretamente para o Storage, em dois tempos:
 * o Vercel recusa pedidos com mais de 4,5 MB, e um PDF digitalizado ou uma
 * fotografia de telemóvel já passavam disso. 1) Preparar: valida o separador
 * e o tipo, regista o documento (pendente) e devolve um endereço de
 * carregamento assinado, que a política do Storage só concede a quem o
 * registou. 2) Concluir: confirma pelos primeiros bytes que é mesmo um PDF ou
 * uma imagem, e a base confirma o tipo e o tamanho reais antes de o contar. */

export type Envio = {
  conta: string; processo: string; rendimento?: string; tipo: string; categoria?: string;
  nome: string; mime: string; tamanho: number; hash: string;
};

const MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export async function prepararDocumento(e: Envio): Promise<{ erro: string } | { id: string; url?: string; reaproveitado: boolean }> {
  const { client } = await identity();
  const conta = String(e?.conta || ''), processo = String(e?.processo || '');
  const rendimento = String(e?.rendimento || '');
  const tipo = String(e?.tipo || '').trim().slice(0, 150);
  const categoriaPedida = String(e?.categoria || '').trim().slice(0, 30);
  if (!uuid(conta) || !uuid(processo)) return { erro: 'Processo inválido.' };
  if (!MIMES.includes(e?.mime) || !Number.isInteger(e?.tamanho) || e.tamanho < 1 || e.tamanho > 10485760) {
    return { erro: 'Selecione um PDF, JPEG ou PNG até 10 MB.' };
  }
  if (!/^[0-9a-f]{64}$/.test(String(e?.hash || ''))) return { erro: 'Não foi possível ler o ficheiro. Tente outra vez.' };

  let categoria = '';
  if (rendimento) {
    if (!uuid(rendimento)) return { erro: 'Rendimento inválido.' };
    const { data } = await client.from('income_records').select('category')
      .eq('id', rendimento).eq('case_id', processo).eq('account_id', conta).single();
    if (!data) return { erro: 'Rendimento não autorizado.' };
    categoria = data.category;
  }
  // Os tipos aceites vêm do separador onde o documento é enviado. Os antigos
  // continuam a valer para o que o gabinete já tinha.
  const aceites = tiposDocumentaisDe(categoriaPedida || categoria);
  if (!tipo || (aceites.length > 0 && !aceites.includes(tipo))) return { erro: 'Escolha um campo documental válido.' };

  const { data: preparado, error: metadados } = await client.rpc('prepare_irs_document', {
    account: conta, process: processo, record: rendimento || null, doc_kind: tipo,
    original_name: String(e.nome || 'documento').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 200) || 'documento',
    mime: e.mime, size_bytes: e.tamanho, hash: e.hash,
  });
  if (metadados || !preparado) {
    const m = metadados?.message || '';
    if (m.includes('pending or rejected')) return { erro: 'Este ficheiro já foi enviado e recusado. Envie outro ou fale comigo nas mensagens.' };
    if (m.includes('Collection locked') || metadados?.code === '42501') return { erro: 'O processo não pode ser alterado neste momento.' };
    return { erro: 'Não foi possível preparar o documento. Tente outra vez.' };
  }
  const { id, path, reused } = preparado as { id: string; path: string; reused: boolean };
  if (reused) return { id, reaproveitado: true };
  const { data: lugar } = await client.storage.from('irs-documents').createSignedUploadUrl(path);
  if (!lugar?.signedUrl) return { erro: 'Não foi possível preparar o envio. Tente outra vez.' };
  return { id, url: lugar.signedUrl, reaproveitado: false };
}

/** Os primeiros bytes do que chegou ao Storage. O ficheiro pendente só é
    legível com a chave de serviço; sem ela, fica a verificação da base. */
async function confirmarTipo(documento: string, utilizador: string) {
  if (!adminConfigured()) return true;
  const admin = adminClient();
  const { data: doc } = await admin.from('documents').select('storage_path,mime_type,state,uploaded_by').eq('id', documento).maybeSingle();
  if (!doc || doc.uploaded_by !== utilizador) return false;
  if (doc.state !== 'pending') return true;
  const { data } = await admin.storage.from('irs-documents').createSignedUrl(doc.storage_path, 60);
  if (!data?.signedUrl) return true; // ainda não chegou: a base responde
  const r = await fetch(data.signedUrl, { headers: { Range: 'bytes=0-15' }, cache: 'no-store' }).catch(() => null);
  if (!r?.ok || !r.body) return true;
  const leitor = r.body.getReader();
  const { value } = await leitor.read();
  void leitor.cancel().catch(() => {});
  if (value && tipoReal(value) === doc.mime_type) return true;
  await admin.storage.from('irs-documents').remove([doc.storage_path]);
  return false;
}

export async function concluirEnvio(e: {
  id: string; categoria?: string; imovel?: string; descricao?: string; original?: number; tamanho?: number; reaproveitado?: boolean;
}): Promise<Resultado> {
  const { client, user } = await identity();
  if (!uuid(String(e?.id || ''))) return falha('Envio inválido.');
  if (!(await confirmarTipo(e.id, user.id))) return falha('O conteúdo do ficheiro não corresponde a PDF, JPEG, PNG ou WebP.');
  // A conclusão é da base: confirma que o ficheiro chegou e grava o
  // separador, o imóvel e a descrição. Só então o documento conta.
  const imovel = String(e.imovel || '');
  const { error: terminado } = await client.rpc('concluir_documento', {
    p_documento: e.id,
    p_categoria: String(e.categoria || '').trim().slice(0, 30) || null,
    p_imovel: imovel && uuid(imovel) ? imovel : null,
    p_descricao: String(e.descricao || '').trim().slice(0, 200) || null,
  });
  if (terminado) {
    console.error(JSON.stringify({ event: 'rr_documento_por_concluir', documento: e.id, erro: terminado.message }));
    return falha(terminado.message.includes('File not received')
      ? 'O ficheiro não chegou ao servidor. Tente outra vez.'
      : terminado.message.includes('File does not match')
        ? 'O ficheiro recebido não corresponde ao escolhido. Tente outra vez.'
        : 'Não foi possível concluir o envio. Tente outra vez.');
  }
  if (e.reaproveitado) return feito('Documento já existia e foi reaproveitado.');
  if (e.original && e.tamanho && e.tamanho < e.original) {
    return feito(`Documento recebido. Otimizado: menos ${Math.round((1 - e.tamanho / e.original) * 100)}% de espaço.`);
  }
  return feito('Documento recebido.');
}
