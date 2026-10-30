'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { concluirEnvio, prepararDocumento, type Resultado } from '@/lib/acoes';
import { carregar, preparar } from '@/lib/carregar';
import { apagarDocumento } from '@/lib/acoes-espaco';
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

/** A lista de documentos: o que é, quando foi enviado e se já foi aberto pelo
    contabilista. Com o processo em preparação, cada um pode ser apagado. */
export function ListaDocumentos({ documentos, vazio, processo, aberto = false, aoMudar }: {
  documentos: Documento[]; vazio: string; processo?: string; aberto?: boolean; aoMudar?: () => void;
}) {
  const [aApagar, apagar] = useTransition();
  const [qual, setQual] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const podeApagar = Boolean(aberto && processo && aoMudar);

  const remover = (d: Documento) => {
    if (!processo || !aoMudar) return;
    if (!window.confirm(`Apagar "${d.descricao || d.nome}"? O ficheiro é eliminado e não pode ser recuperado.`)) return;
    setErro(null); setQual(d.id);
    apagar(async () => {
      const r = await apagarDocumento(processo, d.id);
      setQual(null);
      if (!r.ok) { setErro(r.erro || 'Não foi possível apagar o documento.'); return; }
      aoMudar();
    });
  };

  if (documentos.length === 0) return <div className={e.vazio}>{vazio}</div>;
  return (
    <>
    {erro && <p className="aviso-critico">{erro}</p>}
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
            <div className={e.ladoDocumento}>
              {/* Nos separadores de rendimentos as descargas não vêm: não se inventa um estado. */}
              {d.estado === 'rejected' ? (
                <span className={e.estadoDocumento} data-recusado="true">Recusado</span>
              ) : d.descargas !== undefined && (
                <span className={e.estadoDocumento} data-aberto={aberto}
                      title={aberto ? d.descargas.map(dataHora).join('\n') : undefined}>
                  {aberto ? `Aberto pelo contabilista a ${dataHora(d.descargas[0])}` : 'Ainda não aberto'}
                </span>
              )}
              {/* Ligações normais: o navegador mostra o PDF ou a imagem num separador novo. */}
              <a className={e.botaoLinha} href={`/app/documento/${d.id}`} target="_blank" rel="noopener">Abrir</a>
              <a className={e.botaoTexto} href={`/app/documento/${d.id}?descarregar`} download>Descarregar</a>
              {podeApagar && (
                <button type="button" className={e.botaoApagar} disabled={aApagar}
                        onClick={() => remover(d)} aria-label={`Apagar ${d.descricao || d.nome}`}>
                  {aApagar && qual === d.id ? 'A apagar…' : 'Apagar'}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
    </>
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
  const [estado, setEstado] = useState<Resultado | null>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [progresso, setProgresso] = useState<number | null>(null);
  const forma = useRef<HTMLFormElement>(null);
  const ficheiro = useRef<HTMLInputElement>(null);
  const [escolhido, setEscolhido] = useState<File | null>(null);
  const [porCima, setPorCima] = useState(false);
  const [visivel, setVisivel] = useState(!recolhido);
  const tratado = useRef<unknown>(null);

  // A meio de um envio, sair da página perde-o: o browser pede confirmação.
  useEffect(() => {
    if (!aEnviar) return;
    const aviso = (ev: BeforeUnloadEvent) => { ev.preventDefault(); ev.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [aEnviar]);

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

  /* O ficheiro vai do browser diretamente para o Storage (o Vercel recusa
     pedidos com mais de 4,5 MB): otimizar aqui, registar no servidor,
     carregar com o progresso e concluir. */
  async function submeter(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    if (!escolhido || !form.reportValidity()) return;
    const dados = new FormData(form);
    setAEnviar(true);
    setEstado(null);
    try {
      const pronto = await preparar(escolhido);
      if ('erro' in pronto) return setEstado({ ok: false, erro: pronto.erro });
      const lugar = await prepararDocumento({
        conta, processo, rendimento, categoria, tipo: String(dados.get('tipo') || ''),
        nome: pronto.nome, mime: pronto.mime, tamanho: pronto.blob.size, hash: pronto.hash,
      });
      if ('erro' in lugar) return setEstado({ ok: false, erro: lugar.erro });
      if (lugar.url) {
        setProgresso(0);
        await carregar(lugar.url, pronto, setProgresso);
      }
      setEstado(await concluirEnvio({
        id: lugar.id, categoria, imovel: String(dados.get('imovel') || ''), descricao: String(dados.get('descricao') || ''),
        original: pronto.original, tamanho: pronto.blob.size, reaproveitado: lugar.reaproveitado,
      }));
    } catch {
      setEstado({ ok: false, erro: 'O carregamento do ficheiro foi interrompido. Confirme a ligação e tente outra vez.' });
    } finally {
      setAEnviar(false);
      setProgresso(null);
    }
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
    <form ref={forma} onSubmit={submeter} className={e.envio}>
      <input type="hidden" name="conta" value={conta} />
      <input type="hidden" name="processo" value={processo} />
      <input type="hidden" name="categoria" value={categoria} />
      {rendimento && <input type="hidden" name="rendimento" value={rendimento} />}

      <label className={e.zona} data-por-cima={porCima} data-escolhido={Boolean(escolhido)}
             onDragOver={(ev) => { ev.preventDefault(); setPorCima(true); }}
             onDragLeave={() => setPorCima(false)}
             onDrop={(ev) => { ev.preventDefault(); setPorCima(false); largar(ev.dataTransfer.files); }}>
        <input ref={ficheiro} type="file" name="ficheiro" accept="application/pdf,image/jpeg,image/png,image/webp" required
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

      {progresso != null && (
        <div className={e.progresso} role="progressbar" aria-label="Progresso do envio"
             aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso * 100)}>
          <span style={{ inlineSize: `${Math.round(progresso * 100)}%` }} />
        </div>
      )}
      {estado && !estado.ok && <p className="aviso-critico">{estado.erro}</p>}
      {estado?.ok && <p className="aviso-positivo">{estado.mensagem}</p>}

      <div className="acoes-membro">
        <button type="submit" className="btn" disabled={aEnviar || !escolhido}>
          {aEnviar ? (progresso != null ? `A enviar… ${Math.round(progresso * 100)}%` : 'A preparar…') : 'Enviar documento'}
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
            <span className="suave">{documentos.length} enviados · {abertos} abertos pelo contabilista</span>
          )}
        </div>
        <ListaDocumentos documentos={documentos} processo={processo} aberto={aberto} aoMudar={aoMudar}
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
