import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptedLegal,LEGAL_VERSION} from '../lib/legal.ts';
test('legal confirmation must be explicit, not merely present',()=>{const form=new FormData();assert.equal(acceptedLegal(form),false);for(const value of ['','false','on','0']){form.set('consent',value);assert.equal(acceptedLegal(form),false);}form.set('consent','accepted');assert.equal(acceptedLegal(form),true);});
test('accepted terms and privacy have a defined common version',()=>assert.equal(LEGAL_VERSION,'2026-10-23.1'));
