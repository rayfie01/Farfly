import { handlePinterest } from '@/lib/pinterest-server';
import { withAccountConnection } from '@/lib/account-connections';
export const dynamic='force-dynamic';
const handle=(req:Request)=>withAccountConnection(req,'pinterest',handlePinterest);
export const GET=handle;
export const POST=handle;

