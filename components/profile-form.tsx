import { saveProfile } from '@/lib/profile-actions';

const EXPLICACAO_SENHA =
  'A senha é guardada cifrada e nunca lhe é mostrada de volta. No separador Acompanhamento vê a data e a hora de cada vez que a consultei.';
import { Submeter } from './forms';

export type PerfilPessoal = {
  full_name: string; birth_date: string | null; nif: string | null;
  phone: string | null; street: string | null; postal_code: string | null; locality: string | null;
  tax_residence?: string | null;
};

export default function FormularioPerfil({
  profile,
  twoFactor = false,
  editing = false,
  temSenha = false,
}: {
  profile: PerfilPessoal;
  twoFactor?: boolean;
  editing?: boolean;
  /** Já há senha guardada: o campo fica em branco e só substitui se escrever. */
  temSenha?: boolean;
}) {
  const residencia = profile.tax_residence || 'continente';
  return (
    <form action={saveProfile} className="pilha pilha-4 formulario-perfil">
      <input type="hidden" name="return" value={editing ? '/perfil' : '/onboarding'} />

      <label className="campo">
        <span>Nome completo</span>
        <input
          name="name"
          className="entrada"
          autoComplete="name"
          defaultValue={profile.full_name === 'Novo utilizador' ? '' : profile.full_name}
          required
          maxLength={200}
        />
      </label>

      <div className="grelha grelha-auto">
        <label className="campo">
          <span>NIF</span>
          <input
            name="nif"
            className="entrada"
            inputMode="numeric"
            pattern="[1-9][0-9]{8}"
            maxLength={9}
            defaultValue={profile.nif || ''}
            required
          />
        </label>
        <label className="campo">
          <span>Data de nascimento</span>
          <input
            name="birth_date"
            type="date"
            className="entrada"
            max={new Date().toISOString().slice(0, 10)}
            defaultValue={profile.birth_date || ''}
            required
          />
        </label>
      </div>

      <label className="campo">
        <span>Telemóvel</span>
        <input name="phone" type="tel" className="entrada" autoComplete="tel" maxLength={30} defaultValue={profile.phone || ''} required />
      </label>

      <label className="campo">
        <span>Morada — rua e número</span>
        <input
          name="street"
          className="entrada"
          autoComplete="address-line1"
          maxLength={300}
          defaultValue={profile.street || ''}
          required
        />
      </label>

      <div className="grelha grelha-auto">
        <label className="campo">
          <span>Código postal</span>
          <input
            name="postal_code"
            className="entrada"
            autoComplete="postal-code"
            pattern="[0-9]{4}-[0-9]{3}"
            placeholder="4470-147"
            defaultValue={profile.postal_code || ''}
            required
          />
        </label>
        <label className="campo">
          <span>Localidade</span>
          <input
            name="locality"
            className="entrada"
            autoComplete="address-level2"
            maxLength={100}
            defaultValue={profile.locality || ''}
            required
          />
        </label>
      </div>

      <label className="campo">
        <span className="rotulo">Residência fiscal</span>
        <select name="tax_residence" className="entrada" defaultValue={residencia} required>
          <option value="continente">Continente</option>
          <option value="acores">Açores</option>
          <option value="madeira">Madeira</option>
          <option value="ue">Outro país da União Europeia</option>
          <option value="fora_ue">Fora da União Europeia</option>
        </select>
      </label>

      {/* Fora da UE a declaração não entra sem representante fiscal, por isso
          pergunta-se aqui em vez de descobrir isso em maio. */}
      <div className="representante" hidden>
        <label className="campo">
          <span className="rotulo">Nome do representante fiscal</span>
          <input name="rep_name" className="entrada" maxLength={200} />
        </label>
        <label className="campo">
          <span className="rotulo">NIF do representante</span>
          <input name="rep_nif" className="entrada" maxLength={30} />
        </label>
        <label className="campo">
          <span className="rotulo">Email do representante</span>
          <input name="rep_email" type="email" className="entrada" maxLength={200} />
        </label>
        <label className="campo">
          <span className="rotulo">Telefone do representante</span>
          <input name="rep_phone" type="tel" className="entrada" maxLength={40} />
        </label>
      </div>

      <label className="campo">
        <span className="rotulo">Senha do Portal das Finanças</span>
        <input
          type="password"
          name="senha_financas"
          className="entrada"
          autoComplete="new-password"
          maxLength={60}
          placeholder={temSenha ? 'Guardada — escreva para substituir' : ''}
        />
        <span className="pista" title={EXPLICACAO_SENHA} aria-label={EXPLICACAO_SENHA}>i</span>
      </label>

      <label className="caixa">
        <input type="checkbox" name="two_factor" defaultChecked={twoFactor} />
        <span className="pequeno">
          Tenho autenticação de dois fatores ativa no Portal das Finanças.
          <br />
          <span className="tenue">Se marcar, sou avisado para combinar consigo o acesso.</span>
        </span>
      </label>

      <p className="micro tenue">
        O nome é preenchido por si — não consultamos dados na Autoridade Tributária através do NIF.
      </p>

      <Submeter>{editing ? 'Guardar dados pessoais' : 'Guardar e começar o IRS'}</Submeter>
    </form>
  );
}
