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
  const {data:profile,error:profileError}=await client.from('profiles').select('disabled_at,deleted_at').eq('id',user.id).single();
  if(profileError||!profile)redirect('/entrar?erro=Serviço%20temporariamente%20indisponível.');
  if(profile.disabled_at||profile.deleted_at)redirect('/entrar?erro=Acesso%20bloqueado.%20Contacte%20o%20contabilista.');
  return { client, user };
}
export async function session() {
  const current = await identity();
  if (IS_MANAGEMENT) {
    const { data, error } = await current.client.rpc('is_staff');
    if (error) redirect('/entrar?erro=Não%20foi%20possível%20confirmar%20o%20acesso.%20Contacte%20o%20profissional.');
    if (!data) redirect('/entrar?erro=Esta%20conta%20não%20tem%20acesso%20à%20gestão.');
  }
  if(!IS_MANAGEMENT){
    const {data:professional}=await current.client.rpc('is_staff');
    if(professional){const url=process.env.NEXT_PUBLIC_GESTAO_URL;if(url&&/^https:\/\//.test(url))redirect(url);redirect('/contabilista');}
    const {data,error}=await current.client.from('legal_acceptances').select('id').eq('user_id',current.user.id).eq('terms_version',LEGAL_VERSION).eq('privacy_version',LEGAL_VERSION).limit(1);
    if(error||!data?.length)redirect('/aceitar-termos');
    const {data:profile}=await current.client.from('profiles').select('onboarding_completed_at').eq('id',current.user.id).single();
    if(!profile?.onboarding_completed_at)redirect('/onboarding');
  }
  return current;
}
