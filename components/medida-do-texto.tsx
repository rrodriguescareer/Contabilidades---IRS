'use client';

import { useEffect, useRef } from 'react';

/* O fim do botão tem de cair onde o texto acaba de facto, não onde acaba a
 * caixa do parágrafo — a última linha quase nunca enche a medida toda.
 *
 * O CSS não sabe onde uma linha termina, por isso mede-se aqui: um Range sobre
 * o parágrafo devolve um retângulo por linha, e a mais comprida passa a ser a
 * largura da linha do valor. Sem medida, fica a do parágrafo, que é o que se
 * vê antes de o JavaScript correr.
 */
export function MedidaDoTexto({ className, children }: { className?: string; children: React.ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const no = raiz.current;
    const paragrafo = no?.querySelector<HTMLElement>('[data-medir]');
    if (!no || !paragrafo) return;

    const medir = () => {
      const intervalo = document.createRange();
      intervalo.selectNodeContents(paragrafo);
      const linhas = [...intervalo.getClientRects()];
      if (!linhas.length) return;
      const esquerda = paragrafo.getBoundingClientRect().left;
      const maior = Math.max(...linhas.map((linha) => linha.right)) - esquerda;
      if (maior > 0) no.style.setProperty('--medida-real', `${Math.ceil(maior)}px`);
    };

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(paragrafo);
    // A letra só assenta quando a fonte carrega; aí as linhas mudam.
    document.fonts?.ready.then(medir).catch(() => {});

    return () => observador.disconnect();
  }, []);

  return (
    <div ref={raiz} className={className}>
      {children}
    </div>
  );
}
