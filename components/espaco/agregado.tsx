'use client';
import { useState, useTransition } from 'react';
import { guardarMembro, removerMembro } from '@/lib/acoes-espaco';
import { usarIdioma } from './idioma';
import type { Dados } from './espaco';
import e from './espaco.module.css';

type Membro = {
  id: string;
  nome: string;
  nascimento: string | null;
  nif: string | null;
  relacao: string;
  dois_fatores: boolean;
  tem_senha: boolean;
  senha_em: string | null;
};

const RELACOES = [
  { id: 'conjuge', rotulo: 'Cônjuge' },
  { id: 'descendente', rotulo: 'Descendente' },
  { id: 'ascendente', rotulo: 'Ascendente' },
];

const EXPLICACAO_SENHA =
  'A senha é guardada cifrada e nunca é mostrada de volta. No separador Acompanhamento vê a data e a hora de cada vez que a consultei.';

export function Agregado({
  dados,
  processo,
  aoMudar,
}: {
  dados: Dados;
  processo: string;
  aoMudar: () => void;
}) {
  const { t } = usarIdioma();
  const membros = (dados.membros as Membro[]) || [];
  const titular = membros.find((m) => m.relacao === 'titular');
  const outros = membros.filter((m) => m.relacao !== 'titular');
  const [aEditar, setAEditar] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);

  return (
    <>
      <section className={e.cartao}>
        <h2>{t('titular')}</h2>
        {titular ? (
          aEditar === titular.id ? (
            <Formulario
              membro={titular}
              processo={processo}
              fixo
              aoFechar={() => setAEditar(null)}
              aoMudar={aoMudar}
            />
          ) : (
            <Cartao membro={titular} aoEditar={() => setAEditar(titular.id)} />
          )
        ) : (
          <p className="suave">Complete o onboarding para ficar registado como titular.</p>
        )}
      </section>

      <section className={e.cartao}>
        <h2>{t('outros')}</h2>
        {outros.length === 0 && !novo && (
          <div className={e.vazio}>
            Ainda não há mais ninguém no agregado. Adicione cônjuge, descendentes ou ascendentes.
          </div>
        )}

        {outros.map((m) =>
          aEditar === m.id ? (
            <Formulario
              key={m.id}
              membro={m}
              processo={processo}
              aoFechar={() => setAEditar(null)}
              aoMudar={aoMudar}
            />
          ) : (
            <Cartao
              key={m.id}
              membro={m}
              aoEditar={() => setAEditar(m.id)}
              aoRemover={async () => {
                if (!confirm(`Remover ${m.nome} do agregado?`)) return;
                const r = await removerMembro(processo, m.id);
                if (r.ok) aoMudar();
                else alert(r.erro);
              }}
            />
          ),
        )}

        {novo ? (
          <Formulario processo={processo} aoFechar={() => setNovo(false)} aoMudar={aoMudar} />
        ) : (
          <button type="button" className="btn btn-secundario" onClick={() => setNovo(true)}>
            {t('adicionar')}
          </button>
        )}
      </section>
    </>
  );
}

function Cartao({
  membro,
  aoEditar,
  aoRemover,
}: {
  membro: Membro;
  aoEditar: () => void;
  aoRemover?: () => void;
}) {
  return (
    <div className="linha-membro">
      <div>
        <strong>{membro.nome}</strong>
        <p className="suave">
          {membro.nif ? `NIF ${membro.nif}` : 'Sem NIF'}
          {membro.nascimento ? ` · ${new Date(membro.nascimento).toLocaleDateString('pt-PT')}` : ''}
          {membro.relacao !== 'titular'
            ? ` · ${RELACOES.find((r) => r.id === membro.relacao)?.rotulo || membro.relacao}`
            : ''}
        </p>
        <p className="suave">
          {membro.tem_senha ? 'Senha das Finanças guardada' : 'Senha das Finanças por indicar'}
          {membro.dois_fatores ? ' · 2FA ativo' : ''}
        </p>
      </div>
      <div className="acoes-membro">
        <button type="button" className="btn btn-secundario" onClick={aoEditar}>
          Editar
        </button>
        {aoRemover && (
          <button type="button" className="btn btn-texto" onClick={aoRemover}>
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

function Formulario({
  membro,
  processo,
  fixo,
  aoFechar,
  aoMudar,
}: {
  membro?: Membro;
  processo: string;
  fixo?: boolean;
  aoFechar: () => void;
  aoMudar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [dois, setDois] = useState(membro?.dois_fatores ?? false);
  const [aGuardar, comecar] = useTransition();

  return (
    <form
      className="form-membro"
      action={(form) =>
        comecar(async () => {
          setErro(null);
          const r = await guardarMembro(processo, form);
          if (!r.ok) {
            setErro(r.erro || 'Não foi possível guardar.');
            return;
          }
          if (r.aviso) setAviso(r.aviso);
          aoMudar();
          if (!r.aviso) aoFechar();
        })
      }
    >
      <input type="hidden" name="id" value={membro?.id || ''} />
      <input type="hidden" name="relacao" value={fixo ? 'titular' : ''} />

      <label>
        Nome completo
        <input name="nome" defaultValue={membro?.nome || ''} required maxLength={200} />
      </label>
      <label>
        Data de nascimento
        <input type="date" name="nascimento" defaultValue={membro?.nascimento || ''} required
               max={new Date().toISOString().slice(0, 10)} />
      </label>
      <label>
        NIF
        <input name="nif" defaultValue={membro?.nif || ''} required inputMode="numeric" pattern="[0-9]{9}" />
      </label>

      {!fixo && (
        <label>
          Relação de parentesco
          <select name="relacao" defaultValue={membro?.relacao || ''} required>
            <option value="" disabled>
              Escolher
            </option>
            {RELACOES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.rotulo}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        Senha do Portal das Finanças
        <span className="pista" title={EXPLICACAO_SENHA} aria-label={EXPLICACAO_SENHA}>
          i
        </span>
        <input
          type="password"
          name="senha"
          autoComplete="new-password"
          placeholder={membro?.tem_senha ? 'Guardada — escreva para substituir' : ''}
        />
      </label>

      <label className="interruptor">
        <input
          type="checkbox"
          name="dois_fatores"
          checked={dois}
          onChange={(ev) => setDois(ev.target.checked)}
        />
        Tem autenticação de dois fatores ativa
      </label>
      {dois && (
        <p className="aviso-atencao">
          Com dois fatores ativo, entro em contacto para validar o acesso antes de submeter a declaração.
        </p>
      )}

      {erro && <p className="aviso-critico">{erro}</p>}
      {aviso && <p className="aviso-atencao">{aviso}</p>}

      <div className="acoes-membro">
        <button type="submit" className="btn" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : 'Guardar'}
        </button>
        <button type="button" className="btn btn-texto" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
