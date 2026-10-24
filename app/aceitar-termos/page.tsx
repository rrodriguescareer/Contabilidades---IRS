import { identity } from '@/lib/auth';
import { acceptTerms } from '@/lib/auth-actions';
import PaginaLegal from '@/components/legal-page';
import AceitacaoLegal from '@/components/legal-acceptance';
import { Submeter } from '@/components/forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Termos' };

export default async function AceitarTermos({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await identity();
  const { erro } = await searchParams;

  return (
    <PaginaLegal title="Antes de continuar">
      <p className="suave">
        Para utilizar o portal, confirme os Termos e Condições e a Política de Privacidade desta versão. Isto não
        altera os processos que já lhe estão atribuídos.
      </p>
      {erro && (
        <p className="aviso aviso-critico" role="alert">
          {erro}
        </p>
      )}
      <form action={acceptTerms} className="pilha pilha-4">
        <AceitacaoLegal />
        <Submeter className="btn" aDecorrer="A confirmar…">
          Aceitar e continuar
        </Submeter>
      </form>
    </PaginaLegal>
  );
}
