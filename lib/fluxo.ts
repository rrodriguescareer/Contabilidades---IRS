/* O fluxo do processo, num sítio só.
   A base de dados tem doze estados, que servem o trabalho do gabinete. O
   cliente vê cinco etapas, com nomes que dizem o que está a acontecer:
   preparação (do cliente), revisão (do contabilista), entrega à AT,
   liquidação pela AT e conclusão. Cada estado pertence a uma etapa. */

export type Fase = 'preparacao' | 'revisao' | 'entrega' | 'liquidacao' | 'concluido';
/** De quem se espera o próximo movimento. É isto que decide o tom do ecrã. */
export type Espera = 'cliente' | 'gabinete' | 'at' | 'ninguem';

export type Estado = {
  id: string;
  fase: Fase;
  /** O que o cliente lê. */
  titulo: string;
  /** A frase que explica o momento ao cliente. */
  nota: string;
  /** O nome curto que o gabinete vê na consola e nas listas. */
  curto: string;
  espera: Espera;
  /** Fora da linha principal: devolvido e divergência são desvios. */
  desvio?: boolean;
};

export const FASES: { id: Fase; titulo: string; nota: string }[] = [
  { id: 'preparacao', titulo: 'Preparação', nota: 'Dados e documentos do agregado.' },
  { id: 'revisao', titulo: 'Revisão', nota: 'Conferência pelo contabilista certificado.' },
  { id: 'entrega', titulo: 'Entrega à AT', nota: 'Submissão da declaração no Portal das Finanças.' },
  { id: 'liquidacao', titulo: 'Liquidação', nota: 'Validação e liquidação pela Autoridade Tributária.' },
  { id: 'concluido', titulo: 'Concluído', nota: 'Reembolso ou pagamento do imposto e fecho do processo.' },
];

export const ESTADOS: Estado[] = [
  {
    id: 'collecting', fase: 'preparacao', espera: 'cliente',
    titulo: 'Em preparação', curto: 'Em preparação',
    nota: 'Reúna os dados e os documentos do agregado. Quando estiver tudo, submeta o processo.',
  },
  {
    id: 'returned', fase: 'preparacao', espera: 'cliente', desvio: true,
    titulo: 'Devolvido para correção', curto: 'Devolvido',
    nota: 'Foram pedidos elementos adicionais. Consulte a nota no acompanhamento, complete o processo e volte a submeter.',
  },
  {
    id: 'submitted_by_client', fase: 'revisao', espera: 'gabinete',
    titulo: 'Recebido', curto: 'Submetido',
    nota: 'O processo foi recebido e aguarda o início da revisão.',
  },
  {
    id: 'accepted', fase: 'revisao', espera: 'gabinete',
    titulo: 'Em revisão', curto: 'Aceite',
    nota: 'O processo foi aceite e os elementos vão ser conferidos.',
  },
  {
    id: 'validation', fase: 'revisao', espera: 'gabinete',
    titulo: 'Em validação', curto: 'Em validação',
    nota: 'Os rendimentos e os documentos estão a ser conferidos com a informação da AT.',
  },
  {
    id: 'approved', fase: 'revisao', espera: 'gabinete',
    titulo: 'Revisão concluída', curto: 'Aprovado',
    nota: 'A revisão está concluída. A declaração segue para entrega.',
  },
  {
    id: 'submitting', fase: 'entrega', espera: 'gabinete',
    titulo: 'Em entrega', curto: 'Em submissão',
    nota: 'A declaração está a ser submetida no Portal das Finanças.',
  },
  {
    id: 'filed', fase: 'entrega', espera: 'at',
    titulo: 'Entregue na AT', curto: 'Entregue',
    nota: 'A declaração foi entregue na Autoridade Tributária.',
  },
  {
    id: 'monitoring', fase: 'liquidacao', espera: 'at',
    titulo: 'A aguardar liquidação', curto: 'Acompanhamento',
    nota: 'Aguarda-se a validação e a liquidação pela Autoridade Tributária.',
  },
  {
    id: 'divergence', fase: 'liquidacao', espera: 'gabinete', desvio: true,
    titulo: 'Divergência em análise', curto: 'Divergência',
    nota: 'A Autoridade Tributária identificou uma divergência. O assunto está a ser tratado.',
  },
  {
    id: 'assessed', fase: 'liquidacao', espera: 'at',
    titulo: 'Liquidação emitida', curto: 'Liquidada',
    nota: 'A liquidação foi emitida e o valor apurado está confirmado.',
  },
  {
    id: 'closed', fase: 'concluido', espera: 'ninguem',
    titulo: 'Concluído', curto: 'Fechado',
    nota: 'O processo está concluído.',
  },
];

const porId = new Map(ESTADOS.map((e) => [e.id, e]));
export const estadoDe = (id: string | null | undefined): Estado | null =>
  (id && porId.get(id)) || null;

/** Os títulos com que o avancar_processo grava os eventos. É por eles que o
    percurso reconhece um desvio no registo. */
export const TITULOS_DE_EVENTO: Record<string, string> = {
  submitted_by_client: 'Processo submetido',
  accepted: 'Processo aceite',
  validation: 'Em validação',
  approved: 'Aprovado',
  submitting: 'Em processo de submissão',
  filed: 'Submetido na Autoridade Tributária',
  monitoring: 'Em acompanhamento',
  divergence: 'Em divergência',
  assessed: 'Liquidação emitida',
  closed: 'Processo fechado',
  returned: 'Devolvido para completar',
  collecting: 'Recolha reaberta',
};

/** Um evento é um desvio quando o seu título é o de um estado de desvio. */
const DESVIOS = new Set(
  ESTADOS.filter((e) => e.desvio).map((e) => TITULOS_DE_EVENTO[e.id]),
);
export const eDesvio = (titulo: string) => DESVIOS.has(titulo);

/** Os rótulos curtos, para quem só precisa do nome. */
export const ROTULOS: Record<string, string> = Object.fromEntries(
  ESTADOS.map((e) => [e.id, e.curto]),
);

/** A linha principal, sem os desvios: é a espinha do percurso. */
export const LINHA = ESTADOS.filter((e) => !e.desvio);

/** Quantos passos da linha principal já ficaram para trás. */
export function posicao(estado: string | null | undefined) {
  const e = estadoDe(estado);
  if (!e) return { indice: 0, fase: 'preparacao' as Fase, total: LINHA.length, etapa: 0, etapas: FASES.length };
  // Um desvio conta como estando no primeiro passo da sua fase.
  const alvo = e.desvio ? LINHA.find((x) => x.fase === e.fase) : e;
  return {
    indice: LINHA.findIndex((x) => x.id === alvo?.id),
    fase: e.fase,
    total: LINHA.length,
    /** A etapa (de cinco) que o cliente vê. */
    etapa: FASES.findIndex((f) => f.id === e.fase),
    etapas: FASES.length,
  };
}

/** O selo do estado, para o cliente: de quem depende o passo seguinte. */
export const QUEM: Record<Espera, string> = {
  cliente: 'Aguarda a sua ação',
  gabinete: 'Em análise pelo contabilista',
  at: 'Na Autoridade Tributária',
  ninguem: 'Concluído',
};

/** O mesmo selo, visto do gabinete. */
export const QUEM_GABINETE: Record<Espera, string> = {
  cliente: 'Aguarda o cliente',
  gabinete: 'Aguarda a sua ação',
  at: 'Na Autoridade Tributária',
  ninguem: 'Concluído',
};

/* ------------------------------------------------- o que eu posso fazer */

export type Passo = { destino: string; rotulo: string; tom: 'avancar' | 'desvio' | 'recuo' };

/** Espelha o transicoes_do_estado da base de dados. Quem decide é ela; isto é
    só a forma de o pedir, com as palavras certas e o tom certo no botão. */
export const PASSOS: Record<string, Passo[]> = {
  collecting: [
    { destino: 'submitted_by_client', rotulo: 'Marcar como submetido', tom: 'avancar' },
  ],
  returned: [
    { destino: 'accepted', rotulo: 'Aceitar assim mesmo', tom: 'avancar' },
    { destino: 'submitted_by_client', rotulo: 'Marcar como submetido', tom: 'desvio' },
  ],
  submitted_by_client: [
    { destino: 'accepted', rotulo: 'Aceitar processo', tom: 'avancar' },
    { destino: 'returned', rotulo: 'Devolver ao cliente', tom: 'desvio' },
  ],
  accepted: [
    { destino: 'validation', rotulo: 'Começar validação', tom: 'avancar' },
    { destino: 'returned', rotulo: 'Devolver ao cliente', tom: 'desvio' },
  ],
  validation: [
    { destino: 'approved', rotulo: 'Aprovar', tom: 'avancar' },
    { destino: 'returned', rotulo: 'Devolver ao cliente', tom: 'desvio' },
  ],
  approved: [
    { destino: 'submitting', rotulo: 'Iniciar submissão', tom: 'avancar' },
    { destino: 'validation', rotulo: 'Voltar à validação', tom: 'recuo' },
  ],
  submitting: [
    { destino: 'filed', rotulo: 'Registar entrega', tom: 'avancar' },
    { destino: 'approved', rotulo: 'Voltar a aprovado', tom: 'recuo' },
  ],
  filed: [
    { destino: 'monitoring', rotulo: 'Pôr em acompanhamento', tom: 'avancar' },
  ],
  monitoring: [
    { destino: 'assessed', rotulo: 'Registar liquidação', tom: 'avancar' },
    { destino: 'divergence', rotulo: 'Abrir divergência', tom: 'desvio' },
    { destino: 'closed', rotulo: 'Fechar processo', tom: 'avancar' },
    { destino: 'filed', rotulo: 'Voltar a entregue', tom: 'recuo' },
  ],
  divergence: [
    { destino: 'assessed', rotulo: 'Divergência resolvida', tom: 'avancar' },
    { destino: 'monitoring', rotulo: 'Voltar a acompanhamento', tom: 'recuo' },
  ],
  assessed: [
    { destino: 'closed', rotulo: 'Fechar processo', tom: 'avancar' },
    { destino: 'divergence', rotulo: 'Abrir divergência', tom: 'desvio' },
  ],
  closed: [
    { destino: 'assessed', rotulo: 'Reabrir na liquidação', tom: 'recuo' },
    { destino: 'monitoring', rotulo: 'Reabrir acompanhamento', tom: 'recuo' },
  ],
};

/** Os estados que esperam por mim. A fila usa isto para o filtro "meus". */
export const MEUS = ESTADOS.filter((e) => e.espera === 'gabinete').map((e) => e.id);

export type Prontidao = {
  chave: string;
  rotulo: string;
  estado: 'ok' | 'falta' | 'atencao';
  detalhe: string;
  de: 'cliente' | 'gabinete';
  bloqueia: boolean;
};

/** Os dois estados em que o cliente pode mexer no processo. É o mesmo que o
    can_edit_case da base de dados permite: recolha e devolvido. */
export const emRecolha = (estado: string | null | undefined) =>
  estado === 'collecting' || estado === 'returned';

/* ------------------------------------------------------------ o roteiro */

/* O que o cliente vê: sete marcos, do agregado ao reembolso. Os três
 * primeiros são da parte dele e avançam com o que já preencheu (a prontidão);
 * os outros quatro seguem o estado do processo no gabinete e na AT. */

export type Marco = { id: string; titulo: string; descricao: string; quem: Espera };

export const ROTEIRO: Marco[] = [
  { id: 'agregado', titulo: 'O agregado', quem: 'cliente',
    descricao: 'Quem entra na declaração, com a data de nascimento, o NIF e a senha do Portal das Finanças.' },
  { id: 'rendimentos', titulo: 'Rendimentos e documentos', quem: 'cliente',
    descricao: 'Cada tipo de rendimento do ano, com os documentos que o comprovam, e as deduções.' },
  { id: 'submissao', titulo: 'Submissão', quem: 'cliente',
    descricao: 'Revê o resumo e o preço e envia o processo ao contabilista. O pagamento pode ser feito já ou depois.' },
  { id: 'revisao', titulo: 'Revisão do contabilista', quem: 'gabinete',
    descricao: 'O contabilista confere tudo com a informação da Autoridade Tributária e escolhe a opção mais favorável.' },
  { id: 'entrega', titulo: 'Entrega nas Finanças', quem: 'gabinete',
    descricao: 'A declaração é submetida no Portal das Finanças, em seu nome.' },
  { id: 'liquidacao', titulo: 'Liquidação da AT', quem: 'at',
    descricao: 'A Autoridade Tributária valida a declaração e emite a liquidação com o valor final.' },
  { id: 'fecho', titulo: 'Reembolso ou pagamento', quem: 'ninguem',
    descricao: 'O reembolso chega à conta indicada nas Finanças, ou paga-se o imposto apurado. O processo fica concluído.' },
];

/** O marco em que cada estado do gabinete está. Entregue na AT já é
    esperar pela liquidação. */
const MARCO_DO_ESTADO: Record<string, number> = {
  submitted_by_client: 3, accepted: 3, validation: 3,
  approved: 4, submitting: 4,
  filed: 5, monitoring: 5, divergence: 5, assessed: 5,
  closed: 6,
};

/** O evento do histórico que fecha cada marco: é dele que vem a data. */
const EVENTO_QUE_FECHA: Record<string, string[]> = {
  submissao: [TITULOS_DE_EVENTO.submitted_by_client, 'Pagamento recebido'],
  revisao: [TITULOS_DE_EVENTO.approved, TITULOS_DE_EVENTO.submitting],
  entrega: [TITULOS_DE_EVENTO.filed],
  liquidacao: [TITULOS_DE_EVENTO.assessed],
  fecho: [TITULOS_DE_EVENTO.closed, 'Desistência aceite'],
};

export type PassoDoRoteiro = Marco & {
  situacao: 'feito' | 'atual' | 'por-vir';
  /** Devolvido para correção ou divergência na AT. */
  desvio: boolean;
  /** Quando ficou feito, se o histórico o disser. */
  em: string | null;
};

export function roteiro(
  estado: string | null | undefined,
  prontidao: Prontidao[] = [],
  eventos: { titulo: string; em: string }[] = [],
): { passos: PassoDoRoteiro[]; atual: number } {
  const ok = (chave: string) => prontidao.find((p) => p.chave === chave)?.estado === 'ok';
  const fechado = estado === 'closed';
  let atual: number;
  if (!estado || emRecolha(estado)) {
    // Na recolha, o marco atual é o primeiro que ainda tem coisas em falta.
    atual = !(ok('titular') && ok('senha')) ? 0 : !(ok('rendimentos') && ok('documentos')) ? 1 : 2;
  } else {
    atual = MARCO_DO_ESTADO[estado] ?? 3;
  }
  const desvio = estado === 'returned' || estado === 'divergence';
  const passos = ROTEIRO.map((m, i): PassoDoRoteiro => {
    const titulos = EVENTO_QUE_FECHA[m.id] ?? [];
    const evento = eventos.filter((e) => titulos.includes(e.titulo)).sort((a, b) => (a.em < b.em ? 1 : -1))[0];
    const situacao = fechado || i < atual ? 'feito' : i === atual ? 'atual' : 'por-vir';
    return { ...m, situacao, desvio: i === atual && desvio && !fechado, em: situacao === 'feito' ? evento?.em ?? null : null };
  });
  return { passos, atual: fechado ? ROTEIRO.length - 1 : atual };
}
