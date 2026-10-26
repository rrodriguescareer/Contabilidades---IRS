'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { apagarContaAnterior, migrarDoAgregado } from '@/lib/acoes-nif';

/* O NIF não vem no endereço de propósito: é dado pessoal, e um endereço
   acaba em históricos e registos de servidor. Pedi-lo outra vez é também a
   reconfirmação — quem está a apagar uma conta tem de escrever o número de
   que está a falar. */
export function ResolverNif({ tipo }: { tipo: 'conta' | 'agregado' }) {
  const router = useRouter();
  const [nif, setNif] = useState('');
  const [palavra, setPalavra] = useState('');
  const [estado, setEstado] = useState<{ ok?: boolean; texto?: string }>({});
  const [aCorrer, comecar] = useTransition();

  const exigida = tipo === 'conta' ? 'APAGAR' : 'MIGRAR';
  const pronto = /^[0-9]{9}$/.test(nif) && palavra === exigida;

  return (
    <section className="cartao pilha pilha-4" style={{ borderColor: '#f3cdc9' }}>
      <h2>{tipo === 'conta' ? 'Já existe uma conta com este NIF' : 'Este NIF está noutro agregado'}</h2>

      {tipo === 'conta' ? (
        <>
          <p className="suave">
            Pode apagar a conta anterior e começar de novo. Apaga tudo o que lá estiver:
            processos, rendimentos e documentos. Não há como voltar atrás.
          </p>
          <p className="suave">
            Se a conta anterior já tiver um processo submetido ou pago, isto não avança — nesse
            caso trato eu do assunto consigo.
          </p>
        </>
      ) : (
        <>
          <p className="suave">
            Pode sair desse agregado e ficar com conta própria. Os seus rendimentos e documentos
            vêm consigo.
          </p>
          <p className="suave">
            A senha do Portal das Finanças não migra — terá de a escrever outra vez aqui. Uma
            senha que muda de dono sem passar pelo dono deixa de ser uma senha.
          </p>
        </>
      )}

      <label className="campo">
        <span className="rotulo">Escreva o NIF outra vez</span>
        <input className="entrada" value={nif} onChange={(e) => setNif(e.target.value.trim())}
               inputMode="numeric" maxLength={9} autoComplete="off" />
      </label>

      <label className="campo">
        <span className="rotulo">Escreva <strong>{exigida}</strong> para confirmar</span>
        <input className="entrada" value={palavra} onChange={(e) => setPalavra(e.target.value.toUpperCase())}
               autoComplete="off" />
      </label>

      {estado.texto && (
        <p className={estado.ok ? 'aviso-positivo' : 'aviso-critico'}>{estado.texto}</p>
      )}

      <div className="acoes-membro">
        <button type="button" className="btn" disabled={!pronto || aCorrer}
                onClick={() => comecar(async () => {
                  const r = tipo === 'conta'
                    ? await apagarContaAnterior(nif, palavra)
                    : await migrarDoAgregado(nif, palavra);
                  setEstado({ ok: r.ok, texto: r.ok ? r.resumo : r.erro });
                  if (r.ok) router.refresh();
                })}>
          {aCorrer ? 'A tratar…' : tipo === 'conta' ? 'Apagar e começar de novo' : 'Sair do agregado'}
        </button>
        <a className="btn btn-texto" href="/onboarding">Cancelar</a>
      </div>
    </section>
  );
}
