import Link from 'next/link';
import {beginCheckout} from '@/lib/checkout-actions';
import CheckoutModal from './checkout-modal';
import CouponForm from './coupon-form';
import {Submit} from './forms';
export type Quote={items:{code:string;label:string;amount_cents:number}[];subtotal_cents:number;discount_cents:number;discount_code:string|null;total_cents:number};
const euro=(value:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(value/100);
export default function CheckoutPanel({account,process,quote,coupon,ready,existing}:{account:string;process:string;quote:Quote|null;coupon:string;ready:boolean;existing?:{id:string;state:string}|null}){
 return <CheckoutModal total={quote?euro(quote.total_cents):'Ver orçamento'}><section className="panel"><h2 id="checkout-title">Pagar e submeter</h2><p>Veja todas as rubricas antes de confirmar. O pagamento é concluído no checkout seguro da Revolut. Os valores incluem IVA. O processo será enviado ao contabilista após confirmação do pagamento; a declaração não é submetida automaticamente à AT.</p>
 {existing&&['creating','pending','unknown','paid'].includes(existing.state)?<><p>{existing.state==='paid'?'O pagamento deste processo já está confirmado.':'Já existe uma tentativa de pagamento. Consulte o estado antes de continuar.'}</p><Link className="button" href={`/pagamento?checkout=${existing.id}`}>Ver pagamento →</Link></>:<>
 <CouponForm account={account} process={process} coupon={coupon}/>

 {quote?<><ul className="price-lines">{quote.items.map(i=><li key={i.code}><span>{i.label}</span><strong>{euro(i.amount_cents)}</strong></li>)}{quote.discount_cents>0&&<li><span>{quote.discount_code||'Desconto'}</span><strong>−{euro(quote.discount_cents)}</strong></li>}</ul><p className="price-total"><span>Total com IVA</span><span>{euro(quote.total_cents)}</span></p><form action={beginCheckout}><input name="account" type="hidden" value={account}/><input name="process" type="hidden" value={process}/><input name="coupon" type="hidden" value={coupon}/><input name="expected_total" type="hidden" value={quote.total_cents}/><label className="check"><input name="confirmed" type="checkbox" required/>Confirmo os dados e documentos entregues e o preço apresentado para a preparação do IRS.</label>{ready||quote.total_cents===0?<Submit>{quote.total_cents===0?'Submeter sem pagamento':'Continuar para pagamento seguro'}</Submit>:<p className="alert">O pagamento online ainda não está disponível. Pode continuar a organizar os dados e documentos.</p>}</form></>:<p className="alert">Adicione pelo menos um rendimento para calcular o orçamento. Se introduziu um código, confirme que está válido e disponível para a sua conta.</p>}
 </>}
 </section></CheckoutModal>;
}
