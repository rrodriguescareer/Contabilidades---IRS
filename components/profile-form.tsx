import { saveProfile } from '@/lib/profile-actions';
import { Submeter } from './forms';

export type PerfilPessoal = {
  full_name: string; birth_date: string | null; nif: string | null;
  phone: string | null; street: string | null; postal_code: string | null; locality: string | null;
};

export default function FormularioPerfil({
  profile,
  twoFactor = false,
  editing = false,
}: {
  profile: PerfilPessoal;
  twoFactor?: boolean;
  editing?: boolean;
}) {
  return (
    <form action={saveProfile} className="pilha pilha-4">
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

      <label className="caixa">
        <input type="checkbox" name="two_factor" defaultChecked={twoFactor} />
        <span className="pequeno">
          Tenho autenticação de dois fatores ativa no Portal das Finanças.
          <br />
          <span className="tenue">Se marcar, sou avisado para combinar consigo o acesso.</span>
        </span>
      </label>

      <p className="micro tenue">
        O nome é preenchido por si — não consultamos dados na Autoridade Tributária através do NIF. Nunca
        introduza aqui senhas das Finanças.
      </p>

      <Submeter>{editing ? 'Guardar dados pessoais' : 'Guardar e começar o IRS'}</Submeter>
    </form>
  );
}
