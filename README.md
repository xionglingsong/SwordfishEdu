# SwordfishEdu

翻译教学与 AI 智能评分平台，基于 [Swordfish](https://github.com/maxprograms-com/Swordfish) 专业 CAT 工具构建，面向翻译学习者和 CATTI 备考人员，提供结构化练习、AI 实时评分、诊断反馈与能力追踪。

---

## 功能概览

### 翻译练习系统

| 功能 | 说明 |
|------|------|
| CSV 导入 | 导入双语 CSV 文件（原文/译文两列）作为练习 |
| 剪贴板导入 | 粘贴双语文本，自动解析为段落对 |
| 网页导入 | 从分页 URL 批量抓取双语内容（支持页码占位符、范围设定、进度预览） |
| 练习管理 | 表格视图：名称、语言对、段落数、词数、最近得分、评分历史 |
| CATTI 倒计时 | 面板显示考试倒计时、累计练习词数、各练习详情 |
| 练习历史 | 每次评分自动存档，可随时回看任意历史评分报告 |
| 保存至 TM | 将练习译文导出为翻译记忆（TMX 格式），积累语料 |

### AI 智能评分

采用 **ATA 错误分类标准** + **CATTI 扣分制** 双框架：

**三维评分（总分 100）**

| 维度 | 满分 | ATA 板块 | 评价内容 |
|------|------|----------|----------|
| 意义传递 / Meaning Transfer | 40 | Section 2 | 忠实原文、无错译漏译 |
| 译入语规范 / Target Mechanics | 30 | Section 1 | 语法正确、语言规范 |
| 行文质量 / Writing Quality | 30 | Section 3 | 用词恰当、体现原文风格 |

**严重度四级标尺**

| 等级 | 分值 | 说明 |
|------|------|------|
| Minor (轻微) | 1 | 几乎不影响理解 |
| Moderate (中等) | 2 | 读者需停顿但能推断含义 |
| Serious (严重) | 4 | 读者可能产生错误理解 |
| Critical (致命) | 8 | 完全改变原文含义或译文不可用 |

**错误分类（ATA 标准，17+ 类型）**

- **Section 1 — 译入语规范**: G(语法)、SYN(句法)、WF/PS(词形/词性)、SP/CH(拼写/字形)、C(大小写)、D(变音符号)、P(标点)、OTH-ME(其他规范)
- **Section 2 — 意义传递**: A(增译)、O(漏译)、T(术语误用)、FA(假朋友)、VF(动词形式)、AMB(歧义)、COH(衔接不当)、F(忠实度)、L(死译)、MU(误解)、IND(犹豫不决)、UNF(未完成)、OTH-MT(其他意义错误)
- **Section 3 — 行文质量**: U(搭配/用法)、TT(文本类型)、R(语域)、ST(风格)、Emphasis(未突出重点)、Perspective(写作视角偏差)

**ATA Flowchart 决策树**

每个错误严格按四步判定：
1. 是否影响意义理解？→ 否归入 Section 1，是进入 Step 2
2. 影响范围：局部 / 衔接连贯 / 核心意义 → 决定严重度
3. 翻译指令与专业语境考量 → 调整严重度
4. Section 3 判定：不违反规则但"听起来不自然" → 行文质量问题

**CATTI 扣分标准（内置三级/二级笔译标准）**

三级笔译：误译漏译 -1~-3 分、句法错误 -2 分、术语误用 -1 分、Chinglish -2 分等
二级笔译：错译漏译语法错误 -2 分、严重误译 -5 分、用词不准 -1 分（重复连续扣分）

**中译英专项评分 (IEGS 2025)**

当目标语言为英文时，自动加载 ATA Into-English Grading Standards 2025，覆盖中文母语者常见错误模式：
- 冠词用法（中文无冠词系统，最常见错误源 #1）
- 动词时态（中文无时态变化，最常见错误源 #2）
- 逗号与标点（中英文标点规则差异极大）
- 主谓一致、关系代词、虚拟语气、悬垂修饰、短语动词、副词位置、语域/文体

**质量加分**

最多 3 处"出色翻译"亮点，每处 +1 分抵扣错误分。

**支持的 LLM 评分引擎**

| 引擎 | 深度思考 | 流式输出 | 模型示例 |
|------|----------|----------|----------|
| ChatGPT (OpenAI) | - | ✓ | gpt-4o, gpt-4o-mini |
| Claude (Anthropic) | - | ✓ | claude-3-7-sonnet-latest |
| Mistral | - | ✓ | mistral-medium |
| Gemini (Google) | - | ✓ | gemini-2.5-flash |
| Qwen (通义千问) | - | ✓ | qwen-mt-plus |
| GLM (智谱) | ✓ | ✓ | glm-4-flash, glm-5.1 |
| Doubao (豆包) | ✓ | ✓ | doubao-seed-2-0-pro |
| DeepSeek | ✓ | ✓ | deepseek-v4-pro, deepseek-v4-flash |

支持深度思考的引擎会在评分前先展示 AI 思维链（可折叠），评分结果实时流式渲染。

### 流式评分报告

提交翻译后立即弹出评分报告窗口，AI 评分过程实时可见：

**实时渲染过程**
1. AI 思考阶段：可折叠思维链实时展示（支持 Doubao/GLM/DeepSeek）
2. 评分生成阶段：总分解析 → 各段落详情逐步渲染
3. 完成后切换为完整交互式报告

**报告总览区**
- 大分数 + 级别徽章（三级笔译 / 二级笔译 / 一级笔译）+ 扣分/加分明细
- **核心诊断**：1-2 句话直指最大问题模式及其影响分数
- **置信度标签**：高/中/低，标识评分结果的一致性
- 三维进度条（含各维度扣分明细和得分率）
- 亮点徽章（最多 3 处出色翻译）
- 逐行总评分析

**错误仪表盘**
- **优先修复建议**：扣分最多的错误类型 + 行动建议
- **错误模式排行**：按出现频次排序，颜色区分 ATA 板块
- **行动建议库**：19 种错误类型对应的针对性练习建议

**CATTI 考级就绪度**
- 三级 / 二级 / 一级三级评估
- 及格线 + 舒适线双重判断
- 绿色（就绪）/ 橙色（接近）/ 红色（需努力）徽章

**分段详情卡片**
- 每段独立评分（0-100 分制）+ 三维微进度条
- 学生译文（带波浪线错误标记，颜色区分严重度：红/橙/黄/灰）
- 原文 + 参考译文
- 替代译法（可折叠，标注语域/句式特点，每段 2 个版本）
- 逐词 Diff 对比（学生译文 vs 参考译文）
- **错误卡片**：
  - ATA 板块标签（意义传递 / 译入语规范 / 行文质量）
  - 错误全称 + ATA 代码（如"误解 Misunderstanding (MU)"）
  - 扣分值 + 严重度（Minor / Moderate / Serious / Critical）
  - 影响范围（local 局部 / cohesion 衔接 / core 核心）
  - 重复标记 + 同模式错误分组
  - 修正建议（~~原文~~ → **建议**）
- 亮点加分卡片
- 优点 / 问题标签
- AI 深度分析（Markdown 渲染，涵盖句法、词汇、文风三个层面）
- **自测题**：严重错误（severity ≥ 4）自动生成测试题 + 答案，强化记忆
- 学生反思区（每段独立，自动保存至本地，关闭重开不丢失）
- 重练此段按钮

**导出功能**

| 格式 | 说明 |
|------|------|
| Markdown | 完整结构化报告，含总分、诊断、分项、每段详情、错误标记、建议 |
| PDF | A4 格式打印友好，保留背景色，自动展开所有段落，隐藏交互控件 |

**缩放控制**

- A- / A+ 按钮，范围 70%–150%
- 键盘快捷键：`Cmd/Ctrl + +/-` 调整，`Cmd/Ctrl + 0` 重置
- 状态跨重渲染保持

**亮色/暗色主题**

- 支持亮色和暗色两套主题，CSS 变量驱动
- 自动跟随系统偏好

### 训练报告导出（Export Report）

Training 面板一键导出综合训练报告（中文 HTML，浏览器打开）：

- **封面区**：生成日期、练习名称、翻译方向
- **统计总览**：总练习次数、练习篇数、平均分、最高分、练习天数、总翻译字数
- **分数趋势折线图（SVG）**：所有历史评分按时间排列，标注日期和分数
- **三维能力雷达图（SVG）**：意义传递 / 译入语规范 / 行文质量，历史平均 vs 最近一次叠加对比
- **高频错误 Top 8（SVG 水平条形图）**：按错误次数排序，显示错误代码 + 全称中文名 + 出现次数 + 累计扣分
- **CATTI 考级就绪度**：三级/二级/一级阈值对比
- **各篇练习详情**：每篇练习的历次评分表格 + 最近一次段落分析（原文、译文、参考译文、得分、错误标记）
- **反思记录**：各段学生反思内容
- **综合建议**：按频次排序的 AI 建议
- **打印友好**：A4 适配 `@media print`，可直接打印为 PDF

### AI 助手（AI Tutor）

翻译过程中随时与 AI 对话，获取实时辅助：

| 功能 | 说明 |
|------|------|
| 审阅译文 | 审阅当前翻译，指出优点和改进方向 |
| 替代译法 | 提供 2-3 个不同风格的替代翻译，分析各版本优劣 |
| 解释原文 | 解释原文含义、习语、文化背景和翻译难点 |
| 修复标签 | 检查译文中的内联标签是否完整、位置是否正确 |
| 自由对话 | 基于当前段落的原文和译文自由提问 |
| 插入回复 | 将 AI 回复一键插入当前编辑区 |
| 引擎切换 | 从已启用的 LLM 引擎中选择对话模型 |
| 流式输出 | AI 回复实时流式渲染，Markdown 格式 |

---

## 专业 CAT 功能

### 翻译编辑器

| 功能 | 说明 |
|------|------|
| XLIFF 编辑器 | 基于 XLIFF 1.2/2.0/2.1/2.2 的统一翻译环境 |
| 段落导航 | PageUp/PageDown 快速跳转，Cmd/Ctrl+G 跳转到指定段落 |
| 标签管理 | Cmd/Ctrl+1-0 插入标签，Cmd/Ctrl+T 插入下一个标签 |
| 撤销/重做 | 完整的编辑历史支持（Cmd/Ctrl+Z） |
| 自动传播 | 相同源文的段落自动应用翻译 |
| 段落过滤 | 按状态、文本内容、标签、评论过滤段落 |
| 查找替换 | 项目级别的文本查找与替换（Cmd/Ctrl+Alt+F） |
| 大小写转换 | 批量大小写转换（Cmd/Ctrl+Alt+C） |
| 快捷键 | Alt+Enter 保存段落，Esc 放弃编辑，Cmd/Ctrl+U 跳转下一段 |

### 翻译记忆 (TM)

| 功能 | 说明 |
|------|------|
| SQLite 存储 | 本地高效存储翻译记忆 |
| NGram 模糊匹配 | 智能相似度评分 |
| TMX 导入/导出 | 行业标准格式，兼容其他 CAT 工具 |
| SDLTM 导入 | 支持 Trados 格式 |
| 一致性搜索 | 跨 TM 搜索短语上下文用法 |
| 自动查找 | 翻译时自动匹配翻译记忆 |
| 匹配阈值 | 可配置模糊匹配阈值（默认 60%） |
| 批量应用 | 一键应用所有模糊匹配结果 |

### 术语管理

| 功能 | 说明 |
|------|------|
| TBX/TMX 导入 | 标准术语格式 |
| 术语识别 | 源文中自动高亮术语 |
| 术语搜索 | 快速查检术语表 |
| 内联添加 | 从段落中直接创建术语 |
| 多术语表 | 每个项目支持多个术语表 |
| 导出术语 | 备份和共享术语库 |

### 机器翻译

支持 **12 种机器翻译引擎**：

| 引擎 | 类型 | 特色功能 |
|------|------|----------|
| ChatGPT (OpenAI) | LLM | 标签修复 |
| Claude (Anthropic) | LLM | 标签修复 |
| Mistral | LLM | 标签修复 |
| Gemini (Google) | LLM | 标签修复 |
| Qwen (通义千问) | LLM | 标签修复 |
| GLM (智谱) | LLM | 通用/编程双端点，标签修复 |
| Doubao (豆包) | LLM | 通用/编程双端点，标签修复 |
| DeepSeek | LLM | 深度思考，标签修复 |
| Google Translate | 统计 MT | 经典翻译 |
| Azure Translator | 统计 MT | 微软翻译 |
| DeepL | 神经 MT | 高质量翻译 |
| ModernMT | 自适应 MT | 上下文感知 |

- 并发翻译（4 路并发控制）
- 标签自动修复（选中任一 LLM 引擎作为标签修复器）
- 自动重试（指数退避）
- 翻译记忆模糊匹配

### QA 质量检查

- 11 大类检查规则：误译、准确性、术语、风格、一致性、语法、拼写、标点、语义、地区规范、其他
- 3 级严重度：Minor、Major、Critical
- 可配置检查框架（JSON 规则文件）

### 评审批注

- 按段落添加批注和讨论
- 分类 + 严重度结构化反馈
- 导出评审包（Trados 兼容返回包）

### 拼写检查

- 多语言拼写检查（英语、葡萄牙语、西班牙语等）
- 实时拼写建议和一键修正
- 可配置默认语言变体（如 en-US、pt-BR）

### 支持 37 种文件格式

`inx` `icml` `idml` `ditamap` `dita` `xml` `html` `htm` `js` `properties` `json` `mif` `docx` `xlsx` `pptx` `sxw` `sxc` `sxi` `sxd` `odt` `ods` `odp` `odg` `txt` `po` `pot` `rc` `resx` `sdlxliff` `srt` `svg` `sdlppx` `ts` `txml` `vsdx` `xlf` `xliff` `mqxliff` `txlf`

---

## 安装

下载最新安装包：

- [GitHub Releases](https://github.com/xionglingsong/SwordfishEdu/releases)

| 平台 | 格式 | 说明 |
|------|------|------|
| macOS | DMG | 拖入 Applications 即可使用 |
| Windows | NSIS 安装包 | 支持自定义安装路径 |
| Linux | AppImage | 无需安装，直接运行 |

---

## 从源码构建

### 环境要求

- JDK 21+ (<https://adoptium.net/>)
- Gradle 9.2.1+ (<https://gradle.org>)
- Node.js 24.11.1 LTS+ (<https://nodejs.org/>)

### 构建步骤

```bash
git clone https://github.com/xionglingsong/SwordfishEdu.git
cd SwordfishEdu
gradle
npm install
npm start
```

后续启动：

```bash
npm start
```

### 打包发布

```bash
npm run dist:mac    # macOS DMG
npm run dist:win    # Windows NSIS 安装包
npm run dist        # 当前平台
```

---

## 技术架构

```
SwordfishEdu
├── src/main/java/          # Java 后端 (Gradle): XLIFF 解析、TM 引擎、文件格式转换
├── ts/                     # TypeScript 前端 (Electron)
│   ├── Swordfish.ts        # 主进程: IPC 调度、评分引擎、流式管道、导出
│   ├── scoreReport.ts      # 评分报告渲染器（流式 + 交互式 + 导出）
│   ├── scoringSchema.ts    # 评分结果校验与置信度计算
│   ├── trainingView.ts     # 练习管理面板
│   ├── translation.ts      # 翻译编辑器
│   ├── aiAssistant.ts      # AI 助手面板
│   ├── preferencesDialog.ts # 偏好设置（12 种 MT 引擎配置）
│   ├── mtManager.ts        # 机器翻译调度器（并发/重试/标签修复）
│   └── ...                 # 其他功能模块
├── html/en/                # HTML 模板
│   ├── scoreReport.html    # 评分报告（CSS 变量设计系统 + 暗色主题）
│   └── ...
├── models/                 # AI 模型建议列表
│   └── models.json
├── build/                  # 应用图标
└── jars/                   # Java 依赖库
```

**评分数据流**:

1. 学生提交翻译 → `scoreTranslation()` 构建 ATA+CATTI 评分 Prompt
2. 打开流式报告窗口 → `openScoreReportForStreaming()`
3. LLM 流式返回 → `sendStreamChunk()` 实时推送 thinking + content
4. 报告窗口逐块渲染 → `tryProgressiveRender()` 解析 partial JSON
5. 流式完成 → `handleStreamDone()` → 校验 → 完整交互式报告
6. 存入历史 → 可随时回看、导出 Markdown / PDF
7. Training 面板 → Export Report 生成综合训练报告（SVG 图表）

---

## 视频教程

- 从源码构建: <https://youtu.be/xiHFxfqCleQ>
- AI Prompt 翻译: <https://youtu.be/8S420n2QieM>
- AI 菜单/快捷键翻译: <https://youtu.be/FwsFZCjUajU>

---

## 许可证

Eclipse Public License 1.0 (EPL-1.0) — 开源协议，可免费使用、修改和分发。

许可证详情见 [licenses](./licenses) 目录。

---

## 相关项目

- [Swordfish](https://github.com/maxprograms-com/Swordfish) — 上游 CAT 工具
- [RemoteTM](https://github.com/rmraya/RemoteTM) — 远程翻译记忆服务器
- [OpenXLIFF](https://github.com/rmraya/OpenXLIFF) — XLIFF 过滤器
