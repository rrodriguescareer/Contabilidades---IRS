import {NextResponse,type NextRequest} from 'next/server';
export async function GET(request:NextRequest,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!/^[a-f0-9]{64}$/.test(token))return NextResponse.redirect(new URL('/entrar?erro=Convite%20inválido.',request.url));
 const response=NextResponse.redirect(new URL('/convites/aceitar',request.url));
 response.cookies.set('rr_invite',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:604800});
 response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
