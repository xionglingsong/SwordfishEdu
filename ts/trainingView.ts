import { ipcRenderer, IpcRendererEvent } from "electron";
import { Main } from "./Main.js";

interface Exercise {
    projectId: string;
    projectName: string;
    referenceTmId: string;
    srcLang: string;
    tgtLang: string;
    segmentCount: number;
    status: string;
    references?: string[];
    wordCount?: number;
}

interface HistoryEntry {
    id: string;
    projectId: string;
    projectName: string;
    timestamp: string;
    score: string;
    engine: string;
    translatedCount: number;
    segmentCount: number;
}

export class TrainingView {

    container: HTMLDivElement;
    topBar: HTMLDivElement;
    tableContainer: HTMLDivElement;
    tbody: HTMLTableSectionElement;
    exercises: Exercise[] = [];
    lastScores: Map<string, string> = new Map<string, string>();

    constructor(div: HTMLDivElement) {
        this.container = div;

        this.topBar = document.createElement('div');
        this.topBar.className = 'toolbar';
        this.container.appendChild(this.topBar);

        let importCsvButton = document.createElement('a');
        importCsvButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><path d="M19,9h-2v6.59L5.41,4L4,5.41L15.59,17H9v2h10V9z"/></svg>' +
            '<span class="tooltiptext bottomTooltip">Import CSV Exercise</span>';
        importCsvButton.className = 'tooltip bottomTooltip';
        importCsvButton.addEventListener('click', () => {
            ipcRenderer.send('show-import-csv');
        });
        this.topBar.appendChild(importCsvButton);

        let importClipboardButton = document.createElement('a');
        importClipboardButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M19 2h-4.18C14.4.84 13.3 0 12 0S9.6.84 9.18 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>' +
            '<span class="tooltiptext bottomTooltip">Import from Clipboard</span>';
        importClipboardButton.className = 'tooltip bottomTooltip';
        importClipboardButton.style.marginLeft = '10px';
        importClipboardButton.addEventListener('click', () => {
            ipcRenderer.send('show-clipboard-import');
        });
        this.topBar.appendChild(importClipboardButton);

        let importWebButton = document.createElement('a');
        importWebButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' +
            '<span class="tooltiptext bottomTooltip">Import from Web</span>';
        importWebButton.className = 'tooltip bottomTooltip';
        importWebButton.style.marginLeft = '10px';
        importWebButton.addEventListener('click', () => {
            ipcRenderer.send('show-web-import');
        });
        this.topBar.appendChild(importWebButton);

        let deleteButton = document.createElement('a');
        deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 180q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520Zm-400 0v520-520Z"/></svg>' +
            '<span class="tooltiptext bottomTooltip">Delete Exercise</span>';
        deleteButton.className = 'tooltip bottomTooltip';
        deleteButton.addEventListener('click', () => {
            this.deleteExercise();
        });
        deleteButton.style.marginLeft = '10px';
        this.topBar.appendChild(deleteButton);

        let reportButton = document.createElement('a');
        reportButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2h2V7h-4v2h2z"/></svg>' +
            '<span class="tooltiptext bottomTooltip">Export Report</span>';
        reportButton.className = 'tooltip bottomTooltip';
        reportButton.style.marginLeft = '10px';
        reportButton.addEventListener('click', () => {
            ipcRenderer.send('export-training-report');
        });
        this.topBar.appendChild(reportButton);

        let dashboardButton = document.createElement('a');
        dashboardButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>' +
            '<span class="tooltiptext bottomTooltip">Dashboard</span>';
        dashboardButton.className = 'tooltip bottomTooltip';
        dashboardButton.style.marginLeft = '10px';
        dashboardButton.addEventListener('click', () => {
            this.showDashboard();
        });
        this.topBar.appendChild(dashboardButton);

        let spacer = document.createElement('span');
        spacer.className = 'fill_width';
        this.topBar.appendChild(spacer);

        this.tableContainer = document.createElement('div');
        this.tableContainer.classList.add('paddedPanel');
        this.container.appendChild(this.tableContainer);

        let table = document.createElement('table');
        table.classList.add('fill_width');
        table.classList.add('stripes');
        table.classList.add('discover');
        this.tableContainer.appendChild(table);

        let thead = document.createElement('thead');
        table.appendChild(thead);
        let headerRow = document.createElement('tr');
        thead.appendChild(headerRow);

        let th = document.createElement('th');
        th.innerHTML = '&nbsp;';
        headerRow.appendChild(th);

        th = document.createElement('th');
        th.classList.add('noWrap');
        th.innerHTML = 'Name';
        headerRow.appendChild(th);

        th = document.createElement('th');
        th.classList.add('noWrap');
        th.innerHTML = 'Src Lang';
        th.style.paddingLeft = '4px';
        th.style.paddingRight = '4px';
        headerRow.appendChild(th);

        th = document.createElement('th');
        th.classList.add('noWrap');
        th.innerHTML = 'Tgt Lang';
        th.style.paddingLeft = '4px';
        th.style.paddingRight = '4px';
        headerRow.appendChild(th);

        th = document.createElement('th');
        th.classList.add('noWrap');
        th.innerHTML = 'Segments';
        th.style.paddingLeft = '4px';
        th.style.paddingRight = '4px';
        headerRow.appendChild(th);

        th = document.createElement('th');
        th.classList.add('noWrap');
        th.innerHTML = 'Words';
        th.style.paddingLeft = '4px';
        th.style.paddingRight = '4px';
        headerRow.appendChild(th);

        th = document.createElement('th');
        th.classList.add('noWrap');
        th.innerHTML = 'Last Score';
        th.style.paddingLeft = '4px';
        th.style.paddingRight = '4px';
        headerRow.appendChild(th);

        th = document.createElement('th');
        th.classList.add('noWrap');
        th.innerHTML = 'History';
        th.style.paddingLeft = '4px';
        th.style.paddingRight = '4px';
        headerRow.appendChild(th);

        this.tbody = document.createElement('tbody');
        table.appendChild(this.tbody);

        ipcRenderer.on('set-training-exercises', (event: IpcRendererEvent, arg: Exercise[]) => {
            this.exercises = arg;
            ipcRenderer.send('get-training-history', {});
        });

        ipcRenderer.on('set-training-history', (event: IpcRendererEvent, arg: HistoryEntry[]) => {
            this.lastScores.clear();
            let sorted = [...arg].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            for (let entry of sorted) {
                if (!this.lastScores.has(entry.projectId)) {
                    this.lastScores.set(entry.projectId, entry.score);
                }
            }
            this.displayExercises();
        });

        ipcRenderer.on('refresh-training', () => {
            this.loadExercises();
        });

        this.loadExercises();
        this.watchSizes();
        setTimeout(() => { this.setSizes(); }, 200);
    }

    setSizes(): void {
        let main: HTMLDivElement = document.getElementById('main') as HTMLDivElement;
        this.tableContainer.style.height = (main.clientHeight - this.topBar.clientHeight - 16) + 'px';
        this.tableContainer.style.width = (this.container.clientWidth - 16) + 'px';
    }

    watchSizes(): void {
        let targetNode: HTMLDivElement = document.getElementById('main') as HTMLDivElement;
        let config: MutationObserverInit = { attributes: true, childList: false, subtree: false };
        let observer = new MutationObserver(() => {
            this.setSizes();
        });
        observer.observe(targetNode, config);
    }

    loadExercises(): void {
        ipcRenderer.send('get-training-exercises');
    }

    static countChineseChars(texts: string[]): number {
        let count = 0;
        for (let text of texts) {
            for (let ch of text) {
                if (/[一-鿿]/.test(ch)) count++;
            }
        }
        return count;
    }

    displayExercises(): void {
        this.tbody.innerHTML = '';
        if (this.exercises.length === 0) {
            let tr = document.createElement('tr');
            this.tbody.appendChild(tr);
            let td = document.createElement('td');
            td.colSpan = 8;
            td.classList.add('center');
            td.style.padding = '40px';
            td.style.color = '#999';
            td.innerText = 'No training exercises yet. Click "Import CSV Exercise" to add one.';
            tr.appendChild(td);
            Main.resizePanels();
            return;
        }
        for (let ex of this.exercises) {
            let tr = document.createElement('tr');
            tr.id = ex.projectId;

            let checkBox: HTMLInputElement = document.createElement('input');
            checkBox.type = 'checkbox';
            checkBox.classList.add('trainingSelection');
            checkBox.addEventListener('click', (event: Event) => {
                event.stopPropagation();
                if (checkBox.checked) {
                    tr.classList.add('selected');
                } else {
                    tr.classList.remove('selected');
                }
            });

            tr.addEventListener('click', () => {
                checkBox.checked = !checkBox.checked;
                if (checkBox.checked) {
                    tr.classList.add('selected');
                } else {
                    tr.classList.remove('selected');
                }
            });

            tr.addEventListener('dblclick', () => {
                ipcRenderer.send('open-training', {
                    projectId: ex.projectId,
                    projectName: ex.projectName,
                    srcLang: ex.srcLang,
                    tgtLang: ex.tgtLang
                });
            });

            let td = document.createElement('td');
            td.classList.add('center');
            td.classList.add('list');
            td.style.width = '24px';
            td.appendChild(checkBox);
            tr.appendChild(td);

            td = document.createElement('td');
            td.classList.add('list');
            td.innerText = ex.projectName;
            tr.appendChild(td);

            td = document.createElement('td');
            td.classList.add('center');
            td.classList.add('list');
            td.innerText = ex.srcLang;
            tr.appendChild(td);

            td = document.createElement('td');
            td.classList.add('center');
            td.classList.add('list');
            td.innerText = ex.tgtLang;
            tr.appendChild(td);

            td = document.createElement('td');
            td.classList.add('center');
            td.classList.add('list');
            td.innerText = String(ex.segmentCount);
            tr.appendChild(td);

            td = document.createElement('td');
            td.classList.add('center');
            td.classList.add('list');
            let wc = ex.wordCount;
            td.innerText = (wc !== undefined && wc > 0) ? String(wc) : '-';
            tr.appendChild(td);

            td = document.createElement('td');
            td.classList.add('center');
            td.classList.add('list');
            let lastScore = this.lastScores.get(ex.projectId) || '-';
            td.innerText = lastScore;
            tr.appendChild(td);

            td = document.createElement('td');
            td.classList.add('center');
            td.classList.add('list');
            let historyLink = document.createElement('a');
            historyLink.href = '#';
            historyLink.innerText = 'View';
            historyLink.style.color = '#1a73e8';
            historyLink.style.fontSize = '12px';
            historyLink.addEventListener('click', (event: Event) => {
                event.preventDefault();
                event.stopPropagation();
                ipcRenderer.send('show-training-history', { projectId: ex.projectId });
            });
            td.appendChild(historyLink);
            tr.appendChild(td);

            this.tbody.appendChild(tr);
        }
        Main.resizePanels();
    }

    deleteExercise(): void {
        let selected: string[] = [];
        let checkboxes = this.tableContainer.querySelectorAll('.trainingSelection:checked') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach((cb) => {
            let tr = cb.closest('tr');
            if (tr) {
                selected.push(tr.id);
            }
        });
        if (selected.length === 0) {
            ipcRenderer.send('show-message', { type: 'warning', message: 'Select an exercise to delete' });
            return;
        }
        ipcRenderer.send('delete-training', { projectIds: selected });
    }

    showDashboard(): void {
        let totalWords = 0;
        let exerciseStats: { name: string; words: number; segments: number; score: string }[] = [];
        for (let ex of this.exercises) {
            let words = ex.wordCount || 0;
            totalWords += words;
            exerciseStats.push({
                name: ex.projectName,
                words: words,
                segments: ex.segmentCount,
                score: this.lastScores.get(ex.projectId) || '-'
            });
        }

        // CATTI countdown
        let examDate = new Date('2026-06-28T09:00:00');
        let now = new Date();
        let diffMs = examDate.getTime() - now.getTime();
        let daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        let overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:1000;display:flex;align-items:center;justify-content:center;';
        overlay.addEventListener('click', (e: Event) => {
            if (e.target === overlay) overlay.remove();
        });

        let dialog = document.createElement('div');
        dialog.style.cssText = 'background:white;border-radius:12px;padding:24px;width:480px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);';

        let title = document.createElement('div');
        title.style.cssText = 'font-size:18px;font-weight:bold;margin-bottom:16px;';
        title.innerText = 'Training Dashboard';
        dialog.appendChild(title);

        // Countdown card
        let countCard = document.createElement('div');
        countCard.style.cssText = 'background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:8px;padding:16px;margin-bottom:16px;text-align:center;';
        let countLabel = document.createElement('div');
        countLabel.style.cssText = 'font-size:12px;opacity:0.8;margin-bottom:4px;';
        countLabel.innerText = '2026年上半年 CATTI 笔译考试（6月28日）';
        countCard.appendChild(countLabel);
        let countNum = document.createElement('div');
        countNum.style.cssText = 'font-size:36px;font-weight:bold;';
        countNum.innerText = daysLeft > 0 ? String(daysLeft) : '今天';
        countCard.appendChild(countNum);
        let countUnit = document.createElement('div');
        countUnit.style.cssText = 'font-size:13px;opacity:0.9;';
        countUnit.innerText = daysLeft > 0 ? '天后开考' : '';
        countCard.appendChild(countUnit);
        dialog.appendChild(countCard);

        // Stats row
        let statsRow = document.createElement('div');
        statsRow.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;';
        let statCard1 = document.createElement('div');
        statCard1.style.cssText = 'flex:1;background:#f0f8f0;border-radius:8px;padding:12px;text-align:center;';
        statCard1.innerHTML = '<div style="font-size:24px;font-weight:bold;color:#4CAF50;">' + totalWords.toLocaleString() + '</div><div style="font-size:11px;color:#666;">累计练习词数</div>';
        statsRow.appendChild(statCard1);
        let statCard2 = document.createElement('div');
        statCard2.style.cssText = 'flex:1;background:#e3f2fd;border-radius:8px;padding:12px;text-align:center;';
        statCard2.innerHTML = '<div style="font-size:24px;font-weight:bold;color:#1565C0;">' + this.exercises.length + '</div><div style="font-size:11px;color:#666;">练习总数</div>';
        statsRow.appendChild(statCard2);
        let statCard3 = document.createElement('div');
        statCard3.style.cssText = 'flex:1;background:#fff3e0;border-radius:8px;padding:12px;text-align:center;';
        statCard3.innerHTML = '<div style="font-size:24px;font-weight:bold;color:#E65100;">' + this.exercises.reduce((s, e) => s + e.segmentCount, 0) + '</div><div style="font-size:11px;color:#666;">段落总数</div>';
        statsRow.appendChild(statCard3);
        dialog.appendChild(statsRow);

        // Per-exercise table
        if (exerciseStats.length > 0) {
            let tableTitle = document.createElement('div');
            tableTitle.style.cssText = 'font-size:13px;font-weight:bold;margin-bottom:8px;';
            tableTitle.innerText = '各练习详情';
            dialog.appendChild(tableTitle);

            let tbl = document.createElement('table');
            tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
            tbl.innerHTML = '<tr style="background:#f5f5f5;"><th style="padding:6px 8px;text-align:left;">名称</th><th style="padding:6px 8px;text-align:right;">词数</th><th style="padding:6px 8px;text-align:right;">段落</th><th style="padding:6px 8px;text-align:right;">最高分</th></tr>';
            for (let stat of exerciseStats) {
                let row = document.createElement('tr');
                row.style.borderBottom = '1px solid #eee';
                row.innerHTML = '<td style="padding:6px 8px;">' + stat.name + '</td><td style="padding:6px 8px;text-align:right;">' + stat.words.toLocaleString() + '</td><td style="padding:6px 8px;text-align:right;">' + stat.segments + '</td><td style="padding:6px 8px;text-align:right;">' + stat.score + '</td>';
                tbl.appendChild(row);
            }
            // Total row
            let totalRow = document.createElement('tr');
            totalRow.style.cssText = 'font-weight:bold;background:#fafafa;';
            totalRow.innerHTML = '<td style="padding:6px 8px;">合计</td><td style="padding:6px 8px;text-align:right;">' + totalWords.toLocaleString() + '</td><td style="padding:6px 8px;text-align:right;">' + this.exercises.reduce((s, e) => s + e.segmentCount, 0) + '</td><td style="padding:6px 8px;text-align:right;">-</td>';
            tbl.appendChild(totalRow);
            dialog.appendChild(tbl);
        }

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }
}
