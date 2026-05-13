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

interface SegmentFeedback {
    score: number;
    subScores?: SubScores | null;
    analysis: string;
    strengths: string[];
    issues: string[];
    errors?: ErrorItem[];
    alternativeReferences?: { register: string; translation: string }[];
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

const VALID_SEVERITIES = new Set([1, 2, 4, 8]);
const VALID_SECTIONS = new Set(['mechanics', 'meaning', 'quality']);
const SUB_KEYS = ['meaningTransfer', 'targetMechanics', 'writingQuality'] as const;

export function validateScoringResult(raw: string): ScoringResult | null {
    let jsonStr = raw.trim();
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    let parsed: any;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        return null;
    }

    if (typeof parsed.totalScore !== 'number' || parsed.totalScore < 0 || parsed.totalScore > 100) return null;
    if (!Array.isArray(parsed.segments) || parsed.segments.length === 0) return null;
    if (typeof parsed.level !== 'string') return null;
    if (!Array.isArray(parsed.suggestions)) parsed.suggestions = [];

    parsed.totalScore = Math.round(parsed.totalScore);

    let isV2 = parsed.version === 2;

    if (isV2) {
        if (typeof parsed.errorPoints !== 'number') parsed.errorPoints = 0;
        if (typeof parsed.qualityPoints !== 'number') parsed.qualityPoints = 0;
        if (!Array.isArray(parsed.qualityHighlights)) parsed.qualityHighlights = [];
        if (!parsed.overallAnalysis && parsed.overallComment) {
            parsed.overallAnalysis = parsed.overallComment;
        }

        let defaults = { meaningTransfer: { max: 40 }, targetMechanics: { max: 30 }, writingQuality: { max: 30 } };
        if (!parsed.subScores) parsed.subScores = {};
        for (let key of SUB_KEYS) {
            if (!parsed.subScores[key]) {
                parsed.subScores[key] = { score: 0, max: defaults[key].max, label: key, errorPoints: 0 };
            }
        }
    }

    for (let seg of parsed.segments) {
        if (typeof seg.score !== 'number') seg.score = 0;
        if (typeof seg.analysis !== 'string') seg.analysis = '';
        if (!Array.isArray(seg.strengths)) seg.strengths = [];
        if (!Array.isArray(seg.issues)) seg.issues = [];
        if (!Array.isArray(seg.errors)) seg.errors = [];
        if (!Array.isArray(seg.alternativeReferences)) seg.alternativeReferences = [];

        for (let err of seg.errors) {
            if (typeof err.type !== 'string') err.type = '未知 Unknown';
            if (typeof err.code !== 'string') err.code = 'OTH';
            if (!VALID_SECTIONS.has(err.section)) err.section = 'quality';
            if (!VALID_SEVERITIES.has(err.severity)) {
                // Snap to nearest valid severity: 1, 2, 4, 8
                let s = err.severity || 1;
                err.severity = s <= 1 ? 1 : s <= 2 ? 2 : s <= 4 ? 4 : 8;
            }
            if (typeof err.deduction !== 'number' || err.deduction < 0) err.deduction = 0;
            if (typeof err.isRepeat !== 'boolean') err.isRepeat = false;
            if (typeof err.description !== 'string') err.description = '';
            if (typeof err.original !== 'string') err.original = '';
            if (typeof err.suggested !== 'string') err.suggested = '';
        }
    }

    // Clamp top-level subScores score to max
    if (isV2 && parsed.subScores) {
        for (let key of SUB_KEYS) {
            let sub = parsed.subScores[key];
            if (sub && sub.score > sub.max) sub.score = sub.max;
        }
    }

    // Distribute per-segment subScore max via floor to avoid sum exceeding topMax
    if (isV2 && parsed.subScores) {
        let segCount = parsed.segments.length;
        let topMax: Record<string, number> = {};
        for (let key of SUB_KEYS) {
            topMax[key] = parsed.subScores[key] ? parsed.subScores[key].max : (key === 'meaningTransfer' ? 40 : 30);
        }
        for (let seg of parsed.segments) {
            if (!seg.subScores) continue;
            for (let key of SUB_KEYS) {
                let sub = seg.subScores[key];
                if (!sub) continue;
                let fairMax = Math.floor(topMax[key] / segCount);
                sub.max = fairMax;
                if (sub.score > fairMax) sub.score = fairMax;
                if (sub.score < 0) sub.score = 0;
            }
        }
    }

    return parsed as ScoringResult;
}

export function computeConfidence(result: ScoringResult): 'high' | 'medium' | 'low' {
    if (result.version !== 2) return 'medium';

    let flags = 0;

    // Check 1: totalScore vs subScore sum consistency
    if (result.subScores) {
        let subSum = 0;
        for (let key of SUB_KEYS) {
            let sub = result.subScores[key];
            if (sub) subSum += sub.score;
        }
        if (Math.abs(subSum - result.totalScore) > 5) flags++;
    }

    // Check 2: error deduction sum vs errorPoints
    if (result.errorPoints !== undefined) {
        let dedSum = 0;
        for (let seg of result.segments) {
            if (seg.errors) {
                for (let err of seg.errors) {
                    dedSum += err.deduction;
                }
            }
        }
        if (result.errorPoints > 0 && Math.abs(dedSum - result.errorPoints) > result.errorPoints * 0.3) flags++;
    }

    // Check 3: high score but many severe errors
    let severeErrors = 0;
    for (let seg of result.segments) {
        if (seg.errors) {
            for (let err of seg.errors) {
                if (err.severity >= 8) severeErrors++;
            }
        }
    }
    if (result.totalScore > 90 && severeErrors > 2) flags++;
    if (result.totalScore > 80 && severeErrors > 4) flags++;

    // Check 4: mechanics errors with severity 8 on minor issues (punctuation)
    for (let seg of result.segments) {
        if (seg.errors) {
            for (let err of seg.errors) {
                if (err.severity >= 8 && err.section === 'mechanics' && err.deduction <= 1) flags++;
            }
        }
    }

    if (flags >= 3) return 'low';
    if (flags >= 1) return 'medium';
    return 'high';
}
