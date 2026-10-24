import Link from 'next/link';
import { Submeter } from '@/components/forms';
import { EcraAutenticacao } from '@/lib/auth-view';
import { signIn } from '@/lib/auth-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Entrar' };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string; mensagem?: string }> }) {
  const parametros = await searchParams;
  return (
    <EcraAutenticacao
      titulo="Bem-vindo de volta."
      descricao="Entre para ver o estado do seu IRS."
      erro={parametros.erro}
      mensagem={parametros.mensagem}
      rodape={
        <>
          <Link href="/registar">Criar conta</Link>
          <Link href="/recuperar">Esqueci-me da palavra-passe</Link>
        </>
      }
    >
      <form action={signIn}>
        <label className="campo">
          <span>Email</span>
          <input name="email" type="email" className="entrada" autoComplete="email" required maxLength={254} />
        </label>
        <label className="campo">
          <span>Palavra-passe</span>
          <input name="password" type="password" className="entrada" autoComplete="current-password" required maxLength={128} />
        </label>
        <Submeter aDecorrer="A entrar…">Entrar</Submeter>
      </form>
    </EcraAutenticacao>
  );
}
