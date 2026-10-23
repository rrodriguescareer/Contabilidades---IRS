'use server';
import { redirect } from 'next/navigation';
import { supabase, siteUrl } from './supabase';
import { IS_MANAGEMENT } from './app';
import { acceptedLegal,LEGAL_VERSION } from './legal';
import { identity } from './auth';
import { registrationError } from './validation';
const text = (form: FormData, name: string) => String(form.get(name) || '').trim();
function error(message: string, path='/entrar'): never { redirect(`${path}?erro=${encodeURIComponent(message)}`); }
export async function signIn(form: FormData) {
  const email=text(form,'email'), password=String(form.get('password')||'');
  if (!email || !password) error('Preencha o email e a palavra-passe.');
  const client=await supabase();
  const { error: failure }=await client.auth.signInWithPassword({email,password});
  if (failure) error('Não foi possível entrar. Verifique os dados e confirme o seu email.');
  if (IS_MANAGEMENT) {
    const {data,error: denied}=await client.rpc('is_staff');
    if (denied || !data) {await client.auth.signOut();error('Não foi possível autorizar o acesso à gestão. Contacte o responsável.');}
  }
  redirect('/app');
}
export async function signUp(form: FormData) {
  if (IS_MANAGEMENT) error('O registo de profissionais é feito pela administração.');
  if(!acceptedLegal(form))error('Tem de aceitar os Termos e Condições e a Política de Privacidade.','/registar');
  const email=text(form,'email'),password=String(form.get('password')||''),name=text(form,'full_name'),nif=text(form,'nif'),dob=text(form,'birth_date'),phone=text(form,'phone'),address=text(form,'address');
  const invalid=registrationError({name,birth:dob,nif,email,phone,address,password});if(invalid)error(invalid,'/registar');
  const origin=siteUrl();if (!origin) error('O registo está temporariamente indisponível. Contacte o profissional.','/registar');
  const client=await supabase();
  const {error: failure}=await client.auth.signUp({email,password,options:{emailRedirectTo:`${origin}/auth/callback`,data:{full_name:name,nif,birth_date:dob,phone,address,terms_accepted:true,terms_version:LEGAL_VERSION,privacy_version:LEGAL_VERSION}}});
  if (failure) error('Não foi possível concluir o registo. Verifique os dados ou tente recuperar o acesso.','/registar');
  redirect('/entrar?mensagem=Confirme%20o%20email%20para%20continuar.%20O%20acesso%20ao%20IRS%20será%20aprovado%20pelo%20profissional.');
}
export async function signOut() { const client=await supabase();await client.auth.signOut();redirect('/entrar'); }
export async function recover(form: FormData) {
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
