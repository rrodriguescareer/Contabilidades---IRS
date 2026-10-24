import Link from 'next/link';
import {Suspense} from 'react';
import {session} from '@/lib/auth';
import {signOut} from '@/lib/auth-actions';
import IrsNavigation from '@/components/irs-navigation';
export default async function IrsLayout({children}:{children:React.ReactNode}){
 const {user}=await session();return <div className="app-shell"><aside className="sidebar"><Link className="brand" href="/app"><img src="/rr-logo.svg" alt="RR." width="58" height="36"/><span>Portal IRS<small>Área privada do cliente</small></span></Link><div className="platforms"><strong>IRS 2026</strong><span>O seu processo, acompanhado de perto.</span></div><Suspense><IrsNavigation/></Suspense><div className="sidebar-bottom"><Link href="/perfil">A minha conta →</Link><small>Rúben Meirinho Rodrigues<br/>Contabilista Certificado</small><form action={signOut}><button className="quiet">Terminar sessão</button></form></div></aside><section className="app-main"><header className="topbar"><span>Portal IRS · 2026</span><span>{user.email}</span></header><main id="main">{children}</main><footer className="app-footer">RR · Área privada<span>O seu processo IRS 2026.</span></footer></section></div>;
}
