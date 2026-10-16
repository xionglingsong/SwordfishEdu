#!/usr/bin/env node
// LaunchServices owns the GUI lifetime, independent of an agent's command session.
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
const root = resolve(import.meta.dirname, '..');
if (process.platform !== 'darwin') throw new Error('This launcher is for macOS; use npm run start:agent on other platforms.');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
function run(command, args) {
    const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
}
const electron = join(root, 'node_modules/electron/dist/Electron.app');
if (!existsSync(electron)) throw new Error('Electron is not installed. Install project dependencies first.');
run(process.execPath, [join(root, 'scripts/build-agent.mjs')]);
run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc')]);
const logs = join(homedir(), 'Library/Logs/SwordfishEdu');
mkdirSync(logs, { recursive: true });
run('/usr/bin/open', ['-a', electron, '--stdout', join(logs, 'stdout.log'), '--stderr', join(logs, 'stderr.log'),
    '--env', 'SWORDFISH_AGENT_ENABLED=1', '--env', `SWORDFISH_AGENT_JAR=${join(root, '.agent-build/swordfish.jar')}`,
    '--args', root]);
console.log(`SwordfishEdu launch requested via macOS. Logs: ${logs}`);
