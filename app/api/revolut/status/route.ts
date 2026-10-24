import {NextResponse,type NextRequest} from 'next/server';
import {identity} from '@/lib/auth';
import {uuid} from '@/lib/data';
import {reconcilePayment} from '@/lib/revolut';
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Forbidden'},{status:403});
 const {client}=await identity();let body;try{body=await request.json();}catch{return NextResponse.json({error:'Invalid request'},{status:400});}
 if(!uuid(String(body.id||'')))return NextResponse.json({error:'Invalid request'},{status:400});
 const {data:payment}=await client.from('irs_checkouts').select('id,state,last_checked_at').eq('id',body.id).single();if(!payment)return NextResponse.json({error:'Unavailable'},{status:404});
 if(payment.last_checked_at&&Date.now()-Date.parse(payment.last_checked_at)<5000)return NextResponse.json({state:payment.state},{headers:{'Cache-Control':'no-store'}});
 try{return NextResponse.json({state:await reconcilePayment(payment.id)},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Unavailable'},{status:503});}
}
