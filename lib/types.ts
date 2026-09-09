export type Mood = 'dreamy' | 'nostalgic' | 'calm' | 'warm' | 'energetic' | 'cinematic';
export type MoodVector = Record<Mood, number>;
export type Pin = { id: string; title: string; image: string; width: number; height: number; tags: string[]; board: string; mood: MoodVector; photographer: string; source: string };
export type Track = { id: string; title: string; artist: string; artwork: string; colors: [string,string]; duration: number; source: string; tags: string[]; mood: MoodVector; provider: 'mock' | 'soundcloud'; permalink?: string };
export type Signal = { pin: Pin; kind: 'open' | 'like' | 'save' | 'dwell' | 'dislike'; at: number };
export type Session = { id: string; name: string; mood: MoodVector; tracks: Track[]; artwork: string; createdAt: string };
export const neutral: MoodVector = {dreamy:.5, nostalgic:.4, calm:.6, warm:.3, energetic:.1, cinematic:.4};
