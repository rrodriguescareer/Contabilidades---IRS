'use server';
import {redirect} from 'next/navigation';
import {session} from './auth';
import {siteUrl} from './supabase';
import {adminClient} from './admin-client';
import {paymentsReady} from './revolut';
import {checkoutUrl,orderMatches,revolutRequest} from './revolut-core';
import {uuid} from './data';
export async function beginCheckout(form:FormData){
 const {client}=await session();const account=String(form.get('account')||''),caseId=String(form.get('process')||''),coupon=String(form.get('coupon')||'').trim().slice(0,40);
 const path=`/app?conta=${encodeURIComponent(account)}&processo=${encodeURIComponent(caseId)}&view=pagamento`;
 function fail(message:string):never{redirect(`${path}&erro=${encodeURIComponent(message)}`);}
 if(form.get('confirmed')!=='on')fail('Confirme os dados, os documentos e o preço apresentado.');
 if(!uuid(account)||!uuid(caseId))fail('Selecione o processo.');
 const {data:quote,error:quoteError}=await client.rpc('quote_irs_checkout',{account,process:caseId,coupon});if(quoteError||!quote)fail('Não foi possível calcular o orçamento. Confirme os rendimentos e o código de desconto.');
 const origin=siteUrl();if(quote.total_cents>0&&(!paymentsReady()||!origin))fail('O pagamento online está temporariamente indisponível. Contacte o contabilista.');
 const expected=Number(form.get('expected_total'));if(!Number.isSafeInteger(expected)||expected!==quote.total_cents)fail('O orçamento mudou. Reveja o preço antes de confirmar.');
 const {data:attempt,error}=await client.rpc('begin_irs_checkout',{account,process:caseId,coupon,expected_total:expected});if(error||!attempt)fail('Não foi possível iniciar. Confirme o titular, os rendimentos e os carregamentos pendentes.');
 if(attempt.state==='paid')redirect(`/pagamento?checkout=${attempt.id}`);
 if(!attempt.created){const url=checkoutUrl(attempt.checkout_url);if(url)redirect(url);redirect(`/pagamento?checkout=${attempt.id}`);}
 const admin=adminClient();let target:string|null=null;
 try{
  const order=await revolutRequest(process.env.REVOLUT_MERCHANT_SECRET_KEY!,process.env.REVOLUT_API_VERSION!,'/orders',{amount:attempt.amount_cents,currency:'EUR',description:'RR - Preparação de IRS',merchant_order_data:{reference:attempt.id},redirect_url:`${origin}/pagamento?checkout=${attempt.id}`});
  target=checkoutUrl(order.checkout_url);
  if(!target||!orderMatches(order,{id:order.id,reference:attempt.id,amount:attempt.amount_cents}))throw new Error('Invalid order');
  const {error:linked}=await admin.rpc('attach_revolut_order',{attempt:attempt.id,provider_id:order.id,provider_url:target});if(linked)throw new Error('Order linking failed');
 }catch{
  // A timeout does not prove that no order was created. Keep the reservation for reconciliation.
  await admin.from('irs_checkouts').update({state:'unknown'}).eq('id',attempt.id).eq('state','creating');
  fail('Não foi possível abrir o pagamento. Não volte a pagar: o contabilista deve verificar esta tentativa antes de a libertar.');
 }
 redirect(target!);
}
