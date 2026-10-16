import { readFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'));
// Keep separately licensed summaries in their own files; expose one shared catalog.
for (const file of catalog.guideFiles || []) {
    catalog.guides.push(JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')));
}
export function listStyleGuides() {
    return catalog.guides.map(({ rules, ...guide }) => ({ ...guide, version: guide.version || catalog.version,
        reviewedAt: catalog.reviewedAt, ruleCount: rules.length }));
}
export function getStyleGuide(id) {
    const guide = catalog.guides.find(item => item.id === id);
    if (!guide) throw new Error(`Unknown style guide: ${id}. Use styles to list available IDs.`);
    return { ...guide, version: guide.version || catalog.version, reviewedAt: catalog.reviewedAt,
        adaptation: catalog.adaptation, constraints: catalog.constraints,
        prompt: ['所选风格指南：' + guide.name, '来源：' + guide.source,
            catalog.adaptation, '适用范围：' + guide.scope, '目标语言：' + guide.targetLocales.join(', '),
            '内容类型：' + guide.contentType, ...catalog.constraints.map(text => '- ' + text),
            ...guide.rules.map(rule => `[${rule.id}] ${rule.instruction}`)].join('\n') };
}
