import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {readFileSync, writeFileSync} from 'node:fs';
const target = new URL('../../skills/website-history/assets/report/', import.meta.url);
await build({absWorkingDir:fileURLToPath(new URL('.',import.meta.url)), entryPoints:['src/main.jsx'], bundle:true, minify:true, format:'iife', jsx:'automatic', target:['es2020'], outfile:fileURLToPath(new URL('report.js',target)), define:{'process.env.NODE_ENV':'"production"'}, legalComments:'inline'});
const license = readFileSync(new URL('REACT-BITS-LICENSE.txt',target),'utf8') + '\n' + readFileSync(new URL('THIRD-PARTY-NOTICES.txt',target),'utf8');
const jsFile = new URL('report.js',target);
writeFileSync(jsFile, `/*! Report list adapted from React Bits by David Haz.\n${license.replaceAll('*/','* /')}\n*/\n` + readFileSync(jsFile,'utf8'));
console.log('Built offline report assets.');
