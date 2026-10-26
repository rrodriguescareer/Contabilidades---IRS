'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {identity} from './auth';
import {personError,validEmail} from './validation';
import {siteUrl} from './supabase';
import {senhaComprometida,AVISO_SENHA_COMPROMETIDA} from './password-leak';
const value=(form:FormData,key:string)=>String(form.get(key)||'').trim();
function fail(message:string,path='/onboarding'):never{redirect(`${path}?erro=${encodeURIComponent(message)}`);}
export async function saveProfile(form:FormData){
 const {client}=await identity();const path=value(form,'return')==='/perfil'?'/perfil':'/onboarding';
 const name=value(form,'name'),birth=value(form,'birth_date'),nif=value(form,'nif'),phone=value(form,'phone'),street=value(form,'street'),postal=value(form,'postal_code'),locality=value(form,'locality');
 const invalid=personError(name,birth,nif);if(invalid)fail(invalid,path);
 if(!/^\+?[0-9 ().-]{7,30}$/.test(phone)||phone.replace(/\D/g,'').length>15||phone.replace(/\D/g,'').length<7)fail('Indique um telemóvel válido.',path);
 if(!street||street.length>300||!/^\d{4}-\d{3}$/.test(postal)||!locality||locality.length>100)fail('Preencha a rua e número, o código postal (0000-000) e a localidade.',path);
 const {error}=await client.rpc('save_personal_profile',{person_name:name,birth,tax_id:nif,telephone:phone,address_street:street,address_postal:postal,address_locality:locality,two_factor:form.has('two_factor')});
 if(error)fail('Não foi possível guardar. Confirme os dados. Se o seu acesso estiver suspenso ou o NIF já existir no agregado, contacte o contabilista.',path);
 revalidatePath('/app');
 // Fecha-se o onboarding criando a ficha no Cegid. Se o NIF for recusado, o
 // cliente é avisado — mas o processo segue: um erro de integração não pode
 // prender alguém a meio do registo.
 let aviso='';
 if(path!=='/perfil'){
  try{const {criarFichaAposOnboarding}=await import('./acoes-cegid');const r=await criarFichaAposOnboarding();aviso=r.aviso||'';}
  catch{/* a integração não trava o cliente */}
 }
 if(aviso)redirect(`/app?aviso=${encodeURIComponent(aviso)}`);
 redirect(path==='/perfil'?'/perfil?mensagem=Dados%20guardados.':'/app');
}
export async function changeEmail(form:FormData){
 if(process.env.AUTH_EMAIL_BRANDING_READY!=='true')fail('A alteração de email está temporariamente indisponível.','/perfil');
 const {client,user}=await identity();const email=value(form,'email'),password=String(form.get('current_password')||'');
 if(!validEmail(email)||!password)fail('Indique o novo email e a palavra-passe atual.','/perfil');
 const {data:staff}=await client.rpc('is_staff');if(staff)fail('O email da conta de administração não pode ser alterado nesta área.','/perfil');
 const origin=siteUrl();if(!origin)fail('Serviço temporariamente indisponível.','/perfil');
 const {error:login}=await client.auth.signInWithPassword({email:user.email!,password});if(login)fail('A palavra-passe atual não foi confirmada.','/perfil');
 const {error}=await client.auth.updateUser({email},{emailRedirectTo:`${origin}/auth/callback?next=/perfil`});
 if(error)fail('Não foi possível solicitar a alteração do email.','/perfil');
 redirect('/perfil?mensagem=Confirme%20a%20alteração%20pelas%20ligações%20enviadas%20por%20email.%20O%20endereço%20só%20muda%20após%20confirmação.');
}
export async function changeOwnPassword(form:FormData){
 const {client,user}=await identity();const current=String(form.get('current_password')||''),password=String(form.get('password')||'');
 if(password.length<12||password.length>128||password!==String(form.get('confirmation')||''))fail('Confirme a nova palavra-passe, entre 12 e 128 caracteres.','/perfil');
 if(await senhaComprometida(password))fail(AVISO_SENHA_COMPROMETIDA,'/perfil');
 const {error:login}=await client.auth.signInWithPassword({email:user.email!,password:current});if(login)fail('A palavra-passe atual não foi confirmada.','/perfil');
 const {error}=await client.auth.updateUser({password});if(error)fail('Não foi possível alterar a palavra-passe.','/perfil');
 redirect('/perfil?mensagem=Palavra-passe%20alterada.');
}
