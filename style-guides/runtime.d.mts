export interface StyleGuideSummary {
    id: string;
    name: string;
    description: string;
    source: string;
    author: string;
    license: string;
    version: string;
    reviewedAt: string;
    ruleCount: number;
    targetLocales: string[];
    contentType: string;
    scope: string;
}
export function listStyleGuides(): StyleGuideSummary[];
export function getStyleGuide(id: string): {
    id: string; name: string; version: string; prompt: string;
    rules: { id: string; category: string; instruction: string; source: string }[];
};
