import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listStyleGuides, getStyleGuide } from '../style-guides/runtime.mjs';
const cli = fileURLToPath(new URL('../scripts/swordfish-agent.mjs', import.meta.url));

test('guides resolve offline from another working directory without a running CAT', () => {
    const result = spawnSync(process.execPath, [cli, 'styles'], { cwd: '/tmp', encoding: 'utf8',
        env: { ...process.env, SWORDFISH_AGENT_TOKEN_FILE: '/does-not-exist' } });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).guides.map(x => x.id), ['ruanyf', 'yikeke', 'microsoft', 'microsoft-en-gb', 'microsoft-zh-cn-doc', 'microsoft-zh-cn-ui', 'google', 'apple', 'redhat', 'redhat-product']);
    for (const guide of listStyleGuides()) {
        const output = spawnSync(process.execPath, [cli, 'style', guide.id], { cwd: '/tmp', encoding: 'utf8' });
        assert.equal(output.status, 0, output.stderr);
        const data = JSON.parse(output.stdout);
        assert.equal(data.id, guide.id);
        assert.equal(data.rules.length, guide.ruleCount);
        for (const rule of data.rules) {
            assert.ok(data.prompt.includes(`[${rule.id}] ${rule.instruction}`));
            if (data.sourceDocument) {
                assert.equal(rule.source, data.sourceDocument.fileName);
                assert.ok(Number.isInteger(rule.sourcePage) && rule.sourcePage >= 1 && rule.sourcePage <= data.sourceDocument.pages);
                assert.match(data.sourceDocument.sha256, /^[a-f0-9]{64}$/);
            } else assert.ok(rule.source.startsWith('https://'));
        }
    }
});

test('profiles remain separate and unknown guide IDs fail instead of silently falling back', () => {
    assert.ok(getStyleGuide('ruanyf').rules.every(rule => rule.id.startsWith('R')));
    assert.ok(getStyleGuide('yikeke').rules.every(rule => rule.id.startsWith('Y')));
    assert.throws(() => getStyleGuide('../../etc/passwd'), /Unknown style guide/);
    const output = spawnSync(process.execPath, [cli, 'style', 'missing'], { encoding: 'utf8' });
    assert.equal(output.status, 1);
    assert.equal(JSON.parse(output.stderr).status, 'Error');
});

test('language and content scopes reach model prompts without mixing incompatible conventions', () => {
    assert.equal(getStyleGuide('redhat').conventions.headingCase, 'title');
    assert.equal(getStyleGuide('redhat-product').conventions.headingCase, 'sentence');
    assert.equal(getStyleGuide('redhat').license, 'CC BY-SA 3.0');
    assert.equal(getStyleGuide('redhat-product').license, 'CC BY-SA 4.0');
    const apple = getStyleGuide('apple');
    assert.deepEqual(apple.targetLocales, ['en-US']);
    assert.equal(apple.conventions.headingCase, 'department-or-project-specific');
    assert.equal(apple.sourceDocument.edition, 'June 2026');
    const uk = getStyleGuide('microsoft-en-gb');
    const google = getStyleGuide('google');
    const doc = getStyleGuide('microsoft-zh-cn-doc');
    const ui = getStyleGuide('microsoft-zh-cn-ui');
    assert.equal(uk.conventions.serialComma, 'omit-in-simple-lists');
    assert.equal(google.conventions.serialComma, 'use');
    assert.equal(doc.conventions.colonWidth, 'full');
    assert.equal(ui.conventions.colonWidth, 'half');
    for (const summary of listStyleGuides()) {
        const guide = getStyleGuide(summary.id);
        assert.ok(guide.prompt.includes(guide.scope));
        assert.ok(guide.prompt.includes(guide.targetLocales.join(', ')));
        assert.ok(guide.prompt.includes(guide.contentType));
        assert.equal(guide.version, summary.version);
        assert.equal(new Set(guide.rules.map(rule => rule.id)).size, guide.rules.length);
    }
    assert.ok(!google.constraints.some(text => text.includes('适用于简体中文技术文档')));
});
