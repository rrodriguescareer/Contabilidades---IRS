'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { beginCheckout } from '@/lib/checkout-actions';
import { orcamento } from '@/lib/acoes-espaco';
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
  dados, conta, processo,
}: { dados: Dados; conta: string; processo: string }) {
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

      <section className={e.cartao}>
        <h2>Pagar</h2>
        <form action={beginCheckout} className="form-membro">
          <input type="hidden" name="account" value={conta} />
          <input type="hidden" name="process" value={processo} />
          <input type="hidden" name="coupon" value={cupao} />
          <input type="hidden" name="expected_total" value={total} />

          <label className="interruptor">
            <input type="checkbox" name="confirmed" required />
            Confirmo os dados e os documentos, aceito o valor de {euros(total)} e aceito os
            Termos e Condições e a Política de Privacidade.
          </label>

          <button type="submit" className="btn" disabled={!conta_ || aCalcular}>
            Pagar {euros(total)}
          </button>
        </form>
      </section>
    </>
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
