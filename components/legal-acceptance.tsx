import Link from 'next/link';
import { LEGAL_ACCEPTED_VALUE } from '@/lib/legal';
export default function LegalAcceptance(){return <label className="check legal-check"><input type="checkbox" name="consent" value={LEGAL_ACCEPTED_VALUE} required/><span>Li e aceito os <Link href="/termos" target="_blank" rel="noopener noreferrer">Termos e Condições</Link> e a <Link href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>.</span></label>;}
