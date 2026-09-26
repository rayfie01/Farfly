import { NextResponse, type NextRequest } from 'next/server';
import { getAccount, privateHeaders } from './lib/account-server';
export async function proxy(req:NextRequest){
 try{const account=await getAccount(req);if(!account)return NextResponse.redirect(new URL('/auth',req.url));const res=NextResponse.next();for(const c of account.cookies)res.headers.append('Set-Cookie',c);for(const [k,v] of Object.entries(privateHeaders))res.headers.set(k,v);return res;}catch{return new NextResponse('Sign-in is temporarily unavailable. Please reload shortly.',{status:503,headers:privateHeaders});}
}
export const config={matcher:['/','/explore/:path*','/moods/:path*','/saved/:path*','/pinterest/:path*','/spotify/:path*','/profile/:path*']};

