export default function ACarregar() {
  return (
    <div className="envolve" style={{ paddingBlock: 'var(--e-6)', display: 'grid', gap: 'var(--e-4)' }} aria-busy="true">
      <span className="esqueleto" style={{ blockSize: '2rem', inlineSize: '14rem' }} />
      <span className="esqueleto" style={{ blockSize: '5rem' }} />
      <span className="esqueleto" style={{ blockSize: '12rem' }} />
      <p role="status" className="so-leitor">
        A carregar o seu processo.
      </p>
    </div>
  );
}
