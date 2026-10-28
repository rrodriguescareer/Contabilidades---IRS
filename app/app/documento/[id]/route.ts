import { NextResponse, type NextRequest } from 'next/server';
import { identity } from '@/lib/auth';
import { uuid } from '@/lib/data';

/* Abrir ou descarregar um documento enviado pelo cliente. É uma ligação
   normal, não uma ação: abre num separador sem bloqueio de pop-ups e o
   navegador mostra o PDF ou a imagem logo. A RLS só deixa ler os documentos
   da própria conta; o endereço do Storage vale um minuto. */
export async function GET(pedido: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid(id)) return new NextResponse('Documento inválido.', { status: 400 });
  const { client } = await identity();

  const { data } = await client
    .from('documents')
    .select('storage_path,state,file_name')
    .eq('id', id)
    .maybeSingle();
  if (!data || !['uploaded', 'reviewed'].includes(data.state)) {
    return new NextResponse('Documento indisponível.', { status: 404 });
  }

  const descarregar = pedido.nextUrl.searchParams.has('descarregar');
  const { data: assinado, error } = await client.storage
    .from('irs-documents')
    .createSignedUrl(data.storage_path, 60, descarregar ? { download: data.file_name } : undefined);
  if (error || !assinado) return new NextResponse('Não foi possível abrir o documento.', { status: 502 });

  return NextResponse.redirect(assinado.signedUrl, { status: 303, headers: { 'Cache-Control': 'no-store' } });
}
