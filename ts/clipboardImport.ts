import { ipcRenderer } from "electron";

export class ClipboardImport {

    private projectInput: HTMLInputElement;
    private srcLangSelect: HTMLSelectElement;
    private tgtLangSelect: HTMLSelectElement;
    private pasteArea: HTMLTextAreaElement;
    private previewArea: HTMLDivElement;
    private previewBody: HTMLTableSectionElement;
    private pairCount: HTMLSpanElement;
    private importButton: HTMLButtonElement;
    private previewButton: HTMLButtonElement;
    private parsedPairs: string[][] = [];

    constructor() {
        this.projectInput = document.getElementById('projectInput') as HTMLInputElement;
        this.srcLangSelect = document.getElementById('srcLangSelect') as HTMLSelectElement;
        this.tgtLangSelect = document.getElementById('tgtLangSelect') as HTMLSelectElement;
        this.pasteArea = document.getElementById('pasteArea') as HTMLTextAreaElement;
        this.previewArea = document.getElementById('previewArea') as HTMLDivElement;
        this.previewBody = document.getElementById('previewBody') as HTMLTableSectionElement;
        this.pairCount = document.getElementById('pairCount') as HTMLSpanElement;
        this.importButton = document.getElementById('importBtn') as HTMLButtonElement;
        this.previewButton = document.getElementById('previewBtn') as HTMLButtonElement;

        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (_event: Electron.IpcRendererEvent, theme: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = theme;
        });

        this.previewButton.addEventListener('click', () => {
            this.showPreview();
        });

        this.importButton.addEventListener('click', () => {
            this.startImport();
        });

        ipcRenderer.on('set-clipboard-preview', (_event: Electron.IpcRendererEvent, rows: string[][]) => {
            this.parsedPairs = rows;
            this.previewBody.innerHTML = '';
            for (let row of rows) {
                let tr = document.createElement('tr');
                let td1 = document.createElement('td');
                td1.style.padding = '2px 4px';
                td1.innerText = row[0] || '';
                tr.appendChild(td1);
                let td2 = document.createElement('td');
                td2.style.padding = '2px 4px';
                td2.innerText = row[1] || '';
                tr.appendChild(td2);
                this.previewBody.appendChild(tr);
            }
            this.pairCount.innerText = String(rows.length);
            this.previewArea.style.display = 'block';
        });

        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-clipboard-import');
            }
        });

        this.projectInput.focus();

        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'clipboardImport', width: 560, height: 540 });
        }, 200);
    }

    private showPreview(): void {
        let text = this.pasteArea.value.trim();
        if (text === '') {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Paste bilingual text first', parent: 'clipboardImport' });
            return;
        }
        ipcRenderer.send('parse-clipboard-preview', { text: text, srcLang: this.srcLangSelect.value, tgtLang: this.tgtLangSelect.value });
    }

    private startImport(): void {
        let projectName = this.projectInput.value.trim();
        if (projectName === '') {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Enter exercise name', parent: 'clipboardImport' });
            return;
        }
        let text = this.pasteArea.value.trim();
        if (text === '') {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Paste bilingual text first', parent: 'clipboardImport' });
            return;
        }
        this.importButton.disabled = true;
        ipcRenderer.send('import-clipboard', {
            projectName: projectName,
            text: text,
            srcLang: this.srcLangSelect.value,
            tgtLang: this.tgtLangSelect.value
        });
    }
}
