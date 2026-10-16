import test from 'node:test';
import assert from 'node:assert/strict';
import { selectEduUpdate, isEduReleaseUrl, EDU_LATEST_API } from '../js/eduUpdates.js';
const release = (tag) => ({tag_name:tag, html_url:`https://github.com/xionglingsong/SwordfishEdu/releases/tag/${tag}`,draft:false,prerelease:false});

test('only strictly newer stable versions prompt; handles v prefix and numeric ordering', () => {
    assert.equal(selectEduUpdate('1.1.0',release('v1.1.0')),null);
    assert.equal(selectEduUpdate('1.2.0',release('v1.1.0')),null);
    assert.equal(selectEduUpdate('1.9.0',release('v1.10.0')).version,'1.10.0');
    assert.equal(selectEduUpdate('1.1.0',release('v1.1.1')).version,'1.1.1');
    assert.equal(selectEduUpdate('1.1.0-beta.1',release('v1.1.0')).version,'1.1.0');
    assert.equal(selectEduUpdate('1.1.0+local',release('v1.1.0')),null);
    assert.equal(selectEduUpdate('1.1.0',{...release('v2.0.0'),draft:true}),null);
    assert.equal(selectEduUpdate('1.1.0',{...release('v2.0.0-rc.1'),prerelease:true}),null);
    assert.equal(selectEduUpdate('1.1.0',release('v2.0.0-rc.1')),null);
});

test('rejects upstream, foreign URLs and malformed release data', () => {
    for (const url of ['https://maxprograms.com/download.dmg','https://github.com/maxprograms-com/Swordfish/releases/tag/v5.28.0',
        'https://github.com.evil.test/xionglingsong/SwordfishEdu/releases/tag/v2.0.0',
        'https://user@github.com/xionglingsong/SwordfishEdu/releases/tag/v2.0.0',
        'https://github.com/xionglingsong/SwordfishEdu/releases/tag/v2.0.0?redirect=elsewhere']) {
        assert.equal(isEduReleaseUrl(url),false);
        assert.throws(()=>selectEduUpdate('1.1.0',{...release('v5.28.0'),html_url:url}));
    }
    assert.throws(()=>selectEduUpdate('1.1.0',{...release('v2.0.0'),tag_name:'v3.0.0'}));
    assert.throws(()=>selectEduUpdate('1.1.0',{message:'API rate limit exceeded'}));
    assert.throws(()=>selectEduUpdate('1.1.0',release('latest')));
    assert.equal(EDU_LATEST_API,'https://api.github.com/repos/xionglingsong/SwordfishEdu/releases/latest');
});
