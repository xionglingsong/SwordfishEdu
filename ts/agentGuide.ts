import { ipcRenderer } from 'electron';

export class AgentGuide {
    constructor() {
        ipcRenderer.on('set-theme', (_event, theme: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = theme;
        });
        ipcRenderer.send('get-theme');
        for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-copy]')) {
            button.addEventListener('click', async () => {
                const text = document.getElementById(button.dataset.copy || '')?.textContent;
                if (!text) return;
                try { await ipcRenderer.invoke('agent-guide-copy', text); }
                catch { document.getElementById('copyStatus')!.textContent='复制失败，请手动选中文字复制。';return; }
                document.getElementById('copyStatus')!.textContent = '已复制。请核对并替换示例中的路径和任务信息。';
            });
        }
        ipcRenderer.invoke('agent-guide-context').then((context: {root:string; packaged:boolean; agentEnabled:boolean; platform:string}) => {
            document.getElementById('environment')!.textContent = context.packaged
                ? '当前为安装版。请让 Agent 定位本地 SwordfishEdu 源码目录，再按下面教程运行 CLI；不要在应用包内运行 npm。'
                : `当前源码目录：${context.root}。本次启动${context.agentEnabled?'已开启':'未开启'} Agent 模式。`;
            const root = context.packaged ? '/请替换为本地SwordfishEdu源码路径' : context.root;
            const quoted = "'" + root.replace(/'/g, "'\\''") + "'";
            document.getElementById('startCommand')!.textContent = context.platform==='win32'
                ? `切换到源码目录：${root}\n然后运行：npm run start:agent`
                : `cd ${quoted}\n${context.platform==='darwin'?'npm run open:agent':'npm run start:agent'}`;
            document.getElementById('skillPrompt')!.textContent = `请在 ${root} 中工作。\n接单建项前，读取 ${root}/.agents/skills/swordfish-intake/SKILL.md。\n批量修改译文前，读取 ${root}/.agents/skills/swordfish-agent/SKILL.md。\n使用项目提供的 CLI 操作，不直接改数据库；有关键缺项集中问我。`;
        }).catch((error: unknown) => {
            document.getElementById('environment')!.textContent = '无法读取启动信息：' + String(error);
            document.getElementById('startCommand')!.textContent = '在本地 SwordfishEdu 源码目录运行 npm run open:agent（macOS）。';
            document.getElementById('skillPrompt')!.textContent = '请读取源码目录下 .agents/skills/swordfish-intake/SKILL.md 和 .agents/skills/swordfish-agent/SKILL.md。';
        });
    }
}
