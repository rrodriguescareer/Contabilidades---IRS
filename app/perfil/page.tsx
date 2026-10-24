import Link from 'next/link';
import { session } from '@/lib/auth';
import { changeEmail, changeOwnPassword } from '@/lib/profile-actions';
import { signOut } from '@/lib/auth-actions';
import FormularioPerfil, { type PerfilPessoal } from '@/components/profile-form';
import { Submeter } from '@/components/forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'A minha conta' };

export default async function Perfil({ searchParams }: { searchParams: Promise<{ erro?: string; mensagem?: string }> }) {
  const { client, user, context } = await session();
  const parametros = await searchParams;
  const perfil = context.profile;

  const { data: pessoa } = perfil?.nif
    ? await client.from('people').select('tax_two_factor').eq('nif', perfil.nif).limit(1)
    : { data: [] };

  return (
    <main
      id="principal"
      className="envolve"
      style={{ paddingBlock: 'var(--e-5) var(--e-8)', display: 'grid', gap: 'var(--e-5)', maxWidth: '52rem' }}
    >
      <Link href="/app" className="btn btn-discreto btn-sm" style={{ justifySelf: 'start' }}>
        ← Voltar ao IRS
      </Link>
      <h1>A minha conta</h1>

      {parametros.erro && (
        <p className="aviso aviso-critico" role="alert">
          {parametros.erro}
        </p>
      )}
      {parametros.mensagem && (
        <p className="aviso aviso-positivo" role="status">
          {parametros.mensagem}
        </p>
      )}

      <section className="cartao pilha pilha-4">
        <h2 className="pequeno maiusc suave">Dados pessoais</h2>
        <FormularioPerfil profile={perfil as PerfilPessoal} twoFactor={pessoa?.[0]?.tax_two_factor} editing />
      </section>

      <div className="grelha grelha-2">
        <section className="cartao pilha pilha-4">
          <h2 className="pequeno maiusc suave">Alterar email</h2>
          <p className="pequeno suave">Endereço atual: {user.email}</p>
          <form action={changeEmail} className="pilha pilha-4">
            <label className="campo">
              <span>Novo email</span>
              <input name="email" type="email" className="entrada" autoComplete="email" required maxLength={254} />
            </label>
            <label className="campo">
              <span>Palavra-passe atual</span>
              <input name="current_password" type="password" className="entrada" autoComplete="current-password" required maxLength={128} />
            </label>
            <Submeter className="btn btn-secundario">Pedir alteração</Submeter>
            <p className="micro tenue">Só fica concluída depois de confirmar as ligações enviadas por email.</p>
          </form>
        </section>

        <section className="cartao pilha pilha-4">
          <h2 className="pequeno maiusc suave">Alterar palavra-passe</h2>
          <form action={changeOwnPassword} className="pilha pilha-4">
            <label className="campo">
              <span>Palavra-passe atual</span>
              <input name="current_password" type="password" className="entrada" autoComplete="current-password" required maxLength={128} />
            </label>
            <label className="campo">
              <span>Nova palavra-passe</span>
              <input name="password" type="password" className="entrada" autoComplete="new-password" minLength={12} maxLength={128} required />
            </label>
            <label className="campo">
              <span>Confirmar</span>
              <input name="confirmation" type="password" className="entrada" autoComplete="new-password" minLength={12} maxLength={128} required />
            </label>
            <Submeter className="btn btn-secundario">Guardar palavra-passe</Submeter>
          </form>
        </section>
      </div>

      <form action={signOut}>
        <button className="btn btn-discreto">Terminar sessão</button>
      </form>
    </main>
  );
}
