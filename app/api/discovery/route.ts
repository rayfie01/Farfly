import { mockMusic, mockVisuals } from '@/lib/providers/mock';
import { neutral } from '@/lib/types';
import { musicQueries, rankTracks } from '@/lib/mood';
export async function GET(request:Request){const url=new URL(request.url);if(process.env.PROVIDER_MODE==='production')return Response.json({error:'Production discovery requires account-scoped OAuth connections and a configured vision service.'},{status:503});const [visuals,music]=await Promise.all([mockVisuals.getPins({cursor:url.searchParams.get('cursor')||undefined,query:url.searchParams.get('q')||''}),mockMusic.searchTracks()]);return Response.json({mode:'mock',visuals,tracks:rankTracks(music,neutral),queries:musicQueries(neutral)});}
