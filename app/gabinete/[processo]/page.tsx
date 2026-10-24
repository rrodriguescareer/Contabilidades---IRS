import { notFound } from 'next/navigation';
import { gabinete } from '@/lib/auth';
import { carregarEspaco, VISTAS_CLIENTE, vistaValida } from '@/lib/espaco';
import { uuid } from '@/lib/data';
import { Portal } from '@/components/portal/portal';

export const metadata = { title: 'Processo' };
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ processo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** O processo de um cliente, visto pelo contabilista. */
export default async function ProcessoDoCliente({ params, searchParams }: Props) {
  const { client } = await gabinete();
  const { processo } = await params;
  if (!uuid(processo)) notFound();

  const { data: registo } = await client
    .from('irs_cases')
    .select('id,account_id,status,client_accounts(name)')
    .eq('id', processo)
    .single();
  if (!registo) notFound();

  const procura = await searchParams;
  const vista = vistaValida(procura.separador);
  const { dados } = await carregarEspaco(vista, processo, true);

  const cliente = (registo.client_accounts as unknown as { name: string } | null)?.name ?? 'Cliente';

  return (
    <Portal
      gabinete
      conta={registo.account_id}
      processo={processo}
      estado={registo.status}
      rotulo="Processo de"
      nome={cliente}
      separadores={VISTAS_CLIENTE}
      vistaInicial={vista}
      dadosIniciais={dados ?? { vista }}
    />
  );
}
