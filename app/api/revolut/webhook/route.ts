import {NextResponse,type NextRequest} from 'next/server';
import {adminClient} from '@/lib/admin-client';
import {paymentsReady,reconcilePayment} from '@/lib/revolut';
import {validWebhookSignature,orderId,limitedRequestBody} from '@/lib/revolut-core';
export async function POST(request:NextRequest){
 if(!paymentsReady()||!process.env.REVOLUT_WEBHOOK_SECRET)return NextResponse.json({error:'Unavailable'},{status:503});
 if(Number(request.headers.get('content-length')||0)>65536)return new NextResponse(null,{status:413});
 const raw=await limitedRequestBody(request);if(raw===null)return new NextResponse(null,{status:413});
 if(!validWebhookSignature(raw,request.headers.get('Revolut-Request-Timestamp'),request.headers.get('Revolut-Signature'),process.env.REVOLUT_WEBHOOK_SECRET))return new NextResponse(null,{status:401});
 let event;try{event=JSON.parse(raw);}catch{return new NextResponse(null,{status:400});}
 if(!orderId(event.order_id))return new NextResponse(null,{status:400});
 const {data:payment}=await adminClient().from('irs_checkouts').select('id').eq('provider_order_id',event.order_id).single();if(!payment)return new NextResponse(null,{status:200});
 try{await reconcilePayment(payment.id);return new NextResponse(null,{status:200});}catch{return new NextResponse(null,{status:503});}
}
