// Server-side authenticated encryption; no plaintext credentials reach client JavaScript.
const encoder = new TextEncoder();
const decoder = new TextDecoder();
export function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function decode(value: string) {
  return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c=>c.charCodeAt(0));
}
async function key(secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(secret)) throw new Error('Session key must be 32 random bytes in hex.');
  return crypto.subtle.importKey('raw', Uint8Array.from(secret.match(/../g)!, x=>parseInt(x,16)), 'AES-GCM', false, ['encrypt','decrypt']);
}
export async function seal(kind: string, value: string, expires: number, secret: string) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=encoder.encode(JSON.stringify({kind,value,expires}));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('farfly-pinterest-v1')},await key(secret),data);
  return encode(iv)+'.'+encode(new Uint8Array(encrypted));
}
export async function unseal(raw: string|undefined, kind: string, secret: string): Promise<{value:string;expires:number}|null> {
  try {
    if (!raw || raw.length>3800) return null;
    const parts=raw.split('.');
    if(parts.length!==2)return null;
    const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(parts[0]),additionalData:encoder.encode('farfly-pinterest-v1')},await key(secret),decode(parts[1]));
    const result=JSON.parse(decoder.decode(data));
    if(result.kind!==kind || typeof result.value!=='string' || !Number.isFinite(result.expires) || result.expires<=Date.now())return null;
    return {value:result.value,expires:result.expires};
  } catch { return null; }
}
