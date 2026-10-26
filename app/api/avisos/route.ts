import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { configuration } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/* Os avisos activos, em aberto.
 *
 * É o website estático que os vem buscar — não tem servidor para consultar o
 * Supabase. A política de leitura só devolve os que estão no ar e dentro da
 * janela, por isso não há aqui nenhuma filtragem de confiança a repetir. */
export async function GET() {
  const config = configuration();
  if (!config) return NextResponse.json({ avisos: [] });

  const cliente = createClient(config.url, config.key, { auth: { persistSession: false } });
  const { data } = await cliente
    .from('avisos')
    .select('id,mensagem,tom,no_irs,no_website')
    .order('criado_em', { ascending: false });

  return NextResponse.json(
    { avisos: data || [] },
    {
      headers: {
        // Um minuto chega: um aviso urgente não pode demorar a aparecer,
        // e também não vale a pena consultar a base a cada visita.
        'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        'access-control-allow-origin': '*',
      },
    },
  );
}
