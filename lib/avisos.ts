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
