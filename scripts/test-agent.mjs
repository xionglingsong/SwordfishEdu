import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, delimiter, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const classes = join(root, '.agent-build', 'classes');
const cp = [classes, ...readdirSync(join(root, 'jars')).filter(f => f.endsWith('.jar') && f !== 'swordfish.jar').map(f => join(root, 'jars', f))].join(delimiter);
for (const [cmd, args] of [
    ['javac', ['-cp', cp, '-d', join(root, '.agent-build', 'tests'), join(root, 'tests/java/AgentEditsTest.java'), join(root, 'tests/java/ExportOrderTest.java'), join(root, 'tests/java/BusinessStoreTest.java'), join(root, 'tests/java/FinanceSummaryTest.java'), join(root, 'tests/java/ServiceWorkTest.java')]],
    ['java', ['-cp', cp + delimiter + join(root, '.agent-build', 'tests'), 'AgentEditsTest']],
    ['java', ['-cp', cp + delimiter + join(root, '.agent-build', 'tests'), 'ExportOrderTest']],
    ['java', ['-cp', cp + delimiter + join(root, '.agent-build', 'tests'), 'BusinessStoreTest']],
    ['java', ['-cp', cp + delimiter + join(root, '.agent-build', 'tests'), 'FinanceSummaryTest']],
    ['java', ['-cp', cp + delimiter + join(root, '.agent-build', 'tests'), 'ServiceWorkTest']],
    ['node', ['--test', 'tests/agent-http.test.mjs']]
]) {
    const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
    if (result.error || result.status !== 0) process.exit(result.status || 1);
}
