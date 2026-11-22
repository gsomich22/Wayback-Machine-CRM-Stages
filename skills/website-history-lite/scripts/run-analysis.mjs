#!/usr/bin/env node
// Skill entrypoint: enable an existing environment proxy before Node starts fetch.
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export function prepareAnalysis(args, env = process.env, version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  if (major < 22) throw new Error('Website History requires Node.js 22 or newer.');
  const fixture = args.includes('--help') || args.some(arg => arg === '--fixture' || arg.startsWith('--fixture='));
  const childEnv = {...env};
  const hasProxy = ['HTTPS_PROXY','https_proxy','HTTP_PROXY','http_proxy'].some(key => Boolean(env[key]));
  if (!fixture && hasProxy) {
    if (!(major >= 24 || (major === 22 && minor >= 21))) {
      throw new Error('An environment proxy is configured, but this Node version cannot enable it for fetch. Use an available Node 22.21+ or 24+ runtime and rerun this launcher. A longer timeout will not fix proxy support.');
    }
    if (env.NODE_USE_ENV_PROXY === '0') throw new Error('A proxy is configured but NODE_USE_ENV_PROXY=0 explicitly disables it. Resolve this network setting before live analysis.');
    childEnv.NODE_USE_ENV_PROXY = '1';
  }
  const options = [...args];
  for (const [flag,value] of [['--timeout','600'],['--request-timeout','120']]) {
    if (!options.some(arg => arg === flag || arg.startsWith(flag+'='))) options.push(flag,value);
  }
  return {args:options, env:childEnv};
}
export function engineCli() {
  const bundled = new URL('./engine/src/cli.mjs', import.meta.url);
  const repository = new URL('../../../src/cli.mjs', import.meta.url);
  if (existsSync(bundled)) return fileURLToPath(bundled);
  if (existsSync(repository)) return fileURLToPath(repository);
  throw new Error('Bundled engine is missing. Extract the complete Website History skill ZIP.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const launch = prepareAnalysis(process.argv.slice(2));
    const child = spawn(process.execPath, [engineCli(),'analyze',...launch.args], {env:launch.env,stdio:'inherit'});
    child.on('error', error => {console.error(error.message);process.exitCode=1});
    child.on('exit', (code, signal) => {process.exitCode=code ?? (signal === 'SIGINT' ? 130 : 1)});
    for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
  } catch (error) {console.error(error.message);process.exitCode=1;}
}
