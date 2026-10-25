'use client';

import { useEffect, useRef, useState } from 'react';
import e from '@/app/page.module.css';

type Passo = {
  titulo: string;
  texto: string;
  pontos: string[];
  visor: React.ReactNode;
};

const PASSOS: Passo[] = [
  {
    titulo: 'Crie a conta em menos de um minuto',
    texto: 'Só precisa de um email e de uma palavra-passe. Sem papéis, sem deslocações, sem esperar por aprovação.',
    pontos: ['Confirmação imediata por email', 'Dados pessoais preenchidos depois, com calma', 'Acesso no telemóvel ou no computador'],
    visor: (
      <div className={e.visorPainel}>
        <p className={e.visorTitulo}>Criar conta</p>
        <div className={e.visorCartao}>
          <span>Email</span>
          <strong>maria.silva@email.pt</strong>
        </div>
        <div className={e.visorCartao}>
          <span>Palavra-passe</span>
          <strong>••••••••••</strong>
        </div>
        <div className={e.visorPastilha}>Termos e privacidade aceites</div>
      </div>
    ),
  },
  {
    titulo: 'Monte o seu agregado familiar',
    texto: 'Titular, cônjuge, descendentes e ascendentes. Cada pessoa entra uma vez e fica guardada para os anos seguintes.',
    pontos: ['Nome, data de nascimento e NIF', 'Convite por email para cada membro, se quiser', 'Aviso automático quando falta a autenticação de dois fatores no Portal das Finanças'],
    visor: (
      <div className={e.visorPainel}>
        <p className={e.visorTitulo}>Agregado familiar</p>
        {[
          ['Maria Silva', 'Titular · 234 567 890'],
          ['João Silva', 'Cônjuge · 345 678 901'],
          ['Tomás Silva', 'Descendente · 456 789 012'],
        ].map(([nome, detalhe]) => (
          <div className={e.visorCartao} key={nome}>
            <strong>{nome}</strong>
            <span>{detalhe}</span>
          </div>
        ))}
        <div className={e.visorPastilha}>+ Adicionar pessoa</div>
      </div>
    ),
  },
  {
    titulo: 'Declare rendimentos e junte documentos',
    texto: 'Escolha as classes de rendimento que teve em 2026. Para cada uma, carregue os ficheiros ou preencha os valores à mão.',
    pontos: [
      'Trabalho, pensões, recibos verdes, rendas, ações e imóveis',
      'Mais-valias de imóveis separadas por imóvel, não por pessoa',
      'Despesas e benefícios fiscais na mesma recolha',
    ],
    visor: (
      <div className={e.visorPainel}>
        <p className={e.visorTitulo}>Rendimentos de 2026</p>
        {[
          ['Trabalho dependente', 'Maria Silva · 3 documentos'],
          ['Rendas de imóveis', 'Imóvel 1 · 2 documentos'],
          ['Mais-valias de imóveis', 'Imóvel 2 · 5 documentos'],
        ].map(([nome, detalhe]) => (
          <div className={e.visorCartao} key={nome}>
            <strong>{nome}</strong>
            <span>{detalhe}</span>
          </div>
        ))}
        <div className={e.visorBarraProgresso}>
          <i style={{ inlineSize: '72%' }} />
        </div>
        <span className="micro tenue">72% da recolha concluída</span>
      </div>
    ),
  },
  {
    titulo: 'O contabilista revê, peça a peça',
    texto: 'Recebo o processo, verifico tudo e digo-lhe exatamente o que falta. Fala comigo dentro da plataforma, sem emails perdidos.',
    pontos: ['Estado do processo sempre visível', 'Mensagens diretas comigo, com histórico', 'Pedidos de elementos em falta, item a item'],
    visor: (
      <div className={e.visorPainel}>
        <p className={e.visorTitulo}>Acompanhamento</p>
        <div className={e.visorCartao}>
          <strong>Em revisão</strong>
          <span>Rúben Rodrigues · há 2 horas</span>
        </div>
        <div className={e.visorCartao}>
          <strong>Falta a escritura de compra</strong>
          <span>Imóvel 2 · pedido há 1 hora</span>
        </div>
        <div className={e.visorCartao} style={{ background: 'var(--acao-suave)', borderColor: 'transparent' }}>
          <span>Mensagem do contabilista</span>
          <strong>«Assim que enviar a escritura, submeto ainda esta semana.»</strong>
        </div>
      </div>
    ),
  },
  {
    titulo: 'Pague e eu submeto',
    texto: 'O preço aparece rubrica a rubrica antes de pagar. Pagamento seguro por cartão, Apple Pay, Google Pay ou Revolut.',
    pontos: ['Sem surpresas: vê o cálculo completo antes de confirmar', 'Código de desconto, se tiver', 'Comprovativo de submissão guardado no processo'],
    visor: (
      <div className={e.visorPainel}>
        <p className={e.visorTitulo}>Resumo do pagamento</p>
        {[
          ['Preparação IRS', '18,50 €'],
          ['Rendas — 2 imóveis', '5,00 €'],
          ['Mais-valias — 1 imóvel', '10,00 €'],
        ].map(([nome, valor]) => (
          <div className={e.visorCartao} key={nome} style={{ gridTemplateColumns: '1fr auto', display: 'grid', alignItems: 'center' }}>
            <span>{nome}</span>
            <strong className="numero">{valor}</strong>
          </div>
        ))}
        <div className={e.visorCartao} style={{ background: 'var(--tinta-900)', borderColor: 'transparent', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
          <span style={{ color: 'rgb(255 255 255 / .7)' }}>Total com IVA</span>
          <strong className="numero" style={{ color: '#fff', fontSize: '1rem' }}>
            33,50 €
          </strong>
        </div>
        <div className={e.visorBotao}>Pagar e submeter</div>
      </div>
    ),
  },
];

type PropsNarrativa = { olho: string; titulo: string; texto: string };

export function Narrativa({ olho, titulo, texto }: PropsNarrativa) {
  const [ativo, setAtivo] = useState(0);
  const palco = useRef<HTMLDivElement>(null);

  /* A etapa sai da posição do palco, não de um IntersectionObserver: com
     rootMargin de -50% em cima e em baixo a raiz fica sem altura nenhuma, a
     intersecção tem área zero e o observador nunca assinala nada. */
  useEffect(() => {
    const no = palco.current;
    if (!no) return;

    const medir = () => {
      const caixa = no.getBoundingClientRect();
      const percurso = caixa.height - window.innerHeight;
      if (percurso <= 0) return;
      const andado = Math.min(Math.max(-caixa.top, 0), percurso);
      const indice = Math.min(PASSOS.length - 1, Math.floor((andado / percurso) * PASSOS.length));
      setAtivo((atual) => (atual === indice ? atual : indice));
    };
    // Uma leitura de posição por evento de scroll. Chega, e não depende de
    // requestAnimationFrame, que o browser suspende em separadores em segundo
    // plano — a etapa ficava para trás.
    medir();
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, []);

  return (
    <div className={e.palco} ref={palco} style={{ '--passos': PASSOS.length } as React.CSSProperties}>
      <div className={e.palcoFixo}>
        <div className={e.palcoTexto}>
          <div className={e.cabecalho}>
            <p className={e.olho}>{olho}</p>
            <h2 className={e.seccaoTitulo}>{titulo}</h2>
            <p className={e.seccaoTexto}>{texto}</p>
          </div>

          <div className={e.contagem} aria-hidden="true">
            {PASSOS.map((passo, indice) => (
              <span key={passo.titulo} className={e.contagemPonto} data-ativo={indice === ativo} />
            ))}
          </div>

          <div className={e.passosPilha}>
            {PASSOS.map((passo, indice) => (
              <article
                key={passo.titulo}
                className={e.passo}
                data-ativo={indice === ativo}
                aria-hidden={indice !== ativo}
              >
                <span className={e.passoNumero}>{String(indice + 1).padStart(2, '0')}</span>
                <h3 className={e.passoTitulo}>{passo.titulo}</h3>
                <p className={e.passoTexto}>{passo.texto}</p>
                <ul className={e.passoLista} role="list">
                  {passo.pontos.map((ponto) => (
                    <li key={ponto}>{ponto}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className={e.visorColuna} aria-hidden="true">
          <div className={e.visor}>
            <div className={e.visorEcra}>
              <div className={e.visorBarra}>
                <span>IRS 2026</span>
                <span>RR.</span>
              </div>
              <div className={e.visorCorpo}>
                <div key={ativo}>{PASSOS[ativo].visor}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
