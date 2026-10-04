import {readFile,writeFile,readdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{validateContent}from'./validate-content.mjs';
import{validateProofs}from'./validate-proofs.mjs';
const root=new URL('../dist/',import.meta.url);
const hash=createHash('sha256');
async function files(dir){const entries=await readdir(new URL(dir,root),{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(`${dir}${e.name}/`):`${dir}${e.name}`))).flat();}
const publicFiles=(await files('')).sort();
const workerURL=new URL('sw.js',root);
const workerSource=await readFile(workerURL,'utf8');
// Art videos are cached when first played (see sw.js), not installed up front.
const assets=['./',...publicFiles.filter(path=>path!=='sw.js'&&!/^art\/.*\.(mp4|webm|mov)$/i.test(path)).map(path=>'./'+path)];
await writeFile(workerURL,workerSource.replace(/const ASSETS=\[[^;]*;/,`const ASSETS=${JSON.stringify(assets)};`));
for(const path of publicFiles){
 const bytes=await readFile(new URL(path,root));hash.update(path);hash.update(path==='sw.js'?bytes.toString().replace(/const CACHE='[^']+';/,"const CACHE='VERSION';"):bytes);
}
const version=hash.digest('hex').slice(0,16),worker=await readFile(new URL('sw.js',root),'utf8');
await writeFile(new URL('sw.js',root),worker.replace(/const CACHE='[^']+';/,`const CACHE='small-math-adventure-shell-${version}';`));
console.log(JSON.stringify({...await validateContent(),proofs:await validateProofs(),offlineAssetVersion:version},null,2));
