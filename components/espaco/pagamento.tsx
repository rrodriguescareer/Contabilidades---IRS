'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { abrirPagamento, desistirDoPagamento, type Abertura } from '@/lib/stripe-checkout';
import { PagarEmbebido } from '@/components/pagar-embebido';
import { orcamento, submeterProcesso } from '@/lib/acoes-espaco';
import { emitirFaturaDoMeuProcesso } from '@/lib/acoes-cegid';
import { emRecolha, type Prontidao } from '@/lib/fluxo';
import type { Dados, Vista } from './espaco';
import e from './espaco.module.css';

type Orcamento = {
  total_cents: number;
  subtotal_cents?: number;
  discount_cents?: number;
  discount_code?: string | null;
  campanha?: string | null;
  /* O nome do campo é o que o quote_irs_checkout devolve: items. */
  items?: { code: string; label: string; amount_cents: number }[];
} & Record<string, unknown>;

type Checkout = {
  id: string; estado: string; total: number; desconto: number | null;
  detalhe: Orcamento | null; pago_em: string | null;
} | null;

const euros = (c: number) => (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const METODOS = ['Cartão', 'MB WAY', 'Multibanco', 'Apple Pay', 'Google Pay', 'PayPal', 'Revolut Pay', 'Klarna'];

const INCLUIDO = [
  'Revisão de cada rendimento e documento por contabilista certificado',
  'Confronto com a informação que a AT já tem',
  'Submissão da declaração e acompanhamento até ao fecho',
  'Fatura-recibo em seu nome, enviada por email',
];

/* O momento do pagamento. Com o processo em recolha, pagar é também submeter:
   é por isso que o botão só acende quando o processo está pronto, e que a
   lista do que falta aparece no lugar do botão. Também se pode submeter já e
   pagar depois; o pagamento fica disponível em qualquer fase até ao fecho. O
   formulário do Stripe monta-se na mesma caixa — o cliente nunca sai da
   plataforma. */
export function Pagamento({
  dados, conta, processo, teste, ir, aoMudar,
}: {
  dados: Dados; conta: string; processo: string; teste: boolean;
  ir: (v: Vista) => void; aoMudar: () => void;
}) {
  const checkout = (dados.checkout as Checkout) || null;
  const proc = (dados.processo as { estado: string } | null) || null;
  const recolha = emRecolha(proc?.estado);
  // Depois de submetido, a prontidão já foi verificada: não volta a travar.
  const faltas = recolha
    ? ((dados.prontidao as Prontidao[]) || []).filter((p) => p.bloqueia && p.estado === 'falta')
    : [];
  const pago = checkout?.estado === 'paid';

  const [cupao, setCupao] = useState('');
  const [preco, setPreco] = useState<Orcamento | null>(null);
  const [erroPreco, setErroPreco] = useState<string | null>(null);
  const [avisoCupao, setAvisoCupao] = useState<string | null>(null);
  const [aCalcular, calcular] = useTransition();

  const recalcular = useCallback(
    (codigo: string) =>
      calcular(async () => {
        setErroPreco(null);
        setAvisoCupao(null);
        const { dados: o, erro } = await orcamento(processo, codigo);
        if (erro || !o) {
          setErroPreco(codigo ? 'Este código não pôde ser aplicado.' : 'Não foi possível calcular o preço. Confirme os rendimentos.');
          return;
        }
        const novo = o as Orcamento;
        // Um código que não existe não dá erro na base: simplesmente não desconta.
        if (codigo && (novo.discount_code || '').toUpperCase() !== codigo.trim().toUpperCase()) {
          setAvisoCupao('Este código não é válido ou já não está ativo.');
        }
        setPreco(novo);
      }),
    [processo],
  );

  useEffect(() => {
    if (!pago && faltas.length === 0) recalcular('');
  }, [pago, faltas.length, recalcular]);

  if (pago && checkout) {
    return <Recibo checkout={checkout} estado={proc?.estado || ''} processo={processo}
                   ir={ir} aoMudar={aoMudar} teste={teste} />;
  }

  const total = preco?.total_cents ?? 0;
  const passos = recolha
    ? [
        { titulo: 'Rever o processo e o preço', estado: faltas.length > 0 ? 'atual' : 'feito' },
        { titulo: 'Pagar', estado: faltas.length > 0 ? 'por-vir' : 'atual' },
        { titulo: 'Processo submetido', estado: 'por-vir' },
      ]
    : [
        { titulo: 'Processo submetido', estado: 'feito' },
        { titulo: 'Pagar', estado: 'atual' },
        { titulo: 'Fatura-recibo por email', estado: 'por-vir' },
      ];

  return (
    <div className={e.pagamento}>
      <ol className={e.passosPagamento}>
        {passos.map((p, i) => (
          <li key={p.titulo} data-estado={p.estado}><span>{i + 1}</span>{p.titulo}</li>
        ))}
      </ol>

      <div className={e.colunasPagamento}>
        <section className={`${e.cartao} ${e.resumoPreco}`}>
          <div>
            <h3 className={e.tituloCartao}>Preparação do IRS 2026</h3>
            <p className="suave">Calculado a partir do agregado e dos tipos de rendimento que declarou.</p>
          </div>

          {faltas.length > 0 ? (
            <p className={e.precoEspera}>O preço aparece quando o processo estiver completo.</p>
          ) : !preco ? (
            <p className={e.precoEspera}>{aCalcular ? 'A calcular…' : erroPreco || 'A calcular…'}</p>
          ) : (
            <>
              <table className={e.linhasPreco}>
                <tbody>
                  {(preco.items || []).map((l, i) => (
                    <tr key={l.code || i}>
                      <td>{l.label.replace(/\s*\(IVA incluído\)\s*/i, '')}</td>
                      <td>{euros(l.amount_cents)}</td>
                    </tr>
                  ))}
                  {preco.discount_cents ? (
                    <tr className={e.linhaDesconto}>
                      <td>Desconto{preco.discount_code ? ` · ${preco.discount_code}` : ''}</td>
                      <td>−{euros(preco.discount_cents)}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              <Cupao valor={cupao} mudar={setCupao} aplicar={() => recalcular(cupao)}
                     aCalcular={aCalcular} aviso={avisoCupao} aplicado={preco.discount_code || null} />

              <div className={e.totalPreco}>
                <span>Total</span>
                <strong>{euros(total)}</strong>
              </div>
              <p className={e.ivaNota}>IVA incluído à taxa em vigor.</p>
              {erroPreco && <p className="aviso-critico">{erroPreco}</p>}
            </>
          )}

          <ul className={e.incluido}>
            {INCLUIDO.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </section>

        <CaixaPagar conta={conta} processo={processo} cupao={cupao} total={total}
                    pronto={Boolean(preco) && !aCalcular} faltas={faltas} recolha={recolha}
                    aberto={checkout?.estado === 'pending' ? checkout.id : null} ir={ir} aoMudar={aoMudar} />
      </div>

      {teste && <Ensaio processo={processo} />}
    </div>
  );
}

function Cupao({ valor, mudar, aplicar, aCalcular, aviso, aplicado }: {
  valor: string; mudar: (v: string) => void; aplicar: () => void;
  aCalcular: boolean; aviso: string | null; aplicado: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  if (!aberto && !aplicado) {
    return (
      <button type="button" className={e.ligacaoCupao} onClick={() => setAberto(true)}>
        Tem um código de desconto?
      </button>
    );
  }
  return (
    <form className={e.cupao} onSubmit={(ev) => { ev.preventDefault(); aplicar(); }}>
      <input className="entrada" value={valor} onChange={(ev) => mudar(ev.target.value.toUpperCase())}
             maxLength={40} placeholder="Código de desconto" aria-label="Código de desconto" autoFocus={!aplicado} />
      <button type="submit" className="btn btn-secundario" disabled={aCalcular || !valor.trim()}>
        {aCalcular ? 'A aplicar…' : 'Aplicar'}
      </button>
      {aviso && <p className={e.cupaoAviso}>{aviso}</p>}
    </form>
  );
}

function CaixaPagar({ conta, processo, cupao, total, pronto, faltas, recolha, aberto, ir, aoMudar }: {
  conta: string; processo: string; cupao: string; total: number; pronto: boolean;
  faltas: Prontidao[]; recolha: boolean; aberto: string | null; ir: (v: Vista) => void; aoMudar: () => void;
}) {
  const [confirmado, setConfirmado] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [embebido, setEmbebido] = useState<Extract<Abertura, { modo: 'embebido' }> | null>(null);
  const [aAbrir, abrir] = useTransition();
  const [aSubmeter, submeter] = useTransition();
  const consentimentos = { dados: confirmado, termos: aceite };

  const pagar = () =>
    abrir(async () => {
      setErro(null);
      const r = await abrirPagamento(conta, processo, cupao, total, consentimentos);
      if (!r.ok) { setErro(r.erro); return; }
      if (r.modo === 'pago') { window.location.reload(); return; }
      if (r.modo === 'alojado') { window.location.assign(r.url); return; }
      setEmbebido(r);
    });

  // Submeter já e pagar depois: o processo entra na fila; o pagamento fica aqui.
  const submeterSemPagar = () =>
    submeter(async () => {
      setErro(null);
      const r = await submeterProcesso(processo, consentimentos);
      if (!r.ok) { setErro(r.faltas?.length ? `Falta: ${r.faltas.join(', ')}.` : r.erro || 'Não foi possível submeter.'); return; }
      aoMudar();
    });

  const desistir = (tentativa: string) =>
    abrir(async () => {
      await desistirDoPagamento(tentativa);
      setEmbebido(null);
      window.location.reload();
    });

  if (embebido) {
    return (
      <section className={`${e.cartao} ${e.caixaPagar}`}>
        <div className="linha-entre">
          <h3 className={e.tituloCartao}>Pagamento seguro</h3>
          <button type="button" className="btn-texto" disabled={aAbrir} onClick={() => desistir(embebido.tentativa)}>
            Cancelar
          </button>
        </div>
        <div className={e.checkout}>
          <PagarEmbebido chave={embebido.chave} segredo={embebido.segredo} />
        </div>
        <p className={e.seguro}>Os dados de pagamento são tratados pelo Stripe e nunca passam pela plataforma.</p>
      </section>
    );
  }

  if (faltas.length > 0) {
    return (
      <section className={`${e.cartao} ${e.caixaPagar}`}>
        <h3 className={e.tituloCartao}>Antes de submeter</h3>
        <p className="suave">Para submeter o processo (e pagar), falta completar:</p>
        <ul className={`prontidao ${e.listaFalta}`}>
          {faltas.map((f) => (
            <li key={f.chave} data-estado="falta">
              <span className="marca-pronto" aria-hidden="true" />
              <div><strong>{f.rotulo}</strong><span>{f.detalhe}</span></div>
              <button type="button" className={e.botaoLinha}
                      onClick={() => ir(f.chave === 'rendimentos' ? 'rendimentos' : 'agregado')}>
                Resolver
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className={`${e.cartao} ${e.caixaPagar}`}>
      <h3 className={e.tituloCartao}>{recolha ? 'Pagar e submeter' : 'Pagar'}</h3>
      {aberto ? (
        <p className="aviso-atencao">
          Tem um pagamento por concluir. Continue-o — não é criado um segundo — ou cancele-o para alterar dados.
        </p>
      ) : recolha ? (
        <p className="suave">Ao pagar, o processo entra na minha fila e a recolha fecha. A declaração só é entregue na AT depois de eu a rever.</p>
      ) : (
        <p className="suave">O processo já está na minha fila. Pode pagar agora: a fatura-recibo segue para o seu email.</p>
      )}

      <ul className={e.metodos} aria-label="Métodos de pagamento aceites">
        {METODOS.map((m) => <li key={m}>{m}</li>)}
      </ul>

      <label className={e.consentimento}>
        <input type="checkbox" checked={confirmado} onChange={(ev) => setConfirmado(ev.target.checked)} />
        <span>Confirmo os dados e documentos e aceito o valor de <strong>{euros(total)}</strong>.</span>
      </label>
      <label className={e.consentimento}>
        <input type="checkbox" checked={aceite} onChange={(ev) => setAceite(ev.target.checked)} />
        <span>
          Aceito os <a href="/termos" target="_blank" rel="noopener">Termos e Condições</a>, bem como a{' '}
          <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>. Concordo que a
          prestação de serviço seja iniciada num prazo inferior a 14 dias após o pagamento.
        </span>
      </label>

      {erro && <p className="aviso-critico">{erro}</p>}

      <button id="botao-pagar" type="button" className={`btn ${e.botaoPagar}`}
              disabled={!pronto || !confirmado || !aceite || aAbrir || aSubmeter} onClick={pagar}>
        {aAbrir ? 'A abrir o pagamento…' : aberto ? 'Continuar o pagamento'
          : recolha ? `Pagar ${euros(total)} e submeter` : `Pagar ${euros(total)}`}
      </button>
      {aberto && (
        <button type="button" className="btn-texto" disabled={aAbrir} onClick={() => desistir(aberto)}>
          Cancelar o pagamento iniciado
        </button>
      )}
      {recolha && !aberto && (
        <p className={e.pagarDepois}>
          Prefere pagar mais tarde?{' '}
          <button type="button" className="btn-texto" disabled={!pronto || !confirmado || !aceite || aSubmeter || aAbrir}
                  onClick={submeterSemPagar}>
            {aSubmeter ? 'A submeter…' : 'Submeter agora e pagar depois'}
          </button>
        </p>
      )}
      <p className={e.seguro}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        Pagamento seguro pelo Stripe. Os dados do cartão nunca passam pela plataforma.
      </p>
    </section>
  );
}

/* Depois de pago: um recibo, não um formulário. */
const ENTREGUE = ['filed', 'monitoring', 'divergence', 'assessed', 'closed'];

function Recibo({ checkout, estado, processo, ir, aoMudar, teste }: {
  checkout: NonNullable<Checkout>; estado: string; processo: string;
  ir: (v: Vista) => void; aoMudar: () => void; teste: boolean;
}) {
  const devolvido = estado === 'returned';
  const [erro, setErro] = useState<string | null>(null);
  const [aSubmeter, submeter] = useTransition();
  const detalhe = checkout.detalhe;

  return (
    <div className={e.pagamento}>
      <section className={`${e.cartao} ${e.recibo}`}>
        <span className={e.reciboVisto} aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
               strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <h2>Pagamento recebido</h2>
        <p className={e.reciboValor}>{euros(checkout.total)}</p>
        {checkout.pago_em && <p className="suave">{dataHora(checkout.pago_em)}</p>}

        <table className={e.linhasPreco}>
          <tbody>
            {(detalhe?.items || []).map((l, i) => (
              <tr key={l.code || i}><td>{l.label.replace(/\s*\(IVA incluído\)\s*/i, '')}</td><td>{euros(l.amount_cents)}</td></tr>
            ))}
            {checkout.desconto ? (
              <tr className={e.linhaDesconto}>
                <td>Desconto{detalhe?.discount_code ? ` · ${detalhe.discount_code}` : ''}</td>
                <td>−{euros(checkout.desconto)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <p className={e.reciboNota}>
          A fatura-recibo segue para o seu email nos próximos minutos.
          {!ENTREGUE.includes(estado) && (
            <> A declaração ainda <strong>não</strong> foi entregue na AT: só depois de eu a rever.</>
          )}
        </p>

        {devolvido ? (
          <>
            <p className="aviso-atencao">Devolvi-lhe o processo para completar. Quando tiver corrigido, submeta outra vez — não paga de novo.</p>
            {erro && <p className="aviso-critico">{erro}</p>}
            <button type="button" className="btn" disabled={aSubmeter}
                    onClick={() => submeter(async () => {
                      setErro(null);
                      const r = await submeterProcesso(processo);
                      if (!r.ok) { setErro(r.faltas?.length ? `Falta: ${r.faltas.join(', ')}.` : r.erro || 'Não foi possível submeter.'); return; }
                      aoMudar();
                    })}>
              {aSubmeter ? 'A submeter…' : 'Submeter outra vez'}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secundario" onClick={() => ir('progresso')}>
            Acompanhar o processo
          </button>
        )}
      </section>
      {teste && <Ensaio processo={processo} />}
    </div>
  );
}

/* Enquanto a plataforma não está aberta ao público, ela própria serve de
   ensaio da integração com o Cegid. */
function Ensaio({ processo }: { processo: string }) {
  const [estado, setEstado] = useState<{ ok?: boolean; texto?: string }>({});
  const [aCorrer, comecar] = useTransition();
  return (
    <section className={`${e.cartao} ${e.ensaio}`}>
      <h3 className={e.tituloCartao}>Ensaio (só enquanto a plataforma não está divulgada)</h3>
      <div className="acoes-membro">
        <button type="button" className="btn btn-secundario" disabled={aCorrer}
                onClick={() => comecar(async () => {
                  const r = await emitirFaturaDoMeuProcesso(processo);
                  setEstado({ ok: r.ok, texto: r.ok ? r.aviso : r.erro });
                })}>
          {aCorrer ? 'A falar com o Cegid…' : 'Emitir fatura-recibo de teste'}
        </button>
      </div>
      {estado.texto && <p className={estado.ok ? 'aviso-positivo' : 'aviso-critico'}>{estado.texto}</p>}
    </section>
  );
}
