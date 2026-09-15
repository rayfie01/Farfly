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
const {paletteFromPixels}=await import(await moduleUrl('../lib/visual-theme.ts'));
assert.equal(paletteFromPixels([255,0,0,255]).hue,0);
assert.equal(paletteFromPixels([0,0,255,255]).hue,240);
assert.equal(paletteFromPixels([10,10,10,255]).dark,true);
assert.equal(paletteFromPixels([240,240,240,255]).dark,false);
assert.equal(paletteFromPixels([128,128,128,255]).saturation,0);
assert.equal(paletteFromPixels([0,0,255,0,255,0,0,255]).hue,0);
assert.ok(Number.isFinite(paletteFromPixels([]).hue));
console.log('PASS: visual palette hue, brightness, monochrome, transparency and empty images.');

