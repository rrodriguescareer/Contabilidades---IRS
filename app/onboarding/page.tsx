import {redirect} from 'next/navigation';
import Link from 'next/link';
import {identity} from '@/lib/auth';
import {AuthShell} from '@/lib/auth-view';
import {LEGAL_VERSION} from '@/lib/legal';
import ProfileForm,{type PersonalProfile} from '@/components/profile-form';
export const dynamic='force-dynamic';
export default async function Onboarding({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const {context}=await identity();const {erro}=await searchParams;
 const profile=context.profile;
 if(context.is_staff)redirect('/app');
 if(!context.legal_accepted)redirect('/aceitar-termos');
 if(profile.onboarding_completed_at)redirect('/app');
 return <AuthShell title="Vamos completar os seus dados." description="Este é o primeiro passo. Depois pode criar o agregado, adicionar rendimentos e entregar os documentos." error={erro}>
 {!profile?<div className="alert error">Não foi possível carregar o registo. <Link href="/onboarding">Tentar novamente</Link></div>:<ProfileForm profile={profile as PersonalProfile}/>}</AuthShell>;
}
