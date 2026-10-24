'use server';
import { redirect } from 'next/navigation';
import {portalContext} from './portal-context';
import {signInError} from './auth-errors';
import { supabase, siteUrl } from './supabase';
import { IS_MANAGEMENT } from './app';
import { acceptedLegal,LEGAL_VERSION } from './legal';
import { identity } from './auth';
import { validEmail } from './validation';
const text = (form: FormData, name: string) => String(form.get(name) || '').trim();
function error(message: string, path='/entrar'): never { redirect(`${path}?erro=${encodeURIComponent(message)}`); }
export async function signIn(form:FormData){
 const email=text(form,'email').toLowerCase(),password=String(form.get('password')||'');
 if(!email||!password)error('Preencha o email e a palavra-passe.');
 const client=await supabase();
 const {data:auth,error:failure}=await client.auth.signInWithPassword({email,password});
 if(failure||!auth.user)error(signInError(failure?.code));
 const {data:context,error:contextError}=await portalContext(client,auth.user.id);
 if(contextError||!context)error('A autenticação foi concluída, mas não foi possível carregar a conta. Verifique se a atualização da base de dados foi aplicada.');
 if(context.profile.disabled_at||context.profile.deleted_at){await client.auth.signOut();error('Acesso bloqueado. Contacte o contabilista.');}
 if(!context.email_confirmed)error('Confirme o email da conta para continuar.');
 if(IS_MANAGEMENT&&!context.is_staff){await client.auth.signOut();error('A conta está autenticada, mas não tem autorização de gestão. A Gestão é exclusiva da conta confirmada do contabilista.');}
 if(!IS_MANAGEMENT&&context.is_staff){const url=process.env.NEXT_PUBLIC_GESTAO_URL;if(url&&/^https:\/\//.test(url))redirect(url);redirect('/contabilista');}
 const {cookies}=await import('next/headers');if((await cookies()).get('rr_invite'))redirect('/convites/aceitar');
 redirect('/app');
}
export async function signUp(form: FormData) {
  if (IS_MANAGEMENT) error('O registo de profissionais é feito pela administração.');
  if(process.env.AUTH_EMAIL_BRANDING_READY!=='true')error('O registo está temporariamente indisponível. Contacte o contabilista.','/registar');
  if(!acceptedLegal(form))error('Tem de aceitar os Termos e Condições e a Política de Privacidade.','/registar');
  const email=text(form,'email'),password=String(form.get('password')||'');
  if(!validEmail(email)||password.length<12||password.length>128)error('Indique um email válido e uma palavra-passe entre 12 e 128 caracteres.','/registar');
  const origin=siteUrl();if(!origin)error('O registo está temporariamente indisponível. Contacte o profissional.','/registar');
  const client=await supabase();
  const {error:failure}=await client.auth.signUp({email,password,options:{emailRedirectTo:`${origin}/auth/callback`,data:{terms_accepted:true,terms_version:LEGAL_VERSION,privacy_version:LEGAL_VERSION}}});
  if (failure) error('Não foi possível concluir o registo. Verifique os dados ou tente recuperar o acesso.','/registar');
  redirect('/entrar?mensagem=Confirme%20o%20email%20para%20continuar.%20Depois%20poderá%20preencher%20os%20seus%20dados%20e%20preparar%20o%20IRS.');
}
export async function signOut() { const client=await supabase();await client.auth.signOut();redirect('/entrar'); }
export async function recover(form: FormData) {
  if(process.env.AUTH_EMAIL_BRANDING_READY!=='true')error('A recuperação por email está temporariamente indisponível. Contacte o contabilista.','/recuperar');
  const origin=siteUrl();if (!origin) error('Falta configurar o endereço público da aplicação.','/recuperar');
  const client=await supabase();
  await client.auth.resetPasswordForEmail(text(form,'email'),{redirectTo:`${origin}/auth/callback?next=/nova-password`});
  redirect('/entrar?mensagem=Se%20existir%20uma%20conta%20associada,%20receberá%20instruções%20para%20recuperar%20o%20acesso.');
}
export async function changePassword(form: FormData) {
  const password=String(form.get('password')||'');if(password.length<12||password.length>128)error('Use pelo menos 12 caracteres.','/nova-password');
  const client=await supabase();const {data:{user}}=await client.auth.getUser();if(!user)error('Abra uma ligação de recuperação válida.');
  const {error: failure}=await client.auth.updateUser({password});if(failure)error('Não foi possível alterar a palavra-passe.','/nova-password');
  redirect('/app');
}

export async function acceptTerms(form:FormData){
 if(!acceptedLegal(form))error('Tem de aceitar os dois textos para continuar.','/aceitar-termos');
 const {client}=await identity();
 const {error:failure}=await client.rpc('record_legal_acceptance',{expected_terms:LEGAL_VERSION,expected_privacy:LEGAL_VERSION});
 if(failure)error('Não foi possível registar a aceitação. Tente novamente ou contacte o profissional.','/aceitar-termos');
 redirect('/app');
}
