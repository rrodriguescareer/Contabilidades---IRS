'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
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

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
const tamanho = (b: number) =>
  b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

/** A lista de documentos: o que é, quando foi enviado e se eu já o abri. */
export function ListaDocumentos({ documentos, vazio }: { documentos: Documento[]; vazio: string }) {
  if (documentos.length === 0) return <div className={e.vazio}>{vazio}</div>;
  return (
    <ul className={e.documentos}>
      {documentos.map((d) => {
        const aberto = d.descargas && d.descargas.length > 0;
        return (
          <li key={d.id}>
            <span className={e.iconeFicheiro} data-tipo={/\.pdf$/i.test(d.nome) ? 'pdf' : 'img'} aria-hidden="true">
              {/\.pdf$/i.test(d.nome) ? 'PDF' : 'IMG'}
            </span>
            <div className={e.documentoTexto}>
              <strong>{d.descricao || d.nome}</strong>
              <span>{d.tipo}{d.imovel ? ` · ${d.imovel}` : ''} · {tamanho(d.tamanho)} · enviado a {data(d.em)}</span>
            </div>
            {/* Nos separadores de rendimentos as descargas não vêm: não se inventa um estado. */}
            {d.descargas !== undefined && (
              <span className={e.estadoDocumento} data-aberto={aberto}
                    title={aberto ? d.descargas.map(dataHora).join('\n') : undefined}>
                {aberto ? `Aberto por mim a ${dataHora(d.descargas[0])}` : 'Ainda não aberto'}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** O envio de um documento. Arrasta-se o ficheiro para a zona, ou escolhe-se. */
export function EnvioDocumento({
  conta, processo, categoria, tipos, imoveis, rendimento, aberto, aoEnviar, recolhido = false,
}: {
  conta: string; processo: string; categoria: string; tipos: string[];
  imoveis?: { id: string; nome: string }[]; rendimento?: string;
  aberto: boolean; aoEnviar: () => void; recolhido?: boolean;
}) {
  const [estado, accao, aEnviar] = useActionState(enviarDocumento, null);
  const forma = useRef<HTMLFormElement>(null);
  const ficheiro = useRef<HTMLInputElement>(null);
  const [escolhido, setEscolhido] = useState<File | null>(null);
  const [porCima, setPorCima] = useState(false);
  const [visivel, setVisivel] = useState(!recolhido);
  const tratado = useRef<unknown>(null);

  useEffect(() => {
    if (estado?.ok && tratado.current !== estado) {
      tratado.current = estado;
      forma.current?.reset();
      setEscolhido(null);
      aoEnviar();
    }
  }, [estado, aoEnviar]);

  if (!aberto) return null;
  if (!visivel) {
    return (
      <div>
        <button type="button" className="btn btn-secundario" onClick={() => setVisivel(true)}>
          Enviar documento
        </button>
      </div>
    );
  }

  const largar = (lista: FileList | null) => {
    const f = lista?.[0];
    if (!f || !ficheiro.current) return;
    const transferencia = new DataTransfer();
    transferencia.items.add(f);
    ficheiro.current.files = transferencia.files;
    setEscolhido(f);
  };

  return (
    <form ref={forma} action={accao} className={e.envio}>
      <input type="hidden" name="conta" value={conta} />
      <input type="hidden" name="processo" value={processo} />
      <input type="hidden" name="categoria" value={categoria} />
      {rendimento && <input type="hidden" name="rendimento" value={rendimento} />}

      <label className={e.zona} data-por-cima={porCima} data-escolhido={Boolean(escolhido)}
             onDragOver={(ev) => { ev.preventDefault(); setPorCima(true); }}
             onDragLeave={() => setPorCima(false)}
             onDrop={(ev) => { ev.preventDefault(); setPorCima(false); largar(ev.dataTransfer.files); }}>
        <input ref={ficheiro} type="file" name="ficheiro" accept="application/pdf,image/jpeg,image/png" required
               className={e.ficheiroEscondido} onChange={(ev) => setEscolhido(ev.target.files?.[0] || null)} />
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        {escolhido ? (
          <span><strong>{escolhido.name}</strong> · {tamanho(escolhido.size)} · <u>trocar</u></span>
        ) : (
          <span><strong>Arraste o ficheiro para aqui</strong> ou <u>escolha-o</u> · PDF, JPG ou PNG</span>
        )}
      </label>

      <div className={e.camposEnvio}>
        {tipos.length > 1 ? (
          <label className="campo">
            <span>Tipo de documento</span>
            <select name="tipo" required defaultValue="" className="entrada">
              <option value="" disabled>Escolher</option>
              {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        ) : (
          <input type="hidden" name="tipo" value={tipos[0]} />
        )}

        {imoveis && imoveis.length > 0 && (
          <label className="campo">
            <span>Imóvel</span>
            <select name="imovel" required defaultValue="" className="entrada">
              <option value="" disabled>Escolher</option>
              {imoveis.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
          </label>
        )}

        <label className="campo">
          <span>Descrição</span>
          <input name="descricao" minLength={3} maxLength={200} required className="entrada"
                 placeholder="Ex.: declaração anual da entidade patronal" />
        </label>
      </div>

      {estado && !estado.ok && <p className="aviso-critico">{estado.erro}</p>}
      {estado?.ok && <p className="aviso-positivo">{estado.mensagem}</p>}

      <div className="acoes-membro">
        <button type="submit" className="btn" disabled={aEnviar || !escolhido}>
          {aEnviar ? 'A enviar…' : 'Enviar documento'}
        </button>
        {recolhido && (
          <button type="button" className="btn-texto" onClick={() => setVisivel(false)}>Cancelar</button>
        )}
      </div>
    </form>
  );
}

export function Documentos({
  dados, conta, processo, aberto, aoMudar,
}: { dados: Dados; conta: string; processo: string; aberto: boolean; aoMudar: () => void }) {
  const documentos = (dados.documentos as Documento[]) || [];
  const abertos = documentos.filter((d) => d.descargas && d.descargas.length > 0).length;

  return (
    <>
      <section className={e.cartao}>
        <div className="linha-entre">
          <h2>Todos os documentos</h2>
          {documentos.length > 0 && (
            <span className="suave">{documentos.length} enviados · {abertos} abertos por mim</span>
          )}
        </div>
        <ListaDocumentos documentos={documentos}
                         vazio="Ainda não enviou documentos. Pode enviá-los aqui ou em cada separador de rendimentos." />
      </section>

      {aberto && (
        <section className={e.cartao}>
          <h2>Enviar outra documentação</h2>
          <p className="suave">Para o que não pertence a nenhum separador de rendimentos.</p>
          <EnvioDocumento conta={conta} processo={processo} categoria="other"
                          tipos={['Outra Documentação']} aberto={aberto} aoEnviar={aoMudar} />
        </section>
      )}
    </>
  );
}
