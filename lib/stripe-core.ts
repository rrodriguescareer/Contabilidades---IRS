import 'server-only';

/* Cliente mínimo da API do Stripe.
 *
 * Sem o SDK, pela mesma razão que o Revolut aqui também não o tem: a API é
 * form-encoded e simples, e uma dependência a menos é uma superfície a menos
 * para manter. A parte chata — aninhar objetos em chaves tipo
 * "line_items[0][price_data][currency]" — está resolvida no achatar().
 */

const BASE = 'https://api.stripe.com/v1';

export function chaveStripe() {
  const chave = process.env.STRIPE_SECRET_KEY || '';
  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(chave)) return null;
  return chave;
}

/** O Stripe não aceita JSON: tudo vai em form-encoded, com chaves aninhadas. */
function achatar(valor: unknown, prefixo = '', saco = new URLSearchParams()): URLSearchParams {
  if (valor === null || valor === undefined) return saco;
  if (Array.isArray(valor)) {
    valor.forEach((item, i) => achatar(item, `${prefixo}[${i}]`, saco));
    return saco;
  }
  if (typeof valor === 'object') {
    for (const [chave, item] of Object.entries(valor as Record<string, unknown>)) {
      achatar(item, prefixo ? `${prefixo}[${chave}]` : chave, saco);
    }
    return saco;
  }
  saco.set(prefixo, String(valor));
  return saco;
}

type Resposta<T> = { ok: true; dados: T } | { ok: false; erro: string };

export async function stripe<T>(
  caminho: string,
  corpo?: Record<string, unknown>,
  opcoes: { metodo?: string; idempotencia?: string } = {},
): Promise<Resposta<T>> {
  const chave = chaveStripe();
  if (!chave) return { ok: false, erro: 'Falta a chave do Stripe.' };

  const cabecalhos: Record<string, string> = {
    Authorization: `Bearer ${chave}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  /* A chave de idempotência é o que impede duas sessões (e dois pagamentos)
     quando o cliente carrega duas vezes ou a rede repete o pedido. */
  if (opcoes.idempotencia) cabecalhos['Idempotency-Key'] = opcoes.idempotencia;

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: opcoes.metodo || (corpo ? 'POST' : 'GET'),
      headers: cabecalhos,
      body: corpo ? achatar(corpo).toString() : undefined,
      cache: 'no-store',
    });
  } catch {
    return { ok: false, erro: 'Não foi possível falar com o Stripe.' };
  }

  const texto = await resposta.text();
  let dados: unknown = {};
  try {
    dados = texto ? JSON.parse(texto) : {};
  } catch {
    return { ok: false, erro: 'O Stripe respondeu num formato inesperado.' };
  }

  if (!resposta.ok) {
    const erro = (dados as { error?: { message?: string } }).error;
    return { ok: false, erro: erro?.message || `O Stripe recusou o pedido (${resposta.status}).` };
  }
  return { ok: true, dados: dados as T };
}

export type Sessao = {
  id: string;
  url: string | null;
  /** Em modo embebido é este que o browser usa para montar o formulário. */
  client_secret: string | null;
  payment_status: string;
  status: string;
  amount_total: number | null;
  currency: string | null;
  client_reference_id: string | null;
};

/** Um endereço só é aceite se for nosso e por HTTPS. */
export const destinoSeguro = (url: string, origem: string) =>
  url.startsWith(`${origem}/`) && url.startsWith('https://');
