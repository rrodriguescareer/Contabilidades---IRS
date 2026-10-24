'use client';
import {useTransition} from 'react';
import {useRouter} from 'next/navigation';
export default function CouponForm({account,process,coupon}:{account:string;process:string;coupon:string}){
 const router=useRouter(),[pending,start]=useTransition();
 return <form onSubmit={e=>{e.preventDefault();const value=new FormData(e.currentTarget).get('cupao');start(()=>router.replace(`/app?view=pagamento&conta=${account}&processo=${process}&cupao=${encodeURIComponent(String(value||''))}`,{scroll:false}));}}><label>Código de desconto<input name="cupao" defaultValue={coupon} maxLength={40} autoComplete="off"/></label><button disabled={pending}>{pending?'A calcular…':'Aplicar desconto'}</button><p className="fine">A gratuitidade ou o desconto obrigatório definido pelo contabilista aplica-se automaticamente.</p></form>;
}
