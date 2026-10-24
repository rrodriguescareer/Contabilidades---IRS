/* Ícones da barra inferior. Traço simples, para ler bem a 22 px. */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const ICONES: Record<string, React.ReactNode> = {
  resumo: (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  ),
  agregado: (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 11.2A3 3 0 0 0 16 5.3" />
      <path d="M18 20c0-2.4-1-4.2-2.6-5.2" />
    </svg>
  ),
  rendimentos: (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M4 19V9m5 10V5m5 14v-7m5 7V8" />
    </svg>
  ),
  documentos: (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  ),
  mensagens: (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.3A7.5 7.5 0 1 1 20 12Z" />
    </svg>
  ),
  progresso: (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  pagamento: (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
    </svg>
  ),
  fila: (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  alertas: (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4-1.5 5.5-1.5 5.5h14s-1.5-1.5-1.5-5.5A5.5 5.5 0 0 0 12 4Z" />
      <path d="M10.3 18.5a2 2 0 0 0 3.4 0" />
    </svg>
  ),
};
