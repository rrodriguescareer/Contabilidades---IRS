import { redirect } from 'next/navigation';
import { gabineteNaGestao } from '@/lib/auth';
import { uuid } from '@/lib/data';

export const dynamic = 'force-dynamic';

/* Ligação antiga para um processo: abre-o no gabinete, na gestão. */
export default async function ProcessoAntigo({ params }: { params: Promise<{ processo: string }> }) {
  const { processo } = await params;
  redirect(gabineteNaGestao(uuid(processo) ? `/irs?processo=${processo}` : '/irs'));
}
