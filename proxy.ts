import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { configuration } from './lib/public-config';
/* O gabinete mudou-se para a gestão. As ligações antigas seguem para lá com
   um 307 imediato, antes de qualquer página começar a ser enviada. */
function gabineteMudou(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (!pathname.startsWith('/gabinete')) return null;
  const base = (process.env.NEXT_PUBLIC_GESTAO_URL || '').replace(/\/$/, '');
  if (!/^https:\/\//.test(base)) return null;
  const partes = pathname.split('/').filter(Boolean); // ['gabinete', id?, 'relatorio'?]
  const id = /^[0-9a-f-]{36}$/i.test(partes[1] || '') ? partes[1] : '';
  const destino = new URL(id && partes[2] === 'relatorio' ? `${base}/relatorio/${id}` : `${base}/irs`);
  if (id && partes[2] !== 'relatorio') destino.searchParams.set('processo', id);
  for (const k of ['processo', 'aba', 'separador']) {
    const v = searchParams.get(k);
    if (v && /^[a-z0-9-]{1,40}$/i.test(v)) destino.searchParams.set(k, v);
  }
  return NextResponse.redirect(destino, 307);
}

export async function proxy(request: NextRequest) {
  const mudou = gabineteMudou(request);
  if (mudou) return mudou;
  const config=configuration();
  let response = NextResponse.next({ request });
  if (!config) return response;
  const {url,key}=config;
  const client = createServerClient(url, key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: values => {
      values.forEach(({name,value}) => request.cookies.set(name,value));
      response = NextResponse.next({ request });
      values.forEach(({name,value,options}) => response.cookies.set(name,value,options));
    },
  } });
  // Renova os cookies. Quem autoriza mesmo é identity(), que verifica as
  // reivindicações assinadas, e as políticas de RLS na base de dados.
  const { data } = await client.auth.getSession();

  // Sem sessão nenhuma, corta aqui. Se deixássemos a página correr, o Next já
  // teria enviado o início do HTML quando o redirect() acontecesse, e o
  // visitante via a página piscar antes de ser mandado para a entrada.
  if (!data.session?.access_token) {
    // Um pedido de dados não deve receber uma página de entrada: responde 401
    // e quem chamou trata do caso.
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ erro: 'Sessão expirada.' }, { status: 401 });
    }
    const entrada = new URL('/entrar', request.url);
    const destino = request.nextUrl.pathname + request.nextUrl.search;
    if (destino && destino !== '/entrar') entrada.searchParams.set('destino', destino);
    const saida = NextResponse.redirect(entrada);
    saida.headers.set('Cache-Control','private, no-store');
    return saida;
  }

  response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config = { matcher: ['/app/:path*','/gabinete/:path*','/gabinete','/nova-password','/onboarding','/perfil','/pagamento','/convites/:path*','/aceitar-termos'] };
