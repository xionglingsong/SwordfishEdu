/*******************************************************************************
 * Copyright (c) 2007-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { ipcRenderer, IpcRendererEvent } from "electron";

export class Context {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: IpcRendererEvent, theme: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = theme;
        });
        ipcRenderer.on('set-context', (event: IpcRendererEvent, context: any) => {
            this.renderContextArray(context);
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-context');
            }
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'context', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 150);
        window.addEventListener('resize', () => {
            let container: HTMLDivElement = document.getElementById('container') as HTMLDivElement;
            container.style.height = (window.innerHeight - 16) + 'px';
        });
    }

    renderContextArray(context: any): void {
        let tbody: HTMLTableSectionElement = document.getElementById('tbody') as HTMLTableSectionElement;
        tbody.innerHTML = '';
        if (context) {
            let keys: string[] = Object.keys(context);
            if (keys) {
                keys.forEach((key: string) => {
                    let tr: HTMLTableRowElement = document.createElement('tr');
                    tbody.appendChild(tr);
                    let td: HTMLTableCellElement = document.createElement('td');
                    td.innerText = key;
                    tr.appendChild(td);
                    td = document.createElement('td');
                    td.innerText = context[key];
                    tr.appendChild(td);
                });
            }
        }
    }
}