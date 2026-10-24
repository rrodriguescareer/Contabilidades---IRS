import { redirect } from 'next/navigation';
import { identity } from '@/lib/auth';
import { EcraAutenticacao } from '@/lib/auth-view';
import FormularioPerfil, { type PerfilPessoal } from '@/components/profile-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Os seus dados' };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { context } = await identity();
  const { erro } = await searchParams;

  if (context.is_staff) redirect('/gabinete');
  if (!context.legal_accepted) redirect('/aceitar-termos');
  if (context.profile.onboarding_completed_at) redirect('/app');

  return (
    <EcraAutenticacao
      titulo="Vamos completar os seus dados."
      descricao="É o primeiro passo. A seguir monta o agregado, acrescenta rendimentos e carrega os documentos."
      erro={erro}
    >
      <FormularioPerfil profile={context.profile as PerfilPessoal} />
    </EcraAutenticacao>
  );
}
