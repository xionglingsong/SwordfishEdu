import { ipcRenderer } from "electron";

export class CsvImport {

    private projectInput: HTMLInputElement;
    private csvFileInput: HTMLInputElement;
    private srcLangSelect: HTMLSelectElement;
    private tgtLangSelect: HTMLSelectElement;
    private previewArea: HTMLDivElement;
    private previewBody: HTMLTableSectionElement;
    private importButton: HTMLButtonElement;
    private filePath: string = '';

    constructor() {
        this.projectInput = document.getElementById('projectInput') as HTMLInputElement;
        this.csvFileInput = document.getElementById('csvFile') as HTMLInputElement;
        this.srcLangSelect = document.getElementById('srcLangSelect') as HTMLSelectElement;
        this.tgtLangSelect = document.getElementById('tgtLangSelect') as HTMLSelectElement;
        this.previewArea = document.getElementById('previewArea') as HTMLDivElement;
        this.previewBody = document.getElementById('previewBody') as HTMLTableSectionElement;
        this.importButton = document.getElementById('importCsv') as HTMLButtonElement;

        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, theme: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = theme;
        });

        document.getElementById('browse')!.addEventListener('click', () => {
            ipcRenderer.send('browse-csv-import');
        });

        ipcRenderer.on('set-csv-file', (event: Electron.IpcRendererEvent, path: string) => {
            this.csvFileInput.value = path;
            this.filePath = path;
            this.showPreview(path);
        });

        ipcRenderer.on('set-csv-preview', (event: Electron.IpcRendererEvent, rows: string[][]) => {
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
            this.previewArea.style.display = 'block';
        });

        this.importButton.addEventListener('click', () => {
            this.importCsv();
        });

        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-importCsv');
            }
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.importCsv();
            }
        });

        this.projectInput.focus();

        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'importCsv', width: 560, height: 440 });
        }, 200);
    }

    private showPreview(path: string): void {
        ipcRenderer.send('parse-csv-preview', { path: path });
    }

    private importCsv(): void {
        let projectName = this.projectInput.value.trim();
        if (projectName === '') {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Enter exercise name', parent: 'importCsv' });
            return;
        }
        if (this.filePath === '') {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Select a CSV file', parent: 'importCsv' });
            return;
        }
        this.importButton.disabled = true;
        ipcRenderer.send('import-csv', {
            projectName: projectName,
            filePath: this.filePath,
            srcLang: this.srcLangSelect.value,
            tgtLang: this.tgtLangSelect.value
        });
    }
}
