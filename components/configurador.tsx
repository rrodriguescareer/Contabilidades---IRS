'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import e from '@/app/page.module.css';

/* Calculadora pública do preço do IRS.
 *
 * Espelha `price_irs_case` no Supabase, rubrica a rubrica. Se aquela função
 * mudar, esta tem de mudar com ela — mostrar aqui um valor e cobrar outro no
 * checkout seria pior do que não mostrar valor nenhum.
 *
 * O cálculo a sério continua a ser o do servidor: isto é uma estimativa para
 * quem ainda não tem conta.
 */

const BASE = 1850;

type Escolhas = {
  trabalho: boolean;      // categoria A
  pensoes: boolean;       // categoria H
  independente: boolean;  // categoria B
  acoes: boolean;         // categoria G
  pessoas: number;        // pessoas com trabalho ou pensões
  rendas: number;         // imóveis arrendados
  vendas: number;         // imóveis vendidos
};

const INICIAL: Escolhas = {
  trabalho: true, pensoes: false, independente: false, acoes: false,
  pessoas: 1, rendas: 0, vendas: 0,
};

const EUROS = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const euros = (centimos: number) => EUROS.format(centimos / 100);

type Rubrica = { chave: string; nome: string; nota?: string; centimos: number };

function calcular(escolhas: Escolhas): { rubricas: Rubrica[]; total: number; classes: number } {
  const { trabalho, pensoes, independente, acoes, pessoas, rendas, vendas } = escolhas;

  // «Classes» conta os tipos de rendimento declarados, sem contar despesas.
  const classes = [trabalho, pensoes, independente, acoes, rendas > 0, vendas > 0].filter(Boolean).length;
  if (classes === 0) return { rubricas: [], total: 0, classes: 0 };

  const rubricas: Rubrica[] = [
    { chave: 'base', nome: 'Preparação do IRS', nota: 'Primeiro tipo de rendimento', centimos: BASE },
  ];

  if (pessoas > 1) {
    rubricas.push({
      chave: 'agregado',
      nome: 'Várias pessoas com trabalho ou pensões',
      nota: 'Independentemente do número de pessoas',
      centimos: 500,
    });
  }

  // A acumulação A+B é mais cara do que a de pensões com categoria B.
  if (trabalho && independente) {
    rubricas.push({ chave: 'ab', nome: 'Acumulação de categorias A e B', nota: 'Trabalho dependente com recibos verdes', centimos: 1500 });
  } else if (pensoes && independente) {
    rubricas.push({ chave: 'hb', nome: 'Categoria B adicional às pensões', centimos: 500 });
  }

  if (rendas > 0) {
    // Até 2 imóveis não acresce nada se as rendas forem o único rendimento.
    const valor = rendas <= 2 ? (classes === 1 ? 0 : 500) : rendas <= 5 ? 1000 : 2000;
    rubricas.push({
      chave: 'rendas',
      nome: `Rendas — ${rendas} ${rendas === 1 ? 'imóvel' : 'imóveis'}`,
      nota: rendas <= 2 && classes === 1 ? 'Único rendimento, até 2 imóveis: sem acréscimo' : undefined,
      centimos: valor,
    });
  }

  if (acoes) {
    rubricas.push({ chave: 'acoes', nome: 'Mais-valias de ações e outros títulos', nota: 'Categoria G, valor único', centimos: 1000 });
  }

  if (vendas > 0) {
    rubricas.push({
      chave: 'vendas',
      nome: `Mais-valias de imóveis — ${vendas} ${vendas === 1 ? 'imóvel' : 'imóveis'}`,
      nota: '10,00 € por imóvel vendido',
      centimos: 1000 * vendas,
    });
  }

  return { rubricas, total: rubricas.reduce((soma, r) => soma + r.centimos, 0), classes };
}

function Interruptor({
  ligado, aoMudar, titulo, nota,
}: {
  ligado: boolean; aoMudar: (v: boolean) => void; titulo: string; nota: string;
}) {
  return (
    <label className={e.opcao}>
      <input type="checkbox" checked={ligado} onChange={(evento) => aoMudar(evento.target.checked)} />
      <span className={e.opcaoTexto}>
        <strong>{titulo}</strong>
        <span>{nota}</span>
      </span>
    </label>
  );
}

/* Recebe um incremento, não um valor já calculado: dois cliques seguidos no
   mesmo instante partiam de `valor` e contavam só uma vez. */
function Contador({
  valor, aoAjustar, titulo, nota, minimo = 0, maximo = 20,
}: {
  valor: number; aoAjustar: (delta: number) => void; titulo: string; nota: string; minimo?: number; maximo?: number;
}) {
  return (
    <div className={e.contador}>
      <span className={e.contadorTexto}>
        <strong>{titulo}</strong>
        <span>{nota}</span>
      </span>
      <span className={e.contadorBotoes}>
        <button type="button" onClick={() => aoAjustar(-1)} disabled={valor <= minimo} aria-label={`Menos um: ${titulo}`}>
          −
        </button>
        <span className={e.contadorValor} aria-live="polite">{valor}</span>
        <button type="button" onClick={() => aoAjustar(1)} disabled={valor >= maximo} aria-label={`Mais um: ${titulo}`}>
          +
        </button>
      </span>
    </div>
  );
}

export function Configurador() {
  const [escolhas, definirEscolhas] = useState<Escolhas>(INICIAL);
  const mudar = <C extends keyof Escolhas>(campo: C, valor: Escolhas[C]) =>
    definirEscolhas((atual) => ({ ...atual, [campo]: valor }));

  /** Soma ao valor atual, para vários cliques seguidos contarem todos. */
  const ajustar = (campo: 'pessoas' | 'rendas' | 'vendas', delta: number, minimo: number, maximo: number) =>
    definirEscolhas((atual) => ({
      ...atual,
      [campo]: Math.min(maximo, Math.max(minimo, atual[campo] + delta)),
    }));

  const { rubricas, total, classes } = useMemo(() => calcular(escolhas), [escolhas]);
  const temTrabalhoOuPensoes = escolhas.trabalho || escolhas.pensoes;

  return (
    <div className={e.precario}>
      <div className={e.escolhas}>
        <div className={e.grupo}>
          <p className={e.grupoTitulo}>Que rendimentos teve em 2026?</p>
          <div className={e.opcoes}>
            <Interruptor
              ligado={escolhas.trabalho}
              aoMudar={(v) => mudar('trabalho', v)}
              titulo="Trabalho dependente"
              nota="Vencimentos, categoria A"
            />
            <Interruptor
              ligado={escolhas.pensoes}
              aoMudar={(v) => mudar('pensoes', v)}
              titulo="Pensões"
              nota="Reforma ou outras pensões, categoria H"
            />
            <Interruptor
              ligado={escolhas.independente}
              aoMudar={(v) => mudar('independente', v)}
              titulo="Recibos verdes"
              nota="Trabalho independente, categoria B"
            />
            <Interruptor
              ligado={escolhas.acoes}
              aoMudar={(v) => mudar('acoes', v)}
              titulo="Ações e outros títulos"
              nota="Mais-valias mobiliárias, categoria G"
            />
          </div>
        </div>

        <div className={e.grupo}>
          <p className={e.grupoTitulo}>Imóveis</p>
          <Contador
            valor={escolhas.rendas}
            aoAjustar={(d) => ajustar('rendas', d, 0, 20)}
            titulo="Imóveis arrendados"
            nota="Quantos imóveis lhe deram rendas"
          />
          <Contador
            valor={escolhas.vendas}
            aoAjustar={(d) => ajustar('vendas', d, 0, 20)}
            titulo="Imóveis vendidos"
            nota="Cada venda é calculada em separado"
          />
        </div>

        {temTrabalhoOuPensoes && (
          <div className={e.grupo}>
            <p className={e.grupoTitulo}>Agregado familiar</p>
            <Contador
              valor={escolhas.pessoas}
              aoAjustar={(d) => ajustar('pessoas', d, 1, 10)}
              titulo="Pessoas com trabalho ou pensões"
              nota="Conta quem recebeu, não o agregado todo"
              minimo={1}
              maximo={10}
            />
          </div>
        )}
      </div>

      <div className={e.conta}>
        <div className={e.contaCartao}>
          <p className={e.contaTitulo}>A sua estimativa</p>

          {classes === 0 ? (
            <p className={e.contaVazio}>
              Escolha pelo menos um tipo de rendimento para ver o preço.
            </p>
          ) : (
            <>
              <div className={e.rubricas}>
                {rubricas.map((rubrica) => (
                  <div className={e.rubrica} key={rubrica.chave}>
                    <span className={e.rubricaNome}>
                      {rubrica.nome}
                      {rubrica.nota && <small>{rubrica.nota}</small>}
                    </span>
                    <span className={e.rubricaValor}>
                      {rubrica.chave === 'base' ? euros(rubrica.centimos) : `+ ${euros(rubrica.centimos)}`}
                    </span>
                  </div>
                ))}
              </div>

              <div className={e.contaTotal}>
                <span className={e.contaTotalRotulo}>Total com IVA</span>
                <span className={e.contaTotalValor}>{euros(total)}</span>
              </div>
            </>
          )}

          <Link href="/registar" className={`btn ${e.btnClaro}`} style={{ justifySelf: 'start' }}>
            Submeter o meu IRS
          </Link>

          <p className={e.contaNota}>
            Estimativa com base no que escolheu. O valor final é calculado na plataforma a partir do que
            registar, e é sempre mostrado rubrica a rubrica antes de pagar. Se tiver código de desconto,
            aplica-se nessa altura.
          </p>
        </div>
      </div>
    </div>
  );
}
