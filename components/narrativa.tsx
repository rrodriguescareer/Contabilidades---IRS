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

export function Narrativa() {
  const [ativo, setAtivo] = useState(0);
  const referencias = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        // O passo cuja faixa central está mais visível manda no visor.
        const visivel = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visivel) return;
        const indice = referencias.current.indexOf(visivel.target as HTMLElement);
        if (indice >= 0) setAtivo(indice);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    referencias.current.forEach((no) => no && observador.observe(no));
    return () => observador.disconnect();
  }, []);

  return (
    <div className={e.palco}>
      <div className={e.passos}>
        {PASSOS.map((passo, indice) => (
          <article
            key={passo.titulo}
            ref={(no) => {
              referencias.current[indice] = no;
            }}
            className={e.passo}
            data-ativo={indice === ativo}
          >
            <span className={e.passoNumero} aria-hidden="true">
              {String(indice + 1).padStart(2, '0')}
            </span>
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
  );
}
