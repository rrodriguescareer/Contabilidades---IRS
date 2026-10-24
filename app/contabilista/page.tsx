import {redirect} from 'next/navigation';
import {identity} from '@/lib/auth';
import {AuthShell} from '@/lib/auth-view';
export const dynamic='force-dynamic';
export default async function Professional(){
 const {client}=await identity();const {data:staff}=await client.rpc('is_staff');if(!staff)redirect('/app');
 const target=process.env.NEXT_PUBLIC_GESTAO_URL;if(target&&/^https:\/\//.test(target))redirect(target);
 return <AuthShell title="A sua área de contabilista" description="O acompanhamento IRS e a gestão de empresas estão centralizados na plataforma de Gestão de Clientes."><p>Abra a aplicação Gestão de Clientes que publicou no Vercel e entre com a sua conta profissional.</p><p>O encaminhamento automático ficará disponível quando o endereço dessa aplicação estiver configurado.</p></AuthShell>;
}
