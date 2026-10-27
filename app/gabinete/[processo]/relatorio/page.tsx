import { redirect } from 'next/navigation';
import { gabineteNaGestao } from '@/lib/auth';
import { uuid } from '@/lib/data';

export const dynamic = 'force-dynamic';

/* O relatório do processo também vive agora na gestão. */
export default async function RelatorioAntigo({ params }: { params: Promise<{ processo: string }> }) {
  const { processo } = await params;
  redirect(gabineteNaGestao(uuid(processo) ? `/relatorio/${processo}` : '/irs'));
}
