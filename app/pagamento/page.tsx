import Link from 'next/link';
import {session} from '@/lib/auth';
import {uuid} from '@/lib/data';
import {checkoutUrl} from '@/lib/revolut-core';
import {reconcilePayment} from '@/lib/revolut';
import PaymentRefresh from '@/components/payment-refresh';
export const dynamic='force-dynamic';
export default async function Payment({searchParams}:{searchParams:Promise<{checkout?:string}>}){
 const {client}=await session();const {checkout}=await searchParams;
 let payment=null;if(checkout&&uuid(checkout)){const result=await client.from('irs_checkouts').select('id,account_id,case_id,state,amount_cents,checkout_url,provider_order_id').eq('id',checkout).single();payment=result.data;}
 if(payment?.provider_order_id&&payment.state==='pending'){try{await reconcilePayment(payment.id);const {data}=await client.from('irs_checkouts').select('id,account_id,case_id,state,amount_cents,checkout_url,provider_order_id').eq('id',payment.id).single();payment=data;}catch{/* Show persisted state. Never trust a browser return as payment confirmation. */}}
 const paid=payment?.state==='paid',url=checkoutUrl(payment?.checkout_url);
 return <main className="standalone" id="main"><Link href="/app">← Voltar ao IRS</Link><h1>{paid?'Pagamento confirmado.':'Estado do pagamento'}</h1><section className="panel">{!payment?<p>Este pagamento não está disponível para a sua conta.</p>:<><p>{paid?'O seu processo foi recebido para revisão pelo contabilista. A declaração ainda não foi submetida à Autoridade Tributária.':payment.state==='unknown'?'Esta tentativa precisa de verificação pelo contabilista. Não inicie outro pagamento.':payment.state==='failed'||payment.state==='cancelled'?'O pagamento não foi concluído. Pode voltar ao processo e iniciar uma nova tentativa.':'A confirmação do pagamento ainda está pendente. Só a confirmação da Revolut permite avançar o processo.'}</p><p>Total: {new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(payment.amount_cents/100)}</p>{!paid&&payment.provider_order_id&&<PaymentRefresh id={payment.id}/>}<div className="module-links">{!paid&&payment.state==='pending'&&url&&<a className="button" href={url}>Continuar pagamento</a>}<Link className="button" href={`/app?conta=${payment.account_id}&processo=${payment.case_id}&view=progresso`}>Consultar processo</Link></div></>}</section></main>;
}
