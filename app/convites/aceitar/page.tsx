import {identity} from '@/lib/auth';
import {AuthShell} from '@/lib/auth-view';
import {acceptInvitation} from '@/lib/invitation-actions';
import LegalAcceptance from '@/components/legal-acceptance';
import {Submit} from '@/components/forms';
export const dynamic='force-dynamic';
export default async function Accept({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const {user}=await identity();const {erro}=await searchParams;
 return <AuthShell title="Convite para o agregado fiscal" description={`Está a entrar com ${user.email}. Deve ser o mesmo email que recebeu o convite.`} error={erro}><form action={acceptInvitation}><p>Confirme que pretende associar a sua conta a este convite. Não será dado acesso aos dados fiscais dos restantes familiares.</p><LegalAcceptance/><Submit>Aceitar convite</Submit></form></AuthShell>;
}
