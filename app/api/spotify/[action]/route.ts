import { handleSpotify } from '@/lib/spotify-server';
import { withAccountConnection } from '@/lib/account-connections';
export const dynamic='force-dynamic';
const handle=(req:Request)=>withAccountConnection(req,'spotify',handleSpotify);
export const GET=handle;
export const POST=handle;

