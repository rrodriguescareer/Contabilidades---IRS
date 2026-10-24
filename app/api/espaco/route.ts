import { NextResponse } from 'next/server';
import { identity } from '@/lib/auth';
import { carregarEspaco, vistaValida } from '@/lib/espaco';
import { uuid } from '@/lib/data';

/* Alimenta a troca de separador sem recarregar a página.
   A sessão é lida dos cookies; a autorização fica nas políticas de RLS. */
export async function GET(pedido: Request) {
  const { context } = await identity();
  const url = new URL(pedido.url);

  const gabinete = url.searchParams.get('gabinete') === '1';
  if (gabinete && !context.is_staff) {
    return NextResponse.json({ erro: 'Sem autorização de gabinete.' }, { status: 403 });
  }

  const processoBruto = url.searchParams.get('processo') || '';
  const processo = uuid(processoBruto) ? processoBruto : null;
  const vista = vistaValida(url.searchParams.get('vista'), gabinete);

  const { dados, erro } = await carregarEspaco(vista, processo, gabinete);
  if (erro) return NextResponse.json({ erro }, { status: 400 });

  return NextResponse.json(dados, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
