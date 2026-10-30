'use server';
import { supabase } from './supabase';

/** Se quem está no IRS também tem o portal Empresas (para o botão de mudar de
    portal). A base decide, pela mesma função que o portal Empresas usa. */
export async function temPortalEmpresas() {
  try {
    const client = await supabase();
    const { data } = await client.rpc('portal_empresas');
    return Boolean(data?.acesso_empresas && !data?.is_staff);
  } catch {
    return false;
  }
}
