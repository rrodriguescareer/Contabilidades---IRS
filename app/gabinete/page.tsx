import { gabinete } from '@/lib/auth';
import { carregarEspaco } from '@/lib/espaco';
import { Consola } from '@/components/gabinete/consola';
import { temCredenciais } from '@/lib/cegid';

export const metadata = { title: 'Gabinete' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const VISTAS = ['fila', 'mensagens', 'pagamentos', 'alertas', 'integracoes'];

/** A consola do contabilista: a fila de trabalho e tudo o que a serve. */
export default async function Gabinete({ searchParams }: Props) {
  await gabinete();
  const procura = await searchParams;
  const pedida = typeof procura.separador === 'string' ? procura.separador : '';
  const vista = VISTAS.includes(pedida) ? pedida : 'fila';
  const { dados } = await carregarEspaco(vista === 'integracoes' ? 'fila' : vista, null, true);

  return (
    <Consola
      vistaInicial={vista}
      dadosIniciais={dados ?? { vista }}
      cegidConfigurado={await temCredenciais()}
    />
  );
}
