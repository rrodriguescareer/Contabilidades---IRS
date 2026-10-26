'use client';
import { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

/* O formulário é do Stripe — tem de ser, é quem pode tocar nos dados do
   cartão — mas vive dentro do nosso ecrã. A chave publicável é pública por
   definição: identifica a conta, não autoriza nada. */
export function PagarEmbebido({ chave, segredo }: { chave: string; segredo: string }) {
  const stripe = loadStripe(chave);
  const fetchClientSecret = useCallback(() => Promise.resolve(segredo), [segredo]);

  return (
    <EmbeddedCheckoutProvider stripe={stripe} options={{ fetchClientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
