import {redirect} from 'next/navigation';
import Link from 'next/link';
import {identity} from '@/lib/auth';
import {AuthShell} from '@/lib/auth-view';
import {LEGAL_VERSION} from '@/lib/legal';
import ProfileForm,{type PersonalProfile} from '@/components/profile-form';
export const dynamic='force-dynamic';
export default async function Onboarding({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const {client,user}=await identity();const {erro}=await searchParams;
 const {data:staff}=await client.rpc('is_staff');if(staff)redirect('/app');
 const {data:acceptance}=await client.from('legal_acceptances').select('id').eq('user_id',user.id).eq('terms_version',LEGAL_VERSION).eq('privacy_version',LEGAL_VERSION).limit(1);if(!acceptance?.length)redirect('/aceitar-termos');
 const {data:profile,error}=await client.from('profiles').select('full_name,birth_date,nif,phone,street,postal_code,locality,onboarding_completed_at,disabled_at,deleted_at').eq('id',user.id).single();
 if(profile?.disabled_at||profile?.deleted_at)redirect('/entrar?erro=Acesso%20bloqueado.%20Contacte%20o%20contabilista.');
 if(profile?.onboarding_completed_at)redirect('/app');
 return <AuthShell title="Vamos completar os seus dados." description="Este é o primeiro passo. Depois pode criar o agregado, adicionar rendimentos e entregar os documentos." error={erro}>
 {error||!profile?<div className="alert error">Não foi possível carregar o registo. <Link href="/onboarding">Tentar novamente</Link></div>:<ProfileForm profile={profile as PersonalProfile}/>}</AuthShell>;
}
