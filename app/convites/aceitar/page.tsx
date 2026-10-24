import { identity } from '@/lib/auth';
import { EcraAutenticacao } from '@/lib/auth-view';
import { acceptInvitation } from '@/lib/invitation-actions';
import AceitacaoLegal from '@/components/legal-acceptance';
import { Submeter } from '@/components/forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Aceitar convite' };

export default async function AceitarConvite({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { user } = await identity();
  const { erro } = await searchParams;

  return (
    <EcraAutenticacao
      titulo="Convite para o agregado fiscal"
      descricao={`Está a entrar com ${user.email}. Deve ser o mesmo endereço que recebeu o convite.`}
      erro={erro}
    >
      <form action={acceptInvitation} className="pilha pilha-4">
        <p className="suave">
          Confirme que quer associar a sua conta a este convite. Isto não lhe dá acesso aos dados fiscais dos
          restantes familiares.
        </p>
        <AceitacaoLegal />
        <Submeter aDecorrer="A aceitar…">Aceitar convite</Submeter>
      </form>
    </EcraAutenticacao>
  );
}
