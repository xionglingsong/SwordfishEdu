import {app,BrowserWindow,ipcMain,clipboard} from 'electron';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),home=mkdtempSync(join(tmpdir(),'agent-guide-'));
app.setPath('userData',home);
app.whenReady().then(async()=>{
 let window;const previous=await clipboard.readText();
 const timer=setTimeout(()=>app.exit(1),15000);
 try{
  let packaged=false;
  ipcMain.handle('agent-guide-copy',(_event,text)=>clipboard.writeText(text));
  ipcMain.handle('agent-guide-context',()=>({root:"/tmp/O'Brien project",packaged,agentEnabled:true,platform:'darwin'}));
  window=new BrowserWindow({show:false,webPreferences:{nodeIntegration:true,contextIsolation:false}});
  const errors=[];window.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
  await window.loadFile(join(root,'html/en/agentGuide.html'));
  const js=x=>window.webContents.executeJavaScript(x);
  async function wait(p){for(let i=0;i<100;i++){if(await js(p))return;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out: '+p+' errors='+JSON.stringify(errors)+' body='+await js('document.body.innerText.slice(0,700)'));}
  await wait('document.getElementById("startCommand").textContent.includes("npm run open:agent")');
  assert.equal(await js('document.querySelectorAll("section").length'),8);
  await js('document.querySelector("button[data-copy=skillPrompt]").click()');
  await wait('document.getElementById("copyStatus").textContent.includes("已复制")');
  assert.ok((await clipboard.readText()).includes('.agents/skills/swordfish-intake/SKILL.md'));
  await js('document.querySelector("button[data-copy=startCommand]").click()');
  await wait('document.getElementById("copyStatus").textContent.includes("已复制")');
  assert.ok((await clipboard.readText()).includes("'\\''"));
  assert.ok(await js('Array.from(document.querySelectorAll("nav a")).every(a=>document.querySelector(a.getAttribute("href")))'));
  packaged=true;await window.loadFile(join(root,'html/en/agentGuide.html'));
  await wait('document.getElementById("environment").textContent.includes("安装版")');
  assert.ok(await js('document.getElementById("skillPrompt").textContent.includes("请替换")'));
  const config=JSON.parse(readFileSync(join(root,'package.json')));assert.ok(config.build.files.includes('docs/**/*'));assert.ok(config.build.files.includes('.agents/skills/**/*'));
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('Agent guide: offline render, navigation, clipboard, quoted path and packaged-mode guidance passed');
  clipboard.writeText(previous);window.destroy();clearTimeout(timer);rmSync(home,{recursive:true,force:true});app.exit(0);
 }catch(error){console.error(error);clipboard.writeText(previous);window?.destroy();clearTimeout(timer);app.exit(1);}
});
