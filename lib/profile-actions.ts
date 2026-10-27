'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {identity} from './auth';
import {personError,validEmail} from './validation';
import {siteUrl} from './supabase';
import {senhaComprometida,AVISO_SENHA_COMPROMETIDA} from './password-leak';
import {erroDaPalavraPasse} from './palavra-passe';
const value=(form:FormData,key:string)=>String(form.get(key)||'').trim();
function fail(message:string,path='/onboarding'):never{redirect(`${path}?erro=${encodeURIComponent(message)}`);}
export async function saveProfile(form:FormData){
 const {client}=await identity();const path=value(form,'return')==='/perfil'?'/perfil':'/onboarding';
 const name=value(form,'name'),birth=value(form,'birth_date'),nif=value(form,'nif'),phone=value(form,'phone'),street=value(form,'street'),postal=value(form,'postal_code'),locality=value(form,'locality');
 const invalid=personError(name,birth,nif);if(invalid)fail(invalid,path);
 // No onboarding a senha das Finanças é obrigatória: é o momento em que se pede.
 const senhaIndicada=String(form.get('senha_financas')||'').trim();
 if(path==='/onboarding'&&!senhaIndicada)fail('Indique a senha do Portal das Finanças.',path);
 if(senhaIndicada.length>60)fail('A senha das Finanças tem no máximo 60 caracteres.',path);
 if(!/^\+?[0-9 ().-]{7,30}$/.test(phone)||phone.replace(/\D/g,'').length>15||phone.replace(/\D/g,'').length<7)fail('Indique um telemóvel válido.',path);
 if(!street||street.length>300||!/^\d{4}-\d{3}$/.test(postal)||!locality||locality.length>100)fail('Preencha a rua e número, o código postal (0000-000) e a localidade.',path);
 /* O NIF pode já estar noutra conta ou noutro agregado. Dizê-lo aqui, antes
    de falhar numa violação de unicidade sem explicação, e deixar o alerta
    para o gabinete. As saídas — apagar a conta anterior ou migrar do outro
    agregado — não são automáticas: mexem em dados de terceiros. */
 const {data:conflito}=await client.rpc('conflito_de_nif',{contribuinte:nif});
 const tipo=(conflito as {tipo?:string}|null)?.tipo;
 if(tipo==='conta'||tipo==='agregado'){
  const {error:semAlerta}=await client.rpc('alertar_conflito_de_nif',{contribuinte:nif,tipo});
  // O alerta é o que leva o caso até mim: se falhar, quero saber nos registos
  // em vez de o cliente ficar à espera de um contacto que nunca vem.
  if(semAlerta)console.info(JSON.stringify({event:'rr_alerta_nif_falhou',erro:semAlerta.message}));
  // O NIF não vai no endereço: é dado pessoal. Vai só o tipo de conflito, e
  // o ecrã pede o número outra vez — o que serve também de reconfirmação.
  redirect(`/onboarding?conflito=${tipo}`);
 }

 const {error}=await client.rpc('save_personal_profile',{person_name:name,birth,tax_id:nif,telephone:phone,address_street:street,address_postal:postal,address_locality:locality,two_factor:form.has('two_factor')});
 if(!error){
  // A residência fiscal e, fora da UE, o representante.
  const {error:residencia}=await client.rpc('guardar_residencia_fiscal',{
   residencia:value(form,'tax_residence')||'continente',
   rep_nome:value(form,'rep_name')||null,
   rep_contribuinte:value(form,'rep_nif')||null,
   rep_email:value(form,'rep_email')||null,
   rep_telefone:value(form,'rep_phone')||null,
  });
  if(residencia)fail(residencia.message.includes('representante')
   ?'Fora da União Europeia é obrigatório indicar o representante fiscal e um contacto.'
   :'Indique a residência fiscal.',path);
  /* A senha das Finanças do titular. Cifrada aqui, nunca volta ao browser.
     O titular vem do meu_titular(), que não depende das políticas de leitura
     no mesmo pedido em que a conta acabou de nascer. */
  const senha=String(form.get('senha_financas')||'').trim();
  if(senha){
   const {data:eu,error:semTitular}=await client.rpc('meu_titular');
   const alvo=eu as {processo?:string;pessoa?:string}|null;
   if(semTitular||!alvo?.processo||!alvo?.pessoa){
    console.error(JSON.stringify({event:'rr_onboarding_sem_titular',erro:semTitular?.message||null}));
    fail('Os dados ficaram guardados, mas a senha das Finanças não. Indique-a outra vez.',path);
   }
   let cifrada='';
   try{const {encryptSecret}=await import('./secret-crypto');cifrada=encryptSecret(senha,`financas:${alvo.pessoa}`);}
   catch(falha){console.error(JSON.stringify({event:'rr_cifra_falhou',erro:String(falha)}));fail('Não foi possível proteger a senha das Finanças. Tente daqui a pouco.',path);}
   const {error:semSenha}=await client.rpc('guardar_senha_financas',{processo:alvo.processo,p_pessoa:alvo.pessoa,p_cifrada:cifrada});
   if(semSenha){
    console.error(JSON.stringify({event:'rr_senha_falhou',codigo:semSenha.code,erro:semSenha.message}));
    fail('Os dados ficaram guardados, mas a senha das Finanças não. Indique-a outra vez.',path);
   }
  }
 }
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
 {const fraca=erroDaPalavraPasse(password,String(form.get('confirmation')||''));if(fraca)fail(fraca,'/perfil');}
 if(await senhaComprometida(password))fail(AVISO_SENHA_COMPROMETIDA,'/perfil');
 const {error:login}=await client.auth.signInWithPassword({email:user.email!,password:current});if(login)fail('A palavra-passe atual não foi confirmada.','/perfil');
 const {error}=await client.auth.updateUser({password});if(error)fail('Não foi possível alterar a palavra-passe.','/perfil');
 redirect('/perfil?mensagem=Palavra-passe%20alterada.');
}
