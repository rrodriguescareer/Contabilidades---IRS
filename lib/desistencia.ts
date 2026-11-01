'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { session } from './auth';
import { avisarDesistencia } from './avisos';

/* O pedido de desistência do serviço, em «A minha conta». Quem decide se
   pode pedir é a base: só o titular da conta, e só enquanto o processo não
   está fechado. */

const texto = (f: FormData, c: string, max = 2000) => String(f.get(c) || '').trim().slice(0, max);
const voltar = (chave: 'erro' | 'mensagem', t: string): never => redirect(`/perfil?${chave}=${encodeURIComponent(t)}#desistencia`);

export async function pedirDesistencia(form: FormData) {
  const { client, context } = await session();
  const processo = texto(form, 'processo', 40);
  if (!context.cases?.some((c: { id: string }) => c.id === processo)) voltar('erro', 'Processo indisponível.');
  if (form.get('confirmo') !== 'on') voltar('erro', 'Confirme que quer desistir do serviço.');
  const motivo = texto(form, 'motivo');
  const { data, error } = await client.rpc('pedir_desistencia', { processo, p_motivo: motivo || null });
  if (error || !data?.id) {
    voltar('erro', /pendente/.test(error?.message || '') ? 'Já tem um pedido de desistência a aguardar decisão.'
      : /concluído/.test(error?.message || '') ? 'O processo já está concluído.'
      : /authorized/i.test(error?.message || '') ? 'Só o titular da conta pode pedir a desistência.'
      : 'Não foi possível registar o pedido. Tente novamente.');
  }
  await avisarDesistencia(processo, context.id, data.id, Boolean(data.dentro_do_prazo), motivo).catch(() => {});
  revalidatePath('/perfil');
  voltar('mensagem', 'Pedido de desistência enviado. Recebe a confirmação por email e a decisão aqui e no portal.');
}

export async function anularDesistencia(form: FormData) {
  const { client } = await session();
  const { error } = await client.rpc('anular_desistencia', { pedido: texto(form, 'pedido', 40) });
  if (error) voltar('erro', 'Não foi possível anular o pedido.');
  revalidatePath('/perfil');
  voltar('mensagem', 'Pedido de desistência anulado. O processo continua.');
}
