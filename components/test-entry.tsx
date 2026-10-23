'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LegalAcceptance from './legal-acceptance';
import { acceptedLegal } from '@/lib/legal';
export default function TestEntry(){const router=useRouter();const [error,setError]=useState('');return <form onSubmit={event=>{event.preventDefault();if(!acceptedLegal(new FormData(event.currentTarget))){setError('Aceite os textos para continuar.');return;}router.push('/demonstracao?conta=teste');}}><div className="alert"><strong>Cliente de teste · fictício</strong><p>Email de identificação: teste.irs@example.com. Não é uma conta de login, não precisa de palavra-passe e não permite entrar na área privada.</p></div><p>Teste o agregado, rendimentos, imóveis, documentos simulados e mensagens. Os dados só existem na memória desta página; recarregar repõe os exemplos. Não introduza informação pessoal.</p><LegalAcceptance/>{error&&<p role="alert">{error}</p>}<button className="primary">Entrar como cliente de teste →</button><p className="fine">A marcação é apenas uma simulação de aceitação para este teste. Não cria um registo legal ou uma conta no Supabase.</p></form>;}
