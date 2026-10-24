import { gabinete } from '@/lib/auth';
import { carregarEspaco } from '@/lib/espaco';
import { Portal } from '@/components/portal/portal';

export const metadata = { title: 'Gabinete' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Fila de trabalho do contabilista: todos os processos da campanha. */
export default async function Gabinete({ searchParams }: Props) {
  await gabinete();
  const procura = await searchParams;
  const vista = procura.separador === 'alertas' ? 'alertas' : 'fila';
  const { dados } = await carregarEspaco(vista, null, true);

  return (
    <Portal
      gabinete
      conta=""
      processo={null}
      estado=""
      rotulo="Gabinete · IRS 2026"
      nome="Todos os processos"
      separadores={['fila', 'alertas']}
      vistaInicial={vista}
      dadosIniciais={dados ?? { vista }}
    />
  );
}
