'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { abrirPagamento } from '@/lib/stripe-checkout';
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

      <section className={e.cartao}>
        <h2>Pagar</h2>
        <form id="forma-pagamento" action={abrirPagamento} className="form-membro">
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
                    // Submete o formulário verdadeiro, com a confirmação dada.
                    const forma = document.getElementById('forma-pagamento') as HTMLFormElement | null;
                    const caixa = forma?.querySelector<HTMLInputElement>('input[name="confirmed"]');
                    if (!forma || !caixa) return;
                    caixa.checked = true;
                    forma.requestSubmit();
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
