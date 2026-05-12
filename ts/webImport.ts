import { ipcRenderer } from "electron";

export class WebImport {

    private projectInput: HTMLInputElement;
    private urlInput: HTMLInputElement;
    private startPageInput: HTMLInputElement;
    private endPageInput: HTMLInputElement;
    private srcLangSelect: HTMLSelectElement;
    private tgtLangSelect: HTMLSelectElement;
    private previewArea: HTMLDivElement;
    private previewBody: HTMLTableSectionElement;
    private progressArea: HTMLDivElement;
    private errorArea: HTMLDivElement;
    private importButton: HTMLButtonElement;
    private previewButton: HTMLButtonElement;
    private paginationDiv: HTMLDivElement;

    private allRows: string[][] = [];
    private currentPage: number = 1;
    private pageSize: number = 5;

    constructor() {
        this.projectInput = document.getElementById('projectInput') as HTMLInputElement;
        this.urlInput = document.getElementById('urlInput') as HTMLInputElement;
        this.startPageInput = document.getElementById('startPage') as HTMLInputElement;
        this.endPageInput = document.getElementById('endPage') as HTMLInputElement;
        this.srcLangSelect = document.getElementById('srcLangSelect') as HTMLSelectElement;
        this.tgtLangSelect = document.getElementById('tgtLangSelect') as HTMLSelectElement;
        this.previewArea = document.getElementById('previewArea') as HTMLDivElement;
        this.previewBody = document.getElementById('previewBody') as HTMLTableSectionElement;
        this.progressArea = document.getElementById('progressArea') as HTMLDivElement;
        this.errorArea = document.getElementById('errorArea') as HTMLDivElement;
        this.importButton = document.getElementById('importBtn') as HTMLButtonElement;
        this.previewButton = document.getElementById('previewBtn') as HTMLButtonElement;
        this.paginationDiv = document.getElementById('paginationDiv') as HTMLDivElement;

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

        ipcRenderer.on('set-web-preview', (_event: Electron.IpcRendererEvent, rows: string[][]) => {
            this.allRows = rows;
            this.currentPage = 1;
            this.renderPage();
            this.previewArea.style.display = 'block';
            this.errorArea.style.display = 'none';
        });

        ipcRenderer.on('web-import-progress', (_event: Electron.IpcRendererEvent, data: { current: number; total: number }) => {
            this.progressArea.style.display = 'block';
            this.progressArea.innerText = 'Fetching page ' + data.current + ' of ' + data.total + '...';
        });

        ipcRenderer.on('web-import-error', (_event: Electron.IpcRendererEvent, error: string) => {
            this.errorArea.style.display = 'block';
            this.errorArea.innerText = error;
            this.progressArea.style.display = 'none';
            this.importButton.disabled = false;
        });

        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-web-import');
            }
        });

        this.projectInput.focus();

        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'webImport', width: 600, height: 520 });
        }, 200);
    }

    private renderPage(): void {
        this.previewBody.innerHTML = '';
        let totalPages = Math.ceil(this.allRows.length / this.pageSize);
        let start = (this.currentPage - 1) * this.pageSize;
        let end = Math.min(start + this.pageSize, this.allRows.length);

        for (let i = start; i < end; i++) {
            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            td1.style.padding = '2px 4px';
            td1.innerText = this.allRows[i][0] || '';
            tr.appendChild(td1);
            let td2 = document.createElement('td');
            td2.style.padding = '2px 4px';
            td2.innerText = this.allRows[i][1] || '';
            tr.appendChild(td2);
            this.previewBody.appendChild(tr);
        }

        // Update pagination
        this.paginationDiv.innerHTML = '';
        let infoSpan = document.createElement('span');
        infoSpan.innerText = this.allRows.length + ' pairs, page ' + this.currentPage + '/' + totalPages + '  ';
        this.paginationDiv.appendChild(infoSpan);

        if (this.currentPage > 1) {
            let prevBtn = document.createElement('button');
            prevBtn.innerText = 'Prev';
            prevBtn.style.marginRight = '4px';
            prevBtn.addEventListener('click', () => {
                this.currentPage--;
                this.renderPage();
            });
            this.paginationDiv.appendChild(prevBtn);
        }

        if (this.currentPage < totalPages) {
            let nextBtn = document.createElement('button');
            nextBtn.innerText = 'Next';
            nextBtn.addEventListener('click', () => {
                this.currentPage++;
                this.renderPage();
            });
            this.paginationDiv.appendChild(nextBtn);
        }
    }

    private showPreview(): void {
        let url = this.urlInput.value.trim();
        if (url === '') {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Enter a URL pattern', parent: 'webImport' });
            return;
        }
        let startPage = parseInt(this.startPageInput.value) || 1;
        ipcRenderer.send('preview-web-import', { url: url, startPage: startPage });
    }

    private startImport(): void {
        let projectName = this.projectInput.value.trim();
        if (projectName === '') {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Enter exercise name', parent: 'webImport' });
            return;
        }
        let url = this.urlInput.value.trim();
        if (url === '') {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Enter a URL pattern', parent: 'webImport' });
            return;
        }
        let startPage = parseInt(this.startPageInput.value) || 1;
        let endPage = parseInt(this.endPageInput.value) || startPage;
        if (endPage < startPage) {
            ipcRenderer.send('show-message', { type: 'warning', message: 'End page must be >= start page', parent: 'webImport' });
            return;
        }
        this.importButton.disabled = true;
        this.errorArea.style.display = 'none';
        ipcRenderer.send('import-web', {
            projectName: projectName,
            url: url,
            startPage: startPage,
            endPage: endPage,
            srcLang: this.srcLangSelect.value,
            tgtLang: this.tgtLangSelect.value
        });
    }
}
