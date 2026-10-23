import 'server-only';
import { redirect } from 'next/navigation';
import { configuration, supabase } from './supabase';
import { IS_MANAGEMENT } from './app';
import { LEGAL_VERSION } from './legal';
export async function identity() {
  if (!configuration()) redirect('/entrar');
  const client = await supabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/entrar');
  return { client, user };
}
export async function session() {
  const current = await identity();
  if (IS_MANAGEMENT) {
    const { data, error } = await current.client.rpc('is_staff');
    if (error) redirect('/entrar?erro=Base%20de%20dados%20por%20preparar.%20Execute%20a%20migração%20central.');
    if (!data) redirect('/entrar?erro=Esta%20conta%20não%20tem%20acesso%20à%20gestão.');
  }
  if(!IS_MANAGEMENT){
    const {data,error}=await current.client.from('legal_acceptances').select('id').eq('user_id',current.user.id).eq('terms_version',LEGAL_VERSION).eq('privacy_version',LEGAL_VERSION).limit(1);
    if(error||!data?.length)redirect('/aceitar-termos');
  }
  return current;
}
