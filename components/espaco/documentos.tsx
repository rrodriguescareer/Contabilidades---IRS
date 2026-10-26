'use client';
import { useActionState, useEffect, useRef } from 'react';
import { enviarDocumento } from '@/lib/acoes';
import type { Dados } from './espaco';
import e from './espaco.module.css';

export type Documento = {
  id: string;
  tipo: string;
  descricao: string | null;
  categoria: string | null;
  nome: string;
  tamanho: number;
  estado: string;
  em: string;
  imovel?: string | null;
  descargas?: string[];
};

const data = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const tamanho = (b: number) =>
  b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

/** O formulário de envio, partilhado pelos separadores de rendimentos e por este. */
export function EnvioDocumento({
  conta, processo, categoria, tipos, imoveis, rendimento, aberto, aoEnviar,
}: {
  conta: string; processo: string; categoria: string; tipos: string[];
  imoveis?: { id: string; nome: string }[]; rendimento?: string;
  aberto: boolean; aoEnviar: () => void;
}) {
  const [estado, accao, aEnviar] = useActionState(enviarDocumento, null);
  const forma = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) {
      forma.current?.reset();
      aoEnviar();
    }
  }, [estado, aoEnviar]);

  if (!aberto) return null;

  return (
    <form ref={forma} action={accao} className="form-membro">
      <input type="hidden" name="conta" value={conta} />
      <input type="hidden" name="processo" value={processo} />
      <input type="hidden" name="categoria" value={categoria} />
      {rendimento && <input type="hidden" name="rendimento" value={rendimento} />}

      <label>
        Tipo
        <select name="tipo" required defaultValue={tipos.length === 1 ? tipos[0] : ''}>
          {tipos.length !== 1 && <option value="" disabled>Escolher</option>}
          {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      {imoveis && imoveis.length > 0 && (
        <label>
          Imóvel
          <select name="imovel" required>
            <option value="" disabled>Escolher</option>
            {imoveis.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
        </label>
      )}

      <label>
        Descrição
        <input name="descricao" minLength={3} maxLength={200} required
               placeholder="Ex.: declaração anual 2026" />
      </label>

      <label>
        Ficheiro
        <input type="file" name="ficheiro" accept="application/pdf,image/jpeg,image/png" required />
      </label>

      {estado && !estado.ok && <p className="aviso-critico">{estado.erro}</p>}
      {estado?.ok && <p className="aviso-positivo">{estado.mensagem}</p>}

      <button type="submit" className="btn btn-secundario" disabled={aEnviar}>
        {aEnviar ? 'A enviar…' : 'Enviar documento'}
      </button>
    </form>
  );
}

export function Documentos({
  dados, conta, processo, aberto, aoMudar,
}: { dados: Dados; conta: string; processo: string; aberto: boolean; aoMudar: () => void }) {
  const documentos = (dados.documentos as Documento[]) || [];

  return (
    <>
      <section className={e.cartao}>
        <h2>Todos os documentos</h2>
        <p className="suave">
          Tudo o que enviou, aqui e nos separadores de rendimentos. A data de descarga diz-lhe
          quando é que eu abri cada um.
        </p>

        {documentos.length === 0 && (
          <div className={e.vazio}>Ainda não enviou documentos.</div>
        )}

        {documentos.map((d) => (
          <div key={d.id} className="linha-membro">
            <div>
              <strong>{d.tipo}</strong>
              <p className="suave">
                {d.descricao || d.nome}
                {d.imovel ? ` · ${d.imovel}` : ''}
                {` · ${tamanho(d.tamanho)} · ${data(d.em)}`}
              </p>
              {d.descargas && d.descargas.length > 0 ? (
                <p className="suave">
                  Descarregado por mim: {d.descargas.map(data).join(' · ')}
                </p>
              ) : (
                <p className="suave">Ainda não descarregado.</p>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className={e.cartao}>
        <h2>Enviar outra documentação</h2>
        <p className="suave">
          Para documentos que não pertencem a nenhum separador de rendimentos.
        </p>
        <EnvioDocumento conta={conta} processo={processo} categoria="other"
                        tipos={['Outra Documentação']} aberto={aberto} aoEnviar={aoMudar} />
      </section>
    </>
  );
}
