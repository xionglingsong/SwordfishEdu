/*******************************************************************************
 * Copyright (c) 2007-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { BrowserWindow, ClientRequest, IncomingMessage, IpcMainEvent, Menu, MenuItem, MessageBoxOptions, MessageBoxReturnValue, Notification, OpenDialogReturnValue, Rectangle, SaveDialogReturnValue, Size, app, clipboard, dialog, ipcMain, nativeTheme, net, screen, session, shell } from "electron";
import { AnthropicTranslator, ChatGPTTranslator, GeminiTranslator, MTUtils, MistralTranslator } from "mtengines";
import { ChildProcessWithoutNullStreams, execFileSync, spawn } from "node:child_process";
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import * as nodeHttp from "node:http";
import { userInfo } from "node:os";
import { join, dirname } from "node:path";
import { TMReader, TMReaderResult } from "sdltm";
import { LanguageUtils } from "typesbcp47";
import { XMLElement } from "typesxml";
import { Locations, Point } from "./locations.js";
import { Match } from "./match.js";
import { MetaData, MetaId } from "./metadata.js";
import { MTManager } from "./mtManager.js";
import { Preferences } from "./preferences.js";
import { Project } from "./project.js";
import { CommentReply, ReviewComment } from "./reviewComments.js";
import { FullId } from "./segmentId.js";
import { Rect, Sizes } from "./windowSizes.js";

export class Swordfish {

    static mainWindow: BrowserWindow;
    static preferencesWindow: BrowserWindow;
    static aboutWindow: BrowserWindow;
    static licensesWindow: BrowserWindow;
    static addMemoryWindow: BrowserWindow;
    static importTmxWindow: BrowserWindow;
    static importSdltmWindow: BrowserWindow;
    static importXliffWindow: BrowserWindow;
    static addProjectWindow: BrowserWindow;
    static editProjectWindow: BrowserWindow;
    static addFileWindow: BrowserWindow;
    static defaultLangsWindow: BrowserWindow;
    static spellingLangsWindow: BrowserWindow;
    static filterSegmentsWindow: BrowserWindow;
    static tagsWindow: BrowserWindow;
    static replaceTextWindow: BrowserWindow;
    static addGlossaryWindow: BrowserWindow;
    static importGlossaryWindow: BrowserWindow;
    static concordanceSearchWindow: BrowserWindow;
    static termSearchWindow: BrowserWindow;
    static iatePluginWindow: BrowserWindow;
    static addTermWindow: BrowserWindow;
    static goToWindow: BrowserWindow;
    static sortSegmentsWindow: BrowserWindow;
    static changeCaseWindow: BrowserWindow;
    static applyTmWindow: BrowserWindow;
    static notesWindow: BrowserWindow;
    static contextWindow: BrowserWindow;
    static addNoteWindow: BrowserWindow;
    static reviewCommentsWindow: BrowserWindow;
    static addReplyWindow: BrowserWindow;
    static fileInfoWindow: BrowserWindow;
    static addCommentWindow: BrowserWindow;
    static updatesWindow: BrowserWindow;
    static gettingStartedWindow: BrowserWindow;
    static serverSettingsWindow: BrowserWindow;
    static browseDatabasesWindow: BrowserWindow;
    static addXmlConfigurationWindow: BrowserWindow;
    static editXmlFilterWindow: BrowserWindow;
    static configElementWindow: BrowserWindow;
    static tagsAnalysisWindow: BrowserWindow;
    static spaceAnalysisWindow: BrowserWindow;
    static systemInfoWindow: BrowserWindow;
    static promptWindow: BrowserWindow;
    static XSLTransformationWindow: BrowserWindow;
    static importCsvWindow: BrowserWindow;
    static webImportWindow: BrowserWindow;
    static clipboardImportWindow: BrowserWindow;
    static scoreReportWindow: BrowserWindow;

    javapath: string = join(app.getAppPath(), 'bin', 'java');

    static appHome: string = join(app.getPath('appData'), app.name);
    static iconPath: string = join(app.getAppPath(), 'images', 'icon.png');

    static latestVersion: string;
    static downloadLink: string;

    static currentDefaults: Rectangle;
    static currentPreferences: Preferences = {
        theme: 'system',
        appLang: 'en',
        zoomFactor: '1.0',
        srcLang: 'none',
        tgtLang: 'none',
        userName: userInfo().username,
        projectsFolder: join(app.getPath('appData'), app.name, 'projects'),
        memoriesFolder: join(app.getPath('appData'), app.name, 'memories'),
        glossariesFolder: join(app.getPath('appData'), app.name, 'glossaries'),
        catalog: join(app.getAppPath(), 'catalog', 'catalog.xml'),
        srx: join(app.getAppPath(), 'srx', 'default.srx'),
        reviewModel: join(app.getAppPath(), 'review', 'default.json'),
        paragraphSegmentation: false,
        acceptUnconfirmed: false,
        fuzzyTermSearches: false,
        caseSensitiveSearches: false,
        caseSensitiveMatches: true,
        autoConfirm: false,
        matchThreshold: 60,
        google: {
            enabled: false,
            apiKey: '',
            srcLang: 'none',
            tgtLang: 'none'
        },
        azure: {
            enabled: false,
            apiKey: '',
            srcLang: 'none',
            tgtLang: 'none'
        },
        deepl: {
            enabled: false,
            apiKey: '',
            srcLang: 'none',
            tgtLang: 'none'
        },
        chatGpt: {
            enabled: false,
            apiKey: '',
            model: 'gpt-4o-mini',
            fixTags: false
        },
        anthropic: {
            enabled: false,
            apiKey: '',
            model: 'claude-3-7-sonnet-latest',
            fixTags: false
        },
        mistral: {
            enabled: false,
            apiKey: '',
            model: 'mistral-medium',
            fixTags: false
        },
        gemini: {
            enabled: false,
            apiKey: '',
            model: 'gemini-2.5-flash',
            fixTags: false
        },
        qwen: {
            enabled: false,
            apiKey: '',
            region: '',
            model: '',
            fixTags: false
        },
        glm: {
            enabled: false,
            apiKey: '',
            endpoint: 'general',
            model: 'glm-4-flash-250414',
            fixTags: false
        },
        doubao: {
            enabled: false,
            apiKey: '',
            endpoint: 'general',
            model: 'doubao-seed-2-0-pro-260215',
            fixTags: false
        },
        modernmt: {
            enabled: false,
            apiKey: '',
            srcLang: 'none',
            tgtLang: 'none'
        },
        spellchecker: {
            defaultEnglish: 'en-US',
            defaultPortuguese: 'pt-BR',
            defaultSpanish: 'es'
        },
        os: process.platform,
        showGuide: true,
        pageRows: 500
    }

    static currentCss: string;
    static currentStatus: any;

    static selectedFiles: string[];
    static sortParams: any;
    static filterParams: any;
    static memoryParam: string;
    static metadataEvent: IpcMainEvent;
    static concordanceMemories: string[];
    static selectedGlossary: string;
    static messageParam: any;
    static projectParam: string;
    static remoteTmParams: any;
    static typeParam: string;
    static xmlFilter: string;
    static filterElement: any;
    static editedProject: Project;
    static activeProject: string;

    static htmlContent: string;
    static htmlTitle: string;
    static htmlId: number;

    static SUCCESS: string = 'Success';
    static LOADING: string = 'Loading';
    static COMPLETED: string = 'Completed';
    static ERROR: string = 'Error';
    static SAVING: string = 'Saving';
    static PROCESSING: string = 'Processing';

    static MONTEREY_PROMPT: string = `你是基于蒙特雷翻译教学框架的翻译导师（蒸馏自叶子南、蔡力坚、李长栓、施晓菁等教授的实践）。遵循以下原则：

## 评估三要素
评估翻译时必须从三个维度检查：
1. 准确性：是否准确传达原文意义？有无漏译、错译、过度添加？
2. 流畅性：读起来是否顺畅？有无翻译腔？是否符合译入语习惯？
3. 风格性：文体风格是否一致？语气是否符合原文？是否保持了原文色彩？

## 文本类型判断
先判断文本类型再给建议：
- 硬文本（技术、法律、财务、手册）：准确性优先，术语统一规范
- 软文本（文学、宣传、评论、散文）：灵活变通，注重可读性和文采

## 中译英核心技巧
- 汉语意合→英语形合：短句合为复合句，增补逻辑连接词
- 汉语主动→英语被动：根据语境灵活选择语态
- 汉语重复→英语变化：用代词、同义词替换避免重复
- 汉语具体→英语抽象：适当抽象概括

## 英译中核心技巧
- 英语形合→汉语意合：长句切分为短句
- 英语被动→汉语主动：转换为自然表达
- 英语抽象→汉语具体：具体化表达
- 适度使用四字格增强节奏感，但不过度

## 反馈格式
评估翻译时严格按此格式回复：
1. **优点**：先肯定做得好的地方
2. **问题**：按准确性→流畅性→风格性顺序，具体指出需改进的点
3. **建议**：提供1-2个修改方案，解释为什么这样改
4. **技术点拨**：指出使用的翻译技巧，帮助举一反三`;

    static CATTI_PROMPT: string = `你是CATTI全国翻译专业资格（水平）考试阅卷专家，同时也是一位蒙特雷翻译学院风格的AI翻译导师。
你的角色不仅是评分，更要帮助学生理解翻译选择背后的原因，培养翻译思维能力。

## 评分标准（满分100分）

### 三级笔译（60分及格）
- 忠实原文（30分）：准确传达原文信息，无重大漏译、错译
- 表达通顺（30分）：译文符合译入语习惯，语句通顺
- 完整性（20分）：无遗漏，无随意增删
- 规范性（20分）：标点、格式、术语使用规范

### 二级笔译（60分及格）
- 信（35分）：准确传达原文意义和隐含信息，术语准确
- 达（35分）：表达流畅地道，无明显翻译腔，句式灵活
- 雅（15分）：文体风格与原文匹配，用词精当
- 技巧运用（15分）：合理运用翻译技巧（增减词、转换、拆合句等）

### 一级笔译（60分及格）
- 精确理解（30分）：准确把握原文深层含义、语气和风格
- 传神表达（30分）：译文地道优美，体现翻译的艺术性
- 风格匹配（20分）：译文风格与原文高度一致
- 专业水准（20分）：术语精准，逻辑清晰，体现专业素养

## 输出格式
请严格按以下JSON格式输出评分结果。不要添加\`\`\`json标记，直接输出JSON对象：

{
  "totalScore": <0-100的整数>,
  "level": "三级|二级|一级",
  "overallComment": "<2-3句整体评语>",
  "suggestions": ["<改进建议1>", "<改进建议2>", "<3-5条具体建议>"],
  "segments": [
    {
      "score": <0-100>,
      "analysis": "<蒙特雷式翻译讲解：1)原文理解要点和难点 2)关键翻译策略分析（为什么选A而不是B） 3)词汇/句法对比解析 4)文化或语用考量>",
      "strengths": ["<这段翻译做得好的1-2点>"],
      "issues": ["<需要改进的1-2点>"]
    }
  ]
}`;

    static CATTI_PROMPT_V2: string = `你是CATTI全国翻译专业资格（水平）考试阅卷专家，同时也是一位蒙特雷翻译学院风格的AI翻译导师。
你采用ATA（American Translators Association）错误分类标准，结合CATTI扣分制进行评分。
你的角色不仅是评分，更要帮助学生理解翻译选择背后的原因，培养翻译思维能力。

## 评分体系（扣分制，基础100分）

三个评分维度（对应ATA三大板块）：
| 维度 | 满分 | ATA板块 | CATTI对应 |
|------|------|---------|----------|
| 意义传递 Meaning Transfer | 40 | Section 2 | 忠实原文、无错译漏译 |
| 译入语规范 Target Mechanics | 30 | Section 1 | 语言规范、通顺、无语法错误 |
| 行文质量 Writing Quality | 30 | Section 3 | 用词恰当、体现原文风格 |

## 错误分类（严格使用以下类型，不可自创）

### Section 1 — 译入语规范 Target Language Mechanics
违反目标语书面规范（语法、拼写等）。若错误影响理解则归入Section 2。
- G (Grammar 语法): 主谓一致、动词变位、名词/代词/形容词变格
  - SYN (Syntax 句法): 语序不当、修饰关系错、缺乏平行、流水句
  - WF/PS (Word Form/Part of Speech 词形/词性): 词根对但形态错、词性错
- SP/CH (Spelling/Character 拼写/字形): 拼写错误、错别字
  - C (Capitalization 大小写)
  - D (Diacritical Marks 变音符号)
- P (Punctuation 标点): 标点用法、段落划分（若造成歧义则升为意义传递）
- OTH-ME (Other Mechanics 其他规范)

### Section 2 — 意义传递 Meaning Transfer
影响读者对原文事实/观点的理解。
- A (Addition 增译): 引入多余意义成分（显化explicitation允许）
- O (Omission 漏译): 遗漏原文信息或语气（隐化implicitation允许）
- T (Terminology 术语/关键词误用): 内容词选择不当、专业术语错误
- FA (Faux Ami 假朋友): 形近义远词汇混淆（望文生义）
- VF (Verb Form 动词形式): 语法正确但传达错误意义（如时态选择致意义改变）
- AMB (Ambiguity 歧义): 译文允许多重解读
- COH (Cohesion 衔接不当): 指代、替代、省略、连接词、词汇衔接不当
- F (Faithfulness 忠实度): 过度改写偏离原文意义/意图
- L (Literalness 死译): 逐字翻译致不清晰或不正确
- MU (Misunderstanding 误解): 对原文词汇/习语/句法结构理解错误
- IND (Indecision 犹豫不决): 给出多个选项
- UNF (Unfinished 未完成): 大段未译
- OTH-MT (Other Meaning Transfer 其他意义错误)

### Section 3 — 行文质量 Writing Quality
不违反规则但"听起来不对"。
- U (Usage 搭配/用法): 不符合译入语习惯搭配、Chinglish、欧化中文
- TT (Text Type 文本类型): 不符合目标受众或翻译指令
  - R (Register 语域): 正式度不匹配
  - ST (Style 风格): 文体/结构选择不匹配
- Emphasis (未突出重点): 未传递原文强调的信息
- Perspective (写作视角偏差): 叙事角度偏离原文

## 错误判定流程（ATA Flowchart 核心决策树）

判定每个错误时，严格按以下决策树操作：

**Step 1: 该错误是否影响读者对原文意义的理解？**
- 否 → 归入Section 1（译入语规范）。此类错误扣分上限较低，如拼写、标点、语法形式错误。
  注意：Section 1错误若因标点等导致歧义，则升级为Section 2。
- 是 → 进入Step 2

**Step 2: 影响范围与程度（Section 2 — 意义传递）**
- 局部影响：仅影响单个词语或短语的理解，读者借助上下文可推断正确含义 → 较低严重度
- 衔接/连贯影响：破坏句子间逻辑连接、指代关系、段落衔接 → 较高严重度（衔接错误比局部错误更严重）
- 核心意义影响：改变原文主要观点、导致读者对事实/立场产生误解 → 最高严重度

**Step 3: 语境与翻译指令考量**
- 翻译指令有明确要求（术语表、语域、受众）→ 违反要求加重严重度
- 专业文本中对术语的误译比普通文本更严重
- 原文本身歧义且无法从语境判断 → 给予benefit of the doubt，判为较轻

**Step 4: Section 3 判定（行文质量）**
- 若错误不违反具体规则，但"听起来不自然" → 归入Section 3
- 判断标准：目标语母语者是否会这样写？若不会，则为行文质量问题

**ATA严重度参考标尺（仅供判定severity时的参考，实际扣分遵循CATTI规则）**:
- severity 1 (minor): 轻微瑕疵，读者几乎不影响理解
- severity 2 (moderate): 中等影响，读者需停顿但能推断含义
- severity 4 (serious): 严重影响，读者可能产生错误理解
- severity 8 (critical): 致命影响，完全改变原文含义或使译文不可用

## 扣分规则（CATTI标准）

严重度等级：1(minor轻微) / 2(moderate中等) / 4(serious严重) / 8(critical致命)

三级笔译扣分标准：
- 误译、漏译(MU/O): 每处-1~-3分，严重-5分
- 复合句从句/非谓语动词错误(SYN): 每处-2分
- 关键词误用(T): 每处-1分，后续重复使用连续扣分
- 语法正确但不通顺/Chinglish(U): 每处-2分
- 整篇多处不通顺(U): 额外扣-3~-4分
- 拼写错误(SP): 5个扣1分
- 时态语态错误(G/VF): 每处-2分
- 用词不准(T/SP): 每处-0.5~-1分
- 逻辑不通/语句不连贯(COH): 每处-1~-2分
- 特殊句式未按要求翻译(L/ST): 每处-2分

二级笔译扣分标准：
- 错译、漏译、语法错误(MU/O/G): 每处-2分
- 严重误译/观点错误(MU): 每处-5分
- 用词不准确(T): 每处-1分，重复连续扣分
- 拼写错误(SP): 每处-1分
- 逻辑不通/翻译腔(COH/U): 每处-2分
- 时态语态语法(G/VF): 每处-2分
- 特殊句式效果未体现(L/ST): 每处-2分
- 关键词误用(T): 每处-1分，后续重复使用连续扣分
- Chinglish/欧化(U): 每处-2分

质量加分：最多3处"出色翻译"亮点，每处+1分抵扣错误分。

## 反馈风格
- 像老师对学生说话，温和但严谨
- 宏观到微观：先评整体印象和共性问题，再逐段细讲
- 先肯定优点，再指出问题，最后给出修改方案
- overallAnalysis中每个分析点独占一行（用\\n分隔）
- analysis中每点独占一行，不要堆砌

## 多参考译文
每段提供2种替代译法供学生参考：
- 一种不同语域的版本（如更正式或更口语化）
- 一种不同句子成分做主语的版本

## 输出格式
严格输出以下JSON，不要添加\`\`\`json标记，不要输出JSON以外的任何文字：

{
  "version": 2,
  "totalScore": <0-100整数，=100-总扣分+质量加分>,
  "level": "二级",
  "errorPoints": <总扣分>,
  "qualityPoints": <0-3整数，质量加分>,
  "subScores": {
    "meaningTransfer": { "score": <整数>, "max": 40, "label": "意义传递 / Meaning Transfer", "errorPoints": <该维度扣分> },
    "targetMechanics": { "score": <整数>, "max": 30, "label": "译入语规范 / Target Mechanics", "errorPoints": <该维度扣分> },
    "writingQuality": { "score": <整数>, "max": 30, "label": "行文质量 / Writing Quality", "errorPoints": <该维度扣分> }
  },
  "rootDiagnosis": "<1-2句话直指最核心的问题模式。格式：'你的核心问题是[具体模式]，本次评分中N处错误(M处扣分)与此相关。修复此模式预计可提升X分。' 若有多个并列问题则用\\n分隔>",
  "qualityHighlights": ["<最多3处出色翻译的具体描述>"],
  "overallAnalysis": "<4-8行分析，用\\n分隔每行。先总体印象，再指出共性问题模式，最后总结建议>",
  "suggestions": ["<3-5条具体改进建议>"],
  "segments": [
    {
      "score": <0-100整数>,
      "subScores": {
        "meaningTransfer": { "score": <整数>, "max": <按段落权重分配> },
        "targetMechanics": { "score": <整数>, "max": <按段落权重分配> },
        "writingQuality": { "score": <整数>, "max": <按段落权重分配> }
      },
      "analysis": "<逐点分析：先句法处理，再词汇选择，后文风修辞。每点独占一行用\\n分隔>",
      "strengths": ["<1-2个做得好的具体点>"],
      "issues": ["<1-2个需改进的具体点>"],
      "qualityHighlight": "<若该段有出色翻译则写具体描述，否则为空字符串>",
      "errors": [
        {
          "type": "<中文名 English>",
          "code": "<ATA代码如MU/SYN/T>",
          "section": "mechanics|meaning|quality",
          "severity": <1或2或4或8>,
          "deduction": <扣分值>,
          "isRepeat": <true|false>,
          "impactScope": "<local局部|cohesion衔接|core核心，仅section=meaning时必填>",
          "description": "<简述错误原因30字内>",
          "original": "<学生译文中的错误片段>",
          "suggested": "<修改后的表达>"
        }
      ],
      "alternativeReferences": [
        { "register": "书面语体/正式表达", "translation": "<不同于参考译文的正式版本>" },
        { "register": "换主语/灵活句式", "translation": "<不同句子成分做主语的版本>" }
      ]
    }
  ]
}`;

    static IEGS_REFERENCE: string = `
## ATA中译英专项评分标准 (Into-English Grading Standards 2025)

当目标语言为英文时，除通用ATA错误分类外，须参照以下ATA Into-English Grading Standards判定具体错误。

### Section 1 — 译入语规范 英文专项规则

**冠词 Articles** (中文无冠词，是最常见错误源):
- 定冠词the: 已提及/特定/唯一的名词(the government that passed the law)
- 不定冠词a/an: 首次提及/泛指单数可数名词(a man was approaching)
- 零冠词: 泛指复数(apples are yellow)、不可数名词(rice is white)、动名词(sleeping is a pleasure)
- 缩略词冠词: 字母拼读加the(the UN, the FBI), 单词拼读不加(NATO, NASA)
- 典型错误: "Government forbade actions"(缺the) / "The sleeping is important"(多余the) / "He asked her to bring a cat"(应the, 语境暗示特定猫)

**动词时态 Verb Tenses** (中文无时态变化):
- 现在进行时: 正在发生的动作(I am taking a walk right now, 不可用I take a walk)
- 现在完成时: 过去发生持续到现在，不可与具体过去时间连用(I have lived here for 5 years, 不可说I have lived here in 2020)
- 过去完成时: 仅用于描述事件先后顺序(had eaten before she arrived)
- 条件句时态序列:
  Type0(事实): 现在时+现在时(If you heat it, ice turns to water)
  Type1(可能): 现在时+将来时(If it rains, we will get wet, 不可If it will rain)
  Type2(假设): 过去时+would(If I were(NOT was) rich, I would help)
  Type3(反事实): 过去完成+would have(If I had studied, I would have passed)
- 从句指将来用现在时: after he arrives(NOT after he will arrive)

**逗号与标点 Commas & Punctuation** (中英文标点规则差异极大):
- 两个独立子句须: 分号 / 逗号+连词 / 句号分开(仅用逗号=comma splice, 错误)
- 逗号不可出现在主语和谓语之间(The high unemployment rates, remain → Error)
- 插入语必须成对逗号(I learned, as a result, that... / I learned as a result, that... → Error)
- however前后必须有标点(; however, 或 , however,)
- 连续形容词用逗号(a young, beautiful woman)
- 美式引号: 逗号和句号放引号内(the term "disaster," 不可 the term "disaster",)
- 仅用双引号(不用«»或"")
- 间接引语不用引号(He explained that he had missed his train, 不可 "he had missed")

**主谓一致 Subject-Verb Agreement**:
- 集体名词通常单数(The team was winning, 不可were, 除非强调个体行为)
- The number of + 单数动词; A number of + 复数动词
- 分数/百分比跟随名词: Two-thirds of the wine was / One-third of the respondents are

**关系代词与从句 Relative Pronouns**:
- 限制性定语从句: that/who, 不加逗号, that可省略(作宾语时)
- 非限制性定语从句: which/who/whom, 必须加逗号, 不可用that
- whose可指人或物(the tree whose roots were damaged)
- 限制性加逗号/非限制性不加逗号均为错误

**虚拟语气 Subjunctive**:
- 反事实条件句: If I were(NOT was) rich
- 命令虚拟语气: recommend that there be(NOT is) no further discussion / It is important that each member have(NOT has) a say

**平行结构 Parallel Construction**:
- Electric cars are quiet, cause no pollution, and use no gasoline (不可 and gasoline is not used)
- to earn a living, to take vacations, and to save (不可 and saving)

**连字符 Hyphens**:
- 复合修饰语前置连字符: a three-year-old child (不可three-years-old)
- 后置不用: the child is three years old (不可three-years-old)
- 消歧: heavy-metal detector(检测重金属) vs heavy metal detector(沉重的金属探测器)

**大小写与格式**:
- 标题: 实词大写虚词小写(Education in the Developing World)
- 缩略词全大写(UNESCO, 不可Unesco); WHO(首字母大写) ≠ Who(疑问词, 影响意义)
- 句首不可用数字(173 ballots → A total of 173 ballots)
- 数字5位以上用逗号(11,000 不可 11000 或 11.000)

### Section 2 — 意义传递 英文专项规则

**指代清晰 Anaphora / Referents**:
- 代词必须指代明确: "A man and a boy were waiting. He looked familiar." → Error(歧义)
- 适度使用同义指代(elegant variation), 避免重复同一词也避免过多近义词
- 不可用含主观判断的新名词回指(This manifestation of selfishness → Error, 除非前文已暗示)

**同义词与假朋友 Cognates**:
- 词典中某定义可用即可, 但主导含义不可造成歧义或扭曲原文
- State control = 政府控制(歧义, 若原文指心理状态则Error affecting meaning)

**习语翻译 Idioms**:
- 不可直译源语言习语(hanging noodles on ears → Error)
- 可用等效英文习语(pull the wool over eyes)或意译(dupe the electorate)
- 直译后若语境可推断含义可宽容, 但造成歧义则扣分

**被动语态 Passive Voice**:
- 源文被动可译为英文被动或主动, 但不可添加原文未暗示的施事者
- "My dog had been run over" ≠ "A car had run over my dog"(添加了原文没有的施事者→Error)
- 过多被动致风格不当可扣分(如说明文本应用祈使句却全用被动)

**人名地名 Names**:
- 知名人名地名须用英文惯用形式(Moscow, 不可音译拼法)
- 私企名称不可翻译(Bayerische Motoren Werke AG 不可译为 Bavarian Auto Works)
- 政府机构须翻译(Ministero degli affari esteri → Ministry of Foreign Affairs, 不可保留原文)
- 音译一致: 用音标则全文统一, 不可Bošković与Boskovic混用

**源文歧义处理**: 英文语法可能迫使选择(单复数、冠词、限制性/非限制性)。若语境可判断则须选对; 若无法判断, 给出benefit of the doubt。

### Section 3 — 行文质量 英文专项规则

**语域 Register**:
- 译文正式度须匹配原文和翻译指令
- 学术文本不用缩写(you can't → Error in academic journal)
- 口语化文本可适度使用(You can't judge → Acceptable in newspaper column)
- 过度正式也是错误(Pursuant to his mother's instructions, Jeff gave the note → Error in casual context)
- 术语选择须适合目标受众(hydrophobic dog → Error in general context; rabid dog → Acceptable)

**冗余 Redundancy**:
- 适度冗余不扣分(absolutely perfect, old adage → Acceptable if source similar)
- 源语言习惯性冗余可在译文中适当删减不扣分
- "Both"有限定功能时不可省(Both suitcases exceeded → 不可Suitcases exceeded, 引入歧义)

**非美式英语**: 基于美式英语。英式拼写/用法为错误(honour, in hospital, towards虽常见但可能扣分)

**介词悬垂**: 一般可接受(What are you looking for?)但不可拆分习语动词(up with which I will not put → Error)

**句式结构**: 源文流水句/逗号连接子句须拆分或用适当连词, 不可保留run-on结构
`;

    static spellCheckerLanguages: string[];
    static selectionRequest: IpcMainEvent;
    static addConfigurationEvent: IpcMainEvent;

    ls: ChildProcessWithoutNullStreams;

    static locations: Locations;
    static sizes: Sizes;

    constructor() {
        if (!app.requestSingleInstanceLock()) {
            app.quit();
        } else if (Swordfish.mainWindow) {
            // Someone tried to run a second instance, we should focus our window.
            if (Swordfish.mainWindow.isMinimized()) {
                Swordfish.mainWindow.restore();
            }
            Swordfish.mainWindow.focus();
        }
        if (process.platform === 'linux') {
            app.commandLine.appendSwitch('gtk-version', '3');
        }
        if (process.platform === 'win32') {
            this.javapath = join(app.getAppPath(), 'bin', 'java.exe');
        }

        if (!existsSync(Swordfish.appHome)) {
            mkdirSync(Swordfish.appHome, { recursive: true });
        }

        this.ls = spawn(this.javapath, ['--module-path', 'lib', '-m', 'swordfish/com.maxprograms.swordfish.TmsServer', '-port', '8070'], { cwd: app.getAppPath(), windowsHide: true });
        this.ls.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        this.ls.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
        execFileSync(this.javapath, ['--module-path', 'lib', '-m', 'swordfish/com.maxprograms.swordfish.CheckURL', 'http://localhost:8070/TMSServer'], { cwd: app.getAppPath(), windowsHide: true });

        this.loadDefaults();
        Swordfish.locations = new Locations(join(app.getPath('appData'), app.name, 'locations.json'));
        Swordfish.sizes = new Sizes(join(app.getPath('appData'), app.name, 'sizes.json'));

        Swordfish.loadPreferences();

        app.on('ready', () => {
            Swordfish.createWindow();
            let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'index.html');
            let fileUrl: URL = new URL('file://' + filePath);
            Swordfish.mainWindow.loadURL(fileUrl.href);
            Swordfish.mainWindow.on('resize', () => {
                this.saveDefaults();
            });
            Swordfish.mainWindow.on('move', () => {
                this.saveDefaults();
            });
            Swordfish.mainWindow.once('ready-to-show', () => {
                Swordfish.mainWindow.setBounds(Swordfish.currentDefaults);
                Swordfish.mainWindow.show();
                Swordfish.startup();
            });
        });

        app.on('before-quit', (event: Electron.Event) => {
            if (!this.ls.killed) {
                event.preventDefault();
                this.stopServer();
            }
        });

        app.on('quit', () => {
            app.quit();
        });

        app.on('window-all-closed', () => {
            app.quit();
        });

        nativeTheme.on('updated', () => {
            let oldCss: string = Swordfish.currentCss;
            let dark: string = 'file://' + join(app.getAppPath(), 'css', 'dark.css');
            let light: string = 'file://' + join(app.getAppPath(), 'css', 'light.css');
            let highcontrast: string = 'file://' + join(app.getAppPath(), 'css', 'highcontrast.css');
            if (Swordfish.currentPreferences.theme === 'system') {
                if (nativeTheme.shouldUseDarkColors) {
                    Swordfish.currentCss = dark;
                } else {
                    Swordfish.currentCss = light;
                }
                if (nativeTheme.shouldUseHighContrastColors) {
                    Swordfish.currentCss = highcontrast;
                }
                let windows: BrowserWindow[] = BrowserWindow.getAllWindows();
                for (let window of windows) {
                    window.webContents.send('set-theme', Swordfish.currentCss);
                }
            }
            if ((oldCss === dark || oldCss === light) && Swordfish.currentCss === highcontrast) {
                Swordfish.deleteAllTags('#003e66;', '#ffffff');
            }
            if ((oldCss === highcontrast) && (Swordfish.currentCss === dark || Swordfish.currentCss === light)) {
                Swordfish.deleteAllTags('#009688', '#ffffff');
            }
            Swordfish.createMenu();
        });
        ipcMain.on('get-rows-page', (event: IpcMainEvent) => {
            event.sender.send('set-rows-page', Swordfish.currentPreferences.pageRows);
        });
        ipcMain.on('get-projects', (event: IpcMainEvent) => {
            Swordfish.getProjects(event);
        });
        ipcMain.on('get-memories', (event: IpcMainEvent) => {
            Swordfish.getMemories(event);
        });
        ipcMain.on('show-add-file', () => {
            Swordfish.addFile();
        });
        ipcMain.on('show-add-project', () => {
            Swordfish.showAddProject();
        });
        ipcMain.on('show-edit-project', (event: IpcMainEvent, project: Project) => {
            Swordfish.showEditProject(project);
        });
        ipcMain.on('export-translations', (event: IpcMainEvent, arg: any) => {
            Swordfish.exportProjectTranslations(arg);
        });
        ipcMain.on('export-open-project', (event: IpcMainEvent, arg: any) => {
            Swordfish.exportOpenProject(arg);
        });
        ipcMain.on('get-theme', (event: IpcMainEvent) => {
            event.sender.send('set-theme', Swordfish.currentCss);
        });
        ipcMain.on('set-height', (event: IpcMainEvent, arg: { window: string, width: number, height: number }) => {
            Swordfish.setHeight(arg);
        });
        ipcMain.on('close-serverSettings', () => {
            Swordfish.serverSettingsWindow.close();
        });
        ipcMain.on('browse-server', (event: IpcMainEvent, arg: any) => {
            Swordfish.connectToServer(arg);
        });
        ipcMain.on('get-databases', (event: IpcMainEvent) => {
            event.sender.send('set-databases', Swordfish.remoteTmParams);
        });
        ipcMain.on('show-server-settings', (event: IpcMainEvent, arg: any) => {
            Swordfish.showServerSettings(arg.type);
        });
        ipcMain.on('close-browseServer', () => {
            Swordfish.browseDatabasesWindow.close();
        });
        ipcMain.on('add-databases', (event: IpcMainEvent, arg: any) => {
            Swordfish.addDatabases(arg);
        });
        ipcMain.on('close-licenses', () => {
            Swordfish.licensesWindow.close();
        });
        ipcMain.on('save-preferences', async (event: IpcMainEvent, arg: Preferences) => {
            await Swordfish.savePreferences(arg);
        });
        ipcMain.on('save-languages', (event: IpcMainEvent, arg: any) => {
            Swordfish.savelanguages(arg);
        });
        ipcMain.on('close-addProject', () => {
            Swordfish.addProjectWindow.close();
        });
        ipcMain.on('close-editProject', () => {
            Swordfish.editProjectWindow.close();
        });
        ipcMain.on('close-addFile', () => {
            Swordfish.addFileWindow.close();
        });
        ipcMain.on('close-go-to', () => {
            if (Swordfish.goToWindow && !Swordfish.goToWindow.isDestroyed()) {
                Swordfish.goToWindow.close();
            }
        });
        ipcMain.on('go-to-segment', (event: IpcMainEvent, seg: number) => {
            Swordfish.mainWindow.focus();
            Swordfish.mainWindow.webContents.send('open-segment', seg);
        });
        ipcMain.on('go-to-same-source', (event: IpcMainEvent, currentSegment: FullId) => {
            Swordfish.goToSameSource(currentSegment);
        });
        ipcMain.on('get-project-param', (event: IpcMainEvent) => {
            Swordfish.projectParam ? event.sender.send('set-project', Swordfish.projectParam) : event.preventDefault();
        });
        ipcMain.on('close-replaceText', () => {
            Swordfish.replaceTextWindow.close();
        });
        ipcMain.on('close-tags', () => {
            Swordfish.closeTagsWindow();
        });
        ipcMain.on('get-selected-file', (event: IpcMainEvent) => {
            Swordfish.setSelectedFile(event);
        });
        ipcMain.on('get-languages', (event: IpcMainEvent) => {
            this.getLanguages(event);
        });
        ipcMain.on('get-svg', (event: IpcMainEvent, svgName: string) => {
            event.sender.send('set-svg', Swordfish.getSvgIcon(svgName));
        });
        ipcMain.on('get-projects-svg', (event: IpcMainEvent, svgName: string) => {
            event.sender.send('set-projects-svg', Swordfish.getSvgIcon(svgName));
        });
        ipcMain.on('get-memories-svg', (event: IpcMainEvent, svgName: string) => {
            event.sender.send('set-memories-svg', Swordfish.getSvgIcon(svgName));
        });
        ipcMain.on('get-glossaries-svg', (event: IpcMainEvent, svgName: string) => {
            event.sender.send('set-glossaries-svg', Swordfish.getSvgIcon(svgName));
        });
        ipcMain.on('select-source-files', (event: IpcMainEvent) => {
            this.selectSourceFiles(event);
        });
        ipcMain.on('close-about', () => {
            Swordfish.aboutWindow.close();
        });
        ipcMain.on('system-info-clicked', () => {
            Swordfish.showSystemInfo();
        });
        ipcMain.on('close-systemInfo', () => {
            Swordfish.systemInfoWindow.close();
        });
        ipcMain.on('get-system-info', (event: IpcMainEvent) => {
            Swordfish.getSystemInformation(event);
        });
        ipcMain.on('licenses-clicked', () => {
            Swordfish.showLicenses({ from: 'about' });
        });
        ipcMain.on('get-source-files', (event: IpcMainEvent) => {
            Swordfish.getSelectedFiles(event);
        });
        ipcMain.on('get-project-data', (event: IpcMainEvent) => {
            event.sender.send('project-data', Swordfish.editedProject);
        });
        ipcMain.on('update-project', (event: IpcMainEvent, arg: any) => {
            Swordfish.updateProject(arg);
        });
        ipcMain.on('create-project', (event: IpcMainEvent, arg: any) => {
            Swordfish.createProject(arg);
        });
        ipcMain.on('remove-projects', (event: IpcMainEvent, arg: any) => {
            Swordfish.removeProjects(arg);
        });
        ipcMain.on('close-project', (event: IpcMainEvent, arg: any) => {
            Swordfish.closeProject(arg);
        });
        ipcMain.on('show-add-memory', () => {
            Swordfish.showAddMemory();
        });
        ipcMain.on('close-addMemory', () => {
            Swordfish.addMemoryWindow.close();
        });
        ipcMain.on('add-memory', (event: IpcMainEvent, arg: any) => {
            Swordfish.addMemory(arg);
        });
        ipcMain.on('show-add-glossary', () => {
            Swordfish.showAddGlossary();
        });
        ipcMain.on('add-glossary', (event: IpcMainEvent, arg: any) => {
            Swordfish.addGlossary(arg);
        });
        ipcMain.on('close-addGlossary', () => {
            Swordfish.addGlossaryWindow.close();
        });
        ipcMain.on('get-glossaries', (event: IpcMainEvent) => {
            Swordfish.getGlossaries(event);
        });
        ipcMain.on('remove-glossaries', (event: IpcMainEvent, arg: any) => {
            Swordfish.removeGlossaries(arg);
        });
        ipcMain.on('show-add-term', (event: IpcMainEvent, glossary: string) => {
            Swordfish.showAddTerm(glossary);
        });
        ipcMain.on('close-addTerm', () => {
            Swordfish.addTermWindow.close();
        });
        ipcMain.on('add-to-glossary', (event: IpcMainEvent, arg: { glossary: string, sourceTerm: string, targetTerm: string, srcLang: string, tgtLang: string }) => {
            Swordfish.addToGlossary(arg);
        });
        ipcMain.on('show-import-tmx', (event: IpcMainEvent, arg: any) => {
            Swordfish.showImportTMX(arg);
        });
        ipcMain.on('show-import-sdltm', (event: IpcMainEvent, arg: any) => {
            Swordfish.showImportSDLTM(arg);
        });
        ipcMain.on('get-memory-param', (event: IpcMainEvent) => {
            Swordfish.memoryParam ? event.sender.send('set-memory', Swordfish.memoryParam) : event.preventDefault();
        });
        ipcMain.on('show-import-glossary', (event: IpcMainEvent, arg: any) => {
            Swordfish.showImportGlossary(arg);
        });
        ipcMain.on('get-glossary-param', (event: IpcMainEvent) => {
            event.sender.send('set-glossary', Swordfish.selectedGlossary);
        });
        ipcMain.on('get-glossary-file', (event: IpcMainEvent) => {
            Swordfish.getGlossaryFile(event);
        });
        ipcMain.on('import-glossary-file', (event: IpcMainEvent, arg: any) => {
            Swordfish.importGlossaryFile(arg);
        });
        ipcMain.on('export-glossaries', (event: IpcMainEvent, arg: any) => {
            Swordfish.exportGlossaries(arg);
        });
        ipcMain.on('close-importGlossary', () => {
            Swordfish.importGlossaryWindow.close();
        });
        ipcMain.on('close-importTmx', () => {
            Swordfish.importTmxWindow.close();
        });
        ipcMain.on('import-tmx-file', (event: IpcMainEvent, arg: any) => {
            Swordfish.importTmxFile(arg);
        });
        ipcMain.on('remove-memories', (event: IpcMainEvent, arg: any) => {
            Swordfish.removeMemories(arg);
        });
        ipcMain.on('export-memories', (event: IpcMainEvent, arg: any) => {
            Swordfish.exportMemories(arg);
        });
        ipcMain.on('get-tmx-file', (event: IpcMainEvent) => {
            this.getTmxFile(event);
        });
        ipcMain.on('get-sdltm-file', (event: IpcMainEvent) => {
            this.getSdltmFile(event);
        });
        ipcMain.on('import-sdltm-file', (event: IpcMainEvent, arg: any) => {
            Swordfish.importSdltmFile(arg);
        });
        ipcMain.on('close-importSdltm', () => {
            Swordfish.importSdltmWindow.close();
        });
        ipcMain.on('concordance-search', (event: IpcMainEvent, memories: string[]) => {
            Swordfish.showConcordanceWindow(memories);
        });
        ipcMain.on('get-concordance-memories', (event: IpcMainEvent) => {
            event.sender.send('set-concordance-memories', Swordfish.concordanceMemories);
        });
        ipcMain.on('close-concordanceSearch', () => {
            Swordfish.concordanceSearchWindow.close();
        });
        ipcMain.on('get-concordance', (event: IpcMainEvent, arg: any) => {
            Swordfish.concordanceSearch(event, arg);
        });
        ipcMain.on('get-selection', (event: IpcMainEvent) => {
            Swordfish.selectionRequest = event;
            Swordfish.mainWindow.webContents.send('get-selected-text');
        });
        ipcMain.on('selected-text', (event: IpcMainEvent, arg: { selected: string, lang?: string, srcLang: string, tgtLang: string }) => {
            Swordfish.selectionRequest.sender.send('set-selected-text', arg);
        });
        ipcMain.on('get-html-content', (event: IpcMainEvent) => {
            event.sender.send('set-content', Swordfish.htmlContent);
        });
        ipcMain.on('get-html-title', (event: IpcMainEvent) => {
            event.sender.send('set-title', Swordfish.htmlTitle);
        });
        ipcMain.on('get-html-id', (event: IpcMainEvent) => {
            event.sender.send('set-id', Swordfish.htmlId);
        });
        ipcMain.on('close-htmlViewer', (event: IpcMainEvent, id: number) => {
            BrowserWindow.fromId(id)?.close();
        });
        ipcMain.on('get-clients', (event: IpcMainEvent) => {
            this.getClients(event);
        });
        ipcMain.on('show-term-search', (event: IpcMainEvent, arg: any) => {
            Swordfish.showTermSearch(arg);
        });
        ipcMain.on('search-iate', () => {
            Swordfish.showIatePlugin();
        });
        ipcMain.on('close-iatePlugin', () => {
            Swordfish.iatePluginWindow.close();
        });
        ipcMain.on('close-termSearch', () => {
            Swordfish.termSearchWindow.close();
        });
        ipcMain.on('search-terms', (event: IpcMainEvent, arg: any) => {
            Swordfish.termSearch(arg);
        });
        ipcMain.on('get-project-names', (event: IpcMainEvent) => {
            this.getProjectNames(event);
        });
        ipcMain.on('get-subjects', (event: IpcMainEvent) => {
            this.getSubjects(event);
        });
        ipcMain.on('get-home', (event: IpcMainEvent) => {
            event.sender.send('set-home', app.getPath('home'));
        });
        ipcMain.on('get-types', (event: IpcMainEvent) => {
            this.getTypes(event);
        });
        ipcMain.on('get-charsets', (event: IpcMainEvent) => {
            this.getCharset(event);
        });
        ipcMain.on('get-version', (event: IpcMainEvent) => {
            event.sender.send('set-version', app.name + ' ' + app.getVersion());
        });
        ipcMain.on('close-preferences', () => {
            Swordfish.preferencesWindow.close();
        });
        ipcMain.on('close-defaultLangs', () => {
            Swordfish.defaultLangsWindow.close();
        });
        ipcMain.on('get-preferences', (event: IpcMainEvent) => {
            event.sender.send('set-preferences', Swordfish.currentPreferences);
        });
        ipcMain.on('preferences-set', () => {
            Swordfish.preferencesWindow.show();
            Swordfish.mainWindow.webContents.send('end-waiting');
        });
        ipcMain.on('browse-projects', (event: IpcMainEvent) => {
            this.browseProjects(event);
        });
        ipcMain.on('browse-memories', (event: IpcMainEvent) => {
            this.browseMemories(event);
        });
        ipcMain.on('browse-glossaries', (event: IpcMainEvent) => {
            this.browseGlossaries(event);
        });
        ipcMain.on('browse-srx', (event: IpcMainEvent) => {
            this.browseSRX(event);
        });
        ipcMain.on('browse-catalog', (event: IpcMainEvent) => {
            this.browseCatalog(event);
        });
        ipcMain.on('browse-xsl-source', (event: IpcMainEvent) => {
            this.browseXslSource(event);
        });
        ipcMain.on('browse-xsl', (event: IpcMainEvent) => {
            this.browseXSL(event);
        });
        ipcMain.on('browse-output', (event: IpcMainEvent) => {
            this.browseOutput(event);
        });
        ipcMain.on('browse-review-model', (event: IpcMainEvent) => {
            this.browseReviewModel(event);
        });
        ipcMain.on('get-mt-languages', (event: IpcMainEvent) => {
            this.getMtLanguages(event);
        });
        ipcMain.on('get-ai-models', (event: IpcMainEvent) => {
            this.getAiModels(event);
        });
        ipcMain.on('open-license', (event: IpcMainEvent, type: string) => {
            Swordfish.openLicense(type);
        });
        ipcMain.on('open-link', (_event: IpcMainEvent, url: string) => {
            shell.openExternal(url).catch((reason: any) => {
                if (reason instanceof Error) {
                    console.error(reason.message);
                }
            });
        });
        ipcMain.on('get-message-param', (event: IpcMainEvent) => {
            event.sender.send('set-message', Swordfish.messageParam);
        });
        ipcMain.on('show-message', (event: IpcMainEvent, arg: any) => {
            Swordfish.showMessage(arg);
        });
        ipcMain.on('show-notification', (event: IpcMainEvent, message: string) => {
            Swordfish.showNotification(message);
        });
        ipcMain.on('add-tab', (event: IpcMainEvent, arg: Project) => {
            Swordfish.mainWindow.webContents.send('add-tab', arg);
        });
        ipcMain.on('get-segments-count', (event: IpcMainEvent, arg: any) => {
            Swordfish.getSegmenstCount(event, arg);
        });
        ipcMain.on('get-segments', (event: IpcMainEvent, arg: any) => {
            Swordfish.getSegments(event, arg);
        });
        ipcMain.on('get-project-files', (event: IpcMainEvent, projectId: string) => {
            Swordfish.getProjectFiles(projectId);
        });
        ipcMain.on('goto-file', (event: IpcMainEvent, arg: { project: string, file: string }) => {
            Swordfish.goToFile(arg);
        });
        ipcMain.on('paste-text', (event: IpcMainEvent, text: string) => {
            clipboard.writeText(text);
            Swordfish.mainWindow.webContents.paste();
        });
        ipcMain.on('save-translation', (event: IpcMainEvent, arg: any) => {
            Swordfish.saveTranslation(arg);
        });
        ipcMain.on('save-source', (event: IpcMainEvent, arg: any) => {
            Swordfish.saveSource(arg);
        });
        ipcMain.on('fix-segment-tags', (event: IpcMainEvent, arg: any) => {
            Swordfish.fixTags(arg);
        });
        ipcMain.on('open-prompt', (event: IpcMainEvent, arg: any) => {
            Swordfish.openPrompt(arg);
        });
        ipcMain.on('generate-prompt', (event: IpcMainEvent, arg: any) => {
            Swordfish.generatePrompt(arg);
        });
        ipcMain.on('paste-response', () => {
            Swordfish.insertAiResponse();
        });
        ipcMain.on('insert-response', (event: IpcMainEvent, arg: any) => {
            Swordfish.insertResponse(arg);
        });
        ipcMain.on('close-promptDialog', () => {
            if (Swordfish.promptWindow && !Swordfish.promptWindow.isDestroyed()) {
                Swordfish.promptWindow.close();
            }
        });
        ipcMain.on('get-matches', (event: IpcMainEvent, arg: any) => {
            Swordfish.getMatches(arg);
        });
        ipcMain.on('get-terms', (event: IpcMainEvent, arg: any) => {
            Swordfish.getTerms(arg);
        });
        ipcMain.on('get-segment-terms', (event: IpcMainEvent, arg: any) => {
            Swordfish.getSegmentTerms(arg);
        });
        ipcMain.on('get-project-terms', (event: IpcMainEvent, arg: any) => {
            Swordfish.getProjectTerms(arg);
        });
        ipcMain.on('machine-translate', (event: IpcMainEvent, arg: any) => {
            Swordfish.machineTranslate(arg);
        });
        ipcMain.on('assemble-matches', (event: IpcMainEvent, arg: any) => {
            Swordfish.assembleMatches(arg);
        });
        ipcMain.on('assemble-matches-all', (event: IpcMainEvent, arg: any) => {
            Swordfish.assembleMatchesAll(arg);
        });
        ipcMain.on('remove-assembled-matches', (event: IpcMainEvent, arg: any) => {
            Swordfish.removeAssembledMatches(arg);
        });
        ipcMain.on('accept-match', (event: IpcMainEvent, match: Match) => {
            Swordfish.mainWindow.webContents.send('set-target', match);
        });
        ipcMain.on('fix-match', (event: IpcMainEvent, match: Match) => {
            Swordfish.fixMatch(match);
        });
        ipcMain.on('get-mt-matches', () => {
            Swordfish.mainWindow.webContents.send('get-mt-matches');
        });
        ipcMain.on('get-am-matches', () => {
            Swordfish.mainWindow.webContents.send('get-am-matches');
        });
        ipcMain.on('apply-mt-all', (event: IpcMainEvent, arg: any) => {
            Swordfish.applyMachineTranslationsAll(arg);
        });
        ipcMain.on('accept-mt-all', (event: IpcMainEvent, arg: any) => {
            Swordfish.acceptAllMachineTranslations(arg);
        });
        ipcMain.on('search-memory', () => {
            Swordfish.mainWindow.webContents.send('get-tm-matches');
        });
        ipcMain.on('search-memory-all', (event: IpcMainEvent, arg: any) => {
            Swordfish.tmTranslateAll(arg);
        });
        ipcMain.on('show-apply-tm', (event: IpcMainEvent, arg: any) => {
            Swordfish.showApplyTm(arg);
        });
        ipcMain.on('close-apply-tm', () => {
            Swordfish.applyTmWindow.close();
        });
        ipcMain.on('tm-translate', (event: IpcMainEvent, arg: any) => {
            Swordfish.tmTranslate(arg);
        });
        ipcMain.on('get-project-memories', (event: IpcMainEvent, arg: any) => {
            Swordfish.getProjectMemories(arg);
        });
        ipcMain.on('set-project-memory', (event: IpcMainEvent, arg: any) => {
            Swordfish.setProjectMemory(arg);
        });
        ipcMain.on('get-project-glossaries', (event: IpcMainEvent, arg: any) => {
            Swordfish.getProjectGlossaries(arg);
        });
        ipcMain.on('set-project-glossary', (event: IpcMainEvent, arg: any) => {
            Swordfish.setProjectGlossary(arg);
        });
        ipcMain.on('spell-language', (event: IpcMainEvent, arg: any) => {
            Swordfish.setSpellcheckerLanguage(arg);
        });
        ipcMain.on('show-spellchecker-langs', () => {
            Swordfish.showSpellCheckerLangs();
        });
        ipcMain.on('get-spellchecker-langs', (event: IpcMainEvent) => {
            Swordfish.getSpellCheckerLangs(event);
        });
        ipcMain.on('close-spellingLangs', () => {
            Swordfish.spellingLangsWindow.close();
        });
        ipcMain.on('show-sort-segments', (event: IpcMainEvent, arg: any) => {
            Swordfish.showSortSegments(arg);
        });
        ipcMain.on('get-sort-params', (event: IpcMainEvent) => {
            event.sender.send('set-params', Swordfish.sortParams);
        })
        ipcMain.on('sort-options', (event: IpcMainEvent, arg: any) => {
            Swordfish.sortOptions(arg);
        });
        ipcMain.on('show-filter-segments', (event: IpcMainEvent, arg: any) => {
            Swordfish.showFilterSegments(arg);
        });
        ipcMain.on('get-filter-params', (event: IpcMainEvent) => {
            event.sender.send('set-params', Swordfish.filterParams);
        })
        ipcMain.on('filter-options', (event: IpcMainEvent, arg: any) => {
            Swordfish.filterOptions(arg);
        });
        ipcMain.on('export-xliff-review', (event: IpcMainEvent, arg: { projectId: string, description: string }) => {
            Swordfish.exportXLIFF(arg);
        });
        ipcMain.on('export-xliff', (event: IpcMainEvent, arg: { projectId: string, description: string }) => {
            Swordfish.exportProject(arg);
        });
        ipcMain.on('export-tmx-file', (event: IpcMainEvent, arg: { projectId: string, description: string }) => {
            Swordfish.exportProjectTMX(arg);
        });
        ipcMain.on('export-tm-matches', (event: IpcMainEvent, arg: { projectId: string, description: string }) => {
            Swordfish.exportMatches(arg);
        });
        ipcMain.on('export-terms', (event: IpcMainEvent, arg: { projectId: string, description: string }) => {
            Swordfish.exportTerms(arg);
        });
        ipcMain.on('import-xliff-review', (event: IpcMainEvent, arg: any) => {
            Swordfish.importReviewedXLIFF();
        });
        ipcMain.on('import-xliff', () => {
            Swordfish.showImportXliff();
        });
        ipcMain.on('close-importXliff', () => {
            Swordfish.importXliffWindow.close();
        });
        ipcMain.on('browse-xliff-import', (event: IpcMainEvent) => {
            Swordfish.browseImportXLIFF(event);
        });
        ipcMain.on('import-xliff-file', (event: IpcMainEvent, arg: any) => {
            Swordfish.importXLIFF(arg);
        });
        ipcMain.on('files-dropped', (event: IpcMainEvent, files: string[]) => {
            Swordfish.filesDropped(files);
        });
        ipcMain.on('remove-translations', (event: IpcMainEvent, arg: any) => {
            Swordfish.removeTranslations(arg);
        });
        ipcMain.on('remove-all-matches', (event: IpcMainEvent, arg: any) => {
            Swordfish.removeMatches(arg);
        });
        ipcMain.on('remove-machine-translations', (event: IpcMainEvent, arg: any) => {
            Swordfish.removeMachineTranslations(arg);
        });
        ipcMain.on('get-ai-engines', (event: IpcMainEvent) => {
            Swordfish.getAiEngines(event);
        });
        ipcMain.on('ai-chat', (event: IpcMainEvent, arg: any) => {
            Swordfish.aiChat(event, arg);
        });
        // Training mode IPC handlers
        ipcMain.on('show-import-csv', () => {
            Swordfish.showImportCsv();
        });
        ipcMain.on('close-importCsv', () => {
            Swordfish.importCsvWindow.close();
        });
        ipcMain.on('browse-csv-import', (event: IpcMainEvent) => {
            Swordfish.browseCsvImport(event);
        });
        ipcMain.on('parse-csv-preview', (event: IpcMainEvent, arg: any) => {
            Swordfish.parseCsvPreview(event, arg);
        });
        ipcMain.on('import-csv', (event: IpcMainEvent, arg: any) => {
            Swordfish.importCsv(arg);
        });
        ipcMain.on('show-clipboard-import', () => {
            Swordfish.showClipboardImport();
        });
        ipcMain.on('close-clipboard-import', () => {
            if (Swordfish.clipboardImportWindow && !Swordfish.clipboardImportWindow.isDestroyed()) {
                Swordfish.clipboardImportWindow.close();
            }
        });
        ipcMain.on('parse-clipboard-preview', (event: IpcMainEvent, arg: any) => {
            Swordfish.parseClipboardPreview(event, arg);
        });
        ipcMain.on('import-clipboard', (event: IpcMainEvent, arg: any) => {
            Swordfish.importClipboard(arg);
        });
        ipcMain.on('get-training-exercises', (event: IpcMainEvent) => {
            Swordfish.getTrainingExercises(event);
        });
        ipcMain.on('open-training', (event: IpcMainEvent, arg: any) => {
            Swordfish.openTraining(arg);
        });
        ipcMain.on('delete-training', (event: IpcMainEvent, arg: any) => {
            Swordfish.deleteTraining(arg);
        });
        ipcMain.on('score-translation', (event: IpcMainEvent, arg: any) => {
            Swordfish.scoreTranslation(event, arg);
        });
        ipcMain.on('get-training-history', (event: IpcMainEvent, arg: any) => {
            Swordfish.getTrainingHistory(event, arg);
        });
        ipcMain.on('export-training-report', (event: IpcMainEvent) => {
            Swordfish.exportTrainingReport();
        });
        ipcMain.on('save-training-to-tm', (event: IpcMainEvent, arg: any) => {
            Swordfish.saveTrainingToTm(event, arg);
        });
        ipcMain.on('show-training-history', (event: IpcMainEvent, arg: any) => {
            Swordfish.showTrainingHistory(arg);
        });
        ipcMain.on('show-web-import', () => {
            Swordfish.showWebImport();
        });
        ipcMain.on('close-web-import', () => {
            Swordfish.webImportWindow.close();
        });
        ipcMain.on('preview-web-import', (event: IpcMainEvent, arg: any) => {
            Swordfish.previewWebImport(event, arg);
        });
        ipcMain.on('import-web', (event: IpcMainEvent, arg: any) => {
            Swordfish.importWeb(arg);
        });
        ipcMain.on('save-reflection', (event: IpcMainEvent, arg: any) => {
            Swordfish.saveReflection(arg);
        });
        ipcMain.on('show-score-report', (event: IpcMainEvent, arg: any) => {
            Swordfish.showScoreReport(arg);
        });
        ipcMain.on('close-score-report', () => {
            if (Swordfish.scoreReportWindow && !Swordfish.scoreReportWindow.isDestroyed()) {
                Swordfish.scoreReportWindow.close();
            }
        });
        ipcMain.on('score-report-ready', (event: IpcMainEvent) => {
            Swordfish.scoreReportReady(event);
        });
        ipcMain.on('load-score-history', (event: IpcMainEvent, arg: any) => {
            Swordfish.loadScoreHistoryForReport(arg);
        });
        ipcMain.on('export-score-report-md', (event: IpcMainEvent, arg: any) => {
            Swordfish.exportScoreReportMd(arg);
        });
        ipcMain.on('export-score-report-pdf', () => {
            Swordfish.exportScoreReportPdf();
        });
        ipcMain.on('unconfirm-translations', (event: IpcMainEvent, arg: any) => {
            Swordfish.unconfirmTranslations(arg);
        });
        ipcMain.on('pseudo-translate', (event: IpcMainEvent, arg: any) => {
            Swordfish.pseudoTranslate(arg);
        });
        ipcMain.on('copy-sources', (event: IpcMainEvent, arg: any) => {
            Swordfish.copyAllSources(arg);
        });
        ipcMain.on('confirm-translations', (event: IpcMainEvent, arg: any) => {
            Swordfish.confirmAllTranslations(arg);
        });
        ipcMain.on('accept-100-matches', (event: IpcMainEvent, arg: any) => {
            Swordfish.acceptAll100Matches(arg);
        });
        ipcMain.on('generate-statistics', (event: IpcMainEvent, arg: any) => {
            Swordfish.generateStatistics(arg);
        });
        ipcMain.on('show-tag-window', () => {
            Swordfish.showTagsWindow();
        });
        ipcMain.on('show-go-to-window', () => {
            Swordfish.showGoToWindow();
        });
        ipcMain.on('forward-tag', (event: IpcMainEvent, arg: any) => {
            Swordfish.mainWindow.webContents.send('insert-tag', arg);
            Swordfish.mainWindow.focus();
        });
        ipcMain.on('show-replaceText', (event: IpcMainEvent, arg: any) => {
            Swordfish.showReplaceText(arg);
        });
        ipcMain.on('search-replace', (event: IpcMainEvent, arg: any) => {
            Swordfish.replaceText(arg);
        });
        ipcMain.on('request-apply-terminology', () => {
            Swordfish.mainWindow.webContents.send('apply-terminology');
        });
        ipcMain.on('lock-segment', (event: IpcMainEvent, arg: any) => {
            Swordfish.lockSegment(arg);
        });
        ipcMain.on('lock-duplicates', (event: IpcMainEvent, arg: any) => {
            Swordfish.lockDuplicates(arg);
        });
        ipcMain.on('unlock-all', (event: IpcMainEvent, projectId: string) => {
            Swordfish.unlockAll(projectId);
        });
        ipcMain.on('get-zoom', () => {
            Swordfish.mainWindow.webContents.send('set-zoom', { zoom: Swordfish.currentPreferences.zoomFactor });
        });
        ipcMain.on('analyze-spaces', (event: IpcMainEvent, projectId: string) => {
            Swordfish.analyzeSpaces(projectId);
        });
        ipcMain.on('analyze-tags', (event: IpcMainEvent, projectId: string) => {
            Swordfish.analyzeTags(projectId);
        });
        ipcMain.on('export-project-html', (event: IpcMainEvent, projectId: string) => {
            Swordfish.exportHTML(projectId);
        });
        ipcMain.on('show-change-case', () => {
            Swordfish.showChangeCase();
        });
        ipcMain.on('close-change-case', () => {
            Swordfish.changeCaseWindow.close();
        });
        ipcMain.on('change-case-to', (event: IpcMainEvent, arg: any) => {
            Swordfish.changeCaseTo(arg);
        });
        ipcMain.on('split-at', (event: IpcMainEvent, arg: any) => {
            Swordfish.splitSegment(arg);
        });
        ipcMain.on('merge-at', (event: IpcMainEvent, arg: any) => {
            Swordfish.mergeSegment(arg);
        });
        ipcMain.on('show-notes', (event: IpcMainEvent, segment: FullId) => {
            Swordfish.showNotes(segment);
        });
        ipcMain.on('close-notes', () => {
            if (Swordfish.notesWindow && !Swordfish.notesWindow.isDestroyed()) {
                Swordfish.notesWindow.close();
            }
        });
        ipcMain.on('show-context', (event: IpcMainEvent, segment: FullId) => {
            Swordfish.showContext(segment);
        });
        ipcMain.on('close-context', () => {
            if (Swordfish.contextWindow && !Swordfish.contextWindow.isDestroyed()) {
                Swordfish.contextWindow.close();
                Swordfish.mainWindow.webContents.send('context-closed');
            }
        });
        ipcMain.on('show-add-note', (event: IpcMainEvent, segmentId: FullId) => {
            Swordfish.showAddNote(segmentId);
        });
        ipcMain.on('show-edit-note', (event: IpcMainEvent, arg: { segmentId: FullId, noteId: string, noteText: string }) => {
            Swordfish.showEditNote(arg.segmentId, arg.noteId, arg.noteText);
        });
        ipcMain.on('close-add-note', () => {
            Swordfish.addNoteWindow.close();
        });
        ipcMain.on('add-note', (event: IpcMainEvent, arg: { segment: FullId, note: string }) => {
            Swordfish.addNote(arg.segment, arg.note);
        });
        ipcMain.on('update-note', (event: IpcMainEvent, arg: { segment: FullId, note: string, noteId: string }) => {
            Swordfish.updateNote(arg.segment, arg.note, arg.noteId);
        });
        ipcMain.on('remove-note', (event: IpcMainEvent, arg: { segmentId: FullId, noteId: string }) => {
            Swordfish.removeNote(arg.segmentId, arg.noteId);
        });
        ipcMain.on('show-file-info', (event: IpcMainEvent, fileInfo: any) => {
            Swordfish.showFileInfo(fileInfo);
        });
        ipcMain.on('close-file-info', () => {
            Swordfish.fileInfoWindow?.close();
        });
        ipcMain.on('show-metadata', (event: IpcMainEvent, metaId: MetaId) => {
            Swordfish.showReviewComments(metaId);
        });
        ipcMain.on('get-metadata', (event: IpcMainEvent, metaId: MetaId) => {
            Swordfish.getMetadata(metaId);
        });
        ipcMain.on('close-review-comments', () => {
            if (Swordfish.reviewCommentsWindow && !Swordfish.reviewCommentsWindow.isDestroyed()) {
                Swordfish.reviewCommentsWindow.close();
            }
        });
        ipcMain.on('show-add-comment', (event: IpcMainEvent, metaId: MetaId) => {
            Swordfish.showAddComment(metaId);
        });
        ipcMain.on('get-content-model', (event: IpcMainEvent, from: string) => {
            Swordfish.getContentModel(from);
        });
        ipcMain.on('save-comment', (event: IpcMainEvent, arg: { metaId: MetaId, comment: ReviewComment }) => {
            Swordfish.saveComment(arg.metaId, arg.comment);
        });
        ipcMain.on('get-username', (event: IpcMainEvent) => {
            event.sender.send('set-username', Swordfish.currentPreferences.userName);
        });
        ipcMain.on('close-add-comment', () => {
            Swordfish.addCommentWindow.close();
        });
        ipcMain.on('show-edit-comment', (event: IpcMainEvent, arg: { metaId: MetaId, comment: ReviewComment }) => {
            Swordfish.showEditComment(arg.metaId, arg.comment);
        });
        ipcMain.on('show-add-reply', (event: IpcMainEvent, arg: { metaId: MetaId, commentId: string }) => {
            Swordfish.showAddReply(arg.metaId, arg.commentId);
        });
        ipcMain.on('show-edit-reply', (event: IpcMainEvent, arg: { metaId: MetaId, reply: CommentReply }) => {
            Swordfish.showEditReply(arg.metaId, arg.reply);
        });
        ipcMain.on('close-add-reply', () => {
            Swordfish.addReplyWindow.close();
        });
        ipcMain.on('save-reply', (event: IpcMainEvent, arg: { metaId: MetaId, reply: CommentReply }) => {
            Swordfish.saveReply(arg.metaId, arg.reply);
        });
        ipcMain.on('save-metadata', (event: IpcMainEvent, arg: { metaId: MetaId, metadata: MetaData }) => {
            Swordfish.saveMetadata(arg.metaId, arg.metadata);
        });
        ipcMain.on('get-versions', (event: IpcMainEvent) => {
            event.sender.send('set-versions', { current: app.getVersion(), latest: Swordfish.latestVersion });
        });
        ipcMain.on('close-updates', () => {
            Swordfish.updatesWindow.close();
        });
        ipcMain.on('release-history', () => {
            Swordfish.showReleaseHistory();
        });
        ipcMain.on('download-latest', () => {
            Swordfish.downloadLatest();
        });
        ipcMain.on('close-XSLTransformation', () => {
            Swordfish.XSLTransformationWindow.close();
        });
        ipcMain.on('XSLTransform', (event: IpcMainEvent, arg: { xmlFile: string, xslFile: string, outputFile: string, openResult: boolean }) => {
            console.log(JSON.stringify(arg));
            Swordfish.XSLTransformation(arg);
        });
        ipcMain.on('close-getting-started', () => {
            Swordfish.gettingStartedWindow.close();
        });
        ipcMain.on('show-help', () => {
            Swordfish.showHelp();
        });
        ipcMain.on('show-support', () => {
            Swordfish.showSupportGroup();
        });
        ipcMain.on('show-getting-started', async (event: IpcMainEvent, arg: any) => {
            Swordfish.currentPreferences.showGuide = arg.showGuide;
            await Swordfish.savePreferences(Swordfish.currentPreferences);
        });
        ipcMain.on('get-show guide', (event: IpcMainEvent) => {
            event.sender.send('set-show guide', { showGuide: Swordfish.currentPreferences.showGuide });
        });
        ipcMain.on('get-xmlFilters', (event: IpcMainEvent) => {
            Swordfish.getXMLFilters(event);
        });
        ipcMain.on('edit-filterConfig', (event: IpcMainEvent, arg: any) => {
            Swordfish.editXmlFilter(arg);
        });
        ipcMain.on('close-filterConfig', () => {
            Swordfish.editXmlFilterWindow.close();
        });
        ipcMain.on('get-filterData', (event: IpcMainEvent) => {
            Swordfish.getXmlFilterData(event);
        });
        ipcMain.on('add-element', (event: IpcMainEvent, arg: any) => {
            Swordfish.addElement(arg);
        });
        ipcMain.on('close-elementConfig', () => {
            Swordfish.configElementWindow.close();
        });
        ipcMain.on('get-elementConfig', (event: IpcMainEvent) => {
            Swordfish.getElementConfig(event);
        });
        ipcMain.on('save-elementConfig', (event: IpcMainEvent, arg: any) => {
            Swordfish.saveElementConfig(arg);
        });
        ipcMain.on('remove-elements', (event: IpcMainEvent, arg: any) => {
            Swordfish.removeElements(arg);
        });
        ipcMain.on('import-xmlFilter', (event: IpcMainEvent) => {
            Swordfish.importXmlFilter(event);
        });
        ipcMain.on('remove-xmlFilters', (event: IpcMainEvent, arg: any) => {
            Swordfish.removeXmlFilters(event, arg);
        });
        ipcMain.on('export-xmlFilters', (event: IpcMainEvent, arg: any) => {
            Swordfish.exportXmlFilters(arg);
        });
        ipcMain.on('show-addXmlConfiguration', (event: IpcMainEvent) => {
            Swordfish.showAddXmlConfiguration(event);
        });
        ipcMain.on('close-addXmlConfiguration', () => {
            Swordfish.addXmlConfigurationWindow.close();
        });
        ipcMain.on('add-xmlConfigurationFile', (event: IpcMainEvent, arg: any) => {
            Swordfish.addXmlConfiguration(event, arg);
        });
        ipcMain.on('close-tagsAnalysis', () => {
            Swordfish.tagsAnalysisWindow.close();
        });
        ipcMain.on('get-tagsErrors', (event: IpcMainEvent) => {
            Swordfish.getTagErrors(event);
        });
        ipcMain.on('close-spaceAnalysis', () => {
            Swordfish.spaceAnalysisWindow.close();
        });
        ipcMain.on('get-spaceErrors', (event: IpcMainEvent) => {
            Swordfish.getSpaceErrors(event);
        });
        ipcMain.on('fix-spaceErrors', (event: IpcMainEvent) => {
            Swordfish.mainWindow.webContents.send('remember-segment');
            Swordfish.fixSpaceErrors(event);
        });
    } // end constructor

    static deleteAllTags(background: string, foreground: string): void {
        let tagsFolder: string = join(app.getPath('userData'), 'images');
        if (existsSync(tagsFolder)) {
            rmSync(tagsFolder, { recursive: true, force: true });
        }
        mkdirSync(tagsFolder);
        let colors: any = { background: background, foreground: foreground };
        writeFileSync(join(app.getPath('userData'), 'images', 'tagColors.json'), JSON.stringify(colors, null, 2));
        if (app.isReady()) {
            Swordfish.mainWindow.webContents.send('tags-deleted');
        }
    }

    static createWindow(): void {
        if (Swordfish.currentDefaults === undefined) {
            let size: Size = screen.getPrimaryDisplay().workAreaSize;
            Swordfish.currentDefaults = { width: Math.round(size.width * 0.95), height: Math.round(size.height * 0.95), x: 0, y: 0 };
        }
        this.mainWindow = new BrowserWindow({
            title: app.name,
            width: this.currentDefaults.width,
            height: this.currentDefaults.height,
            minHeight: 400,
            minWidth: 600,
            x: this.currentDefaults.x,
            y: this.currentDefaults.y,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false,
            icon: this.iconPath
        });
        this.createMenu();
    }

    static createMenu(): void {
        const iconFolder: string = nativeTheme.shouldUseHighContrastColors ? 'dark' : (nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

        this.mainWindow.webContents.on('context-menu', (event: Electron.Event, params: any) => {
            const menu: Menu = new Menu();
            // Add each spelling suggestion
            for (const suggestion of params.dictionarySuggestions) {
                menu.append(new MenuItem({
                    label: suggestion,
                    click: () => { this.mainWindow.webContents.replaceMisspelling(suggestion); }
                }));
            }
            // Allow users to add the misspelled word to the dictionary
            if (params.misspelledWord) {
                menu.append(new MenuItem({ type: 'separator' }));
                menu.append(
                    new MenuItem({
                        label: 'Add to dictionary',
                        click: () => { this.mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord); }
                    })
                );
            }
            menu.popup();
        });
        let fileMenu: Menu = Menu.buildFromTemplate([
            { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => { Swordfish.addFile(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'addFile.png') }
        ]);
        let tagsMenu: Menu = Menu.buildFromTemplate([
            { label: 'Insert Tag "1"', accelerator: 'CmdOrCtrl+1', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', { tag: 1 }); } },
            { label: 'Insert Tag "2"', accelerator: 'CmdOrCtrl+2', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', { tag: 2 }); } },
            { label: 'Insert Tag "3"', accelerator: 'CmdOrCtrl+3', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', { tag: 3 }); } },
            { label: 'Insert Tag "4"', accelerator: 'CmdOrCtrl+4', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', { tag: 4 }); } },
            { label: 'Insert Tag "5"', accelerator: 'CmdOrCtrl+5', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', { tag: 5 }); } },
            { label: 'Insert Tag "6"', accelerator: 'CmdOrCtrl+6', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', { tag: 6 }); } },
            { label: 'Insert Tag "7"', accelerator: 'CmdOrCtrl+7', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', { tag: 7 }); } },
            { label: 'Insert Tag "8"', accelerator: 'CmdOrCtrl+8', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', { tag: 8 }); } },
            { label: 'Insert Tag "9"', accelerator: 'CmdOrCtrl+9', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', { tag: 9 }); } },
            { label: 'Insert Tag "10"', accelerator: 'CmdOrCtrl+0', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', { tag: 10 }); } }
        ]);
        let editMenu: Menu = Menu.buildFromTemplate([
            { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => { Swordfish.undo() } },
            new MenuItem({ type: 'separator' }),
            { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => { Swordfish.cut() } },
            { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => { Swordfish.copy(); } },
            { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => { Swordfish.paste() } },
            { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => { Swordfish.selectAll(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Edit Previous Segment', accelerator: 'PageUp', click: () => { Swordfish.mainWindow.webContents.send('previous-segment'); } },
            { label: 'Edit Next Segment', accelerator: 'PageDown', click: () => { Swordfish.mainWindow.webContents.send('next-segment'); } },
            { label: 'Go To Segment...', accelerator: 'CmdOrCtrl+G', click: () => { Swordfish.mainWindow.webContents.send('go-to'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'goTo.png') },
            { label: 'Go To Next Segment With Same Source ', accelerator: 'CmdOrCtrl+Shift+G', click: () => { Swordfish.mainWindow.webContents.send('next-same-source'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'goToSource.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Edit Source Text', accelerator: 'Alt+F2', click: () => { Swordfish.mainWindow.webContents.send('edit-source'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Edit Next Untranslated Segment', accelerator: 'CmdOrCtrl+U', click: () => { Swordfish.mainWindow.webContents.send('next-untranslated'); } },
            { label: 'Edit Next Unconfirmed Segment', accelerator: 'CmdOrCtrl+Shift+U', click: () => { Swordfish.mainWindow.webContents.send('next-unconfirmed'); } },
            { label: 'Edit Next Unconfirmed/Untranslated Segment', accelerator: 'CmdOrCtrl+Alt+U', click: () => { Swordfish.mainWindow.webContents.send('next-needs-action'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Save Segment Changes', accelerator: 'Alt+Enter', click: () => { Swordfish.mainWindow.webContents.send('save-edit', { confirm: false, next: 'none' }); }, icon: join(app.getAppPath(), 'images', iconFolder, 'saveChanges.png') },
            { label: 'Discard Segment Changes', accelerator: 'Esc', click: () => { Swordfish.mainWindow.webContents.send('cancel-edit'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'cancelEdit.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Change Case', accelerator: 'CmdOrCtrl+Alt+C', click: () => { Swordfish.mainWindow.webContents.send('change-case'); } },
            { label: 'Replace Text', accelerator: 'CmdOrCtrl+Alt+F', click: () => { Swordfish.mainWindow.webContents.send('replace-text'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'replaceText.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Insert Tag', accelerator: 'CmdOrCtrl+T', click: () => { Swordfish.mainWindow.webContents.send('insert-tag', {}); } },
            new MenuItem({ label: 'Insert Tags...', submenu: tagsMenu }),
            { label: 'Insert Next Tag', accelerator: 'CmdOrCtrl+Shift+T', click: () => { Swordfish.mainWindow.webContents.send('insert-next-tag'); } },
            { label: 'Insert Remaining Tags', accelerator: 'CmdOrCtrl+Alt+T', click: () => { Swordfish.mainWindow.webContents.send('insert-remaining-tags'); } },
            { label: 'Remove All Tags', accelerator: 'CmdOrCtrl+Alt+Shift+R', click: () => { Swordfish.mainWindow.webContents.send('remove-tags'); } },
        ]);
        let nextMT: string = 'Alt+Right';
        let previousMT: string = 'Alt+Left';
        if (process.platform === 'darwin') {
            nextMT = 'Ctrl+Alt+Right';
            previousMT = 'Ctrl+Alt+Left';
        }
        let viewMenu: Menu = Menu.buildFromTemplate([
            { label: 'Projects', accelerator: 'F6', click: () => { Swordfish.viewProjects(); } },
            { label: 'Memories', accelerator: 'F7', click: () => { Swordfish.viewMemories(); } },
            { label: 'Glossaries', accelerator: 'F8', click: () => { Swordfish.viewGlossaries(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Sort Segments', accelerator: 'F3', click: () => { Swordfish.mainWindow.webContents.send('sort-segments'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'sort.png') },
            { label: 'Filter Segments', accelerator: 'CmdOrCtrl+F', click: () => { Swordfish.mainWindow.webContents.send('filter-segments'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'filter.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Expand/Collapse Files Panel', accelerator: 'CmdOrCtrl+Shift+F', click: () => { Swordfish.toggleFilesPanel(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'expand.png') },
            { label: 'Expand/Collapse Right Panels', accelerator: 'CmdOrCtrl+Shift+J', click: () => { Swordfish.toggleRightPanels(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'collapse.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Show/Hide Notes', accelerator: 'F2', click: () => { Swordfish.toggleNotes(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'notes.png') },
            { label: 'Show/Hide Review Comments', accelerator: 'Alt+F6', click: () => { Swordfish.toggleReviewComments(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'SVG_EDIT_COMMENT.png') },
            { label: 'Show/Hide Context', accelerator: 'Alt+F3', click: () => { Swordfish.toggleContext(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'contextInfo.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Close Selected Tab', accelerator: 'CmdOrCtrl+W', click: () => { Swordfish.closeSelectedTab(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'First Page', accelerator: 'CmdOrCtrl+Shift+PageUp', click: () => { Swordfish.mainWindow.webContents.send('first-page'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'firstPage.png') },
            { label: 'Previous Page', accelerator: 'CmdOrCtrl+PageUp', click: () => { Swordfish.mainWindow.webContents.send('previous-page'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'previousPage.png') },
            { label: 'Next Page', accelerator: 'CmdOrCtrl+PageDown', click: () => { Swordfish.mainWindow.webContents.send('next-page'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'nextPage.png') },
            { label: 'Last Page', accelerator: 'CmdOrCtrl+Shift+PageDown', click: () => { Swordfish.mainWindow.webContents.send('last-page'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'lastPage.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Next Translation Memory Match', accelerator: 'CmdOrCtrl+Alt+Right', click: () => { Swordfish.mainWindow.webContents.send('next-match'); } },
            { label: 'Previous Translation Memory Match', accelerator: 'CmdOrCtrl+Alt+Left', click: () => { Swordfish.mainWindow.webContents.send('previous-match'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Next Machine Translation', accelerator: nextMT, click: () => { Swordfish.mainWindow.webContents.send('next-mt'); } },
            { label: 'Previous Machine Translation', accelerator: previousMT, click: () => { Swordfish.mainWindow.webContents.send('previous-mt'); } },
            new MenuItem({ type: 'separator' }),
            new MenuItem({ label: 'Toggle Full Screen', role: 'togglefullscreen' })
        ]);
        if (!app.isPackaged) {
            viewMenu.append(new MenuItem({ label: 'Open Development Tools', accelerator: 'F12', click: () => { BrowserWindow.getFocusedWindow()?.webContents.openDevTools(); } }));
        }
        let projectsMenu: Menu = Menu.buildFromTemplate([
            { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => { Swordfish.showAddProject(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'add.png') },
            { label: 'Edit Project', click: () => { Swordfish.editProject(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'edit.png') },
            { label: 'Translate Projects', click: () => { Swordfish.translateProjects(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'translate.png') },
            { label: 'Export Translations/Reviews', accelerator: 'CmdOrCtrl+Alt+S', click: () => { Swordfish.mainWindow.webContents.send('export-translations'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'exportTranslations.png') },
            { label: 'Export Translations as TMX File', click: () => { Swordfish.mainWindow.webContents.send('export-translations-tmx'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Export XLIFF File for Review', click: () => { Swordfish.mainWindow.webContents.send('export-xliff-review'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'exportXLIFF.png') },
            { label: 'Import Reviewed XLIFF File', click: () => { Swordfish.importReviewedXLIFF() }, icon: join(app.getAppPath(), 'images', iconFolder, 'importXLIFF.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Export All Memory Matches as TMX', click: () => { Swordfish.mainWindow.webContents.send('export-matches'); } },
            { label: 'Export All Recognized Terms as TBX', click: () => { Swordfish.mainWindow.webContents.send('export-terminology-all'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Remove Projects', click: () => { Swordfish.mainWindow.webContents.send('remove-projects'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'remove.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Project Statistics', click: () => { Swordfish.mainWindow.webContents.send('request-statistics'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'statistics.png') },
            { label: 'Export HTML', accelerator: 'F5', click: () => { Swordfish.mainWindow.webContents.send('export-html'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'exportHTML.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Import Project', click: () => { Swordfish.showImportXliff(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'import.png') },
            { label: 'Export Project', click: () => { Swordfish.mainWindow.webContents.send('export-project'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'export.png') }
        ]);
        let memoriesMenu: Menu = Menu.buildFromTemplate([
            { label: 'Add Memory', click: () => { Swordfish.showAddMemory(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'add.png') },
            { label: 'Remove Memory', click: () => { Swordfish.mainWindow.webContents.send('remove-memory'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'remove.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Add RemoteTM Memory', click: () => { Swordfish.showServerSettings('memory'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'remoteTM.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Import TMX File', click: () => { Swordfish.mainWindow.webContents.send('import-tmx'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'import.png') },
            { label: 'Export Memory as TMX File', click: () => { Swordfish.mainWindow.webContents.send('export-tmx'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'export.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Import SDLTM File', click: () => { Swordfish.mainWindow.webContents.send('import-sdltm'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'importSDLTM.png') },
        ]);
        let glossariesMenu: Menu = Menu.buildFromTemplate([
            { label: 'Add Glossary', click: () => { Swordfish.showAddGlossary(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'add.png') },
            { label: 'Remove Glossary', click: () => { Swordfish.removeGlossary(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'remove.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Add RemoteTM Glossary', click: () => { Swordfish.showServerSettings('glossary'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'remoteTM.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Import Glossary', click: () => { Swordfish.mainWindow.webContents.send('import-glossary'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'import.png') },
            { label: 'Export Glossary', click: () => { Swordfish.mainWindow.webContents.send('export-glossary'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'export.png') }
        ]);
        let aiMenu: Menu = Menu.buildFromTemplate([
            { label: 'Fix Tags with AI', accelerator: 'CmdOrCtrl+Shift+Alt+T', click: () => { Swordfish.mainWindow.webContents.send('fix-tags'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'fixTags.png') },
            { label: 'Fix TM Match with AI', accelerator: 'CmdOrCtrl+Shift+M', click: () => { Swordfish.mainWindow.webContents.send('fix-selected-match'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'fixMatch.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Open AI Prompt Dialog', accelerator: 'CmdOrCtrl+Shift+P', click: () => { Swordfish.mainWindow.webContents.send('open-ai-prompt'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'prompt.png') },
            { label: 'Copy AI Prompt to Clipboard', accelerator: 'CmdOrCtrl+Shift+C', click: () => { Swordfish.mainWindow.webContents.send('copy-ai-prompt'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Insert AI Response in Segment', accelerator: 'CmdOrCtrl+Shift+R', click: () => { Swordfish.insertAiResponse(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'insertAIResponse.png') }
        ]);
        let helpMenu: Menu = Menu.buildFromTemplate([
            { label: 'Swordfish User Guide', accelerator: 'F1', click: () => { this.showHelp(); } },
            { label: 'Getting Started Guide', click: () => { Swordfish.showGettingStarted(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Check for Updates...', click: () => { this.checkUpdates(false); } },
            { label: 'View Licenses', click: () => { this.showLicenses({ from: 'menu' }); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Release History', click: () => { Swordfish.showReleaseHistory(); } },
            { label: 'Support Group', click: () => { this.showSupportGroup(); } }
        ]);
        let nextUntranslatedKey: string = 'Alt+Down';
        let nextUnconfirmedKey: string = 'Alt+Shift+Down';
        if (process.platform === 'darwin') {
            nextUntranslatedKey = 'Ctrl+Alt+Down';
            nextUnconfirmedKey = 'Ctrl+Shift+Down';
        }
        let insrtTermsMenu: Menu = Menu.buildFromTemplate([
            { label: 'Insert  Term "1"', accelerator: 'CmdOrCtrl+Alt+1', click: () => { Swordfish.mainWindow.webContents.send('insert-tem', { term: 1 }); } },
            { label: 'Insert  Term "2"', accelerator: 'CmdOrCtrl+Alt+2', click: () => { Swordfish.mainWindow.webContents.send('insert-tem', { term: 2 }); } },
            { label: 'Insert  Term "3"', accelerator: 'CmdOrCtrl+Alt+3', click: () => { Swordfish.mainWindow.webContents.send('insert-tem', { term: 3 }); } },
            { label: 'Insert  Term "4"', accelerator: 'CmdOrCtrl+Alt+4', click: () => { Swordfish.mainWindow.webContents.send('insert-tem', { term: 4 }); } },
            { label: 'Insert  Term "5"', accelerator: 'CmdOrCtrl+Alt+5', click: () => { Swordfish.mainWindow.webContents.send('insert-tem', { term: 5 }); } },
            { label: 'Insert  Term "6"', accelerator: 'CmdOrCtrl+Alt+6', click: () => { Swordfish.mainWindow.webContents.send('insert-tem', { term: 6 }); } },
            { label: 'Insert  Term "7"', accelerator: 'CmdOrCtrl+Alt+7', click: () => { Swordfish.mainWindow.webContents.send('insert-tem', { term: 7 }); } },
            { label: 'Insert  Term "8"', accelerator: 'CmdOrCtrl+Alt+8', click: () => { Swordfish.mainWindow.webContents.send('insert-tem', { term: 8 }); } },
            { label: 'Insert  Term "9"', accelerator: 'CmdOrCtrl+Alt+9', click: () => { Swordfish.mainWindow.webContents.send('insert-tem', { term: 9 }); } },
            { label: 'Insert  Term "10"', accelerator: 'CmdOrCtrl+Alt+0', click: () => { Swordfish.mainWindow.webContents.send('insert-tem', { term: 10 }); } }
        ]);
        let tasksMenu: Menu = Menu.buildFromTemplate([
            { label: 'Confirm Translation', accelerator: 'CmdOrCtrl+E', click: () => { Swordfish.mainWindow.webContents.send('save-edit', { confirm: true, next: 'none' }); }, icon: join(app.getAppPath(), 'images', iconFolder, 'SVG_FINAL.png') },
            { label: 'Unconfirm Translation', accelerator: 'CmdOrCtrl+Shift+E', click: () => { Swordfish.mainWindow.webContents.send('save-edit', { confirm: false, next: 'none', unconfirm: true }); } },
            { label: 'Confirm and go to Next Untranslated', accelerator: nextUntranslatedKey, click: () => { Swordfish.mainWindow.webContents.send('save-edit', { confirm: true, next: 'untranslated' }); }, icon: join(app.getAppPath(), 'images', iconFolder, 'SVG_UNTRANSLATED.png') },
            { label: 'Confirm and go to Next Unconfirmed', accelerator: nextUnconfirmedKey, click: () => { Swordfish.mainWindow.webContents.send('save-edit', { confirm: true, next: 'unconfirmed' }); }, icon: join(app.getAppPath(), 'images', iconFolder, 'SVG_TRANSLATED.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Confirm All Translations', click: () => { Swordfish.mainWindow.webContents.send('confirm-all'); } },
            { label: 'Unconfirm All Translations', click: () => { Swordfish.mainWindow.webContents.send('unconfirm-all'); } },
            { label: 'Remove All Translations', click: () => { Swordfish.mainWindow.webContents.send('remove-all'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Concordance Search', accelerator: 'CmdOrCtrl+Y', click: () => { Swordfish.mainWindow.webContents.send('concordance-requested'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'concordance.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Lock/Unlock Segment', accelerator: 'F4', click: () => { Swordfish.mainWindow.webContents.send('toggle-lock'); } },
            { label: 'Lock Repeated Segments', click: () => { Swordfish.mainWindow.webContents.send('lock-repeated'); } },
            { label: 'Unlock All Segments', click: () => { Swordfish.mainWindow.webContents.send('unlock-segments'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Split Segment', accelerator: 'CmdOrCtrl+H', click: () => { Swordfish.mainWindow.webContents.send('split-segment'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'split.png') },
            { label: 'Merge With Next Segment', accelerator: 'CmdOrCtrl+J', click: () => { Swordfish.mainWindow.webContents.send('merge-next'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'merge.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Copy Source to Target', accelerator: 'CmdOrCtrl+P', click: () => { Swordfish.mainWindow.webContents.send('copy-source'); } },
            { label: 'Copy Sources to All Empty Targets', accelerator: 'CmdOrCtrl+Shift+P', click: () => { Swordfish.mainWindow.webContents.send('copy-all-sources'); } },
            { label: 'Pseudo-translate Untranslated Segments', click: () => { Swordfish.mainWindow.webContents.send('pseudo-translate'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'XSL Transformation', click: () => { Swordfish.showXSLTransformation(); } }
        ]);
        let termsMenu: Menu = Menu.buildFromTemplate([
            { label: 'Get Glossary Terms', accelerator: 'CmdOrCtrl+K', click: () => { Swordfish.mainWindow.webContents.send('apply-terminology'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'getTerms.png') },
            { label: 'Get Terms for All Segments', click: () => { Swordfish.mainWindow.webContents.send('apply-terminology-all'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'requestTerms.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Search Term in Glossary', accelerator: 'CmdOrCtrl+D', click: () => { Swordfish.mainWindow.webContents.send('term-search-requested'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'termSearch.png') },
            { label: 'Add Term to Glossary', accelerator: 'CmdOrCtrl+B', click: () => { Swordfish.mainWindow.webContents.send('add-term-requested'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'addTerm.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Search on IATE', accelerator: 'CmdOrCtrl+Alt+I', click: () => { Swordfish.showIatePlugin(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'IATE.png') },
            new MenuItem({ type: 'separator' }),
            { label: 'Insert Selected Term', accelerator: 'CmdOrCtrl+Alt+K', click: () => { Swordfish.mainWindow.webContents.send('insert-term', { selected: true }); } },
            { label: 'Select Previous Term', accelerator: 'CmdOrCtrl+Alt+Up', click: () => { Swordfish.mainWindow.webContents.send('select-previous-term'); } },
            { label: 'Select Next Term', accelerator: 'CmdOrCtrl+Alt+Down', click: () => { Swordfish.mainWindow.webContents.send('select-next-term'); } },
            new MenuItem({ label: 'Insert Term...', submenu: insrtTermsMenu })
        ]);
        let qaMenu: Menu = Menu.buildFromTemplate([
            { label: 'Check Inline Tags', accelerator: 'F9', click: () => { Swordfish.mainWindow.webContents.send('tags-analysis'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'tagsAnalysis.png') },
            { label: 'Check Initial/Trailing Spaces', accelerator: 'F10', click: () => { Swordfish.mainWindow.webContents.send('spaces-analysis'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'spaceAnalysis.png') }
        ]);
        let tmMtMenu: Menu = Menu.buildFromTemplate([
            { label: 'Get Translations from Memory', accelerator: 'CmdOrCtrl+M', click: () => { Swordfish.mainWindow.webContents.send('get-tm-matches'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'translate.png') },
            { label: 'Accept Translation Memory Match', accelerator: 'CmdOrCtrl+Alt+M', click: () => { Swordfish.mainWindow.webContents.send('accept-tm-match'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'accept.png') },
            { label: 'Apply Translation Memory to All Segments', click: () => { Swordfish.mainWindow.webContents.send('apply-tm-all'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'requestTranslation.png') },
            { label: 'Accept All 100% Matches', click: () => { Swordfish.mainWindow.webContents.send('accept-all-matches'); } },
            { label: 'Remove All Translation Memory Matches', click: () => { Swordfish.mainWindow.webContents.send('remove-matches'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Get Machine Translations', accelerator: 'CmdOrCtrl+L', click: () => { Swordfish.mainWindow.webContents.send('get-mt-matches'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'translate.png') },
            { label: 'Accept Machine Translation', accelerator: 'CmdOrCtrl+Alt+L', click: () => { Swordfish.mainWindow.webContents.send('accept-mt-match'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'accept.png') },
            { label: 'Apply Machine Translation to All Segments', click: () => { Swordfish.mainWindow.webContents.send('apply-mt-all'); } },
            { label: 'Accept All Machine Translations', click: () => { Swordfish.mainWindow.webContents.send('accept-all-mt'); } },
            { label: 'Remove All Machine Translations', click: () => { Swordfish.mainWindow.webContents.send('remove-mt-all'); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Get Auto-Translations', accelerator: 'CmdOrCtrl+R', click: () => { Swordfish.mainWindow.webContents.send('get-am-matches'); }, icon: join(app.getAppPath(), 'images', iconFolder, 'autoTranslate.png') },
            { label: 'Apply Auto-Translation to All Segments', click: () => { Swordfish.mainWindow.webContents.send('apply-am-all'); } },
            { label: 'Remove All Auto-Translations', click: () => { Swordfish.mainWindow.webContents.send('remove-am-all'); } }
        ]);
        let template: MenuItem[] = [
            new MenuItem({ label: '&File', role: 'fileMenu', submenu: fileMenu }),
            new MenuItem({ label: '&Edit', role: 'editMenu', submenu: editMenu }),
            new MenuItem({ label: '&View', role: 'viewMenu', submenu: viewMenu }),
            new MenuItem({ label: '&Projects', submenu: projectsMenu }),
            new MenuItem({ label: '&Memories', submenu: memoriesMenu }),
            new MenuItem({ label: '&Glossaries', submenu: glossariesMenu }),
            new MenuItem({ label: '&Tasks', submenu: tasksMenu }),
            new MenuItem({ label: 'TM&-MT', submenu: tmMtMenu }),
            new MenuItem({ label: 'Te&rms', submenu: termsMenu }),
            new MenuItem({ label: '&QA', submenu: qaMenu }),
            new MenuItem({ label: '&AI', submenu: aiMenu }),
            new MenuItem({ label: '&Help', role: 'help', submenu: helpMenu })
        ];
        if (process.platform === 'darwin') {
            let appleMenu: Menu = Menu.buildFromTemplate([
                new MenuItem({ label: 'About...', click: () => { this.showAbout(); } }),
                new MenuItem({
                    label: 'Preferences...', submenu: [
                        { label: 'Settings', accelerator: 'Cmd+,', click: () => { this.showPreferences(); } }
                    ]
                }),
                new MenuItem({ type: 'separator' }),
                new MenuItem({
                    label: 'Services', role: 'services', submenu: [
                        { label: 'No Services Apply', enabled: false }
                    ]
                }),
                new MenuItem({ type: 'separator' }),
                new MenuItem({ label: 'Quit Swordfish', accelerator: 'Cmd+Q', role: 'quit', click: () => { app.quit(); } })
            ]);
            template.unshift(new MenuItem({ label: 'Swordfish', role: 'appMenu', submenu: appleMenu }));
        } else {
            let help: MenuItem = template.pop() as MenuItem;
            template.push(new MenuItem({
                label: '&Settings', submenu: [
                    { label: 'Preferences', click: () => { this.showPreferences(); } }
                ]
            }));
            template.push(help);
        }
        if (process.platform === 'win32') {
            fileMenu.append(new MenuItem({ type: 'separator' }));
            fileMenu.append(new MenuItem({ label: 'Exit', accelerator: 'Alt+F4', role: 'quit', click: () => { app.quit(); } }));
            helpMenu.append(new MenuItem({ type: 'separator' }));
            helpMenu.append(new MenuItem({ label: 'About...', click: () => { this.showAbout(); } }));
        }
        if (process.platform === 'linux') {
            fileMenu.append(new MenuItem({ type: 'separator' }));
            fileMenu.append(new MenuItem({ label: 'Quit', accelerator: 'Ctrl+Q', role: 'quit', click: () => { app.quit(); } }));
            helpMenu.append(new MenuItem({ type: 'separator' }));
            helpMenu.append(new MenuItem({ label: 'About...', click: () => { this.showAbout(); } }));
        }
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }

    static undo(): void {
        let focusedWindow: BrowserWindow | null = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            focusedWindow.webContents.undo();
        }
    }

    static cut(): void {
        let focusedWindow: BrowserWindow | null = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            focusedWindow.webContents.cut();
        }
    }

    static copy(): void {
        let focusedWindow: BrowserWindow | null = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            focusedWindow.webContents.copy();
        }
    }

    static paste(): void {
        let focusedWindow: BrowserWindow | null = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            focusedWindow.webContents.paste();
        }
    }

    static selectAll(): void {
        let focusedWindow: BrowserWindow | null = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            focusedWindow.webContents.selectAll();
        }
    }

    stopServer(): void {
        let instance: Swordfish = this;
        Swordfish.sendRequest('/', { command: 'stop' },
            (data: any) => {
                if (data.status === 'OK') {
                    instance.ls.kill();
                    app.quit();
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    loadDefaults(): void {
        let defaultsFile: string = join(app.getPath('appData'), app.name, 'defaults.json');
        if (existsSync(defaultsFile)) {
            try {
                let data: Buffer = readFileSync(defaultsFile);
                Swordfish.currentDefaults = JSON.parse(data.toString());
            } catch (err) {
                console.error(err);
            }
        }
    }

    saveDefaults(): void {
        let defaultsFile: string = join(app.getPath('appData'), app.name, 'defaults.json');
        writeFileSync(defaultsFile, JSON.stringify(Swordfish.mainWindow.getBounds(), null, 2));
    }

    static setHeight(arg: { window: string, width: number, height: number }): void {
        if ('about' === arg.window) {
            Swordfish.aboutWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('serverSettings' === arg.window) {
            Swordfish.serverSettingsWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('browseDatabases' === arg.window) {
            Swordfish.browseDatabasesWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('licenses' === arg.window) {
            Swordfish.licensesWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('addProject' === arg.window) {
            Swordfish.addProjectWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('editProject' === arg.window) {
            Swordfish.editProjectWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('addFile' === arg.window) {
            Swordfish.addFileWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('tags' === arg.window) {
            Swordfish.tagsWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('goTo' === arg.window) {
            Swordfish.goToWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('replaceText' === arg.window) {
            Swordfish.replaceTextWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('systemInfo' === arg.window) {
            Swordfish.systemInfoWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('addMemory' === arg.window) {
            Swordfish.addMemoryWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('addGlossary' === arg.window) {
            Swordfish.addGlossaryWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('addTerm' === arg.window) {
            Swordfish.addTermWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('importGlossary' === arg.window) {
            Swordfish.importGlossaryWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('importTmx' === arg.window) {
            Swordfish.importTmxWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('importSdltm' === arg.window) {
            Swordfish.importSdltmWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('concordanceSearch' === arg.window) {
            Swordfish.concordanceSearchWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('termSearch' === arg.window) {
            Swordfish.termSearchWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('preferences' === arg.window) {
            Swordfish.preferencesWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('defaultLangs' === arg.window) {
            Swordfish.defaultLangsWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('applyTm' === arg.window) {
            Swordfish.applyTmWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('spellingLangs' === arg.window) {
            Swordfish.spellingLangsWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('sortSegments' === arg.window) {
            Swordfish.sortSegmentsWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('filterSegments' === arg.window) {
            Swordfish.filterSegmentsWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('importXliff' === arg.window) {
            Swordfish.importXliffWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('changeCase' === arg.window) {
            Swordfish.changeCaseWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('notes' === arg.window) {
            Swordfish.notesWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('addNote' === arg.window) {
            Swordfish.addNoteWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('updates' === arg.window) {
            Swordfish.updatesWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('gettingStarted' === arg.window) {
            Swordfish.gettingStartedWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('editXmlFilter' === arg.window) {
            Swordfish.editXmlFilterWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('configElement' === arg.window) {
            Swordfish.configElementWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('addXmlConfiguration' === arg.window) {
            Swordfish.addXmlConfigurationWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('tagsAnalysis' === arg.window) {
            Swordfish.tagsAnalysisWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('spaceAnalysis' === arg.window) {
            Swordfish.spaceAnalysisWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('promptDialog' === arg.window) {
            Swordfish.promptWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('iatePlugin' === arg.window) {
            Swordfish.iatePluginWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('reviewComments' === arg.window) {
            Swordfish.reviewCommentsWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('addComment' === arg.window) {
            Swordfish.addCommentWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('addReply' === arg.window) {
            Swordfish.addReplyWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('fileInfo' === arg.window) {
            Swordfish.fileInfoWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('importCsv' === arg.window) {
            Swordfish.importCsvWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('webImport' === arg.window) {
            Swordfish.webImportWindow.setContentSize(arg.width, arg.height, true);
        }
        if ('clipboardImport' === arg.window) {
            Swordfish.clipboardImportWindow.setContentSize(arg.width, arg.height, true);
        }
    }

    static loadPreferences(): void {
        let dark: string = 'file://' + join(app.getAppPath(), 'css', 'dark.css');
        let light: string = 'file://' + join(app.getAppPath(), 'css', 'light.css');
        let highContrast: string = 'file://' + join(app.getAppPath(), 'css', 'highcontrast.css');
        let preferencesFile: string = join(app.getPath('appData'), app.name, 'preferences.json');
        let oldCss: string = Swordfish.currentCss;
        if (existsSync(preferencesFile)) {
            try {
                let data: Buffer = readFileSync(preferencesFile);
                let json: Preferences = JSON.parse(data.toString());
                let needsSaving: boolean = false;
                if (!json.hasOwnProperty('chatGpt')) {
                    json.chatGpt = { enabled: false, apiKey: '', model: 'o1-mini', fixTags: false };
                    needsSaving = true;
                }
                if (!json.chatGpt.hasOwnProperty('fixTags')) {
                    json.chatGpt.fixTags = false;
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('anthropic')) {
                    json.anthropic = { enabled: false, apiKey: '', model: 'claude-3-5-sonnet-latest', fixTags: false };
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('caseSensitiveMatches')) {
                    json.caseSensitiveMatches = true;
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('modernmt')) {
                    json.modernmt = { enabled: false, apiKey: '', srcLang: 'none', tgtLang: 'none' }
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('pageRows')) {
                    json.pageRows = 500;
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('autoConfirm')) {
                    json.autoConfirm = false;
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('userName')) {
                    json.userName = userInfo().username;
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('reviewModel')) {
                    json.reviewModel = join(app.getAppPath(), 'review', 'default.json');
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('mistral')) {
                    json.mistral = { enabled: false, apiKey: '', model: 'mistral-medium', fixTags: false };
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('qwen')) {
                    json.qwen = { enabled: false, apiKey: '', region: 'Singapore', model: 'qwen-mt-plus', fixTags: false };
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('glm')) {
                    json.glm = { enabled: false, apiKey: '', endpoint: 'general', model: 'glm-4-flash-250414', fixTags: false };
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('doubao')) {
                    json.doubao = { enabled: false, apiKey: '', endpoint: 'general', model: 'doubao-seed-2-0-pro-260215', fixTags: false };
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('gemini')) {
                    json.gemini = { enabled: false, apiKey: '', model: 'gemini-2.5-flash', fixTags: false };
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('appLang')) {
                    json.appLang = 'en';
                    needsSaving = true;
                }
                if (!json.hasOwnProperty('matchThreshold')) {
                    json.matchThreshold = 60;
                    needsSaving = true;
                }
                Swordfish.currentPreferences = json;
                if (!Swordfish.currentPreferences.projectsFolder || !existsSync(Swordfish.currentPreferences.projectsFolder) || needsSaving) {
                    Swordfish.currentPreferences.projectsFolder = join(app.getPath('appData'), app.name, 'projects');
                    writeFileSync(join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(Swordfish.currentPreferences, null, 2));
                }
                if (!Swordfish.currentPreferences.memoriesFolder || !existsSync(Swordfish.currentPreferences.memoriesFolder)) {
                    Swordfish.currentPreferences.memoriesFolder = join(app.getPath('appData'), app.name, 'memories');
                    writeFileSync(join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(Swordfish.currentPreferences, null, 2));
                }
                if (!Swordfish.currentPreferences.glossariesFolder || !existsSync(Swordfish.currentPreferences.glossariesFolder)) {
                    Swordfish.currentPreferences.glossariesFolder = join(app.getPath('appData'), app.name, 'glossaries');
                    writeFileSync(join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(Swordfish.currentPreferences, null, 2));
                }
                if (!existsSync(Swordfish.currentPreferences.catalog)) {
                    Swordfish.currentPreferences.catalog = join(app.getAppPath(), 'catalog', 'catalog.xml');
                    writeFileSync(join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(Swordfish.currentPreferences, null, 2));
                }
                if (!existsSync(Swordfish.currentPreferences.srx)) {
                    Swordfish.currentPreferences.srx = join(app.getAppPath(), 'srx', 'default.srx');
                    writeFileSync(join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(Swordfish.currentPreferences, null, 2));
                }
                if (!existsSync(Swordfish.currentPreferences.reviewModel)) {
                    Swordfish.currentPreferences.reviewModel = join(app.getAppPath(), 'review', 'default.json');
                    writeFileSync(join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(Swordfish.currentPreferences, null, 2));
                }
                if (Swordfish.mainWindow) {
                    Swordfish.mainWindow.webContents.send('set-rows-page', Swordfish.currentPreferences.pageRows);
                }
            } catch (err) {
                console.error(err);
            }
        } else {
            writeFileSync(join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(Swordfish.currentPreferences, null, 2));
        }
        if (Swordfish.currentPreferences.theme === 'system') {
            if (nativeTheme.shouldUseDarkColors) {
                Swordfish.currentCss = dark;
            } else {
                Swordfish.currentCss = light;
            }
            if (nativeTheme.shouldUseHighContrastColors) {
                Swordfish.currentCss = highContrast;
            }
        }
        if (Swordfish.currentPreferences.theme === 'dark') {
            Swordfish.currentCss = dark;
        }
        if (Swordfish.currentPreferences.theme === 'light') {
            Swordfish.currentCss = light;
        }
        if (Swordfish.currentPreferences.theme === 'highcontrast') {
            Swordfish.currentCss = highContrast;
        }
        if ((oldCss === dark || oldCss === light) && Swordfish.currentCss === highContrast) {
            Swordfish.deleteAllTags('#C5E1A5', '#000000');
        }
        if (oldCss === highContrast && (Swordfish.currentCss === light || Swordfish.currentCss === dark)) {
            Swordfish.deleteAllTags('#009688', '#ffffff');
        }
        if (!Swordfish.currentPreferences.zoomFactor) {
            Swordfish.currentPreferences.zoomFactor = '1.0';
        }
        if (!Swordfish.currentPreferences.os) {
            Swordfish.currentPreferences.os = process.platform;
        }
    }

    static async savePreferences(preferences: Preferences): Promise<void> {
        let validationError: string | null = null;
        let aiValidationNeeded: boolean = preferences.chatGpt.enabled || preferences.mistral.enabled || preferences.anthropic.enabled || preferences.gemini.enabled;
        if (aiValidationNeeded) {
            Swordfish.setPreferencesValidationWait(true);
            try {
                validationError = await Swordfish.validateAiModels(preferences);
            } finally {
                Swordfish.setPreferencesValidationWait(false);
            }
        }
        if (validationError) {
            Swordfish.showMessage({ type: 'error', message: validationError, parent: 'preferences' });
            return;
        }
        if (Swordfish.preferencesWindow) {
            Swordfish.preferencesWindow.close();
        }
        let reloadProjects: boolean = this.currentPreferences.projectsFolder !== preferences.projectsFolder;
        let reloadMemories: boolean = this.currentPreferences.memoriesFolder !== preferences.memoriesFolder;
        let reloadGlossaries: boolean = this.currentPreferences.glossariesFolder !== preferences.glossariesFolder;
        writeFileSync(join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(preferences, null, 2));
        Swordfish.loadPreferences();
        Swordfish.setTheme();
        Swordfish.mainWindow.webContents.send('set-zoom', { zoom: Swordfish.currentPreferences.zoomFactor });
        if (reloadProjects) {
            Swordfish.mainWindow.webContents.send('request-projects', {});
        }
        if (reloadMemories) {
            Swordfish.mainWindow.webContents.send('request-memories');
        }
        if (reloadGlossaries) {
            Swordfish.mainWindow.webContents.send('request-glossaries');
        }
    }

    private static async validateAiModels(preferences: Preferences): Promise<string | null> {
        let models: any = {};
        try {
            let modelsPath: string = join(app.getAppPath(), 'models', 'models.json');
            if (!existsSync(modelsPath)) {
                throw new Error('AI models catalog not found.');
            }
            let modelsContent: string = readFileSync(modelsPath, 'utf-8');
            models = JSON.parse(modelsContent);
            if (!(models && Array.isArray(models.ChatGPT) && Array.isArray(models.Mistral) && Array.isArray(models.Claude) && Array.isArray(models.Gemini))) {
                throw new Error('Invalid AI models catalog.');
            }
        } catch (error) {
            console.error('Unable to load AI models catalog: ', error);
            throw new Error('Unable to load AI models catalog.');
        }

        if (preferences.chatGpt.enabled) {
            preferences.chatGpt.model = preferences.chatGpt.model.trim().toLowerCase();
            if (!models.ChatGPT.includes(preferences.chatGpt.model)) {
                try {
                    let chatGptTranslator: ChatGPTTranslator = new ChatGPTTranslator(preferences.chatGpt.apiKey);
                    let models: string[][] = await chatGptTranslator.getAvailableModels();
                    let chatGptValid: boolean = models.some((modelInfo: string[]) => modelInfo[0] === preferences.chatGpt.model);
                    if (!chatGptValid) {
                        return 'ChatGPT Model ' + preferences.chatGpt.model + ' is not valid.';
                    }
                } catch (error: any) {
                    return 'Unable to validate ChatGPT model: ' + (error instanceof Error ? error.message : String(error));
                }
            }
        }
        if (preferences.mistral.enabled) {
            preferences.mistral.model = preferences.mistral.model.trim().toLowerCase();
            if (!models.Mistral.includes(preferences.mistral.model)) {
                try {
                    let mistralTranslator: MistralTranslator = new MistralTranslator(preferences.mistral.apiKey);
                    let models: string[][] = await mistralTranslator.getAvailableModels();
                    let mistralValid: boolean = models.some((model: string[]) => model[0] === preferences.mistral.model);
                    if (!mistralValid) {
                        return 'Mistral Model ' + preferences.mistral.model + ' is not valid.';
                    }
                } catch (error: any) {
                    return 'Unable to validate Mistral model: ' + (error instanceof Error ? error.message : String(error));
                }
            }
        }
        if (preferences.anthropic.enabled) {
            preferences.anthropic.model = preferences.anthropic.model.trim().toLowerCase();
            if (!models.Claude.includes(preferences.anthropic.model)) {
                try {
                    let anthropicTranslator: AnthropicTranslator = new AnthropicTranslator(preferences.anthropic.apiKey);
                    let models: string[][] = await anthropicTranslator.getAvailableModels();
                    let anthropicValid: boolean = models.some((model: string[]) => model[0] === preferences.anthropic.model);
                    if (!anthropicValid) {
                        return 'Anthropic Model ' + preferences.anthropic.model + ' is not valid.';
                    }
                } catch (error: any) {
                    return 'Unable to validate Anthropic model: ' + (error instanceof Error ? error.message : String(error));
                }
            }
        }
        if (preferences.gemini.enabled) {
            preferences.gemini.model = preferences.gemini.model.trim().toLowerCase();
            if (!models.Gemini.includes(preferences.gemini.model)) {
                try {
                    let geminiTranslator: GeminiTranslator = new GeminiTranslator(preferences.gemini.apiKey);
                    let models: string[][] = await geminiTranslator.getAvailableModels();
                    let geminiValid: boolean = models.some((model: string[]) => model[0] === preferences.gemini.model);
                    if (!geminiValid) {
                        return 'Gemini Model ' + preferences.gemini.model + ' is not valid.';
                    }
                } catch (error: any) {
                    return 'Unable to validate Gemini model: ' + (error instanceof Error ? error.message : String(error));
                }
            }
        }
        return null;
    }

    private static setPreferencesValidationWait(isWaiting: boolean): void {
        let channel: string = isWaiting ? 'start-waiting' : 'end-waiting';
        if (Swordfish.mainWindow && !Swordfish.mainWindow.isDestroyed()) {
            Swordfish.mainWindow.webContents.send(channel);
        }
        if (Swordfish.preferencesWindow && !Swordfish.preferencesWindow.isDestroyed()) {
            Swordfish.preferencesWindow.webContents.send(channel);
        }
    }

    static showSortSegments(params: any): void {
        this.sortSegmentsWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 420,
            height: 305,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.sortParams = params;
        this.sortSegmentsWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'sortSegments.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.sortSegmentsWindow.loadURL(fileUrl.href);
        this.sortSegmentsWindow.once('ready-to-show', () => {
            this.sortSegmentsWindow.show();
        });
        this.sortSegmentsWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.sortSegmentsWindow, 'sortSegments.html');
    }

    static showFilterSegments(params: any): void {
        this.filterSegmentsWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 480,
            height: 360,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.filterParams = params;
        this.filterSegmentsWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'filterSegments.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.filterSegmentsWindow.loadURL(fileUrl.href);
        this.filterSegmentsWindow.once('ready-to-show', () => {
            this.filterParams = params;
            this.filterSegmentsWindow.show();
        });
        this.filterSegmentsWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.filterSegmentsWindow, 'filterSegments.html');
    }

    static viewProjects(): void {
        Swordfish.mainWindow.webContents.send('view-projects');
    }

    static closeSelectedTab(): void {
        Swordfish.mainWindow.webContents.send('close-tab');
    }

    static editProject(): void {
        Swordfish.mainWindow.webContents.send('edit-project');
    }

    static showAddProject(): void {
        this.addProjectWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 980,
            height: 570,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.addProjectWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addProject.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.addProjectWindow.loadURL(fileUrl.href);
        this.addProjectWindow.once('ready-to-show', () => {
            this.addProjectWindow.show();
        });
        this.addProjectWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.addProjectWindow, 'addProject.html');
    }

    static showEditProject(project: Project): void {
        Swordfish.editedProject = project;
        this.editProjectWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 920,
            height: 240,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.editProjectWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'editProject.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.editProjectWindow.loadURL(fileUrl.href);
        this.editProjectWindow.once('ready-to-show', () => {
            this.editProjectWindow.show();
        });
        this.editProjectWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.editProjectWindow, 'editProject.html');
    }

    static exportOpenProject(arg: any): void {
        Swordfish.sendRequest('/projects/get', arg,
            (data: any) => {
                Swordfish.exportProjectTranslations(data);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static exportProjectTranslations(project: any): void {
        if (project.files.length === 1 && project.files[0].type !== 'DITA Map') {
            let parsed: any = Swordfish.getSaveName(project.files[0], project.targetLang, project.review);
            dialog.showSaveDialog(Swordfish.mainWindow, {
                defaultPath: parsed.defaultPath,
                filters: parsed.filters,
                properties: ['createDirectory', 'showOverwriteConfirmation']
            }).then((value: SaveDialogReturnValue) => {
                if (!value.canceled) {
                    Swordfish.sendRequest('/projects/translations', { project: project.id, output: value.filePath },
                        (data: any) => {
                            Swordfish.exportTranslations(data, value.filePath, true);
                        }, (reason: string) => {
                            Swordfish.showMessage({ type: 'error', message: reason });
                        }
                    );
                }
            }).catch((error: Error) => {
                console.error(error.message);
            });
        } else {
            dialog.showOpenDialog(Swordfish.mainWindow, {
                title: 'Select folder',
                properties: ['createDirectory', 'openDirectory']
            }).then((value: OpenDialogReturnValue) => {
                if (!value.canceled) {
                    Swordfish.sendRequest('/projects/translations', { project: project.id, output: value.filePaths[0] },
                        (data: any) => {
                            Swordfish.exportTranslations(data, value.filePaths[0], false);
                        }, (reason: string) => {
                            Swordfish.showMessage({ type: 'error', message: reason });
                        }
                    );
                }
            }).catch((error: Error) => {
                console.error(error.message);
            });
        }
    }

    static exportTranslations(data: any, output: string, isFile: boolean): void {
        if (data.status !== Swordfish.SUCCESS) {
            Swordfish.showMessage({ type: 'error', message: data.reason });
        }
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Exporting translations');
        Swordfish.currentStatus = data;
        let processId: string = data.process;
        let intervalObject: NodeJS.Timeout = setInterval(() => {
            if (Swordfish.currentStatus.progress) {
                if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    clearInterval(intervalObject);
                    if (isFile) {
                        dialog.showMessageBox(Swordfish.mainWindow, {
                            type: 'question',
                            message: 'Translations exported.\n\nOpen translated file?',
                            buttons: ['Yes', 'No']
                        }).then((selection: MessageBoxReturnValue) => {
                            if (selection.response === 0) {
                                shell.openExternal('file://' + output).catch(() => {
                                    shell.openPath(output).catch((reason: any) => {
                                        if (reason instanceof Error) {
                                            console.error(reason.message);
                                        }
                                        this.showMessage({ type: 'error', message: 'Unable to open translated file.' });
                                    });
                                });
                            }
                        });
                    } else {
                        Swordfish.showMessage({ type: 'info', message: 'Translations exported.' });
                    }
                    return;
                } else if (Swordfish.currentStatus.progress === Swordfish.PROCESSING) {
                    // it's OK, keep waiting
                } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    clearInterval(intervalObject);
                    Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                    return;
                } else {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    clearInterval(intervalObject);
                    Swordfish.showMessage({ type: 'error', message: 'Unknown error exporting translations' });
                    return;
                }
            }
            Swordfish.getProjectsProgress(processId);
        }, 500);
    }

    static getSaveName(file: any, lang: string, review: boolean): any {
        let fileName: string = file.file;
        if (fileName.endsWith('.sdlppx')) {
            return {
                defaultPath: fileName.substring(0, fileName.lastIndexOf('.')) + '.sdlrpx',
                filters: [{ name: file.type, extensions: 'sdlrpx' }, { name: 'Any File', extensions: '*' }]
            }
        }
        let name: string = fileName.substring(0, fileName.lastIndexOf('.'));
        let extension: string = fileName.substring(fileName.lastIndexOf('.'));
        if (review && name.endsWith('_review')) {
            name = name.substring(0, name.lastIndexOf('_review'));
            extension = '_reviewed' + extension;
        }
        return {
            defaultPath: name + '_' + lang + extension,
            filters: [{ name: file.type, extensions: extension }, { name: 'Any File', extensions: '*' }]
        }
    }

    static addFile(): void {
        let extensions: string[] = ['inx', 'icml', 'idml', 'ditamap', 'dita', 'xml', 'html', 'htm', 'js', 'properties', 'json', 'mif', 'docx', 'xlsx', 'pptx',
            'sxw', 'sxc', 'sxi', 'sxd', 'odt', 'ods', 'odp', 'odg', 'txt', 'po', 'pot', 'rc', 'resx', 'sdlxliff', 'srt', 'svg', 'sdlppx', 'ts', 'txml', 'vsdx',
            'xlf', 'xliff', 'mqxliff', 'txlf'];
        let filters: any[] = [
            { name: 'Supported Files', extensions: extensions },
            { name: 'Any File', extensions: ['*'] }
        ];
        dialog.showOpenDialog(Swordfish.mainWindow, {
            properties: ['openFile'],
            filters: filters
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                Swordfish.selectedFiles = value.filePaths;
                this.addFileWindow = new BrowserWindow({
                    parent: this.mainWindow,
                    width: 890,
                    height: 360,
                    minimizable: false,
                    maximizable: false,
                    resizable: false,
                    show: false,
                    icon: this.iconPath,
                    webPreferences: {
                        nodeIntegration: true,
                        contextIsolation: false
                    }
                });
                this.addFileWindow.setMenu(null);
                let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addFile.html');
                let fileUrl: URL = new URL('file://' + filePath);
                this.addFileWindow.loadURL(fileUrl.href);
                this.addFileWindow.once('ready-to-show', () => {
                    this.addFileWindow.show();
                });
                this.addFileWindow.on('close', () => {
                    this.mainWindow.focus();
                });
                Swordfish.setLocation(this.addFileWindow, 'addFile.html');
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static setSelectedFile(event: IpcMainEvent): void {
        if (Swordfish.selectedFiles.length > 0) {
            Swordfish.getFileType(event, Swordfish.selectedFiles);
            Swordfish.selectedFiles = [];
        } else {
            Swordfish.showMessage({ type: 'error', message: 'No file selected' });
        }
    }

    static translateProjects(): void {
        Swordfish.mainWindow.webContents.send('translate-projects');
    }

    static updateProject(data: any): void {
        Swordfish.sendRequest('/projects/update', data,
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    Swordfish.mainWindow.webContents.send('request-projects', {});
                    Swordfish.editProjectWindow.close();
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static createProject(arg: any): void {
        if (arg.from === 'addProject') {
            Swordfish.addProjectWindow.close();
        }
        if (arg.from === 'addFile') {
            Swordfish.addFileWindow.close();
        }
        arg.xmlfilter = join(app.getAppPath(), 'xmlfilter');
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Creating project...');
        Swordfish.sendRequest('/projects/create', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
                Swordfish.currentStatus = data;
                let processId: string = data.process;
                let intervalObject: NodeJS.Timeout = setInterval(() => {
                    if (Swordfish.currentStatus.progress) {
                        if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            clearInterval(intervalObject);
                            Swordfish.mainWindow.webContents.send('request-projects', { open: processId });
                            return;
                        } else if (Swordfish.currentStatus.progress === Swordfish.PROCESSING) {
                            // it's OK, keep waiting
                        } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            clearInterval(intervalObject);
                            Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                            return;
                        } else {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            clearInterval(intervalObject);
                            Swordfish.showMessage({ type: 'error', message: 'Unknown error processing files' });
                            return;
                        }
                    }
                    Swordfish.getProjectsProgress(processId);
                }, 500);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getProjectsProgress(process: string): void {
        this.sendRequest('/projects/status', { process: process },
            (data: any) => {
                Swordfish.currentStatus = data;
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getProjects(event: IpcMainEvent): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Loading projects');
        Swordfish.sendRequest('/projects/list', {},
            (data: any) => {
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.mainWindow.webContents.send('end-waiting');
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                event.sender.send('set-projects', data.projects);
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getMemories(event: IpcMainEvent): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Loading memories');
        Swordfish.sendRequest('/memories/list', {},
            (data: any) => {
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.mainWindow.webContents.send('end-waiting');
                if (data.status === Swordfish.SUCCESS) {
                    event.sender.send('set-memories', data.memories);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('set-status', '');
                dialog.showMessageBox({ type: 'error', message: reason });

            }
        );
    }

    static getGlossaries(event: IpcMainEvent): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Loading glossaries');
        Swordfish.sendRequest('/glossaries/list', {},
            (data: any) => {
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.mainWindow.webContents.send('end-waiting');
                if (data.status === Swordfish.SUCCESS) {
                    event.sender.send('set-glossaries', data.glossaries);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('set-status', '');
                dialog.showMessageBox({ type: 'error', message: reason });

            }
        );
    }

    selectSourceFiles(event: IpcMainEvent): void {
        let extensions: string[] = ['inx', 'icml', 'idml', 'ditamap', 'dita', 'xml', 'html', 'htm', 'js', 'properties', 'json', 'mif', 'docx', 'xlsx', 'pptx',
            'sxw', 'sxc', 'sxi', 'sxd', 'odt', 'ods', 'odp', 'odg', 'txt', 'po', 'pot', 'rc', 'resx', 'sdlxliff', 'srt', 'svg', 'sdlppx', 'ts', 'txml', 'vsdx',
            'xlf', 'xliff', 'mqxliff', 'txlf'];
        let filters: any[] = [
            { name: 'Supported Files', extensions: extensions },
            { name: 'Any File', extensions: ['*'] },
        ];
        dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: filters
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                Swordfish.getFileType(event, value.filePaths);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static getSelectedFiles(event: IpcMainEvent): void {
        if (Swordfish.selectedFiles?.length > 0) {
            Swordfish.getFileType(event, Swordfish.selectedFiles);
            Swordfish.selectedFiles = [];
        }
    }

    static getFileType(event: IpcMainEvent, files: string[]): void {
        Swordfish.sendRequest('/services/getFileType', { files: files },
            (data: any) => {
                event.sender.send('add-source-files', data.files);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    getLanguages(event: IpcMainEvent): void {
        try {
            let locale: string = Swordfish.currentPreferences.appLang ? Swordfish.currentPreferences.appLang : 'en';
            let languages = LanguageUtils.getCommonLanguages(locale);
            let payload = {
                languages: languages.map((language) => {
                    return {
                        code: language.getCode(),
                        description: language.getDescription(),
                        suppressedScript: language.getSuppressedScript()
                    };
                }),
                srcLang: Swordfish.currentPreferences.srcLang,
                tgtLang: Swordfish.currentPreferences.tgtLang
            };
            event.sender.send('set-languages', payload);
        } catch (error) {
            let message: string = error instanceof Error ? error.message : 'Unknown error loading languages';
            Swordfish.showMessage({ type: 'error', message: 'Unable to load languages: ' + message });
        }
    }

    getMtLanguages(event: IpcMainEvent): void {
        let mtManager: MTManager = new MTManager(Swordfish.currentPreferences, '', '');
        event.sender.send('set-mt-languages', mtManager.getMTLanguages());
    }

    getAiModels(event: IpcMainEvent): void {
        try {
            let modelsPath: string = join(app.getAppPath(), 'models', 'models.json');
            if (!existsSync(modelsPath)) {
                Swordfish.showMessage({ type: 'error', message: 'Unable to load AI model suggestions: models.json not found', parent: 'preferences' });
                event.sender.send('ai-models-error');
                return;
            }
            let modelsContent: string = readFileSync(modelsPath, 'utf-8');
            let models: any = JSON.parse(modelsContent);
            if (!(models && Array.isArray(models.ChatGPT) && Array.isArray(models.Mistral) && Array.isArray(models.Claude))) {
                throw new Error('Invalid AI models catalog.');
            }
            event.sender.send('set-ai-models', models);
        } catch (error) {
            console.error('Unable to load AI model suggestions', error);
            let message: string = error instanceof Error ? error.message : 'Unknown error loading models';
            Swordfish.showMessage({ type: 'error', message: 'Unable to load AI model suggestions: ' + message, parent: 'preferences' });
            event.sender.send('ai-models-error');
        }
    }

    static viewMemories(): void {
        Swordfish.mainWindow.webContents.send('view-memories');
    }

    static showServerSettings(type: string): void {
        this.serverSettingsWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 440,
            height: 240,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.typeParam = type;
        this.serverSettingsWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'serverSettings.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.serverSettingsWindow.loadURL(fileUrl.href);
        this.serverSettingsWindow.once('ready-to-show', () => {
            this.serverSettingsWindow.show();
        });
        this.serverSettingsWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.serverSettingsWindow, 'serverSettings.html');
    }

    static showBrowseDatabases(): void {
        this.browseDatabasesWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 635,
            height: 355,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.browseDatabasesWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'browseDatabases.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.browseDatabasesWindow.loadURL(fileUrl.href);
        this.browseDatabasesWindow.once('ready-to-show', () => {
            this.browseDatabasesWindow.show();
        });
        this.browseDatabasesWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.browseDatabasesWindow, 'browseDatabases.html');
    }

    static connectToServer(args: any): void {
        Swordfish.sendRequest('/services/remoteDatabases', args,
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    this.remoteTmParams = {};
                    this.remoteTmParams.server = args.server;
                    this.remoteTmParams.user = args.user;
                    this.remoteTmParams.password = args.password;
                    this.remoteTmParams.memories = data.memories;
                    this.remoteTmParams.type = this.typeParam;
                    this.showBrowseDatabases();
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static addDatabases(args: any): void {
        Swordfish.sendRequest('/services/addDatabases', args,
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    if (args.type === 'memory') {
                        Swordfish.mainWindow.webContents.send('request-memories');
                        Swordfish.showMessage({ type: 'info', message: 'Memory added' });
                    } else {
                        Swordfish.mainWindow.webContents.send('request-glossaries');
                        Swordfish.showMessage({ type: 'info', message: 'Glossary added' });
                    }
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showAddMemory(): void {
        this.addMemoryWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 435,
            height: 290,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.addMemoryWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addMemory.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.addMemoryWindow.loadURL(fileUrl.href);
        this.addMemoryWindow.once('ready-to-show', () => {
            this.addMemoryWindow.show();
        });
        this.addMemoryWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.addMemoryWindow, 'addMemory.html');
    }

    static viewGlossaries(): void {
        Swordfish.mainWindow.webContents.send('view-glossaries');
    }

    static sendRequest(url: string, params: any, success: Function, error: Function): void {
        let body: string = JSON.stringify(params);
        let req = nodeHttp.request({
            hostname: '127.0.0.1',
            port: 8070,
            path: url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let responseData: string = '';
            res.on('data', (chunk: Buffer) => { responseData += chunk.toString(); });
            res.on('end', () => {
                try {
                    let json: any = JSON.parse(responseData);
                    success(json);
                } catch (reason: any) {
                    error(reason.message || String(reason));
                }
            });
        });
        req.on('error', (e: Error) => { error(e.message); });
        req.write(body);
        req.end();
    }

    static showHelp(): void {
        const path = join(app.getAppPath(), 'swordfish_' + Swordfish.currentPreferences.appLang + '.pdf');
        shell.openExternal('file://' + path).catch(() => {
            shell.openPath(path).catch((reason: any) => {
                if (reason instanceof Error) {
                    console.error(reason.message);
                }
                this.showMessage({ type: 'error', message: 'Unable to open Swordfish User Guide.' });
            });
        });
    }

    static showAbout(): void {
        Swordfish.aboutWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 360,
            height: 490,
            resizable: false,
            minimizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.aboutWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'about.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.aboutWindow.loadURL(fileUrl.href);
        Swordfish.aboutWindow.once('ready-to-show', () => {
            Swordfish.aboutWindow.show();
        });
        Swordfish.aboutWindow.on('close', () => {
            Swordfish.mainWindow.focus();
        });
    }

    static openLicense(type: string): void {
        let licenseFile: string = '';
        let title: string = '';
        switch (type) {
            case 'Swordfish':
            case "OpenXLIFF":
            case "MTEngines":
            case "TypesBCP47":
            case "TypesXML":
                licenseFile = 'EclipsePublicLicense1.0.html';
                title = 'Eclipse Public License 1.0';
                break;
            case "XMLJava":
                licenseFile = 'xmljava.html';
                title = 'Custom License';
                break;
            case "BCP47J":
                licenseFile = 'bcp47j.html';
                title = 'Custom License';
                break;
            case "electron":
                licenseFile = 'electron.txt';
                title = 'MIT License';
                break;
            case "MapDB":
                licenseFile = 'Apache2.0.html';
                title = 'Apache 2.0';
                break;
            case "Java":
                licenseFile = 'java.html';
                title = 'GPL2 with Classpath Exception';
                break;
            case "jsoup":
                licenseFile = 'jsoup.txt';
                title = 'MIT License';
                break;
            default:
                Swordfish.showMessage({ type: 'error', message: 'Unknown license' });
                return;
        }
        let licenseWindow: BrowserWindow = new BrowserWindow({
            parent: this.licensesWindow,
            width: 680,
            height: 400,
            show: false,
            title: title,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        licenseWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', 'licenses', licenseFile);
        let fileUrl: URL = new URL('file://' + filePath);
        licenseWindow.loadURL(fileUrl.href);
        licenseWindow.once('ready-to-show', () => {
            licenseWindow.show();
        });
        licenseWindow.on('close', () => {
            this.licensesWindow.focus();
        });
        licenseWindow.webContents.on('did-finish-load', () => {
            let css: string = readFileSync(Swordfish.currentCss.substring('file://'.length), { encoding: 'utf8' });
            licenseWindow.webContents.insertCSS(css.toString());
        });
    }

    static showPreferences(): void {
        this.mainWindow.webContents.send('start-waiting');
        this.preferencesWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 700,
            height: 340,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.preferencesWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'preferencesDialog.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.preferencesWindow.loadURL(fileUrl.href);
        this.preferencesWindow.once('ready-to-show', () => {
            let mtManager: MTManager = new MTManager(Swordfish.currentPreferences, '', '');
            this.preferencesWindow.webContents.send('set-mt-languages', mtManager.getMTLanguages());
            this.preferencesWindow.show();
        });
        this.preferencesWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.preferencesWindow, 'preferencesDialog.html');
    }

    static showSystemInfo(): void {
        this.systemInfoWindow = new BrowserWindow({
            parent: Swordfish.aboutWindow,
            width: 430,
            height: 240,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.systemInfoWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'systemInfo.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.systemInfoWindow.loadURL(fileUrl.href);
        this.systemInfoWindow.once('ready-to-show', () => {
            this.systemInfoWindow.show();
        });
        this.systemInfoWindow.on('close', () => {
            Swordfish.aboutWindow.focus();
        });
        Swordfish.setLocation(this.systemInfoWindow, 'systemInfo.html');
    }

    static getSystemInformation(event: IpcMainEvent): void {
        this.sendRequest('/services/systemInfo', {},
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    data.electron = process.versions.electron;
                    event.sender.send('set-system-info', data);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showLicenses(arg: any): void {
        let parent: BrowserWindow = Swordfish.mainWindow;
        if (arg.from === 'about' && Swordfish.aboutWindow) {
            parent = Swordfish.aboutWindow;
        }
        this.licensesWindow = new BrowserWindow({
            parent: parent,
            width: 480,
            height: 510,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.licensesWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'licenses.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.licensesWindow.loadURL(fileUrl.href);
        this.licensesWindow.once('ready-to-show', () => {
            this.licensesWindow.show();
        });
        this.licensesWindow.on('close', () => {
            parent.focus();
        });
        Swordfish.setLocation(this.licensesWindow, 'licenses.html');
    }

    static showReleaseHistory(): void {
        shell.openExternal('https://www.maxprograms.com/products/swfishlog.html').catch((reason: any) => {
            if (reason instanceof Error) {
                console.error(reason.message);
            }
            this.showMessage({ type: 'error', message: 'Unable to open release history.' });
        });
    }

    static showSupportGroup(): void {
        shell.openExternal('https://groups.io/g/maxprograms/').catch((reason: any) => {
            if (reason instanceof Error) {
                console.error(reason.message);
            }
            this.showMessage({ type: 'error', message: 'Unable to open support group page.' });
        });
    }

    static setTheme(): void {
        BrowserWindow.getAllWindows().forEach((win: BrowserWindow) => {
            win.webContents.send('set-theme', Swordfish.currentCss);
        });
    }

    static checkUpdates(silent: boolean): void {
        session.defaultSession.clearCache().then(() => {
            let request: ClientRequest = net.request({
                url: 'https://maxprograms.com/swordfish.json',
                session: session.defaultSession
            });
            request.on('response', (response: IncomingMessage) => {
                let responseData: string = '';
                if (response.statusCode !== 200) {
                    if (!silent) {
                        Swordfish.showMessage({
                            type: 'info',
                            message: 'Server status: ' + response.statusCode
                        });
                    }
                }
                response.on('data', (chunk: Buffer) => {
                    responseData += chunk;
                });
                response.on('end', () => {
                    try {
                        let parsedData: any = JSON.parse(responseData);
                        if (app.getVersion() !== parsedData.version) {
                            Swordfish.latestVersion = parsedData.version;
                            switch (process.platform) {
                                case 'darwin':
                                    Swordfish.downloadLink = process.arch === 'arm64' ? parsedData.arm64 : parsedData.darwin;
                                    break;
                                case 'win32':
                                    Swordfish.downloadLink = parsedData.win32;
                                    break;
                                case 'linux':
                                    Swordfish.downloadLink = parsedData.linux;
                                    break;
                            }
                            Swordfish.updatesWindow = new BrowserWindow({
                                parent: this.mainWindow,
                                width: 560,
                                height: 240,
                                minimizable: false,
                                maximizable: false,
                                resizable: false,
                                show: false,
                                icon: this.iconPath,
                                webPreferences: {
                                    nodeIntegration: true,
                                    contextIsolation: false
                                }
                            });
                            Swordfish.updatesWindow.setMenu(null);
                            let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'updates.html');
                            let fileUrl: URL = new URL('file://' + filePath);
                            Swordfish.updatesWindow.loadURL(fileUrl.href);
                            Swordfish.updatesWindow.once('ready-to-show', () => {
                                Swordfish.updatesWindow.show();
                            });
                            this.updatesWindow.on('close', () => {
                                this.mainWindow.focus();
                            });
                        } else if (!silent) {
                            Swordfish.showMessage({
                                type: 'info',
                                message: 'There are currently no updates available'
                            });
                        }
                    } catch (reason: any) {
                        if (!silent) {
                            Swordfish.showMessage({
                                type: 'error',
                                message: reason.message
                            });
                        }
                    }
                });
            });
            request.on('error', (error: Error) => {
                if (!silent) {
                    Swordfish.showMessage({
                        type: 'error',
                        message: error.message
                    });
                }
            });
            request.end();
        });
    }

    getTypes(event: IpcMainEvent): void {
        Swordfish.sendRequest('/services/getFileTypes', {},
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    event.sender.send('set-types', data);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    getCharset(event: IpcMainEvent): void {
        Swordfish.sendRequest('/services/getCharsets', {},
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    event.sender.send('set-charsets', data);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    getClients(event: IpcMainEvent): void {
        Swordfish.sendRequest('/services/getClients', {},
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    event.sender.send('set-clients', data.clients);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    getProjectNames(event: IpcMainEvent): void {
        Swordfish.sendRequest('/services/getProjects', {},
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    event.sender.send('set-project-names', data.projects);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    getSubjects(event: IpcMainEvent): void {
        Swordfish.sendRequest('/services/getSubjects', {},
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    event.sender.send('set-subjects', data.subjects);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    browseSRX(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'Default SRX File',
            defaultPath: Swordfish.currentPreferences.srx,
            properties: ['openFile'],
            filters: [
                { name: 'SRX Files', extensions: ['srx'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-srx', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    browseReviewModel(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'Review Model',
            defaultPath: Swordfish.currentPreferences.reviewModel,
            properties: ['openFile'],
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-review-model', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    browseProjects(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'Projects Folder',
            defaultPath: Swordfish.currentPreferences.projectsFolder,
            properties: ['openDirectory', 'createDirectory']
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-projects-folder', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    browseMemories(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'Memories Folder',
            defaultPath: Swordfish.currentPreferences.memoriesFolder,
            properties: ['openDirectory', 'createDirectory']
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-memories-folder', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    browseGlossaries(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'Glossaries Folder',
            defaultPath: Swordfish.currentPreferences.glossariesFolder,
            properties: ['openDirectory', 'createDirectory']
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-glossaries-folder', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    browseCatalog(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'Default Catalog',
            defaultPath: Swordfish.currentPreferences.catalog,
            properties: ['openFile'],
            filters: [
                { name: 'XML Files', extensions: ['xml'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-xml', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    browseXslSource(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'XLIFF Files', extensions: ['xlf'] },
                { name: 'TMX Files', extensions: ['tmx'] },
                { name: 'TBX Files', extensions: ['tbx'] },
                { name: 'GlossML Files', extensions: ['gls'] },
                { name: 'XML Files', extensions: ['xml'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-xsl-source', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    browseXSL(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'XSL Files', extensions: ['xsl'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-xsl', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    browseOutput(event: IpcMainEvent): void {
        dialog.showSaveDialog({
            properties: ['createDirectory', 'showOverwriteConfirmation'],
            filters: [
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-output', value.filePath);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static getDefaultLanguages(): void {
        this.defaultLangsWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 600,
            height: 190,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.defaultLangsWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'defaultLangs.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.defaultLangsWindow.loadURL(fileUrl.href);
        this.defaultLangsWindow.once('ready-to-show', () => {
            this.defaultLangsWindow.show();
        });
        this.defaultLangsWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.defaultLangsWindow, 'defaultLangs.html');
    }

    static savelanguages(arg: any): void {
        this.defaultLangsWindow.close();
        this.currentPreferences.srcLang = arg.srcLang;
        this.currentPreferences.tgtLang = arg.tgtLang;
        writeFileSync(join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(this.currentPreferences, null, 2));
    }

    static getSegmenstCount(event: IpcMainEvent, arg: any): void {
        Swordfish.sendRequest('/projects/count', arg,
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    data.project = arg.project;
                    event.sender.send('set-segments-count', data);
                    Swordfish.mainWindow.webContents.send('set-statistics', { project: arg.project, statistics: data.statistics });
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getSegments(event: IpcMainEvent, arg: any): void {
        Swordfish.sendRequest('/projects/segments', arg,
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    data.project = arg.project;
                    event.sender.send('set-segments', data);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getProjectFiles(projectId: string): void {
        Swordfish.sendRequest('/projects/getFiles', { project: projectId },
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    Swordfish.mainWindow.webContents.send('set-project-files', data.files);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static removeProjects(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, { type: "question", message: "Delete selected projects?", buttons: ["Yes", "No"], defaultId: 1 }
        ).then((result: any) => {
            if (result.response === 0) {
                Swordfish.sendRequest('/projects/delete', arg,
                    (data: any) => {
                        if (data.status === Swordfish.SUCCESS) {
                            Swordfish.mainWindow.webContents.send('request-projects', {});
                        } else {
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                        }
                    },
                    (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static addMemory(arg: any): void {
        Swordfish.addMemoryWindow.close();
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Creating memory');
        Swordfish.sendRequest('/memories/create', arg,
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                Swordfish.mainWindow.webContents.send('request-memories');
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static addGlossary(arg: any): void {
        Swordfish.addGlossaryWindow.close();
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Creating glossary');
        Swordfish.sendRequest('/glossaries/create', arg,
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                Swordfish.mainWindow.webContents.send('request-glossaries');
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showImportSDLTM(memory: string): void {
        this.importSdltmWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 600,
            height: 290,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.memoryParam = memory;
        this.importSdltmWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'importSdltm.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.importSdltmWindow.loadURL(fileUrl.href);
        this.importSdltmWindow.once('ready-to-show', () => {
            this.importSdltmWindow.show();
        });
        this.importSdltmWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.importSdltmWindow, 'importSdltm.html');
    }

    static showImportTMX(memory: string): void {
        this.importTmxWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 600,
            height: 290,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.memoryParam = memory;
        this.importTmxWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'importTmx.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.importTmxWindow.loadURL(fileUrl.href);
        this.importTmxWindow.once('ready-to-show', () => {
            this.importTmxWindow.show();
        });
        this.importTmxWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.importTmxWindow, 'importTmx.html');
    }

    static showImportGlossary(glossary: string): void {
        this.importGlossaryWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 600,
            height: 290,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.selectedGlossary = glossary;
        this.importGlossaryWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'importGlossary.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.importGlossaryWindow.loadURL(fileUrl.href);
        this.importGlossaryWindow.once('ready-to-show', () => {
            this.importGlossaryWindow.show();
        });
        this.importGlossaryWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.importGlossaryWindow, 'importGlossary.html');
    }

    static importSdltmFile(arg: any): void {
        let sdltmFile: string = arg.sdltm;
        let tmxFile: string = join(app.getPath('temp'), 'convertedTmx.tmx');
        Swordfish.importSdltmWindow.close();
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Converting SDLTM File');
        const reader: TMReader = new TMReader({ 'productName': app.getName(), 'version': app.getVersion() });
        reader.convert(sdltmFile, tmxFile).then((result: TMReaderResult) => {
            Swordfish.mainWindow.webContents.send('end-waiting');
            Swordfish.mainWindow.webContents.send('set-status', '');
            if (result.status === 'Success') {
                arg.tmx = tmxFile;
                Swordfish.importTmxFile(arg);
            } else {
                Swordfish.showMessage({ type: 'error', message: 'Error converting SDLTM file to TMX' });
            }
        }).catch((reason: any) => {
            console.error(reason);
            Swordfish.mainWindow.webContents.send('end-waiting');
            Swordfish.mainWindow.webContents.send('set-status', '');
            Swordfish.showMessage({ type: 'error', message: reason });
        });
    }

    static importTmxFile(arg: any): void {
        if (Swordfish.importTmxWindow && !Swordfish.importTmxWindow.isDestroyed()) {
            Swordfish.importTmxWindow.close();
        }
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Importing TMX File');
        Swordfish.sendRequest('/memories/import', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
                Swordfish.currentStatus = data;
                let processId: string = data.process;
                let intervalObject: NodeJS.Timeout = setInterval(() => {
                    if (Swordfish.currentStatus.status === Swordfish.SUCCESS) {
                        if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            clearInterval(intervalObject);
                            if (Swordfish.currentStatus.remotetm) {
                                Swordfish.showMessage({ type: 'info', message: 'File uploaded.\n\nYou will receive an email with process results.' });
                            } else if (Swordfish.currentStatus.imported !== -1) {
                                Swordfish.showMessage({ type: 'info', message: 'Imported ' + Swordfish.currentStatus.imported + ' segments.' });
                            }
                            if (arg.sdltm) {
                                try {
                                    unlinkSync(arg.tmx);
                                } catch (error) {
                                    console.error('Error deleting temporary TMX file: ' + error);
                                }
                            }
                            return;
                        }
                    }
                    if (Swordfish.currentStatus.status === Swordfish.ERROR) {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                        return;
                    }
                    Swordfish.getMemoriesProgress(processId);
                }, 2500);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getMemoriesProgress(process: string): void {
        this.sendRequest('/memories/status', { process: process },
            (data: any) => {
                Swordfish.currentStatus = data;
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getGlossariesProgress(process: string): void {
        this.sendRequest('/glossaries/status', { process: process },
            (data: any) => {
                Swordfish.currentStatus = data;
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    getTmxFile(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'TMX Files', extensions: ['tmx'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-tmx-file', value.filePaths[0]);
            }
        });
    }

    getSdltmFile(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'SDLTM Files', extensions: ['sdltm'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-sdltm-file', value.filePaths[0]);
            }
        });
    }

    static getGlossaryFile(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'TMX/TBX File', extensions: ['tmx', 'tbx'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-glossary-file', value.filePaths[0]);
            }
        });
    }

    static removeMemories(arg: string[]): void {
        dialog.showMessageBox(Swordfish.mainWindow, { type: "question", message: "Delete selected memories?", buttons: ["Yes", "No"], defaultId: 1 }
        ).then((result: any) => {
            if (result.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Removing memories');
                Swordfish.sendRequest('/memories/delete', { memories: arg },
                    (data: any) => {
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                        }
                        Swordfish.currentStatus = data;
                        let processId: string = data.process;
                        let intervalObject: NodeJS.Timeout = setInterval(() => {
                            if (Swordfish.currentStatus.status === Swordfish.SUCCESS) {
                                if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.mainWindow.webContents.send('request-memories');
                                    return;
                                }
                            }
                            if (Swordfish.currentStatus.status === Swordfish.ERROR) {
                                Swordfish.mainWindow.webContents.send('end-waiting');
                                Swordfish.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                                return;
                            }
                            Swordfish.getMemoriesProgress(processId);
                        }, 500);
                    },
                    (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static removeGlossaries(arg: string[]): void {
        dialog.showMessageBox(Swordfish.mainWindow, { type: "question", message: "Delete selected glossaries?", buttons: ["Yes", "No"], defaultId: 1 }
        ).then((result: any) => {
            if (result.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Removing glossaries');
                Swordfish.sendRequest('/glossaries/delete', { glossaries: arg },
                    (data: any) => {
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                        }
                        Swordfish.currentStatus = data;
                        let processId: string = data.process;
                        let intervalObject: NodeJS.Timeout = setInterval(() => {
                            if (Swordfish.currentStatus.status === Swordfish.SUCCESS) {
                                if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.mainWindow.webContents.send('request-glossaries');
                                    return;
                                }
                            }
                            if (Swordfish.currentStatus.status === Swordfish.ERROR) {
                                Swordfish.mainWindow.webContents.send('end-waiting');
                                Swordfish.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                                return;
                            }
                            Swordfish.getGlossariesProgress(processId);
                        }, 500);
                    },
                    (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static exportMemories(memories: any[]): void {
        if (memories.length === 1) {
            dialog.showSaveDialog(Swordfish.mainWindow, {
                defaultPath: memories[0].name + '.tmx',
                filters: [
                    { name: 'TMX Files', extensions: ['tmx'] },
                    { name: 'Any File', extensions: ['*'] }],
                properties: ['createDirectory', 'showOverwriteConfirmation']
            }).then((value: SaveDialogReturnValue) => {
                if (!value.canceled) {
                    Swordfish.mainWindow.webContents.send('start-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', 'Exporting memories');
                    Swordfish.sendRequest('/memories/export', { memory: memories[0].memory, tmx: value.filePath },
                        (data: any) => {
                            if (data.status !== Swordfish.SUCCESS) {
                                Swordfish.mainWindow.webContents.send('end-waiting');
                                Swordfish.mainWindow.webContents.send('set-status', '');
                                Swordfish.showMessage({ type: 'error', message: data.reason });
                            }
                            Swordfish.currentStatus = data;
                            let processId: string = data.process;
                            let intervalObject: NodeJS.Timeout = setInterval(() => {
                                if (Swordfish.currentStatus.status === Swordfish.SUCCESS) {
                                    if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                                        Swordfish.mainWindow.webContents.send('end-waiting');
                                        Swordfish.mainWindow.webContents.send('set-status', '');
                                        Swordfish.showMessage({ type: 'info', message: 'Memories exported' });
                                        clearInterval(intervalObject);
                                        return;
                                    }
                                }
                                if (Swordfish.currentStatus.status === Swordfish.ERROR) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                                    return;
                                }
                                Swordfish.getMemoriesProgress(processId);
                            }, 500);
                        }, (reason: string) => {
                            Swordfish.showMessage({ type: 'error', message: reason });
                        }
                    );
                }
            }).catch((error: Error) => {
                console.error(error.message);
            });
        } else {
            Swordfish.showMessage({ type: 'warning', message: 'Select one memory' });
        }
    }

    static exportGlossaries(glossaries: any[]): void {
        if (glossaries.length === 1) {
            dialog.showSaveDialog(Swordfish.mainWindow, {
                defaultPath: glossaries[0].name + '.tmx',
                filters: [
                    { name: 'TMX Files', extensions: ['tmx'] },
                    { name: 'Any File', extensions: ['*'] }],
                properties: ['createDirectory', 'showOverwriteConfirmation']
            }).then((value: SaveDialogReturnValue) => {
                if (!value.canceled) {
                    Swordfish.mainWindow.webContents.send('start-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', 'Exporting glossaries');
                    Swordfish.sendRequest('/glossaries/export', { glossary: glossaries[0].glossary, file: value.filePath },
                        (data: any) => {
                            if (data.status !== Swordfish.SUCCESS) {
                                Swordfish.mainWindow.webContents.send('end-waiting');
                                Swordfish.mainWindow.webContents.send('set-status', '');
                                Swordfish.showMessage({ type: 'error', message: data.reason });
                            }
                            Swordfish.currentStatus = data;
                            let processId: string = data.process;
                            let intervalObject: NodeJS.Timeout = setInterval(() => {
                                if (Swordfish.currentStatus.status === Swordfish.SUCCESS) {
                                    if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                                        Swordfish.mainWindow.webContents.send('end-waiting');
                                        Swordfish.mainWindow.webContents.send('set-status', '');
                                        clearInterval(intervalObject);
                                        Swordfish.showMessage({ type: 'info', message: 'Glossaries exported' });
                                        return;
                                    }
                                }
                                if (Swordfish.currentStatus.status === Swordfish.ERROR) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                                    return;
                                }
                                Swordfish.getGlossariesProgress(processId);
                            }, 500);
                        }, (reason: string) => {
                            Swordfish.showMessage({ type: 'error', message: reason });
                        }
                    );
                }
            }).catch((error: Error) => {
                console.error(error.message);
            });
        } else {
            Swordfish.showMessage({ type: 'warning', message: 'Select one glossary' });
        }
    }

    static closeProject(arg: any): void {
        Swordfish.sendRequest('/projects/close', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static saveTranslation(arg: any): void {
        Swordfish.sendRequest('/projects/save', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                if (data.propagated.length > 0) {
                    Swordfish.mainWindow.webContents.send('auto-propagate', { project: arg.project, rows: data.propagated });
                }
                if (data.tagErrors || data.spaceErrors) {
                    Swordfish.mainWindow.webContents.send('set-errors', {
                        project: arg.project,
                        file: arg.file,
                        unit: arg.unit,
                        segment: arg.segment,
                        tagErrors: data.tagErrors,
                        spaceErrors: data.spaceErrors,
                        hasNotes: data.hasNotes,
                        hasContext: data.hasContext,
                        hasMetadata: data.hasMetadata
                    });
                } else {
                    Swordfish.mainWindow.webContents.send('clear-errors', {
                        project: arg.project,
                        file: arg.file,
                        unit: arg.unit,
                        segment: arg.segment,
                        tagErrors: data.tagErrors,
                        spaceErrors: data.spaceErrors,
                        hasNotes: data.hasNotes,
                        hasContext: data.hasContext,
                        hasMetadata: data.hasMetadata
                    });
                }
                Swordfish.mainWindow.webContents.send('set-statistics', { project: arg.project, statistics: data.statistics });
                if (arg.translation !== data.target) {
                    Swordfish.mainWindow.webContents.send('update-target', {
                        project: arg.project,
                        file: arg.file,
                        unit: arg.unit,
                        segment: arg.segment,
                        target: data.target
                    });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static saveSource(arg: any): void {
        Swordfish.sendRequest('/projects/saveSource', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                if (data.tagErrors || data.spaceErrors) {
                    Swordfish.mainWindow.webContents.send('set-errors', {
                        project: arg.project,
                        file: arg.file,
                        unit: arg.unit,
                        segment: arg.segment,
                        tagErrors: data.tagErrors,
                        spaceErrors: data.spaceErrors
                    });
                } else {
                    Swordfish.mainWindow.webContents.send('clear-errors', {
                        project: arg.project,
                        file: arg.file,
                        unit: arg.unit,
                        segment: arg.segment,
                        tagErrors: data.tagErrors,
                        spaceErrors: data.spaceErrors
                    });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getMatches(arg: any): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.sendRequest('/projects/matches', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                if (data.matches.length > 0) {
                    Swordfish.mainWindow.webContents.send('set-matches', { currentId: { project: arg.project, file: arg.file, unit: arg.unit, segment: arg.segment }, matches: data.matches });
                }
                Swordfish.mainWindow.webContents.send('end-waiting');
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getTerms(arg: any): void {
        Swordfish.sendRequest('/projects/terms', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                if (data.terms.length > 0) {
                    Swordfish.mainWindow.webContents.send('set-terms', { project: arg.project, terms: data.terms });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static fixMatches(arg: any, srcLang: string, tgtLang: string): void {
        let mtManager: MTManager = new MTManager(Swordfish.currentPreferences, srcLang, tgtLang);
        try {
            mtManager.fixMatch(arg.matchData);
        } catch (error: any) {
            Swordfish.mainWindow.webContents.send('end-waiting');
            Swordfish.mainWindow.webContents.send('set-status', '');
            if (error instanceof Error) {
                Swordfish.showMessage({ type: 'error', message: error.message });
            } else {
                console.error(JSON.stringify(error));
            }
        }
    }

    static machineTranslate(arg: any): void {
        let mtManager: MTManager = new MTManager(Swordfish.currentPreferences, arg.srcLang, arg.tgtLang);
        try {
            mtManager.translateSegment(arg);
        } catch (error: any) {
            if (error instanceof Error) {
                Swordfish.showMessage({ type: 'error', message: error.message });
            } else {
                console.error(JSON.stringify(error));
            }
        }
    }

    static assembleMatches(arg: any): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Assembling Translations');
        Swordfish.sendRequest('/projects/assembleMatches', arg,
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                if (data.matches.length > 0) {
                    Swordfish.mainWindow.webContents.send('set-matches', { project: arg.project, matches: data.matches });
                }
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static tmTranslate(arg: any): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Searching Memory');
        Swordfish.sendRequest('/projects/tmTranslate', arg,
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                if (data.matches.length > 0) {
                    Swordfish.mainWindow.webContents.send('set-matches', { project: arg.project, matches: data.matches });
                }
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showApplyTm(arg: any): void {
        this.applyTmWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 450,
            height: 190,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        if (arg.memory) {
            Swordfish.memoryParam = arg.memory;
        }
        Swordfish.projectParam = arg.project;
        this.applyTmWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'applyTm.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.applyTmWindow.loadURL(fileUrl.href);
        this.applyTmWindow.once('ready-to-show', () => {
            this.applyTmWindow.show();
        });
        this.applyTmWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.applyTmWindow, 'applyTm.html');
    }

    static tmTranslateAll(arg: any): void {
        Swordfish.applyTmWindow.close();
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Translating Project \u00A0\u00A0\u00A0 0%');
        Swordfish.sendRequest('/projects/tmTranslateAll', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
                Swordfish.currentStatus = data;
                let processId: string = data.process;
                let percentage: number = 0;
                let intervalObject: NodeJS.Timeout = setInterval(() => {
                    if (Swordfish.currentStatus.progress) {
                        if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            clearInterval(intervalObject);
                            Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                            Swordfish.showMessage({ type: 'info', message: 'Applied translations to ' + Swordfish.currentStatus.translated + ' segments.\n\nAdded matches to ' + Swordfish.currentStatus.matched + ' segments' });
                            return;
                        } else if (Swordfish.currentStatus.progress === Swordfish.PROCESSING) {
                            // it's OK, keep waiting
                            if (percentage !== Swordfish.currentStatus.percentage) {
                                percentage = Swordfish.currentStatus.percentage;
                                Swordfish.mainWindow.webContents.send('set-status', 'Translating Project \u00A0\u00A0\u00A0' + percentage + '%');
                            }
                        } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            clearInterval(intervalObject);
                            Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                            return;
                        } else {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            clearInterval(intervalObject);
                            Swordfish.showMessage({ type: 'error', message: 'Unknown error applying TM' });
                            return;
                        }
                    }
                    Swordfish.getProjectsProgress(processId);
                }, 500);

            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getProjectMemories(arg: any): void {
        Swordfish.sendRequest('/projects/projectMemories', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                data.project = arg.project;
                Swordfish.mainWindow.webContents.send('set-project-memories', data);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getProjectGlossaries(arg: any): void {
        Swordfish.sendRequest('/projects/projectGlossaries', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                data.project = arg.project;
                Swordfish.mainWindow.webContents.send('set-project-glossaries', data);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static setProjectMemory(arg: any): void {
        Swordfish.sendRequest('/projects/setMemory', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static setProjectGlossary(arg: any): void {
        Swordfish.sendRequest('/projects/setGlossary', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showSpellCheckerLangs(): void {
        Swordfish.spellingLangsWindow = new BrowserWindow({
            parent: this.preferencesWindow,
            width: 790,
            height: 530,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.spellingLangsWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'spellingLangs.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.spellingLangsWindow.loadURL(fileUrl.href);
        Swordfish.spellingLangsWindow.once('ready-to-show', () => {
            Swordfish.spellingLangsWindow.show();
        });
        this.spellingLangsWindow.on('close', () => {
            this.preferencesWindow.focus();
        });
        Swordfish.setLocation(this.spellingLangsWindow, 'spellingLangs.html');
    }

    static getSpellCheckerLangs(event: IpcMainEvent): void {
        Swordfish.sendRequest('/services/getSpellingLanguages', { languages: Swordfish.spellCheckerLanguages },
            (data: any) => {
                event.sender.send('set-spellchecker-langs', data);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static setSpellcheckerLanguage(lang: string): void {
        if (!Swordfish.spellCheckerLanguages) {
            Swordfish.spellCheckerLanguages = Swordfish.mainWindow.webContents.session.availableSpellCheckerLanguages;
        }
        if (Swordfish.spellCheckerLanguages.includes(lang)) {
            Swordfish.mainWindow.webContents.session.setSpellCheckerLanguages([lang]);
            return;
        }
        if (lang.startsWith('en')) {
            Swordfish.mainWindow.webContents.session.setSpellCheckerLanguages([Swordfish.currentPreferences.spellchecker.defaultEnglish]);
            return;
        }
        if (lang.startsWith('pt')) {
            Swordfish.mainWindow.webContents.session.setSpellCheckerLanguages([Swordfish.currentPreferences.spellchecker.defaultPortuguese]);
            return;
        }
        if (lang.startsWith('es')) {
            Swordfish.mainWindow.webContents.session.setSpellCheckerLanguages([Swordfish.currentPreferences.spellchecker.defaultSpanish]);
            return;
        }
        if (lang.length > 2) {
            lang = lang.substring(0, 2);
            if (Swordfish.spellCheckerLanguages.includes(lang)) {
                Swordfish.mainWindow.webContents.session.setSpellCheckerLanguages([lang]);
            }
        }
    }

    static showMessage(arg: any): void {
        let parent: BrowserWindow = Swordfish.mainWindow;
        if (arg.parent) {
            switch (arg.parent) {
                case 'goTo': parent = Swordfish.goToWindow;
                    break;
                case 'addFile': parent = Swordfish.addFileWindow;
                    break;
                case 'addGlossary': parent = Swordfish.addGlossaryWindow;
                    break;
                case 'addMemory': parent = Swordfish.addMemoryWindow;
                    break;
                case 'addProject': parent = Swordfish.addProjectWindow;
                    break;
                case 'addTerm': parent = Swordfish.addTermWindow;
                    break;
                case 'concordanceSearch': parent = Swordfish.concordanceSearchWindow;
                    break;
                case 'filterSegments': parent = Swordfish.filterSegmentsWindow;
                    break;
                case 'importGlossary': parent = Swordfish.importGlossaryWindow;
                    break;
                case 'importTmx': parent = Swordfish.importTmxWindow;
                    break;
                case 'importSdltm': parent = Swordfish.importSdltmWindow;
                    break;
                case 'importXliff': parent = Swordfish.importXliffWindow;
                    break;
                case 'preferences': parent = Swordfish.preferencesWindow;
                    break;
                case 'replaceText': parent = Swordfish.replaceTextWindow;
                    break;
                case 'termSearch': parent = Swordfish.termSearchWindow;
                    break;
                case 'applyTm': parent = Swordfish.applyTmWindow;
                    break;
                case 'addNote': parent = Swordfish.addNoteWindow;
                    break;
                case 'serverSettings': parent = Swordfish.serverSettingsWindow;
                    break;
                case 'browseDatabases': parent = Swordfish.browseDatabasesWindow;
                    break;
                case 'addConfiguration': parent = Swordfish.addXmlConfigurationWindow;
                    break;
                case 'filterConfig': parent = Swordfish.editXmlFilterWindow;
                    break;
                case 'elementConfig': parent = Swordfish.configElementWindow;
                    break;
                case 'tagsAnalysis': parent = Swordfish.tagsAnalysisWindow;
                    break;
                case 'spaceAnalysis': parent = Swordfish.spaceAnalysisWindow;
                    break;
                case 'commentsDialog': parent = Swordfish.reviewCommentsWindow;
                    break;
                case 'addCommentDialog': parent = Swordfish.addCommentWindow;
                    break;
                case 'addReplyDialog': parent = Swordfish.addReplyWindow;
                    break;
                case 'importCsv': parent = Swordfish.importCsvWindow;
                    break;
                case 'webImport': parent = Swordfish.webImportWindow;
                    break;
                case 'clipboardImport': parent = Swordfish.clipboardImportWindow;
                    break;
                default: parent = Swordfish.mainWindow;
            }
        }
        dialog.showMessageBoxSync(parent, {
            icon: this.iconPath,
            type: arg.type,
            message: arg.message,
            buttons: ['OK']
        });
    }

    static notifyMtTranslationErrors(summary: string, logEntries: string[], message?: string): void {
        if (!logEntries || logEntries.length === 0) {
            return;
        }
        let detailParts: string[] = [];
        if (summary && summary.length > 0) {
            detailParts.push(summary);
        }
        detailParts.push('Select "Open Log" to review the error details.');
        let title: string = message && message.length > 0 ? message : 'Machine translation completed with errors.';
        let options: MessageBoxOptions = {
            type: 'warning',
            buttons: ['Dismiss', 'Open Log'],
            defaultId: 0,
            cancelId: 0,
            noLink: true,
            message: title,
            detail: detailParts.join('\n\n')
        };
        let target: BrowserWindow | undefined = (Swordfish.mainWindow && !Swordfish.mainWindow.isDestroyed()) ? Swordfish.mainWindow : undefined;
        let messagePromise: Promise<MessageBoxReturnValue>;
        if (target) {
            messagePromise = dialog.showMessageBox(target, options);
        } else {
            messagePromise = dialog.showMessageBox(options);
        }
        messagePromise.then((result: MessageBoxReturnValue) => {
            if (result.response === 1) {
                Swordfish.openMtErrorLog(logEntries);
            }
        }).catch((reason: any) => {
            if (reason instanceof Error) {
                console.error(reason.message);
            } else {
                console.error(reason);
            }
        });
    }

    private static openMtErrorLog(logEntries: string[]): void {
        try {
            if (!logEntries || logEntries.length === 0) {
                return;
            }
            let logsDir: string = join(Swordfish.appHome, 'logs');
            if (!existsSync(logsDir)) {
                mkdirSync(logsDir, { recursive: true });
            }
            let timestamp: string = new Date().toISOString().replaceAll(/[:.]/g, '-');
            let filePath: string = join(logsDir, 'mt-errors-' + timestamp + '.txt');
            let header: string = 'Machine translation errors - ' + new Date().toLocaleString();
            let content: string = [header, '', ...logEntries].join('\n');
            writeFileSync(filePath, content, { encoding: 'utf8' });
            shell.openExternal('file://' + filePath).catch(() => {
                shell.openPath(filePath).catch((reason: any) => {
                    if (reason instanceof Error) {
                        console.error(reason.message);
                    } else {
                        console.error(reason);
                    }
                    Swordfish.showMessage({ type: 'error', message: 'Unable to open MT error log.' });
                });
            });
        } catch (error: any) {
            if (error instanceof Error) {
                console.error(error.message);
            } else {
                console.error(error);
            }
            Swordfish.showMessage({ type: 'error', message: 'Unable to create MT error log.' });
        }
    }

    static showNotification(message: string): void {
        let notification: Notification = new Notification({
            title: message,
            silent: true,
            icon: this.iconPath
        });
        notification.show();
    }

    static importReviewedXLIFF(): void {
        dialog.showOpenDialog({
            title: 'Import XLIFF File',
            properties: ['openFile'],
            filters: [
                { name: 'XLIFF Files', extensions: ['xlf'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                this.sendRequest('/projects/importReview', { xliff: value.filePaths[0] },
                    (result: any) => {
                        if (result.status === Swordfish.SUCCESS) {
                            Swordfish.showMessage({ type: 'info', message: 'XLIFF imported' });
                            // TODO refresh project if it is open
                        } else {
                            Swordfish.showMessage({ type: 'error', message: result.reason });
                        }
                    }, (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason });
                    });
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static exportXLIFF(arg: { projectId: string, description: string }): void {
        let description: string = arg.description;
        if (description.lastIndexOf('/') !== -1) {
            description = description.substring(description.lastIndexOf('/'));
        }
        if (description.lastIndexOf('\\') !== -1) {
            description = description.substring(description.lastIndexOf('\\'));
        }
        dialog.showSaveDialog(Swordfish.mainWindow, {
            defaultPath: description + '_review.xlf',
            filters: [
                { name: 'XLIFF Files', extensions: ['xlf'] },
                { name: 'Any File', extensions: ['*'] }],
            properties: ['createDirectory', 'showOverwriteConfirmation']
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                Swordfish.sendRequest('/projects/exportReview', { project: arg.projectId, output: value.filePath },
                    (data: any) => {
                        if (data.status === Swordfish.SUCCESS) {
                            Swordfish.exportProjectFile(data, 'Exporting XLIFF...', 'XLIFF exported');
                        } else {
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                        }
                    }, (reason: string) => {
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static exportProject(arg: { projectId: string, description: string }): void {
        let description: string = arg.description;
        if (description.lastIndexOf('/') !== -1) {
            description = description.substring(description.lastIndexOf('/'));
        }
        if (description.lastIndexOf('\\') !== -1) {
            description = description.substring(description.lastIndexOf('\\'));
        }
        dialog.showSaveDialog(Swordfish.mainWindow, {
            defaultPath: description + '.xlf',
            filters: [
                { name: 'XLIFF Files', extensions: ['xlf'] },
                { name: 'Any File', extensions: ['*'] }],
            properties: ['createDirectory', 'showOverwriteConfirmation']
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                Swordfish.sendRequest('/projects/export', { project: arg.projectId, output: value.filePath },
                    (data: any) => {
                        if (data.status === Swordfish.SUCCESS) {
                            Swordfish.exportProjectFile(data, 'Exporting project...', 'Project exported');
                        } else {
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                        }
                    }, (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static exportProjectTMX(arg: { projectId: string, description: string }): void {
        let description: string = arg.description;
        if (description.lastIndexOf('/') !== -1) {
            description = description.substring(description.lastIndexOf('/'));
        }
        if (description.lastIndexOf('\\') !== -1) {
            description = description.substring(description.lastIndexOf('\\'));
        }
        dialog.showSaveDialog(Swordfish.mainWindow, {
            defaultPath: description + '.tmx',
            filters: [{ name: 'TMX Files', extensions: ['tmx'] }, { name: 'Any File', extensions: ['*'] }],
            properties: ['createDirectory', 'showOverwriteConfirmation']
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                Swordfish.sendRequest('/projects/exportTmx', { project: arg.projectId, output: value.filePath },
                    (data: any) => {
                        Swordfish.exportProjectFile(data, 'Exporting TMX...', 'Translations exported');
                    }, (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static exportMatches(arg: { projectId: string, description: string }): void {
        let description: string = arg.description;
        if (description.lastIndexOf('/') !== -1) {
            description = description.substring(description.lastIndexOf('/'));
        }
        if (description.lastIndexOf('\\') !== -1) {
            description = description.substring(description.lastIndexOf('\\'));
        }
        dialog.showSaveDialog(Swordfish.mainWindow, {
            defaultPath: description + '.tmx',
            filters: [{ name: 'TMX Files', extensions: ['tmx'] }, { name: 'Any File', extensions: ['*'] }],
            properties: ['createDirectory', 'showOverwriteConfirmation']
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                Swordfish.sendRequest('/projects/exportMatches', { project: arg.projectId, output: value.filePath },
                    (data: any) => {
                        Swordfish.exportProjectFile(data, 'Exporting TM Matches...', 'TM matches exported');
                    }, (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static exportTerms(arg: { projectId: string, description: string }): void {
        let description: string = arg.description;
        if (description.lastIndexOf('/') !== -1) {
            description = description.substring(description.lastIndexOf('/'));
        }
        if (description.lastIndexOf('\\') !== -1) {
            description = description.substring(description.lastIndexOf('\\'));
        }
        dialog.showSaveDialog(Swordfish.mainWindow, {
            defaultPath: description + '.tbx',
            filters: [{ name: 'TBX Files', extensions: ['tbx'] }, { name: 'Any File', extensions: ['*'] }],
            properties: ['createDirectory', 'showOverwriteConfirmation']
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                Swordfish.sendRequest('/projects/exportTerms', { project: arg.projectId, output: value.filePath },
                    (data: any) => {
                        Swordfish.exportProjectFile(data, 'Exporting Terms...', 'Terms exported');
                    }, (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static exportProjectFile(data: any, message: string, completed: string): void {
        if (data.status !== Swordfish.SUCCESS) {
            Swordfish.showMessage({ type: 'error', message: data.reason });
        }
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', message);
        Swordfish.currentStatus = data;
        let processId: string = data.process;
        let intervalObject: NodeJS.Timeout = setInterval(() => {
            if (Swordfish.currentStatus.progress) {
                if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    clearInterval(intervalObject);
                    Swordfish.showMessage({ type: 'info', message: completed });
                    return;
                } else if (Swordfish.currentStatus.progress === Swordfish.PROCESSING) {
                    // it's OK, keep waiting
                } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    clearInterval(intervalObject);
                    Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                    return;
                } else {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    clearInterval(intervalObject);
                    Swordfish.showMessage({ type: 'error', message: 'Unknown error exporting project' });
                    return;
                }
            }
            Swordfish.getProjectsProgress(processId);
        }, 500);
    }

    static showAddGlossary(): void {
        this.addGlossaryWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 435,
            height: 290,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.addGlossaryWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addGlossary.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.addGlossaryWindow.loadURL(fileUrl.href);
        this.addGlossaryWindow.once('ready-to-show', () => {
            this.addGlossaryWindow.show();
        });
        this.addGlossaryWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.addGlossaryWindow, 'addGlossary.html');
    }

    static removeGlossary(): void {
        Swordfish.mainWindow.webContents.send('remove-glossary');
    }

    static showImportXliff(): void {
        this.importXliffWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 580,
            height: 360,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.importXliffWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'importXliff.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.importXliffWindow.loadURL(fileUrl.href);
        this.importXliffWindow.once('ready-to-show', () => {
            this.importXliffWindow.show();
        });
        this.importXliffWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.importXliffWindow, 'importXliff.html');
    }

    static browseImportXLIFF(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'Import Project File',
            properties: ['openFile'],
            filters: [
                { name: 'XLIFF File', extensions: ['xlf'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-xliff', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static importXLIFF(arg: any): void {
        Swordfish.importXliffWindow.close();
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Importing XLIFF');
        Swordfish.sendRequest('/projects/import', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
                Swordfish.currentStatus = data;
                let processId: string = data.process;
                let intervalObject: NodeJS.Timeout = setInterval(() => {
                    if (Swordfish.currentStatus.progress) {
                        if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            clearInterval(intervalObject);
                            Swordfish.mainWindow.webContents.send('request-projects', { open: processId });
                            return;
                        } else if (Swordfish.currentStatus.progress === Swordfish.PROCESSING) {
                            // it's OK, keep waiting
                        } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            clearInterval(intervalObject);
                            Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                            return;
                        } else {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            clearInterval(intervalObject);
                            Swordfish.showMessage({ type: 'error', message: 'Unknown error importing file' });
                            return;
                        }
                    }
                    Swordfish.getProjectsProgress(processId);
                }, 500);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static filesDropped(files: string[]): void {
        if (files.length === 1 && !(existsSync(files[0]) && lstatSync(files[0]).isDirectory())) {
            // single file
            Swordfish.selectedFiles = files;
            this.addFileWindow = new BrowserWindow({
                parent: this.mainWindow,
                width: 900,
                height: 355,
                minimizable: false,
                maximizable: false,
                resizable: false,
                show: false,
                icon: this.iconPath,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            });
            this.addFileWindow.setMenu(null);
            let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addFile.html');
            let fileUrl: URL = new URL('file://' + filePath);
            this.addFileWindow.loadURL(fileUrl.href);
            this.addFileWindow.once('ready-to-show', () => {
                this.addFileWindow.show();
            });
            this.addFileWindow.on('close', () => {
                this.mainWindow.focus();
            });
            Swordfish.setLocation(this.addFileWindow, 'addFile.html');
        } else {
            let filesList: string[] = [];
            files.forEach((file: string) => {
                if (existsSync(file)) {
                    if (lstatSync(file).isDirectory()) {
                        let recursed: string[] = Swordfish.recurseFolder(file);
                        recursed.forEach((recursedFile: string) => {
                            filesList.push(recursedFile);
                        });
                    } else {
                        filesList.push(file);
                    }
                }
            });
            Swordfish.selectedFiles = filesList;
            Swordfish.showAddProject();
        }
    }

    static recurseFolder(file: string): string[] {
        let filesList: string[] = [];
        let dirFiles: string[] = readdirSync(file);
        dirFiles.forEach((dirFile: string) => {
            let child: string = join(file, dirFile)
            if (lstatSync(child).isDirectory()) {
                let recursed: string[] = Swordfish.recurseFolder(child);
                recursed.forEach((recursedFile: string) => {
                    filesList.push(recursedFile);
                });
            } else {
                filesList.push(child);
            }
        });
        return filesList;
    }

    static sortOptions(arg: any): void {
        Swordfish.mainWindow.webContents.send('set-sorting', arg);
        Swordfish.sortSegmentsWindow.close();
    }

    static filterOptions(arg: any): void {
        Swordfish.mainWindow.webContents.send('set-filters', arg);
        Swordfish.filterSegmentsWindow.close();
    }

    static removeTranslations(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Remove all translations?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Removing translations');
                Swordfish.sendRequest('/projects/removeTranslations', arg,
                    (data: any) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                            return;
                        }
                        Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                        Swordfish.mainWindow.webContents.send('set-statistics', { project: arg.project, statistics: data.statistics });
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static removeAssembledMatches(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Remove all auto-translations?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Removing auto-translations');
                Swordfish.sendRequest('/projects/removeAssembledMatches', arg,
                    (data: any) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                            return;
                        }
                        Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static removeMatches(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Remove all translation memory matches?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Removing matches');
                Swordfish.sendRequest('/projects/removeMatches', arg,
                    (data: any) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                            return;
                        }
                        Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static removeMachineTranslations(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Remove all machine translations?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Removing translations');
                Swordfish.sendRequest('/projects/removeMT', arg,
                    (data: any) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                            return;
                        }
                        Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static unconfirmTranslations(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Unconfirm all translations?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Updating status');
                Swordfish.sendRequest('/projects/unconfirmTranslations', arg,
                    (data: any) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                            return;
                        }
                        Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                        Swordfish.mainWindow.webContents.send('set-statistics', { project: arg.project, statistics: data.statistics });
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static pseudoTranslate(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Pseudo-translate untranslated segments?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Pseudo-translating');
                Swordfish.sendRequest('/projects/pseudoTranslate', arg,
                    (data: any) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                            return;
                        }
                        Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                        Swordfish.mainWindow.webContents.send('set-statistics', { project: arg.project, statistics: data.statistics });
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static copyAllSources(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Copy source to all empty targets?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Copying sources');
                Swordfish.sendRequest('/projects/copyAllSources', arg,
                    (data: any) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                            return;
                        }
                        Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                        Swordfish.mainWindow.webContents.send('set-statistics', { project: arg.project, statistics: data.statistics });
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static confirmAllTranslations(arg: any): void {

        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Confirm all translations?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Confirming translations');
                Swordfish.sendRequest('/projects/confirmAllTranslations', arg,
                    (data: any) => {
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                        }
                        Swordfish.currentStatus = data;
                        let processId: string = data.process;
                        let intervalObject: NodeJS.Timeout = setInterval(() => {
                            if (Swordfish.currentStatus.progress) {
                                if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                                    Swordfish.mainWindow.webContents.send('set-statistics', { project: arg.project, statistics: data.statistics });
                                    return;
                                } else if (Swordfish.currentStatus.progress === Swordfish.PROCESSING) {
                                    // it's OK, keep waiting
                                } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                                    return;
                                } else {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.showMessage({ type: 'error', message: 'Unknown error confirming translations' });
                                    return;
                                }
                            }
                            Swordfish.getProjectsProgress(processId);
                        }, 500);
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static acceptAll100Matches(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Accept all 100% matches?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Accepting matches');
                Swordfish.sendRequest('/projects/acceptAll100Matches', arg,
                    (data: any) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                            return;
                        }
                        Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                        Swordfish.mainWindow.webContents.send('set-statistics', { project: arg.project, statistics: data.statistics });
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static generateStatistics(arg: any): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Generating statistics');
        Swordfish.sendRequest('/projects/generateStatistics', arg,
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                shell.openExternal('file://' + data.analysis).catch(() => {
                    shell.openPath(data.analysis).catch((reason: any) => {
                        if (reason instanceof Error) {
                            console.error(reason.message);
                        }
                        this.showMessage({ type: 'error', message: 'Unable to open statistics.' });
                    });
                });
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showTagsWindow(): void {
        if (Swordfish.tagsWindow && !Swordfish.tagsWindow.isDestroyed()) {
            Swordfish.tagsWindow.focus();
            return;
        }
        this.tagsWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 190,
            height: 150,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.tagsWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'tags.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.tagsWindow.loadURL(fileUrl.href);
        this.tagsWindow.once('ready-to-show', () => {
            this.tagsWindow.show();
        });
        this.tagsWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.tagsWindow, 'tags.html');
    }

    static goToSameSource(currentSegment: FullId): void {
        Swordfish.sendRequest('/projects/getSameSource', { project: currentSegment.project, file: currentSegment.file, unit: currentSegment.unit, segment: currentSegment.segment }, (data: any) => {
            if (data.status === Swordfish.SUCCESS) {
                if (data.next !== -1) {
                    Swordfish.mainWindow.webContents.send('open-segment', data.next);
                } else {
                    Swordfish.showMessage({ type: 'info', message: 'No more segments with the same source' });
                }
            } else {
                Swordfish.showMessage({ type: 'error', message: data.reason });
            }
        }, (reason: string) => {
            Swordfish.showMessage({ type: 'error', message: reason });
        });
    }

    static goToFile({ project, file }: { project: string, file: string }): void {
        Swordfish.sendRequest('/projects/getFileStart', { project: project, file: file }, (data: any) => {
            if (data.status === Swordfish.SUCCESS) {
                Swordfish.mainWindow.webContents.send('open-segment', data.start);
            } else {
                Swordfish.showMessage({ type: 'error', message: data.reason });
            }
        }, (reason: string) => {
            Swordfish.showMessage({ type: 'error', message: reason });
        });
    }

    static showGoToWindow(): void {
        this.goToWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 250,
            height: 150,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.goToWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'goTo.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.goToWindow.loadURL(fileUrl.href);
        this.goToWindow.once('ready-to-show', () => {
            this.goToWindow.show();
        });
        this.goToWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.goToWindow, 'goTo.html');
    }

    static closeTagsWindow(): void {
        if (this.tagsWindow?.isVisible()) {
            Swordfish.tagsWindow.close();
        }
    }

    static showReplaceText(arg: any): void {
        this.replaceTextWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 450,
            height: 265,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.projectParam = arg.project;
        this.replaceTextWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'replaceText.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.replaceTextWindow.loadURL(fileUrl.href);
        this.replaceTextWindow.once('ready-to-show', () => {
            this.replaceTextWindow.show();
        });
        this.replaceTextWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.replaceTextWindow, 'replaceText.html');
    }

    static replaceText(arg: any): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Replacing text');
        Swordfish.sendRequest('/projects/replaceText', arg,
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                Swordfish.replaceTextWindow.close();
                Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                Swordfish.mainWindow.webContents.send('set-statistics', { project: arg.project, statistics: data.statistics });
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static assembleMatchesAll(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Apply Auto-Translation to all segments?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Assembling Matches');
                Swordfish.sendRequest('/projects/applyAmAll', arg,
                    (data: any) => {
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                        }
                        Swordfish.currentStatus = data;
                        let processId: string = data.process;
                        let intervalObject: NodeJS.Timeout = setInterval(() => {
                            if (Swordfish.currentStatus.progress) {
                                if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                                    return;
                                } else if (Swordfish.currentStatus.progress === Swordfish.PROCESSING) {
                                    // it's OK, keep waiting
                                } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                                    return;
                                } else {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.showMessage({ type: 'error', message: 'Unknown error auto-translating' });
                                    return;
                                }
                            }
                            Swordfish.getProjectsProgress(processId);
                        }, 500);
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static applyMachineTranslationsAll(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Apply Machine Translation to all segments?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Selecting segments...');
                Swordfish.sendRequest('/projects/applyMtAll', arg,
                    (data: any) => {
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                        }
                        Swordfish.currentStatus = data;
                        let processId: string = data.process;
                        let intervalObject: NodeJS.Timeout = setInterval(() => {
                            if (Swordfish.currentStatus.progress) {
                                if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                                    clearInterval(intervalObject);
                                    Swordfish.mainWindow.webContents.send('set-status', 'Translating...');
                                    let exportedFile: string = join(Swordfish.currentPreferences.projectsFolder, arg.project, 'applymt.xlf');
                                    if (!existsSync(exportedFile)) {
                                        Swordfish.mainWindow.webContents.send('end-waiting');
                                        Swordfish.mainWindow.webContents.send('set-status', '');
                                        Swordfish.showMessage({ type: 'error', message: 'Unable to find exported file' });
                                        return;
                                    }
                                    const runTranslation = async (): Promise<void> => {
                                        try {
                                            let mtManager: MTManager = new MTManager(this.currentPreferences, arg.srcLang, arg.tgtLang);
                                            await mtManager.translateProject(arg.project, exportedFile, arg.currentSegment);
                                            unlinkSync(exportedFile);
                                            Swordfish.mainWindow.webContents.send('end-waiting');
                                            Swordfish.mainWindow.webContents.send('set-status', '');
                                            Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                                            if (arg.currentSegment) {
                                                Swordfish.getMatches({
                                                    project: arg.project,
                                                    file: arg.currentSegment.file,
                                                    unit: arg.currentSegment.unit,
                                                    segment: arg.currentSegment.id
                                                });
                                            } else {
                                                Swordfish.showMessage({ type: 'info', message: 'Machine Translation applied to all segments.' });
                                            }
                                        } catch (e) {
                                            Swordfish.mainWindow.webContents.send('end-waiting');
                                            Swordfish.mainWindow.webContents.send('set-status', '');
                                            if (e instanceof Error) {
                                                Swordfish.showMessage({ type: 'error', message: e.message });
                                            } else {
                                                Swordfish.showMessage({ type: 'error', message: 'Unknown error applying MT' });
                                                console.error(e);
                                            }
                                        }
                                    };
                                    runTranslation();
                                    return;
                                } else if (Swordfish.currentStatus.progress === Swordfish.PROCESSING) {
                                    // it's OK, keep waiting
                                } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                                    return;
                                } else {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.showMessage({ type: 'error', message: 'Unknown error applying MT' });
                                    return;
                                }
                            }
                            Swordfish.getProjectsProgress(processId);
                        }, 500);
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static acceptAllMachineTranslations(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Accept all machine translations?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Accepting matches');
                Swordfish.sendRequest('/projects/acceptAllMT', arg,
                    (data: any) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                            return;
                        }
                        Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                        Swordfish.mainWindow.webContents.send('set-statistics', { project: arg.project, statistics: data.statistics });
                    },
                    (reason: string) => {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static importGlossaryFile(arg: any): void {
        Swordfish.importGlossaryWindow.close();
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Importing glossary');
        Swordfish.sendRequest('/glossaries/import', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
                Swordfish.currentStatus = data;
                let processId: string = data.process;
                let intervalObject: NodeJS.Timeout = setInterval(() => {
                    if (Swordfish.currentStatus.status === Swordfish.SUCCESS) {
                        if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            clearInterval(intervalObject);
                            Swordfish.showMessage({ type: 'info', message: 'Imported ' + Swordfish.currentStatus.imported + ' terms.' });
                            return;
                        }
                    }
                    if (Swordfish.currentStatus.status === Swordfish.ERROR) {
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                        return;
                    }
                    Swordfish.getGlossariesProgress(processId);
                }, 500);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showConcordanceWindow(memories: string[]): void {
        this.concordanceSearchWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 470,
            height: 300,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.concordanceMemories = memories;
        this.concordanceSearchWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'concordanceSearch.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.concordanceSearchWindow.loadURL(fileUrl.href);
        this.concordanceSearchWindow.once('ready-to-show', () => {
            this.concordanceSearchWindow.show();
        });
        this.concordanceSearchWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.concordanceSearchWindow, 'concordanceSearch.html');
    }

    static concordanceSearch(event: IpcMainEvent, arg: any): void {
        event.sender.send('start-waiting');
        Swordfish.sendRequest('/memories/concordance', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    event.sender.send('end-waiting');
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                Swordfish.currentStatus = data;
                let processId: string = data.process;
                let intervalObject: NodeJS.Timeout = setInterval(() => {
                    if (Swordfish.currentStatus.status === Swordfish.SUCCESS) {
                        if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                            clearInterval(intervalObject);
                            Swordfish.concordanceResults(Swordfish.currentStatus);
                            event.sender.send('end-waiting');
                            return;
                        }
                    }
                    if (Swordfish.currentStatus.status === Swordfish.ERROR) {
                        event.sender.send('end-waiting');
                        clearInterval(intervalObject);
                        Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                        return;
                    }
                    Swordfish.getMemoriesProgress(processId);
                }, 500);
            },
            (reason: string) => {
                event.sender.send('end-waiting');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static concordanceResults(data: any): void {
        if (data.count === 0) {
            Swordfish.showMessage({ type: 'info', message: 'Text not found' });
            return;
        }
        let size: Rectangle = Swordfish.mainWindow.getBounds();
        let htmlViewerWindow: BrowserWindow = new BrowserWindow({
            parent: Swordfish.concordanceSearchWindow,
            width: size.width * 0.6,
            height: size.height * 0.4,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.htmlContent = data.html;
        Swordfish.htmlTitle = 'Concordance Search';
        Swordfish.htmlId = htmlViewerWindow.id;
        htmlViewerWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'htmlViewer.html');
        let fileUrl: URL = new URL('file://' + filePath);
        htmlViewerWindow.loadURL(fileUrl.href);
        htmlViewerWindow.once('ready-to-show', () => {
            htmlViewerWindow.show();
        });
        htmlViewerWindow.on('close', () => {
            this.concordanceSearchWindow.focus();
        });
    }

    static showIatePlugin(): void {
        this.iatePluginWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 600,
            height: 510,
            minimizable: true,
            maximizable: false,
            resizable: true,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.iatePluginWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'iatePlugin.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.iatePluginWindow.loadURL(fileUrl.href);
        this.iatePluginWindow.once('ready-to-show', () => {
            this.iatePluginWindow.show();
        });
        this.iatePluginWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.iatePluginWindow, 'iatePlugin.html');
    }

    static showTermSearch(glossary: string): any {
        this.termSearchWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 500,
            height: 280,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.selectedGlossary = glossary;
        this.termSearchWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'termSearch.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.termSearchWindow.loadURL(fileUrl.href);
        this.termSearchWindow.once('ready-to-show', () => {
            this.termSearchWindow.show();
        });
        this.termSearchWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.termSearchWindow, 'termSearch.html');
    }

    static termSearch(arg: any): void {
        Swordfish.sendRequest('/glossaries/search', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                if (data.count === 0) {
                    Swordfish.showMessage({ type: 'info', message: 'Term not found' });
                    return;
                }
                let size: Rectangle = Swordfish.mainWindow.getBounds();
                let htmlViewerWindow: BrowserWindow = new BrowserWindow({
                    parent: Swordfish.termSearchWindow,
                    width: size.width * 0.6,
                    height: size.height * 0.4,
                    minimizable: false,
                    maximizable: false,
                    resizable: true,
                    show: false,
                    icon: this.iconPath,
                    webPreferences: {
                        nodeIntegration: true,
                        contextIsolation: false
                    }
                });
                Swordfish.htmlTitle = 'Term Search';
                Swordfish.htmlContent = data.html;
                Swordfish.htmlId = htmlViewerWindow.id;
                htmlViewerWindow.setMenu(null);
                let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'htmlViewer.html');
                let fileUrl: URL = new URL('file://' + filePath);
                htmlViewerWindow.loadURL(fileUrl.href);
                htmlViewerWindow.once('ready-to-show', () => {
                    htmlViewerWindow.show();
                });
                htmlViewerWindow.on('close', () => {
                    this.termSearchWindow.focus();
                });

            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showAddTerm(glossary: string): void {
        this.addTermWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 680,
            height: 190,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.selectedGlossary = glossary;
        this.addTermWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addTerm.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.addTermWindow.loadURL(fileUrl.href);
        this.addTermWindow.once('ready-to-show', () => {
            this.addTermWindow.show();
        });
        this.addTermWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.addTermWindow, 'addTerm.html');
    }

    static addToGlossary(arg: { glossary: string, sourceTerm: string, targetTerm: string, srcLang: string, tgtLang: string }): void {
        this.addTermWindow.close();
        Swordfish.sendRequest('/glossaries/addTerm', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getSegmentTerms(arg: any): void {
        Swordfish.sendRequest('/projects/getSegmentTerms', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                if (data.terms.length > 0) {
                    Swordfish.mainWindow.webContents.send('set-terms', { project: arg.project, terms: data.terms });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getProjectTerms(arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Get terms for all segments?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                Swordfish.mainWindow.webContents.send('start-waiting');
                Swordfish.mainWindow.webContents.send('set-status', 'Getting terms');
                Swordfish.sendRequest('/projects/getProjectTerms', arg,
                    (data: any) => {
                        if (data.status !== Swordfish.SUCCESS) {
                            Swordfish.mainWindow.webContents.send('end-waiting');
                            Swordfish.mainWindow.webContents.send('set-status', '');
                            Swordfish.showMessage({ type: 'error', message: data.reason });
                        }
                        Swordfish.currentStatus = data;
                        let processId: string = data.process;
                        let intervalObject: NodeJS.Timeout = setInterval(() => {
                            if (Swordfish.currentStatus.progress) {
                                if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    if (Swordfish.currentStatus.segments > 0) {
                                        Swordfish.mainWindow.webContents.send('reload-page', arg.project);
                                        Swordfish.showMessage({ type: 'info', message: 'Added terms to ' + Swordfish.currentStatus.segments + ' segments' });
                                        return;
                                    }
                                    Swordfish.showMessage({ type: 'info', message: 'Terms not found' });
                                    return;
                                } else if (Swordfish.currentStatus.progress === Swordfish.PROCESSING) {
                                    // it's OK, keep waiting
                                } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                                    return;
                                } else {
                                    Swordfish.mainWindow.webContents.send('end-waiting');
                                    Swordfish.mainWindow.webContents.send('set-status', '');
                                    clearInterval(intervalObject);
                                    Swordfish.showMessage({ type: 'error', message: 'Unknown error getting terms' });
                                    return;
                                }
                            }
                            Swordfish.getProjectsProgress(processId);
                        }, 500);
                    },
                    (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        });
    }

    static lockSegment(arg: any): void {
        Swordfish.sendRequest('/projects/lockSegment', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static lockDuplicates(arg: any): void {
        Swordfish.sendRequest('/projects/lockDuplicates', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                Swordfish.mainWindow.webContents.send('reload-page', arg.project);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static unlockAll(projectId: string): void {
        Swordfish.sendRequest('/projects/unlockAll', { project: projectId },
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                Swordfish.mainWindow.webContents.send('reload-page', projectId);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static analyzeSpaces(projectId: string): void {
        Swordfish.activeProject = projectId;
        Swordfish.spaceAnalysisWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 540,
            height: 350,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.spaceAnalysisWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'spaceAnalysis.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.spaceAnalysisWindow.loadURL(fileUrl.href);
        Swordfish.spaceAnalysisWindow.once('ready-to-show', () => {
            Swordfish.spaceAnalysisWindow.show();
        });
        Swordfish.spaceAnalysisWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(Swordfish.spaceAnalysisWindow, 'spaceAnalysis.html');
    }

    static analyzeTags(projectId: string): void {
        Swordfish.activeProject = projectId;
        Swordfish.tagsAnalysisWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 400,
            height: 350,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.tagsAnalysisWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'tagsAnalysis.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.tagsAnalysisWindow.loadURL(fileUrl.href);
        Swordfish.tagsAnalysisWindow.once('ready-to-show', () => {
            Swordfish.tagsAnalysisWindow.show();
        });
        Swordfish.tagsAnalysisWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(Swordfish.tagsAnalysisWindow, 'tagsAnalysis.html');
    }

    static getTagErrors(event: IpcMainEvent): void {
        Swordfish.sendRequest('/projects/analyzeTags', { project: Swordfish.activeProject },
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                event.sender.send('set-tagsErrors', data);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getSpaceErrors(event: IpcMainEvent): void {
        Swordfish.sendRequest('/projects/analyzeSpaces', { project: Swordfish.activeProject },
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                event.sender.send('set-spaceErrors', data);
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static fixSpaceErrors(event: IpcMainEvent): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Fixing spaces');
        Swordfish.sendRequest('/projects/fixSpaces', { project: Swordfish.activeProject },
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                event.sender.send('set-spaceErrors', data);
                Swordfish.mainWindow.webContents.send('reload-page', Swordfish.activeProject);
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static openPrompt(args: any): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Generating Prompt');
        Swordfish.sendRequest('/projects/getSegment', args,
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                try {
                    if (data.status !== Swordfish.SUCCESS) {
                        console.error('Swordfish.generatePrompt', data);
                    } else {
                        let source: XMLElement = MTUtils.toXMLElement(data.source);
                        let prompt: string = MTUtils.getRole(data.srcLang, data.tgtLang) + ' ' + MTUtils.generatePrompt(source, data.srcLang, data.tgtLang, data.terms);
                        Swordfish.showPromptDialog(prompt);
                    }
                } catch (e) {
                    if (e instanceof Error) {
                        Swordfish.showMessage({ type: 'error', message: e.message });
                    }
                }
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static generatePrompt(args: any): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Generating Prompt');
        Swordfish.sendRequest('/projects/getSegment', args,
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                try {
                    if (data.status !== Swordfish.SUCCESS) {
                        console.error('Swordfish.generatePrompt', data);
                    } else {
                        let source: XMLElement = MTUtils.toXMLElement(data.source);
                        let prompt: string = MTUtils.getRole(data.srcLang, data.tgtLang) + ' ' + MTUtils.generatePrompt(source, data.srcLang, data.tgtLang, data.terms);
                        clipboard.writeText(prompt);
                        Swordfish.showNotification('Prompt copied to clipboard');
                    }
                } catch (e) {
                    if (e instanceof Error) {
                        Swordfish.showMessage({ type: 'error', message: e.message });
                    }
                }
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showPromptDialog(prompt: string): void {
        if (this.promptWindow && !this.promptWindow.isDestroyed()) {
            this.promptWindow.webContents.send('set-prompt', prompt);
            this.promptWindow.focus();
        } else {
            this.promptWindow = new BrowserWindow({
                parent: this.mainWindow,
                width: 680,
                height: 560,
                minimizable: false,
                maximizable: false,
                resizable: true,
                show: false,
                icon: this.iconPath,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            });
            this.promptWindow.setMenu(null);
            let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'promptDialog.html');
            let fileUrl: URL = new URL('file://' + filePath);
            this.promptWindow.loadURL(fileUrl.href);
        }
        this.promptWindow.once('ready-to-show', () => {
            this.promptWindow.webContents.send('set-prompt', prompt);
            this.promptWindow.show();
        });
        this.promptWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.promptWindow, 'promptDialog.html');
    }

    static insertAiResponse(): void {
        let clipboardText: string = clipboard.readText();
        try {
            let target: XMLElement = MTUtils.toXMLElement(clipboardText);
            if (target.getName() === 'target') {
                this.mainWindow.webContents.send('insert-ai-response', target.toString());
            } else {
                Swordfish.showMessage({ type: 'error', message: 'Invalid AI response: ' + clipboardText });
                return;
            }
        } catch (e) {
            if (e instanceof Error) {
                Swordfish.showMessage({ type: 'error', message: 'Invalid AI response: ' + clipboardText });
                return;
            }
        }
    }

    static insertResponse(aiResponse: any): void {
        Swordfish.sendRequest('/projects/setTarget', aiResponse,
            (data: any) => {
                if (data.status === Swordfish.SUCCESS) {
                    Swordfish.mainWindow.webContents.send('set-target', data);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static fixTags(args: any): void {
        if (!(Swordfish.currentPreferences.chatGpt.enabled || Swordfish.currentPreferences.anthropic.enabled || Swordfish.currentPreferences.mistral.enabled)) {
            Swordfish.showMessage({ type: 'error', message: 'No AI engine is currently enabled' });
            return;
        }
        if (!(Swordfish.currentPreferences.chatGpt.fixTags || Swordfish.currentPreferences.anthropic.fixTags || Swordfish.currentPreferences.mistral.fixTags)) {
            Swordfish.showMessage({ type: 'error', message: 'No AI engine is currently configured to fix tags' });
            return;
        }
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Fixing tags');
        Swordfish.sendRequest('/projects/getSegment', args,
            (data: any) => {
                try {
                    if (data.status !== Swordfish.SUCCESS) {
                        console.error('Swordfish.fixTags', data);
                    } else {
                        let mtManager: MTManager = new MTManager(Swordfish.currentPreferences, args.srcLang, args.tgtLang);
                        data.project = args.project;
                        data.file = args.file;
                        data.unit = args.unit;
                        data.segment = args.segment;
                        mtManager.fixTags(data);
                    }
                } catch (e) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    if (e instanceof Error) {
                        Swordfish.showMessage({ type: 'error', message: e.message });
                    }
                }
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static updateTarget(params: any): void {
        Swordfish.mainWindow.webContents.send('update-target-cell', params);
        Swordfish.mainWindow.webContents.send('end-waiting');
        Swordfish.mainWindow.webContents.send('set-status', '');
    }

    static getAiEngines(event: IpcMainEvent): void {
        let prefs = Swordfish.currentPreferences;
        let engines: { shortName: string; name: string }[] = [];
        if (prefs.chatGpt.enabled) engines.push({ shortName: 'ChatGPT', name: 'ChatGPT' });
        if (prefs.anthropic.enabled) engines.push({ shortName: 'Claude', name: 'Claude (Anthropic)' });
        if (prefs.mistral.enabled) engines.push({ shortName: 'Mistral', name: 'Mistral' });
        if (prefs.gemini.enabled) engines.push({ shortName: 'Gemini', name: 'Gemini' });
        if (prefs.qwen.enabled) engines.push({ shortName: 'Qwen', name: 'Qwen' });
        if (prefs.glm.enabled) engines.push({ shortName: 'GLM', name: 'GLM' });
        if (prefs.doubao.enabled) engines.push({ shortName: 'Doubao', name: 'Doubao' });
        event.sender.send('set-ai-engines', engines);
    }

    static aiChat(event: IpcMainEvent, arg: { messages: { role: string; content: string }[]; engine: string; sourceText?: string; targetText?: string; srcLang?: string; tgtLang?: string }): void {
        let prefs = Swordfish.currentPreferences;
        let apiUrl = '';
        let apiKey = '';
        let model = '';

        switch (arg.engine) {
            case 'ChatGPT':
                apiUrl = 'https://api.openai.com/v1/chat/completions';
                apiKey = prefs.chatGpt.apiKey;
                model = prefs.chatGpt.model;
                break;
            case 'Claude':
                apiUrl = 'https://api.anthropic.com/v1/messages';
                apiKey = prefs.anthropic.apiKey;
                model = prefs.anthropic.model;
                break;
            case 'Mistral':
                apiUrl = 'https://api.mistral.ai/v1/chat/completions';
                apiKey = prefs.mistral.apiKey;
                model = prefs.mistral.model;
                break;
            case 'Gemini':
                apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
                apiKey = prefs.gemini.apiKey;
                model = prefs.gemini.model;
                break;
            case 'Qwen':
                apiUrl = prefs.qwen.region === 'china'
                    ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
                    : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
                apiKey = prefs.qwen.apiKey;
                model = prefs.qwen.model;
                break;
            case 'GLM':
                apiUrl = prefs.glm.endpoint === 'coding'
                    ? 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions'
                    : 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
                apiKey = prefs.glm.apiKey;
                model = prefs.glm.model;
                break;
            case 'Doubao':
                apiUrl = prefs.doubao.endpoint === 'coding'
                    ? 'https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions'
                    : 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
                apiKey = prefs.doubao.apiKey;
                model = prefs.doubao.model;
                break;
            default:
                event.sender.send('ai-chat-error', { error: 'Unknown engine: ' + arg.engine });
                return;
        }

        if (!apiKey) {
            event.sender.send('ai-chat-error', { error: 'API key not configured for ' + arg.engine });
            return;
        }

        let systemPrompt = Swordfish.MONTEREY_PROMPT;
        if (arg.sourceText) {
            systemPrompt += '\n\n当前段落：';
            systemPrompt += '\n源文 (' + (arg.srcLang || 'unknown') + '): ' + arg.sourceText;
            if (arg.targetText) {
                systemPrompt += '\n学生译文 (' + (arg.tgtLang || 'unknown') + '): ' + arg.targetText;
            } else {
                systemPrompt += '\n学生尚未翻译此段。';
            }
        } else {
            systemPrompt += '\n\n当前无选中段落，请回答一般的翻译学习问题。';
        }

        let messages: { role: string; content: string }[] = [
            { role: 'system', content: systemPrompt },
            ...arg.messages
        ];

        // Claude uses a different API format
        if (arg.engine === 'Claude') {
            let claudeMessages = messages.filter(m => m.role !== 'system').map(m => ({
                role: m.role,
                content: m.content
            }));
            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: claudeMessages
                })
            }).then(response => {
                if (!response.ok) return response.json().then(d => Promise.reject(d.error?.message || response.statusText));
                return response.json();
            }).then((data: any) => {
                let content = data.content[0].text;
                event.sender.send('ai-chat-response', { content: content });
            }).catch((error: any) => {
                event.sender.send('ai-chat-error', { error: String(error.message || error) });
            });
        } else {
            // OpenAI-compatible format with streaming (ChatGPT, Mistral, Gemini, Qwen, GLM, Doubao)
            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: true
                })
            }).then(async (response) => {
                if (!response.ok) {
                    let errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error?.message || response.statusText);
                }
                let reader = response.body!.getReader();
                let decoder = new TextDecoder();
                let fullContent = '';
                let buffer = '';
                while (true) {
                    let { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (let line of lines) {
                        line = line.trim();
                        if (!line || !line.startsWith('data:')) continue;
                        let data = line.startsWith('data: ') ? line.substring(6) : line.substring(5);
                        if (data === '[DONE]') continue;
                        try {
                            let json = JSON.parse(data);
                            let delta = json.choices?.[0]?.delta?.content;
                            if (delta) {
                                fullContent += delta;
                                event.sender.send('ai-chat-stream', { content: fullContent });
                            }
                        } catch (_e) {
                            // skip malformed lines
                        }
                    }
                }
                event.sender.send('ai-chat-response', { content: fullContent });
            }).catch((error: any) => {
                event.sender.send('ai-chat-error', { error: String(error.message || error) });
            });
        }
    }

    // ---- Training Mode Methods ----

    static trainingDataPath(): string {
        return join(app.getPath('appData'), app.name, 'training.json');
    }

    static loadTrainingData(): any {
        let path = Swordfish.trainingDataPath();
        if (!existsSync(path)) {
            return { exercises: [] };
        }
        try {
            return JSON.parse(readFileSync(path, 'utf-8'));
        } catch {
            return { exercises: [] };
        }
    }

    static saveTrainingData(data: any): void {
        writeFileSync(Swordfish.trainingDataPath(), JSON.stringify(data, null, 2), 'utf-8');
    }

    static historyDataPath(): string {
        return join(app.getPath('appData'), app.name, 'trainingHistory.json');
    }

    static loadHistory(): any {
        let path = Swordfish.historyDataPath();
        if (!existsSync(path)) {
            return { history: [] };
        }
        try {
            return JSON.parse(readFileSync(path, 'utf-8'));
        } catch {
            return { history: [] };
        }
    }

    static saveHistory(data: any): void {
        writeFileSync(Swordfish.historyDataPath(), JSON.stringify(data, null, 2), 'utf-8');
    }

    static showImportCsv(): void {
        this.importCsvWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 560, height: 440,
            minimizable: false, maximizable: false, resizable: true,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.importCsvWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'csvImport.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.importCsvWindow.loadURL(fileUrl.href);
        this.importCsvWindow.once('ready-to-show', () => { this.importCsvWindow.show(); });
        this.importCsvWindow.on('close', () => { this.mainWindow.focus(); });
        Swordfish.setLocation(this.importCsvWindow, 'csvImport.html');
    }

    static browseCsvImport(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'Select CSV File',
            properties: ['openFile'],
            filters: [
                { name: 'CSV / TSV Files', extensions: ['csv', 'tsv', 'txt', 'tab'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-csv-file', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static parseCsvPreview(event: IpcMainEvent, arg: { path: string }): void {
        try {
            let rows = Swordfish.parseCsvFile(arg.path);
            let previewRows: string[][] = [];
            let maxRows = Math.min(5, rows.length);
            for (let i = 0; i < maxRows; i++) {
                previewRows.push([rows[i][0] || '', rows[i][1] || '']);
            }
            event.sender.send('set-csv-preview', previewRows);
        } catch (e: any) {
            event.sender.send('set-csv-preview', [['Error reading file', e.message]]);
        }
    }

    static showClipboardImport(): void {
        this.clipboardImportWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 560, height: 540,
            minimizable: false, maximizable: false, resizable: true,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.clipboardImportWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'clipboardImport.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.clipboardImportWindow.loadURL(fileUrl.href);
        this.clipboardImportWindow.once('ready-to-show', () => { this.clipboardImportWindow.show(); });
        this.clipboardImportWindow.on('close', () => { this.mainWindow.focus(); });
        Swordfish.setLocation(this.clipboardImportWindow, 'clipboardImport.html');
    }

    static parseClipboardText(text: string): string[][] {
        let pairs: string[][] = [];
        // Normalize line endings and split
        let lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        for (let line of lines) {
            let trimmed = line.trim();
            if (!trimmed) continue;
            // Find boundary: last CJK character/punctuation before English text starts
            // Pattern: Chinese text (may contain multiple sentences) followed by English text
            let match = trimmed.match(/^([\s\S]*[一-鿿　-〿＀-￯])\s*([A-Z""''][\s\S]*)$/);
            if (match) {
                let source = match[1].trim();
                let target = match[2].trim();
                if (source && target) {
                    pairs.push([source, target]);
                }
            }
        }
        return pairs;
    }

    static parseClipboardPreview(event: IpcMainEvent, arg: { text: string; srcLang: string; tgtLang: string }): void {
        let pairs = Swordfish.parseClipboardText(arg.text);
        // If srcLang is English, swap source/target
        let previewRows: string[][] = [];
        let isSrcEnglish = arg.srcLang.startsWith('en');
        for (let pair of pairs) {
            if (isSrcEnglish) {
                previewRows.push([pair[1], pair[0]]);
            } else {
                previewRows.push(pair);
            }
        }
        event.sender.send('set-clipboard-preview', previewRows);
    }

    static importClipboard(arg: { projectName: string; text: string; srcLang: string; tgtLang: string }): void {
        let pairs = Swordfish.parseClipboardText(arg.text);
        let isSrcEnglish = arg.srcLang.startsWith('en');
        let sources: string[] = [];
        let references: string[] = [];
        for (let pair of pairs) {
            if (isSrcEnglish) {
                sources.push(pair[1]);
                references.push(pair[0]);
            } else {
                sources.push(pair[0]);
                references.push(pair[1]);
            }
        }
        if (sources.length === 0) {
            if (Swordfish.clipboardImportWindow && !Swordfish.clipboardImportWindow.isDestroyed()) {
                Swordfish.clipboardImportWindow.close();
            }
            Swordfish.showMessage({ type: 'error', message: 'No valid bilingual pairs found in pasted text' });
            return;
        }
        // Reuse the existing XLIFF + TMX import flow
        Swordfish.importFromSources(arg, sources, references);
    }

    static importFromSources(arg: { projectName: string; srcLang: string; tgtLang: string }, sources: string[], references: string[]): void {
        let xliffId = 'training-' + Date.now();
        let xliffPath = join(app.getPath('temp'), xliffId + '.xlf');
        let sklPath = xliffPath.replace('.xlf', '.skl');
        let xliffContent = '<?xml version="1.0" encoding="UTF-8" ?>\n';
        xliffContent += '<xliff srcLang="' + arg.srcLang + '" trgLang="' + arg.tgtLang + '" version="2.1"\n';
        xliffContent += '  xmlns="urn:oasis:names:tc:xliff:document:2.0"\n';
        xliffContent += '  xmlns:mda="urn:oasis:names:tc:xliff:metadata:2.0">\n';
        xliffContent += '  <file original="' + xliffId + '" id="1">\n';
        xliffContent += '    <skeleton href="' + Swordfish.escapeXml(sklPath) + '"/>\n';
        xliffContent += '    <mda:metadata>\n';
        xliffContent += '      <mda:metaGroup category="format">\n';
        xliffContent += '        <mda:meta type="datatype">plaintext</mda:meta>\n';
        xliffContent += '      </mda:metaGroup>\n';
        xliffContent += '      <mda:metaGroup category="tool">\n';
        xliffContent += '        <mda:meta type="tool-id">OpenXLIFF</mda:meta>\n';
        xliffContent += '        <mda:meta type="tool-name">OpenXLIFF Filters</mda:meta>\n';
        xliffContent += '        <mda:meta type="tool-version">5.1.0</mda:meta>\n';
        xliffContent += '      </mda:metaGroup>\n';
        xliffContent += '      <mda:metaGroup category="PI">\n';
        xliffContent += '        <mda:meta type="encoding">UTF-8</mda:meta>\n';
        xliffContent += '      </mda:metaGroup>\n';
        xliffContent += '    </mda:metadata>\n';
        for (let i = 0; i < sources.length; i++) {
            xliffContent += '    <unit id="' + (i + 1) + '">\n';
            xliffContent += '      <segment id="' + (i + 1) + '">\n';
            xliffContent += '        <source>' + Swordfish.escapeXml(sources[i]) + '</source>\n';
            xliffContent += '      </segment>\n';
            xliffContent += '    </unit>\n';
        }
        xliffContent += '  </file>\n';
        xliffContent += '</xliff>';

        writeFileSync(xliffPath, xliffContent, 'utf-8');
        writeFileSync(sklPath, '', 'utf-8');

        // Close dialog
        if (Swordfish.clipboardImportWindow && !Swordfish.clipboardImportWindow.isDestroyed()) {
            Swordfish.clipboardImportWindow.close();
        }
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Importing Clipboard Exercise');

        let importParams = {
            xliff: xliffPath,
            project: arg.projectName,
            subject: 'training',
            client: 'training',
            memory: 'none',
            glossary: 'none'
        };
        Swordfish.sendRequest('/projects/import', importParams, (data: any) => {
            if (data.status !== Swordfish.SUCCESS) {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: data.reason });
                return;
            }
            Swordfish.currentStatus = data;
            let processId: string = data.process;
            let intervalObject: NodeJS.Timeout = setInterval(() => {
                if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                    clearInterval(intervalObject);
                    let projectId = processId;
                    Swordfish.createReferenceTm(arg, projectId, sources, references, xliffPath);
                } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    clearInterval(intervalObject);
                    Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                } else {
                    Swordfish.sendRequest('/projects/status', { process: processId },
                        (d: any) => { Swordfish.currentStatus = d; },
                        (reason: string) => { Swordfish.showMessage({ type: 'error', message: reason }); }
                    );
                }
            }, 2500);
        }, (reason: string) => {
            Swordfish.mainWindow.webContents.send('end-waiting');
            Swordfish.mainWindow.webContents.send('set-status', '');
            Swordfish.showMessage({ type: 'error', message: reason });
        });
    }

    static importCsv(arg: { projectName: string; filePath: string; srcLang: string; tgtLang: string }): void {
        try {
            let rows = Swordfish.parseCsvFile(arg.filePath);
            let sources: string[] = [];
            let references: string[] = [];
            for (let cols of rows) {
                if (cols[0] && cols[0].trim()) {
                    sources.push(cols[0].trim());
                    references.push((cols[1] || '').trim());
                }
            }
            if (sources.length === 0) {
                if (Swordfish.webImportWindow && !Swordfish.webImportWindow.isDestroyed()) {
                    Swordfish.webImportWindow.close();
                } else if (Swordfish.importCsvWindow && !Swordfish.importCsvWindow.isDestroyed()) {
                    Swordfish.importCsvWindow.close();
                }
                Swordfish.showMessage({ type: 'error', message: 'No valid rows found in CSV file' });
                return;
            }

            // Close dialog
            if (Swordfish.webImportWindow && !Swordfish.webImportWindow.isDestroyed()) {
                Swordfish.webImportWindow.close();
            } else if (Swordfish.importCsvWindow && !Swordfish.importCsvWindow.isDestroyed()) {
                Swordfish.importCsvWindow.close();
            }
            Swordfish.importFromSources(arg, sources, references);
        } catch (e: any) {
            if (Swordfish.importCsvWindow && !Swordfish.importCsvWindow.isDestroyed()) {
                Swordfish.importCsvWindow.close();
            }
            Swordfish.showMessage({ type: 'error', message: 'Error reading CSV: ' + e.message });
        }
    }

    static createReferenceTm(arg: { projectName: string; srcLang: string; tgtLang: string }, projectId: string, sources: string[], references: string[], xliffPath: string): void {
        Swordfish.mainWindow.webContents.send('set-status', 'Creating reference TM...');
        let tmId = '' + Date.now();
        Swordfish.sendRequest('/memories/create', {
            id: tmId,
            name: arg.projectName + ' Reference',
            sourceLang: arg.srcLang,
            targetLang: arg.tgtLang,
            client: 'training',
            subject: 'training',
            project: arg.projectName
        }, (data: any) => {
            if (data.status !== Swordfish.SUCCESS) {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: data.reason });
                return;
            }

            // Generate TMX 1.4
            let tmxContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
            tmxContent += '<tmx version="1.4">\n';
            tmxContent += '  <header creationtool="SwordfishEdu" creationtoolversion="1.0" datatype="plaintext" segtype="sentence" adminlang="en" srclang="' + arg.srcLang + '" o-tmf="TMX"/>\n';
            tmxContent += '  <body>\n';
            for (let i = 0; i < sources.length; i++) {
                tmxContent += '    <tu>\n';
                tmxContent += '      <tuv xml:lang="' + arg.srcLang + '"><seg>' + Swordfish.escapeXml(sources[i]) + '</seg></tuv>\n';
                tmxContent += '      <tuv xml:lang="' + arg.tgtLang + '"><seg>' + Swordfish.escapeXml(references[i]) + '</seg></tuv>\n';
                tmxContent += '    </tu>\n';
            }
            tmxContent += '  </body>\n';
            tmxContent += '</tmx>';

            let tmxPath = join(app.getPath('temp'), 'training-ref-' + Date.now() + '.tmx');
            writeFileSync(tmxPath, tmxContent, 'utf-8');

            // Import TMX into reference TM
            Swordfish.mainWindow.webContents.send('set-status', 'Importing reference translations...');
            Swordfish.sendRequest('/memories/import', {
                memory: tmId,
                tmx: tmxPath
            }, (data2: any) => {
                if (data2.status !== Swordfish.SUCCESS) {
                    Swordfish.mainWindow.webContents.send('end-waiting');
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    Swordfish.showMessage({ type: 'error', message: data2.reason });
                    return;
                }
                Swordfish.currentStatus = data2;
                let processId2: string = data2.process;
                let intervalObject2: NodeJS.Timeout = setInterval(() => {
                    if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                        clearInterval(intervalObject2);
                        // Save training metadata
                        let trainingData = Swordfish.loadTrainingData();
                        trainingData.exercises.push({
                            projectId: projectId,
                            projectName: arg.projectName,
                            referenceTmId: tmId,
                            srcLang: arg.srcLang,
                            tgtLang: arg.tgtLang,
                            segmentCount: sources.length,
                            references: references
                        });
                        Swordfish.saveTrainingData(trainingData);

                        // Clean up temp files
                        try { unlinkSync(xliffPath); } catch { /* ignore */ }
                        try { unlinkSync(tmxPath); } catch { /* ignore */ }

                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.mainWindow.webContents.send('refresh-training');
                    } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                        clearInterval(intervalObject2);
                        Swordfish.mainWindow.webContents.send('end-waiting');
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        Swordfish.showMessage({ type: 'error', message: Swordfish.currentStatus.reason });
                    } else {
                        Swordfish.sendRequest('/memories/status', { process: processId2 },
                            (data: any) => { Swordfish.currentStatus = data; },
                            (reason: string) => { Swordfish.showMessage({ type: 'error', message: reason }); }
                        );
                    }
                }, 2500);
            }, (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            });
        }, (reason: string) => {
            Swordfish.mainWindow.webContents.send('end-waiting');
            Swordfish.mainWindow.webContents.send('set-status', '');
            Swordfish.showMessage({ type: 'error', message: reason });
        });
    }

    static parseCsvFile(path: string): string[][] {
        let content = readFileSync(path, 'utf-8');
        // Remove BOM if present
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.substring(1);
        }
        let result: string[][] = [];
        // Split into lines but handle quoted newlines
        let rows = Swordfish.splitCsvRows(content);
        for (let row of rows) {
            if (row.trim() === '') continue;
            let cols = Swordfish.parseCsvLine(row);
            result.push(cols);
        }
        return result;
    }

    static splitCsvRows(content: string): string[] {
        let rows: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < content.length; i++) {
            let ch = content[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
                current += ch;
            } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                if (ch === '\r' && i + 1 < content.length && content[i + 1] === '\n') {
                    i++; // skip \n after \r
                }
                rows.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        if (current.trim() !== '') {
            rows.push(current);
        }
        return rows;
    }

    static parseCsvLine(line: string): string[] {
        // Detect delimiter: tab if line contains tabs, otherwise comma
        let delimiter = line.indexOf('\t') >= 0 ? '\t' : ',';
        let fields: string[] = [];
        let i = 0;
        while (i < line.length) {
            if (line[i] === '"') {
                // Quoted field
                let field = '';
                i++; // skip opening quote
                while (i < line.length) {
                    if (line[i] === '"') {
                        if (i + 1 < line.length && line[i + 1] === '"') {
                            field += '"';
                            i += 2;
                        } else {
                            i++; // skip closing quote
                            break;
                        }
                    } else {
                        field += line[i];
                        i++;
                    }
                }
                fields.push(field);
                // Skip delimiter after closing quote
                if (i < line.length && line[i] === delimiter) i++;
            } else {
                // Unquoted field
                let end = line.indexOf(delimiter, i);
                if (end === -1) {
                    fields.push(line.substring(i));
                    break;
                } else {
                    fields.push(line.substring(i, end));
                    i = end + 1;
                }
            }
        }
        return fields;
    }

    static escapeXml(text: string): string {
        return text
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    static showWebImport(): void {
        this.webImportWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 600, height: 520,
            minimizable: false, maximizable: false, resizable: true,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.webImportWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'webImport.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.webImportWindow.loadURL(fileUrl.href);
        this.webImportWindow.once('ready-to-show', () => { this.webImportWindow.show(); });
        this.webImportWindow.on('close', () => { this.mainWindow.focus(); });
        Swordfish.setLocation(this.webImportWindow, 'webImport.html');
    }

    static fetchHtml(url: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let request: ClientRequest = net.request({
                url: url,
                session: session.defaultSession
            });
            request.setHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            let responseData: string = '';
            request.on('response', (response: IncomingMessage) => {
                response.on('data', (chunk: Buffer) => {
                    responseData += chunk.toString();
                });
                response.on('end', () => {
                    resolve(responseData);
                });
            });
            request.on('error', (error: Error) => {
                reject(error.message);
            });
            request.end();
        });
    }

    static parseReciyiHtml(html: string): Array<{ source: string; target: string }> {
        let start = html.indexOf("id='articleMeta'");
        if (start === -1) start = html.indexOf('id="articleMeta"');
        let end = html.indexOf("class='disclaimer'");
        if (end === -1) end = html.indexOf('class="disclaimer"');
        if (start === -1 || end === -1) return [];
        let content = html.substring(start, end);

        const cellRegex = /class=['"][^'"]*parasmalldiv[^'"]*['"]\s*>([\s\S]*?)<\/div>/g;
        let cells: string[] = [];
        let match;
        while ((match = cellRegex.exec(content)) !== null) {
            let text = match[1].trim();
            // Strip HTML tags and decode entities
            text = text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '');
            if (text) cells.push(text);
        }

        let pairs: Array<{ source: string; target: string }> = [];
        for (let i = 0; i + 1 < cells.length; i += 2) {
            if (cells[i] && cells[i + 1]) {
                pairs.push({ source: cells[i], target: cells[i + 1] });
            }
        }
        return pairs;
    }

    static resolvePageUrl(url: string, page: number): string {
        if (url.indexOf('{n}') !== -1) {
            return url.replace('{n}', String(page));
        }
        // Support -n.html pattern (e.g. 9889-n.html → 9889-1.html)
        return url.replace(/-n\./, '-' + page + '.');
    }

    static previewWebImport(event: IpcMainEvent, arg: { url: string; startPage: number }): void {
        let url = Swordfish.resolvePageUrl(arg.url, arg.startPage);
        Swordfish.fetchHtml(url).then((html: string) => {
            let pairs = Swordfish.parseReciyiHtml(html);
            let allRows: string[][] = [];
            for (let pair of pairs) {
                allRows.push([pair.source, pair.target]);
            }
            event.sender.send('set-web-preview', allRows);
        }).catch((error: string) => {
            event.sender.send('web-import-error', 'Failed to fetch page: ' + error);
        });
    }

    static importWeb(arg: { projectName: string; url: string; startPage: number; endPage: number; srcLang: string; tgtLang: string }): void {
        let sources: string[] = [];
        let references: string[] = [];
        let totalPages = arg.endPage - arg.startPage + 1;
        let currentPage = 0;

        let fetchNext = (page: number): void => {
            if (page > arg.endPage) {
                // All pages fetched — write temp CSV and import
                if (sources.length === 0) {
                    Swordfish.webImportWindow.webContents.send('web-import-error', 'No bilingual pairs found');
                    return;
                }
                let csvContent = '';
                for (let i = 0; i < sources.length; i++) {
                    csvContent += sources[i].replace(/\t/g, ' ') + '\t' + references[i].replace(/\t/g, ' ') + '\n';
                }
                let csvPath = join(app.getPath('temp'), 'web-import-' + Date.now() + '.csv');
                writeFileSync(csvPath, csvContent, 'utf-8');
                Swordfish.importCsv({
                    projectName: arg.projectName,
                    filePath: csvPath,
                    srcLang: arg.srcLang,
                    tgtLang: arg.tgtLang
                });
                return;
            }

            currentPage++;
            let url = Swordfish.resolvePageUrl(arg.url, page);

            if (Swordfish.webImportWindow && !Swordfish.webImportWindow.isDestroyed()) {
                Swordfish.webImportWindow.webContents.send('web-import-progress', {
                    current: currentPage,
                    total: totalPages
                });
            }

            Swordfish.fetchHtml(url).then((html: string) => {
                let pairs = Swordfish.parseReciyiHtml(html);
                for (let pair of pairs) {
                    sources.push(pair.source);
                    references.push(pair.target);
                }
                fetchNext(page + 1);
            }).catch((error: string) => {
                Swordfish.webImportWindow.webContents.send('web-import-error', 'Failed to fetch page ' + page + ': ' + error);
            });
        };

        fetchNext(arg.startPage);
    }

    static getTrainingExercises(event: IpcMainEvent): void {
        let data = Swordfish.loadTrainingData();
        let exercises = data.exercises || [];
        if (exercises.length === 0) {
            event.sender.send('set-training-exercises', []);
            return;
        }
        let pending = exercises.length;
        for (let ex of exercises) {
            ((exercise: any) => {
                Swordfish.sendRequest('/projects/count', { project: exercise.projectId },
                    (resp: any) => {
                        if (resp.status === Swordfish.SUCCESS && resp.statistics) {
                            exercise.wordCount = resp.statistics.total || 0;
                        }
                        pending--;
                        if (pending === 0) {
                            event.sender.send('set-training-exercises', exercises);
                        }
                    },
                    (_reason: string) => {
                        pending--;
                        if (pending === 0) {
                            event.sender.send('set-training-exercises', exercises);
                        }
                    }
                );
            })(ex);
        }
    }

    static openTraining(arg: { projectId: string; projectName: string; srcLang: string; tgtLang: string }): void {
        Swordfish.mainWindow.webContents.send('add-tab', {
            id: arg.projectId,
            description: arg.projectName,
            sourceLang: arg.srcLang,
            targetLang: arg.tgtLang,
            trainingMode: true
        });
    }

    static deleteTraining(arg: { projectIds: string[] }): void {
        let result = dialog.showMessageBoxSync(Swordfish.mainWindow, {
            icon: this.iconPath,
            type: 'question',
            message: 'Delete selected exercise(s)?',
            detail: 'This action cannot be undone.',
            buttons: ['Cancel', 'Delete'],
            defaultId: 0,
            cancelId: 0
        });
        if (result !== 1) {
            return;
        }
        let data = Swordfish.loadTrainingData();
        for (let pid of arg.projectIds) {
            // Find exercise to get referenceTmId
            let exercise = data.exercises.find((ex: any) => ex.projectId === pid);
            if (exercise) {
                // Delete reference TM
                if (exercise.referenceTmId) {
                    Swordfish.sendRequest('/memories/delete', { memory: exercise.referenceTmId },
                        (_data: any) => { },
                        (_reason: string) => { }
                    );
                }
            }
            // Delete project from backend
            Swordfish.sendRequest('/projects/delete', { project: pid },
                (_data: any) => { },
                (_reason: string) => { }
            );
            // Ask Main to close the tab if open
            Swordfish.mainWindow.webContents.send('close-training-tab', { projectId: pid });
        }
        data.exercises = data.exercises.filter((ex: any) => !arg.projectIds.includes(ex.projectId));
        Swordfish.saveTrainingData(data);
        Swordfish.mainWindow.webContents.send('refresh-training');
    }

    static scoreTranslation(event: IpcMainEvent, arg: { projectId: string; segments: { source: string; target: string }[]; srcLang: string; tgtLang: string }): void {
        let data = Swordfish.loadTrainingData();
        let exercise = data.exercises.find((ex: any) => ex.projectId === arg.projectId);
        if (!exercise) {
            event.sender.send('score-error', { error: 'Training exercise not found' });
            return;
        }

        let prefs = Swordfish.currentPreferences;
        let apiUrl = '';
        let apiKey = '';
        let model = '';
        let engine = '';

        // Pick the first enabled engine
        if (prefs.chatGpt.enabled) { apiUrl = 'https://api.openai.com/v1/chat/completions'; apiKey = prefs.chatGpt.apiKey; model = prefs.chatGpt.model; engine = 'ChatGPT'; }
        else if (prefs.anthropic.enabled) { apiUrl = 'https://api.anthropic.com/v1/messages'; apiKey = prefs.anthropic.apiKey; model = prefs.anthropic.model; engine = 'Claude'; }
        else if (prefs.mistral.enabled) { apiUrl = 'https://api.mistral.ai/v1/chat/completions'; apiKey = prefs.mistral.apiKey; model = prefs.mistral.model; engine = 'Mistral'; }
        else if (prefs.gemini.enabled) { apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'; apiKey = prefs.gemini.apiKey; model = prefs.gemini.model; engine = 'Gemini'; }
        else if (prefs.qwen.enabled) { apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'; apiKey = prefs.qwen.apiKey; model = prefs.qwen.model; engine = 'Qwen'; }
        else if (prefs.glm.enabled) { apiKey = prefs.glm.apiKey; model = prefs.glm.model; engine = 'GLM'; apiUrl = prefs.glm.endpoint === 'coding' ? 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions' : 'https://open.bigmodel.cn/api/paas/v4/chat/completions'; }
        else if (prefs.doubao.enabled) { apiKey = prefs.doubao.apiKey; model = prefs.doubao.model; engine = 'Doubao'; apiUrl = prefs.doubao.endpoint === 'coding' ? 'https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions' : 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'; }

        if (!apiKey) {
            event.sender.send('score-error', { error: 'No LLM engine configured. Enable one in Preferences > Machine Translation.' });
            return;
        }

        // Build scoring prompt with student translations and references
        let references: string[] = exercise.references || [];
        let segmentsText = '';
        for (let i = 0; i < arg.segments.length; i++) {
            segmentsText += '\n\n### 第' + (i + 1) + '段';
            segmentsText += '\n**原文：** ' + arg.segments[i].source;
            segmentsText += '\n**学生译文：** ' + arg.segments[i].target;
            if (references[i]) {
                segmentsText += '\n**参考译文：** ' + references[i];
            }
        }

        let systemPrompt = Swordfish.CATTI_PROMPT_V2;
        if (arg.tgtLang === 'en') {
            systemPrompt += Swordfish.IEGS_REFERENCE;
        }
        systemPrompt += '\n\n请对以下翻译练习进行评分：' + segmentsText;

        let messages: { role: string; content: string }[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '请严格按JSON格式输出评分结果，不要添加任何额外文字。' }
        ];

        let handleScoringResponse = (content: string): void => {
            let historyId = Swordfish.saveScoreToHistory(arg, exercise, content, engine);
            let jsonStr = content.trim();
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
            }
            try {
                let structured = JSON.parse(jsonStr);
                if (typeof structured.totalScore === 'number' && Array.isArray(structured.segments)) {
                    // Normalize v2 fields
                    if (structured.version === 2) {
                        let defaults = { meaningTransfer: { max: 40 }, targetMechanics: { max: 30 }, writingQuality: { max: 30 } };
                        if (!structured.subScores) structured.subScores = {};
                        for (let key of Object.keys(defaults)) {
                            if (!structured.subScores[key]) {
                                structured.subScores[key] = { score: 0, max: defaults[key as keyof typeof defaults].max, label: key, errorPoints: 0 };
                            }
                        }
                        if (!structured.errorPoints) structured.errorPoints = 0;
                        if (!structured.qualityPoints) structured.qualityPoints = 0;
                        if (!structured.qualityHighlights) structured.qualityHighlights = [];
                        if (!structured.overallAnalysis && structured.overallComment) {
                            structured.overallAnalysis = structured.overallComment;
                        }
                    }
                    for (let seg of structured.segments) {
                        if (!seg.errors) seg.errors = [];
                        if (!seg.alternativeReferences) seg.alternativeReferences = [];
                    }
                    // Normalize per-segment subScores: distribute top-level max across segments
                    if (structured.version === 2 && structured.segments.length > 0 && structured.subScores) {
                        let segCount = structured.segments.length;
                        let topMax: Record<string, number> = {};
                        for (let key of ['meaningTransfer', 'targetMechanics', 'writingQuality'] as const) {
                            topMax[key] = structured.subScores[key] ? structured.subScores[key].max : (key === 'meaningTransfer' ? 40 : 30);
                        }
                        for (let seg of structured.segments) {
                            if (!seg.subScores) continue;
                            for (let key of ['meaningTransfer', 'targetMechanics', 'writingQuality'] as const) {
                                let sub = seg.subScores[key];
                                if (!sub) continue;
                                let fairMax = Math.round(topMax[key] / segCount);
                                sub.max = fairMax;
                                if (sub.score > fairMax) sub.score = fairMax;
                                if (sub.score < 0) sub.score = 0;
                            }
                        }
                    }
                    // Carry forward reflections
                    let savedReflections: any = {};
                    let history = Swordfish.loadHistory();
                    let prevEntries = history.history.filter((e: any) => e.projectId === arg.projectId && e.reflections);
                    if (prevEntries.length > 0) {
                        let latest = prevEntries[prevEntries.length - 1];
                        savedReflections = latest.reflections;
                    }
                    let scoreData = { result: structured, segments: arg.segments, references: references, rawContent: content, historyId: historyId, savedReflections: savedReflections };
                    event.sender.send('set-score-structured', { result: structured });
                    Swordfish.showScoreReport({ projectId: arg.projectId, scoreData: scoreData });
                    Swordfish.mainWindow.webContents.send('refresh-training');
                    return;
                }
            } catch { /* not JSON, fall through to plain text */ }
            event.sender.send('set-score', { content: content });
        };

        let controller = new AbortController();
        let timeout = setTimeout(() => controller.abort(), 300000);

        if (engine === 'Claude') {
            let claudeMessages = messages.filter(m => m.role !== 'system');
            fetch(apiUrl, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 16384,
                    system: systemPrompt,
                    messages: claudeMessages
                })
            }).then(response => {
                clearTimeout(timeout);
                if (!response.ok) return response.json().then(d => Promise.reject(d.error?.message || response.statusText));
                return response.json();
            }).then((responseData: any) => {
                handleScoringResponse(responseData.content[0].text);
            }).catch((error: any) => {
                clearTimeout(timeout);
                let msg = error.name === 'AbortError' ? '评分超时（5分钟），请重试' : String(error.message || error);
                event.sender.send('score-error', { error: msg });
            });
        } else {
            // OpenAI-compatible with streaming (ChatGPT, Mistral, Gemini, Qwen, GLM, Doubao)
            fetch(apiUrl, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 16384,
                    messages: messages,
                    stream: true
                })
            }).then(async (response) => {
                if (!response.ok) {
                    let errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error?.message || response.statusText);
                }
                let reader = response.body!.getReader();
                let decoder = new TextDecoder();
                let fullContent = '';
                let buffer = '';
                while (true) {
                    let { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (let line of lines) {
                        line = line.trim();
                        if (!line || !line.startsWith('data:')) continue;
                        let data = line.startsWith('data: ') ? line.substring(6) : line.substring(5);
                        if (data === '[DONE]') continue;
                        try {
                            let json = JSON.parse(data);
                            let delta = json.choices?.[0]?.delta?.content;
                            if (delta) {
                                fullContent += delta;
                            }
                        } catch (_e) {
                            // skip malformed lines
                        }
                    }
                }
                clearTimeout(timeout);
                handleScoringResponse(fullContent);
            }).catch((error: any) => {
                clearTimeout(timeout);
                let msg = error.name === 'AbortError' ? '评分超时（5分钟），请重试' : String(error.message || error);
                event.sender.send('score-error', { error: msg });
            });
        }
    }

    static saveScoreToHistory(arg: { projectId: string; segments: { source: string; target: string }[]; srcLang: string; tgtLang: string }, exercise: any, content: string, engine: string): string {
        // Try JSON extraction first, fallback to regex
        let score = 'N/A';
        try {
            let jsonStr = content.trim();
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
            }
            let parsed = JSON.parse(jsonStr);
            if (typeof parsed.totalScore === 'number') {
                score = parsed.totalScore + '/100';
            }
        } catch {
            let scoreMatch = content.match(/总分[：:]\s*(\d+)\s*[\/／]\s*100/);
            if (scoreMatch) {
                score = scoreMatch[1] + '/100';
            }
        }
        let history = Swordfish.loadHistory();
        let historyId = 'hist-' + Date.now();
        history.history.push({
            id: historyId,
            projectId: arg.projectId,
            projectName: exercise.projectName || '',
            timestamp: new Date().toISOString(),
            srcLang: arg.srcLang,
            tgtLang: arg.tgtLang,
            segmentCount: exercise.segmentCount || arg.segments.length,
            translatedCount: arg.segments.length,
            score: score,
            fullResult: content,
            engine: engine,
            segments: arg.segments.map((s, i) => ({
                source: s.source,
                target: s.target,
                reference: (exercise.references || [])[i] || ''
            }))
        });
        Swordfish.saveHistory(history);
        return historyId;
    }

    static getTrainingHistory(event: IpcMainEvent, arg: { projectId?: string }): void {
        let history = Swordfish.loadHistory();
        let entries = history.history || [];
        if (arg.projectId) {
            entries = entries.filter((e: any) => e.projectId === arg.projectId);
        }
        event.sender.send('set-training-history', entries);
    }

    static exportTrainingReport(): void {
        let history = Swordfish.loadHistory();
        let trainingData = Swordfish.loadTrainingData();
        let entries = history.history || [];

        // Group by project
        let byProject: Map<string, any[]> = new Map();
        for (let entry of entries) {
            let list = byProject.get(entry.projectId) || [];
            list.push(entry);
            byProject.set(entry.projectId, list);
        }

        let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Training Report</title>';
        html += '<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;color:#333}';
        html += 'h1{color:#1a73e8}h2{color:#333;border-bottom:2px solid #e0e0e0;padding-bottom:8px;margin-top:40px}';
        html += 'table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}';
        html += 'th{background:#f5f5f5}tr:nth-child(even){background:#fafafa}';
        html += '.score{font-weight:bold;font-size:1.2em}.good{color:#4CAF50}.mid{color:#FF9800}.low{color:#F44336}';
        html += '.bar{display:inline-block;height:20px;background:#4CAF50;color:#fff;text-align:center;line-height:20px;font-size:12px;border-radius:3px}';
        html += '.block{background:#f8f9fa;padding:16px;border-radius:8px;margin:12px 0;white-space:pre-wrap;font-size:14px;line-height:1.6}';
        html += '</style></head><body>';
        html += '<h1>Translation Training Report</h1>';
        html += '<p>Generated: ' + new Date().toLocaleString() + '</p>';

        // Summary
        if (entries.length > 0) {
            let scores = entries.filter((e: any) => e.score !== 'N/A').map((e: any) => parseInt(e.score));
            let avg = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
            html += '<h2>Summary</h2>';
            html += '<table><tr><th>Total Attempts</th><th>Exercises Practiced</th><th>Average Score</th><th>Best Score</th></tr>';
            html += '<tr><td>' + entries.length + '</td><td>' + byProject.size + '</td><td>' + avg + '/100</td>';
            html += '<td>' + (scores.length > 0 ? Math.max(...scores) + '/100' : 'N/A') + '</td></tr></table>';

            // Progress chart (simple bar chart)
            if (entries.length > 1) {
                html += '<h2>Score Trend</h2>';
                let sorted = [...entries].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                for (let entry of sorted) {
                    let scoreVal = parseInt(entry.score) || 0;
                    let color = scoreVal >= 80 ? '#4CAF50' : scoreVal >= 60 ? '#FF9800' : '#F44336';
                    html += '<div style="margin:4px 0"><span style="display:inline-block;width:140px;font-size:12px">' + new Date(entry.timestamp).toLocaleDateString() + ' ' + (entry.projectName || '').substring(0, 20) + '</span>';
                    html += '<span class="bar" style="width:' + (scoreVal * 3) + 'px;background:' + color + '">' + entry.score + '</span></div>';
                }
            }
        }

        // Per-exercise details
        for (let [projectId, projectEntries] of byProject) {
            let exercise = trainingData.exercises.find((ex: any) => ex.projectId === projectId);
            html += '<h2>' + (exercise?.projectName || projectId) + '</h2>';
            html += '<table><tr><th>Date</th><th>Score</th><th>Segments</th><th>Engine</th></tr>';
            let sortedEntries = [...projectEntries].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            for (let entry of sortedEntries) {
                let scoreVal = parseInt(entry.score) || 0;
                let cls = scoreVal >= 80 ? 'good' : scoreVal >= 60 ? 'mid' : 'low';
                html += '<tr><td>' + new Date(entry.timestamp).toLocaleString() + '</td>';
                html += '<td class="score ' + cls + '">' + entry.score + '</td>';
                html += '<td>' + entry.translatedCount + '/' + entry.segmentCount + '</td>';
                html += '<td>' + entry.engine + '</td></tr>';
            }
            html += '</table>';

            // Show latest full result
            if (sortedEntries.length > 0) {
                html += '<h3>Latest Feedback</h3>';
                html += '<div class="block">' + sortedEntries[0].fullResult.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
            }
        }

        html += '</body></html>';

        let reportPath = join(app.getPath('temp'), 'training-report-' + Date.now() + '.html');
        writeFileSync(reportPath, html, 'utf-8');
        shell.openExternal('file://' + reportPath);
    }

    static saveTrainingToTm(event: IpcMainEvent, arg: { projectId: string; segments: { source: string; target: string }[]; srcLang: string; tgtLang: string }): void {
        let data = Swordfish.loadTrainingData();
        let exercise = data.exercises.find((ex: any) => ex.projectId === arg.projectId);
        if (!exercise) {
            event.sender.send('tm-save-error', { error: 'Exercise not found' });
            return;
        }

        let doImport = (tmId: string): void => {
            let tmxContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
            tmxContent += '<tmx version="1.4">\n';
            tmxContent += '  <header creationtool="SwordfishEdu" creationtoolversion="1.0" datatype="plaintext" segtype="sentence" adminlang="en" srclang="' + arg.srcLang + '" o-tmf="TMX"/>\n';
            tmxContent += '  <body>\n';
            for (let seg of arg.segments) {
                tmxContent += '    <tu>\n';
                tmxContent += '      <tuv xml:lang="' + arg.srcLang + '"><seg>' + Swordfish.escapeXml(seg.source) + '</seg></tuv>\n';
                tmxContent += '      <tuv xml:lang="' + arg.tgtLang + '"><seg>' + Swordfish.escapeXml(seg.target) + '</seg></tuv>\n';
                tmxContent += '    </tu>\n';
            }
            tmxContent += '  </body>\n</tmx>';

            let tmxPath = join(app.getPath('temp'), 'student-' + Date.now() + '.tmx');
            writeFileSync(tmxPath, tmxContent, 'utf-8');

            Swordfish.mainWindow.webContents.send('set-status', 'Saving translations to TM...');
            Swordfish.sendRequest('/memories/import', {
                memory: tmId,
                tmx: tmxPath
            }, (responseData: any) => {
                if (responseData.status !== Swordfish.SUCCESS) {
                    Swordfish.mainWindow.webContents.send('set-status', '');
                    event.sender.send('tm-save-error', { error: responseData.reason });
                    return;
                }
                Swordfish.currentStatus = responseData;
                let processId = responseData.process;
                let intervalObject: NodeJS.Timeout = setInterval(() => {
                    if (Swordfish.currentStatus.progress === Swordfish.COMPLETED) {
                        clearInterval(intervalObject);
                        try { unlinkSync(tmxPath); } catch { /* ignore */ }
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        event.sender.send('tm-save-complete');
                    } else if (Swordfish.currentStatus.progress === Swordfish.ERROR) {
                        clearInterval(intervalObject);
                        Swordfish.mainWindow.webContents.send('set-status', '');
                        event.sender.send('tm-save-error', { error: Swordfish.currentStatus.reason });
                    } else {
                        Swordfish.getMemoriesProgress(processId);
                    }
                }, 2500);
            }, (reason: string) => {
                Swordfish.mainWindow.webContents.send('set-status', '');
                event.sender.send('tm-save-error', { error: reason });
            });
        };

        // Use student TM (separate from reference TM)
        if (exercise.studentTmId) {
            doImport(exercise.studentTmId);
        } else {
            // Create student TM on first save
            Swordfish.sendRequest('/memories/create', {
                name: exercise.projectName + ' Student',
                sourceLang: exercise.srcLang,
                targetLang: exercise.tgtLang
            }, (createData: any) => {
                if (createData.status !== Swordfish.SUCCESS) {
                    event.sender.send('tm-save-error', { error: createData.reason });
                    return;
                }
                exercise.studentTmId = createData.id;
                Swordfish.saveTrainingData(data);
                doImport(createData.id);
            }, (reason: string) => {
                event.sender.send('tm-save-error', { error: reason });
            });
        }
    }

    static saveReflection(arg: { historyId: string; segmentIndex: number; text: string }): void {
        let history = Swordfish.loadHistory();
        let entry = history.history.find((e: any) => e.id === arg.historyId);
        if (entry) {
            if (!entry.reflections) {
                entry.reflections = {};
            }
            entry.reflections[arg.segmentIndex] = arg.text;
            Swordfish.saveHistory(history);
        }
    }

    static pendingScoreData: any = null;

    static showScoreReport(arg: { projectId: string; scoreData?: any }): void {
        if (arg.scoreData) {
            Swordfish.pendingScoreData = arg.scoreData;
        } else if (!Swordfish.pendingScoreData) {
            // No new data — load latest from history
            Swordfish.loadScoreHistoryForReport({ projectId: arg.projectId });
        }
        if (!Swordfish.scoreReportWindow || Swordfish.scoreReportWindow.isDestroyed()) {
            Swordfish.scoreReportWindow = new BrowserWindow({
                parent: Swordfish.mainWindow,
                width: 700, height: 700,
                minimizable: false, maximizable: true, resizable: true,
                show: false,
                icon: Swordfish.iconPath,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            });
            Swordfish.scoreReportWindow.setMenu(null);
            let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'scoreReport.html');
            let fileUrl: URL = new URL('file://' + filePath);
            Swordfish.scoreReportWindow.loadURL(fileUrl.href);
            Swordfish.scoreReportWindow.once('ready-to-show', () => { Swordfish.scoreReportWindow.show(); });
            Swordfish.scoreReportWindow.on('close', () => { Swordfish.mainWindow.focus(); });
            Swordfish.setLocation(Swordfish.scoreReportWindow, 'scoreReport.html');
        } else {
            Swordfish.scoreReportWindow.focus();
            if (Swordfish.pendingScoreData) {
                Swordfish.scoreReportWindow.webContents.send('set-score-report-data', Swordfish.pendingScoreData);
            }
        }
    }

    static scoreReportReady(event: IpcMainEvent): void {
        if (Swordfish.pendingScoreData) {
            event.sender.send('set-score-report-data', Swordfish.pendingScoreData);
        }
    }

    static loadScoreHistoryForReport(arg: { projectId: string }): void {
        let history = Swordfish.loadHistory();
        let entries = (history.history || []).filter((e: any) => e.projectId === arg.projectId);
        entries.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (entries.length > 0) {
            let latest = entries[0];
            try {
                let structured = JSON.parse(latest.fullResult);
                let data = {
                    result: structured,
                    segments: latest.segments || [],
                    references: latest.segments.map((s: any) => s.reference || ''),
                    historyId: latest.id,
                    savedReflections: latest.reflections || {}
                };
                Swordfish.pendingScoreData = data;
                if (Swordfish.scoreReportWindow && !Swordfish.scoreReportWindow.isDestroyed()) {
                    Swordfish.scoreReportWindow.webContents.send('set-score-report-data', data);
                }
            } catch {
                // Not structured JSON, nothing to show in report
            }
        }
    }

    static exportScoreReportMd(arg: { markdown: string }): void {
        dialog.showSaveDialog(Swordfish.mainWindow, {
            defaultPath: 'score-report.md',
            filters: [
                { name: 'Markdown Files', extensions: ['md'] },
                { name: 'Any File', extensions: ['*'] }
            ],
            properties: ['createDirectory', 'showOverwriteConfirmation']
        }).then((value: Electron.SaveDialogReturnValue) => {
            if (!value.canceled && value.filePath) {
                writeFileSync(value.filePath, arg.markdown, 'utf-8');
                shell.openPath(dirname(value.filePath));
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static async exportScoreReportPdf(): Promise<void> {
        if (!Swordfish.scoreReportWindow || Swordfish.scoreReportWindow.isDestroyed()) return;
        dialog.showSaveDialog(Swordfish.scoreReportWindow, {
            defaultPath: 'score-report.pdf',
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] },
                { name: 'Any File', extensions: ['*'] }
            ],
            properties: ['createDirectory', 'showOverwriteConfirmation']
        }).then(async (value: Electron.SaveDialogReturnValue) => {
            if (!value.canceled && value.filePath) {
                try {
                    const pdfData = await Swordfish.scoreReportWindow.webContents.printToPDF({
                        pageSize: 'A4',
                        printBackground: true
                    });
                    writeFileSync(value.filePath, pdfData);
                    shell.openPath(dirname(value.filePath));
                } catch (error: any) {
                    Swordfish.showMessage({ type: 'error', message: error.message });
                }
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static showTrainingHistory(arg: { projectId: string }): void {
        let history = Swordfish.loadHistory();
        let entries = (history.history || []).filter((e: any) => e.projectId === arg.projectId);
        entries.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (entries.length === 0) {
            Swordfish.showMessage({ type: 'warning', message: '该练习暂无评分记录' });
            return;
        }

        let trainingData = Swordfish.loadTrainingData();
        let exercise = trainingData.exercises.find((ex: any) => ex.projectId === arg.projectId);

        // Build history list with parsed structured data
        let historyList: any[] = [];
        for (let entry of entries) {
            let structured = null;
            try { structured = JSON.parse(entry.fullResult); } catch { /* not JSON */ }
            historyList.push({
                id: entry.id,
                timestamp: entry.timestamp,
                score: entry.score,
                engine: entry.engine,
                translatedCount: entry.translatedCount,
                segmentCount: entry.segmentCount,
                structured: structured,
                segments: entry.segments || [],
                reflections: entry.reflections || {}
            });
        }

        Swordfish.pendingScoreData = { historyList: historyList, projectName: exercise?.projectName || '', references: exercise?.references || [] };
        Swordfish.showScoreReport({ projectId: arg.projectId });
    }

    static fixMatch(match: Match): void {
        if (!(Swordfish.currentPreferences.chatGpt.enabled || Swordfish.currentPreferences.anthropic.enabled || Swordfish.currentPreferences.mistral.enabled)) {
            Swordfish.showMessage({ type: 'error', message: 'No AI engine is currently enabled' });
            return;
        }
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Fixing match');
        Swordfish.sendRequest('/projects/getMatchData', match,
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                Swordfish.fixMatches(data, match.srcLang, match.tgtLang);
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static exportHTML(projectId: string): void {
        Swordfish.mainWindow.webContents.send('start-waiting');
        Swordfish.mainWindow.webContents.send('set-status', 'Exporting HTML');
        Swordfish.sendRequest('/projects/exportHtml', { project: projectId },
            (data: any) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                shell.openExternal('file://' + data.export).catch(() => {
                    shell.openPath(data.export).catch((reason: any) => {
                        if (reason instanceof Error) {
                            console.error(reason.message);
                        }
                        this.showMessage({ type: 'error', message: 'Unable to open HTML.' });
                    });
                });
            },
            (reason: string) => {
                Swordfish.mainWindow.webContents.send('end-waiting');
                Swordfish.mainWindow.webContents.send('set-status', '');
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showChangeCase(): void {
        this.changeCaseWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 250,
            height: 350,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.changeCaseWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'changeCase.html');
        let fileUrl: URL = new URL('file://' + filePath);
        this.changeCaseWindow.loadURL(fileUrl.href);
        this.changeCaseWindow.once('ready-to-show', () => {
            let bounds: Rectangle = Swordfish.mainWindow.getBounds();
            if (!Swordfish.locations.hasLocation('changeCase.html')) {
                this.changeCaseWindow.setPosition(bounds.x + Number.parseInt('' + (bounds.width / 5)), bounds.y + Number.parseInt('' + (bounds.height / 4)));
            }
            this.changeCaseWindow.show();
        });
        this.changeCaseWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.changeCaseWindow, 'changeCase.html');
    }

    static changeCaseTo(arg: any): void {
        Swordfish.mainWindow.webContents.send('case-changed', arg);
        this.changeCaseWindow.close();
    }

    static splitSegment(arg: any): void {
        Swordfish.sendRequest('/projects/splitSegment', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                Swordfish.mainWindow.webContents.send('count-changed', { project: arg.project });
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static mergeSegment(arg: any): void {
        Swordfish.sendRequest('/projects/mergeSegment', arg,
            (data: any) => {
                if (data.status !== Swordfish.SUCCESS) {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                    return;
                }
                Swordfish.mainWindow.webContents.send('count-changed', { project: arg.project });
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static toggleFilesPanel(): void {
        Swordfish.mainWindow.webContents.send('toggle-files-panel');
    }

    static toggleRightPanels(): void {
        Swordfish.mainWindow.webContents.send('toggle-right-panels');
    }

    static toggleReviewComments(): void {
        if (Swordfish.reviewCommentsWindow && !Swordfish.reviewCommentsWindow.isDestroyed() && Swordfish.reviewCommentsWindow.isVisible()) {
            Swordfish.reviewCommentsWindow.close();
            Swordfish.mainWindow?.webContents.send('review-comments-closed');
            return;
        }
        Swordfish.mainWindow.webContents.send('show-metadata');
    }

    static toggleNotes(): void {
        if (Swordfish.notesWindow && !Swordfish.notesWindow.isDestroyed() && Swordfish.notesWindow.isVisible()) {
            Swordfish.notesWindow.close();
            Swordfish.mainWindow?.webContents.send('notes-closed');
            return;
        }
        Swordfish.mainWindow.webContents.send('notes-requested');
    }

    static showContext(segment: FullId): void {
        if (Swordfish.contextWindow && !Swordfish.contextWindow.isDestroyed() && Swordfish.contextWindow.isVisible()) {
            Swordfish.getContext(segment);
            return;
        }
        Swordfish.contextWindow = new BrowserWindow({
            parent: Swordfish.mainWindow,
            width: 350,
            height: 250,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            alwaysOnTop: true,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.contextWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'context.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.contextWindow.loadURL(fileUrl.href);
        Swordfish.contextWindow.addListener('closed', () => {
            try {
                Swordfish.mainWindow?.focus();
                Swordfish.mainWindow?.webContents.send('context-closed');
            } catch (e) {
                // ignore
            }
        });
        Swordfish.contextWindow.once('ready-to-show', () => {
            Swordfish.contextWindow.show();
            Swordfish.getContext(segment);
            Swordfish.mainWindow.webContents.send('context-requested');
        });
        Swordfish.setLocation(this.contextWindow, 'context.html');
        Swordfish.monitorSize(this.contextWindow, 'context.html');
    }

    static getContext(segment: FullId) {
        Swordfish.sendRequest('/projects/getContext', segment,
            (data: any) => {
                if (data.status === 'Success') {
                    Swordfish.contextWindow.webContents.send('set-context', data.context);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static toggleContext(): void {
        if (Swordfish.contextWindow && !Swordfish.contextWindow.isDestroyed() && Swordfish.contextWindow.isVisible()) {
            Swordfish.contextWindow.close();
            Swordfish.mainWindow.webContents.send('context-closed');
            return;
        }
        Swordfish.mainWindow.webContents.send('context-requested');
    }

    static showNotes(segment: FullId): void {
        if (Swordfish.notesWindow && !Swordfish.notesWindow.isDestroyed() && Swordfish.notesWindow.isVisible()) {
            Swordfish.notesWindow.webContents.send('note-params', segment);
            Swordfish.getNotes(segment);
            return;
        }
        Swordfish.notesWindow = new BrowserWindow({
            parent: Swordfish.mainWindow,
            width: 450,
            height: 300,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            alwaysOnTop: true,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.notesWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'notes.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.notesWindow.loadURL(fileUrl.href);
        Swordfish.notesWindow.addListener('closed', () => {
            try {
                Swordfish.mainWindow?.focus();
                Swordfish.mainWindow?.webContents.send('notes-closed');
            } catch (e) {
                // ignore
            }
        });
        Swordfish.notesWindow.once('ready-to-show', () => {
            Swordfish.notesWindow.show();
            Swordfish.notesWindow.webContents.send('note-params', segment);
            Swordfish.getNotes(segment);
            Swordfish.mainWindow.webContents.send('notes-requested');
        });
        Swordfish.setLocation(this.notesWindow, 'notes.html');
        Swordfish.monitorSize(this.notesWindow, 'notes.html');
    }

    static getNotes(segment: FullId): void {
        Swordfish.sendRequest('/projects/getNotes', segment,
            (data: any) => {
                if (data.status === 'Success') {
                    Swordfish.notesWindow.webContents.send('set-notes', data.notes);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showAddNote(segmentId: FullId): void {
        if (Swordfish.addNoteWindow && !Swordfish.addNoteWindow.isDestroyed()) {
            Swordfish.addNoteWindow.focus();
            Swordfish.addNoteWindow.webContents.send('note-params', segmentId);
            return;
        }
        Swordfish.addNoteWindow = new BrowserWindow({
            parent: Swordfish.notesWindow,
            width: 350,
            height: 220,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.addNoteWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addNote.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.addNoteWindow.loadURL(fileUrl.href);
        Swordfish.addNoteWindow.once('ready-to-show', () => {
            Swordfish.addNoteWindow.show();
            Swordfish.addNoteWindow.webContents.send('note-params', segmentId);
        });
        this.addNoteWindow.on('close', () => {
            let parent: BrowserWindow | null = this.addNoteWindow?.getParentWindow();
            if (parent) {
                parent.focus();
            }
        });
        Swordfish.setLocation(this.addNoteWindow, 'addNote.html');
    }

    static showEditNote(segmentId: FullId, noteId: string, noteText: string): void {
        if (Swordfish.addNoteWindow && !Swordfish.addNoteWindow.isDestroyed()) {
            Swordfish.addNoteWindow.focus();
            Swordfish.addNoteWindow.webContents.send('note-params', segmentId);
            Swordfish.addNoteWindow.webContents.send('set-note', noteText);
            Swordfish.addNoteWindow.webContents.send('set-note-id', noteId);
            return;
        }
        Swordfish.addNoteWindow = new BrowserWindow({
            parent: Swordfish.notesWindow,
            width: 350,
            height: 220,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.addNoteWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addNote.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.addNoteWindow.loadURL(fileUrl.href);
        Swordfish.addNoteWindow.once('ready-to-show', () => {
            Swordfish.addNoteWindow.show();
            Swordfish.addNoteWindow.webContents.send('note-params', segmentId);
            Swordfish.addNoteWindow.webContents.send('set-note', noteText);
            Swordfish.addNoteWindow.webContents.send('set-note-id', noteId);
        });
        this.addNoteWindow.on('close', () => {
            let parent: BrowserWindow | null = this.addNoteWindow?.getParentWindow();
            if (parent) {
                parent.focus();
            }
        });
        Swordfish.setLocation(this.addNoteWindow, 'addNote.html');
    }

    static addNote(segmentId: FullId, note: string): void {
        Swordfish.addNoteWindow.close();
        let params: any = segmentId;
        params.noteText = note;
        Swordfish.sendRequest('/projects/addNote', params,
            (data: any) => {
                if (data.status === 'Success') {
                    Swordfish.notesWindow.webContents.send('set-notes', data.notes);
                    Swordfish.mainWindow.webContents.send('notes-added', segmentId);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static updateNote(segment: FullId, note: string, noteId: string): void {
        Swordfish.addNoteWindow.close();
        let params: any = segment;
        params.noteText = note;
        params.noteId = noteId;
        Swordfish.sendRequest('/projects/addNote', params,
            (data: any) => {
                if (data.status === 'Success') {
                    Swordfish.notesWindow.webContents.send('set-notes', data.notes);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static removeNote(segmentId: FullId, noteId: string): void {
        let params: any = segmentId;
        params.noteId = noteId;
        Swordfish.sendRequest('/projects/removeNote', params,
            (data: any) => {
                if (data.status === 'Success') {
                    Swordfish.notesWindow.webContents.send('set-notes', data.notes);
                    if (data.notes.length === 0) {
                        Swordfish.mainWindow.webContents.send('notes-removed', segmentId);
                    }
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showFileInfo(fileInfo: any): void {
        if (Swordfish.fileInfoWindow && !Swordfish.fileInfoWindow.isDestroyed() && Swordfish.fileInfoWindow.isVisible()) {
            // focus the existing window
            Swordfish.fileInfoWindow.focus();
            Swordfish.fileInfoWindow.webContents.send('set-file-info', fileInfo);
            return;
        }
        Swordfish.fileInfoWindow = new BrowserWindow({
            parent: Swordfish.mainWindow,
            width: 600,
            height: 440,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            alwaysOnTop: true,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.fileInfoWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'fileInfo.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.fileInfoWindow.loadURL(fileUrl.href);
        Swordfish.fileInfoWindow.once('ready-to-show', () => {
            Swordfish.fileInfoWindow.show();
            Swordfish.fileInfoWindow.webContents.send('set-file-info', fileInfo);
        });
        Swordfish.fileInfoWindow.addListener('closed', () => {
            Swordfish.mainWindow?.focus();
        });
        Swordfish.setLocation(this.fileInfoWindow, 'fileInfo.html');
    }

    static showReviewComments(metaId: MetaId): void {
        if (Swordfish.reviewCommentsWindow && !Swordfish.reviewCommentsWindow.isDestroyed() && Swordfish.reviewCommentsWindow.isVisible()) {
            // update the existing window
            Swordfish.reviewCommentsWindow.webContents.send('set-data', metaId);
            return;
        }
        Swordfish.reviewCommentsWindow = new BrowserWindow({
            parent: Swordfish.mainWindow,
            width: 500,
            height: 440,
            minWidth: 480,
            minHeight: 380,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            alwaysOnTop: true,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.reviewCommentsWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'commentsDialog.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.reviewCommentsWindow.loadURL(fileUrl.href);
        Swordfish.reviewCommentsWindow.addListener('closed', () => {
            try {
                Swordfish.mainWindow?.focus();
                Swordfish.mainWindow?.webContents.send('review-comments-closed');
            } catch (e) {
                // ignore
            }
        });
        Swordfish.reviewCommentsWindow.once('ready-to-show', () => {
            Swordfish.reviewCommentsWindow.show();
            Swordfish.reviewCommentsWindow.webContents.send('set-data', metaId);
            Swordfish.mainWindow.webContents.send('metadata-requested', metaId);
        });
        Swordfish.setLocation(this.reviewCommentsWindow, 'commentsDialog.html');
        Swordfish.monitorSize(this.reviewCommentsWindow, 'commentsDialog.html');
    }

    static getMetadata(arg: MetaId): void {
        Swordfish.sendRequest('/projects/getCustomMetadata', arg,
            (data: any) => {
                if (data.status === 'Success') {
                    // remove status field from. data
                    delete data.status;
                    Swordfish.reviewCommentsWindow.webContents.send('set-metadata', data);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static saveMetadata(metaId: MetaId, metadata: MetaData): void {
        let params: any = metaId;
        params.metadata = metadata;
        Swordfish.sendRequest('/projects/saveMetadata', params,
            (data: any) => {
                if (data.status === 'Success') {
                    if (Swordfish.reviewCommentsWindow && !Swordfish.reviewCommentsWindow.isDestroyed() && Swordfish.reviewCommentsWindow.isVisible()) {
                        Swordfish.reviewCommentsWindow.webContents.send('set-metadata', metadata);
                    }
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showAddComment(metaId: MetaId): void {
        if (Swordfish.addCommentWindow && !Swordfish.addCommentWindow.isDestroyed() && Swordfish.addCommentWindow.isVisible()) {
            // focus the existing window
            Swordfish.addCommentWindow.focus();
            Swordfish.addCommentWindow.webContents.send('set-metaId', metaId);
            return;
        }
        Swordfish.addCommentWindow = new BrowserWindow({
            parent: Swordfish.reviewCommentsWindow,
            width: 500,
            height: 420,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.addCommentWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addComment.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.addCommentWindow.loadURL(fileUrl.href);
        Swordfish.addCommentWindow.once('ready-to-show', () => {
            Swordfish.addCommentWindow.show();
            Swordfish.addCommentWindow.webContents.send('set-metaId', metaId);
        });
        this.addCommentWindow.on('close', () => {
            let parent: BrowserWindow | null = this.addCommentWindow?.getParentWindow();
            parent?.focus();
        });
        Swordfish.setLocation(this.addCommentWindow, 'addComment.html');
        Swordfish.monitorSize(this.addCommentWindow, 'addComment.html');
    }

    static getContentModel(from: string): void {
        if (existsSync(Swordfish.currentPreferences.reviewModel)) {
            let contentModel: any = JSON.parse(readFileSync(Swordfish.currentPreferences.reviewModel, 'utf8'));
            if (from === 'commentsDialog') {
                this.addCommentWindow.webContents.send('set-content-model', contentModel);
            }
            if (from === 'addReply') {
                this.addReplyWindow.webContents.send('set-content-model', contentModel);
            }
        } else {
            Swordfish.showMessage({ type: 'error', message: 'Content model file not found: ' + Swordfish.currentPreferences.reviewModel });
        }
    }

    static saveComment(metaId: MetaId, comment: ReviewComment): void {
        Swordfish.addCommentWindow.close();
        Swordfish.reviewCommentsWindow.webContents.send('add-comment', comment);
    }

    static saveReply(metaId: MetaId, reply: CommentReply): void {
        Swordfish.addReplyWindow.close();
        Swordfish.reviewCommentsWindow.webContents.send('add-reply', reply);
    }

    static showEditComment(metaId: MetaId, comment: ReviewComment): void {
        if (Swordfish.addCommentWindow && !Swordfish.addCommentWindow.isDestroyed() && Swordfish.addCommentWindow.isVisible()) {
            // focus the existing window
            Swordfish.addCommentWindow.focus();
            Swordfish.addCommentWindow.webContents.send('set-metaId', metaId);
            Swordfish.addCommentWindow.webContents.send('set-comment', comment);
            return;
        }
        Swordfish.addCommentWindow = new BrowserWindow({
            parent: Swordfish.reviewCommentsWindow,
            width: 500,
            height: 420,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.addCommentWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addComment.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.addCommentWindow.loadURL(fileUrl.href);
        Swordfish.addCommentWindow.once('ready-to-show', () => {
            Swordfish.addCommentWindow.show();
            Swordfish.addCommentWindow.webContents.send('set-metaId', metaId);
            Swordfish.addCommentWindow.webContents.send('set-comment', comment);
        });
        this.addCommentWindow.on('close', () => {
            let parent: BrowserWindow | null = this.addCommentWindow?.getParentWindow();
            parent?.focus();
        });
        Swordfish.setLocation(this.addCommentWindow, 'addComment.html');
        Swordfish.monitorSize(this.addCommentWindow, 'addComment.html');
    }

    static showAddReply(metaId: MetaId, commentId: string): void {
        if (Swordfish.addReplyWindow && !Swordfish.addReplyWindow.isDestroyed() && Swordfish.addReplyWindow.isVisible()) {
            Swordfish.addReplyWindow.close();
        }
        Swordfish.addReplyWindow = new BrowserWindow({
            parent: Swordfish.reviewCommentsWindow,
            width: 500,
            height: 320,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.addReplyWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addReply.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.addReplyWindow.loadURL(fileUrl.href);
        Swordfish.addReplyWindow.once('ready-to-show', () => {
            Swordfish.addReplyWindow.show();
            Swordfish.addReplyWindow.webContents.send('set-metaId', metaId);
            Swordfish.addReplyWindow.webContents.send('set-commentId', commentId);
        });
        this.addReplyWindow.on('close', () => {
            let parent: BrowserWindow | null = this.addReplyWindow?.getParentWindow();
            parent?.focus();
        });
        Swordfish.setLocation(this.addReplyWindow, 'addReply.html');
        Swordfish.monitorSize(this.addReplyWindow, 'addReply.html');
    }

    static showEditReply(metaId: MetaId, reply: CommentReply): void {
        if (Swordfish.addReplyWindow && !Swordfish.addReplyWindow.isDestroyed() && Swordfish.addReplyWindow.isVisible()) {
            Swordfish.addReplyWindow.close();
        }
        Swordfish.addReplyWindow = new BrowserWindow({
            parent: Swordfish.reviewCommentsWindow,
            width: 500,
            height: 320,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.addReplyWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addReply.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.addReplyWindow.loadURL(fileUrl.href);
        Swordfish.addReplyWindow.once('ready-to-show', () => {
            Swordfish.addReplyWindow.show();
            Swordfish.addReplyWindow.webContents.send('set-metaId', metaId);
            Swordfish.addReplyWindow.webContents.send('set-reply', reply);
        });
        this.addReplyWindow.on('close', () => {
            let parent: BrowserWindow | null = this.addReplyWindow?.getParentWindow();
            parent?.focus();
        });
        Swordfish.setLocation(this.addReplyWindow, 'addReply.html');
        Swordfish.monitorSize(this.addReplyWindow, 'addReply.html');
    }

    static downloadLatest(): void {
        let downloadsFolder: string = app.getPath('downloads');
        let url: URL = new URL(Swordfish.downloadLink);
        let path: string = url.pathname;
        path = path.substring(path.lastIndexOf('/') + 1);
        let file: string = downloadsFolder + (process.platform === 'win32' ? '\\' : '/') + path;
        if (existsSync(file)) {
            unlinkSync(file);
        }
        let request: ClientRequest = net.request({
            url: Swordfish.downloadLink,
            session: session.defaultSession
        });
        Swordfish.mainWindow.webContents.send('set-status', 'Downloading...');
        Swordfish.updatesWindow.close();
        request.on('response', (response: IncomingMessage) => {
            let fileSize: number = Number.parseInt(response.headers['content-length'] as string);
            let received: number = 0;
            response.on('data', (chunk: Buffer) => {
                received += chunk.length;
                if (process.platform === 'win32' || process.platform === 'darwin') {
                    Swordfish.mainWindow.setProgressBar(received / fileSize);
                }
                Swordfish.mainWindow.webContents.send('set-status', 'Downloaded: ' + Math.trunc(received * 100 / fileSize) + '%');
                appendFileSync(file, chunk);
            });
            response.on('end', () => {
                Swordfish.mainWindow.webContents.send('set-status', '');
                dialog.showMessageBox({
                    type: 'info',
                    message: 'Update downloaded'
                });
                if (process.platform === 'win32' || process.platform === 'darwin') {
                    Swordfish.mainWindow.setProgressBar(0);
                    shell.openPath(file).then(() => {
                        app.quit();
                    }).catch((reason: string) => {
                        dialog.showErrorBox('Error', reason);
                    });
                }
                if (process.platform === 'linux') {
                    shell.showItemInFolder(file);
                }
            });
            response.on('error', (error: Error) => {
                Swordfish.mainWindow.webContents.send('set-status', '');
                dialog.showErrorBox('Error', error.message);
                if (process.platform === 'win32' || process.platform === 'darwin') {
                    Swordfish.mainWindow.setProgressBar(0);
                }
            });
        });
        request.end();
    }

    static showGettingStarted(): void {
        Swordfish.gettingStartedWindow = new BrowserWindow({
            parent: Swordfish.mainWindow,
            width: 740,
            height: 540,
            minimizable: false,
            maximizable: false,
            resizable: false,
            modal: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.gettingStartedWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'gettingStarted.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.gettingStartedWindow.loadURL(fileUrl.href);
        Swordfish.gettingStartedWindow.once('ready-to-show', () => {
            Swordfish.gettingStartedWindow.show();
        });
        this.gettingStartedWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.gettingStartedWindow, 'gettingStarted.html');
    }

    static getXMLFilters(event: IpcMainEvent): void {
        this.sendRequest('/services/xmlFilters', { path: app.getAppPath() },
            (data: any) => {
                if (data.status === 'Success') {
                    event.sender.send('xmlFilters', data);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason, parent: 'preferences' });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason, parent: 'preferences' });
            }
        );
    }

    static editXmlFilter(arg: any): void {
        Swordfish.xmlFilter = arg.file;
        Swordfish.editXmlFilterWindow = new BrowserWindow({
            parent: Swordfish.preferencesWindow,
            width: 800,
            height: 405,
            minimizable: false,
            maximizable: false,
            resizable: true,
            modal: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.editXmlFilterWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'filterConfig.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.editXmlFilterWindow.loadURL(fileUrl.href);
        Swordfish.editXmlFilterWindow.once('ready-to-show', () => {
            Swordfish.editXmlFilterWindow.show();
        });
        this.editXmlFilterWindow.on('close', () => {
            this.preferencesWindow.focus();
        });
        Swordfish.setLocation(this.editXmlFilterWindow, 'filterConfig.html');
    }

    static getXmlFilterData(event: IpcMainEvent): void {
        this.sendRequest('/services/filterData', { path: app.getAppPath(), file: Swordfish.xmlFilter },
            (data: any) => {
                if (data.status === 'Success') {
                    data.filter = Swordfish.xmlFilter;
                    event.sender.send('set-filterData', data);
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason, parent: 'filterConfig' });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason, parent: 'filterConfig' });
            }
        );
    }

    static getElementConfig(event: IpcMainEvent): void {
        event.sender.send('set-elementConfig', Swordfish.filterElement);
    }

    static saveElementConfig(arg: any): void {
        arg.path = app.getAppPath();
        this.sendRequest('/services/saveElement', arg,
            (data: any) => {
                if (data.status === 'Success') {
                    Swordfish.configElementWindow.close();
                    Swordfish.editXmlFilterWindow.webContents.send('refresh');
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason, parent: 'elementConfig' });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason, parent: 'elementConfig' });
            }
        );
    }

    static removeElements(arg: any): void {
        arg.path = app.getAppPath();
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Remove selected elements?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                this.sendRequest('/services/removeElements', arg,
                    (data: any) => {
                        if (data.status === 'Success') {
                            Swordfish.editXmlFilterWindow.webContents.send('refresh');
                        } else {
                            Swordfish.showMessage({ type: 'error', message: data.reason, parent: 'filterConfig' });
                        }
                    },
                    (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason, parent: 'filterConfig' });
                    }
                );
            }
        });
    }

    static addElement(arg: any): void {
        Swordfish.filterElement = arg;
        Swordfish.configElementWindow = new BrowserWindow({
            parent: Swordfish.editXmlFilterWindow,
            width: 390,
            height: 310,
            minimizable: false,
            maximizable: false,
            resizable: false,
            modal: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.configElementWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'elementConfig.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.configElementWindow.loadURL(fileUrl.href);
        Swordfish.configElementWindow.once('ready-to-show', () => {
            Swordfish.configElementWindow.show();
        });
        this.configElementWindow.on('close', () => {
            this.editXmlFilterWindow.focus();
        });
        Swordfish.setLocation(this.configElementWindow, 'elementConfig.html');
    }

    static importXmlFilter(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'XML Document', extensions: ['xml'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                let selectedFile: string = value.filePaths[0];
                this.sendRequest('/services/importFilter', { path: app.getAppPath(), file: selectedFile },
                    (data: any) => {
                        if (data.status === 'Success') {
                            Swordfish.getXMLFilters(event);
                            this.showMessage({ type: 'info', message: 'Configuration file imported', parent: 'preferences' });
                        } else {
                            Swordfish.showMessage({ type: 'error', message: data.reason, parent: 'preferences' });
                        }
                    },
                    (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason, parent: 'preferences' });
                    }
                );
            } else {
                Swordfish.preferencesWindow.focus();
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static removeXmlFilters(event: IpcMainEvent, arg: any): void {
        dialog.showMessageBox(Swordfish.mainWindow, {
            type: 'question',
            message: 'Remove selected configuration files?',
            buttons: ['Yes', 'No']
        }).then((selection: MessageBoxReturnValue) => {
            if (selection.response === 0) {
                this.sendRequest('/services/removeFilters', { path: app.getAppPath(), files: arg.files },
                    (data: any) => {
                        if (data.status === 'Success') {
                            Swordfish.getXMLFilters(event);
                        } else {
                            Swordfish.showMessage({ type: 'error', message: data.reason, parent: 'preferences' });
                        }
                    },
                    (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason, parent: 'preferences' });
                    }
                );
            }
        });
    }

    static exportXmlFilters(arg: any): void {
        dialog.showOpenDialog(Swordfish.mainWindow, {
            title: 'Export XML Filter Configurations',
            properties: ['createDirectory', 'openDirectory']
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                Swordfish.sendRequest('/services/exportFilters', { path: app.getAppPath(), files: arg.files, folder: value.filePaths[0] },
                    (data: any) => {
                        if (data.status === 'Success') {
                            this.showMessage({ type: 'info', message: 'Configuration files exported', parent: 'preferences' });
                        } else {
                            Swordfish.showMessage({ type: 'error', message: data.reason, parent: 'preferences' });
                        }
                    },
                    (reason: string) => {
                        Swordfish.showMessage({ type: 'error', message: reason });
                    }
                );
            } else {
                Swordfish.preferencesWindow.focus();
            }
        }).catch((error: Error) => {
            console.error(error.message);
        });
    }

    static showAddXmlConfiguration(event: IpcMainEvent): void {
        Swordfish.addConfigurationEvent = event;
        Swordfish.addXmlConfigurationWindow = new BrowserWindow({
            parent: Swordfish.preferencesWindow,
            width: 450,
            height: 150,
            minimizable: false,
            maximizable: false,
            resizable: false,
            modal: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.addXmlConfigurationWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'addXmlConfiguration.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.addXmlConfigurationWindow.loadURL(fileUrl.href);
        Swordfish.addXmlConfigurationWindow.once('ready-to-show', () => {
            Swordfish.addXmlConfigurationWindow.show();
        });
        this.addXmlConfigurationWindow.on('close', () => {
            this.preferencesWindow.focus();
        });
        Swordfish.setLocation(this.addXmlConfigurationWindow, 'addXmlConfiguration.html');
    }

    static addXmlConfiguration(event: IpcMainEvent, arg: any): void {
        arg.path = app.getAppPath();
        Swordfish.sendRequest('/services/addFilter', arg,
            (data: any) => {
                if (data.status === 'Success') {
                    Swordfish.showMessage({ type: 'info', message: 'Configuration added' });
                    Swordfish.getXMLFilters(Swordfish.addConfigurationEvent);
                    Swordfish.addXmlConfigurationWindow.close();
                    Swordfish.preferencesWindow.focus();
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason, parent: 'addConfiguration' });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason, parent: 'addConfiguration' });
            }
        );
    }

    static getSvgIcon(svgName: string): string {
        let svgPath: string = join(app.getAppPath(), 'images', svgName);
        let svg: string = '';
        if (existsSync(svgPath)) {
            svg = readFileSync(svgPath, 'utf8');
        }
        return svg;
    }


    static setLocation(window: BrowserWindow, key: string): void {
        if (Swordfish.locations.hasLocation(key)) {
            let position: Point | undefined = Swordfish.locations.getLocation(key);
            if (position) {
                window.setPosition(position.x, position.y, true);
            }
        }
        window.addListener('moved', () => {
            let bounds: Rectangle = window.getBounds();
            Swordfish.locations.setLocation(key, bounds.x, bounds.y);
        });
    }

    static monitorSize(window: BrowserWindow, key: string): void {
        if (Swordfish.sizes.hasSize(key)) {
            let size: Rect | undefined = Swordfish.sizes.getSize(key);
            if (size) {
                window.setContentSize(size.width, size.height, true);
            }
        }
        window.addListener('resized', () => {
            let bounds: number[] = window.getContentSize();
            Swordfish.sizes.setSize(key, bounds[0], bounds[1]);
        });
    }

    static startup(): void {
        Swordfish.spellCheckerLanguages = Swordfish.mainWindow.webContents.session.availableSpellCheckerLanguages;
        if (Swordfish.currentPreferences.srcLang === 'none') {
            Swordfish.getDefaultLanguages();
        }
        if (Swordfish.currentPreferences.showGuide === undefined) {
            Swordfish.currentPreferences.showGuide = true;
        }
        if (Swordfish.currentPreferences.showGuide) {
            Swordfish.showGettingStarted();
        }
        if (process.platform === 'darwin' && app.runningUnderARM64Translation) {
            Swordfish.showMessage({
                type: 'warning',
                message: 'You are running a version for Macs with Intel processors on a Mac with Apple chipset.'
            });
        }
        setTimeout(() => {
            Swordfish.checkUpdates(true);
        }, 2000);
    }

    static showXSLTransformation(): void {
        Swordfish.XSLTransformationWindow = new BrowserWindow({
            parent: Swordfish.mainWindow,
            width: 550,
            height: 300,
            minimizable: false,
            maximizable: false,
            resizable: false,
            modal: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        Swordfish.XSLTransformationWindow.setMenu(null);
        let filePath: string = join(app.getAppPath(), 'html', Swordfish.currentPreferences.appLang, 'XSLTransformation.html');
        let fileUrl: URL = new URL('file://' + filePath);
        Swordfish.XSLTransformationWindow.loadURL(fileUrl.href);
        Swordfish.XSLTransformationWindow.once('ready-to-show', () => {
            Swordfish.XSLTransformationWindow.show();
        });
        this.XSLTransformationWindow.on('close', () => {
            this.mainWindow.focus();
        });
        Swordfish.setLocation(this.XSLTransformationWindow, 'XSLTransformation.html');
    }

    static XSLTransformation(arg: { xmlFile: string, xslFile: string, outputFile: string, openResult: boolean }): void {
        Swordfish.sendRequest('/services/XSLTransform', arg,
            (data: any) => {
                Swordfish.XSLTransformationWindow.close();
                if (data.status === 'Success') {
                    if (arg.openResult) {
                        shell.openPath(arg.outputFile).catch((reason: string) => {
                            Swordfish.showMessage({ type: 'error', message: reason });
                        });
                    } else {
                        Swordfish.showMessage({ type: 'info', message: 'Transformation completed' });
                    }
                } else {
                    Swordfish.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                Swordfish.showMessage({ type: 'error', message: reason });
            }
        );
    }

}

try {
    new Swordfish();
} catch (e) {
    console.error("Unable to instantiate Swordfish();");
}
