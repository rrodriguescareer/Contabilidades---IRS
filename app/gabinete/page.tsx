import { redirect } from 'next/navigation';
import { gabineteNaGestao } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/* O gabinete mudou-se para a plataforma de gestão. As ligações antigas
   continuam a servir: levam ao mesmo sítio, com o mesmo processo e separador. */
export default async function Gabinete({ searchParams }: Props) {
  const procura = await searchParams;
  const q = new URLSearchParams();
  for (const k of ['processo', 'aba', 'separador']) {
    const v = procura[k];
    if (typeof v === 'string' && /^[a-z0-9-]{1,40}$/i.test(v)) q.set(k, v);
  }
  redirect(gabineteNaGestao(`/irs${q.size ? `?${q}` : ''}`));
}
