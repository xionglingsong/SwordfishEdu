export const EDU_RELEASES_URL = 'https://github.com/xionglingsong/SwordfishEdu/releases';
export const EDU_LATEST_API = 'https://api.github.com/repos/xionglingsong/SwordfishEdu/releases/latest';

function versionParts(version: string): { numbers: number[]; prerelease: boolean } {
    const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
    if (!match) throw new Error('Unrecognized SwordfishEdu version: ' + version);
    const numbers = match.slice(1, 4).map(Number);
    if (!numbers.every(Number.isSafeInteger)) throw new Error('Invalid version number');
    return { numbers, prerelease: Boolean(match[4]) };
}

export function isEduReleaseUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.origin === 'https://github.com' && !url.username && !url.password
            && /^\/xionglingsong\/SwordfishEdu\/releases\/tag\/[^/]+$/.test(url.pathname)
            && !url.search && !url.hash;
    } catch { return false; }
}

export function selectEduUpdate(current: string, data: unknown): { version: string; url: string } | null {
    if (!data || typeof data !== 'object') throw new Error('Invalid GitHub release response');
    const release = data as Record<string, unknown>;
    if (release.draft === true || release.prerelease === true) return null;
    if (release.draft !== false || release.prerelease !== false || typeof release.tag_name !== 'string'
        || typeof release.html_url !== 'string' || !isEduReleaseUrl(release.html_url)) {
        throw new Error('Release does not identify a published SwordfishEdu release');
    }
    if (decodeURIComponent(new URL(release.html_url).pathname.split('/').at(-1)!) !== release.tag_name) {
        throw new Error('Release tag and URL do not match');
    }
    const latest = versionParts(release.tag_name);
    const installed = versionParts(current);
    if (latest.prerelease) return null;
    for (let i = 0; i < 3; i++) {
        if (latest.numbers[i] > installed.numbers[i]) return { version: release.tag_name.replace(/^v/, ''), url: release.html_url };
        if (latest.numbers[i] < installed.numbers[i]) return null;
    }
    return installed.prerelease ? { version: release.tag_name.replace(/^v/, ''), url: release.html_url } : null;
}
