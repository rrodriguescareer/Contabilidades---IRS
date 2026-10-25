import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { comprimirDocumento, nomeGuardado } from '../lib/comprimir.ts';

/** Uma fotografia de recibo como as que chegam do telemóvel. */
async function fotografia(largura = 4032, altura = 3024) {
  const linhas = Array.from(
    { length: 30 },
    (_, i) =>
      `<text x="300" y="${260 + i * 80}" font-family="Helvetica" font-size="36" fill="#111">` +
      `Linha ${i + 1} — servico prestado · 1.234,56 EUR · IVA 23%</text>`,
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
    <rect width="100%" height="100%" fill="#f6f4ef"/>${linhas}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

test('a fotografia encolhe muito e continua legivel', async () => {
  const original = await fotografia();
  const guardado = await comprimirDocumento(new Uint8Array(original), 'image/jpeg');

  assert.equal(guardado.mime, 'image/webp');
  assert.equal(guardado.convertido, true);
  assert.ok(
    guardado.bytes.byteLength < original.byteLength / 2,
    `esperava menos de metade, ficou ${guardado.bytes.byteLength} de ${original.byteLength}`,
  );

  // A medida maior fica no limite: o texto fino continua a ler-se.
  const medida = await sharp(Buffer.from(guardado.bytes)).metadata();
  assert.equal(Math.max(medida.width, medida.height), 2600);
});

test('um PDF e guardado tal como chega', async () => {
  const pdf = new Uint8Array(Buffer.from('%PDF-1.4\nconteudo\n'));
  const guardado = await comprimirDocumento(pdf, 'application/pdf');
  assert.equal(guardado.convertido, false);
  assert.equal(guardado.mime, 'application/pdf');
  assert.deepEqual(guardado.bytes, pdf);
});

test('uma imagem pequena nunca fica maior do que era', async () => {
  const pequena = await sharp({ create: { width: 240, height: 160, channels: 3, background: '#fff' } })
    .jpeg({ quality: 60 })
    .toBuffer();
  const guardado = await comprimirDocumento(new Uint8Array(pequena), 'image/jpeg');
  assert.ok(guardado.bytes.byteLength <= pequena.byteLength);
});

test('um ficheiro ilegivel passa sem conversao em vez de rebentar', async () => {
  const lixo = new Uint8Array([255, 216, 255, 1, 2, 3, 4, 5]);
  const guardado = await comprimirDocumento(lixo, 'image/jpeg');
  assert.equal(guardado.convertido, false);
  assert.deepEqual(guardado.bytes, lixo);
});

test('o nome guardado leva a extensao do que ficou no disco', () => {
  assert.equal(nomeGuardado('Recibo de Janeiro.JPEG', 'webp'), 'Recibo de Janeiro.webp');
  assert.equal(nomeGuardado('declaracao.pdf', 'pdf'), 'declaracao.pdf');
  assert.equal(nomeGuardado('sem-extensao', 'webp'), 'sem-extensao.webp');
});
