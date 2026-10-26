import { redirect } from 'next/navigation';
import { gabinete } from '@/lib/auth';
import { uuid } from '@/lib/data';

export const dynamic = 'force-dynamic';

/* O processo deixou de ser uma página: abre dentro da consola. Esta rota
   fica a encaminhar, para as ligações antigas não morrerem. */
export default async function ProcessoAntigo({ params }: { params: Promise<{ processo: string }> }) {
  await gabinete();
  const { processo } = await params;
  redirect(uuid(processo) ? `/gabinete?processo=${processo}` : '/gabinete');
}
