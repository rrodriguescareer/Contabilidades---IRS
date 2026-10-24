import Link from 'next/link';
import { session } from '@/lib/auth';
import { uuid } from '@/lib/data';
import { checkoutUrl } from '@/lib/revolut-core';
import ConfirmarPagamento from '@/components/payment-refresh';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pagamento' };

const EUROS = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

/** Mensagem conforme o estado em que a tentativa ficou. */
function explicacao(estado: string) {
  if (estado === 'paid') {
    return 'Recebi o seu processo para revisão. A declaração ainda não foi submetida à Autoridade Tributária.';
  }
  if (estado === 'unknown') {
    return 'Esta tentativa precisa de ser verificada por mim. Não inicie outro pagamento.';
  }
  if (estado === 'failed' || estado === 'cancelled') {
    return 'O pagamento não foi concluído. Pode voltar ao processo e tentar de novo.';
  }
  return 'A confirmação ainda está pendente. Só a confirmação da Revolut faz o processo avançar.';
}

export default async function Pagamento({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { client } = await session();
  const { checkout } = await searchParams;

  let pagamento = null;
  if (checkout && uuid(checkout)) {
    const resultado = await client
      .from('irs_checkouts')
      .select('id,account_id,case_id,state,amount_cents,checkout_url,provider_order_id')
      .eq('id', checkout)
      .single();
    pagamento = resultado.data;
  }

  const pago = pagamento?.state === 'paid';
  const url = checkoutUrl(pagamento?.checkout_url);

  return (
    <main
      id="principal"
      className="envolve"
      style={{ paddingBlock: 'var(--e-5) var(--e-8)', display: 'grid', gap: 'var(--e-5)', maxWidth: '40rem' }}
    >
      <Link href="/app" className="btn btn-discreto btn-sm" style={{ justifySelf: 'start' }}>
        ← Voltar ao IRS
      </Link>
      <h1>{pago ? 'Pagamento confirmado.' : 'Estado do pagamento'}</h1>

      <section className="cartao pilha pilha-4">
        {!pagamento ? (
          <p className="suave">Este pagamento não está disponível para a sua conta.</p>
        ) : (
          <>
            <p className={pago ? 'aviso aviso-positivo' : 'aviso'}>{explicacao(pagamento.state)}</p>
            <div className="linha-entre">
              <span className="suave">Total</span>
              <strong className="numero" style={{ fontSize: 'var(--t-xl)' }}>
                {EUROS.format(pagamento.amount_cents / 100)}
              </strong>
            </div>
            {!pago && pagamento.provider_order_id && (
              <ConfirmarPagamento id={pagamento.id} automatico={pagamento.state === 'pending'} />
            )}
            <div className="linha">
              {!pago && pagamento.state === 'pending' && url && (
                <a className="btn" href={url}>
                  Continuar pagamento
                </a>
              )}
              <Link className="btn btn-secundario" href="/app?separador=progresso">
                Consultar processo
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
