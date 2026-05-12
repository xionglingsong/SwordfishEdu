import { ipcRenderer } from "electron";

interface SegmentFeedback {
    score: number;
    analysis: string;
    strengths: string[];
    issues: string[];
}

interface ScoringResult {
    totalScore: number;
    level: string;
    overallComment: string;
    suggestions: string[];
    segments: SegmentFeedback[];
}

interface DiffWord {
    text: string;
    type: 'same' | 'added' | 'removed';
}

export class FeedbackPanel {

    private container: HTMLDivElement;
    private historyId: string = '';
    private reflections: Map<number, string> = new Map();
    private saveTimer: any = null;
    private savedReflections: Map<number, string> = new Map();

    constructor(container: HTMLDivElement) {
        this.container = container;
        this.container.classList.add('feedbackPanel');
        this.container.innerHTML = '<div class="feedbackEmpty">提交翻译后，AI评分反馈将在此处显示。</div>';
    }

    showFeedback(data: { result: ScoringResult; segments: { source: string; target: string }[]; references: string[]; historyId: string; savedReflections?: any }): void {
        // Null guard
        if (!data || !data.result || typeof data.result.totalScore !== 'number') {
            this.container.innerHTML = '<div class="feedbackEmpty">评分结果格式异常，请重新提交评分。</div>';
            return;
        }

        this.historyId = data.historyId;
        // Preserve existing reflections
        if (data.savedReflections) {
            for (let key of Object.keys(data.savedReflections)) {
                this.savedReflections.set(parseInt(key), data.savedReflections[key]);
            }
        }
        this.container.innerHTML = '';

        let result = data.result;

        // Header
        let header = document.createElement('div');
        header.classList.add('feedbackHeader');

        let scoreDiv = document.createElement('div');
        scoreDiv.classList.add('feedbackScore');
        let scoreColor = result.totalScore >= 80 ? 'good' : result.totalScore >= 60 ? 'mid' : 'low';
        scoreDiv.innerHTML = '<span class="scoreValue ' + scoreColor + '">' + result.totalScore + '</span><span class="scoreMax">/100</span>';
        header.appendChild(scoreDiv);

        let levelDiv = document.createElement('div');
        levelDiv.classList.add('feedbackLevel');
        let levelText = (result.level || '');
        if (levelText.includes('三级')) levelText = '三级笔译';
        else if (levelText.includes('二级')) levelText = '二级笔译';
        else if (levelText.includes('一级')) levelText = '一级笔译';
        levelDiv.innerText = levelText;
        header.appendChild(levelDiv);

        let commentDiv = document.createElement('div');
        commentDiv.classList.add('feedbackComment');
        commentDiv.innerText = result.overallComment || '';
        header.appendChild(commentDiv);

        this.container.appendChild(header);

        // Suggestions
        if (result.suggestions && result.suggestions.length > 0) {
            let sugBox = document.createElement('div');
            sugBox.classList.add('feedbackSuggestions');
            let sugTitle = document.createElement('div');
            sugTitle.classList.add('feedbackSectionTitle');
            sugTitle.innerText = '改进建议';
            sugBox.appendChild(sugTitle);
            let sugList = document.createElement('ul');
            for (let sug of result.suggestions) {
                let li = document.createElement('li');
                li.innerText = sug;
                sugList.appendChild(li);
            }
            sugBox.appendChild(sugList);
            this.container.appendChild(sugBox);
        }

        // Per-segment cards
        let segments = data.segments || [];
        for (let i = 0; i < segments.length; i++) {
            let seg = segments[i];
            let feedback = result.segments && result.segments[i] ? result.segments[i] : null;
            let reference = data.references && data.references[i] ? data.references[i] : '';

            let card = document.createElement('div');
            card.classList.add('feedbackCard');

            let cardHeader = document.createElement('div');
            cardHeader.classList.add('feedbackCardHeader');
            cardHeader.innerHTML = '<span class="feedbackCardNum">第 ' + (i + 1) + ' 段</span>';
            if (feedback) {
                let segScoreColor = feedback.score >= 80 ? 'good' : feedback.score >= 60 ? 'mid' : 'low';
                cardHeader.innerHTML += '<span class="feedbackCardScore ' + segScoreColor + '">' + feedback.score + '/100</span>';
            }
            card.appendChild(cardHeader);

            let srcBox = document.createElement('div');
            srcBox.classList.add('feedbackSource');
            srcBox.innerHTML = '<span class="feedbackLabel">原文：</span>' + this.escapeHtml(seg.source);
            card.appendChild(srcBox);

            // Diff comparison (if reference exists)
            if (reference) {
                let compBox = document.createElement('div');
                compBox.classList.add('feedbackComparison');

                let studentLabel = document.createElement('div');
                studentLabel.classList.add('feedbackLabel');
                studentLabel.innerText = '对比：';
                compBox.appendChild(studentLabel);

                let diff = FeedbackPanel.wordDiff(seg.target, reference);

                // Student row
                let studentRow = document.createElement('div');
                studentRow.classList.add('diffRow');
                let studentLabel2 = document.createElement('span');
                studentLabel2.classList.add('diffLabel');
                studentLabel2.innerText = '你的：';
                studentRow.appendChild(studentLabel2);
                for (let d of diff.studentView) {
                    let span = document.createElement('span');
                    span.innerText = d.text;
                    if (d.type === 'removed') {
                        span.classList.add('diffRemoved');
                    }
                    studentRow.appendChild(span);
                }
                compBox.appendChild(studentRow);

                // Reference row
                let refRow = document.createElement('div');
                refRow.classList.add('diffRow');
                let refLabel = document.createElement('span');
                refLabel.classList.add('diffLabel');
                refLabel.innerText = '参考：';
                refRow.appendChild(refLabel);
                for (let d of diff.referenceView) {
                    let span = document.createElement('span');
                    span.innerText = d.text;
                    if (d.type === 'added') {
                        span.classList.add('diffAdded');
                    }
                    refRow.appendChild(span);
                }
                compBox.appendChild(refRow);

                card.appendChild(compBox);
            }

            // Strengths & Issues tags
            if (feedback && ((feedback.strengths && feedback.strengths.length > 0) || (feedback.issues && feedback.issues.length > 0))) {
                let tagsRow = document.createElement('div');
                tagsRow.classList.add('feedbackTags');
                if (feedback.strengths) {
                    for (let s of feedback.strengths) {
                        let tag = document.createElement('span');
                        tag.classList.add('feedbackTag', 'tagStrength');
                        tag.innerText = s;
                        tagsRow.appendChild(tag);
                    }
                }
                if (feedback.issues) {
                    for (let iss of feedback.issues) {
                        let tag = document.createElement('span');
                        tag.classList.add('feedbackTag', 'tagIssue');
                        tag.innerText = iss;
                        tagsRow.appendChild(tag);
                    }
                }
                card.appendChild(tagsRow);
            }

            // AI Analysis
            if (feedback && feedback.analysis) {
                let analysisBox = document.createElement('div');
                analysisBox.classList.add('feedbackAnalysis');
                let analysisLabel = document.createElement('div');
                analysisLabel.classList.add('feedbackSectionTitle');
                analysisLabel.innerText = 'AI 分析';
                analysisBox.appendChild(analysisLabel);
                let analysisText = document.createElement('div');
                analysisText.classList.add('feedbackAnalysisText');
                analysisText.innerText = feedback.analysis;
                analysisBox.appendChild(analysisText);
                card.appendChild(analysisBox);
            }

            // Reflection textarea
            let reflBox = document.createElement('div');
            reflBox.classList.add('feedbackReflection');
            let reflLabel = document.createElement('div');
            reflLabel.classList.add('feedbackSectionTitle');
            reflLabel.innerText = '我的反思';
            reflBox.appendChild(reflLabel);
            let textarea = document.createElement('textarea');
            textarea.classList.add('reflectionInput');
            textarea.placeholder = '你从这段翻译中学到了什么？下次会有什么不同？';
            let savedText = this.savedReflections.get(i) || '';
            textarea.value = savedText;
            if (savedText) {
                this.reflections.set(i, savedText);
            }
            textarea.dataset.segIndex = String(i);
            textarea.addEventListener('input', () => {
                this.reflections.set(i, textarea.value);
                this.debounceSave();
            });
            reflBox.appendChild(textarea);
            card.appendChild(reflBox);

            this.container.appendChild(card);
        }
    }

    private debounceSave(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        this.saveTimer = setTimeout(() => {
            this.saveReflections();
        }, 500);
    }

    private saveReflections(): void {
        if (!this.historyId) return;
        for (let [index, text] of this.reflections) {
            if (text.trim()) {
                ipcRenderer.send('save-reflection', {
                    historyId: this.historyId,
                    segmentIndex: index,
                    text: text
                });
            }
        }
    }

    static wordDiff(student: string, reference: string): { studentView: DiffWord[]; referenceView: DiffWord[] } {
        let sWords = student.split(/(\s+)/).filter(w => w.length > 0);
        let rWords = reference.split(/(\s+)/).filter(w => w.length > 0);

        // Build LCS table
        let m = sWords.length;
        let n = rWords.length;
        let dp: number[][] = [];
        for (let i = 0; i <= m; i++) {
            dp[i] = [];
            for (let j = 0; j <= n; j++) {
                dp[i][j] = 0;
            }
        }
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (sWords[i - 1].toLowerCase() === rWords[j - 1].toLowerCase()) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        // Backtrack to find diff
        let studentView: DiffWord[] = [];
        let referenceView: DiffWord[] = [];
        let i = m;
        let j = n;
        let sOps: DiffWord[] = [];
        let rOps: DiffWord[] = [];

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && sWords[i - 1].toLowerCase() === rWords[j - 1].toLowerCase()) {
                sOps.push({ text: sWords[i - 1] + ' ', type: 'same' });
                rOps.push({ text: rWords[j - 1] + ' ', type: 'same' });
                i--;
                j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                rOps.push({ text: rWords[j - 1] + ' ', type: 'added' });
                j--;
            } else {
                sOps.push({ text: sWords[i - 1] + ' ', type: 'removed' });
                i--;
            }
        }

        // Reverse (we backtracked)
        for (let k = sOps.length - 1; k >= 0; k--) {
            studentView.push(sOps[k]);
        }
        for (let k = rOps.length - 1; k >= 0; k--) {
            referenceView.push(rOps[k]);
        }

        return { studentView, referenceView };
    }

    private escapeHtml(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
