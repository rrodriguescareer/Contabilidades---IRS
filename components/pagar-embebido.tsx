'use client';
import { useCallback, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

/* O formulário é do Stripe — tem de ser, é quem pode tocar nos dados do
   cartão — mas vive dentro do nosso ecrã. A chave publicável é pública por
   definição: identifica a conta, não autoriza nada.
   O loadStripe fica memorizado: criado a cada render, o formulário voltava a
   montar-se do zero sempre que o ecrã mudava. */
export function PagarEmbebido({ chave, segredo }: { chave: string; segredo: string }) {
  const stripe = useMemo(() => loadStripe(chave, { locale: 'pt' }), [chave]);
  const fetchClientSecret = useCallback(() => Promise.resolve(segredo), [segredo]);

  return (
    <EmbeddedCheckoutProvider key={segredo} stripe={stripe} options={{ fetchClientSecret }}>
      <EmbeddedCheckout className="checkout-embebido" />
    </EmbeddedCheckoutProvider>
  );
}
