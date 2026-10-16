#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { listStyleGuides, getStyleGuide } from '../style-guides/runtime.mjs';

const usage = `SwordfishEdu Agent CLI (JSON output)
  styles
  style GUIDE_ID
  projects
  read PROJECT [OFFSET=0] [LIMIT=100]
  validate PATCH.json
  apply PATCH.json
  history PROJECT
  undo PROJECT BATCH_ID

Start with npm run start:agent; save drafts and close the project's editor tab.
Patch: {project, instruction, includeConfirmed?:false, edits:[{file,unit,segment,revision,target,reason}]}
Targets are complete <target> XML elements; preserve tags and attributes.
validate is a dry run. apply writes one atomic batch (max 200). undo rejects later edits.
SWORDFISH_AGENT_TOKEN_FILE overrides the local token file; SWORDFISH_AGENT_PORT defaults to 8070.
`;

export async function callAgent(request) {
    const base = process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support', 'Swordfish')
        : process.platform === 'win32' ? join(process.env.APPDATA || '', 'Swordfish')
        : join(homedir(), '.config', 'Swordfish');
    const token = (await readFile(process.env.SWORDFISH_AGENT_TOKEN_FILE || join(base, 'agent-token'), 'utf8')).trim();
    const body = JSON.stringify(request);
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: '127.0.0.1', port: Number(process.env.SWORDFISH_AGENT_PORT || 8070),
            path: '/agent', method: 'POST', headers: { 'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body), 'X-Swordfish-Agent': token } }, res => {
            res.setEncoding('utf8');
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('error', reject);
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) throw new Error(`Agent HTTP ${res.statusCode}; restart with npm run start:agent`);
                    const result = JSON.parse(data);
                    if (result.status !== 'Success') throw new Error(result.reason || 'Agent request failed');
                    resolve(result);
                } catch (e) { reject(e); }
            });
        });
        req.setTimeout(60000, () => req.destroy(new Error('Request timed out; check history before retrying a write')));
        req.on('error', reject);
        req.end(body);
    });
}

async function main() {
    const [command, ...args] = process.argv.slice(2);
    if (!command || command === '--help') { console.log(usage); return; }
    if (command === 'styles' && args.length === 0) {
        console.log(JSON.stringify({ guides: listStyleGuides() }, null, 2)); return;
    }
    if (command === 'style' && args.length === 1) {
        console.log(JSON.stringify(getStyleGuide(args[0]), null, 2)); return;
    }
    let request;
    if (command === 'projects' && args.length === 0) request = { action: command };
    else if (command === 'read' && args.length >= 1 && args.length <= 3) {
        const offset = Number(args[1] ?? 0), limit = Number(args[2] ?? 100);
        if (!Number.isInteger(offset) || !Number.isInteger(limit)) throw new Error('OFFSET and LIMIT must be integers');
        request = { action: command, project: args[0], offset, limit };
    } else if (['validate', 'apply'].includes(command) && args.length === 1) {
        request = { ...JSON.parse(await readFile(args[0], 'utf8')), action: command };
        if (request.styleGuide) {
            const guide = getStyleGuide(request.styleGuide);
            request.instruction = `[Style: ${guide.id}@${guide.version}] ${request.instruction || ''}`;
        }
    } else if (command === 'history' && args.length === 1) request = { action: command, project: args[0] };
    else if (command === 'undo' && args.length === 2) request = { action: command, project: args[0], batchId: args[1] };
    else throw new Error(usage);
    console.log(JSON.stringify(await callAgent(request), null, 2));
}
main().catch(error => { console.error(JSON.stringify({ status: 'Error', reason: error.message })); process.exitCode = 1; });
