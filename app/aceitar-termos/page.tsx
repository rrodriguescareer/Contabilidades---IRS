import { identity } from '@/lib/auth';
import { acceptTerms } from '@/lib/auth-actions';
import LegalPage from '@/components/legal-page';
import LegalAcceptance from '@/components/legal-acceptance';
export const dynamic='force-dynamic';
export default async function Acceptance({searchParams}:{searchParams:Promise<{erro?:string}>}){await identity();const {erro}=await searchParams;return <LegalPage title="Antes de continuar"><p>Para utilizar o portal, confirme os Termos e Condições e a Política de Privacidade desta versão. Esta ação não altera os módulos e processos que lhe estão atribuídos.</p>{erro&&<div className="alert error" role="alert">{erro}</div>}<form action={acceptTerms}><LegalAcceptance/><button className="primary">Aceitar e continuar</button></form></LegalPage>;}
