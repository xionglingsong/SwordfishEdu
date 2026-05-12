import { ipcRenderer } from "electron";
import { marked } from "marked";

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
}

interface DiffWord {
    text: string;
    type: 'same' | 'added' | 'removed';
}

export class ScoreReport {

    private container: HTMLDivElement;
    private currentHistoryData: any = null;
    private currentReportData: any = null;
    private zoomLevel: number = 100;

    constructor() {
        this.container = document.getElementById('reportContainer') as HTMLDivElement;

        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (_event: Electron.IpcRendererEvent, theme: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = theme;
        });

        ipcRenderer.on('set-score-report-data', (_event: Electron.IpcRendererEvent, data: any) => {
            if (data.historyList) {
                this.renderHistoryList(data);
            } else {
                this.renderReport(data);
            }
        });

        ipcRenderer.on('set-score-report-history', (_event: Electron.IpcRendererEvent, data: any) => {
            this.requestReport(data.projectId);
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
        let label = this.container.querySelector('.zoomLabel') as HTMLElement;
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

    // ---- History List ----

    private renderHistoryList(data: { historyList: any[]; projectName: string; references: string[] }): void {
        this.currentHistoryData = data;
        this.container.innerHTML = '';

        let title = document.createElement('div');
        title.style.cssText = 'font-size:16px;font-weight:bold;margin-bottom:12px;';
        title.innerText = '评分历史 — ' + data.projectName;
        this.container.appendChild(title);

        if (data.historyList.length === 0) {
            let empty = document.createElement('div');
            empty.className = 'emptyReport';
            empty.innerText = '暂无评分记录。';
            this.container.appendChild(empty);
            return;
        }

        for (let entry of data.historyList) {
            let card = document.createElement('div');
            card.className = 'segmentCard';

            let header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;padding:10px 14px;cursor:pointer;background:#fafafa;';

            let dateSpan = document.createElement('span');
            dateSpan.style.cssText = 'font-size:12px;color:#666;min-width:140px;';
            dateSpan.innerText = new Date(entry.timestamp).toLocaleString();

            let scoreSpan = document.createElement('span');
            let scoreNum = parseInt(entry.score) || 0;
            let sClass = scoreNum >= 80 ? 'good' : scoreNum >= 60 ? 'mid' : 'low';
            scoreSpan.className = 'segmentScore ' + sClass;
            scoreSpan.innerText = entry.score;

            let engineSpan = document.createElement('span');
            engineSpan.style.cssText = 'font-size:11px;color:#999;margin-left:10px;';
            engineSpan.innerText = entry.engine;

            let segSpan = document.createElement('span');
            segSpan.style.cssText = 'font-size:11px;color:#999;margin-left:10px;';
            segSpan.innerText = entry.translatedCount + '/' + entry.segmentCount + '段';

            let spacer = document.createElement('span');
            spacer.style.cssText = 'flex:1;';

            let viewBtn = document.createElement('span');
            viewBtn.style.cssText = 'color:#1a73e8;font-size:12px;cursor:pointer;margin-left:10px;';
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
                    let references = entryRef.segments.map((s: any) => s.reference || '');
                    this.renderReport({
                        result: entryRef.structured,
                        segments: entryRef.segments,
                        references: references,
                        historyId: entryRef.id,
                        savedReflections: entryRef.reflections || {}
                    });
                } else {
                    let empty = document.createElement('div');
                    empty.className = 'emptyReport';
                    empty.innerText = entryRef.fullResult || '无结构化数据';
                    this.container.innerHTML = '';
                    this.container.appendChild(empty);
                }
            });

            this.container.appendChild(card);
        }

        let latest = data.historyList[0];
        if (latest && latest.structured) {
            let refs = latest.segments.map((s: any) => s.reference || '');
            this.renderReport({
                result: latest.structured,
                segments: latest.segments,
                references: refs,
                historyId: latest.id,
                savedReflections: latest.reflections || {}
            });
        }
    }

    // ---- Report Rendering ----

    private renderReport(data: { result: ScoringResult; segments: { source: string; target: string }[]; references: string[]; historyId: string; savedReflections?: any }): void {
        this.currentReportData = data;
        this.container.innerHTML = '';
        this.container.style.zoom = String(this.zoomLevel / 100);

        let result = data.result;
        let references = data.references || [];
        let v2 = this.isV2(result);

        // Back button
        if (this.currentHistoryData) {
            let backLink = document.createElement('a');
            backLink.href = '#';
            backLink.style.cssText = 'display:inline-block;margin-bottom:10px;font-size:12px;color:#1a73e8;cursor:pointer;';
            backLink.innerText = '← 返回历史列表';
            backLink.addEventListener('click', (e: Event) => {
                e.preventDefault();
                this.renderHistoryList(this.currentHistoryData);
            });
            this.container.appendChild(backLink);
        }

        // ---- Overview ----
        let overview = document.createElement('div');
        overview.className = 'scoreOverview';

        // Score line
        let scoreLine = document.createElement('div');
        scoreLine.style.display = 'flex';
        scoreLine.style.alignItems = 'baseline';

        let scoreClass = this.scoreClass(result.totalScore / 100);
        let scoreNum = document.createElement('span');
        scoreNum.className = 'scoreBig ' + scoreClass;
        scoreNum.innerText = String(result.totalScore);
        scoreLine.appendChild(scoreNum);

        let scoreMax = document.createElement('span');
        scoreMax.className = 'scoreMax';
        scoreMax.innerText = '/100';
        scoreLine.appendChild(scoreMax);

        let levelBadge = document.createElement('span');
        levelBadge.className = 'levelBadge ' + this.levelClass(result.level);
        levelBadge.innerText = this.normalizeLevel(result.level);
        scoreLine.appendChild(levelBadge);

        // Error/quality points (v2)
        if (v2 && result.errorPoints !== undefined) {
            let errorInfo = document.createElement('span');
            errorInfo.style.cssText = 'margin-left:12px;font-size:12px;color:#999;';
            let parts = ['扣分: ' + result.errorPoints];
            if (result.qualityPoints && result.qualityPoints > 0) {
                parts.push('质量加分: +' + result.qualityPoints);
            }
            errorInfo.innerText = parts.join(' | ');
            scoreLine.appendChild(errorInfo);
        }

        overview.appendChild(scoreLine);

        // Root diagnosis (v2) - shown prominently after score
        if (v2 && result.rootDiagnosis) {
            let diagDiv = document.createElement('div');
            diagDiv.style.cssText = 'margin-top:10px;padding:10px 14px;border-radius:6px;font-size:13px;line-height:1.7;';
            let lines = result.rootDiagnosis.split('\n').filter(l => l.trim());
            if (lines.length > 0) {
                diagDiv.style.background = '#FFF3E0';
                diagDiv.style.borderLeft = '3px solid #FF9800';
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i].trim();
                    if (i === 0) {
                        let prefix = document.createElement('span');
                        prefix.style.cssText = 'font-weight:bold;color:#E65100;';
                        prefix.innerText = '🔍 核心诊断：';
                        diagDiv.appendChild(prefix);
                    }
                    let text = document.createElement('span');
                    text.style.color = '#333';
                    text.innerText = line;
                    diagDiv.appendChild(text);
                    if (i < lines.length - 1) {
                        diagDiv.appendChild(document.createElement('br'));
                    }
                }
            }
            overview.appendChild(diagDiv);
        }

        // Sub-score progress bars (v2)
        if (v2 && result.subScores) {
            let barsDiv = document.createElement('div');
            barsDiv.className = 'subScoreBars';
            let weightNote = document.createElement('div');
            weightNote.style.cssText = 'font-size:11px;color:#999;margin-bottom:4px;';
            weightNote.innerText = '满分构成：意义传递 40 + 译入语规范 30 + 行文质量 30 = 100';
            barsDiv.appendChild(weightNote);
            for (let key of ['meaningTransfer', 'targetMechanics', 'writingQuality'] as const) {
                let sub = result.subScores[key];
                if (!sub) continue;
                let ratio = sub.max > 0 ? sub.score / sub.max : 0;
                let row = document.createElement('div');
                row.className = 'subScoreRow';
                let label = document.createElement('span');
                label.className = 'subScoreLabel';
                label.innerText = sub.label || key;
                row.appendChild(label);
                let track = document.createElement('div');
                track.className = 'subScoreTrack';
                let fill = document.createElement('div');
                fill.className = 'subScoreFill ' + this.scoreClass(ratio);
                fill.style.width = Math.round(ratio * 100) + '%';
                track.appendChild(fill);
                row.appendChild(track);
                let val = document.createElement('span');
                val.className = 'subScoreValue';
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

        // Quality highlights (v2)
        if (v2 && result.qualityHighlights && result.qualityHighlights.length > 0) {
            let qDiv = document.createElement('div');
            qDiv.className = 'qualitySection';
            for (let h of result.qualityHighlights) {
                let badge = document.createElement('span');
                badge.className = 'qualityBadge';
                badge.innerText = '★ ' + h;
                qDiv.appendChild(badge);
            }
            overview.appendChild(qDiv);
        }

        // Overall analysis / comment
        let analysisText = result.overallAnalysis || result.overallComment;
        if (analysisText) {
            let commentDiv = document.createElement('div');
            if (v2 && result.overallAnalysis) {
                commentDiv.className = 'overallAnalysis';
                let lines = analysisText.split('\n');
                for (let line of lines) {
                    let lineDiv = document.createElement('span');
                    lineDiv.className = 'analysisLine';
                    lineDiv.innerText = line;
                    commentDiv.appendChild(lineDiv);
                }
            } else {
                commentDiv.className = 'overallComment';
                commentDiv.innerText = analysisText;
            }
            overview.appendChild(commentDiv);
        }

        this.container.appendChild(overview);

        // Toolbar: zoom + expand/collapse
        let toolBar = document.createElement('div');
        toolBar.className = 'expandAllBar';
        toolBar.style.display = 'flex';
        toolBar.style.justifyContent = 'space-between';
        toolBar.style.alignItems = 'center';

        // Zoom controls
        let zoomGroup = document.createElement('div');
        zoomGroup.style.cssText = 'display:flex;align-items:center;gap:4px;';
        let zoomOut = document.createElement('a');
        zoomOut.href = '#';
        zoomOut.className = 'zoomBtn';
        zoomOut.innerText = 'A-';
        let zoomLabel = document.createElement('span');
        zoomLabel.className = 'zoomLabel';
        zoomLabel.innerText = this.zoomLevel + '%';
        let zoomIn = document.createElement('a');
        zoomIn.href = '#';
        zoomIn.className = 'zoomBtn';
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

        // Export buttons
        let exportGroup = document.createElement('div');
        exportGroup.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:8px;';
        let mdBtn = document.createElement('a');
        mdBtn.href = '#';
        mdBtn.className = 'zoomBtn';
        mdBtn.innerText = 'MD';
        mdBtn.title = '导出为 Markdown';
        mdBtn.addEventListener('click', (e: Event) => {
            e.preventDefault();
            let md = this.generateMarkdown();
            ipcRenderer.send('export-score-report-md', { markdown: md });
        });
        let pdfBtn = document.createElement('a');
        pdfBtn.href = '#';
        pdfBtn.className = 'zoomBtn';
        pdfBtn.innerText = 'PDF';
        pdfBtn.title = '导出为 PDF';
        pdfBtn.addEventListener('click', (e: Event) => {
            e.preventDefault();
            ipcRenderer.send('export-score-report-pdf');
        });
        exportGroup.appendChild(mdBtn);
        exportGroup.appendChild(pdfBtn);
        toolBar.appendChild(exportGroup);

        // Expand/collapse
        let expandLink = document.createElement('a');
        expandLink.className = 'expandAllLink';
        expandLink.href = '#';
        expandLink.innerText = '展开全部';
        let allExpanded = false;
        expandLink.addEventListener('click', (e: Event) => {
            e.preventDefault();
            allExpanded = !allExpanded;
            this.container.querySelectorAll('.segmentBody').forEach((b: Element) => {
                if (allExpanded) b.classList.add('open');
                else b.classList.remove('open');
            });
            this.container.querySelectorAll('.segmentArrow').forEach((a: Element) => {
                if (allExpanded) a.classList.add('open');
                else a.classList.remove('open');
            });
            expandLink.innerText = allExpanded ? '折叠全部' : '展开全部';
        });
        toolBar.appendChild(expandLink);
        this.container.appendChild(toolBar);

        // ---- Segment Cards ----
        let perSegScore = result.segments.length > 0 ? Math.round(result.totalScore / result.segments.length) : 0;
        let perSegMax = result.segments.length > 1 ? Math.round(100 / result.segments.length) : 100;

        // Segment navigation (only if multiple segments)
        if (result.segments.length > 1) {
            let navBar = document.createElement('div');
            navBar.className = 'segmentNav';
            for (let ni = 0; ni < result.segments.length; ni++) {
                let seg = result.segments[ni];
                let navLink = document.createElement('a');
                navLink.href = '#';
                navLink.className = 'segmentNavLink';
                let sScore = seg.score ? Math.round(seg.score * perSegMax / 100) : perSegScore;
                let sClass = this.scoreClass(sScore / perSegMax);
                navLink.innerHTML = '<span class="segmentNavIdx">第' + (ni + 1) + '段</span> <span class="segmentNavScore ' + sClass + '">' + sScore + '/' + perSegMax + '</span>';
                let capturedNi = ni;
                navLink.addEventListener('click', (e: Event) => {
                    e.preventDefault();
                    let target = document.getElementById('segment-' + capturedNi);
                    if (target) {
                        let body = target.querySelector('.segmentBody') as HTMLElement;
                        if (body && !body.classList.contains('open')) {
                            body.classList.add('open');
                            let arrow = target.querySelector('.segmentArrow') as HTMLElement;
                            if (arrow) arrow.classList.add('open');
                        }
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
                navBar.appendChild(navLink);
            }
            this.container.appendChild(navBar);
        }

        for (let i = 0; i < result.segments.length; i++) {
            let seg = result.segments[i];
            let segData = data.segments[i];
            let reference = references[i] || '';
            let segScore = seg.score ? Math.round(seg.score * perSegMax / 100) : perSegScore;

            let card = document.createElement('div');
            card.id = 'segment-' + i;
            card.className = 'segmentCard';

            // Header
            let header = document.createElement('div');
            header.className = 'segmentHeader';

            let arrow = document.createElement('span');
            arrow.className = 'segmentArrow';
            arrow.innerText = '▶';

            let title = document.createElement('span');
            title.className = 'segmentTitle';
            title.innerText = '第' + (i + 1) + '段';

            let scoreBadge = document.createElement('span');
            let sClass = this.scoreClass(segScore / perSegMax);
            scoreBadge.className = 'segmentScore ' + sClass;
            scoreBadge.innerText = segScore + '/' + perSegMax;

            header.appendChild(arrow);
            header.appendChild(title);

            // Micro bars (v2)
            if (v2 && seg.subScores) {
                let microBars = document.createElement('span');
                microBars.className = 'microBars';
                for (let key of ['meaningTransfer', 'targetMechanics', 'writingQuality'] as const) {
                    let sub = seg.subScores[key];
                    if (!sub || !sub.max) continue;
                    let ratio = sub.score / sub.max;
                    let bar = document.createElement('span');
                    bar.className = 'microBar ' + this.scoreClass(ratio);
                    bar.style.height = Math.round(ratio * 16) + 'px';
                    microBars.appendChild(bar);
                }
                header.appendChild(microBars);
            }

            header.appendChild(scoreBadge);
            card.appendChild(header);

            // Body
            let body = document.createElement('div');
            body.className = 'segmentBody';

            // Per-segment dimension scores (v2)
            if (v2 && seg.subScores) {
                let segBars = document.createElement('div');
                segBars.className = 'subScoreBars';
                segBars.style.marginBottom = '10px';
                let dimLabels: Record<string, string> = {
                    meaningTransfer: '意义传递',
                    targetMechanics: '译入语规范',
                    writingQuality: '行文质量'
                };
                for (let key of ['meaningTransfer', 'targetMechanics', 'writingQuality'] as const) {
                    let sub = seg.subScores[key];
                    if (!sub || !sub.max) continue;
                    let ratio = sub.score / sub.max;
                    let row = document.createElement('div');
                    row.className = 'subScoreRow';
                    let label = document.createElement('span');
                    label.className = 'subScoreLabel';
                    label.innerText = dimLabels[key];
                    row.appendChild(label);
                    let track = document.createElement('div');
                    track.className = 'subScoreTrack';
                    let fill = document.createElement('div');
                    fill.className = 'subScoreFill ' + this.scoreClass(ratio);
                    fill.style.width = (ratio * 100) + '%';
                    track.appendChild(fill);
                    row.appendChild(track);
                    let val = document.createElement('span');
                    val.className = 'subScoreValue';
                    val.innerText = sub.score + '/' + sub.max;
                    row.appendChild(val);
                    segBars.appendChild(row);
                }
                body.appendChild(segBars);
            }

            // Student translation
            if (segData && segData.target) {
                let studentLabel = document.createElement('div');
                studentLabel.className = 'label';
                studentLabel.innerText = '你的译文';
                body.appendChild(studentLabel);
                let studentBox = document.createElement('div');
                studentBox.className = 'studentBox';
                if (v2 && seg.errors && seg.errors.length > 0) {
                    studentBox.innerHTML = this.renderWithErrors(segData.target, seg.errors);
                } else {
                    studentBox.innerText = segData.target;
                }
                body.appendChild(studentBox);
            }

            // Source
            if (segData) {
                let sourceLabel = document.createElement('div');
                sourceLabel.className = 'label';
                sourceLabel.innerText = '原文';
                body.appendChild(sourceLabel);
                let sourceBox = document.createElement('div');
                sourceBox.className = 'sourceBox';
                sourceBox.innerText = segData.source;
                body.appendChild(sourceBox);
            }

            // References section (v2 with alternatives, v1 without)
            if (reference || (v2 && seg.alternativeReferences && seg.alternativeReferences.length > 0)) {
                let refLabel = document.createElement('div');
                refLabel.className = 'label';
                refLabel.innerText = '参考译文';
                body.appendChild(refLabel);

                let refSection = document.createElement('div');
                refSection.className = 'referencesSection';

                // Official reference
                if (reference) {
                    let refBox = document.createElement('div');
                    refBox.className = 'refBox official';
                    let refBadge = document.createElement('span');
                    refBadge.className = 'refBadge official';
                    refBadge.innerText = '官方参考';
                    refBox.appendChild(refBadge);
                    refBox.appendChild(document.createTextNode(reference));
                    refSection.appendChild(refBox);
                }

                // Alternative references (v2, collapsible)
                if (v2 && seg.alternativeReferences && seg.alternativeReferences.length > 0) {
                    let altToggle = document.createElement('a');
                    altToggle.href = '#';
                    altToggle.className = 'altToggle';
                    altToggle.innerText = '查看其他译法 (' + seg.alternativeReferences.length + ')';
                    refSection.appendChild(altToggle);

                    let altContainer = document.createElement('div');
                    altContainer.style.display = 'none';
                    for (let alt of seg.alternativeReferences) {
                        let altBox = document.createElement('div');
                        altBox.className = 'refBox alternative';
                        let altBadge = document.createElement('span');
                        altBadge.className = 'refBadge alt';
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

                body.appendChild(refSection);
            }

            // Diff comparison
            if (segData && reference) {
                let compLabel = document.createElement('div');
                compLabel.className = 'label';
                compLabel.innerText = '对比';
                body.appendChild(compLabel);

                let compArea = document.createElement('div');
                compArea.className = 'comparisonArea';

                let diff = ScoreReport.wordDiff(segData.target, reference);

                let studentRow = document.createElement('div');
                studentRow.className = 'diffRow';
                let studentLabel = document.createElement('span');
                studentLabel.className = 'diffLabel';
                studentLabel.innerText = '你的';
                studentRow.appendChild(studentLabel);
                let studentText = document.createElement('span');
                studentText.innerHTML = this.renderDiffWords(diff.studentView);
                studentRow.appendChild(studentText);
                compArea.appendChild(studentRow);

                let refRow = document.createElement('div');
                refRow.className = 'diffRow';
                let refLabel = document.createElement('span');
                refLabel.className = 'diffLabel';
                refLabel.innerText = '参考';
                refRow.appendChild(refLabel);
                let refText = document.createElement('span');
                refText.innerHTML = this.renderDiffWords(diff.referenceView);
                refRow.appendChild(refText);
                compArea.appendChild(refRow);

                body.appendChild(compArea);
            }

            // Error cards (v2)
            if (v2 && seg.errors && seg.errors.length > 0) {
                let errTitle = document.createElement('div');
                errTitle.className = 'errorsTitle';
                errTitle.innerText = '错误标记';
                body.appendChild(errTitle);

                let errSection = document.createElement('div');
                errSection.className = 'errorsSection';

                // Sort errors by impact: severity * deduction descending
                let sortedErrors = [...seg.errors].sort((a, b) => (b.severity * b.deduction) - (a.severity * a.deduction));

                // Group consecutive errors with same code (pattern grouping)
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
                    // If multiple errors of same type, show pattern header
                    if (group.errors.length > 1) {
                        let patternBar = document.createElement('div');
                        patternBar.style.cssText = 'font-size:11px;font-weight:bold;color:#E65100;margin-bottom:2px;margin-top:6px;padding:3px 8px;background:#FFF3E0;border-radius:3px;';
                        patternBar.innerText = '⚠ 同类错误 ×' + group.errors.length + '（' + group.code + '）';
                        errSection.appendChild(patternBar);
                    }

                    for (let err of group.errors) {
                    let errCard = document.createElement('div');
                    let sevClass = this.severityClass(err.severity);
                    errCard.className = 'errorCard severity' + (err.severity >= 8 ? 3 : err.severity >= 4 ? 2 : err.severity >= 2 ? 1 : 0);

                    let errHeader = document.createElement('div');
                    errHeader.className = 'errorCardHeader';
                    let secInfo = this.sectionBadgeInfo(err.section);
                    let secBadge = document.createElement('span');
                    secBadge.className = 'errorBadge ' + secInfo.css;
                    secBadge.innerText = secInfo.text;
                    secBadge.style.marginRight = '2px';
                    errHeader.appendChild(secBadge);
                    let badge = document.createElement('span');
                    badge.style.cssText = 'font-size:11px;color:#555;';
                    badge.innerText = err.type + ' (' + err.code + ')';
                    errHeader.appendChild(badge);
                    let deduction = document.createElement('span');
                    deduction.className = 'errorDeduction ' + sevClass;
                    deduction.innerText = '-' + err.deduction + '分';
                    errHeader.appendChild(deduction);
                    let sevLabel = document.createElement('span');
                    sevLabel.style.cssText = 'font-size:11px;color:#999;';
                    sevLabel.innerText = this.severityLabel(err.severity);
                    errHeader.appendChild(sevLabel);
                    if (err.impactScope) {
                        let scopeLabel = document.createElement('span');
                        scopeLabel.style.cssText = 'font-size:11px;padding:1px 6px;border-radius:8px;margin-left:4px;';
                        if (err.impactScope === 'core') {
                            scopeLabel.style.background = '#FFCDD2';
                            scopeLabel.style.color = '#B71C1C';
                            scopeLabel.innerText = '核心影响';
                        } else if (err.impactScope === 'cohesion') {
                            scopeLabel.style.background = '#FFE0B2';
                            scopeLabel.style.color = '#E65100';
                            scopeLabel.innerText = '衔接影响';
                        } else {
                            scopeLabel.style.background = '#E0E0E0';
                            scopeLabel.style.color = '#616161';
                            scopeLabel.innerText = '局部影响';
                        }
                        errHeader.appendChild(scopeLabel);
                    }
                    if (err.isRepeat) {
                        let repeatMark = document.createElement('span');
                        repeatMark.className = 'errorRepeat';
                        repeatMark.innerText = '重复错误';
                        errHeader.appendChild(repeatMark);
                    }
                    errCard.appendChild(errHeader);

                    if (err.description) {
                        let desc = document.createElement('div');
                        desc.className = 'errorDescription';
                        desc.innerText = err.description;
                        errCard.appendChild(desc);
                    }

                    if (err.original || err.suggested) {
                        let fix = document.createElement('div');
                        fix.className = 'errorFix';
                        if (err.original) {
                            let orig = document.createElement('span');
                            orig.className = 'orig';
                            orig.innerText = err.original;
                            fix.appendChild(orig);
                        }
                        if (err.suggested) {
                            if (err.original) {
                                fix.appendChild(document.createTextNode(' → '));
                            }
                            let corr = document.createElement('span');
                            corr.className = 'corr';
                            corr.innerText = err.suggested;
                            fix.appendChild(corr);
                        }
                        errCard.appendChild(fix);
                    }

                    errSection.appendChild(errCard);
                } // end for err in group
                } // end for group

                body.appendChild(errSection);
            }

            // Quality highlight (v2 per-segment)
            if (v2 && seg.qualityHighlight) {
                let qBox = document.createElement('div');
                qBox.style.cssText = 'background:#E8F5E9;border-left:3px solid #4CAF50;padding:6px 12px;border-radius:0 6px 6px 0;margin-bottom:8px;font-size:12px;line-height:1.6;';
                let qLabel = document.createElement('span');
                qLabel.style.cssText = 'font-weight:bold;color:#2E7D32;margin-right:6px;';
                qLabel.innerText = '★ 出色翻译 +1';
                qBox.appendChild(qLabel);
                qBox.appendChild(document.createTextNode(seg.qualityHighlight));
                body.appendChild(qBox);
            }

            // Strengths & Issues tags
            if (seg.strengths && seg.strengths.length > 0) {
                let tags = document.createElement('div');
                tags.className = 'tags';
                for (let s of seg.strengths) {
                    let tag = document.createElement('span');
                    tag.className = 'tag tagStrength';
                    tag.innerText = s;
                    tags.appendChild(tag);
                }
                body.appendChild(tags);
            }
            if (seg.issues && seg.issues.length > 0) {
                let tags = document.createElement('div');
                tags.className = 'tags';
                for (let iss of seg.issues) {
                    let tag = document.createElement('span');
                    tag.className = 'tag tagIssue';
                    tag.innerText = iss;
                    tags.appendChild(tag);
                }
                body.appendChild(tags);
            }

            // AI Analysis (Markdown)
            if (seg.analysis) {
                let analysisLabel = document.createElement('div');
                analysisLabel.className = 'label';
                analysisLabel.innerText = 'AI分析';
                body.appendChild(analysisLabel);
                let analysisBox = document.createElement('div');
                analysisBox.className = 'analysisBox';
                analysisBox.innerHTML = marked.parse(seg.analysis) as string;
                body.appendChild(analysisBox);
            }

            // Reflection textarea
            let reflArea = document.createElement('div');
            reflArea.className = 'reflectionArea';
            let reflLabel = document.createElement('div');
            reflLabel.className = 'label';
            reflLabel.innerText = '我的反思';
            reflArea.appendChild(reflLabel);
            let textarea = document.createElement('textarea');
            textarea.className = 'reflectionInput';
            textarea.placeholder = '写下你对这段翻译的反思...';
            if (data.savedReflections && data.savedReflections[String(i)]) {
                textarea.value = data.savedReflections[String(i)];
            }
            let debounced: NodeJS.Timeout | null = null;
            textarea.addEventListener('input', () => {
                if (debounced) clearTimeout(debounced);
                debounced = setTimeout(() => {
                    ipcRenderer.send('save-reflection', {
                        historyId: data.historyId,
                        segmentIndex: i,
                        text: textarea.value
                    });
                }, 500);
            });
            reflArea.appendChild(textarea);
            body.appendChild(reflArea);

            card.appendChild(body);

            // Toggle
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

            this.container.appendChild(card);
        }

        // Suggestions - shown after all segments (action-oriented placement)
        if (result.suggestions && result.suggestions.length > 0) {
            let sugBox = document.createElement('div');
            sugBox.className = 'suggestionsBox';
            sugBox.style.margin = '12px 0';
            let sugTitle = document.createElement('div');
            sugTitle.className = 'suggestionsTitle';
            sugTitle.innerText = '下一步行动';
            sugBox.appendChild(sugTitle);
            let sugList = document.createElement('ul');
            sugList.style.margin = '0';
            sugList.style.paddingLeft = '18px';
            for (let s of result.suggestions) {
                let li = document.createElement('li');
                li.innerText = s;
                sugList.appendChild(li);
            }
            sugBox.appendChild(sugList);
            this.container.appendChild(sugBox);
        }
    }

    // ---- Markdown Export ----

    private generateMarkdown(): string {
        if (!this.currentReportData) return '';
        let data = this.currentReportData;
        let result = data.result as ScoringResult;
        let segments = data.segments as { source: string; target: string }[];
        let references = data.references as string[];
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

        let perSegMax = segments.length > 1 ? Math.round(100 / segments.length) : 100;
        for (let i = 0; i < result.segments.length; i++) {
            let seg = result.segments[i];
            let segData = segments[i];
            let segScore = seg.score ? Math.round(seg.score * perSegMax / 100) : Math.round(result.totalScore / result.segments.length);
            lines.push('## 第' + (i + 1) + '段 (' + segScore + '/' + perSegMax + ')\n');

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
                    lines.push(line);
                }
                lines.push('');
            }

            if (v2 && seg.qualityHighlight) {
                lines.push('> ★ 出色翻译 +1: ' + seg.qualityHighlight + '\n');
            }

            if (seg.strengths && seg.strengths.length > 0) {
                lines.push('**优点:** ' + seg.strengths.join('；') + '\n');
            }
            if (seg.issues && seg.issues.length > 0) {
                lines.push('**问题:** ' + seg.issues.join('；') + '\n');
            }

            if (seg.analysis) {
                lines.push('### AI分析\n');
                lines.push(seg.analysis + '\n');
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
            html += '<span class="errorMark ' + sevClass + '" title="' + this.escapeHtml(title) + '">';
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
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
