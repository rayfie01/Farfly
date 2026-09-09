import { neutral, type MoodVector, type Signal, type Track } from './types';
const weights = { open: 2, like: 4, save: 5, dwell: 1, dislike: -3 };
export function aggregate(signals: Signal[], now = Date.now()): MoodVector {
  const result = {...neutral}; let total = 1;
  for (const s of signals.slice(-30)) {
    const weight = weights[s.kind] * Math.exp(-(now - s.at) / 600000);
    for (const k of Object.keys(result) as (keyof MoodVector)[]) result[k] += s.pin.mood[k] * weight;
    total += Math.abs(weight);
  }
  for (const k of Object.keys(result) as (keyof MoodVector)[]) result[k] = Math.max(0, Math.min(1,result[k] / total));
  return result;
}
export function moodName(m: MoodVector) {
  if (m.warm > .55) return 'Summer Memory';
  if (m.energetic > .48) return 'City After Dark';
  if (m.calm > .68) return 'Quiet Morning';
  return 'Midnight Nostalgia';
}
export function moodTags(m: MoodVector) { return (Object.keys(m) as (keyof MoodVector)[]).sort((a,b)=>m[b]-m[a]).slice(0,3); }
export function musicQueries(m: MoodVector) { return [...new Set(moodTags(m).flatMap(t=>({dreamy:['dream pop','ethereal alternative'], nostalgic:['nostalgic indie','atmospheric indie'],calm:['ambient pop','late-night chill'],warm:['mellow soul','sunset electronic'],energetic:['indie dance','electronic groove'],cinematic:['ambient cinematic','downtempo']}[t])))]; }
export function rankTracks(tracks: Track[], mood: MoodVector, liked: string[] = [], skipped: string[] = []) {
  const score = (t:Track) => Object.keys(mood).reduce((n,k)=>n + mood[k as keyof MoodVector] * t.mood[k as keyof MoodVector],0) + (liked.includes(t.id) ? .3 : 0) - (skipped.includes(t.id) ? 1 : 0);
  return tracks.filter(t=>Boolean(t.source)).sort((a,b)=>score(b)-score(a));
}
