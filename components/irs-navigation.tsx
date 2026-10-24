'use client';
import {useSearchParams} from 'next/navigation';
import PortalLink from './portal-link';
const menu={resumo:'Visão geral',agregado:'Agregado fiscal',rendimentos:'Rendimentos e despesas',documentos:'Documentos',mensagens:'Mensagens',progresso:'Progresso',faturacao:'Faturas e pagamentos',pagamento:'Pagar e submeter'};
export default function IrsNavigation(){const params=useSearchParams(),view=params.get('view')||'resumo';return <nav aria-label="Navegação principal">{Object.entries(menu).map(([key,label])=>{const query=new URLSearchParams(params.toString());query.set('view',key);query.delete('erro');query.delete('mensagem');query.delete('cupao');return <PortalLink key={key} current={view===key} className={view===key?'selected':''} href={'/app?'+query}>{label}</PortalLink>;})}</nav>;}
