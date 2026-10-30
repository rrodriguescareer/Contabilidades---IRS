/* Do lado do browser: preparar um documento e carregá-lo para o endereço
 * assinado do Storage, com o progresso.
 *
 * O Vercel recusa pedidos com mais de 4,5 MB, por isso o ficheiro já não passa
 * pelo servidor. As fotografias de telemóvel passam a WebP, até 2600px — o
 * texto continua nítido —, antes de sair do telemóvel; onde o browser não
 * codifica WebP, passam a JPEG. Os PDF seguem como estão: reescrevê-los
 * arriscava estragar assinaturas digitais. */

const MEDIDA = 2600;
export const MAXIMO = 10 * 1024 * 1024;

export type Pronto = { blob: Blob; nome: string; mime: string; original: number; hash: string };

/** O tipo real, pelos primeiros bytes: a extensão e o tipo declarado não chegam. */
export function tipoReal(b: Uint8Array): string | null {
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

const comExtensao = (nome: string, mime: string) =>
  `${(nome.replace(/\.[^.]+$/, '') || 'documento').slice(0, 200)}.${mime === 'image/webp' ? 'webp' : 'jpg'}`;

const paraBlob = (tela: HTMLCanvasElement, tipo: string, qualidade: number) =>
  new Promise<Blob | null>((r) => tela.toBlob(r, tipo, qualidade));

async function comprimir(f: File): Promise<Blob | null> {
  const imagem = await createImageBitmap(f, { imageOrientation: 'from-image' });
  const escala = Math.min(1, MEDIDA / Math.max(imagem.width, imagem.height));
  const tela = document.createElement('canvas');
  tela.width = Math.max(1, Math.round(imagem.width * escala));
  tela.height = Math.max(1, Math.round(imagem.height * escala));
  const ctx = tela.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(imagem, 0, 0, tela.width, tela.height);
  imagem.close();
  const webp = await paraBlob(tela, 'image/webp', 0.82);
  if (webp?.type === 'image/webp') return webp;
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tela.width, tela.height);
  const jpeg = await paraBlob(tela, 'image/jpeg', 0.85);
  return jpeg?.type === 'image/jpeg' ? jpeg : null;
}

/** O documento pronto a enviar, ou o motivo por que não pode seguir. O
    resumo é do ficheiro escolhido, não do convertido: o mesmo original
    continua a ser reconhecido como repetido. */
export async function preparar(f: File): Promise<Pronto | { erro: string }> {
  const bytes = await f.arrayBuffer();
  const mime = tipoReal(new Uint8Array(bytes.slice(0, 16)));
  if (!mime) return { erro: 'O conteúdo do ficheiro não corresponde a PDF, JPEG, PNG ou WebP.' };
  const resumo = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(resumo), (x) => x.toString(16).padStart(2, '0')).join('');
  if (mime === 'image/jpeg' || mime === 'image/png') {
    const menor = await comprimir(f).catch(() => null);
    if (menor && menor.size < f.size && menor.size <= MAXIMO) {
      return { blob: menor, nome: comExtensao(f.name, menor.type), mime: menor.type, original: f.size, hash };
    }
  }
  if (f.size > MAXIMO) return { erro: 'O ficheiro tem mais de 10 MB.' };
  return { blob: f, nome: (f.name || 'documento').slice(0, 200), mime, original: f.size, hash };
}

/** Carrega para o endereço assinado. Um envio retomado pode já ter o ficheiro
    lá: conta como carregado, e a conclusão confirma-o no Storage. */
export function carregar(url: string, p: Pronto, progresso: (fracao: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', url);
    x.setRequestHeader('Content-Type', p.mime);
    x.setRequestHeader('x-upsert', 'false');
    x.setRequestHeader('cache-control', 'max-age=3600');
    x.upload.onprogress = (e) => { if (e.lengthComputable) progresso(e.loaded / e.total); };
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return resolve();
      if (/already exists|Duplicate/i.test(x.responseText || '')) return resolve();
      reject(new Error(`Estado ${x.status}`));
    };
    x.onerror = () => reject(new Error('Sem ligação'));
    x.ontimeout = () => reject(new Error('Demorou demasiado'));
    x.timeout = 10 * 60 * 1000;
    x.send(p.blob);
  });
}
