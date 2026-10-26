'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { identity } from './auth';
import { supabase } from './supabase';
import { adminClient } from './admin-client';

type Resposta = { ok: boolean; erro?: string; resumo?: string };

const BALDE = 'irs-documents';

/** O que está em jogo, para o ecrã poder dizê-lo antes de perguntar. */
export async function verConflito(nif: string) {
  const cliente = await supabase();
  const { data, error } = await cliente.rpc('conflito_de_nif', { contribuinte: nif });
  if (error) return { tipo: 'erro' as const, erro: error.message };
  return (data || { tipo: 'nenhum' }) as { tipo: string; relacao?: string; com_historico?: boolean };
}

/* Apagar a conta anterior.
   A base apaga as linhas; os ficheiros no armazenamento são apagados aqui,
   porque a base não lhes chega. Se esta segunda parte falhar, ficam ficheiros
   órfãos — chatos, mas inofensivos: as linhas que lhes davam sentido já não
   existem, e ninguém tem caminho para eles. */
export async function apagarContaAnterior(nif: string, confirmacao: string): Promise<Resposta> {
  await identity();
  const cliente = await supabase();
  const { data, error } = await cliente.rpc('apagar_conta_do_nif', {
    contribuinte: nif,
    confirmacao,
  });
  if (error) return { ok: false, erro: error.message };

  const resultado = data as { apagados: Record<string, number>; ficheiros: string[] };
  const ficheiros = resultado.ficheiros || [];
  if (ficheiros.length > 0) {
    try {
      await adminClient().storage.from(BALDE).remove(ficheiros);
    } catch {
      /* ver comentário acima */
    }
  }

  const a = resultado.apagados || {};
  revalidatePath('/onboarding');
  return {
    ok: true,
    resumo: `Apagados ${a.processos || 0} processo(s), ${a.rendimentos || 0} rendimento(s) e ${a.documentos || 0} documento(s).`,
  };
}

/* Sair de um agregado alheio para conta própria.
   Os ficheiros são copiados antes de as linhas se moverem: se a cópia falhar
   a meio, as linhas ficam onde estavam e nada se perde. O contrário — mover
   as linhas primeiro — deixaria documentos a apontar para o vazio. */
export async function migrarDoAgregado(nif: string, confirmacao: string): Promise<Resposta> {
  const { context } = await identity();
  const cliente = await supabase();

  const { data: plano, error: erroPlano } = await cliente.rpc('preparar_migracao_do_agregado', {
    contribuinte: nif,
  });
  if (erroPlano) return { ok: false, erro: erroPlano.message };

  const info = plano as {
    processo_antigo: string;
    rendimentos: number;
    documentos: { id: string; caminho: string; nome: string; tipo: string; categoria: string | null; descricao: string | null; mime: string; tamanho: number; hash: string; rendimento: string | null }[];
  };

  const conta = context.accounts?.[0]?.id;
  const processo = context.cases?.[0]?.id;
  if (!conta || !processo) return { ok: false, erro: 'Complete primeiro o seu registo.' };

  const admin = adminClient();
  const movidos: Record<string, unknown>[] = [];

  for (const doc of info.documentos || []) {
    const novoId = randomUUID();
    const novoCaminho = `${conta}/${processo}/${novoId}`;
    const { error: copia } = await admin.storage.from(BALDE).copy(doc.caminho, novoCaminho);
    if (copia) {
      return { ok: false, erro: 'Não foi possível copiar os documentos. Nada foi alterado.' };
    }
    movidos.push({
      id: doc.id,
      novo_id: novoId,
      novo_caminho: novoCaminho,
      nome: doc.nome,
      tipo: doc.tipo,
      categoria: doc.categoria,
      descricao: doc.descricao,
      mime: doc.mime,
      tamanho: doc.tamanho,
      hash: doc.hash,
      // O rendimento mantém o id ao mudar de processo: a ligação segue.
      rendimento: doc.rendimento,
    });
  }

  const { data, error } = await cliente.rpc('concluir_migracao_do_agregado', {
    contribuinte: nif,
    confirmacao,
    documentos: movidos,
  });
  if (error) {
    // Reverte as cópias: sem as linhas, são lixo.
    for (const m of movidos) {
      try {
        await admin.storage.from(BALDE).remove([String(m.novo_caminho)]);
      } catch {
        /* nada a fazer */
      }
    }
    return { ok: false, erro: error.message };
  }

  // Só agora se apagam os originais: antes disto ainda eram a única cópia.
  const antigos = (info.documentos || []).map((d) => d.caminho);
  if (antigos.length > 0) {
    try {
      await admin.storage.from(BALDE).remove(antigos);
    } catch {
      /* ficheiros órfãos, sem linha que lhes dê sentido */
    }
  }

  const r = data as { rendimentos: number; documentos: number };
  revalidatePath('/app');
  return {
    ok: true,
    resumo: `Migrados ${r.rendimentos} rendimento(s) e ${r.documentos} documento(s). Volte a escrever a senha das Finanças — essa não migra.`,
  };
}
