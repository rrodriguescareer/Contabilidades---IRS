'use server';
import { redirect } from 'next/navigation';
import { session } from './auth';
import { siteUrl } from './supabase';
import { adminClient } from './admin-client';
import { uuid } from './data';
import { stripe, type Sessao } from './stripe-core';

/* O pagamento acontece dentro da plataforma, não numa página do Stripe.
 *
 * É Checkout em modo embebido: o formulário é desenhado pelo Stripe — que é
 * quem tem de tocar nos dados do cartão — mas dentro do nosso ecrã, com o
 * nosso cabeçalho e o nosso resumo ao lado. Assim o cliente não sai da casa,
 * e os métodos continuam a ser os que estiverem ligados no painel: escritos
 * em código, ligar o Multibanco amanhã obrigava a mexer aqui.
 */
export async function abrirPagamento(form: FormData) {
  const { client } = await session();
  const conta = String(form.get('account') || '');
  const processo = String(form.get('process') || '');
  const cupao = String(form.get('coupon') || '').trim().slice(0, 40);
  const caminho = `/app?separador=pagamento`;

  function falhar(mensagem: string): never {
    redirect(`${caminho}&erro=${encodeURIComponent(mensagem)}`);
  }

  if (form.get('confirmed') !== 'on') falhar('Confirme os dados e o preço antes de pagar.');
  if (!uuid(conta) || !uuid(processo)) falhar('Selecione o processo.');

  const { data: orcamento, error: semOrcamento } = await client.rpc('quote_irs_checkout', {
    account: conta, process: processo, coupon: cupao,
  });
  if (semOrcamento || !orcamento) falhar('Não foi possível calcular o preço. Confirme os rendimentos.');

  /* O total que o cliente viu tem de ser o total que se cobra: se mudou
     entretanto, volta ao ecrã em vez de cobrar outro valor. */
  const esperado = Number(form.get('expected_total'));
  if (!Number.isSafeInteger(esperado) || esperado !== orcamento.total_cents) {
    falhar('O preço mudou entretanto. Reveja antes de confirmar.');
  }

  const origem = siteUrl();
  if (!origem) falhar('O pagamento está temporariamente indisponível.');

  const { data: tentativa, error: semTentativa } = await client.rpc('begin_irs_checkout', {
    account: conta, process: processo, coupon: cupao, expected_total: esperado,
  });
  if (semTentativa || !tentativa) falhar('Não foi possível iniciar o pagamento.');

  if (tentativa.state === 'paid') redirect(`${caminho}&mensagem=${encodeURIComponent('Este processo já está pago.')}`);
  if (!tentativa.created && tentativa.checkout_url) redirect(tentativa.checkout_url);

  const criada = await stripe<Sessao>('/checkout/sessions', {
    mode: 'payment',
    ui_mode: 'embedded',
    currency: 'eur',
    locale: 'pt',
    client_reference_id: tentativa.id,
    // Em modo embebido não há success_url: o Stripe devolve a esta página.
    return_url: `${origem}/pagamento?sessao={CHECKOUT_SESSION_ID}`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: tentativa.amount_cents,
        product_data: {
          name: 'Preparação de IRS 2026',
          description: 'Recolha, revisão e submissão acompanhada por contabilista certificado.',
        },
      },
    }],
    metadata: { tentativa: tentativa.id, processo },
    payment_intent_data: { metadata: { tentativa: tentativa.id } },
  }, { idempotencia: `irs-${tentativa.id}` });

  if (!criada.ok || !criada.dados.client_secret) {
    falhar('Não foi possível abrir o pagamento. Nada foi cobrado.');
  }

  const admin = adminClient();
  const { error: semLigar } = await admin.rpc('anexar_sessao_de_pagamento', {
    attempt: tentativa.id, provider_id: criada.dados.id, provider_url: '',
  });
  if (semLigar) falhar('Não foi possível abrir o pagamento. Nada foi cobrado.');

  redirect(`/pagamento/pagar?s=${encodeURIComponent(criada.dados.client_secret)}`);
}

/* O regresso do Stripe. Não se confia no que vem no endereço: pergunta-se à
   API qual é o estado daquela sessão. */
export async function confirmarSessao(sessao: string) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessao)) return { ok: false, erro: 'Sessão inválida.' };

  const lida = await stripe<Sessao>(`/checkout/sessions/${sessao}`);
  if (!lida.ok) return { ok: false, erro: lida.erro };

  const s = lida.dados;
  const tentativa = s.client_reference_id;
  if (!tentativa || !uuid(tentativa)) return { ok: false, erro: 'Sessão sem referência.' };

  const pago = s.payment_status === 'paid';
  const falhou = s.status === 'expired';

  const { error } = await adminClient().rpc('finalizar_pagamento_stripe', {
    attempt: tentativa,
    provider_id: s.id,
    provider_reference: tentativa,
    pago,
    falhou,
    provider_amount: s.amount_total,
    provider_currency: s.currency || 'eur',
  });
  if (error) return { ok: false, erro: 'Não foi possível confirmar o pagamento.' };

  return {
    ok: true,
    pago,
    // Métodos como o MB WAY podem demorar: não é falha, é espera.
    aAguardar: !pago && !falhou,
  };
}
