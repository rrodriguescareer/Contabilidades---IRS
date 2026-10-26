import Link from 'next/link';
import { session } from '@/lib/auth';
import { carregarEspaco, vistaValida } from '@/lib/espaco';
import { Espaco } from '@/components/espaco/espaco';

export const metadata = { title: 'O meu IRS' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AreaCliente({ searchParams }: Props) {
  const { context } = await session();
  const procura = await searchParams;

  const conta = context.accounts?.[0];
  const processo = context.cases?.[0];

  // Conta sem processo aberto: o onboarding cria um, por isso isto só acontece
  // se o contabilista tiver fechado a campanha para este cliente.
  if (!conta || !processo) {
    return (
      <main id="principal" className="envolve" style={{ paddingBlock: 'var(--e-8)', display: 'grid', gap: 'var(--e-4)', maxWidth: '44rem' }}>
        <h1>Ainda não tem um processo aberto</h1>
        <p className="suave">
          A sua conta está ativa, mas não existe nenhum processo de IRS 2026 associado. Escreva-me e eu abro-o.
        </p>
        <Link href="/perfil" className="btn btn-secundario" style={{ justifySelf: 'start' }}>
          Ver a minha conta
        </Link>
      </main>
    );
  }

  const vista = vistaValida(procura.separador);
  const { dados } = await carregarEspaco(vista, processo.id);

  return (
    <Espaco
      conta={conta.id}
      processo={processo.id}
      estado={processo.status}
      nome={context.profile.full_name || context.email}
      vistaInicial={vista}
      dadosIniciais={dados ?? { vista }}
    />
  );
}
