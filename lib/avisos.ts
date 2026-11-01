import 'server-only';
import { adminClient } from './admin-client';
import { EMAIL_GABINETE, GESTAO, PORTAL, enviarEmail, eurosTexto, primeiroNome } from './email';

/* Os avisos por email que nascem no portal: pagamento recebido (ao cliente e
   ao gabinete), processo submetido e mensagem do cliente (ao gabinete). */

async function quem(utilizador: string | null) {
  if (!utilizador) return null;
  const { data } = await adminClient().from('profiles').select('email, full_name').eq('id', utilizador).maybeSingle();
  return data;
}

/** Depois de confirmar um pagamento com a Stripe. Só avisa se ficou pago; a
    chave do email impede o aviso repetido (webhook e página de regresso). */
export async function avisarPagamento(tentativa: string) {
  const { data: k } = await adminClient().from('irs_checkouts')
    .select('id, state, tipo, descricao, amount_cents, case_id, account_id, user_id').eq('id', tentativa).maybeSingle();
  if (!k || k.state !== 'paid') return;
  const pessoa = await quem(k.user_id);
  const oque = k.tipo === 'extra' ? (k.descricao || 'Pagamento adicional') : 'Preparação do IRS 2026';
  if (pessoa?.email) {
    await enviarEmail({
      chave: `pago:${k.id}`, para: pessoa.email,
      assunto: `Pagamento recebido — ${eurosTexto(k.amount_cents)}`,
      titulo: 'Pagamento recebido',
      paragrafos: [`Olá${primeiroNome(pessoa.full_name) ? `, ${primeiroNome(pessoa.full_name)}` : ''}.`,
        k.tipo === 'extra'
          ? 'O pagamento adicional ficou registado no seu processo.'
          : 'O pagamento da preparação do seu IRS ficou registado. A declaração só é entregue na Autoridade Tributária depois de revista pelo contabilista.',
        'A fatura-recibo é emitida em seu nome e enviada para este email.'],
      destaque: { rotulo: oque, valor: eurosTexto(k.amount_cents) },
      botao: { texto: 'Ver o processo', url: `${PORTAL}/app?separador=pagamento` },
      conta: k.account_id, processo: k.case_id, utilizador: k.user_id,
    });
  }
  await enviarEmail({
    chave: `pago-gabinete:${k.id}`, para: EMAIL_GABINETE, interno: true,
    assunto: `Pagamento recebido: ${pessoa?.full_name || 'cliente'} — ${eurosTexto(k.amount_cents)}`,
    titulo: 'Pagamento recebido',
    paragrafos: [`${pessoa?.full_name || 'Um cliente'} pagou ${eurosTexto(k.amount_cents)} (${oque}).`],
    botao: { texto: 'Abrir o processo', url: `${GESTAO}/irs?processo=${k.case_id}&aba=pagamento` },
    conta: k.account_id, processo: k.case_id,
  });
}

export async function avisarSubmissao(processo: string, utilizador: string) {
  const pessoa = await quem(utilizador);
  await enviarEmail({
    chave: `submetido:${processo}:${new Date().toISOString().slice(0, 16)}`, para: EMAIL_GABINETE, interno: true,
    assunto: `Processo submetido: ${pessoa?.full_name || 'cliente'}`,
    titulo: 'Novo processo para revisão',
    paragrafos: [`${pessoa?.full_name || 'Um cliente'} submeteu o processo de IRS. Está na fila para revisão.`],
    botao: { texto: 'Abrir o processo', url: `${GESTAO}/irs?processo=${processo}` },
    processo,
  });
}

export async function avisarMensagem(mensagem: string, processo: string, utilizador: string, corpo: string) {
  const pessoa = await quem(utilizador);
  await enviarEmail({
    chave: `mensagem:${mensagem}`, para: EMAIL_GABINETE, interno: true,
    assunto: `Nova mensagem de ${pessoa?.full_name || 'cliente'}`,
    titulo: 'Nova mensagem no portal',
    paragrafos: [`${pessoa?.full_name || 'Um cliente'} escreveu:`, corpo.length > 600 ? `${corpo.slice(0, 600)}…` : corpo],
    botao: { texto: 'Responder', url: `${GESTAO}/irs?processo=${processo}&aba=mensagens` },
    processo,
  });
}

/** O pedido de desistência: ao gabinete, para decidir, e ao cliente, como
    confirmação de receção num suporte duradouro (o email). */
export async function avisarDesistencia(processo: string, utilizador: string, pedido: string, dentroDoPrazo: boolean, motivo: string) {
  const pessoa = await quem(utilizador);
  await enviarEmail({
    chave: `desistencia:${pedido}`, para: EMAIL_GABINETE, interno: true,
    assunto: `Pedido de desistência: ${pessoa?.full_name || 'cliente'}`,
    titulo: 'Pedido de desistência do serviço',
    paragrafos: [
      `${pessoa?.full_name || 'Um cliente'} pediu para desistir da preparação do IRS.`,
      dentroDoPrazo ? 'O pedido foi feito dentro dos 14 dias de livre resolução.' : 'O pedido foi feito depois dos 14 dias de livre resolução.',
      motivo ? `Motivo indicado: ${motivo.slice(0, 600)}` : 'Não indicou motivo.',
    ],
    botao: { texto: 'Decidir na gestão', url: `${GESTAO}/irs?processo=${processo}` },
    processo,
  });
  if (pessoa?.email) {
    await enviarEmail({
      chave: `desistencia-recebida:${pedido}`, para: pessoa.email,
      assunto: 'Recebemos o seu pedido de desistência',
      titulo: 'Pedido de desistência recebido',
      paragrafos: [
        `Olá${primeiroNome(pessoa.full_name) ? `, ${primeiroNome(pessoa.full_name)}` : ''}.`,
        `Confirmamos a receção do seu pedido de desistência do serviço de preparação do IRS, a ${new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', dateStyle: 'long', timeStyle: 'short' })}.`,
        'O contabilista vai analisá-lo e responder-lhe pelo portal. Se houver lugar a reembolso, é feito pelo mesmo meio de pagamento.',
        'Pode anular o pedido em «A minha conta» enquanto ele não for decidido.',
      ],
      botao: { texto: 'Abrir a minha conta', url: `${PORTAL}/perfil` },
      processo,
    });
  }
}
