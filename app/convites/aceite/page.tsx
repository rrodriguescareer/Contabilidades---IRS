import Link from 'next/link';
import {identity} from '@/lib/auth';
import {AuthShell} from '@/lib/auth-view';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Accepted(){
 const {client,user}=await identity();
 const {data}=await client.from('household_invitations').select('id').eq('accepted_by',user.id).eq('state','accepted').limit(1);
 if(!data?.length)redirect('/app');
 return <AuthShell title="Convite aceite." description="A sua associação ficou registada e pode ser consultada pelo titular e pelo contabilista."><p>A confirmação não permite consultar o processo dos outros familiares. Se também pretende preparar o seu próprio IRS, pode completar os seus dados.</p><Link className="button" href="/app">Continuar para a minha área</Link></AuthShell>;
}
