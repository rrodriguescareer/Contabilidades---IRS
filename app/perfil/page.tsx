import Link from 'next/link';
import {session} from '@/lib/auth';
import {changeEmail,changeOwnPassword} from '@/lib/profile-actions';
import ProfileForm,{type PersonalProfile} from '@/components/profile-form';
import {Submit} from '@/components/forms';
export const dynamic='force-dynamic';
export default async function Profile({searchParams}:{searchParams:Promise<{erro?:string;mensagem?:string}>}){
 const {client,user,context}=await session();const params=await searchParams;
 const profile=context.profile;
 const {data:person}=profile?.nif?await client.from('people').select('tax_two_factor').eq('nif',profile.nif).limit(1):{data:[]};
 return <main className="standalone" id="main"><Link href="/app">← Voltar ao IRS</Link><h1>A minha conta</h1>{params.erro&&<div className="alert error" role="alert">{params.erro}</div>}{params.mensagem&&<div className="alert" role="status">{params.mensagem}</div>}
 {!profile?<p>Não foi possível carregar os dados.</p>:<section className="panel"><h2>Dados pessoais</h2><ProfileForm profile={profile as PersonalProfile} twoFactor={person?.[0]?.tax_two_factor} editing/></section>}
 <div className="columns"><section className="panel"><h2>Alterar email</h2><p>Endereço atual: {user.email}</p><form action={changeEmail}><label>Novo email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Palavra-passe atual<input name="current_password" type="password" autoComplete="current-password" required maxLength={128}/></label><Submit>Solicitar alteração</Submit><p className="fine">A alteração só fica concluída depois de confirmar as ligações recebidas por email.</p></form></section>
 <section className="panel"><h2>Alterar palavra-passe</h2><form action={changeOwnPassword}><label>Palavra-passe atual<input name="current_password" type="password" autoComplete="current-password" required maxLength={128}/></label><label>Nova palavra-passe<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label><label>Confirmar nova palavra-passe<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label><Submit>Guardar palavra-passe</Submit></form></section></div></main>;
}
