/* Os rótulos dos estados, num sítio só — estavam na consola e a vista do
   processo mostrava o valor em cru. */
export const ESTADOS: Record<string, string> = {
  collecting: 'Em recolha',
  submitted_by_client: 'Submetido',
  accepted: 'Aceite',
  validation: 'Em validação',
  approved: 'Aprovado',
  submitting: 'Em submissão',
  filed: 'Submetido na AT',
  monitoring: 'Acompanhamento',
  closed: 'Fechado',
};

export const PAGAMENTOS: Record<string, string> = {
  paid: 'Pago',
  pending: 'A aguardar',
  unknown: 'Por confirmar',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

/** Estes esperam por mim; o resto espera pelo cliente ou pela AT. */
export const MEUS = ['submitted_by_client', 'accepted', 'validation', 'approved', 'submitting'];
