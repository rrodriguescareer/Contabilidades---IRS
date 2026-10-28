'use server';
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
export type Abertura =
  | { ok: false; erro: string }
  | { ok: true; modo: 'pago' }
  | { ok: true; modo: 'embebido'; chave: string; segredo: string; tentativa: string }
  | { ok: true; modo: 'alojado'; url: string };

/** A chave publicável lê-se em tempo de execução, no servidor: uma variável
    NEXT_PUBLIC_ ficava presa no código no momento do build, e acrescentá-la
    depois obrigava a reconstruir. */
function chavePublicavel() {
  const chave = process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  return /^pk_(test|live)_[A-Za-z0-9]+$/.test(chave) ? chave : null;
}

/* Abrir o pagamento. Devolve o que o ecrã precisa — nunca redireciona para
   trás com o erro escondido no endereço, que era o "volta ao menu inicial".
   Com a chave publicável, o formulário do Stripe monta-se dentro do separador;
   sem ela, abre-se a página do Stripe, para o pagamento nunca ficar parado. */
export async function abrirPagamento(
  conta: string, processo: string, cupao: string, esperado: number,
): Promise<Abertura> {
  const { client } = await session();
  if (!uuid(conta) || !uuid(processo)) return { ok: false, erro: 'Selecione o processo.' };
  const codigo = cupao.trim().slice(0, 40);

  const origem = siteUrl();
  if (!origem) return { ok: false, erro: 'O pagamento está temporariamente indisponível.' };

  const { data: orcamento, error: semOrcamento } = await client.rpc('quote_irs_checkout', {
    account: conta, process: processo, coupon: codigo,
  });
  if (semOrcamento || !orcamento) {
    return { ok: false, erro: 'Não foi possível calcular o preço. Confirme os rendimentos.' };
  }
  if (!Number.isSafeInteger(esperado) || esperado !== orcamento.total_cents) {
    return { ok: false, erro: 'O preço mudou entretanto. Reveja-o antes de confirmar.' };
  }

  const { data: tentativa, error: semTentativa } = await client.rpc('begin_irs_checkout', {
    account: conta, process: processo, coupon: codigo, expected_total: esperado,
  });
  if (semTentativa || !tentativa) {
    console.error(JSON.stringify({ event: 'rr_pagamento_inicio', erro: semTentativa?.message }));
    return { ok: false, erro: traduzir(semTentativa?.message) };
  }
  if (tentativa.state === 'paid') return { ok: true, modo: 'pago' };

  const chave = chavePublicavel();

  /* Já há uma sessão aberta para esta tentativa (o cliente fechou o ecrã a
     meio, ou carregou duas vezes): reaproveita-se em vez de criar outra. */
  if (!tentativa.created && tentativa.sessao) {
    const lida = await stripe<Sessao>(`/checkout/sessions/${tentativa.sessao}`);
    if (lida.ok && lida.dados.status === 'open') {
      if (chave && lida.dados.client_secret) {
        return { ok: true, modo: 'embebido', chave, segredo: lida.dados.client_secret, tentativa: tentativa.id };
      }
      if (lida.dados.url) return { ok: true, modo: 'alojado', url: lida.dados.url };
    }
    if (lida.ok && lida.dados.status === 'complete') {
      await confirmarSessao(lida.dados.id);
      return { ok: false, erro: 'Este pagamento já foi concluído. A confirmação pode levar uns minutos (Multibanco).' };
    }
    // Expirada ou de outro modo (embebida vs. página): fecha-se e abre-se outra.
    await adminClient().rpc('cancelar_tentativa_de_pagamento', { attempt: tentativa.id }).then(() => null, () => null);
    return abrirPagamento(conta, processo, codigo, esperado);
  }

  const modoEmbebido = Boolean(chave);
  const criada = await stripe<Sessao>('/checkout/sessions', {
    mode: 'payment',
    // "embedded" passou a chamar-se "embedded_page" na versão da API da conta.
    // Era isto que fazia o Stripe recusar a sessão e o pagamento nunca abrir.
    ...(modoEmbebido
      ? { ui_mode: 'embedded_page', return_url: `${origem}/pagamento?sessao={CHECKOUT_SESSION_ID}` }
      : {
          success_url: `${origem}/pagamento?sessao={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origem}/app?separador=pagamento`,
        }),
    currency: 'eur',
    locale: 'pt',
    client_reference_id: tentativa.id,
    // 31 minutos: o mínimo do Stripe é 30. Um checkout abandonado não pode
    // ficar a trancar o processo durante 24 horas.
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
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
  }, { idempotencia: `irs-${tentativa.id}-${modoEmbebido ? 'emb' : 'pag'}` });

  if (!criada.ok) {
    console.error(JSON.stringify({ event: 'rr_stripe_sessao', erro: criada.erro }));
    await adminClient().rpc('cancelar_tentativa_de_pagamento', { attempt: tentativa.id }).then(() => null, () => null);
    return { ok: false, erro: 'Não foi possível abrir o pagamento. Nada foi cobrado. Tente outra vez.' };
  }

  const { error: semLigar } = await adminClient().rpc('anexar_sessao_de_pagamento', {
    attempt: tentativa.id, provider_id: criada.dados.id, provider_url: criada.dados.url || '',
  });
  if (!semLigar) {
    const { registar } = await import('./atividade');
    await registar(client, 'pagamento_iniciado',
      `${(tentativa.amount_cents / 100).toFixed(2).replace('.', ',')} € · sessão Stripe ${criada.dados.id}`, processo);
  }
  if (semLigar) {
    console.error(JSON.stringify({ event: 'rr_pagamento_anexar', erro: semLigar.message }));
    return { ok: false, erro: 'Não foi possível abrir o pagamento. Nada foi cobrado.' };
  }

  if (modoEmbebido && chave && criada.dados.client_secret) {
    return { ok: true, modo: 'embebido', chave, segredo: criada.dados.client_secret, tentativa: tentativa.id };
  }
  if (criada.dados.url) return { ok: true, modo: 'alojado', url: criada.dados.url };
  return { ok: false, erro: 'Não foi possível abrir o pagamento. Nada foi cobrado.' };
}

/** O cliente desiste do pagamento aberto — para corrigir dados, por exemplo.
    A sessão no Stripe é expirada para não poder ser paga depois. */
export async function desistirDoPagamento(tentativa: string) {
  const { client } = await session();
  if (!uuid(tentativa)) return { ok: false, erro: 'Pagamento inválido.' };
  const { data: sessao, error } = await client.rpc('cancelar_pagamento_aberto', { attempt: tentativa });
  if (error) return { ok: false, erro: 'Não foi possível cancelar.' };
  if (typeof sessao === 'string' && sessao.startsWith('cs_')) {
    await stripe(`/checkout/sessions/${sessao}/expire`, {});
  }
  return { ok: true };
}

function traduzir(mensagem?: string) {
  if (!mensagem) return 'Não foi possível iniciar o pagamento.';
  if (mensagem.includes('Incomplete case')) return 'Falta completar o processo antes de pagar.';
  if (mensagem.includes('Price changed')) return 'O preço mudou entretanto. Reveja-o antes de confirmar.';
  if (mensagem.includes('not collecting')) return 'Este processo já foi submetido.';
  if (mensagem.includes('Holder missing')) return 'Falta o titular no agregado.';
  if (mensagem.includes('pending uploads')) return 'Há documentos ainda a carregar. Espere que terminem.';
  return 'Não foi possível iniciar o pagamento.';
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
