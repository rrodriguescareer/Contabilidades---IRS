import { notFound } from 'next/navigation';
import { gabinete } from '@/lib/auth';
import { carregarEspaco } from '@/lib/espaco';
import { uuid } from '@/lib/data';
import { Processo } from '@/components/gabinete/processo';

export const metadata = { title: 'Processo' };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ processo: string }> };

/** Um processo visto pelo contabilista: tudo numa página, não separador a separador. */
export default async function ProcessoDoCliente({ params }: Props) {
  await gabinete();
  const { processo } = await params;
  if (!uuid(processo)) notFound();

  const { dados } = await carregarEspaco('processo', processo, true);
  if (!dados || dados.erro) notFound();

  return <Processo dados={dados} processo={processo} />;
}
