import Link from 'next/link';
import { redirect } from 'next/navigation';
import { identity } from '@/lib/auth';
import { EcraAutenticacao } from '@/lib/auth-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Convite aceite' };

export default async function ConviteAceite() {
  const { client, user } = await identity();
  const { data } = await client
    .from('household_invitations')
    .select('id')
    .eq('accepted_by', user.id)
    .eq('state', 'accepted')
    .limit(1);
  if (!data?.length) redirect('/app');

  return (
    <EcraAutenticacao
      titulo="Convite aceite."
      descricao="A associação ficou registada e pode ser consultada pelo titular e pelo contabilista."
    >
      <div className="pilha pilha-4">
        <p className="suave">
          Isto não lhe permite consultar o processo dos outros familiares. Se também quiser preparar o seu
          próprio IRS, complete os seus dados.
        </p>
        <Link className="btn" href="/app">
          Continuar para a minha área
        </Link>
      </div>
    </EcraAutenticacao>
  );
}
