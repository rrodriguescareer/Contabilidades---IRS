import test from 'node:test';
import assert from 'node:assert/strict';
import {personError,validBirthDate} from '../lib/validation.ts';
const today='2026-10-23';
const fields={name:'Nome completo',birth:'1980-02-29',nif:'123456789',email:'cliente@example.com',phone:'+351 936 432 519',address:'Rua de exemplo, 4470-147 Maia',password:'uma-palavra-passe-longa'};
test('birth dates reject calendar overflow and future days',()=>{
 for(const date of ['2025-02-29','2024-02-30','2020-04-31','0000-01-01','1980-13-01','1980-00-01','1980-1-01','2026-10-24','invalid'])assert.equal(validBirthDate(date,today),false,date);
 for(const date of ['1980-02-29','2024-02-29','2026-10-23'])assert.equal(validBirthDate(date,today),true,date);
});
test('household validation permits an omitted email but rejects invalid identity input',()=>{
 assert.equal(personError(fields.name,fields.birth,fields.nif,'',today),null);
 assert.ok(personError(' ',fields.birth,fields.nif,'',today));
 assert.ok(personError('x'.repeat(201),fields.birth,fields.nif,'',today));
 assert.ok(personError(fields.name,fields.birth,'000000000','',today));
 assert.ok(personError(fields.name,fields.birth,fields.nif,'wrong@',today));
});
