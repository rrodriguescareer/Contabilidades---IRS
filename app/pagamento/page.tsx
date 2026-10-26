import Link from 'next/link';
import { session } from '@/lib/auth';
import { uuid } from '@/lib/data';
import { confirmarSessao } from '@/lib/stripe-checkout';
import e from './pagamento.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pagamento' };

const EUROS = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

type Props = { searchParams: Promise<{ sessao?: string; checkout?: string }> };

/* O regresso do Stripe. O estado não vem do endereço: é perguntado à API e
   escrito pela base, que valida identificador, referência, montante e moeda
   antes de dar o processo por pago. */
export default async function Pagamento({ searchParams }: Props) {
  const { client } = await session();
  const { sessao, checkout } = await searchParams;

  let estado: 'pago' | 'aguardar' | 'falhou' | 'desconhecido' = 'desconhecido';
  let erro: string | null = null;

  if (sessao) {
    const r = await confirmarSessao(sessao);
    if (!r.ok) erro = r.erro ?? null;
    else estado = r.pago ? 'pago' : r.aAguardar ? 'aguardar' : 'falhou';
  }

  // O último pagamento deste cliente, para mostrar o valor e o estado final.
  const { data: pagamento } = await client
    .from('irs_checkouts')
    .select('id,state,amount_cents,paid_at,case_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pagamento?.state === 'paid') estado = 'pago';
  else if (estado === 'desconhecido' && checkout && uuid(checkout)) estado = 'aguardar';

  return (
    <main id="principal" className={e.ecra}>
      <div className={e.cartao} data-estado={estado}>
        <span className={e.marca} aria-hidden="true" />

        {estado === 'pago' && (
          <>
            <h1>Pagamento recebido</h1>
            <p className={e.valor}>{EUROS.format((pagamento?.amount_cents || 0) / 100)}</p>
            <p className={e.nota}>
              Recebi o seu processo para revisão. A fatura-recibo segue por email nos
              próximos minutos.
            </p>
            <p className={e.aviso}>
              A declaração ainda <strong>não</strong> foi submetida à Autoridade Tributária.
              Acompanhe cada passo no seu processo.
            </p>
          </>
        )}

        {estado === 'aguardar' && (
          <>
            <h1>A aguardar confirmação</h1>
            <p className={e.nota}>
              Alguns métodos — como o MB WAY — demoram alguns minutos a confirmar.
              Não precisa de pagar outra vez: assim que o banco confirmar, o processo avança
              sozinho e eu fico a saber.
            </p>
          </>
        )}

        {estado === 'falhou' && (
          <>
            <h1>O pagamento não foi concluído</h1>
            <p className={e.nota}>
              Não foi cobrado nada. Pode voltar ao processo e tentar outra vez.
            </p>
          </>
        )}

        {estado === 'desconhecido' && (
          <>
            <h1>Pagamento</h1>
            <p className={e.nota}>Não encontrei nenhum pagamento recente para mostrar.</p>
          </>
        )}

        {erro && <p className="aviso-critico">{erro}</p>}

        <div className={e.accoes}>
          <Link href="/app?separador=progresso" className="btn">Ver o meu processo</Link>
          {estado !== 'pago' && (
            <Link href="/app?separador=pagamento" className="btn btn-secundario">
              Voltar ao pagamento
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
