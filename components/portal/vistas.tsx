'use client';

import type { PropsVista } from './contexto';
import { Agregado, Resumo } from './vistas-cliente';
import { Documentos, Rendimentos } from './vistas-recolha';
import { Mensagens, Pagamento, Progresso } from './vistas-acompanhamento';
import { Alertas, Fila } from './vistas-gabinete';

export const VISTAS: Record<string, (props: PropsVista) => React.ReactNode> = {
  resumo: Resumo,
  agregado: Agregado,
  rendimentos: Rendimentos,
  documentos: Documentos,
  mensagens: Mensagens,
  progresso: Progresso,
  pagamento: Pagamento,
  fila: Fila,
  alertas: Alertas,
};
