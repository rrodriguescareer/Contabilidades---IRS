import Link from 'next/link';
import { LEGAL_VERSION } from '@/lib/legal';

export default function PaginaLegal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="principal" className="envolve" style={{ paddingBlock: 'var(--e-6) var(--e-8)', display: 'grid', gap: 'var(--e-5)', maxWidth: '52rem' }}>
      <Link href="/" style={{ justifySelf: 'start' }}>
        <img src="/rr.svg" alt="RR." width={294} height={195} style={{ height: 24, width: 'auto' }} />
      </Link>
      <article className="cartao pilha pilha-4">
        <span className="maiusc" style={{ color: 'var(--acao)' }}>Versão {LEGAL_VERSION}</span>
        <h1>{title}</h1>
        {children}
      </article>
      <nav className="linha" aria-label="Informação legal">
        <Link href="/registar" className="btn btn-secundario btn-sm">Criar conta</Link>
        <Link href="/termos" className="btn btn-discreto btn-sm">Termos e Condições</Link>
        <Link href="/privacidade" className="btn btn-discreto btn-sm">Política de Privacidade</Link>
      </nav>
    </main>
  );
}
