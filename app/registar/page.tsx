import Link from 'next/link';
import { Submeter } from '@/components/forms';
import { EcraAutenticacao } from '@/lib/auth-view';
import { signUp } from '@/lib/auth-actions';
import AceitacaoLegal from '@/components/legal-acceptance';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Criar conta' };

export default async function Registar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <EcraAutenticacao
      titulo="Crie a sua conta."
      descricao="Email e palavra-passe. Os dados pessoais ficam para o passo seguinte."
      erro={erro}
      rodape={<Link href="/entrar">Já tenho conta</Link>}
    >
      <form action={signUp}>
        <label className="campo">
          <span>Email</span>
          <input name="email" type="email" className="entrada" autoComplete="email" required maxLength={254} />
        </label>
        <label className="campo">
          <span>Palavra-passe</span>
          <input
            name="password"
            type="password"
            className="entrada"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
          <small>Entre 12 e 128 caracteres. Nunca use a senha do Portal das Finanças.</small>
        </label>
        <AceitacaoLegal />
        <Submeter aDecorrer="A criar…">Criar conta</Submeter>
      </form>
    </EcraAutenticacao>
  );
}
