import test from 'node:test';
import assert from 'node:assert/strict';
import {erroDaPalavraPasse,REGRAS} from '../lib/palavra-passe.ts';

test('8 caracteres com maiúscula, minúscula, número e símbolo',()=>{
 for(const p of ['Abcdef1!','Ção1234€','aB3$aB3$'])assert.equal(erroDaPalavraPasse(p),null,p);
 for(const p of ['abcdef1!','ABCDEF1!','Abcdefg!','Abcdef12','Ab1!','A'.repeat(129)+'b1!'])assert.ok(erroDaPalavraPasse(p),p);
});
test('a confirmação tem de coincidir',()=>{
 assert.ok(erroDaPalavraPasse('Abcdef1!','Abcdef1?'));
 assert.equal(erroDaPalavraPasse('Abcdef1!','Abcdef1!'),null);
});
test('as cinco regras do ecrã são as mesmas do servidor',()=>{
 assert.deepEqual(REGRAS.map(r=>r.id),['tamanho','maiuscula','minuscula','numero','simbolo']);
});
