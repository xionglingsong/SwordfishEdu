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
    private selectAllCheckbox: HTMLInputElement;
    private selectInfoSpan: HTMLSpanElement;

    private allRows: string[][] = [];
    private selectedSet: Set<number> = new Set();
    private currentPage: number = 1;
    private pageSize: number = 5;
    private updatingSelectAll: boolean = false;

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
        this.selectAllCheckbox = document.getElementById('selectAllCheckbox') as HTMLInputElement;
        this.selectInfoSpan = document.getElementById('selectInfo') as HTMLSpanElement;

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

        this.selectAllCheckbox.addEventListener('change', () => {
            if (this.updatingSelectAll) return;
            this.toggleCurrentPage(this.selectAllCheckbox.checked);
        });

        ipcRenderer.on('set-web-preview', (_event: Electron.IpcRendererEvent, rows: string[][]) => {
            this.allRows = rows;
            this.selectedSet = new Set();
            for (let i = 0; i < rows.length; i++) this.selectedSet.add(i);
            this.currentPage = 1;
            this.progressArea.style.display = 'none';
            this.renderPage();
            this.previewArea.style.display = 'block';
            this.errorArea.style.display = 'none';
            ipcRenderer.send('set-height', { window: 'webImport', width: 700, height: 600 });
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
            ipcRenderer.send('set-height', { window: 'webImport', width: 700, height: 600 });
        }, 200);
    }

    private toggleCurrentPage(checked: boolean): void {
        let start = (this.currentPage - 1) * this.pageSize;
        let end = Math.min(start + this.pageSize, this.allRows.length);
        for (let i = start; i < end; i++) {
            if (checked) {
                this.selectedSet.add(i);
            } else {
                this.selectedSet.delete(i);
            }
        }
        this.renderCheckboxes();
    }

    private renderCheckboxes(): void {
        let checkboxes = this.previewBody.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        let start = (this.currentPage - 1) * this.pageSize;
        checkboxes.forEach((cb, idx) => {
            cb.checked = this.selectedSet.has(start + idx);
        });
        this.updateSelectInfo();
    }

    private updateSelectInfo(): void {
        this.selectInfoSpan.innerText = 'Selected: ' + this.selectedSet.size + ' / ' + this.allRows.length;
        let start = (this.currentPage - 1) * this.pageSize;
        let end = Math.min(start + this.pageSize, this.allRows.length);
        let allChecked = end > start;
        let anyChecked = false;
        for (let i = start; i < end; i++) {
            if (this.selectedSet.has(i)) {
                anyChecked = true;
            } else {
                allChecked = false;
            }
        }
        this.updatingSelectAll = true;
        this.selectAllCheckbox.checked = allChecked;
        this.selectAllCheckbox.indeterminate = anyChecked && !allChecked;
        this.updatingSelectAll = false;
    }

    private renderPage(): void {
        this.previewBody.innerHTML = '';
        let totalPages = Math.ceil(this.allRows.length / this.pageSize);
        let start = (this.currentPage - 1) * this.pageSize;
        let end = Math.min(start + this.pageSize, this.allRows.length);

        for (let i = start; i < end; i++) {
            let tr = document.createElement('tr');

            let tdCheck = document.createElement('td');
            tdCheck.className = 'checkCell';
            let cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'rowCheckbox';
            cb.checked = this.selectedSet.has(i);
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    this.selectedSet.add(i);
                } else {
                    this.selectedSet.delete(i);
                }
                this.updateSelectInfo();
            });
            tdCheck.appendChild(cb);
            tr.appendChild(tdCheck);

            let td1 = document.createElement('td');
            td1.className = 'srcCell';
            td1.innerText = this.allRows[i][0] || '';
            tr.appendChild(td1);

            let td2 = document.createElement('td');
            td2.className = 'tgtCell';
            td2.innerText = this.allRows[i][1] || '';
            tr.appendChild(td2);

            this.previewBody.appendChild(tr);
        }

        // Pagination
        this.paginationDiv.innerHTML = '';
        let navSpan = document.createElement('span');
        navSpan.className = 'pageInfo';
        if (totalPages > 1) {
            navSpan.innerText = 'Page ' + this.currentPage + '/' + totalPages + '  ';
        }
        this.paginationDiv.appendChild(navSpan);

        if (this.currentPage > 1) {
            let prevBtn = document.createElement('button');
            prevBtn.innerText = 'Prev';
            prevBtn.className = 'pageBtn';
            prevBtn.addEventListener('click', () => {
                this.currentPage--;
                this.renderPage();
            });
            this.paginationDiv.appendChild(prevBtn);
        }

        if (this.currentPage < totalPages) {
            let nextBtn = document.createElement('button');
            nextBtn.innerText = 'Next';
            nextBtn.className = 'pageBtn';
            nextBtn.addEventListener('click', () => {
                this.currentPage++;
                this.renderPage();
            });
            this.paginationDiv.appendChild(nextBtn);
        }

        this.updateSelectInfo();
    }

    private autoDetectUrlPattern(url: string, startPage: number, endPage: number): string {
        if (url.includes('{n}') || url.includes('-n.')) return url;
        if (startPage === endPage) return url;
        let pageNumPattern = /^(.*?)-(\d+)\.(html?|php|aspx?)$/i;
        let match = pageNumPattern.exec(url);
        if (match) {
            return match[1] + '-{n}.' + match[3];
        }
        return url;
    }

    private showPreview(): void {
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
        url = this.autoDetectUrlPattern(url, startPage, endPage);
        this.previewArea.style.display = 'none';
        this.progressArea.style.display = 'block';
        this.progressArea.innerText = 'Loading preview...';
        ipcRenderer.send('preview-web-import', { url: url, startPage: startPage, endPage: endPage });
    }

    private startImport(): void {
        let projectName = this.projectInput.value.trim();
        if (projectName === '') {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Enter exercise name', parent: 'webImport' });
            return;
        }
        if (this.allRows.length === 0) {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Click Preview first to load segments', parent: 'webImport' });
            return;
        }
        if (this.selectedSet.size === 0) {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Select at least one segment', parent: 'webImport' });
            return;
        }
        let selectedPairs: Array<{ source: string; target: string }> = [];
        for (let i = 0; i < this.allRows.length; i++) {
            if (this.selectedSet.has(i)) {
                selectedPairs.push({ source: this.allRows[i][0] || '', target: this.allRows[i][1] || '' });
            }
        }
        this.importButton.disabled = true;
        this.errorArea.style.display = 'none';
        ipcRenderer.send('import-web-selected', {
            projectName: projectName,
            srcLang: this.srcLangSelect.value,
            tgtLang: this.tgtLangSelect.value,
            pairs: selectedPairs
        });
    }
}
