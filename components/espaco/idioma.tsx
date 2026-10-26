'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/* PT/EN como no website: a página não recarrega, troca-se o dicionário.
   A escolha fica no browser de quem a fez — não é uma definição da conta. */
type Lingua = 'pt' | 'en';
const CHAVE = 'rr-lingua';

const DICIONARIO: Record<string, { pt: string; en: string }> = {
  agregado: { pt: 'Agregado familiar', en: 'Household' },
  rendimentos: { pt: 'Rendimentos e deduções', en: 'Income and deductions' },
  documentos: { pt: 'Documentos', en: 'Documents' },
  progresso: { pt: 'Acompanhamento', en: 'Progress' },
  pagamento: { pt: 'Pagamento', en: 'Payment' },
  mensagens: { pt: 'Mensagens', en: 'Messages' },
  conta: { pt: 'A minha conta', en: 'My account' },
  sair: { pt: 'Sair', en: 'Sign out' },
  submeter: { pt: 'Submeter', en: 'Submit' },
  guardar: { pt: 'Guardar', en: 'Save' },
  adicionar: { pt: 'Adicionar', en: 'Add' },
  cancelar: { pt: 'Cancelar', en: 'Cancel' },
  carregar: { pt: 'A carregar…', en: 'Loading…' },
  titular: { pt: 'Titular', en: 'Main member' },
  outros: { pt: 'Outros membros', en: 'Other members' },
  notas: { pt: 'Notas', en: 'Notes' },
};

const Contexto = createContext<{ lingua: Lingua; t: (c: string) => string; trocar: () => void }>({
  lingua: 'pt',
  t: (c) => DICIONARIO[c]?.pt ?? c,
  trocar: () => {},
});

export function Idioma({ children }: { children: React.ReactNode }) {
  const [lingua, setLingua] = useState<Lingua>('pt');

  // Lido depois da montagem: no servidor não há browser, e começar em PT
  // evita que o conteúdo salte de língua ao hidratar.
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CHAVE);
      if (guardada === 'en' || guardada === 'pt') setLingua(guardada);
    } catch {
      /* navegação privada, fica em PT */
    }
  }, []);

  const trocar = useCallback(() => {
    setLingua((atual) => {
      const nova = atual === 'pt' ? 'en' : 'pt';
      try {
        localStorage.setItem(CHAVE, nova);
      } catch {
        /* sem problema: vale só para esta visita */
      }
      document.documentElement.lang = nova === 'pt' ? 'pt-PT' : 'en';
      return nova;
    });
  }, []);

  const t = useCallback((codigo: string) => DICIONARIO[codigo]?.[lingua] ?? codigo, [lingua]);

  return <Contexto.Provider value={{ lingua, t, trocar }}>{children}</Contexto.Provider>;
}

export const usarIdioma = () => useContext(Contexto);
