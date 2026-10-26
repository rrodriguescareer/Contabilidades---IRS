'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { avancarProcesso } from '@/lib/acoes-espaco';
import e from './gabinete.module.css';

/* O que se pode fazer a partir de cada estado, e com que palavras.
   A base de dados decide o que é válido; isto é só a forma de o pedir. */
const PASSOS: Record<string, { destino: string; rotulo: string; recuo?: boolean }[]> = {
  collecting: [{ destino: 'submitted_by_client', rotulo: 'Marcar como submetido' }],
  submitted_by_client: [
    { destino: 'accepted', rotulo: 'Aceitar processo' },
    { destino: 'collecting', rotulo: 'Devolver ao cliente', recuo: true },
  ],
  accepted: [
    { destino: 'validation', rotulo: 'Começar validação' },
    { destino: 'collecting', rotulo: 'Devolver ao cliente', recuo: true },
  ],
  validation: [
    { destino: 'approved', rotulo: 'Aprovar' },
    { destino: 'collecting', rotulo: 'Devolver ao cliente', recuo: true },
  ],
  approved: [
    { destino: 'submitting', rotulo: 'Iniciar submissão' },
    { destino: 'validation', rotulo: 'Voltar à validação', recuo: true },
  ],
  submitting: [
    { destino: 'filed', rotulo: 'Registar entrega' },
    { destino: 'approved', rotulo: 'Voltar a aprovado', recuo: true },
  ],
  filed: [{ destino: 'monitoring', rotulo: 'Pôr em acompanhamento' }],
  monitoring: [
    { destino: 'closed', rotulo: 'Fechar processo' },
    { destino: 'filed', rotulo: 'Voltar a submetido', recuo: true },
  ],
  closed: [{ destino: 'monitoring', rotulo: 'Reabrir acompanhamento', recuo: true }],
};

export function Avanco({ processo, estado }: { processo: string; estado: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [valor, setValor] = useState('');
  const [sentido, setSentido] = useState('refund');
  const [aCorrer, comecar] = useTransition();

  const passos = PASSOS[estado] || [];
  if (passos.length === 0) return null;

  const pedir = (destino: string) =>
    comecar(async () => {
      setErro(null);
      const r = await avancarProcesso(processo, destino, nota, valor, sentido);
      if (!r.ok) { setErro(r.erro || 'Não foi possível avançar.'); return; }
      setNota(''); setValor('');
      router.refresh();
    });

  return (
    <section className={e.bloco}>
      <h2>Avançar o processo</h2>

      {/* Só se pede o valor onde ele existe: na entrega. */}
      {estado === 'submitting' && (
        <div className={e.colunas}>
          <label style={{ display: 'grid', gap: '.3rem', fontSize: '.8rem' }}>
            Valor apurado
            <input value={valor} onChange={(ev) => setValor(ev.target.value)}
                   inputMode="decimal" placeholder="0,00" />
          </label>
          <label style={{ display: 'grid', gap: '.3rem', fontSize: '.8rem' }}>
            Sentido
            <select value={sentido} onChange={(ev) => setSentido(ev.target.value)}>
              <option value="refund">A reembolsar</option>
              <option value="payment">A pagar</option>
            </select>
          </label>
        </div>
      )}

      <label style={{ display: 'grid', gap: '.3rem', fontSize: '.8rem' }}>
        Nota para o cliente (opcional)
        <textarea rows={2} value={nota} onChange={(ev) => setNota(ev.target.value)}
                  maxLength={5000}
                  placeholder="Sem nota, o cliente recebe uma explicação do passo." />
      </label>

      {erro && <p className="aviso-critico">{erro}</p>}

      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {passos.map((p) => (
          <button key={p.destino} type="button" className={p.recuo ? 'btn btn-secundario' : 'btn'}
                  disabled={aCorrer} onClick={() => pedir(p.destino)}>
            {aCorrer ? 'A guardar…' : p.rotulo}
          </button>
        ))}
      </div>
    </section>
  );
}
