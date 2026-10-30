import test from 'node:test';
import assert from 'node:assert/strict';
import { tipoReal } from '../lib/carregar.ts';

const bytes = (...b) => new Uint8Array(b);

test('the real type comes from the first bytes, not from the name', () => {
  assert.equal(tipoReal(new TextEncoder().encode('%PDF-1.7')), 'application/pdf');
  assert.equal(tipoReal(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
  assert.equal(tipoReal(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'image/png');
  assert.equal(tipoReal(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(tipoReal(new TextEncoder().encode('<html><body>')), null);
  assert.equal(tipoReal(new TextEncoder().encode('RIFF\0\0\0\0WAVE')), null);
});
