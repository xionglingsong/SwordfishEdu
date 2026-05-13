import { ipcRenderer } from "electron";
import { marked } from "marked";
import { computeConfidence, validateScoringResult } from "./scoringSchema.js";

interface SubScore {
    score: number;
    max: number;
    label?: string;
    errorPoints?: number;
}

interface SubScores {
    meaningTransfer: SubScore;
    targetMechanics: SubScore;
    writingQuality: SubScore;
}

interface ErrorItem {
    type: string;
    code: string;
    section: string;
    severity: number;
    deduction: number;
    isRepeat: boolean;
    description: string;
    original: string;
    suggested: string;
    impactScope?: string;
    iegsRule?: string;
    testQuestion?: string;
    testAnswer?: string;
}

interface AlternativeRef {
    register: string;
    translation: string;
}

interface SegmentFeedback {
    score: number;
    subScores?: SubScores | null;
    analysis: string;
    strengths: string[];
    issues: string[];
    errors?: ErrorItem[];
    alternativeReferences?: AlternativeRef[];
    qualityHighlight?: string;
}

interface ScoringResult {
    version?: number;
    totalScore: number;
    level: string;
    overallComment?: string;
    overallAnalysis?: string;
    errorPoints?: number;
    qualityPoints?: number;
    qualityHighlights?: string[];
    rootDiagnosis?: string;
    subScores?: SubScores;
    suggestions: string[];
    segments: SegmentFeedback[];
    confidence?: 'high' | 'medium' | 'low';
}

interface DiffWord {
    text: string;
    type: 'same' | 'added' | 'removed';
}

interface TrendPoint {
    timestamp: string;
    totalScore: number;
    errorPoints?: number;
    qualityPoints?: number;
    meaningTransfer?: number;
    targetMechanics?: number;
    writingQuality?: number;
    deltaFromPrevious?: number;
}

interface ErrorPattern {
    code: string;
    section: string;
    count: number;
    totalDeduction: number;
    avgSeverity: number;
}

interface HistoryEntry {
    id: string;
    timestamp: string;
    score: string;
    engine: string;
    translatedCount: number;
    segmentCount: number;
    structured: ScoringResult | null;
    segments: { source: string; target: string; reference?: string }[];
    reflections: Record<string, string>;
}

interface HistoryListData {
    historyList: HistoryEntry[];
    projectName: string;
    references: string[];
    trendData?: TrendPoint[];
    errorPatterns?: ErrorPattern[];
}

interface ReportData {
    result: ScoringResult;
    segments: { source: string; target: string }[];
    references: string[];
    historyId: string;
    savedReflections?: Record<string, string>;
    srcLang?: string;
    tgtLang?: string;
}

export class ScoreReport {

    private container: HTMLDivElement;
    private currentHistoryData: HistoryListData | null = null;
    private currentReportData: ReportData | null = null;
    private zoomLevel: number = 100;

    // Streaming state
    private isStreaming: boolean = false;
    private thinkingContent: string = '';
    private streamingContent: string = '';
    private thinkingSection: HTMLElement | null = null;
    private thinkingBody: HTMLElement | null = null;
    private thinkingText: HTMLElement | null = null;
    private streamingOutput: HTMLElement | null = null;
    private streamingStatus: HTMLElement | null = null;
    private charCountSpan: HTMLElement | null = null;
    private progressiveContainer: HTMLElement | null = null;
    private renderedSegmentCount: number = 0;
    private liveScore: number = -1;
    private liveLevel: string = '';

    constructor() {
        this.container = document.getElementById('reportContainer') as HTMLDivElement;
        if (!this.container) throw new Error('reportContainer element not found');

        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (_event: Electron.IpcRendererEvent, theme: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = theme;
                document.body.classList.toggle('sr-dark', theme.includes('dark'));
        });

        ipcRenderer.on('set-score-report-data', (_event: Electron.IpcRendererEvent, data: ReportData | HistoryListData) => {
            if ('historyList' in data) {
                this.renderHistoryList(data);
            } else {
                this.renderReport(data);
            }
        });

        ipcRenderer.on('set-score-report-history', (_event: Electron.IpcRendererEvent, data: { projectId: string }) => {
            this.requestReport(data.projectId);
        });

        ipcRenderer.on('set-re-score-result', (_event: Electron.IpcRendererEvent, data: { segmentIndex: number; result: SegmentFeedback; totalScore: number }) => {
            this.handleRepracticeResult(data);
        });

        // Streaming IPC listeners
        ipcRenderer.on('score-stream-start', (_event: Electron.IpcRendererEvent, data: { engine: string; supportsThinking: boolean }) => {
            this.enterStreamingMode(data.supportsThinking);
        });
        ipcRenderer.on('score-stream-thinking', (_event: Electron.IpcRendererEvent, data: { chunk: string }) => {
            this.appendThinkingChunk(data.chunk);
        });
        ipcRenderer.on('score-stream-chunk', (_event: Electron.IpcRendererEvent, data: { chunk: string }) => {
            this.appendContentChunk(data.chunk);
        });
        ipcRenderer.on('score-stream-done', (_event: Electron.IpcRendererEvent, data: { fullContent: string; thinkingContent: string }) => {
            this.handleStreamDone(data.fullContent, data.thinkingContent);
        });
        ipcRenderer.on('score-stream-error', (_event: Electron.IpcRendererEvent, data: { error: string; partialContent: string }) => {
            this.handleStreamError(data.error, data.partialContent);
        });

        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-score-report');
            }
            if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
                event.preventDefault();
                this.adjustZoom(10);
            }
            if ((event.ctrlKey || event.metaKey) && event.key === '-') {
                event.preventDefault();
                this.adjustZoom(-10);
            }
            if ((event.ctrlKey || event.metaKey) && event.key === '0') {
                event.preventDefault();
                this.zoomLevel = 100;
                this.applyZoom();
            }
        });

        ipcRenderer.send('score-report-ready');
    }

    private adjustZoom(delta: number): void {
        let next = this.zoomLevel + delta;
        if (next >= 70 && next <= 150) {
            this.zoomLevel = next;
            this.applyZoom();
        }
    }

    private applyZoom(): void {
        this.container.style.zoom = String(this.zoomLevel / 100);
        let label = this.container.querySelector('.sr-zoomLabel') as HTMLElement;
        if (label) label.innerText = this.zoomLevel + '%';
    }

    private requestReport(projectId: string): void {
        ipcRenderer.send('load-score-history', { projectId: projectId });
    }

    private isV2(result: ScoringResult): boolean {
        return result.version === 2;
    }

    private severityClass(severity: number): string {
        if (severity >= 8) return 'critical';
        if (severity >= 4) return 'serious';
        if (severity >= 2) return 'moderate';
        return 'minor';
    }

    private severityLabel(severity: number): string {
        if (severity >= 8) return '致命 Critical';
        if (severity >= 4) return '严重 Serious';
        if (severity >= 2) return '中等 Moderate';
        return '轻微 Minor';
    }

    private scoreClass(ratio: number): string {
        if (ratio >= 0.8) return 'good';
        if (ratio >= 0.6) return 'mid';
        return 'low';
    }

    private sectionBadgeInfo(section: string): { css: string; text: string } {
        if (section === 'meaning') return { css: 'meaning', text: '意义传递' };
        if (section === 'mechanics') return { css: 'mechanics', text: '译入语规范' };
        return { css: 'quality', text: '行文质量' };
    }

    // ---- Trend Chart ----

    private renderTrendChart(trendData: TrendPoint[]): HTMLElement {
        let container = document.createElement('div');
        container.className = 'sr-trendChart';

        let title = document.createElement('div');
        title.className = 'sr-trendChartTitle';
        title.innerText = '分数趋势';
        container.appendChild(title);

        let count = trendData.length;
        let latestScore = trendData[count - 1].totalScore;
        let primaryColor = latestScore >= 80 ? '#4CAF50' : latestScore >= 60 ? '#FF9800' : '#F44336';

        let svgNS = 'http://www.w3.org/2000/svg';
        let svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 600 200');
        svg.setAttribute('width', '100%');
        svg.setAttribute('class', 'sr-trendSvg');

        // Coordinate mapping helpers
        let xPad = 40;
        let xRange = 550;
        let yPad = 10;
        let yRange = 160;
        let toX = (i: number) => xPad + i * (xRange / (count - 1));
        let toY = (score: number) => yPad + (100 - score) * (yRange / 100);

        // Y-axis labels and grid lines at 0, 50, 100
        for (let val of [0, 50, 100]) {
            let y = toY(val);
            let text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', '32');
            text.setAttribute('y', String(y + 4));
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', 'var(--sr-text-tertiary)');
            text.textContent = String(val);
            svg.appendChild(text);

            let line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', '40');
            line.setAttribute('x2', '590');
            line.setAttribute('y1', String(y));
            line.setAttribute('y2', String(y));
            line.setAttribute('stroke', 'var(--sr-border-light)');
            line.setAttribute('stroke-width', '0.5');
            svg.appendChild(line);
        }

        // X-axis date labels
        for (let i = 0; i < count; i++) {
            let x = toX(i);
            let dateStr = '';
            try {
                dateStr = new Date(trendData[i].timestamp).toLocaleDateString();
            } catch {
                dateStr = trendData[i].timestamp;
            }
            let text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', String(x));
            text.setAttribute('y', '190');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '9');
            text.setAttribute('fill', 'var(--sr-text-tertiary)');
            text.textContent = dateStr;
            svg.appendChild(text);
        }

        // Helper to build a polyline path
        let buildPath = (points: number[]): string => {
            return points.map((score, i) => (i === 0 ? 'M' : 'L') + toX(i) + ',' + toY(score)).join(' ');
        };

        // Primary line: totalScore
        let primaryPath = buildPath(trendData.map(d => d.totalScore));
        let primaryLine = document.createElementNS(svgNS, 'path');
        primaryLine.setAttribute('d', primaryPath);
        primaryLine.setAttribute('fill', 'none');
        primaryLine.setAttribute('stroke', primaryColor);
        primaryLine.setAttribute('stroke-width', '2.5');
        primaryLine.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(primaryLine);

        // Secondary lines
        type SecondaryKey = 'meaningTransfer' | 'targetMechanics' | 'writingQuality';
        let secondaryConfig: { key: SecondaryKey; color: string; label: string }[] = [
            { key: 'meaningTransfer', color: '#1565C0', label: '意义传递' },
            { key: 'targetMechanics', color: '#2E7D32', label: '译入语规范' },
            { key: 'writingQuality', color: '#6A1B9A', label: '行文质量' }
        ];

        let legendItems: { color: string; label: string }[] = [
            { color: primaryColor, label: '总分' }
        ];

        // Tooltip container (positioned absolutely via CSS)
        let tooltip: HTMLDivElement | null = null;

        for (let cfg of secondaryConfig) {
            let values = trendData.map(d => d[cfg.key]);
            if (!values.some(v => v !== undefined && v !== null)) continue;

            let definedValues = values.map(v => v != null ? v : 0);
            let secPath = buildPath(definedValues);
            let secLine = document.createElementNS(svgNS, 'path');
            secLine.setAttribute('d', secPath);
            secLine.setAttribute('fill', 'none');
            secLine.setAttribute('stroke', cfg.color);
            secLine.setAttribute('stroke-width', '1.5');
            secLine.setAttribute('stroke-linejoin', 'round');
            secLine.setAttribute('opacity', '0.7');
            svg.appendChild(secLine);

            // Circle markers for secondary
            for (let i = 0; i < count; i++) {
                if (values[i] == null) continue;
                let cx = toX(i);
                let cy = toY(values[i]!);
                let circle = document.createElementNS(svgNS, 'circle');
                circle.setAttribute('cx', String(cx));
                circle.setAttribute('cy', String(cy));
                circle.setAttribute('r', '3');
                circle.setAttribute('fill', cfg.color);
                circle.setAttribute('class', 'sr-trendDot');
                svg.appendChild(circle);
            }

            legendItems.push({ color: cfg.color, label: cfg.label });
        }

        // Circle markers for primary (on top)
        for (let i = 0; i < count; i++) {
            let cx = toX(i);
            let cy = toY(trendData[i].totalScore);
            let circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', String(cx));
            circle.setAttribute('cy', String(cy));
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', primaryColor);
            circle.setAttribute('class', 'sr-trendDot');

            // Tooltip on hover
            let capturedI = i;
            circle.addEventListener('mouseenter', (e: Event) => {
                let mouseEvent = e as MouseEvent;
                if (!tooltip) {
                    tooltip = document.createElement('div');
                    tooltip.className = 'sr-trendTooltip';
                    container.appendChild(tooltip);
                }
                let dateStr = '';
                try {
                    dateStr = new Date(trendData[capturedI].timestamp).toLocaleDateString();
                } catch {
                    dateStr = trendData[capturedI].timestamp;
                }
                tooltip.textContent = dateStr + ': ' + trendData[capturedI].totalScore + '分';
                let rect = container.getBoundingClientRect();
                tooltip.style.left = (mouseEvent.clientX - rect.left + 10) + 'px';
                tooltip.style.top = (mouseEvent.clientY - rect.top - 30) + 'px';
                tooltip.style.display = 'block';
            });
            circle.addEventListener('mouseleave', () => {
                if (tooltip) tooltip.style.display = 'none';
            });

            svg.appendChild(circle);
        }

        container.appendChild(svg);

        // Legend
        let legend = document.createElement('div');
        legend.className = 'sr-trendLegend';
        for (let item of legendItems) {
            let legendItem = document.createElement('span');
            legendItem.className = 'sr-trendLegendItem';
            let line = document.createElement('span');
            line.className = 'sr-trendLegendLine';
            line.style.background = item.color;
            legendItem.appendChild(line);
            let label = document.createElement('span');
            label.textContent = item.label;
            legendItem.appendChild(label);
            legend.appendChild(legendItem);
        }
        container.appendChild(legend);

        return container;
    }

    // ---- Error Pattern Dashboard ----

    private static ERROR_ADVICE: Record<string, string> = {
        SYN: '复习：复杂句重构技巧，练习长句拆分与合并',
        AMB: '练习：消除歧义——添加语境词或调整语序',
        OMT: '检查：是否有原文关键信息遗漏，逐句对照',
        ADD: '注意：避免添加原文没有的内容',
        TW: '练习：同义词辨析与译入语搭配选择',
        REG: '练习：语域识别——正式/半正式/口语体的词汇选择',
        COL: '复习：译入语固定搭配与习惯表达',
        TERM: '建议：建立术语表，翻译前查阅平行文本',
        PUNC: '复习：译入语标点规范（中英标点差异）',
        SP: '注意：拼写检查——翻译完成后通读一遍',
        GRM: '复习：译入语语法规则，尤其是特殊句式',
        CF: '练习：词形变化与一致性（时态、单复数、冠词）',
        FLW: '练习：使用逻辑连接词改善句际衔接',
        VOC: '练习：扩大译入语词汇量，关注搭配用法',
        STY: '复习：学术/正式文本的文体规范',
        CS: '练习：长句切分与断句技巧',
        LC: '注意：逻辑一致性，翻译后检查因果关系',
        NP: '练习：专有名词的查证与标准化翻译',
        OTH: '建议：回顾错误详情，针对性练习'
    };

    private renderErrorDashboard(errorPatterns: ErrorPattern[]): HTMLElement {
        let container = document.createElement('div');
        container.className = 'sr-errorDashboard';

        let title = document.createElement('div');
        title.className = 'sr-errorDashboardTitle';
        title.innerText = '错误模式分析';
        container.appendChild(title);

        // Focus Recommendation: top error by deduction
        if (errorPatterns.length > 0) {
            let topByDeduction = errorPatterns.reduce((a, b) => b.totalDeduction > a.totalDeduction ? b : a);
            let focusDiv = document.createElement('div');
            focusDiv.className = 'sr-focusRecommendation';
            let advice = ScoreReport.ERROR_ADVICE[topByDeduction.code] || '回顾该错误类型的详细说明';
            focusDiv.innerText = '🎯 优先修复: ' + topByDeduction.code + ' (扣' + topByDeduction.totalDeduction + '分) — ' + advice;
            container.appendChild(focusDiv);
        }

        let topPatterns = errorPatterns.slice(0, 8);
        let maxCount = Math.max(...topPatterns.map(p => p.count), 1);

        let sectionColors: Record<string, { fill: string; badge: string }> = {
            meaning: { fill: 'meaning', badge: 'meaning' },
            mechanics: { fill: 'mechanics', badge: 'mechanics' },
            quality: { fill: 'quality', badge: 'quality' }
        };

        let sectionLabels: Record<string, string> = {
            meaning: '意义',
            mechanics: '规范',
            quality: '行文'
        };

        for (let pattern of topPatterns) {
            let row = document.createElement('div');
            row.className = 'sr-errorBarRow';

            // Left: error code + section badge
            let label = document.createElement('span');
            label.className = 'sr-errorBarLabel';
            label.textContent = pattern.code;
            row.appendChild(label);

            let sectionKey = sectionColors[pattern.section] ? pattern.section : 'quality';
            let badge = document.createElement('span');
            badge.className = 'sr-errorBarSection ' + sectionColors[sectionKey].badge;
            badge.textContent = sectionLabels[sectionKey] || pattern.section;
            row.appendChild(badge);

            // Middle: horizontal bar
            let track = document.createElement('div');
            track.className = 'sr-errorBarTrack';
            let barWidth = Math.round((pattern.count / maxCount) * 100);
            let fill = document.createElement('div');
            fill.className = 'sr-errorBarFill ' + sectionColors[sectionKey].fill;
            fill.style.width = barWidth + '%';
            track.appendChild(fill);
            row.appendChild(track);

            // Right: stats
            let stat = document.createElement('span');
            stat.className = 'sr-errorBarStat';
            stat.textContent = pattern.count + '次 | -' + pattern.totalDeduction + '分';
            row.appendChild(stat);

            // Action advice
            let actionText = ScoreReport.ERROR_ADVICE[pattern.code] || '';
            if (actionText) {
                let action = document.createElement('div');
                action.className = 'sr-errorBarAction';
                action.textContent = '→ ' + actionText;
                row.appendChild(action);
            }

            container.appendChild(row);
        }

        return container;
    }

    // ---- Streaming Mode ----

    private enterStreamingMode(supportsThinking: boolean): void {
        this.isStreaming = true;
        this.thinkingContent = '';
        this.streamingContent = '';
        this.renderedSegmentCount = 0;
        this.liveScore = -1;
        this.liveLevel = '';
        this.progressiveContainer = null;
        this.container.innerHTML = '';

        let wrapper = document.createElement('div');
        wrapper.className = 'sr-streamingContainer';

        // Status bar
        let status = document.createElement('div');
        status.className = 'sr-streamingStatus';
        let spinner = document.createElement('span');
        spinner.className = 'sr-streamingSpinner';
        status.appendChild(spinner);
        let statusText = document.createElement('span');
        statusText.className = 'sr-streamingDots';
        statusText.innerText = 'AI 正在评分';
        status.appendChild(statusText);
        wrapper.appendChild(status);
        this.streamingStatus = status;

        // Thinking section (hidden until chunks arrive)
        let thinkSection = document.createElement('div');
        thinkSection.className = 'sr-thinkingSection';
        thinkSection.style.display = 'none';
        let thinkHeader = document.createElement('div');
        thinkHeader.className = 'sr-thinkingHeader';
        let thinkArrow = document.createElement('span');
        thinkArrow.className = 'sr-thinkingArrow';
        thinkArrow.innerText = '▶';
        thinkHeader.appendChild(thinkArrow);
        let thinkLabel = document.createElement('span');
        thinkLabel.innerText = 'AI 思考过程';
        thinkHeader.appendChild(thinkLabel);
        let thinkToken = document.createElement('span');
        thinkToken.className = 'sr-thinkingToken';
        thinkHeader.appendChild(thinkToken);
        let thinkBody = document.createElement('div');
        thinkBody.className = 'sr-thinkingBody';
        let thinkText = document.createElement('div');
        thinkText.className = 'sr-thinkingContent';
        thinkBody.appendChild(thinkText);
        thinkSection.appendChild(thinkHeader);
        thinkSection.appendChild(thinkBody);

        thinkHeader.addEventListener('click', () => {
            let isOpen = thinkBody.classList.contains('open');
            thinkBody.classList.toggle('open', !isOpen);
            thinkArrow.classList.toggle('open', !isOpen);
        });

        wrapper.appendChild(thinkSection);
        this.thinkingSection = thinkSection;
        this.thinkingBody = thinkBody;
        this.thinkingText = thinkText;

        // Streaming output section
        let outputSection = document.createElement('div');
        outputSection.className = 'sr-streamingOutputSection';
        let outputHeader = document.createElement('div');
        outputHeader.className = 'sr-streamingOutputHeader';
        outputHeader.innerText = '评分结果生成中...';
        let charCount = document.createElement('span');
        charCount.className = 'sr-streamingCharCount';
        charCount.innerText = '0 字符';
        outputHeader.appendChild(charCount);
        let output = document.createElement('div');
        output.className = 'sr-streamingOutput';
        outputSection.appendChild(outputHeader);
        outputSection.appendChild(output);
        wrapper.appendChild(outputSection);
        this.streamingOutput = output;
        this.charCountSpan = charCount;

        this.container.appendChild(wrapper);
    }

    private appendThinkingChunk(chunk: string): void {
        if (!this.thinkingSection || !this.thinkingText) return;
        this.thinkingContent += chunk;
        this.thinkingSection.style.display = '';
        this.thinkingText.innerText = this.thinkingContent;
        // Auto-scroll
        if (this.thinkingBody && this.thinkingBody.classList.contains('open')) {
            this.thinkingBody.scrollTop = this.thinkingBody.scrollHeight;
        }
    }

    private appendContentChunk(chunk: string): void {
        if (!this.streamingOutput) return;
        this.streamingContent += chunk;

        // Keep raw output updated (collapsed when progressive kicks in)
        this.streamingOutput.innerText = this.streamingContent;
        if (this.charCountSpan) {
            this.charCountSpan.innerText = this.streamingContent.length + ' 字符';
        }
        this.streamingOutput.scrollTop = this.streamingOutput.scrollHeight;

        // Progressive extraction from partial JSON
        this.tryProgressiveRender();
    }

    private tryProgressiveRender(): void {
        let content = this.streamingContent;

        // Extract totalScore
        let scoreMatch = content.match(/"totalScore"\s*:\s*(\d+)/);
        if (scoreMatch && this.liveScore < 0) {
            this.liveScore = parseInt(scoreMatch[1]);
            this.showProgressiveSection();
            this.renderLiveScore();
        }

        // Extract level
        let levelMatch = content.match(/"level"\s*:\s*"([^"]+)"/);
        if (levelMatch && !this.liveLevel) {
            this.liveLevel = levelMatch[1];
            this.renderLiveScore();
        }

        // Try to extract and render complete segment objects
        this.tryRenderSegments(content);
    }

    private showProgressiveSection(): void {
        if (this.progressiveContainer) return;
        if (!this.streamingStatus) return;

        // Collapse the raw output section
        if (this.streamingOutput) {
            let parent = this.streamingOutput.parentElement;
            if (parent) parent.style.display = 'none';
        }

        // Update status
        this.streamingStatus.innerHTML = '<span class="sr-streamingSpinner" style="display:inline-block;width:12px;height:12px;border-width:2px;vertical-align:middle;margin-right:6px;"></span><span style="color:var(--sr-accent-green);">评分结果正在生成中...</span>';

        // Create progressive container after status
        let container = document.createElement('div');
        container.className = 'sr-progressiveContainer';
        this.streamingStatus.parentElement?.appendChild(container);
        this.progressiveContainer = container;
    }

    private renderLiveScore(): void {
        if (!this.progressiveContainer || this.liveScore < 0) return;

        let existing = this.progressiveContainer.querySelector('.sr-progHero');
        if (!existing) {
            let hero = document.createElement('div');
            hero.className = 'sr-progHero';
            hero.style.cssText = 'display:flex;align-items:center;gap:16px;padding:12px;background:var(--sr-bg-card);border-radius:8px;margin-bottom:12px;';
            this.progressiveContainer.insertBefore(hero, this.progressiveContainer.firstChild);
        }

        let hero = this.progressiveContainer.querySelector('.sr-progHero')!;
        hero.innerHTML = '';

        let scoreSpan = document.createElement('span');
        scoreSpan.style.cssText = 'font-size:36px;font-weight:bold;';
        scoreSpan.className = this.scoreClass(this.liveScore / 100);
        scoreSpan.innerText = String(this.liveScore);
        hero.appendChild(scoreSpan);

        let maxSpan = document.createElement('span');
        maxSpan.style.cssText = 'font-size:18px;color:var(--sr-text-tertiary);';
        maxSpan.innerText = '/100';
        hero.appendChild(maxSpan);

        if (this.liveLevel) {
            let badge = document.createElement('span');
            badge.className = 'sr-levelBadge ' + this.levelClass(this.liveLevel);
            badge.style.marginLeft = '12px';
            badge.innerText = this.normalizeLevel(this.liveLevel);
            hero.appendChild(badge);
        }
    }

    private tryRenderSegments(content: string): void {
        if (!this.progressiveContainer) return;

        // Find segment boundaries: each segment starts with { after "segments": [
        // Try to extract complete segment objects by finding balanced braces
        let segmentsStart = content.indexOf('"segments"');
        if (segmentsStart < 0) return;

        // Find the array start
        let arrayStart = content.indexOf('[', segmentsStart);
        if (arrayStart < 0) return;

        // Extract individual segment objects using brace counting
        let pos = arrayStart + 1;
        let segIndex = 0;

        while (pos < content.length) {
            // Skip whitespace
            while (pos < content.length && /\s/.test(content[pos])) pos++;
            if (pos >= content.length || content[pos] !== '{') break;

            // Find the matching closing brace
            let depth = 0;
            let segStart = pos;
            let segEnd = -1;
            let inString = false;
            let escape = false;

            while (pos < content.length) {
                let ch = content[pos];
                if (escape) { escape = false; pos++; continue; }
                if (ch === '\\' && inString) { escape = true; pos++; continue; }
                if (ch === '"') { inString = !inString; pos++; continue; }
                if (inString) { pos++; continue; }
                if (ch === '{') depth++;
                if (ch === '}') { depth--; if (depth === 0) { segEnd = pos; break; } }
                pos++;
            }

            if (segEnd < 0) break; // Segment not complete yet

            let segJson = content.substring(segStart, segEnd + 1);

            // Only render if we haven't rendered this segment yet
            if (segIndex >= this.renderedSegmentCount) {
                try {
                    let seg = JSON.parse(segJson) as SegmentFeedback;
                    if (typeof seg.score === 'number') {
                        this.renderProgressiveSegment(segIndex, seg);
                        this.renderedSegmentCount = segIndex + 1;
                    }
                } catch {
                    // Not valid JSON yet, skip
                }
            }

            segIndex++;
            pos = segEnd + 1;

            // Skip comma
            while (pos < content.length && /[\s,]/.test(content[pos])) pos++;
        }
    }

    private renderProgressiveSegment(index: number, seg: SegmentFeedback): void {
        if (!this.progressiveContainer) return;

        let card = document.createElement('div');
        card.className = 'sr-progSegment';
        card.style.cssText = 'padding:10px 12px;background:var(--sr-bg-card);border:1px solid var(--sr-border);border-radius:6px;margin-bottom:8px;animation:sr-fadeIn 0.3s ease;';

        let header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
        let title = document.createElement('span');
        title.style.cssText = 'font-weight:bold;font-size:13px;';
        title.innerText = '第' + (index + 1) + '段';
        header.appendChild(title);

        if (seg.score !== undefined) {
            let badge = document.createElement('span');
            badge.style.cssText = 'font-size:12px;font-weight:bold;';
            badge.className = this.scoreClass(seg.score / 100);
            badge.innerText = Math.round(seg.score) + '分';
            header.appendChild(badge);
        }
        card.appendChild(header);

        // Strengths
        if (seg.strengths && seg.strengths.length > 0) {
            let strDiv = document.createElement('div');
            strDiv.style.cssText = 'font-size:12px;color:var(--sr-accent-green);margin-bottom:4px;';
            strDiv.innerText = '✓ ' + seg.strengths.join('; ');
            card.appendChild(strDiv);
        }

        // Issues
        if (seg.issues && seg.issues.length > 0) {
            let issDiv = document.createElement('div');
            issDiv.style.cssText = 'font-size:12px;color:var(--sr-accent-red);margin-bottom:4px;';
            issDiv.innerText = '⚠ ' + seg.issues.join('; ');
            card.appendChild(issDiv);
        }

        // Errors summary
        if (seg.errors && seg.errors.length > 0) {
            let errDiv = document.createElement('div');
            errDiv.style.cssText = 'font-size:11px;color:var(--sr-text-tertiary);';
            let errSummary = seg.errors.map(e => e.code + '(' + e.severity + ')').join(', ');
            errDiv.innerText = '错误: ' + errSummary;
            card.appendChild(errDiv);
        }

        // Analysis
        if (seg.analysis) {
            let anaDiv = document.createElement('div');
            anaDiv.style.cssText = 'font-size:12px;color:var(--sr-text-secondary);margin-top:4px;line-height:1.6;';
            anaDiv.innerText = seg.analysis.substring(0, 200) + (seg.analysis.length > 200 ? '...' : '');
            card.appendChild(anaDiv);
        }

        this.progressiveContainer.appendChild(card);
    }

    private handleStreamDone(fullContent: string, thinkingContent: string): void {
        if (!this.isStreaming) return;

        if (this.streamingStatus) {
            this.streamingStatus.innerHTML = '<span style="color:var(--sr-accent-green);">✓ 评分完成，正在解析...</span>';
        }

        let structured = validateScoringResult(fullContent);

        if (structured) {
            // Brief delay for "parsing" state to be visible
            setTimeout(() => {
                this.isStreaming = false;
                this.container.innerHTML = '';

                // Preserve thinking section at top
                if (thinkingContent) {
                    let thinkDiv = document.createElement('div');
                    thinkDiv.className = 'sr-thinkingSection';
                    thinkDiv.style.marginBottom = '12px';
                    let header = document.createElement('div');
                    header.className = 'sr-thinkingHeader';
                    let arrow = document.createElement('span');
                    arrow.className = 'sr-thinkingArrow';
                    arrow.innerText = '▶';
                    header.appendChild(arrow);
                    header.appendChild(document.createTextNode('AI 思考过程'));
                    let body = document.createElement('div');
                    body.className = 'sr-thinkingBody';
                    let text = document.createElement('div');
                    text.className = 'sr-thinkingContent';
                    text.innerText = thinkingContent;
                    body.appendChild(text);
                    thinkDiv.appendChild(header);
                    thinkDiv.appendChild(body);
                    header.addEventListener('click', () => {
                        let isOpen = body.classList.contains('open');
                        body.classList.toggle('open', !isOpen);
                        arrow.classList.toggle('open', !isOpen);
                    });
                    this.container.appendChild(thinkDiv);
                }

                // Render the structured report below
                let fakeData: ReportData = {
                    result: structured,
                    segments: structured.segments.map(() => ({ source: '', target: '' })),
                    references: [],
                    historyId: '',
                    srcLang: undefined,
                    tgtLang: undefined
                };
                this.currentReportData = fakeData;

                let v2 = this.isV2(structured);
                let perSegMax = 100;
                let perSegScore = structured.totalScore;

                if (this.currentHistoryData) {
                    this.container.appendChild(this.createBackLink());
                }
                this.container.appendChild(this.renderOverview(structured, v2));
                this.container.appendChild(this.renderToolbar());

                if (structured.segments.length > 1) {
                    this.container.appendChild(this.renderSegmentNav(structured.segments, perSegMax, perSegScore));
                }

                for (let i = 0; i < structured.segments.length; i++) {
                    this.container.appendChild(this.renderSegmentCard(i, structured.segments[i], fakeData.segments[i], '', perSegScore, perSegMax, v2, fakeData));
                }

                this.container.appendChild(this.renderSuggestions(structured.suggestions));
            }, 400);
        } else {
            // Validation failed — keep streaming output, show error
            if (this.streamingStatus) {
                this.streamingStatus.innerHTML = '<span style="color:var(--sr-accent-orange);">⚠ 评分结果解析失败，原始输出如下</span>';
            }
        }
    }

    private handleStreamError(error: string, partialContent: string): void {
        if (!this.isStreaming) return;
        this.isStreaming = false;

        this.container.innerHTML = '';
        let errorDiv = document.createElement('div');
        errorDiv.className = 'sr-streamError';
        errorDiv.innerText = '评分失败：' + error;
        this.container.appendChild(errorDiv);

        if (partialContent) {
            let pre = document.createElement('pre');
            pre.style.cssText = 'padding:10px;font-size:12px;white-space:pre-wrap;background:var(--sr-bg-neutral);border-radius:4px;margin-top:8px;';
            pre.innerText = partialContent;
            this.container.appendChild(pre);
        }
    }

    // ---- History List ----

    private renderHistoryList(data: HistoryListData): void {
        this.currentHistoryData = data;
        this.container.innerHTML = '';

        let title = document.createElement('div');
        title.className = 'sr-historyTitle';
        title.innerText = '评分历史 — ' + data.projectName;
        this.container.appendChild(title);

        // Trend chart
        if (data.trendData && data.trendData.length >= 2) {
            this.container.appendChild(this.renderTrendChart(data.trendData));
        }
        // Error dashboard
        if (data.errorPatterns && data.errorPatterns.length > 0) {
            this.container.appendChild(this.renderErrorDashboard(data.errorPatterns));
        }

        // Comparison toggle
        if (data.historyList.length >= 2) {
            let compareToggle = document.createElement('a');
            compareToggle.href = '#';
            compareToggle.className = 'sr-compareToggle';
            compareToggle.innerText = '对比两次评分';
            this.container.appendChild(compareToggle);

            let compareOpen = false;
            let compareSection: HTMLElement | null = null;
            compareToggle.addEventListener('click', (e: Event) => {
                e.preventDefault();
                compareOpen = !compareOpen;
                if (compareOpen) {
                    compareToggle.innerText = '收起对比';
                    compareSection = this.renderComparisonView(data.historyList);
                    this.container.insertBefore(compareSection, compareToggle.nextSibling);
                } else {
                    compareToggle.innerText = '对比两次评分';
                    if (compareSection && compareSection.parentNode) {
                        compareSection.parentNode.removeChild(compareSection);
                    }
                    compareSection = null;
                }
            });
        }

        if (data.historyList.length === 0) {
            let empty = document.createElement('div');
            empty.className = 'sr-emptyReport';
            empty.innerText = '暂无评分记录。';
            this.container.appendChild(empty);
            return;
        }

        for (let entry of data.historyList) {
            let card = document.createElement('div');
            card.className = 'sr-segmentCard';

            let header = document.createElement('div');
            header.className = 'sr-historyHeader';

            let dateSpan = document.createElement('span');
            dateSpan.className = 'sr-historyDate';
            dateSpan.innerText = new Date(entry.timestamp).toLocaleString();

            let scoreSpan = document.createElement('span');
            let scoreNum = parseInt(entry.score) || 0;
            let sClass = scoreNum >= 80 ? 'good' : scoreNum >= 60 ? 'mid' : 'low';
            scoreSpan.className = 'sr-segmentScore ' + sClass;
            scoreSpan.innerText = entry.score;

            // Delta from previous attempt
            let trendEntry = data.trendData?.find(t => t.timestamp === entry.timestamp);
            if (trendEntry && trendEntry.deltaFromPrevious !== undefined) {
                let deltaSpan = document.createElement('span');
                deltaSpan.className = 'sr-deltaBadge ' + (trendEntry.deltaFromPrevious > 0 ? 'positive' : trendEntry.deltaFromPrevious < 0 ? 'negative' : 'zero');
                deltaSpan.innerText = (trendEntry.deltaFromPrevious > 0 ? '+' : '') + trendEntry.deltaFromPrevious;
                scoreSpan.appendChild(deltaSpan);
            }

            let engineSpan = document.createElement('span');
            engineSpan.className = 'sr-historyMeta';
            engineSpan.innerText = entry.engine;

            let segSpan = document.createElement('span');
            segSpan.className = 'sr-historyMeta';
            segSpan.innerText = entry.translatedCount + '/' + entry.segmentCount + '段';

            let spacer = document.createElement('span');
            spacer.className = 'sr-historySpacer';

            let viewBtn = document.createElement('span');
            viewBtn.className = 'sr-historyViewBtn';
            viewBtn.innerText = '查看详情';

            header.appendChild(dateSpan);
            header.appendChild(scoreSpan);
            header.appendChild(engineSpan);
            header.appendChild(segSpan);
            header.appendChild(spacer);
            header.appendChild(viewBtn);
            card.appendChild(header);

            let entryRef = entry;
            viewBtn.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                if (entryRef.structured) {
                    let references = entryRef.segments.map((s: { reference?: string }) => s.reference || '');
                    this.renderReport({
                        result: entryRef.structured,
                        segments: entryRef.segments,
                        references: references,
                        historyId: entryRef.id,
                        savedReflections: entryRef.reflections || {}
                    });
                } else {
                    let empty = document.createElement('div');
                    empty.className = 'sr-emptyReport';
                    empty.innerText = '无结构化数据';
                    this.container.innerHTML = '';
                    this.container.appendChild(empty);
                }
            });

            this.container.appendChild(card);
        }

        let latest = data.historyList[0];
        if (latest && latest.structured) {
            let refs = latest.segments.map((s: { reference?: string }) => s.reference || '');
            this.renderReport({
                result: latest.structured,
                segments: latest.segments,
                references: refs,
                historyId: latest.id,
                savedReflections: latest.reflections || {}
            });
        }
    }

    // ---- Cross-Session Comparison ----

    private renderComparisonView(entries: HistoryEntry[]): HTMLElement {
        let section = document.createElement('div');
        section.className = 'sr-compareSection';

        // Selectors row
        let selectors = document.createElement('div');
        selectors.className = 'sr-compareSelectors';

        let selectA = document.createElement('select');
        selectA.className = 'sr-compareSelect';
        let selectB = document.createElement('select');
        selectB.className = 'sr-compareSelect';

        for (let i = 0; i < entries.length; i++) {
            let entry = entries[i];
            let dateStr = '';
            try { dateStr = new Date(entry.timestamp).toLocaleDateString(); } catch { dateStr = entry.timestamp; }
            let optA = document.createElement('option');
            optA.value = String(i);
            optA.textContent = dateStr + ' (' + entry.score + '分)';
            selectA.appendChild(optA);
            let optB = document.createElement('option');
            optB.value = String(i);
            optB.textContent = dateStr + ' (' + entry.score + '分)';
            selectB.appendChild(optB);
        }
        // Default: select first two
        if (entries.length >= 2) {
            selectB.value = '1';
        }

        selectors.appendChild(document.createTextNode('A: '));
        selectors.appendChild(selectA);
        selectors.appendChild(document.createTextNode(' B: '));
        selectors.appendChild(selectB);

        let compareBtn = document.createElement('button');
        compareBtn.className = 'sr-repracticeSubmit';
        compareBtn.innerText = '对比';
        compareBtn.style.marginLeft = '8px';
        selectors.appendChild(compareBtn);
        section.appendChild(selectors);

        let resultContainer = document.createElement('div');
        section.appendChild(resultContainer);

        compareBtn.addEventListener('click', (e: Event) => {
            e.preventDefault();
            let idxA = parseInt(selectA.value);
            let idxB = parseInt(selectB.value);
            if (idxA === idxB) {
                resultContainer.innerHTML = '<div style="color:#C62828;font-size:12px;">请选择两个不同的评分记录。</div>';
                return;
            }
            let entryA = entries[idxA];
            let entryB = entries[idxB];
            if (!entryA.structured || !entryB.structured) {
                resultContainer.innerHTML = '<div style="color:#C62828;font-size:12px;">所选记录缺少结构化数据，无法对比。</div>';
                return;
            }
            resultContainer.innerHTML = '';
            resultContainer.appendChild(this.buildComparisonGrid(entryA, entryB));
        });

        return section;
    }

    private buildComparisonGrid(entryA: HistoryEntry, entryB: HistoryEntry): HTMLElement {
        let grid = document.createElement('div');
        grid.className = 'sr-compareGrid';

        let resA = entryA.structured!;
        let resB = entryB.structured!;

        let dateA = '';
        let dateB = '';
        try { dateA = new Date(entryA.timestamp).toLocaleDateString(); } catch { dateA = entryA.timestamp; }
        try { dateB = new Date(entryB.timestamp).toLocaleDateString(); } catch { dateB = entryB.timestamp; }

        // Header row
        let headerLabel = document.createElement('div');
        headerLabel.className = 'sr-compareLabel';
        headerLabel.innerText = '总分对比';
        grid.appendChild(headerLabel);
        grid.appendChild(this.compareValue(dateA + ': ' + resA.totalScore));
        grid.appendChild(this.compareDelta(resB.totalScore - resA.totalScore));
        grid.appendChild(this.compareValue(dateB + ': ' + resB.totalScore));

        // Sub-score comparison
        let subKeys: { key: string; label: string }[] = [
            { key: 'meaningTransfer', label: '意义传递' },
            { key: 'targetMechanics', label: '译入语规范' },
            { key: 'writingQuality', label: '行文质量' }
        ];

        if (resA.subScores || resB.subScores) {
            let subLabel = document.createElement('div');
            subLabel.className = 'sr-compareLabel';
            subLabel.innerText = '分项得分';
            grid.appendChild(subLabel);

            for (let sk of subKeys) {
                let valA = resA.subScores ? resA.subScores[sk.key as keyof SubScores] : null;
                let valB = resB.subScores ? resB.subScores[sk.key as keyof SubScores] : null;
                let scoreA = valA ? valA.score : '-';
                let scoreB = valB ? valB.score : '-';
                let maxA = valA ? valA.max : '-';
                let delta = (typeof scoreA === 'number' && typeof scoreB === 'number') ? scoreB - scoreA : 0;

                grid.appendChild(this.compareValue(sk.label + ': ' + scoreA + (maxA !== '-' ? '/' + maxA : '')));
                grid.appendChild(this.compareDelta(delta));
                let maxB = valB ? valB.max : '-';
                grid.appendChild(this.compareValue(sk.label + ': ' + scoreB + (maxB !== '-' ? '/' + maxB : '')));
            }
        }

        // Error count by section
        let errLabel = document.createElement('div');
        errLabel.className = 'sr-compareLabel';
        errLabel.innerText = '错误数量对比';
        grid.appendChild(errLabel);

        let countErrorsBySection = (res: ScoringResult): { meaning: number; mechanics: number; quality: number; total: number } => {
            let counts = { meaning: 0, mechanics: 0, quality: 0, total: 0 };
            for (let seg of res.segments) {
                if (seg.errors) {
                    for (let err of seg.errors) {
                        counts.total++;
                        if (err.section === 'meaning') counts.meaning++;
                        else if (err.section === 'mechanics') counts.mechanics++;
                        else counts.quality++;
                    }
                }
            }
            return counts;
        };

        let errA = countErrorsBySection(resA);
        let errB = countErrorsBySection(resB);

        let errSections: { key: string; label: string }[] = [
            { key: 'meaning', label: '意义传递' },
            { key: 'mechanics', label: '译入语规范' },
            { key: 'quality', label: '行文质量' },
            { key: 'total', label: '总计' }
        ];

        for (let es of errSections) {
            let valA = errA[es.key as keyof typeof errA];
            let valB = errB[es.key as keyof typeof errB];
            grid.appendChild(this.compareValue(es.label + ': ' + valA + '个'));
            grid.appendChild(this.compareDelta(valA - valB)); // fewer errors is positive
            grid.appendChild(this.compareValue(es.label + ': ' + valB + '个'));
        }

        // Per-segment translation comparison (only if same segment count)
        if (resA.segments.length === resB.segments.length && resA.segments.length > 0) {
            let segLabel = document.createElement('div');
            segLabel.className = 'sr-compareLabel';
            segLabel.innerText = '逐段对比';
            grid.appendChild(segLabel);

            for (let si = 0; si < resA.segments.length; si++) {
                let segA = resA.segments[si];
                let segB = resB.segments[si];
                let targetA = entryA.segments[si] ? entryA.segments[si].target : '';
                let targetB = entryB.segments[si] ? entryB.segments[si].target : '';
                let errCountA = segA.errors ? segA.errors.length : 0;
                let errCountB = segB.errors ? segB.errors.length : 0;
                let scoreDelta = (segB.score || 0) - (segA.score || 0);

                let segRowLabel = document.createElement('div');
                segRowLabel.style.cssText = 'grid-column:1/-1;font-weight:bold;color:#333;margin-top:4px;font-size:12px;';
                segRowLabel.innerText = '第' + (si + 1) + '段';
                grid.appendChild(segRowLabel);

                grid.appendChild(this.compareValue('得分:' + (segA.score || 0) + ' | 译文: ' + (targetA.length > 30 ? targetA.substring(0, 30) + '...' : targetA) + ' | 错误:' + errCountA));
                grid.appendChild(this.compareDelta(scoreDelta));
                grid.appendChild(this.compareValue('得分:' + (segB.score || 0) + ' | 译文: ' + (targetB.length > 30 ? targetB.substring(0, 30) + '...' : targetB) + ' | 错误:' + errCountB));
            }
        }

        return grid;
    }

    private compareValue(text: string): HTMLElement {
        let el = document.createElement('div');
        el.className = 'sr-compareValue';
        el.innerText = text;
        return el;
    }

    private compareDelta(delta: number): HTMLElement {
        let el = document.createElement('div');
        el.className = 'sr-compareDelta' + (delta > 0 ? ' positive' : delta < 0 ? ' negative' : '');
        el.innerText = (delta > 0 ? '+' : '') + delta;
        return el;
    }

    // ---- Report Rendering (orchestrator) ----

    private renderReport(data: ReportData): void {
        this.currentReportData = data;
        this.container.innerHTML = '';
        this.container.style.zoom = String(this.zoomLevel / 100);

        let result = data.result;
        let v2 = this.isV2(result);
        let references = data.references || [];
        let perSegMax = 100;
        let perSegScore = result.totalScore;

        if (this.currentHistoryData) {
            this.container.appendChild(this.createBackLink());
        }

        this.container.appendChild(this.renderOverview(result, v2));
        this.container.appendChild(this.renderToolbar());

        if (result.segments.length > 1) {
            this.container.appendChild(this.renderSegmentNav(result.segments, perSegMax, perSegScore));
        }

        for (let i = 0; i < result.segments.length; i++) {
            this.container.appendChild(this.renderSegmentCard(i, result.segments[i], data.segments[i], references[i] || '', perSegScore, perSegMax, v2, data));
        }

        this.container.appendChild(this.renderSuggestions(result.suggestions));
    }

    // ---- Back Link ----

    private createBackLink(): HTMLElement {
        let backLink = document.createElement('a');
        backLink.href = '#';
        backLink.className = 'sr-backLink';
        backLink.innerText = '← 返回历史列表';
        backLink.addEventListener('click', (e: Event) => {
            e.preventDefault();
            if (this.currentHistoryData) this.renderHistoryList(this.currentHistoryData);
        });
        return backLink;
    }

    // ---- CATTI Readiness ----

    private static CATTI_LEVELS: { name: string; passing: number; comfortable: number }[] = [
        { name: 'CATTI 三级', passing: 60, comfortable: 75 },
        { name: 'CATTI 二级', passing: 70, comfortable: 85 },
        { name: 'CATTI 一级', passing: 80, comfortable: 90 }
    ];

    private renderCattiReadiness(result: ScoringResult): HTMLElement | null {
        let score = result.totalScore;
        let subKeys: { key: keyof SubScores; label: string; max: number }[] = [
            { key: 'meaningTransfer', label: '意义传递', max: 40 },
            { key: 'targetMechanics', label: '译入语规范', max: 30 },
            { key: 'writingQuality', label: '行文质量', max: 30 }
        ];

        // Find highest CATTI level where score >= passing
        let matchedLevel: typeof ScoreReport.CATTI_LEVELS[0] | null = null;
        for (let level of ScoreReport.CATTI_LEVELS) {
            if (score >= level.passing) {
                matchedLevel = level;
            }
        }

        let div = document.createElement('div');
        div.className = 'sr-cattiReadiness';

        for (let level of ScoreReport.CATTI_LEVELS) {
            let badge = document.createElement('span');
            badge.className = 'sr-cattiBadge';
            if (score >= level.comfortable) {
                badge.classList.add('ready');
                badge.innerText = level.name + ' ✓ Ready';
            } else if (score >= level.passing) {
                badge.classList.add('near');
                badge.innerText = level.name + ' △ Near passing';
            } else {
                let gap = level.passing - score;
                badge.classList.add('need');
                badge.innerText = level.name + ' +' + gap + ' pts needed';
            }
            div.appendChild(badge);
        }

        // Dimension gap analysis for highest aspirational level
        if (matchedLevel && score < matchedLevel.comfortable && result.subScores) {
            let gapLines: string[] = [];
            let totalGap = matchedLevel.comfortable - score;
            for (let sk of subKeys) {
                let sub = result.subScores[sk.key];
                if (sub) {
                    let pct = sub.max > 0 ? sub.score / sub.max : 0;
                    let comfortableScore = Math.round(sk.max * 0.85);
                    let dimGap = comfortableScore - sub.score;
                    if (dimGap > 0) {
                        gapLines.push(sk.label + '(+' + dimGap + ')');
                    }
                }
            }
            if (gapLines.length > 0) {
                let gapDiv = document.createElement('div');
                gapDiv.className = 'sr-cattiGap';
                gapDiv.innerText = '达到' + matchedLevel.name + '舒适区(85)还需 +' + totalGap + '分：' + gapLines.join('、');
                div.appendChild(gapDiv);
            }
        }

        return div;
    }

    // ---- Hero Banner ----

    private renderHeroBanner(result: ScoringResult, v2: boolean): HTMLElement {
        let banner = document.createElement('div');
        banner.className = 'sr-heroBanner';

        // SVG circular gauge
        let score = result.totalScore;
        let sClass = this.scoreClass(score / 100);
        let gaugeColor = sClass === 'sr-scoreGood' ? 'var(--sr-score-good)' :
                         sClass === 'sr-scoreMid' ? 'var(--sr-score-mid)' : 'var(--sr-score-low)';

        let radius = 52;
        let circ = 2 * Math.PI * radius;
        let offset = circ - (score / 100) * circ;

        let svgNS = 'http://www.w3.org/2000/svg';
        let svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 120 120');
        svg.setAttribute('width', '120');
        svg.setAttribute('height', '120');
        svg.classList.add('sr-heroGauge');

        let bgCircle = document.createElementNS(svgNS, 'circle');
        bgCircle.setAttribute('cx', '60');
        bgCircle.setAttribute('cy', '60');
        bgCircle.setAttribute('r', String(radius));
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', 'var(--sr-bg-tertiary)');
        bgCircle.setAttribute('stroke-width', '8');
        svg.appendChild(bgCircle);

        let fgCircle = document.createElementNS(svgNS, 'circle');
        fgCircle.setAttribute('cx', '60');
        fgCircle.setAttribute('cy', '60');
        fgCircle.setAttribute('r', String(radius));
        fgCircle.setAttribute('fill', 'none');
        fgCircle.setAttribute('stroke', gaugeColor);
        fgCircle.setAttribute('stroke-width', '8');
        fgCircle.setAttribute('stroke-linecap', 'round');
        fgCircle.setAttribute('stroke-dasharray', String(circ));
        fgCircle.setAttribute('stroke-dashoffset', String(offset));
        fgCircle.setAttribute('transform', 'rotate(-90 60 60)');
        (fgCircle as SVGElement).style.transition = 'stroke-dashoffset 0.8s ease';
        svg.appendChild(fgCircle);

        let scoreText = document.createElementNS(svgNS, 'text');
        scoreText.setAttribute('x', '60');
        scoreText.setAttribute('y', '55');
        scoreText.setAttribute('text-anchor', 'middle');
        scoreText.setAttribute('dominant-baseline', 'central');
        scoreText.setAttribute('fill', 'var(--sr-text-primary)');
        scoreText.setAttribute('font-size', '28');
        scoreText.setAttribute('font-weight', 'bold');
        scoreText.textContent = String(score);
        svg.appendChild(scoreText);

        let maxText = document.createElementNS(svgNS, 'text');
        maxText.setAttribute('x', '60');
        maxText.setAttribute('y', '75');
        maxText.setAttribute('text-anchor', 'middle');
        maxText.setAttribute('fill', 'var(--sr-text-tertiary)');
        maxText.setAttribute('font-size', '12');
        maxText.textContent = '/100';
        svg.appendChild(maxText);

        banner.appendChild(svg);

        // Info column
        let info = document.createElement('div');
        info.className = 'sr-heroInfo';

        let levelBadge = document.createElement('span');
        levelBadge.className = 'sr-levelBadge ' + this.levelClass(result.level);
        levelBadge.innerText = this.normalizeLevel(result.level);
        info.appendChild(levelBadge);

        // Progress delta
        let trendData = this.currentHistoryData?.trendData;
        if (trendData && trendData.length >= 2) {
            let latest = trendData[trendData.length - 1];
            if (latest.deltaFromPrevious !== undefined && latest.deltaFromPrevious !== 0) {
                let delta = latest.deltaFromPrevious;
                let deltaSpan = document.createElement('span');
                deltaSpan.className = 'sr-heroDelta ' + (delta > 0 ? 'positive' : 'negative');
                deltaSpan.innerText = (delta > 0 ? '↑ +' : '↓ ') + delta + ' vs last attempt';
                info.appendChild(deltaSpan);
            }
        }

        // Best quality highlight
        let bestHighlight = '';
        if (result.qualityHighlights && result.qualityHighlights.length > 0) {
            bestHighlight = result.qualityHighlights[0];
        } else if (result.segments) {
            for (let seg of result.segments) {
                if (seg.qualityHighlight) {
                    bestHighlight = seg.qualityHighlight;
                    break;
                }
            }
        }
        if (bestHighlight) {
            let hlDiv = document.createElement('div');
            hlDiv.className = 'sr-heroHighlight';
            hlDiv.innerText = '★ ' + bestHighlight;
            info.appendChild(hlDiv);
        }

        // Confidence badge (v2)
        if (v2) {
            let conf = computeConfidence(result);
            result.confidence = conf;
            let confBadge = document.createElement('span');
            confBadge.className = 'sr-confidenceBadge ' + conf;
            confBadge.innerText = 'AI ' + (conf === 'high' ? '高置信' : conf === 'medium' ? '中置信' : '低置信');
            info.appendChild(confBadge);
        }

        banner.appendChild(info);
        return banner;
    }

    // ---- Overview Section ----

    private renderOverview(result: ScoringResult, v2: boolean): HTMLElement {
        let overview = document.createElement('div');
        overview.className = 'sr-scoreOverview';

        // 1. Hero Banner
        overview.appendChild(this.renderHeroBanner(result, v2));

        // 1b. CATTI readiness (v2)
        if (v2) {
            let catti = this.renderCattiReadiness(result);
            if (catti) overview.appendChild(catti);
        }

        // 2. Sub-score progress bars (v2)
        if (v2 && result.subScores) {
            let barsDiv = document.createElement('div');
            barsDiv.className = 'sr-subScoreBars';

            let weightNote = document.createElement('div');
            weightNote.className = 'sr-weightNote';
            weightNote.innerText = '满分构成：意义传递 40 + 译入语规范 30 + 行文质量 30 = 100';
            barsDiv.appendChild(weightNote);

            for (let key of ['meaningTransfer', 'targetMechanics', 'writingQuality'] as const) {
                let sub = result.subScores[key];
                if (!sub) continue;
                let ratio = sub.max > 0 ? sub.score / sub.max : 0;
                let row = document.createElement('div');
                row.className = 'sr-subScoreRow';
                let label = document.createElement('span');
                label.className = 'sr-subScoreLabel';
                label.innerText = sub.label || key;
                row.appendChild(label);
                let track = document.createElement('div');
                track.className = 'sr-subScoreTrack';
                let fill = document.createElement('div');
                fill.className = 'sr-subScoreFill ' + this.scoreClass(ratio);
                fill.style.width = Math.round(ratio * 100) + '%';
                track.appendChild(fill);
                row.appendChild(track);
                let val = document.createElement('span');
                val.className = 'sr-subScoreValue';
                let valText = sub.score + '/' + sub.max;
                if (sub.errorPoints && sub.errorPoints > 0) {
                    valText += ' (-' + sub.errorPoints + ')';
                }
                val.innerText = valText;
                row.appendChild(val);
                barsDiv.appendChild(row);
            }
            overview.appendChild(barsDiv);
        }

        // 3. Quality highlights (v2)
        if (v2 && result.qualityHighlights && result.qualityHighlights.length > 0) {
            let qDiv = document.createElement('div');
            qDiv.className = 'sr-qualitySection';
            for (let h of result.qualityHighlights) {
                let badge = document.createElement('span');
                badge.className = 'sr-qualityBadge';
                badge.innerText = '★ ' + h;
                qDiv.appendChild(badge);
            }
            overview.appendChild(qDiv);
        }

        // 4. Overall analysis / comment
        let analysisText = result.overallAnalysis || result.overallComment;
        if (analysisText) {
            let commentDiv = document.createElement('div');
            if (v2 && result.overallAnalysis) {
                commentDiv.className = 'sr-overallAnalysis';
                let lines = analysisText.split('\n');
                for (let line of lines) {
                    let lineDiv = document.createElement('span');
                    lineDiv.className = 'sr-analysisLine';
                    lineDiv.innerText = line;
                    commentDiv.appendChild(lineDiv);
                }
            } else {
                commentDiv.className = 'sr-overallComment';
                commentDiv.innerText = analysisText;
            }
            overview.appendChild(commentDiv);
        }

        // 5. Root diagnosis
        if (v2 && result.rootDiagnosis) {
            let diagDiv = document.createElement('div');
            diagDiv.className = 'sr-diagBox';
            let lines = result.rootDiagnosis.split('\n').filter(l => l.trim());
            for (let i = 0; i < lines.length; i++) {
                if (i === 0) {
                    let prefix = document.createElement('span');
                    prefix.className = 'sr-diagPrefix';
                    prefix.innerText = '🔍 核心诊断：';
                    diagDiv.appendChild(prefix);
                }
                let text = document.createElement('span');
                text.className = 'sr-diagText';
                text.innerText = lines[i].trim();
                diagDiv.appendChild(text);
                if (i < lines.length - 1) {
                    diagDiv.appendChild(document.createElement('br'));
                }
            }
            overview.appendChild(diagDiv);
        }

        // 6. Error deduction info (last)
        if (v2 && result.errorPoints !== undefined) {
            let errorInfo = document.createElement('div');
            errorInfo.className = 'sr-errorPointsInfo';
            let parts = ['扣分: ' + result.errorPoints];
            if (result.qualityPoints && result.qualityPoints > 0) {
                parts.push('质量加分: +' + result.qualityPoints);
            }
            errorInfo.innerText = parts.join(' | ');
            overview.appendChild(errorInfo);
        }

        return overview;
    }

    // ---- Toolbar ----

    private renderToolbar(): HTMLElement {
        let toolBar = document.createElement('div');
        toolBar.className = 'sr-expandAllBar sr-toolbarFlex';

        let zoomGroup = document.createElement('div');
        zoomGroup.className = 'sr-toolbarGroup';
        let zoomOut = document.createElement('a');
        zoomOut.href = '#';
        zoomOut.className = 'sr-zoomBtn';
        zoomOut.innerText = 'A-';
        let zoomLabel = document.createElement('span');
        zoomLabel.className = 'sr-zoomLabel';
        zoomLabel.innerText = this.zoomLevel + '%';
        let zoomIn = document.createElement('a');
        zoomIn.href = '#';
        zoomIn.className = 'sr-zoomBtn';
        zoomIn.innerText = 'A+';
        zoomIn.addEventListener('click', (e: Event) => {
            e.preventDefault();
            this.adjustZoom(10);
        });
        zoomOut.addEventListener('click', (e: Event) => {
            e.preventDefault();
            this.adjustZoom(-10);
        });
        zoomGroup.appendChild(zoomOut);
        zoomGroup.appendChild(zoomLabel);
        zoomGroup.appendChild(zoomIn);
        toolBar.appendChild(zoomGroup);

        let exportGroup = document.createElement('div');
        exportGroup.className = 'sr-toolbarGroup';
        let mdBtn = document.createElement('a');
        mdBtn.href = '#';
        mdBtn.className = 'sr-zoomBtn';
        mdBtn.innerText = 'MD';
        mdBtn.title = '导出为 Markdown';
        mdBtn.addEventListener('click', (e: Event) => {
            e.preventDefault();
            let md = this.generateMarkdown();
            ipcRenderer.send('export-score-report-md', { markdown: md });
        });
        let pdfBtn = document.createElement('a');
        pdfBtn.href = '#';
        pdfBtn.className = 'sr-zoomBtn';
        pdfBtn.innerText = 'PDF';
        pdfBtn.title = '导出为 PDF';
        pdfBtn.addEventListener('click', (e: Event) => {
            e.preventDefault();
            ipcRenderer.send('export-score-report-pdf');
        });
        exportGroup.appendChild(mdBtn);
        exportGroup.appendChild(pdfBtn);
        toolBar.appendChild(exportGroup);

        let expandLink = document.createElement('a');
        expandLink.className = 'sr-expandAllLink';
        expandLink.href = '#';
        expandLink.innerText = '展开全部';
        let allExpanded = false;
        expandLink.addEventListener('click', (e: Event) => {
            e.preventDefault();
            allExpanded = !allExpanded;
            this.container.querySelectorAll('.sr-segmentBody').forEach((b: Element) => {
                if (allExpanded) b.classList.add('open');
                else b.classList.remove('open');
            });
            this.container.querySelectorAll('.sr-segmentArrow').forEach((a: Element) => {
                if (allExpanded) a.classList.add('open');
                else a.classList.remove('open');
            });
            expandLink.innerText = allExpanded ? '折叠全部' : '展开全部';
        });
        toolBar.appendChild(expandLink);
        return toolBar;
    }

    // ---- Segment Navigation ----

    private renderSegmentNav(segments: SegmentFeedback[], perSegMax: number, perSegScore: number): HTMLElement {
        let navBar = document.createElement('div');
        navBar.className = 'sr-segmentNav';
        for (let ni = 0; ni < segments.length; ni++) {
            let seg = segments[ni];
            let navLink = document.createElement('a');
            navLink.href = '#';
            navLink.className = 'sr-segmentNavLink';
            let sScore = seg.score || perSegScore;
            let sClass = this.scoreClass(sScore / perSegMax);
            navLink.innerHTML = '<span class="sr-segmentNavIdx">第' + (ni + 1) + '段</span> <span class="sr-segmentNavScore ' + sClass + '">' + sScore + '/' + perSegMax + '</span>';
            let capturedNi = ni;
            navLink.addEventListener('click', (e: Event) => {
                e.preventDefault();
                let target = document.getElementById('segment-' + capturedNi);
                if (target) {
                    let body = target.querySelector('.sr-segmentBody') as HTMLElement;
                    if (body && !body.classList.contains('open')) {
                        body.classList.add('open');
                        let arrow = target.querySelector('.sr-segmentArrow') as HTMLElement;
                        if (arrow) arrow.classList.add('open');
                    }
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            navBar.appendChild(navLink);
        }
        return navBar;
    }

    // ---- Segment Card ----

    private renderSegmentCard(
        i: number,
        seg: SegmentFeedback,
        segData: { source: string; target: string },
        reference: string,
        perSegScore: number,
        perSegMax: number,
        v2: boolean,
        data: ReportData
    ): HTMLElement {
        let segScore = seg.score || perSegScore;

        let card = document.createElement('div');
        card.id = 'segment-' + i;
        card.className = 'sr-segmentCard';

        let header = document.createElement('div');
        header.className = 'sr-segmentHeader';
        let arrow = document.createElement('span');
        arrow.className = 'sr-segmentArrow';
        arrow.innerText = '▶';
        let title = document.createElement('span');
        title.className = 'sr-segmentTitle';
        title.innerText = '第' + (i + 1) + '段';
        let scoreBadge = document.createElement('span');
        let sClass = this.scoreClass(segScore / perSegMax);
        scoreBadge.className = 'sr-segmentScore ' + sClass;
        scoreBadge.innerText = segScore + '/' + perSegMax;

        header.appendChild(arrow);
        header.appendChild(title);

        if (v2 && seg.subScores) {
            let microBars = document.createElement('span');
            microBars.className = 'sr-microBars';
            for (let key of ['meaningTransfer', 'targetMechanics', 'writingQuality'] as const) {
                let sub = seg.subScores[key];
                if (!sub || !sub.max) continue;
                let ratio = sub.score / sub.max;
                let bar = document.createElement('span');
                bar.className = 'sr-microBar ' + this.scoreClass(ratio);
                bar.style.height = Math.round(ratio * 16) + 'px';
                microBars.appendChild(bar);
            }
            header.appendChild(microBars);
        }

        header.appendChild(scoreBadge);
        card.appendChild(header);

        let body = document.createElement('div');
        body.className = 'sr-segmentBody';

        // Build body sections via dedicated methods
        // Self-test questions (promoted to top for visibility)
        if (seg.errors) {
            let practiceEl = this.buildSegPractice(seg);
            if (practiceEl) body.appendChild(practiceEl);
        }
        if (v2 && seg.subScores) body.appendChild(this.buildSegSubScores(seg));
        if (v2 && seg.qualityHighlight) body.appendChild(this.buildSegQualityHighlight(seg));
        if (seg.strengths && seg.strengths.length > 0) body.appendChild(this.buildSegStrengths(seg));
        if (segData && segData.target) body.appendChild(this.buildSegStudentText(seg, segData.target, v2));
        if (segData) body.appendChild(this.buildSegSourceAndRefs(seg, segData, reference, v2));
        if (seg.analysis) body.appendChild(this.buildSegAnalysis(seg));
        if (v2 && seg.errors && seg.errors.length > 0) body.appendChild(this.renderErrorSection(seg.errors));
        if (seg.issues && seg.issues.length > 0) body.appendChild(this.buildSegIssues(seg));
        if (segData && reference) body.appendChild(this.buildSegDiff(segData.target, reference));
        body.appendChild(this.renderReflection(i, seg, v2, data));

        // Re-practice button (inline for closure over body)
        let repracticeBtn = document.createElement('a');
        repracticeBtn.href = '#';
        repracticeBtn.className = 'sr-repracticeBtn';
        repracticeBtn.innerText = '重练此段';
        body.appendChild(repracticeBtn);

        let capturedI = i;
        let capturedSegData = segData;
        let capturedRef = reference;
        let formVisible = false;
        let existingForm: HTMLElement | null = null;
        repracticeBtn.addEventListener('click', (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            if (formVisible) return;
            formVisible = true;
            repracticeBtn.style.display = 'none';
            existingForm = this.renderRepracticeForm(capturedSegData, capturedI, capturedRef, () => {
                formVisible = false;
                repracticeBtn.style.display = '';
                if (existingForm && existingForm.parentNode) {
                    existingForm.parentNode.removeChild(existingForm);
                }
            });
            body.appendChild(existingForm);
        });

        card.appendChild(body);

        header.addEventListener('click', () => {
            let isOpen = body.classList.contains('open');
            if (isOpen) {
                body.classList.remove('open');
                arrow.classList.remove('open');
            } else {
                body.classList.add('open');
                arrow.classList.add('open');
            }
        });

        return card;
    }

    // ---- Segment Body Builders ----

    private buildSegPractice(seg: SegmentFeedback): HTMLElement | null {
        let questions: { question: string; answer: string; code: string }[] = [];
        if (seg.errors) {
            for (let err of seg.errors) {
                if (err.severity >= 4 && err.testQuestion && err.testAnswer) {
                    questions.push({ question: err.testQuestion, answer: err.testAnswer, code: err.code });
                }
            }
        }
        if (questions.length === 0) return null;

        let div = document.createElement('div');
        div.className = 'sr-practiceSection';

        let heading = document.createElement('div');
        heading.className = 'sr-practiceHeading';
        heading.innerText = '📝 自测题 (' + questions.length + ')';
        div.appendChild(heading);

        for (let idx = 0; idx < questions.length; idx++) {
            let q = questions[idx];
            let item = document.createElement('div');
            item.className = 'sr-practiceItem';

            let qText = document.createElement('div');
            qText.className = 'sr-practiceQuestion';
            qText.innerText = (idx + 1) + '. ' + q.question;
            item.appendChild(qText);

            let answerRow = document.createElement('div');
            answerRow.className = 'sr-practiceAnswerRow';

            let toggleBtn = document.createElement('a');
            toggleBtn.href = '#';
            toggleBtn.className = 'sr-practiceToggle';
            toggleBtn.innerText = '显示答案';
            let answerDiv = document.createElement('div');
            answerDiv.className = 'sr-practiceAnswer';
            answerDiv.style.display = 'none';
            answerDiv.innerText = q.answer;

            toggleBtn.addEventListener('click', (e: Event) => {
                e.preventDefault();
                let visible = answerDiv.style.display !== 'none';
                answerDiv.style.display = visible ? 'none' : 'block';
                toggleBtn.innerText = visible ? '显示答案' : '隐藏答案';
            });

            answerRow.appendChild(toggleBtn);
            item.appendChild(answerRow);
            item.appendChild(answerDiv);

            let codeTag = document.createElement('span');
            codeTag.className = 'sr-practiceCode';
            codeTag.innerText = q.code;
            qText.appendChild(codeTag);

            div.appendChild(item);
        }

        return div;
    }

    private buildSegSubScores(seg: SegmentFeedback): HTMLElement {
        let segBars = document.createElement('div');
        segBars.className = 'sr-subScoreBars';
        segBars.style.marginBottom = '10px';
        let dimLabels: Record<string, string> = {
            meaningTransfer: '意义传递',
            targetMechanics: '译入语规范',
            writingQuality: '行文质量'
        };
        for (let key of ['meaningTransfer', 'targetMechanics', 'writingQuality'] as const) {
            let sub = seg.subScores![key];
            if (!sub || !sub.max) continue;
            let ratio = sub.score / sub.max;
            let row = document.createElement('div');
            row.className = 'sr-subScoreRow';
            let label = document.createElement('span');
            label.className = 'sr-subScoreLabel';
            label.innerText = dimLabels[key];
            row.appendChild(label);
            let track = document.createElement('div');
            track.className = 'sr-subScoreTrack';
            let fill = document.createElement('div');
            fill.className = 'sr-subScoreFill ' + this.scoreClass(ratio);
            fill.style.width = (ratio * 100) + '%';
            track.appendChild(fill);
            row.appendChild(track);
            let val = document.createElement('span');
            val.className = 'sr-subScoreValue';
            val.innerText = sub.score + '/' + sub.max;
            row.appendChild(val);
            segBars.appendChild(row);
        }
        return segBars;
    }

    private buildSegQualityHighlight(seg: SegmentFeedback): HTMLElement {
        let qBox = document.createElement('div');
        qBox.className = 'sr-segQualityBox';
        let qLabel = document.createElement('span');
        qLabel.className = 'sr-segQualityLabel';
        qLabel.innerText = '★ 出色翻译 +1';
        qBox.appendChild(qLabel);
        qBox.appendChild(document.createTextNode(seg.qualityHighlight!));
        return qBox;
    }

    private buildSegStrengths(seg: SegmentFeedback): HTMLElement {
        let tags = document.createElement('div');
        tags.className = 'sr-tags';
        for (let s of seg.strengths) {
            let tag = document.createElement('span');
            tag.className = 'sr-tag sr-tagStrength';
            tag.innerText = s;
            tags.appendChild(tag);
        }
        return tags;
    }

    private buildSegStudentText(seg: SegmentFeedback, target: string, v2: boolean): HTMLElement {
        let wrapper = document.createElement('div');
        let studentLabel = document.createElement('div');
        studentLabel.className = 'sr-label';
        studentLabel.innerText = '你的译文';
        wrapper.appendChild(studentLabel);
        let studentBox = document.createElement('div');
        studentBox.className = 'sr-studentBox';
        if (v2 && seg.errors && seg.errors.length > 0) {
            studentBox.innerHTML = this.renderWithErrors(target, seg.errors);
        } else {
            studentBox.innerText = target;
        }
        wrapper.appendChild(studentBox);
        return wrapper;
    }

    private buildSegSourceAndRefs(seg: SegmentFeedback, segData: { source: string; target: string }, reference: string, v2: boolean): HTMLElement {
        let wrapper = document.createElement('div');

        // Source text
        let sourceLabel = document.createElement('div');
        sourceLabel.className = 'sr-label';
        sourceLabel.innerText = '原文';
        wrapper.appendChild(sourceLabel);
        let sourceBox = document.createElement('div');
        sourceBox.className = 'sr-sourceBox';
        sourceBox.innerText = segData.source;
        wrapper.appendChild(sourceBox);

        // References
        if (reference || (v2 && seg.alternativeReferences && seg.alternativeReferences.length > 0)) {
            let refLabel = document.createElement('div');
            refLabel.className = 'sr-label';
            refLabel.innerText = '参考译文';
            wrapper.appendChild(refLabel);

            let refSection = document.createElement('div');
            refSection.className = 'sr-referencesSection';

            if (reference) {
                let refBox = document.createElement('div');
                refBox.className = 'sr-refBox official';
                let refBadge = document.createElement('span');
                refBadge.className = 'sr-refBadge official';
                refBadge.innerText = '官方参考';
                refBox.appendChild(refBadge);
                refBox.appendChild(document.createTextNode(reference));
                refSection.appendChild(refBox);
            }

            if (v2 && seg.alternativeReferences && seg.alternativeReferences.length > 0) {
                let altToggle = document.createElement('a');
                altToggle.href = '#';
                altToggle.className = 'sr-altToggle';
                altToggle.innerText = '查看其他译法 (' + seg.alternativeReferences.length + ')';
                refSection.appendChild(altToggle);

                let altContainer = document.createElement('div');
                altContainer.style.display = 'none';
                for (let alt of seg.alternativeReferences) {
                    let altBox = document.createElement('div');
                    altBox.className = 'sr-refBox alternative';
                    let altBadge = document.createElement('span');
                    altBadge.className = 'sr-refBadge alt';
                    altBadge.innerText = alt.register;
                    altBox.appendChild(altBadge);
                    altBox.appendChild(document.createTextNode(alt.translation));
                    altContainer.appendChild(altBox);
                }
                refSection.appendChild(altContainer);

                let altOpen = false;
                altToggle.addEventListener('click', (e: Event) => {
                    e.preventDefault();
                    altOpen = !altOpen;
                    altContainer.style.display = altOpen ? 'block' : 'none';
                    altToggle.innerText = altOpen ? '收起其他译法' : '查看其他译法 (' + (seg.alternativeReferences?.length || 0) + ')';
                });
            }

            wrapper.appendChild(refSection);
        }

        return wrapper;
    }

    private buildSegAnalysis(seg: SegmentFeedback): HTMLElement {
        let wrapper = document.createElement('div');
        let analysisLabel = document.createElement('div');
        analysisLabel.className = 'sr-label';
        analysisLabel.innerText = 'AI分析';
        wrapper.appendChild(analysisLabel);
        let analysisBox = document.createElement('div');
        analysisBox.className = 'sr-analysisBox';
        analysisBox.innerHTML = this.safeMarkdownParse(seg.analysis);
        wrapper.appendChild(analysisBox);
        return wrapper;
    }

    private buildSegIssues(seg: SegmentFeedback): HTMLElement {
        let tags = document.createElement('div');
        tags.className = 'sr-tags';
        for (let iss of seg.issues) {
            let tag = document.createElement('span');
            tag.className = 'sr-tag sr-tagIssue';
            tag.innerText = iss;
            tags.appendChild(tag);
        }
        return tags;
    }

    private buildSegDiff(target: string, reference: string): HTMLElement {
        let wrapper = document.createElement('div');
        let compLabel = document.createElement('div');
        compLabel.className = 'sr-label';
        compLabel.innerText = '对比';
        wrapper.appendChild(compLabel);

        let compArea = document.createElement('div');
        compArea.className = 'sr-comparisonArea';

        let diff = ScoreReport.wordDiff(target, reference);

        let studentRow = document.createElement('div');
        studentRow.className = 'sr-diffRow';
        let sLabel = document.createElement('span');
        sLabel.className = 'sr-diffLabel';
        sLabel.innerText = '你的';
        studentRow.appendChild(sLabel);
        let sText = document.createElement('span');
        sText.innerHTML = this.renderDiffWords(diff.studentView);
        studentRow.appendChild(sText);
        compArea.appendChild(studentRow);

        let refRow = document.createElement('div');
        refRow.className = 'sr-diffRow';
        let rLabel = document.createElement('span');
        rLabel.className = 'sr-diffLabel';
        rLabel.innerText = '参考';
        refRow.appendChild(rLabel);
        let rText = document.createElement('span');
        rText.innerHTML = this.renderDiffWords(diff.referenceView);
        refRow.appendChild(rText);
        compArea.appendChild(refRow);

        wrapper.appendChild(compArea);
        return wrapper;
    }

    // ---- Error Section (two-layer cards) ----

    private renderErrorSection(errors: ErrorItem[]): HTMLElement {
        let errTitle = document.createElement('div');
        errTitle.className = 'sr-errorsTitle';
        errTitle.innerText = '错误标记';

        let errSection = document.createElement('div');
        errSection.className = 'sr-errorsSection';

        let sortedErrors = [...errors].sort((a, b) => (b.severity * b.deduction) - (a.severity * a.deduction));

        let groups: { code: string; errors: ErrorItem[] }[] = [];
        for (let err of sortedErrors) {
            let last = groups.length > 0 ? groups[groups.length - 1] : null;
            if (last && last.code === err.code) {
                last.errors.push(err);
            } else {
                groups.push({ code: err.code, errors: [err] });
            }
        }

        for (let group of groups) {
            if (group.errors.length > 1) {
                let patternBar = document.createElement('div');
                patternBar.className = 'sr-patternHeader';
                patternBar.innerText = '⚠ 同类错误 ×' + group.errors.length + '（' + group.code + '）';
                errSection.appendChild(patternBar);
            }

            for (let err of group.errors) {
                errSection.appendChild(this.renderErrorCard(err));
            }
        }

        let wrapper = document.createElement('div');
        wrapper.appendChild(errTitle);
        wrapper.appendChild(errSection);
        return wrapper;
    }

    private renderErrorCard(err: ErrorItem): HTMLElement {
        let sevClass = this.severityClass(err.severity);
        let errCard = document.createElement('div');
        errCard.className = 'sr-errorCard severity' + (err.severity >= 8 ? 3 : err.severity >= 4 ? 2 : err.severity >= 2 ? 1 : 0);

        // Layer 1: Always visible — description + fix + deduction
        if (err.description) {
            let desc = document.createElement('div');
            desc.className = 'sr-errorDescription';
            desc.innerText = err.description;
            errCard.appendChild(desc);
        }

        if (err.original || err.suggested) {
            let fix = document.createElement('div');
            fix.className = 'sr-errorFix';
            if (err.original) {
                let orig = document.createElement('span');
                orig.className = 'sr-orig';
                orig.innerText = err.original;
                fix.appendChild(orig);
            }
            if (err.suggested) {
                if (err.original) {
                    fix.appendChild(document.createTextNode(' → '));
                }
                let corr = document.createElement('span');
                corr.className = 'sr-corr';
                corr.innerText = err.suggested;
                fix.appendChild(corr);
            }
            errCard.appendChild(fix);
        }

        let deduction = document.createElement('span');
        deduction.className = 'sr-errorDeduction ' + sevClass;
        deduction.innerText = '-' + err.deduction + '分';
        errCard.appendChild(deduction);

        // Toggle link
        let toggle = document.createElement('span');
        toggle.className = 'sr-errorCardToggle';
        toggle.innerText = '查看详情 ▾';

        // Layer 2: Expandable details
        let details = document.createElement('div');
        details.className = 'sr-errorCardDetails';

        let detailHeader = document.createElement('div');
        detailHeader.className = 'sr-errorCardHeader';
        let secInfo = this.sectionBadgeInfo(err.section);
        let secBadge = document.createElement('span');
        secBadge.className = 'sr-errorBadge ' + secInfo.css;
        secBadge.innerText = secInfo.text;
        detailHeader.appendChild(secBadge);
        let codeLabel = document.createElement('span');
        codeLabel.className = 'sr-errorCodeLabel';
        codeLabel.innerText = err.type + ' (' + err.code + ')';
        detailHeader.appendChild(codeLabel);
        detailHeader.appendChild(document.createTextNode(' '));
        let sevLabel = document.createElement('span');
        sevLabel.className = 'sr-errorSeverityLabel';
        sevLabel.innerText = this.severityLabel(err.severity);
        detailHeader.appendChild(sevLabel);
        details.appendChild(detailHeader);

        if (err.impactScope) {
            let scopeLabel = document.createElement('span');
            scopeLabel.className = 'sr-scopeBadge scope-' + err.impactScope;
            if (err.impactScope === 'core') scopeLabel.innerText = '核心影响';
            else if (err.impactScope === 'cohesion') scopeLabel.innerText = '衔接影响';
            else scopeLabel.innerText = '局部影响';
            details.appendChild(scopeLabel);
        }

        if (err.iegsRule) {
            let rule = document.createElement('div');
            rule.className = 'sr-iegsRule';
            rule.innerText = err.iegsRule;
            details.appendChild(rule);
        }

        if (err.isRepeat) {
            let repeatMark = document.createElement('span');
            repeatMark.className = 'sr-errorRepeat';
            repeatMark.innerText = '重复错误';
            details.appendChild(repeatMark);
        }

        // Self-test question
        if (err.testQuestion) {
            let testBox = document.createElement('div');
            testBox.className = 'sr-testYourself';
            let testQ = document.createElement('div');
            testQ.className = 'sr-testQuestion';
            testQ.innerText = '🧪 自测: ' + err.testQuestion;
            testBox.appendChild(testQ);
            if (err.testAnswer) {
                let ansToggle = document.createElement('span');
                ansToggle.className = 'sr-testAnswerToggle';
                ansToggle.innerText = '显示答案 ▾';
                let ansBox = document.createElement('div');
                ansBox.className = 'sr-testAnswer';
                ansBox.innerText = err.testAnswer;
                let ansOpen = false;
                ansToggle.addEventListener('click', (e: Event) => {
                    e.stopPropagation();
                    ansOpen = !ansOpen;
                    if (ansOpen) {
                        ansBox.classList.add('open');
                        ansToggle.innerText = '收起答案 ▴';
                    } else {
                        ansBox.classList.remove('open');
                        ansToggle.innerText = '显示答案 ▾';
                    }
                });
                testBox.appendChild(ansToggle);
                testBox.appendChild(ansBox);
            }
            details.appendChild(testBox);
        }

        errCard.appendChild(toggle);
        errCard.appendChild(details);

        let detailsOpen = false;
        toggle.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            detailsOpen = !detailsOpen;
            if (detailsOpen) {
                details.classList.add('open');
                toggle.innerText = '收起详情 ▴';
            } else {
                details.classList.remove('open');
                toggle.innerText = '查看详情 ▾';
            }
        });

        return errCard;
    }

    // ---- Guided Reflection ----

    private renderReflection(segIndex: number, seg: SegmentFeedback, v2: boolean, data: { historyId: string; savedReflections?: Record<string, string> }): HTMLElement {
        let reflArea = document.createElement('div');
        reflArea.className = 'sr-reflectionArea';

        let reflLabel = document.createElement('div');
        reflLabel.className = 'sr-label';
        reflLabel.innerText = '我的反思';
        reflArea.appendChild(reflLabel);

        // Parse saved data (JSON or plain text)
        let savedOverall = '';
        let savedPrompts: string[] = [];
        let rawSaved = data.savedReflections ? data.savedReflections[String(segIndex)] : undefined;
        if (rawSaved) {
            try {
                let parsed = JSON.parse(rawSaved);
                if (typeof parsed === 'object') {
                    savedOverall = parsed.overall || '';
                    savedPrompts = Array.isArray(parsed.prompts) ? parsed.prompts : [];
                } else {
                    savedOverall = String(parsed);
                }
            } catch {
                savedOverall = rawSaved;
            }
        }

        // Saved indicator
        let savedIndicator = document.createElement('span');
        savedIndicator.className = 'sr-reflectionSaved';
        savedIndicator.innerText = '';
        reflLabel.appendChild(savedIndicator);

        // Guided prompts based on error types
        let promptInputs: HTMLTextAreaElement[] = [];
        if (v2 && seg.errors && seg.errors.length > 0) {
            let prompts = this.generateReflectionPrompts(seg);
            for (let pi = 0; pi < prompts.length; pi++) {
                let prompt = document.createElement('div');
                prompt.className = 'sr-reflectionPrompt';
                prompt.innerText = prompts[pi];
                reflArea.appendChild(prompt);
                let input = document.createElement('textarea');
                input.className = 'sr-reflectionPromptInput';
                input.placeholder = '写下你的思考...';
                if (savedPrompts[pi]) input.value = savedPrompts[pi];
                reflArea.appendChild(input);
                promptInputs.push(input);
            }
        }

        // Free-form reflection textarea
        let textarea = document.createElement('textarea');
        textarea.className = 'sr-reflectionInput';
        textarea.placeholder = '写下你对这段翻译的整体反思...';
        textarea.value = savedOverall;

        let segIdx = segIndex;
        let histId = data.historyId;
        let debounced: NodeJS.Timeout | null = null;

        let doSave = () => {
            let payload = JSON.stringify({
                overall: textarea.value,
                prompts: promptInputs.map(el => el.value)
            });
            ipcRenderer.send('save-reflection', {
                historyId: histId,
                segmentIndex: segIdx,
                text: payload
            });
            savedIndicator.innerText = ' ✓ 已保存';
            setTimeout(() => { savedIndicator.innerText = ''; }, 1500);
        };

        let triggerSave = () => {
            if (debounced) clearTimeout(debounced);
            debounced = setTimeout(doSave, 800);
        };

        textarea.addEventListener('input', triggerSave);
        for (let inp of promptInputs) {
            inp.addEventListener('input', triggerSave);
        }

        reflArea.appendChild(textarea);
        return reflArea;
    }

    private generateReflectionPrompts(seg: SegmentFeedback): string[] {
        let prompts: string[] = [];
        let hasMeaning = seg.errors!.some(e => e.section === 'meaning');
        let hasMechanics = seg.errors!.some(e => e.section === 'mechanics');
        let hasQuality = seg.errors!.some(e => e.section === 'quality');

        if (hasMeaning) {
            let meaningErr = seg.errors!.find(e => e.section === 'meaning')!;
            prompts.push('你的译文在「' + (meaningErr.original || '...') + '」处出现了意义传递问题（建议修正：' + (meaningErr.suggested || '...') + '）。回顾上下文，你当时为什么选择了这个译法？');
        }
        if (hasMechanics) {
            let mechErr = seg.errors!.find(e => e.section === 'mechanics')!;
            let ruleHint = mechErr.iegsRule ? '（参考：' + mechErr.iegsRule + '）' : '';
            prompts.push('这段出现了语法规范方面的错误' + ruleHint + '。用你自己的话解释这条英文规则：');
        }
        if (hasQuality) {
            prompts.push('这段的行文质量有提升空间。对比你的译文和参考译文，找出你认为最关键的用词差异：');
        }

        return prompts.slice(0, 2);
    }

    // ---- Re-practice ----

    private renderRepracticeForm(
        segData: { source: string; target: string },
        segIndex: number,
        reference: string,
        onCancel: () => void
    ): HTMLElement {
        let form = document.createElement('div');
        form.className = 'sr-repracticeForm';

        // Source text (readonly)
        let srcLabel = document.createElement('div');
        srcLabel.className = 'sr-label';
        srcLabel.innerText = '原文';
        form.appendChild(srcLabel);
        let srcBox = document.createElement('div');
        srcBox.className = 'sr-sourceBox';
        srcBox.innerText = segData.source;
        form.appendChild(srcBox);

        // Textarea for new translation
        let tgtLabel = document.createElement('div');
        tgtLabel.className = 'sr-label';
        tgtLabel.innerText = '新译文';
        form.appendChild(tgtLabel);
        let textarea = document.createElement('textarea');
        textarea.className = 'sr-repracticeInput';
        textarea.placeholder = '输入你的新译文...';
        form.appendChild(textarea);

        // Actions
        let actions = document.createElement('div');
        actions.className = 'sr-repracticeActions';

        let submitBtn = document.createElement('button');
        submitBtn.className = 'sr-repracticeSubmit';
        submitBtn.innerText = '提交重练';

        let cancelBtn = document.createElement('button');
        cancelBtn.className = 'sr-repracticeCancel';
        cancelBtn.innerText = '取消';
        cancelBtn.addEventListener('click', (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
        });

        let capturedSegIndex = segIndex;
        let capturedSource = segData.source;
        let capturedReference = reference;
        submitBtn.addEventListener('click', (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            let newTarget = textarea.value.trim();
            if (!newTarget) return;
            submitBtn.setAttribute('disabled', 'true');
            submitBtn.innerText = '评分中...';

            // Get language info from current report data
            let srcLang = this.currentReportData?.srcLang || '';
            let tgtLang = this.currentReportData?.tgtLang || '';
            let projectId = this.currentReportData?.historyId || '';

            ipcRenderer.send('re-score-segment', {
                projectId: projectId,
                segmentIndex: capturedSegIndex,
                source: capturedSource,
                newTarget: newTarget,
                reference: capturedReference,
                srcLang: srcLang,
                tgtLang: tgtLang
            });
        });

        actions.appendChild(submitBtn);
        actions.appendChild(cancelBtn);
        form.appendChild(actions);

        return form;
    }

    private handleRepracticeResult(data: { segmentIndex: number; result: SegmentFeedback; totalScore: number }): void {
        let card = document.getElementById('segment-' + data.segmentIndex);
        if (!card) return;

        // Hide the repractice form
        let form = card.querySelector('.sr-repracticeForm') as HTMLElement;
        if (form) form.style.display = 'none';

        // Show the repractice button again
        let btn = card.querySelector('.sr-repracticeBtn') as HTMLElement;
        if (btn) btn.style.display = '';

        // Get old score
        let oldScore = 0;
        if (this.currentReportData && this.currentReportData.result.segments[data.segmentIndex]) {
            oldScore = this.currentReportData.result.segments[data.segmentIndex].score || 0;
        }
        let newScore = data.result.score || 0;
        let delta = newScore - oldScore;

        // Remove any previous repractice result
        let oldResult = card.querySelector('.sr-repracticeResult') as HTMLElement;
        if (oldResult && oldResult.parentNode) oldResult.parentNode.removeChild(oldResult);

        // Build result div
        let resultDiv = document.createElement('div');
        resultDiv.className = 'sr-repracticeResult' + (delta < 0 ? ' worse' : '');

        // Score comparison line
        let scoreLine = document.createElement('div');
        scoreLine.style.marginBottom = '4px';
        scoreLine.innerText = '得分：' + oldScore + ' → ' + newScore + '  ';
        let deltaSpan = document.createElement('span');
        deltaSpan.className = 'sr-repracticeDelta ' + (delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'zero');
        deltaSpan.innerText = (delta > 0 ? '+' : '') + delta;
        scoreLine.appendChild(deltaSpan);
        resultDiv.appendChild(scoreLine);

        // Error comparison if applicable
        let oldErrors = this.currentReportData?.result?.segments[data.segmentIndex]?.errors || [];
        let newErrors = data.result.errors || [];
        if (oldErrors.length > 0 || newErrors.length > 0) {
            let errLine = document.createElement('div');
            errLine.style.marginTop = '4px';
            let oldCodes = oldErrors.map(e => e.code);
            let newCodes = newErrors.map(e => e.code);
            let fixedCount = oldCodes.filter(c => !newCodes.includes(c)).length;
            let newCount = newCodes.filter(c => !oldCodes.includes(c)).length;
            errLine.innerText = '错误：原有 ' + oldErrors.length + ' 个';
            if (fixedCount > 0) errLine.innerText += '，已修正 ' + fixedCount + ' 个';
            if (newCount > 0) errLine.innerText += '，新增 ' + newCount + ' 个';
            errLine.innerText += '，当前 ' + newErrors.length + ' 个';
            resultDiv.appendChild(errLine);
        }

        // Button to view new score details
        let detailBtn = document.createElement('a');
        detailBtn.href = '#';
        detailBtn.className = 'sr-repracticeBtn';
        detailBtn.style.marginTop = '6px';
        detailBtn.innerText = '查看新评分详情';
        let capturedData = data;
        detailBtn.addEventListener('click', (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            // Replace the error section with the new one
            let body = card.querySelector('.sr-segmentBody') as HTMLElement;
            if (!body) return;
            // Remove old error section
            let oldErrSection = body.querySelector('.sr-errorsSection');
            if (oldErrSection) {
                let wrapper = oldErrSection.parentNode as HTMLElement;
                // The wrapper is the div containing errorsTitle + errorsSection
                if (wrapper && wrapper.previousElementSibling && (wrapper.previousElementSibling as HTMLElement).className === 'sr-errorsTitle') {
                    wrapper.parentNode?.removeChild(wrapper.previousElementSibling as HTMLElement);
                }
                wrapper.parentNode?.removeChild(wrapper);
            }
            // Also remove errorsTitle if standalone
            let oldErrTitle = body.querySelector('.sr-errorsTitle') as HTMLElement;
            if (oldErrTitle) oldErrTitle.parentNode?.removeChild(oldErrTitle);

            // Insert new error section if there are errors
            if (capturedData.result.errors && capturedData.result.errors.length > 0) {
                let newErrSection = this.renderErrorSection(capturedData.result.errors);
                // Insert before the reflection area or at the end
                let reflArea = body.querySelector('.sr-reflectionArea') as HTMLElement;
                if (reflArea) {
                    body.insertBefore(newErrSection, reflArea);
                } else {
                    body.appendChild(newErrSection);
                }
            }
            detailBtn.style.display = 'none';
        });
        resultDiv.appendChild(detailBtn);

        // Append result to card body
        let body = card.querySelector('.sr-segmentBody') as HTMLElement;
        if (body) {
            body.appendChild(resultDiv);
        }
    }

    // ---- Suggestions ----

    private renderSuggestions(suggestions: string[]): HTMLElement {
        let wrapper = document.createElement('div');
        if (suggestions && suggestions.length > 0) {
            let sugBox = document.createElement('div');
            sugBox.className = 'sr-suggestionsBox';
            let sugTitle = document.createElement('div');
            sugTitle.className = 'sr-suggestionsTitle';
            sugTitle.innerText = '下一步行动';
            sugBox.appendChild(sugTitle);
            let sugList = document.createElement('ul');
            sugList.className = 'sr-suggestionsList';
            for (let s of suggestions) {
                let li = document.createElement('li');
                li.innerText = s;
                sugList.appendChild(li);
            }
            sugBox.appendChild(sugList);
            wrapper.appendChild(sugBox);
        }
        return wrapper;
    }

    // ---- Markdown Export ----

    private generateMarkdown(): string {
        if (!this.currentReportData) return '';
        let data = this.currentReportData;
        let result = data.result;
        let segments = data.segments;
        let references = data.references;
        let v2 = result.version === 2;
        let lines: string[] = [];

        lines.push('# 翻译评分报告\n');
        lines.push('## 总分: ' + result.totalScore + '/100 (' + this.normalizeLevel(result.level) + ')\n');

        if (v2 && result.errorPoints !== undefined) {
            let pts = ['扣分: ' + result.errorPoints];
            if (result.qualityPoints && result.qualityPoints > 0) pts.push('质量加分: +' + result.qualityPoints);
            lines.push(pts.join(' | ') + '\n');
        }

        if (v2 && result.rootDiagnosis) {
            lines.push('### 核心诊断\n');
            lines.push(result.rootDiagnosis.replace(/\n/g, '\n\n') + '\n');
        }

        if (v2 && result.subScores) {
            lines.push('### 分项得分\n');
            lines.push('| 维度 | 得分 | 满分 | 扣分 |');
            lines.push('|------|------|------|------|');
            for (let key of ['meaningTransfer', 'targetMechanics', 'writingQuality'] as const) {
                let sub = result.subScores[key];
                if (!sub) continue;
                lines.push('| ' + (sub.label || key) + ' | ' + sub.score + ' | ' + sub.max + ' | ' + (sub.errorPoints ? '-' + sub.errorPoints : '-') + ' |');
            }
            lines.push('');
        }

        if (result.qualityHighlights && result.qualityHighlights.length > 0) {
            lines.push('### 亮点\n');
            for (let h of result.qualityHighlights) {
                lines.push('- ★ ' + h);
            }
            lines.push('');
        }

        if (result.overallAnalysis) {
            lines.push('### 总评\n');
            lines.push(result.overallAnalysis.replace(/\n/g, '\n\n') + '\n');
        }

        lines.push('---\n');

        let perSegMax = 100;
        for (let i = 0; i < result.segments.length; i++) {
            let seg = result.segments[i];
            let segData = segments[i];
            let segScore = seg.score || result.totalScore;
            lines.push('## 第' + (i + 1) + '段 (' + segScore + '/' + perSegMax + ')\n');

            if (v2 && seg.qualityHighlight) {
                lines.push('> ★ 出色翻译 +1: ' + seg.qualityHighlight + '\n');
            }

            if (seg.strengths && seg.strengths.length > 0) {
                lines.push('**优点:** ' + seg.strengths.join('；') + '\n');
            }

            if (segData && segData.target) {
                lines.push('**你的译文:** ' + segData.target + '\n');
            }
            if (segData) {
                lines.push('**原文:** ' + segData.source + '\n');
            }
            if (references[i]) {
                lines.push('**参考译文:** ' + references[i] + '\n');
            }

            if (v2 && seg.alternativeReferences && seg.alternativeReferences.length > 0) {
                lines.push('**替代译法:**');
                for (let ref of seg.alternativeReferences) {
                    lines.push('  - [' + ref.register + '] ' + ref.translation);
                }
                lines.push('');
            }

            if (seg.analysis) {
                lines.push('### AI分析\n');
                lines.push(seg.analysis + '\n');
            }

            if (v2 && seg.errors && seg.errors.length > 0) {
                lines.push('### 错误标记\n');
                let sorted = [...seg.errors].sort((a, b) => (b.severity * b.deduction) - (a.severity * a.deduction));
                for (let err of sorted) {
                    let secInfo = this.sectionBadgeInfo(err.section);
                    let line = '- **[' + secInfo.text + '] ' + err.type + ' (' + err.code + ')** -' + err.deduction + '分 ' + this.severityLabel(err.severity);
                    if (err.isRepeat) line += ' 重复错误';
                    if (err.impactScope) line += ' [' + err.impactScope + ']';
                    line += '\n  ' + err.description;
                    if (err.original && err.suggested) {
                        line += '\n  ~~' + err.original + '~~ → **' + err.suggested + '**';
                    }
                    if (err.testQuestion) {
                        line += '\n  🧪 自测: ' + err.testQuestion;
                        if (err.testAnswer) line += ' （答案: ' + err.testAnswer + '）';
                    }
                    lines.push(line);
                }
                lines.push('');
            }

            if (seg.issues && seg.issues.length > 0) {
                lines.push('**问题:** ' + seg.issues.join('；') + '\n');
            }

            lines.push('---\n');
        }

        if (result.suggestions && result.suggestions.length > 0) {
            lines.push('## 下一步行动\n');
            for (let s of result.suggestions) {
                lines.push('- ' + s);
            }
        }

        return lines.join('\n');
    }

    // ---- Helpers ----

    private safeMarkdownParse(text: string): string {
        try {
            let result = marked.parse(text, { breaks: true, gfm: true }) as string;
            // Strip dangerous tags
            result = result.replace(/<(script|iframe|object|embed|form|input|textarea|select|button|svg|math|link|meta|base)[^>]*>[\s\S]*?<\/\1>/gi, '');
            result = result.replace(/<(script|iframe|object|embed|form|input|textarea|select|button|svg|math|link|meta|base)[^>]*\/?>/gi, '');
            // Strip event handlers (quoted and unquoted)
            result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
            // Strip javascript: URLs
            result = result.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="');
            return result;
        } catch {
            return this.escapeHtml(text);
        }
    }

    private renderWithErrors(text: string, errors: ErrorItem[]): string {
        let marks: { start: number; end: number; error: ErrorItem }[] = [];
        for (let err of errors) {
            if (!err.original) continue;
            let idx = text.indexOf(err.original);
            if (idx >= 0) {
                marks.push({ start: idx, end: idx + err.original.length, error: err });
            }
        }
        marks.sort((a, b) => a.start - b.start);
        let filtered: typeof marks = [];
        for (let m of marks) {
            if (filtered.length === 0 || m.start >= filtered[filtered.length - 1].end) {
                filtered.push(m);
            }
        }
        let html = '';
        let lastEnd = 0;
        for (let m of filtered) {
            html += this.escapeHtml(text.substring(lastEnd, m.start));
            let sevClass = this.severityClass(m.error.severity);
            let title = (m.error.type || '') + (m.error.description ? '：' + m.error.description : '');
            html += '<span class="sr-errorMark ' + sevClass + '" title="' + this.escapeHtml(title) + '">';
            html += this.escapeHtml(text.substring(m.start, m.end));
            html += '</span>';
            lastEnd = m.end;
        }
        html += this.escapeHtml(text.substring(lastEnd));
        return html;
    }

    private renderDiffWords(words: DiffWord[]): string {
        return words.map(w => {
            if (w.type === 'removed') return '<span class="diffRemoved">' + this.escapeHtml(w.text) + '</span>';
            if (w.type === 'added') return '<span class="diffAdded">' + this.escapeHtml(w.text) + '</span>';
            return this.escapeHtml(w.text);
        }).join(' ');
    }

    private escapeHtml(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    private normalizeLevel(level: string): string {
        if (level.includes('一级') || level === '1') return '一级笔译';
        if (level.includes('二级') || level === '2') return '二级笔译';
        if (level.includes('三级') || level === '3') return '三级笔译';
        return level;
    }

    private levelClass(level: string): string {
        let n = this.normalizeLevel(level);
        if (n === '一级笔译') return 'l1';
        if (n === '二级笔译') return 'l2';
        return 'l3';
    }

    static wordDiff(student: string, reference: string): { studentView: DiffWord[]; referenceView: DiffWord[] } {
        let sWords = student.split(/\s+/).filter(w => w.length > 0);
        let rWords = reference.split(/\s+/).filter(w => w.length > 0);
        let lcs = ScoreReport.lcs(sWords, rWords);
        let studentView: DiffWord[] = [];
        let referenceView: DiffWord[] = [];
        let si = 0, ri = 0;
        for (let lw of lcs) {
            while (si < sWords.length && sWords[si].toLowerCase() !== lw.toLowerCase()) {
                studentView.push({ text: sWords[si], type: 'removed' });
                si++;
            }
            while (ri < rWords.length && rWords[ri].toLowerCase() !== lw.toLowerCase()) {
                referenceView.push({ text: rWords[ri], type: 'added' });
                ri++;
            }
            studentView.push({ text: sWords[si], type: 'same' });
            referenceView.push({ text: rWords[ri], type: 'same' });
            si++;
            ri++;
        }
        while (si < sWords.length) { studentView.push({ text: sWords[si], type: 'removed' }); si++; }
        while (ri < rWords.length) { referenceView.push({ text: rWords[ri], type: 'added' }); ri++; }
        return { studentView, referenceView };
    }

    static lcs(a: string[], b: string[]): string[] {
        let m = a.length, n = b.length;
        let dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        let result: string[] = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
                result.unshift(a[i - 1]);
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        return result;
    }
}
