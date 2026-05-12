import { ipcRenderer } from "electron";
import { marked } from "marked";

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface EngineInfo {
    shortName: string;
    name: string;
}

export interface SegmentContext {
    sourceText: string;
    targetText: string;
    srcLang: string;
    tgtLang: string;
}

export class AiAssistant {

    private container: HTMLDivElement;
    private messagesContainer: HTMLDivElement;
    private inputArea: HTMLTextAreaElement;
    private engineSelect: HTMLSelectElement;
    private sendButton: HTMLAnchorElement;
    private clearButton: HTMLAnchorElement;
    private segmentIndicator: HTMLDivElement;
    private messages: ChatMessage[] = [];
    private sending: boolean = false;
    private streamingTextDiv: HTMLDivElement | null = null;
    private getContext: () => SegmentContext;
    private readonly insertText: (text: string) => void;

    constructor(container: HTMLDivElement, getContext: () => SegmentContext, insertText: (text: string) => void) {
        this.container = container;
        this.getContext = getContext;
        this.insertText = insertText;

        let wrapper = document.createElement('div');
        wrapper.classList.add('aiPanel');
        // Intercept ALL paste events and redirect to textarea
        wrapper.addEventListener('paste', (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            let text = (event as ClipboardEvent).clipboardData?.getData('text') || '';
            if (text) {
                let textarea = this.inputArea;
                let start = textarea.selectionStart || 0;
                let end = textarea.selectionEnd || 0;
                textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + text.length;
                textarea.focus();
            }
        });
        container.appendChild(wrapper);

        // Engine selector row
        let toolbar = document.createElement('div');
        toolbar.classList.add('aiToolbar');
        wrapper.appendChild(toolbar);

        let engineLabel = document.createElement('span');
        engineLabel.innerText = 'Engine:';
        toolbar.appendChild(engineLabel);

        this.engineSelect = document.createElement('select');
        this.engineSelect.classList.add('aiEngineSelect');
        toolbar.appendChild(this.engineSelect);

        this.clearButton = document.createElement('a');
        this.clearButton.href = '#';
        this.clearButton.classList.add('aiClearButton');
        this.clearButton.innerText = 'Clear';
        this.clearButton.addEventListener('click', (event: Event) => {
            event.preventDefault();
            this.clearChat();
        });
        toolbar.appendChild(this.clearButton);

        // Current segment indicator
        this.segmentIndicator = document.createElement('div');
        this.segmentIndicator.classList.add('aiSegmentIndicator');
        this.segmentIndicator.innerText = 'No segment selected';
        wrapper.appendChild(this.segmentIndicator);

        // Quick action buttons
        let quickBar = document.createElement('div');
        quickBar.classList.add('aiQuickBar');
        wrapper.appendChild(quickBar);

        this.addQuickButton(quickBar, 'Review', 'Review my translation and give specific feedback on what is good and what could be improved.');
        this.addQuickButton(quickBar, 'Alternatives', 'Suggest 2-3 alternative translations for this segment, explaining the trade-offs of each.');
        this.addQuickButton(quickBar, 'Explain', 'Explain the source text meaning, any idioms, cultural references, or translation difficulties.');
        this.addQuickButton(quickBar, 'Fix Tags', 'Check if all inline tags from the source are correctly placed in my translation. Point out any missing or misplaced tags.');

        // Messages area
        this.messagesContainer = document.createElement('div');
        this.messagesContainer.classList.add('aiMessages');
        wrapper.appendChild(this.messagesContainer);

        // Input area
        let inputWrapper = document.createElement('div');
        inputWrapper.classList.add('aiInputArea');
        wrapper.appendChild(inputWrapper);

        this.inputArea = document.createElement('textarea');
        this.inputArea.classList.add('aiInput');
        this.inputArea.placeholder = 'Ask about this segment... (Enter to send)';
        this.inputArea.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.sendMessage(this.inputArea.value.trim());
            }
        });
        inputWrapper.appendChild(this.inputArea);

        this.sendButton = document.createElement('a');
        this.sendButton.href = '#';
        this.sendButton.classList.add('aiSendButton');
        this.sendButton.innerText = 'Send';
        this.sendButton.addEventListener('click', (event: Event) => {
            event.preventDefault();
            this.sendMessage(this.inputArea.value.trim());
        });
        inputWrapper.appendChild(this.sendButton);

        // IPC listeners
        ipcRenderer.on('ai-chat-response', (_event: Electron.IpcRendererEvent, data: { content: string }) => {
            this.onResponse(data.content);
        });

        ipcRenderer.on('ai-chat-stream', (_event: Electron.IpcRendererEvent, data: { content: string }) => {
            this.onStream(data.content);
        });

        ipcRenderer.on('ai-chat-error', (_event: Electron.IpcRendererEvent, data: { error: string }) => {
            this.onError(data.error);
        });

        ipcRenderer.on('set-ai-engines', (_event: Electron.IpcRendererEvent, engines: EngineInfo[]) => {
            this.setEngines(engines);
        });

        ipcRenderer.send('get-ai-engines');
    }

    setCurrentSegment(sourcePreview: string): void {
        if (sourcePreview) {
            let display = sourcePreview.length > 60 ? sourcePreview.substring(0, 60) + '...' : sourcePreview;
            this.segmentIndicator.innerText = 'Current: ' + display;
        } else {
            this.segmentIndicator.innerText = 'No segment selected';
        }
    }

    private addQuickButton(parent: HTMLDivElement, label: string, prompt: string): void {
        let btn = document.createElement('a');
        btn.href = '#';
        btn.classList.add('aiQuickButton');
        btn.innerText = label;
        btn.addEventListener('click', (event: Event) => {
            event.preventDefault();
            this.sendMessage(prompt);
        });
        parent.appendChild(btn);
    }

    private sendMessage(text: string): void {
        if (this.sending || text === '') {
            return;
        }
        let engine = this.engineSelect.value;
        if (engine === '') {
            this.appendMessage('assistant', 'Please select an AI engine in the dropdown above, and make sure at least one LLM is enabled in Preferences > Machine Translation.');
            return;
        }

        let context = this.getContext();

        // Show a short label in chat for quick actions (not the full prompt)
        let displayText = text.length > 80 ? text.substring(0, 80) + '...' : text;
        this.messages.push({ role: 'user', content: text });
        this.appendMessage('user', displayText);
        this.inputArea.value = '';
        this.sending = true;
        this.sendButton.innerText = '...';

        ipcRenderer.send('ai-chat', {
            messages: this.messages,
            engine: engine,
            sourceText: context.sourceText,
            targetText: context.targetText,
            srcLang: context.srcLang,
            tgtLang: context.tgtLang
        });
    }

    onResponse(content: string): void {
        this.sending = false;
        this.sendButton.innerText = 'Send';
        this.messages.push({ role: 'assistant', content: content });

        if (this.streamingTextDiv) {
            // Finalize the streaming div
            this.streamingTextDiv.innerHTML = marked.parse(content) as string;
            let msgDiv = this.streamingTextDiv.parentElement!;
            let insertBtn = document.createElement('a');
            insertBtn.href = '#';
            insertBtn.classList.add('aiInsertButton');
            insertBtn.innerText = 'Insert';
            insertBtn.addEventListener('click', (event: Event) => {
                event.preventDefault();
                this.insertText(content);
            });
            msgDiv.appendChild(insertBtn);
            this.streamingTextDiv = null;
        } else {
            this.appendMessage('assistant', content);
        }
    }

    private onStream(content: string): void {
        if (!this.streamingTextDiv) {
            let msgDiv = document.createElement('div');
            msgDiv.classList.add('aiMessage', 'assistant');
            this.streamingTextDiv = document.createElement('div');
            this.streamingTextDiv.classList.add('aiMessageText');
            msgDiv.appendChild(this.streamingTextDiv);
            this.messagesContainer.appendChild(msgDiv);
        }
        this.streamingTextDiv.innerHTML = marked.parse(content) as string;
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    appendScoringResult(content: string): void {
        this.messages.push({ role: 'assistant', content: content });
        let msgDiv = document.createElement('div');
        msgDiv.classList.add('aiMessage', 'assistant', 'scoringResult');

        let header = document.createElement('div');
        header.classList.add('scoringHeader');
        header.innerText = 'AI Scoring Result';
        msgDiv.appendChild(header);

        let textDiv = document.createElement('div');
        textDiv.classList.add('aiMessageText');
        textDiv.innerHTML = marked.parse(content) as string;
        msgDiv.appendChild(textDiv);

        this.messagesContainer.appendChild(msgDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    private onError(error: string): void {
        this.sending = false;
        this.sendButton.innerText = 'Send';
        if (this.streamingTextDiv) {
            let msgDiv = this.streamingTextDiv.parentElement;
            if (msgDiv) msgDiv.remove();
            this.streamingTextDiv = null;
        }
        this.appendMessage('assistant', 'Error: ' + error);
    }

    private appendMessage(role: 'user' | 'assistant', content: string): void {
        let msgDiv = document.createElement('div');
        msgDiv.classList.add('aiMessage');
        msgDiv.classList.add(role);

        let textDiv = document.createElement('div');
        textDiv.classList.add('aiMessageText');
        if (role === 'assistant') {
            textDiv.innerHTML = marked.parse(content) as string;
        } else {
            textDiv.innerText = content;
        }
        msgDiv.appendChild(textDiv);

        if (role === 'assistant') {
            let insertBtn = document.createElement('a');
            insertBtn.href = '#';
            insertBtn.classList.add('aiInsertButton');
            insertBtn.innerText = 'Insert';
            insertBtn.addEventListener('click', (event: Event) => {
                event.preventDefault();
                this.insertText(content);
            });
            msgDiv.appendChild(insertBtn);
        }

        this.messagesContainer.appendChild(msgDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    private setEngines(engines: EngineInfo[]): void {
        this.engineSelect.innerHTML = '';
        if (engines.length === 0) {
            let option = document.createElement('option');
            option.value = '';
            option.innerText = 'No engines enabled';
            this.engineSelect.appendChild(option);
            return;
        }
        for (let engine of engines) {
            let option = document.createElement('option');
            option.value = engine.shortName;
            option.innerText = engine.name;
            this.engineSelect.appendChild(option);
        }
    }

    private clearChat(): void {
        this.messages = [];
        this.messagesContainer.innerHTML = '';
        this.streamingTextDiv = null;
    }
}
