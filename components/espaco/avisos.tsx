import { createClient } from '@supabase/supabase-js';
import { configuration } from '@/lib/supabase';
import e from './avisos.module.css';

type Aviso = { id: string; mensagem: string; tom: string };

/* A faixa de avisos, no topo da plataforma. Lida com a chave pública: são
   avisos para toda a gente, e a política só devolve os que estão no ar. */
export async function FaixaDeAvisos() {
  const config = configuration();
  if (!config) return null;

  const cliente = createClient(config.url, config.key, { auth: { persistSession: false } });
  const { data } = await cliente
    .from('avisos')
    .select('id,mensagem,tom')
    .eq('no_irs', true)
    .order('criado_em', { ascending: false });

  const avisos = (data || []) as Aviso[];
  if (avisos.length === 0) return null;

  return (
    <div className={e.faixa} role="status">
      {avisos.map((a) => (
        <p key={a.id} className={e.aviso} data-tom={a.tom}>
          {a.mensagem}
        </p>
      ))}
    </div>
  );
}
