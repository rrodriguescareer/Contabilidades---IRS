import Link from 'next/link';
import { redirect } from 'next/navigation';
import { session } from '@/lib/auth';
import { PagarEmbebido } from '@/components/pagar-embebido';
import e from './pagar.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pagamento' };

const EUROS = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

type Props = { searchParams: Promise<{ s?: string }> };

/* O ecrã do pagamento: o nosso cabeçalho, o nosso resumo, e o formulário do
   Stripe no meio. O cliente não sai da plataforma. */
export default async function Pagar({ searchParams }: Props) {
  const { client, context } = await session();
  const { s: segredo } = await searchParams;

  const chave = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  if (!segredo || !chave) redirect('/app?separador=pagamento');

  const { data: tentativa } = await client
    .from('irs_checkouts')
    .select('amount_cents,discount_cents,quote,state')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const orcamento = (tentativa?.quote || {}) as {
    items?: { code: string; label: string; amount_cents: number }[];
    subtotal_cents?: number;
    discount_code?: string;
  };

  return (
    <main id="principal" className={e.ecra}>
      <div className={e.topo}>
        <Link href="/app?separador=pagamento" className={e.voltar}>← Voltar ao processo</Link>
        <img src="/rr.svg" alt="RR." width={259} height={142} className={e.logo} />
      </div>

      <div className={e.colunas}>
        <section className={e.resumo}>
          <h1>Preparação de IRS 2026</h1>
          <p className={e.cliente}>{context.profile.full_name || context.email}</p>

          <table className={e.tabela}>
            <tbody>
              {(orcamento.items || []).map((i) => (
                <tr key={i.code}>
                  <td>{i.label}</td>
                  <td>{EUROS.format(i.amount_cents / 100)}</td>
                </tr>
              ))}
              {tentativa?.discount_cents ? (
                <tr className={e.desconto}>
                  <td>Desconto{orcamento.discount_code ? ` · ${orcamento.discount_code}` : ''}</td>
                  <td>−{EUROS.format(tentativa.discount_cents / 100)}</td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{EUROS.format((tentativa?.amount_cents || 0) / 100)}</td>
              </tr>
            </tfoot>
          </table>

          <p className={e.iva}>IVA incluído à taxa em vigor.</p>

          <ul className={e.garantias}>
            <li>Revisão por contabilista certificado, cédula n.º 145854.</li>
            <li>Fatura-recibo enviada por email após o pagamento.</li>
            <li>A declaração só é submetida à AT depois de aprovada por si.</li>
          </ul>
        </section>

        <section className={e.formulario}>
          <PagarEmbebido chave={chave} segredo={segredo} />
        </section>
      </div>
    </main>
  );
}
