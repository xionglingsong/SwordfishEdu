import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, delimiter } from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
const root = resolve(import.meta.dirname, '..');

function cli(args, env) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['scripts/swordfish-agent.mjs', ...args], { cwd: root, env: { ...process.env, ...env } });
        let out = '', err = '';
        child.stdout.on('data', x => out += x); child.stderr.on('data', x => err += x);
        child.on('error', reject);
        child.on('exit', code => resolve({ code, out, err }));
    });
}

test('real Java server + CLI: read/apply/undo, editor conflict, authentication', { timeout: 45000 }, async () => {
    const home = await mkdtemp(join(tmpdir(), 'swordfish-agent-http-'));
    const folder = process.platform === 'darwin' ? join(home, 'Library/Application Support/Swordfish') : join(home, '.config/Swordfish');
    const projects = join(home, 'projects');
    await mkdir(folder, { recursive: true }); await mkdir(join(projects, 'p'), { recursive: true });
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ projectsFolder: projects,
        catalog: join(root, 'catalog/catalog.xml'), acceptUnconfirmed:true, caseSensitiveSearches:false,
        fuzzyTermSearches:false, paragraphSegmentation:true, srx:join(root,'srx/default.srx') }));
    await writeFile(join(projects,'projects.json'), JSON.stringify({ projects:[{ id:'p',description:'Agent Test',status:0,
        sourceLang:'en',targetLang:'zh-CN',creationDate:'2026-10-16',files:[],xliff:'p/p.xlf',memory:'none',glossary:'none' }] }));
    await writeFile(join(projects,'p/p.xlf'), '<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="zh-CN"><file id="f"><unit id="u"><segment id="s" state="translated"><source>Hello</source><target>你好</target></segment></unit></file></xliff>');
    const socket = net.createServer(); await new Promise(r => socket.listen(0,'127.0.0.1',r));
    const port = socket.address().port; await new Promise(r => socket.close(r));
    const jars = (await readdir(join(root,'jars'))).filter(f=>f.endsWith('.jar') && f!=='swordfish.jar').map(f=>join(root,'jars',f));
    const server = spawn(join(root,'bin/java'),[`-Duser.home=${home}`,'--upgrade-module-path',join(root,'.agent-build/swordfish.jar'),'--module-path',join(root,'lib'),'-m','swordfish/com.maxprograms.swordfish.TmsServer','-port',String(port)],{cwd:root,env:{...process.env,SWORDFISH_AGENT_ENABLED:'1'}});
    let log=''; server.stderr.on('data',x=>log+=x); server.stdout.on('data',x=>log+=x);
    const env={SWORDFISH_AGENT_TOKEN_FILE:join(folder,'agent-token'),SWORDFISH_AGENT_PORT:String(port)};
    const url=`http://127.0.0.1:${port}`;
    try {
        let ready=false;
        for(let i=0;i<80;i++) {
            try { await readFile(env.SWORDFISH_AGENT_TOKEN_FILE); const r=await fetch(url+'/agent',{method:'POST',body:'{}'}); if(r.status===403){ready=true;break;} } catch {}
            await new Promise(r=>setTimeout(r,100));
        }
        assert.ok(ready,log);
        const token=(await readFile(env.SWORDFISH_AGENT_TOKEN_FILE,'utf8')).trim();
        const browser=await fetch(url+'/agent',{method:'POST',headers:{Origin:'https://example.com','X-Swordfish-Agent':token},body:'{}'});
        assert.equal(browser.status,403);
        let result=await cli(['projects'],env); assert.equal(result.code,0,result.err); assert.equal(JSON.parse(result.out).projects.length,1);
        result=await cli(['read','p'],env); assert.equal(result.code,0,result.err+'\n'+log);
        const row=JSON.parse(result.out).segments[0]; assert.equal(row.target,'<target>你好</target>');
        const patch=join(home,'patch.json'); await writeFile(patch,JSON.stringify({project:'p',styleGuide:'yikeke',instruction:'礼貌语气',edits:[{...row,target:'<target>您好</target>'}]}));
        result=await cli(['validate',patch],env); assert.equal(result.code,0,result.err); assert.equal(JSON.parse(result.out).applied,false);
        result=await cli(['apply',patch],env); assert.equal(result.code,0,result.err); const batch=JSON.parse(result.out).batchId;
        assert.match(JSON.parse(result.out).instruction, /Style: yikeke@1.0.0/);
        result=await cli(['read','p'],env); assert.equal(JSON.parse(result.out).segments[0].target,'<target>您好</target>');
        result=await cli(['apply',patch],env); assert.equal(result.code,1); assert.match(result.err,/Conflict/);
        result=await cli(['undo','p',batch],env); assert.equal(result.code,0,result.err);
        result=await cli(['read','p'],env); assert.equal(JSON.parse(result.out).segments[0].target,'<target>你好</target>');
        // The editor uses this route to open the shared store; Agent must not overwrite its draft.
        const opened=await fetch(url+'/projects/getSegment',{method:'POST',body:JSON.stringify({project:'p',file:row.file,unit:row.unit,segment:row.segment})});
        assert.equal((await opened.json()).status,'Success');
        result=await cli(['apply',patch],env); assert.equal(result.code,1); assert.match(result.err,/Close this project's editor/);
        await fetch(url+'/projects/close',{method:'POST',body:JSON.stringify({project:'p'})});
        result=await cli(['history','p'],env); assert.equal(result.code,0,result.err); assert.equal(JSON.parse(result.out).batches.length,2);
        assert.ok(JSON.parse(result.out).batches.some(b => b.instruction.includes('Style: yikeke@1.0.0')));
    } finally {
        server.kill(); await new Promise(r=>server.once('exit',r));
        await rm(home,{recursive:true,force:true});
    }
});
