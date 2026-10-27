'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { abrirPagamento, desistirDoPagamento, type Abertura } from '@/lib/stripe-checkout';
import { PagarEmbebido } from '@/components/pagar-embebido';
import { orcamento } from '@/lib/acoes-espaco';
import { emitirFaturaDoMeuProcesso } from '@/lib/acoes-cegid';
import type { Dados } from './espaco';
import e from './espaco.module.css';

type Orcamento = {
  total_cents: number;
  subtotal_cents?: number;
  discount_cents?: number;
  discount_code?: string | null;
  /* O nome do campo é o que o quote_irs_checkout devolve: items. */
  items?: { code: string; label: string; amount_cents: number }[];
} & Record<string, unknown>;

const euros = (c: number) =>
  (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

export function Pagamento({
  dados, conta, processo, teste,
}: { dados: Dados; conta: string; processo: string; teste: boolean }) {
  const checkout = (dados.checkout as {
    estado: string; total: number; desconto: number | null;
    detalhe: Orcamento | null; pago_em: string | null;
  } | null) || null;

  const pago = checkout?.estado === 'paid';
  const [cupao, setCupao] = useState('');
  const [conta_, setOrc] = useState<Orcamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aCalcular, calcular] = useTransition();

  const recalcular = useCallback(
    (codigo: string) =>
      calcular(async () => {
        setErro(null);
        const { dados: o, erro: falha } = await orcamento(processo, codigo);
        if (falha || !o) {
          setErro(falha || 'Não foi possível calcular.');
          setOrc(null);
          return;
        }
        setOrc(o as Orcamento);
      }),
    [processo],
  );

  useEffect(() => {
    if (!pago) recalcular('');
  }, [pago, recalcular]);

  if (pago) {
    return (
      <section className={e.cartao}>
        <h2>Pagamento concluído</h2>
        <p className="aviso-positivo">
          Recebido {checkout?.total != null ? euros(checkout.total) : ''}
          {checkout?.pago_em
            ? ` em ${new Date(checkout.pago_em).toLocaleString('pt-PT')}`
            : ''}
          .
        </p>
        <p className="suave">
          A fatura-recibo é emitida e enviada por email nos próximos minutos.
        </p>
        <Descriminacao orcamento={(checkout?.detalhe as Orcamento) || null} />
        {teste && <Ensaio processo={processo} />}
      </section>
    );
  }

  const total = conta_?.total_cents ?? 0;

  return (
    <>
      <section className={e.cartao}>
        <h2>O seu preço</h2>
        <p className="suave">
          Calculado a partir dos titulares e dos tipos de rendimento que indicou.
        </p>
        {aCalcular && <p className="suave">A calcular…</p>}
        {erro && <p className="aviso-critico">{erro}</p>}
        <Descriminacao orcamento={conta_} />
      </section>

      <section className={e.cartao}>
        <h2>Código de desconto</h2>
        <div className="acoes-membro">
          <input value={cupao} onChange={(ev) => setCupao(ev.target.value)}
                 maxLength={40} placeholder="Se tiver um" aria-label="Código de desconto" />
          <button type="button" className="btn btn-secundario"
                  onClick={() => recalcular(cupao)} disabled={aCalcular}>
            Aplicar
          </button>
        </div>
      </section>

      <Pagar conta={conta} processo={processo} cupao={cupao} total={total}
             pronto={Boolean(conta_) && !aCalcular} aberto={checkout?.estado === 'pending'} />

      {teste && <Ensaio processo={processo} total={total} />}
    </>
  );
}

/* Enquanto a plataforma não está aberta ao público, ela própria serve de
   ensaio. O botão do pagamento submete o formulário real — testar um atalho
   que não é o caminho verdadeiro não prova nada. */
function Ensaio({ processo, total }: { processo: string; total?: number }) {
  const [estado, setEstado] = useState<{ ok?: boolean; texto?: string }>({});
  const [aCorrer, comecar] = useTransition();

  return (
    <section className={e.cartao} style={{ borderStyle: 'dashed' }}>
      <h2>Ensaio das integrações</h2>
      <p className="suave">
        Só aparece enquanto a plataforma não está divulgada. A fatura fica em
        preparação no Cegid; o pagamento abre o gateway a sério.
      </p>

      <div className="acoes-membro">
        <button type="button" className="btn btn-secundario" disabled={aCorrer}
                onClick={() =>
                  comecar(async () => {
                    const r = await emitirFaturaDoMeuProcesso(processo);
                    setEstado({ ok: r.ok, texto: r.ok ? r.aviso : r.erro });
                  })}>
          {aCorrer ? 'A falar com o Cegid…' : 'Emitir fatura-recibo'}
        </button>

        {total != null && (
          <button type="button" className="btn btn-secundario"
                  onClick={() => {
                    // Carrega no botão verdadeiro, com a confirmação dada.
                    const caixa = document.querySelector<HTMLInputElement>('#confirmo-pagamento');
                    const botao = document.querySelector<HTMLButtonElement>('#botao-pagar');
                    if (!caixa || !botao) return;
                    if (!caixa.checked) caixa.click();
                    window.setTimeout(() => botao.click(), 80);
                  }}>
            Abrir gateway de pagamento
          </button>
        )}
      </div>

      {estado.texto && (
        <p className={estado.ok ? 'aviso-positivo' : 'aviso-critico'}>{estado.texto}</p>
      )}
    </section>
  );
}

/* O momento do pagamento. O formulário do Stripe monta-se aqui mesmo, dentro
   do separador; sem chave publicável abre-se a página do Stripe. Os erros
   ficam à vista neste cartão — antes perdiam-se num redirecionamento. */
function Pagar({
  conta, processo, cupao, total, pronto, aberto,
}: {
  conta: string; processo: string; cupao: string; total: number; pronto: boolean; aberto: boolean;
}) {
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [embebido, setEmbebido] = useState<Extract<Abertura, { modo: 'embebido' }> | null>(null);
  const [aAbrir, abrir] = useTransition();

  const pagar = () =>
    abrir(async () => {
      setErro(null);
      const r = await abrirPagamento(conta, processo, cupao, total);
      if (!r.ok) { setErro(r.erro); return; }
      if (r.modo === 'pago') { window.location.reload(); return; }
      if (r.modo === 'alojado') { window.location.assign(r.url); return; }
      setEmbebido(r);
    });

  const desistir = () =>
    abrir(async () => {
      if (embebido) await desistirDoPagamento(embebido.tentativa);
      setEmbebido(null);
      window.location.reload();
    });

  if (embebido) {
    return (
      <section className={`${e.cartao} cartao-checkout`}>
        <div className="linha-entre">
          <h2>Pagamento seguro</h2>
          <button type="button" className="btn-texto" onClick={desistir} disabled={aAbrir}>
            Cancelar e voltar
          </button>
        </div>
        <p className="suave">
          Cartão, MB WAY, Multibanco, PayPal, Revolut Pay ou Klarna. Os dados de pagamento são
          tratados pelo Stripe e nunca passam pela plataforma.
        </p>
        <PagarEmbebido chave={embebido.chave} segredo={embebido.segredo} />
      </section>
    );
  }

  return (
    <section className={e.cartao}>
      <h2>Pagar</h2>
      {aberto && (
        <p className="aviso-atencao">
          Tem um pagamento iniciado. Pode continuá-lo — não é criado um segundo.
        </p>
      )}
      <label className="interruptor">
        <input id="confirmo-pagamento" type="checkbox" checked={confirmado}
               onChange={(ev) => setConfirmado(ev.target.checked)} />
        Confirmo os dados e os documentos, aceito o valor de {euros(total)} e aceito os
        Termos e Condições e a Política de Privacidade.
      </label>
      {erro && <p className="aviso-critico">{erro}</p>}
      <div className="acoes-membro">
        <button id="botao-pagar" type="button" className="btn"
                disabled={!pronto || !confirmado || aAbrir} onClick={pagar}>
          {aAbrir ? 'A abrir o pagamento…' : aberto ? 'Continuar o pagamento' : `Pagar ${euros(total)}`}
        </button>
      </div>
    </section>
  );
}

function Descriminacao({ orcamento }: { orcamento: Orcamento | null }) {
  if (!orcamento) return null;
  const linhas = orcamento.items || [];
  return (
    <table className="tabela-preco">
      <tbody>
        {linhas.map((l, i) => (
          <tr key={l.code || i}>
            <td>{l.label}</td>
            <td>{euros(l.amount_cents)}</td>
          </tr>
        ))}
        {orcamento.discount_cents ? (
          <tr className="desconto">
            <td>Desconto{orcamento.discount_code ? ` (${orcamento.discount_code})` : ''}</td>
            <td>−{euros(orcamento.discount_cents)}</td>
          </tr>
        ) : null}
        <tr className="total">
          <td>Total</td>
          <td>{euros(orcamento.total_cents)}</td>
        </tr>
      </tbody>
    </table>
  );
}
