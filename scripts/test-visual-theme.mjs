import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const modules=new Map();
async function moduleUrl(path){
 if(modules.has(path))return modules.get(path);
 let source=ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const dependencies=[...source.matchAll(/from ['"](\.[^'"]+)['"]/g)];
 for(const match of dependencies){
  const resolved=new URL(match[1]+'.ts',new URL(path,import.meta.url));
  const child=await moduleUrl(resolved.href);
  source=source.replace(match[0],'from '+JSON.stringify(child));
 }
 const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
 modules.set(path,url);return url;
}
const {paletteFromPixels,paletteFromHex}=await import(await moduleUrl('../lib/visual-theme.ts'));
assert.equal(paletteFromPixels([255,0,0,255]).hue,0);
assert.equal(paletteFromPixels([0,0,255,255]).hue,240);
assert.equal(paletteFromPixels([10,10,10,255]).dark,true);
assert.equal(paletteFromPixels([240,240,240,255]).dark,false);
assert.equal(paletteFromPixels([128,128,128,255]).saturation,0);
assert.equal(paletteFromPixels([0,0,255,0,255,0,0,255]).hue,0);
assert.ok(Number.isFinite(paletteFromPixels([]).hue));
const {visualPalettes}=await import(await moduleUrl('../mock/visual-palettes.ts'));
const {pins}=await import(await moduleUrl('../mock/catalog.ts'));
for(const pin of pins){
 const palette=visualPalettes[new URL(pin.image).pathname.slice(1)];
 assert.ok(palette,`Missing offline palette: ${pin.title}`);
 assert.ok(Number.isFinite(palette.hue)&&palette.saturation>=0&&palette.saturation<=55);
}
assert.ok(new Set(Object.values(visualPalettes).map(p=>Math.round(p.hue))).size>8);
assert.equal(visualPalettes['photo-1534274988757-a28bf1a57c17'].dark,true);
assert.equal(visualPalettes['photo-1582794543139-8ac9cb0f7b11'].dark,false);
console.log('PASS: all existing pictures have image-specific palettes without network access.');
console.log('PASS: visual palette hue, brightness, monochrome, transparency and empty images.');

assert.equal(paletteFromHex('#ff0000').hue,0);
assert.equal(paletteFromHex('0000FF').hue,240);
assert.equal(paletteFromHex('#101010').dark,true);
for(const invalid of [undefined,null,'red','#fff','#12345678','12345g',123456])assert.equal(paletteFromHex(invalid),null);
console.log('PASS: provider colours accept six-digit hex and reject malformed values.');

