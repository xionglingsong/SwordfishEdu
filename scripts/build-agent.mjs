#!/usr/bin/env node
import { readdir, mkdir, cp, rm } from 'node:fs/promises';
import { resolve, join, delimiter } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const output = join(root, '.agent-build');
const classes = join(output, 'classes');
await rm(classes, { recursive: true, force: true });
await mkdir(classes, { recursive: true });
const files = await readdir(join(root, 'src'), { recursive: true });
const sources = files.filter(f => f.endsWith('.java')).map(f => join(root, 'src', f));
const jars = (await readdir(join(root, 'jars'))).filter(f => f.endsWith('.jar') && f !== 'swordfish.jar')
    .map(f => join(root, 'jars', f)).join(delimiter);
function run(command, args) {
    const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} failed: ${result.status}`);
}
run('javac', ['--release', '25', '--module-path', jars, '-d', classes, ...sources]);
await cp(join(root, 'src'), classes, { recursive: true, filter: src => !src.endsWith('.java') });
const jar = join(output, 'swordfish.jar');
run('jar', ['--create', '--file', jar, '-C', classes, '.']);
console.log(`Agent backend built: ${jar}`);
if (process.argv.includes('--start')) {
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['start'], {
        cwd: root, stdio: 'inherit', env: { ...process.env, SWORDFISH_AGENT_ENABLED: '1', SWORDFISH_AGENT_JAR: jar }
    });
    child.on('error', error => { console.error(error); process.exitCode = 1; });
    child.on('exit', code => { process.exitCode = code ?? 1; });
}
