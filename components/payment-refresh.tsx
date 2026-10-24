'use client';
import {useState,useEffect,useCallback} from 'react';
import {useRouter} from 'next/navigation';
export default function PaymentRefresh({id,automatic=false}:{id:string;automatic?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const router=useRouter();
 const verify=useCallback(async()=>{setBusy(true);try{const response=await fetch('/api/revolut/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!response.ok)throw new Error();const data=await response.json();setMessage(data.state==='paid'?'Pagamento confirmado.':'O pagamento continua por confirmar.');if(data.state==='paid'||['failed','cancelled'].includes(data.state))router.refresh();}catch{setMessage('Não foi possível confirmar agora. Tente novamente ou contacte o contabilista.');}finally{setBusy(false);}},[id,router]);
 useEffect(()=>{if(automatic)void verify();},[automatic,verify]);
 return <><button disabled={busy} onClick={verify}>{busy?'A confirmar…':'Atualizar estado do pagamento'}</button>{message&&<p role="status">{message}</p>}</>;
}
