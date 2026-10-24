'use client';
import {useRef} from 'react';
export default function CheckoutModal({children,total}:{children:React.ReactNode;total:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 return <><div className="checkout-teaser"><div><span className="eyebrow">ÚLTIMO PASSO · IRS 2026</span><h2>Pronto para entregar os seus elementos?</h2><p>Consulte o detalhe do preço, aplique o desconto e confirme a entrega ao contabilista.</p></div><button className="primary" onClick={()=>dialog.current?.showModal()}>Rever e pagar · {total}</button></div><dialog ref={dialog} className="checkout-dialog" aria-labelledby="checkout-title" onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}><div className="checkout-modal-header"><span className="eyebrow">RR · IRS 2026</span><button type="button" aria-label="Fechar pagamento" onClick={()=>dialog.current?.close()}>✕</button></div>{children}</dialog></>;
}
