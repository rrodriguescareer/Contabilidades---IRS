import Link from 'next/link';
import { session } from '@/lib/auth';
import { changeEmail, changeOwnPassword } from '@/lib/profile-actions';
import { signOut } from '@/lib/auth-actions';
import { anularDesistencia, pedirDesistencia } from '@/lib/desistencia';
import FormularioPerfil, { type PerfilPessoal } from '@/components/profile-form';
import { Submeter } from '@/components/forms';
import { CampoPalavraPasse } from '@/components/campo-palavra-passe';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'A minha conta' };

export default async function Perfil({ searchParams }: { searchParams: Promise<{ erro?: string; mensagem?: string }> }) {
  const { client, user, context } = await session();
  const parametros = await searchParams;
  const perfil = context.profile;

  const { data: pessoa } = perfil?.nif
    ? await client.from('people').select('tax_two_factor').eq('nif', perfil.nif).limit(1)
    : { data: [] };

  // O processo mais recente e os pedidos de desistência que já houve.
  const processo = [...(context.cases ?? [])].sort((a, b) => b.tax_year - a.tax_year)[0];
  const { data: pedidos } = processo
    ? await client.from('pedidos_desistencia').select('id,estado,motivo,resposta,dentro_do_prazo,criado_em,tratado_em')
        .eq('case_id', processo.id).order('criado_em', { ascending: false }).limit(5)
    : { data: [] };
  const pendente = pedidos?.find((p) => p.estado === 'pendente');
  const quando = (iso: string | null) => iso
    ? new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', dateStyle: 'long', timeStyle: 'short' }) : '';
  const ESTADO_PEDIDO: Record<string, string> = { aceite: 'Aceite', recusado: 'Recusado', anulado: 'Anulado por si' };

  return (
    <main
      id="principal"
      className="envolve"
      style={{ paddingBlock: 'var(--e-5) var(--e-8)', display: 'grid', gap: 'var(--e-5)', maxWidth: '52rem' }}
    >
      <Link href="/app" className="btn btn-discreto btn-sm" style={{ justifySelf: 'start' }}>
        ← Voltar ao IRS
      </Link>
      <h1>A minha conta</h1>

      {parametros.erro && (
        <p className="aviso aviso-critico" role="alert">
          {parametros.erro}
        </p>
      )}
      {parametros.mensagem && (
        <p className="aviso aviso-positivo" role="status">
          {parametros.mensagem}
        </p>
      )}

      <section className="cartao pilha pilha-4">
        <h2 className="pequeno maiusc suave">Dados pessoais</h2>
        <FormularioPerfil profile={perfil as PerfilPessoal} twoFactor={pessoa?.[0]?.tax_two_factor} editing />
      </section>

      <div className="grelha grelha-2">
        <section className="cartao pilha pilha-4">
          <h2 className="pequeno maiusc suave">Alterar email</h2>
          <p className="pequeno suave">Endereço atual: {user.email}</p>
          <form action={changeEmail} className="pilha pilha-4">
            <label className="campo">
              <span>Novo email</span>
              <input name="email" type="email" className="entrada" autoComplete="email" required maxLength={254} />
            </label>
            <label className="campo">
              <span>Palavra-passe atual</span>
              <input name="current_password" type="password" className="entrada" autoComplete="current-password" required maxLength={128} />
            </label>
            <Submeter className="btn btn-secundario">Pedir alteração</Submeter>
            <p className="micro tenue">Só fica concluída depois de confirmar as ligações enviadas por email.</p>
          </form>
        </section>

        <section className="cartao pilha pilha-4">
          <h2 className="pequeno maiusc suave">Alterar palavra-passe</h2>
          <form action={changeOwnPassword} className="pilha pilha-4">
            <label className="campo">
              <span>Palavra-passe atual</span>
              <input name="current_password" type="password" className="entrada" autoComplete="current-password" required maxLength={128} />
            </label>
            <CampoPalavraPasse rotulo="Nova palavra-passe" />
            <Submeter className="btn btn-secundario">Guardar palavra-passe</Submeter>
          </form>
        </section>
      </div>

      {processo && (
        <section id="desistencia" className="cartao pilha pilha-4">
          <h2 className="pequeno maiusc suave">Desistência do serviço</h2>
          <p className="pequeno">
            Pode desistir do serviço de preparação do IRS {processo.tax_year} sem indicar motivo nos 14 dias seguintes à
            contratação (o pagamento). Como pediu que o serviço começasse antes do fim desse prazo, se já tiver sido
            prestada parte do serviço, paga apenas a parte proporcional. Depois de o serviço estar totalmente prestado (a
            declaração entregue), deixa de haver direito de livre resolução. Fora destes casos, pode pedir na mesma: o
            contabilista analisa cada pedido.
          </p>
          {pendente ? (
            <div className="pilha pilha-3">
              <p className="aviso aviso-atencao">
                Pedido enviado a {quando(pendente.criado_em)}, a aguardar decisão do contabilista
                {pendente.dentro_do_prazo ? ' (dentro dos 14 dias de livre resolução)' : ''}.
              </p>
              <form action={anularDesistencia}>
                <input type="hidden" name="pedido" value={pendente.id} />
                <Submeter className="btn btn-secundario">Anular o pedido e continuar o processo</Submeter>
              </form>
            </div>
          ) : processo.status === 'closed' ? (
            <p className="pequeno suave">O processo está concluído: já não há nada a cancelar.</p>
          ) : (
            <form action={pedirDesistencia} className="pilha pilha-4">
              <input type="hidden" name="processo" value={processo.id} />
              <label className="campo">
                <span>Motivo (opcional)</span>
                <textarea name="motivo" className="entrada" rows={3} maxLength={2000}
                          placeholder="Pode deixar em branco. Ajuda-nos a melhorar." />
              </label>
              <label className="caixa">
                <input type="checkbox" name="confirmo" required />
                <span className="pequeno">Quero desistir do serviço de preparação do IRS {processo.tax_year}.</span>
              </label>
              <Submeter className="btn btn-critico">Enviar pedido de desistência</Submeter>
              <p className="micro tenue">Recebe a confirmação por email. A decisão e, se houver, o reembolso aparecem no portal.</p>
            </form>
          )}
          {pedidos && pedidos.filter((p) => p.estado !== 'pendente').length > 0 && (
            <ul className="lista-simples pequeno">
              {pedidos.filter((p) => p.estado !== 'pendente').map((p) => (
                <li key={p.id}>
                  {quando(p.criado_em)} — <strong>{ESTADO_PEDIDO[p.estado] ?? p.estado}</strong>
                  {p.resposta ? `: ${p.resposta}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <form action={signOut}>
        <button className="btn btn-discreto">Terminar sessão</button>
      </form>
    </main>
  );
}
