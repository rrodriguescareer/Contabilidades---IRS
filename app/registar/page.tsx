import { AuthShell } from '@/lib/auth-view';
import { signUp } from '@/lib/auth-actions';
import LegalAcceptance from '@/components/legal-acceptance';
export const dynamic='force-dynamic';
export default async function Register({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const {erro}=await searchParams;
 return <AuthShell title="Crie a sua conta IRS." description="Confirme o email e preencha depois os seus dados. Pode começar sem aprovação manual." error={erro}>
 <form action={signUp}><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Palavra-passe<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/><small>Entre 12 e 128 caracteres. Não utilize a senha do Portal das Finanças.</small></label><LegalAcceptance/><button className="primary" type="submit" disabled={process.env.AUTH_EMAIL_BRANDING_READY!=='true'}>Criar conta</button>{process.env.AUTH_EMAIL_BRANDING_READY!=='true'&&<p role="status">A criação de contas está temporariamente indisponível. Contacte o contabilista.</p>}</form></AuthShell>;
}
