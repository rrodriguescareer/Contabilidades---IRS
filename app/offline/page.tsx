import Link from 'next/link';

export const metadata = { title: 'Sem ligação' };

export default function SemLigacao() {
  return (
    <main id="principal" className="envolve" style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', gap: 'var(--e-4)', textAlign: 'center' }}>
      <img src="/rr.svg" alt="RR." width={294} height={195} style={{ height: 32, width: 'auto', margin: '0 auto' }} />
      <h1>Está sem ligação.</h1>
      <p className="suave" style={{ maxWidth: '40ch' }}>
        O IRS 2026 precisa de internet para mostrar o seu processo. Assim que a ligação voltar, recarregue a
        página.
      </p>
      <Link href="/app" className="btn" style={{ justifySelf: 'center' }}>
        Tentar novamente
      </Link>
    </main>
  );
}
