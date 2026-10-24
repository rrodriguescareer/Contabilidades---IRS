'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function PaymentRefresh({id}:{id:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const router=useRouter();
 return <><button disabled={busy} onClick={async()=>{setBusy(true);try{const response=await fetch(`/api/revolut/status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!response.ok)throw new Error();setMessage('Estado consultado.');router.refresh();}catch{setMessage('Não foi possível confirmar agora. Tente novamente ou contacte o contabilista.');}finally{setBusy(false);}}}>{busy?'A confirmar…':'Atualizar estado do pagamento'}</button>{message&&<p role="status">{message}</p>}</>;
}
