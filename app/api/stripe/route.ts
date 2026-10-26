import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { adminClient } from '@/lib/admin-client';
import { stripe, type Sessao } from '@/lib/stripe-core';

export const dynamic = 'force-dynamic';

/* O webhook do Stripe.
 *
 * É ele que fecha os pagamentos que não terminam no browser — o MB WAY e o
 * Klarna confirmam minutos depois, muitas vezes com o cliente já fora do
 * site. Sem isto, esses pagamentos ficavam por confirmar para sempre.
 *
 * A assinatura é verificada à mão, pela mesma razão que não há SDK: o
 * algoritmo é um HMAC e a tolerância de tempo é uma subtração. */
function assinaturaValida(corpo: string, cabecalho: string, segredo: string) {
  const partes = Object.fromEntries(
    cabecalho.split(',').map((p) => p.split('=') as [string, string]),
  );
  const momento = Number(partes.t);
  if (!Number.isFinite(momento)) return false;

  // Cinco minutos: o que o Stripe recomenda contra repetição de pedidos.
  if (Math.abs(Date.now() / 1000 - momento) > 300) return false;

  const esperada = createHmac('sha256', segredo)
    .update(`${momento}.${corpo}`)
    .digest('hex');
  const recebida = partes.v1 || '';
  if (recebida.length !== esperada.length) return false;
  return timingSafeEqual(Buffer.from(recebida), Buffer.from(esperada));
}

export async function POST(request: NextRequest) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET || '';
  const assinatura = request.headers.get('stripe-signature') || '';
  const corpo = await request.text();

  if (!segredo || !assinatura || !assinaturaValida(corpo, assinatura, segredo)) {
    return NextResponse.json({ erro: 'assinatura inválida' }, { status: 400 });
  }

  let evento: { type?: string; data?: { object?: { id?: string } } };
  try {
    evento = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: 'corpo inválido' }, { status: 400 });
  }

  const interessa = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'checkout.session.expired',
  ];
  if (!evento.type || !interessa.includes(evento.type)) {
    return NextResponse.json({ recebido: true });
  }

  const id = evento.data?.object?.id;
  if (!id) return NextResponse.json({ recebido: true });

  /* Não se confia no corpo do evento: lê-se a sessão à API. Um corpo pode
     chegar fora de ordem ou desatualizado; a API diz o estado de agora. */
  const lida = await stripe<Sessao>(`/checkout/sessions/${id}`);
  if (!lida.ok) return NextResponse.json({ erro: 'sessão ilegível' }, { status: 502 });

  const s = lida.dados;
  if (!s.client_reference_id) return NextResponse.json({ recebido: true });

  const { error } = await adminClient().rpc('finalizar_pagamento_stripe', {
    attempt: s.client_reference_id,
    provider_id: s.id,
    provider_reference: s.client_reference_id,
    pago: s.payment_status === 'paid',
    falhou: s.status === 'expired' || evento.type === 'checkout.session.async_payment_failed',
    provider_amount: s.amount_total,
    provider_currency: s.currency || 'eur',
  });
  // Um 500 faz o Stripe repetir, que é o que se quer se a base falhou.
  if (error) return NextResponse.json({ erro: 'não liquidado' }, { status: 500 });

  return NextResponse.json({ recebido: true });
}
